export const profileFolders = ['mods', 'config', 'defaultconfigs', 'resourcepacks', 'shaderpacks', 'saves', 'screenshots', 'logs', 'resources', 'scripts', 'kubejs', 'datapacks', 'schematics', 'XaeroWaypoints', 'XaeroWorldMap', 'journeymap', 'replay_recordings'];
export const profileRootFiles = ['options.txt', 'optionsof.txt', 'optionsshaders.txt', 'servers.dat', 'hotbar.nbt'];
const privateRoots = new Set(['auth', 'accounts', 'account.enc', 'accounts.enc', '.git', '.codex', 'node_modules', 'runtime', 'java', 'libraries', 'versions', 'webcache', 'cache', 'code cache', 'network', 'local storage', 'session storage']);
export function archivePath(value: unknown, directory = false): string {
    if (typeof value !== 'string' || !value || value.length > 32767 || /[<>"|?*\\:\x00-\x1f\x7f]/.test(value) || value.startsWith('/'))
        throw Error('Unsicherer Dateipfad im Profilarchiv.');
    const name = directory && value.endsWith('/') ? value.slice(0, -1) : value;
    if (!name || name.split('/').some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))
        throw Error('Unsicherer Dateipfad im Profilarchiv.');
    return name;
}
export function portableProfilePath(value: unknown): string {
    const name = archivePath(value);
    if (privateRoots.has(name.split('/')[0].toLowerCase()) || /\.(exe|dll|bat|cmd|ps1|vbs|lnk|com|scr)(?:\.disabled)?$/i.test(name))
        throw Error('Nicht portable oder vertrauliche Profildatei.');
    return name;
}
export function checkedSize(value: number): number { if (!Number.isSafeInteger(value) || value < 0)
    throw Error('Ungültige Dateigröße im Profilarchiv.'); return value; }
export function sumSizes(values: Iterable<number>): number { let total = 0; for (const value of values) {
    total += checkedSize(value);
    checkedSize(total);
} return total; }
