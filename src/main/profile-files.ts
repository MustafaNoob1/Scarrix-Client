import { dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getConfig, saveConfig, instancePath, rootPath, sharedProfilePath } from './config';
import type { Instance } from './types';
import { exclusive } from './operations';
import { portableProfilePath, archivePath, checkedSize, sumSizes } from './profile-policy';
import { writeProfileArchive } from './profile-archive';
export function profilePath(instance: Instance) { const destination = path.join(rootPath(), 'instances', instance.id), legacy = path.join(rootPath(), 'instances', instance.version + '-' + instance.loader + (instance.id === 'default' ? '' : '-' + instance.id)); if (!fs.existsSync(destination) && fs.existsSync(legacy))
    fs.renameSync(legacy, destination); return sharedProfilePath?.(instance) ?? destination; }
function newId() { return 'instance-' + crypto.randomUUID(); }
function profileFileList(root: string) { const output: Array<{
    file: string;
    name: string;
}> = []; function walk(folder: string, relative = '') { if (!fs.existsSync(folder))
    return; for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const name = relative ? relative + '/' + entry.name : entry.name;
    try {
        portableProfilePath(name);
    }
    catch {
        continue;
    }
    if (entry.isSymbolicLink())
        throw Error('Profil enthält einen symbolischen Link.');
    const file = path.join(folder, entry.name);
    if (entry.isDirectory())
        walk(file, name);
    else if (entry.isFile())
        output.push({ file, name });
} } walk(root); return output; }
export async function duplicateProfile(id: string) { return exclusive('Profil kopieren', async () => { const cfg = getConfig(), original = cfg.instances.find(i => i.id === id); if (!original)
    throw Error('Profil nicht gefunden.'); if (cfg.instances.length >= 16)
    throw Error('Maximal 16 Profile.'); const item = { ...original, id: newId(), name: (original.name + ' Kopie').slice(0, 50), sharedGroup: false }, from = id === cfg.activeInstanceId ? instancePath() : profilePath(original), to = profilePath(item); try {
    for (const entry of profileFileList(from)) {
        const dest = path.join(to, entry.name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        await fs.promises.copyFile(entry.file, dest);
    }
    return await saveConfig({ ...cfg, instances: [...cfg.instances, item], activeInstanceId: item.id }, true);
}
catch (e) {
    fs.rmSync(to, { recursive: true, force: true });
    throw e;
} }); }
export async function exportProfile(id: string): Promise<string> { return exclusive('Profil exportieren', async () => { const cfg = getConfig(), item = cfg.instances.find(i => i.id === id); if (!item)
    throw Error('Profil nicht gefunden.'); const choice = await dialog.showSaveDialog({ defaultPath: item.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.scarrix.zip', filters: [{ name: 'Scarrix-Profil', extensions: ['zip'] }] }); if (choice.canceled || !choice.filePath)
    return 'Export abgebrochen.'; const from = id === cfg.activeInstanceId ? instancePath() : profilePath(item), relative = path.relative(from, path.resolve(choice.filePath)); if (relative && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))
    throw Error('Bitte den Export außerhalb des Profilordners speichern.'); const { portableProfile } = await import('./profile-export'), entries = [{ name: 'profile.json', bytes: Buffer.from(JSON.stringify({ format: 'scarrix-profile', schema: 1, profile: portableProfile(item) })) }, ...profileFileList(from).map(entry => ({ name: 'files/' + entry.name, file: entry.file }))], temp = choice.filePath + '.tmp-' + crypto.randomUUID(); try {
    await writeProfileArchive(temp, entries);
    fs.renameSync(temp, choice.filePath);
}
finally {
    if (fs.existsSync(temp))
        fs.unlinkSync(temp);
} return 'Profil exportiert: ' + choice.filePath; }); }
export function validateArchiveEntries(entries: Array<{
    entryName: string;
    header: {
        size: number;
    };
    attr: number;
}>) { const seen = new Set<string>(); for (const entry of entries) {
    const name = archivePath(entry.entryName, entry.entryName.endsWith('/')), key = name.normalize('NFC').toLowerCase();
    checkedSize(entry.header.size);
    if (seen.has(key) || ((entry.attr >>> 16) & 0xf000) === 0xa000)
        throw Error('Unsicheres Profilarchiv.');
    seen.add(key);
    if (name === 'profile.json' || name === 'files')
        continue;
    if (!name.startsWith('files/'))
        throw Error('Nicht erlaubte Datei im Profilarchiv.');
    portableProfilePath(name.slice(6));
} sumSizes(entries.map(e => e.header.size)); }
export async function importProfile() { const { importProfileArchive } = await import('./profile-import'); return importProfileArchive(); }
