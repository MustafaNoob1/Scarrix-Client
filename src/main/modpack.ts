import fs from 'node:fs';
import crypto from 'node:crypto';
import { archivePath, portableProfilePath, checkedSize, sumSizes } from './profile-policy';
import { progressReporter, downloadSignal, assertDownloadActive } from './downloads';
const hosts = new Set(['cdn.modrinth.com', 'github.com', 'raw.githubusercontent.com', 'gitlab.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'edge.forgecdn.net', 'mediafilez.forgecdn.net']);
export function safePackUrl(value: string) { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.has(url.hostname) || /\s/.test(value))
    throw Error('Nicht erlaubter Profil-Downloadserver.'); return url.href; }
export function safePackPath(value: unknown) { return portableProfilePath(value); }
export interface PackFile {
    path: string;
    hashes: {
        sha1: string;
        sha512?: string;
    };
    fileSize: number;
    downloads: string[];
    env?: {
        client?: string;
        server?: string;
    };
}
export function parsePack(raw: any) { if (raw?.formatVersion !== 1 || raw.game !== 'minecraft' || typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 100 || /[\x00-\x1f]/.test(raw.name) || !Array.isArray(raw.files) || !raw.dependencies || typeof raw.dependencies.minecraft !== 'string')
    throw Error('Ungültiges Modrinth-Profil.'); const deps = raw.dependencies, unknown = Object.keys(deps).filter(k => !['minecraft', 'fabric-loader', 'forge'].includes(k)); if (unknown.length)
    throw Error('Dieses Profil benötigt einen noch nicht unterstützten Loader: ' + unknown.join(', ')); if (deps.forge && deps['fabric-loader'])
    throw Error('Mehrere Modloader in einem Profil sind nicht erlaubt.'); const loader: 'fabric' | 'forge' | 'vanilla' = deps.forge ? 'forge' : deps['fabric-loader'] ? 'fabric' : 'vanilla', loaderVersion = deps.forge ?? deps['fabric-loader']; if (loaderVersion && (typeof loaderVersion !== 'string' || !/^\d[\w.+-]{0,59}$/.test(loaderVersion)))
    throw Error('Ungültige Loader-Version.'); const seen = new Set<string>(), files: PackFile[] = raw.files.map((f: any) => { const target = safePackPath(f.path), key = target.normalize('NFC').toLowerCase(); if (seen.has(key))
    throw Error('Doppelte Datei im Profil.'); seen.add(key); checkedSize(f.fileSize); if (!Array.isArray(f.downloads) || f.downloads.length < 1 || f.downloads.length > 8 || f.downloads.some((s: any) => typeof s !== 'string') || !/^([a-f0-9]{128})$/i.test(f.hashes?.sha512 ?? '') || !/^([a-f0-9]{40})$/i.test(f.hashes?.sha1 ?? ''))
    throw Error('Profildatei ohne gültige Größenangabe oder Prüfsummen.'); if (f.env && Object.values(f.env).some(v => !['required', 'optional', 'unsupported'].includes(String(v))))
    throw Error('Ungültige Client-Kompatibilität.'); return { ...f, path: target, downloads: f.downloads.map(safePackUrl) }; }); return { name: raw.name.trim().slice(0, 50), version: deps.minecraft, loader, loaderVersion, files, total: sumSizes(files.map(f => f.fileSize)) }; }
export function validatePackArchive(entries: Array<{
    entryName: string;
    header: {
        size: number;
    };
    attr: number;
}>) { const seen = new Set<string>(); for (const e of entries) {
    const name = archivePath(e.entryName, e.entryName.endsWith('/')), key = name.normalize('NFC').toLowerCase();
    if (seen.has(key))
        throw Error('Doppelte Archivdatei.');
    seen.add(key);
    checkedSize(e.header.size);
    if (((e.attr >>> 16) & 0xf000) === 0xa000)
        throw Error('Unsicheres Archiv.');
    if (name !== 'modrinth.index.json' && !['overrides', 'client-overrides', 'server-overrides'].includes(name.split('/')[0]))
        throw Error('Unbekannte Datei im Profilarchiv.');
    if (name !== 'modrinth.index.json' && name.includes('/'))
        safePackPath(name.slice(name.indexOf('/') + 1));
} return sumSizes(entries.map(e => e.header.size)); }
export async function downloadPackFile(file: PackFile, destination: string, label: string) { let last: unknown; for (const source of file.downloads) {
    try {
        let url = safePackUrl(source), response: Response | undefined;
        for (let hop = 0; hop <= 5; hop++) {
            response = await fetch(url, { redirect: 'manual', signal: downloadSignal(30 * 60 * 1000) });
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                await response.body?.cancel();
                if (!location || hop === 5)
                    throw Error('Zu viele Download-Weiterleitungen.');
                url = safePackUrl(new URL(location, url).href);
                continue;
            }
            break;
        }
        if (!response?.ok || !response.body)
            throw Error('Profil-Download fehlgeschlagen.');
        const sha512 = crypto.createHash('sha512'), sha1 = crypto.createHash('sha1'), progress = progressReporter(label);
        let size = 0;
        const fd = fs.openSync(destination, 'wx');
        try {
            for await (const chunk of response.body as any) {
                const buf = Buffer.from(chunk);
                assertDownloadActive();
                size += buf.length;
                if (size > file.fileSize)
                    throw Error('Datei größer als angegeben.');
                sha512.update(buf);
                sha1.update(buf);
                let written = 0;
                while (written < buf.length)
                    written += fs.writeSync(fd, buf, written, buf.length - written);
                progress(size, file.fileSize);
            }
        }
        finally {
            fs.closeSync(fd);
        }
        if (size !== file.fileSize || (file.hashes.sha512 && sha512.digest('hex') !== file.hashes.sha512.toLowerCase()) || sha1.digest('hex') !== file.hashes.sha1.toLowerCase())
            throw Error('Profil-Prüfsumme stimmt nicht überein.');
        progress(size, file.fileSize, 1, true);
        return;
    }
    catch (e) {
        last = e;
        if (fs.existsSync(destination))
            fs.unlinkSync(destination);
        assertDownloadActive();
    }
} throw last; }
export async function importModpack(input?: string, internal = false) { const { importProfileArchive } = await import('./profile-import'); return importProfileArchive(input, internal); }
