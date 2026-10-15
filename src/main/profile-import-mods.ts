import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { getLoaderArtifactListFor } from '@xmcl/installer';
import { minecraftRequests } from './minecraft-downloads';
import { openProfileArchive } from './profile-archive';
import type { Instance } from './types';
export function fabricRangeMatches(version: string, range: unknown): boolean | null { if (range === undefined)
    return true; const list = Array.isArray(range) ? range : [range]; let unknown = false; for (const rule of list) {
    if (rule === '*')
        return true;
    const parsed = typeof rule === 'string' ? semver.validRange(rule) : null, value = semver.valid(version) ?? semver.valid(version + '.0');
    if (!parsed || !value) {
        unknown = true;
        continue;
    }
    if (semver.satisfies(value, parsed, { includePrerelease: true }))
        return true;
} return unknown ? null : false; }
async function metadata(file: string) { const archive = await openProfileArchive(file); try {
    const entry = archive.entry('fabric.mod.json');
    if (!entry)
        return null;
    const data = JSON.parse((await archive.read(entry, 1024 * 1024)).toString('utf8'));
    if (typeof data.id !== 'string' || typeof data.version !== 'string')
        throw Error('Mod-Metadaten fehlen.');
    return data;
}
finally {
    archive.close();
} }
export async function reconcileImportedMods(root: string, item: Instance, messages: string[]) {
    if (item.loader !== 'fabric')
        return;
    const folder = path.join(root, 'mods');
    if (!fs.existsSync(folder))
        return;
    const active: Array<{
        file: string;
        data: any;
    }> = [];
    function disable(file: string, reason: string) { const from = path.join(folder, file); let to = from + '.disabled'; if (fs.existsSync(to)) {
        const parsed = path.parse(file);
        let n = 1;
        do {
            to = path.join(folder, parsed.name + '-import-' + (n++) + parsed.ext + '.disabled');
        } while (fs.existsSync(to));
    } fs.renameSync(from, to); messages.push(file + ' deaktiviert: ' + reason + '. Die Datei bleibt im Profil erhalten.'); }
    for (const file of fs.readdirSync(folder).filter(n => /\.jar$/i.test(n))) {
        try {
            const data = await metadata(path.join(folder, file));
            if (!data)
                continue;
            if (data.environment === 'server') {
                disable(file, 'nur für Server vorgesehen');
                continue;
            }
            if (fabricRangeMatches(item.version, data.depends?.minecraft) === false) {
                disable(file, 'nicht für Minecraft ' + item.version + ' vorgesehen');
                continue;
            }
            active.push({ file, data });
        }
        catch {
            messages.push(file + ': Metadaten konnten nicht vollständig geprüft werden; die Datei wurde unverändert übernommen.');
        }
    }
    const groups = new Map<string, typeof active>();
    for (const mod of active)
        groups.set(mod.data.id, [...(groups.get(mod.data.id) ?? []), mod]);
    const chosen: typeof active = [];
    for (const [id, mods] of groups) {
        mods.sort((a, b) => { const av = semver.valid(a.data.version) ?? semver.coerce(a.data.version), bv = semver.valid(b.data.version) ?? semver.coerce(b.data.version); return av && bv ? semver.rcompare(av, bv) : b.file.localeCompare(a.file); });
        chosen.push(mods[0]);
        for (const duplicate of mods.slice(1))
            disable(duplicate.file, 'doppelte Mod-ID ' + id + '; verwendet wird ' + mods[0].file);
    }
    const requirements = chosen.map(m => m.data.depends?.fabricloader).filter(v => v !== undefined);
    if (!requirements.length || item.loaderVersion && requirements.every(range => fabricRangeMatches(item.loaderVersion!, range) !== false))
        return;
    const loaders = await getLoaderArtifactListFor(item.version, minecraftRequests), compatible = loaders.filter(entry => requirements.every(range => fabricRangeMatches(entry.loader.version, range) !== false)), selected = compatible.find(entry => entry.loader.stable) ?? compatible[0];
    if (!selected)
        throw Error('Keine Fabric-Version erfüllt die Anforderungen der importierten Mods.');
    if (item.loaderVersion) {
        messages.push('Fabric ' + item.loaderVersion + ' wurde auf ' + selected.loader.version + ' angepasst, weil die enthaltenen Mods eine neuere Version benötigen.');
        item.loaderVersion = selected.loader.version;
    }
    else {
        const stable = loaders.find(entry => entry.loader.stable) ?? loaders[0];
        if (stable?.loader.version !== selected.loader.version) {
            item.loaderVersion = selected.loader.version;
            messages.push('Für die importierten Mods wird Fabric ' + selected.loader.version + ' festgelegt.');
        }
    }
}
