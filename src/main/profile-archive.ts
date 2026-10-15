import fs from 'node:fs';
import path from 'node:path';
import { Transform, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as yauzl from 'yauzl';
import * as yazl from 'yazl';
import { archivePath, checkedSize, sumSizes } from './profile-policy';
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++)
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export interface ProfileArchiveEntry {
    entryName: string;
    header: {
        size: number;
    };
    attr: number;
    isDirectory: boolean;
    raw: yauzl.Entry;
}
export class ProfileArchive {
    private failed: Error | null = null;
    private active = new Set<Readable>();
    constructor(private zip: yauzl.ZipFile, readonly entries: ProfileArchiveEntry[]) { zip.on('error', e => { this.failed = e; for (const stream of this.active)
        stream.destroy(e); }); }
    async stream(entry: ProfileArchiveEntry): Promise<Readable> { if (this.failed)
        throw this.failed; return new Promise((resolve, reject) => this.zip.openReadStream(entry.raw, (error, stream) => { if (error || !stream) {
        reject(error ?? Error('Archivdatei nicht lesbar.'));
        return;
    } this.active.add(stream); stream.once('close', () => this.active.delete(stream)); resolve(stream); })); }
    private verifier(entry: ProfileArchiveEntry, limit = entry.header.size) { let size = 0, crc = 0xffffffff; return new Transform({ transform(chunk: Buffer, _encoding, done) { size += chunk.length; if (size > limit || size > entry.header.size) {
            done(Error('Archivdatei ist größer als angegeben.'));
            return;
        } for (const b of chunk)
            crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8); done(null, chunk); }, flush(done) { done(size !== entry.header.size || ((crc ^ 0xffffffff) >>> 0) !== entry.raw.crc32 ? Error('Archiv-Prüfsumme oder Dateigröße stimmt nicht.') : undefined); } }); }
    async read(entry: ProfileArchiveEntry, limit = 64 * 1024 * 1024): Promise<Buffer> { if (entry.header.size > limit)
        throw Error('Profilbeschreibung ist zu groß.'); const chunks: Buffer[] = []; await pipeline(await this.stream(entry), this.verifier(entry, limit), new Transform({ transform(chunk: Buffer, _encoding, done) { chunks.push(chunk); done(); } })); return Buffer.concat(chunks); }
    async extract(entry: ProfileArchiveEntry, destination: string) { fs.mkdirSync(path.dirname(destination), { recursive: true }); await pipeline(await this.stream(entry), this.verifier(entry), fs.createWriteStream(destination, { flags: 'w' })); }
    close() { for (const stream of this.active)
        stream.destroy(); this.zip.close(); }
    entry(name: string) { return this.entries.find(e => e.entryName === name); }
}
export async function openProfileArchive(file: string): Promise<ProfileArchive> {
    return new Promise((resolve, reject) => yauzl.open(file, { lazyEntries: true, autoClose: false, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
        if (error || !zip) {
            reject(error ?? Error('Profilarchiv konnte nicht geöffnet werden.'));
            return;
        }
        const entries: ProfileArchiveEntry[] = [], seen = new Map<string, boolean>();
        let settled = false;
        const fail = (e: Error) => { if (settled)
            return; settled = true; zip.close(); reject(e); };
        zip.on('error', fail);
        zip.on('entry', (raw: yauzl.Entry) => {
            try {
                const isDirectory = raw.fileName.endsWith('/'), name = archivePath(raw.fileName, isDirectory), key = name.normalize('NFC').toLowerCase(), mode = (raw.externalFileAttributes >>> 16) & 0xf000;
                if (raw.generalPurposeBitFlag & 1 || ![0, 0x8000, 0x4000].includes(mode))
                    throw Error('Verschlüsselte Dateien und Links sind im Profilarchiv nicht erlaubt.');
                if (seen.has(key))
                    throw Error('Doppelte Datei im Profilarchiv.');
                seen.set(key, isDirectory);
                checkedSize(raw.uncompressedSize);
                entries.push({ entryName: raw.fileName, header: { size: raw.uncompressedSize }, attr: raw.externalFileAttributes, isDirectory, raw });
                zip.readEntry();
            }
            catch (e) {
                fail(e as Error);
            }
        });
        zip.on('end', () => { try {
            for (const [name] of seen)
                for (let at = name.indexOf('/'); at >= 0; at = name.indexOf('/', at + 1))
                    if (seen.get(name.slice(0, at)) === false)
                        throw Error('Datei und Ordner überschneiden sich im Profilarchiv.');
            sumSizes(entries.map(e => e.header.size));
            settled = true;
            zip.removeListener('error', fail);
            resolve(new ProfileArchive(zip, entries));
        }
        catch (e) {
            fail(e as Error);
        } });
        zip.readEntry();
    }));
}
export interface ArchiveWriteEntry {
    name: string;
    file?: string;
    bytes?: Buffer;
}
export async function writeProfileArchive(destination: string, entries: ArchiveWriteEntry[]) {
    if (fs.existsSync(destination))
        throw Error('Exportziel existiert bereits.');
    const zip = new yazl.ZipFile(), seen = new Set<string>();
    let failure: Error | undefined, created = false;
    const output = fs.createWriteStream(destination, { flags: 'wx' });
    const completed = pipeline(zip.outputStream, output).catch(e => { failure = e; throw e; });
    void completed.catch(() => { });
    output.once('open', () => { created = true; });
    zip.on('error', e => (zip.outputStream as Readable).destroy(e));
    try {
        for (const entry of entries) {
            const name = archivePath(entry.name), key = name.normalize('NFC').toLowerCase();
            if (seen.has(key))
                throw Error('Doppelte Exportdatei.');
            seen.add(key);
            if (entry.file) {
                const stat = fs.lstatSync(entry.file);
                if (stat.isSymbolicLink() || !stat.isFile())
                    throw Error('Exportdatei enthält einen Link oder ist nicht mehr vorhanden.');
                checkedSize(stat.size);
                zip.addFile(entry.file, name);
            }
            else if (entry.bytes)
                zip.addBuffer(entry.bytes, name);
            else
                throw Error('Leere Exportquelle.');
            if (failure)
                throw failure;
        }
        zip.end({ forceZip64Format: true, comment: '' });
        await completed;
    }
    catch (e) {
        (zip.outputStream as Readable).destroy(e as Error);
        await completed.catch(() => { });
        if (created && fs.existsSync(destination))
            fs.unlinkSync(destination);
        throw e;
    }
}
export async function requireProfileSpace(folder: string, bytes: number) { checkedSize(bytes); fs.mkdirSync(folder, { recursive: true }); const space = await fs.promises.statfs(folder, { bigint: true }); if (BigInt(bytes) > space.bavail * space.bsize)
    throw Error('Nicht genügend freier Speicherplatz für dieses Profil.'); }
