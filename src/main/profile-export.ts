import { minecraftRequests } from './minecraft-downloads';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { dialog, shell } from 'electron';
import { getConfig, appData } from './config';
import { profilePath } from './profile-files';
import { exclusive } from './operations';
import { safePackUrl } from './modpack';
import { getLoaderArtifactListFor, getForgeVersionList } from '@xmcl/installer';
import { portableProfilePath, profileFolders, profileRootFiles } from './profile-policy';
import { writeProfileArchive, ArchiveWriteEntry } from './profile-archive';
export const exportFolders = profileFolders, exportRootFiles = profileRootFiles;
export interface ExportEntry {
    path: string;
    directory: boolean;
    size: number;
}
export interface ExportOptions {
    format: 'scarrixpack' | 'mrpack' | 'curseforge';
    fileName: string;
    selected: string[];
    openFolder: boolean;
}
const extensions = { scarrixpack: 'scarrixpack', mrpack: 'mrpack', curseforge: 'zip' };
function find(id: unknown) { const item = getConfig().instances.find(i => i.id === id); if (!item)
    throw Error('Profil nicht gefunden.'); return item; }
function base(id: unknown) { const result = path.resolve(profilePath(find(id))); let current = result; while (current !== path.dirname(current)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
        throw Error('Profilpfad enthält einen Link.');
    if (current === path.resolve(appData()))
        break;
    current = path.dirname(current);
} return result; }
export async function profileExportTree(id: unknown): Promise<ExportEntry[]> { const root = base(id), output: ExportEntry[] = []; async function walk(dir: string, rel: string) { for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
        continue;
    const relative = rel ? rel + '/' + entry.name : entry.name;
    try {
        portableProfilePath(relative);
    }
    catch {
        continue;
    }
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
        output.push({ path: relative, directory: true, size: 0 });
        await walk(file, relative);
    }
    else if (entry.isFile())
        output.push({ path: relative, directory: false, size: (await fs.promises.stat(file)).size });
} } if (fs.existsSync(root))
    await walk(root, ''); return output.sort((a, b) => a.path.localeCompare(b.path)); }
export function exportFileName(value: unknown) { if (typeof value !== 'string' || !value.trim() || value.length > 100 || /[<>:"/\\|?*\x00-\x1f\x7f]/.test(value) || /[. ]$/.test(value) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value) || value === '.' || value === '..')
    throw Error('Bitte einen gültigen Export-Dateinamen eingeben.'); return value.trim().replace(/\.(scarrixpack|mrpack|zip)$/i, ''); }
export function portableProfile(item: ReturnType<typeof find>) { return { baseMods: item.baseMods, name: item.name, version: item.version, loader: item.loader, loaderVersion: item.loaderVersion, ramGB: item.ramGB, group: item.group, icon: item.icon, window: item.window, jvmArgs: item.jvmArgs, quickPlayWorld: item.quickPlayWorld, favorite: item.favorite, color: item.color }; }
async function loaderVersion(item: ReturnType<typeof find>) { if (item.loader === 'vanilla')
    return undefined; if (item.loaderVersion)
    return item.loaderVersion; if (item.loader === 'fabric') {
    const list = await getLoaderArtifactListFor(item.version, minecraftRequests);
    const selected = list.find(v => v.loader.stable) ?? list[0];
    if (selected)
        return selected.loader.version;
}
else {
    const list = await getForgeVersionList({ minecraft: item.version, ...minecraftRequests });
    if (list.versions?.[0])
        return list.versions[0].version;
} throw Error('Keine Loader-Version für den Export gefunden.'); }
interface ExportFile {
    relative: string;
    file: string;
    size: number;
}
async function hashes(file: string) { const sha512 = crypto.createHash('sha512'), sha1 = crypto.createHash('sha1'); for await (const bytes of fs.createReadStream(file)) {
    sha512.update(bytes);
    sha1.update(bytes);
} return { sha512: sha512.digest('hex'), sha1: sha1.digest('hex') }; }
async function modrinthFiles(files: ExportFile[]) { const candidates = files.filter(f => /\.(jar|zip)$/i.test(f.relative) && ['mods', 'resourcepacks', 'shaderpacks', 'datapacks'].includes(f.relative.split('/')[0])); const output = new Map<string, any>(); for (let offset = 0; offset < candidates.length; offset += 500) {
    const batch = candidates.slice(offset, offset + 500), digests = await Promise.all(batch.map(f => hashes(f.file)));
    try {
        const r = await fetch('https://api.modrinth.com/v2/version_files', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': getConfig().modrinth.userAgent }, body: JSON.stringify({ hashes: digests.map(h => h.sha512), algorithm: 'sha512' }), signal: AbortSignal.timeout(30000) });
        if (!r.ok)
            continue;
        const data = await r.json();
        for (let i = 0; i < batch.length; i++) {
            const f = batch[i], hash = digests[i], v = data[hash.sha512], download = v?.files?.find((d: any) => d.hashes?.sha512 === hash.sha512 && d.size === f.size);
            if (!download || !/^https:\/\/cdn\.modrinth\.com\//.test(download.url ?? ''))
                continue;
            output.set(f.relative, { path: f.relative, hashes: hash, fileSize: f.size, downloads: [safePackUrl(download.url)] });
        }
    }
    catch { }
} return output; }
async function curseforgeFiles(root: string, files: ExportFile[]) { const cfg = getConfig(), output = new Map<string, any>(); if (!cfg.curseforge.apiKey)
    return output; let receipts: Record<string, any> = {}; try {
    const p = path.join(root, 'scarrix-content.json');
    if (fs.statSync(p).size < 64 * 1024 * 1024)
        receipts = JSON.parse(fs.readFileSync(p, 'utf8'));
}
catch { } for (const [key, record] of Object.entries(receipts)) {
    if (!/^curseforge:\d+$/.test(key) || !/^\d+$/.test(String(record.versionId)))
        continue;
    const f = files.find(f => f.relative === String(record.path).split(path.sep).join('/'));
    if (!f)
        continue;
    try {
        const projectID = Number(key.split(':')[1]), fileID = Number(record.versionId), r = await fetch('https://api.curseforge.com/v1/mods/' + projectID + '/files/' + fileID, { headers: { 'x-api-key': cfg.curseforge.apiKey }, signal: AbortSignal.timeout(15000) });
        if (!r.ok)
            continue;
        const raw = (await r.json()).data, hash = await hashes(f.file);
        if (raw?.modId === projectID && raw.hashes?.some((h: any) => h.algo === 1 && h.value.toLowerCase() === hash.sha1))
            output.set(f.relative, { projectID, fileID, required: true });
    }
    catch { }
} return output; }
export async function exportSelectedProfile(id: unknown, input: ExportOptions): Promise<string> {
    return exclusive('Profil exportieren', async () => {
        if (!input || !Object.hasOwn(extensions, input.format) || !Array.isArray(input.selected) || typeof input.openFolder !== 'boolean')
            throw Error('Ungültige Export-Auswahl.');
        const item = find(id), root = base(id), name = exportFileName(input.fileName), tree = await profileExportTree(id), available = new Set(tree.map(e => e.path)), selection = new Set<string>();
        for (const selected of input.selected) {
            if (typeof selected !== 'string' || !available.has(selected))
                throw Error('Eine ausgewählte Datei fehlt oder ist nicht exportierbar.');
            selection.add(selected);
        }
        const chosen = tree.filter(e => !e.directory && e.path.split('/').some((_p, n, a) => selection.has(a.slice(0, n + 1).join('/'))));
        const extension = extensions[input.format], choice = await dialog.showSaveDialog({ defaultPath: name + '.' + extension, filters: [{ name: input.format === 'scarrixpack' ? 'ScarrixPack' : input.format === 'mrpack' ? 'Modrinth-Profil' : 'CurseForge-Profil', extensions: [extension] }] });
        if (choice.canceled || !choice.filePath)
            return 'Export abgebrochen.';
        const destination = path.extname(choice.filePath).toLowerCase() === '.' + extension ? choice.filePath : choice.filePath + '.' + extension, relativeDest = path.relative(root, path.resolve(destination));
        if (relativeDest && !relativeDest.startsWith('..' + path.sep) && !path.isAbsolute(relativeDest))
            throw Error('Bitte den Export außerhalb des Profilordners speichern.');
        const files: ExportFile[] = [];
        for (const entry of chosen) {
            const file = path.join(root, entry.path);
            let ancestor = file;
            while (ancestor !== root) {
                if (fs.lstatSync(ancestor).isSymbolicLink())
                    throw Error('Ein Dateipfad wurde während des Exports geändert.');
                ancestor = path.dirname(ancestor);
            }
            const stat = fs.statSync(file);
            if (!stat.isFile())
                throw Error('Eine ausgewählte Datei ist nicht mehr vorhanden.');
            files.push({ relative: entry.path, file, size: stat.size });
        }
        const entries: ArchiveWriteEntry[] = [];
        let references = 0;
        if (input.format === 'scarrixpack') {
            entries.push({ name: 'profile.json', bytes: Buffer.from(JSON.stringify({ format: 'scarrix-profile', schema: 1, profile: portableProfile(item) })) });
            for (const file of files)
                entries.push({ name: 'files/' + file.relative, file: file.file });
        }
        else {
            const version = await loaderVersion(item), map = input.format === 'mrpack' ? await modrinthFiles(files) : await curseforgeFiles(root, files);
            references = map.size;
            for (const file of files)
                if (!map.has(file.relative))
                    entries.push({ name: 'overrides/' + file.relative, file: file.file });
            const metadata = input.format === 'mrpack' ? { formatVersion: 1, game: 'minecraft', versionId: '1.0.0', name: item.name, files: [...map.values()], dependencies: { minecraft: item.version, ...(item.loader === 'fabric' ? { 'fabric-loader': version } : item.loader === 'forge' ? { forge: version } : {}) } } : { minecraft: { version: item.version, modLoaders: version ? [{ id: item.loader + '-' + version, primary: true }] : [] }, manifestType: 'minecraftModpack', manifestVersion: 1, name: item.name, version: '1.0.0', author: '', files: [...map.values()], overrides: 'overrides' };
            entries.push({ name: input.format === 'mrpack' ? 'modrinth.index.json' : 'manifest.json', bytes: Buffer.from(JSON.stringify(metadata)) });
        }
        const temp = destination + '.tmp-' + crypto.randomUUID();
        try {
            await writeProfileArchive(temp, entries);
            fs.renameSync(temp, destination);
        }
        finally {
            if (fs.existsSync(temp))
                fs.unlinkSync(temp);
        }
        if (input.openFolder)
            shell.showItemInFolder(destination);
        return 'Profil exportiert: ' + destination + ' · ' + references + ' Download-Verweise, ' + (files.length - references) + ' eingebettete Dateien.';
    });
}
