import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { getLoaderArtifactListFor } from '@xmcl/installer';
import { getConfig, saveConfig } from './config';
import { openProfileArchive, requireProfileSpace } from './profile-archive';
import { fabricNamespaceIssue } from './fabric-compatibility';
import { fabricRangeMatches } from './profile-import-mods';
import { downloadPackFile, safePackPath, safePackUrl } from './modpack';
import { assertDownloadActive, downloadSignal, stepStatus } from './downloads';
import { minecraftRequests } from './minecraft-downloads';
import type { Instance } from './types';
export const scarrixBaseProjects = [
    { id: 'P7dR8mSH', mod: 'fabric-api', name: 'Fabric API' },
    { id: '9s6osm5g', mod: 'cloth-config', name: 'Cloth Config' },
    { id: 'Ha28R6CL', mod: 'fabric-language-kotlin', name: 'Fabric Language Kotlin' },
    { id: 'AANobbMI', mod: 'sodium', name: 'Sodium' },
    { id: 'gvQqBUqZ', mod: 'lithium', name: 'Lithium' },
    { id: 'uXXizFIs', mod: 'ferritecore', name: 'FerriteCore' },
    { id: 'NNAgCjsB', mod: 'entityculling', name: 'Entity Culling' },
    { id: '5ZwdcRci', mod: 'immediatelyfast', name: 'ImmediatelyFast' },
    { id: 'mOgUt4GM', mod: 'modmenu', name: 'Mod Menu' }
];
interface RootMod {
    file: string;
    enabled: boolean;
    data: any;
    nodes: any[];
}
interface RecordFile {
    project: string;
    version: string;
    filename: string;
    mod: string;
    sha512: string;
    name: string;
}
export interface BaseReport {
    installed: string[];
    messages: string[];
    cached: boolean;
}
const stateName = 'scarrix-base.json';
const id = (value: unknown) => { if (typeof value !== 'string' || !/^[-\w]{1,80}$/.test(value))
    throw Error('Ungültige Basis-Projekt-ID.'); return value; };
function safeRoot(root: string) { for (const file of [root, path.join(root, 'mods'), path.join(root, stateName)])
    if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink())
        throw Error('Basis-Mod-Pfad enthält einen Link.'); }
function fingerprint(root: string) { const folder = path.join(root, 'mods'); if (!fs.existsSync(folder))
    return ''; const files = fs.readdirSync(folder).filter(n => /\.jar(?:\.disabled)?$/i.test(n)).sort().map(n => { const s = fs.lstatSync(path.join(folder, n)); if (!s.isFile() || s.isSymbolicLink())
    throw Error('Mods dürfen keine Links enthalten.'); return [n, s.size, s.mtimeMs]; }); return crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex'); }
async function json(endpoint: string, init: RequestInit = {}) { const r = await fetch('https://api.modrinth.com/v2/' + endpoint, { ...init, headers: { 'User-Agent': getConfig().modrinth?.userAgent ?? 'ScarrixClient/BaseMods', 'Content-Type': 'application/json', ...init.headers }, redirect: 'error', signal: downloadSignal(30000) }); if (!r.ok || !r.body)
    throw Error('Scarrix-Basis: Modrinth nicht erreichbar (HTTP ' + r.status + ').'); let size = 0; const chunks: Buffer[] = []; for await (const c of r.body as any) {
    size += c.length;
    if (size > 16 * 1024 * 1024)
        throw Error('Basis-Metadaten zu groß.');
    chunks.push(Buffer.from(c));
} return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
function nestedNodes(zip: AdmZip, depth = 0, budget = { bytes: 0 }): any[] { const entry = zip.getEntry('fabric.mod.json'); if (!entry || entry.header.size > 1024 * 1024)
    return []; const data = JSON.parse(entry.getData().toString('utf8')); if (typeof data.id !== 'string' || typeof data.version !== 'string')
    return []; const result = [data]; if (depth >= 3)
    return result; for (const ref of data.jars ?? []) {
    const e = typeof ref.file === 'string' ? zip.getEntry(ref.file) : null;
    if (!e || e.header.size > 16 * 1024 * 1024 || budget.bytes + e.header.size > 64 * 1024 * 1024)
        continue;
    budget.bytes += e.header.size;
    result.push(...nestedNodes(new AdmZip(e.getData()), depth + 1, budget));
} return result; }
async function readMod(file: string, version: string): Promise<RootMod | null> {
    const archive = await openProfileArchive(file);
    try {
        const entry = archive.entry('fabric.mod.json');
        if (!entry)
            return null;
        const data = JSON.parse((await archive.read(entry, 1024 * 1024)).toString('utf8'));
        if (typeof data.id !== 'string' || typeof data.version !== 'string')
            return null;
        let compatible = fabricRangeMatches(version, data.depends?.minecraft) !== false && data.environment !== 'server';
        if (typeof data.accessWidener === 'string') {
            const e = archive.entry(data.accessWidener);
            if (!e)
                throw Error('Class-Tweaker-Datei fehlt.');
            if (fabricNamespaceIssue(version, (await archive.read(e, 1024 * 1024)).toString('utf8').split(/\r?\n/, 1)[0]))
                compatible = false;
        }
        const nodes = [data], budget = { bytes: 0 };
        for (const ref of data.jars ?? []) {
            const e = typeof ref.file === 'string' ? archive.entry(ref.file) : null;
            if (!e || e.header.size > 16 * 1024 * 1024 || budget.bytes + e.header.size > 64 * 1024 * 1024)
                continue;
            budget.bytes += e.header.size;
            nodes.push(...nestedNodes(new AdmZip(await archive.read(e, 16 * 1024 * 1024)), 1, budget));
        }
        return { file, enabled: !file.endsWith('.disabled') && compatible, data: { ...data, scarrixCompatible: compatible }, nodes };
    }
    finally {
        archive.close();
    }
}
function provides(mod: RootMod) { return mod.nodes.flatMap(n => [n.id, ...(Array.isArray(n.provides) ? n.provides : [])].filter(v => typeof v === 'string').map(key => ({ key, version: n.version }))); }
async function digest(file: string) { const hash = crypto.createHash('sha512'); for await (const chunk of fs.createReadStream(file))
    hash.update(chunk); return hash.digest('hex'); }
// Append-only transaction: a failed download/dependency check never overwrites a
// user's JARs, disabled mods, worlds or configuration. Source files stay upstream.
export async function prepareBaseMods(item: Instance, root: string, options: {
    ignoredDisabled?: string[];
    refresh?: boolean;
} = {}): Promise<BaseReport> {
    root = path.resolve(root);
    const report: BaseReport = { installed: [], messages: [], cached: false };
    if (item.loader !== 'fabric' || item.baseMods !== true)
        return report;
    safeRoot(root);
    fs.mkdirSync(root, { recursive: true });
    const modsFolder = path.join(root, 'mods');
    fs.mkdirSync(modsFolder, { recursive: true });
    const before = fingerprint(root);
    let previous: any = {};
    try {
        const file = path.join(root, stateName);
        if (fs.statSync(file).size < 1024 * 1024)
            previous = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch { }
    if (!options.refresh && previous.schema === 1 && previous.minecraft === item.version && previous.loader === item.loaderVersion && previous.fingerprint === before && previous.complete === true) {
        return { installed: [], messages: previous.messages ?? [], cached: true };
    }
    const ignored = new Set<string>([...(previous.minecraft === item.version && Array.isArray(previous.ignoredDisabled) ? previous.ignoredDisabled : []), ...(options.ignoredDisabled ?? [])]), all: RootMod[] = [], disabled = new Set<string>();
    for (const filename of fs.readdirSync(modsFolder).filter(f => /\.jar(?:\.disabled)?$/i.test(f))) {
        assertDownloadActive();
        try {
            const mod = await readMod(path.join(modsFolder, filename), item.version);
            if (!mod)
                continue;
            if (!filename.endsWith('.disabled') && !mod.data.scarrixCompatible) {
                const error = Error(filename + ' passt nicht zu Minecraft ' + item.version + '. Bitte zuerst deaktivieren.');
                error.name = 'BaseIncompatibleMod';
                throw error;
            }
            if (mod.enabled)
                all.push(mod);
            else if (filename.endsWith('.disabled') && mod.data.scarrixCompatible && !ignored.has(filename))
                disabled.add(mod.data.id);
        }
        catch (e) {
            if ((e as Error).name === 'BaseIncompatibleMod')
                throw e;
            report.messages.push(filename + ': Metadaten nicht vollständig prüfbar; Datei bleibt unverändert.');
        }
    }
    const optedOut = new Set<string>(previous.minecraft === item.version && Array.isArray(previous.optedOut) ? previous.optedOut : []);
    const records: RecordFile[] = Array.isArray(previous.files) ? previous.files.filter((r: any) => typeof r?.filename === 'string' && path.basename(r.filename) === r.filename) : [];
    if (previous.minecraft === item.version)
        for (const r of records)
            if (!fs.existsSync(path.join(modsFolder, r.filename)) && !fs.existsSync(path.join(modsFolder, r.filename + '.disabled')))
                optedOut.add(r.project);
    const providers = () => { const map = new Map<string, string[]>(); for (const mod of all)
        for (const p of provides(mod))
            map.set(p.key, [...(map.get(p.key) ?? []), p.version]); return map; };
    const satisfies = (modId: string, range: unknown) => providers().get(modId)?.some(v => fabricRangeMatches(v, range) !== false) ?? false;
    const selected = new Map<string, string>(), pending: RecordFile[] = [], stage = path.join(root, '.scarrix-base-' + crypto.randomUUID()), moved: string[] = [];
    const visiting = new Set<string>();
    fs.mkdirSync(stage);
    const binaries = path.join(stage, 'mods');
    fs.mkdirSync(binaries);
    async function visit(project: string, pinned?: string, wanted?: string, range?: unknown, optional = false): Promise<void> {
        assertDownloadActive();
        project = id(project);
        if (wanted && satisfies(wanted, range) && !pinned)
            return;
        if ((wanted && disabled.has(wanted)) || optedOut.has(project)) {
            if (optional) {
                report.messages.push((wanted ?? project) + ' bleibt auf eigenen Wunsch deaktiviert/entfernt.');
                return;
            }
            throw Error('Benötigte Basis-Abhängigkeit ' + (wanted ?? project) + ' wurde deaktiviert oder entfernt. Bitte im Profil wieder aktivieren.');
        }
        if (selected.has(project)) {
            if (pinned && selected.get(project) !== pinned)
                throw Error('Widersprüchliche Pflicht-Versionen für ' + project);
            return;
        }
        if (visiting.size + selected.size >= 64)
            throw Error('Zu viele Pflicht-Abhängigkeiten für die Basis.');
        visiting.add(project);
        const params = new URLSearchParams({ game_versions: JSON.stringify([item.version]), loaders: '["fabric"]', include_changelog: 'false' });
        const versions = pinned ? [await json('version/' + id(pinned))] : await json('project/' + project + '/version?' + params);
        if (!Array.isArray(versions))
            throw Error('Ungültige Basis-Versionen.');
        const fits = (v: any) => v?.project_id === project && v.game_versions?.includes(item.version) && v.loaders?.includes('fabric') && !['server_only', 'dedicated_server_only'].includes(v.environment);
        const raw = pinned ? versions.find(fits) : versions.find(v => fits(v) && v.version_type === 'release') ?? versions.find(v => fits(v) && v.version_type === 'beta');
        if (!raw) {
            visiting.delete(project);
            if (optional) {
                report.messages.push((wanted ?? project) + ': keine veröffentlichte passende Version für ' + item.version + '.');
                return;
            }
            throw Error('Keine passende Pflicht-Abhängigkeit ' + project + ' für Minecraft ' + item.version + '.');
        }
        const file = raw.files?.find((f: any) => f.primary) ?? raw.files?.[0];
        if (!file || typeof file.filename !== 'string' || path.basename(file.filename) !== file.filename || !file.filename.endsWith('.jar') || !Number.isSafeInteger(file.size) || file.size < 1 || !(/^[a-f0-9]{128}$/i.test(file.hashes?.sha512 ?? '')) || !(/^[a-f0-9]{40}$/i.test(file.hashes?.sha1 ?? '')))
            throw Error('Basis-Datei ohne gültige Größe/Prüfsummen.');
        safePackPath('mods/' + file.filename);
        const target = path.join(binaries, file.filename);
        if (fs.existsSync(target))
            throw Error('Dateiname kollidiert zwischen Basis-Projekten.');
        await requireProfileSpace(stage, file.size);
        await downloadPackFile({ path: 'mods/' + file.filename, fileSize: file.size, hashes: file.hashes, downloads: [safePackUrl(file.url)] }, target, 'Scarrix-Basis · ' + (wanted ?? project));
        const mod = await readMod(target, item.version);
        if (!mod?.enabled || wanted && mod.data.id !== wanted)
            throw Error('Basis-Datei passt laut lokalen Metadaten nicht zum Profil.');
        const existing = all.find(m => m.data.id === mod.data.id);
        if (existing) {
            if ((!pinned || await digest(existing.file) === file.hashes.sha512) && (!range || satisfies(mod.data.id, range))) {
                fs.unlinkSync(target);
                selected.set(project, raw.id);
                visiting.delete(project);
                return;
            }
            throw Error('Vorhandene Mod ' + mod.data.id + ' erfüllt die benötigte Version nicht. Bitte gezielt aktualisieren; sie wird nicht automatisch überschrieben.');
        }
        if (disabled.has(mod.data.id)) {
            fs.unlinkSync(target);
            visiting.delete(project);
            if (optional) {
                report.messages.push(mod.data.id + ' bleibt deaktiviert.');
                return;
            }
            throw Error('Pflicht-Abhängigkeit ' + mod.data.id + ' ist deaktiviert.');
        }
        const dest = path.join(modsFolder, file.filename);
        if (fs.readdirSync(modsFolder).some(n => n.toLowerCase() === file.filename.toLowerCase()) || fs.existsSync(dest + '.disabled'))
            throw Error('Basis-Datei würde vorhandene Datei überschreiben: ' + file.filename);
        selected.set(project, raw.id);
        all.push(mod);
        pending.push({ project, version: raw.id, filename: file.filename, mod: mod.data.id, sha512: file.hashes.sha512, name: mod.data.name ?? mod.data.id });
        for (const dep of raw.dependencies ?? [])
            if (dep.dependency_type === 'required') {
                if (!dep.project_id && !dep.version_id)
                    throw Error('Externe Pflicht-Abhängigkeit muss manuell installiert werden.');
                let depProject = dep.project_id;
                if (!depProject)
                    depProject = (await json('version/' + id(dep.version_id))).project_id;
                const known = scarrixBaseProjects.find(p => p.id === depProject);
                await visit(depProject, dep.version_id ?? undefined, known?.mod, undefined, false);
            }
        visiting.delete(project);
    }
    try {
        stepStatus('Scarrix-Basis prüfen');
        for (const p of scarrixBaseProjects)
            await visit(p.id, undefined, p.mod, undefined, true);
        const builtins = new Set(['minecraft', 'java', 'fabricloader']);
        for (let pass = 0; pass < 3; pass++) {
            const missing = all.flatMap(m => Object.entries(m.data.depends ?? {}).filter(([key, range]) => !builtins.has(key) && !satisfies(key, range)).map(([key, range]) => ({ mod: m, key, range })));
            if (!missing.length)
                break;
            let changed = false;
            for (const need of missing) {
                if (satisfies(need.key, need.range))
                    continue;
                const known = scarrixBaseProjects.find(p => p.mod === need.key) ?? (need.key.startsWith('fabric-') && !need.key.startsWith('fabric-language-') ? scarrixBaseProjects[0] : undefined);
                if (known) {
                    await visit(known.id, undefined, known.mod, need.key === known.mod ? need.range : undefined, false);
                    changed = true;
                    continue;
                }
                const hash = await digest(need.mod.file), lookup = await json('version_files', { method: 'POST', body: JSON.stringify({ hashes: [hash], algorithm: 'sha512' }) }), raw = lookup[hash];
                if (!raw?.files?.some((f: any) => f.hashes?.sha512 === hash))
                    throw Error(need.mod.data.id + ' benötigt „' + need.key + '“. Keine verifizierte Download-Quelle gefunden.');
                for (const dep of raw.dependencies ?? [])
                    if (dep.dependency_type === 'required') {
                        let project = dep.project_id;
                        if (!project && dep.version_id)
                            project = (await json('version/' + id(dep.version_id))).project_id;
                        if (!project)
                            throw Error('Externe Pflicht-Abhängigkeit für ' + need.mod.data.id + ' fehlt.');
                        await visit(project, dep.version_id ?? undefined);
                        changed = true;
                    }
            }
            if (!changed)
                break;
        }
        for (const mod of all)
            for (const [key, range] of Object.entries(mod.data.depends ?? {}))
                if (!builtins.has(key) && !satisfies(key, range))
                    throw Error(mod.data.id + ' benötigt „' + key + '“ ' + JSON.stringify(range) + '. Die Basis überschreibt keine vorhandenen Versionen; bitte im Profil prüfen.');
        for (const mod of all)
            for (const [key, range] of Object.entries(mod.data.breaks ?? {}))
                if (providers().get(key)?.some(v => fabricRangeMatches(v, range) === true))
                    throw Error('Basis-Konflikt: ' + mod.data.id + ' ist mit ' + key + ' inkompatibel.');
        const requirements = all.map(m => m.data.depends?.fabricloader).filter(v => v !== undefined);
        if (requirements.length && (item.loaderVersion ? requirements.some(r => fabricRangeMatches(item.loaderVersion!, r) === false) : pending.length > 0)) {
            const loaders = await getLoaderArtifactListFor(item.version, minecraftRequests), compatible = loaders.filter(l => requirements.every(r => fabricRangeMatches(l.loader.version, r) !== false)), chosen = compatible.find(l => l.loader.stable) ?? compatible[0];
            if (!chosen)
                throw Error('Keine passende Fabric-Loader-Version für die Basis.');
            if (item.loaderVersion || loaders.find(l => l.loader.stable)?.loader.version !== chosen.loader.version) {
                item.loaderVersion = chosen.loader.version;
                report.messages.push('Fabric für die Basis auf ' + chosen.loader.version + ' abgestimmt.');
            }
        }
        assertDownloadActive();
        safeRoot(root);
        for (const r of pending) {
            const dest = path.join(modsFolder, r.filename);
            if (fs.existsSync(dest))
                throw Error('Basis-Dateiziel wurde zwischenzeitlich geändert.');
            fs.renameSync(path.join(binaries, r.filename), dest);
            moved.push(dest);
            report.installed.push(r.name);
        }
        const record = { schema: 1, minecraft: item.version, loader: item.loaderVersion, fingerprint: fingerprint(root), complete: true, checkedAt: Date.now(), ignoredDisabled: [...ignored], optedOut: [...optedOut], files: [...records.filter(r => !pending.some(p => p.project === r.project)), ...pending], messages: report.messages };
        const temporary = path.join(stage, stateName);
        fs.writeFileSync(temporary, JSON.stringify(record, null, 2));
        fs.renameSync(temporary, path.join(root, stateName));
        return report;
    }
    catch (e) {
        for (const file of moved)
            if (path.dirname(file) === modsFolder && fs.existsSync(file))
                fs.unlinkSync(file);
        throw e;
    }
    finally {
        if (path.dirname(stage) === root && fs.existsSync(stage))
            fs.rmSync(stage, { recursive: true, force: true });
    }
}
export async function prepareProfileBase(idValue: unknown, force = false) { const { profilePath } = await import('./profile-files'); const { checkedPath } = await import('./profile-backups'); const cfg = getConfig(), original = cfg.instances.find(i => i.id === idValue); if (!original)
    throw Error('Profil nicht gefunden.'); if (force && original.loader !== 'fabric')
    throw Error('Die Scarrix-Basis ist für Fabric-Profile verfügbar.'); const item = { ...original }; if (force && item.loader === 'fabric')
    item.baseMods = true; const root = checkedPath(profilePath(item)); const report = await prepareBaseMods(item, root, { refresh: force }); const { installScarrixHud } = await import('./scarrix-mod'); const hud = await installScarrixHud(item, root); if(hud) report.messages.push(hud); if (item.baseMods !== original.baseMods || item.loaderVersion !== original.loaderVersion)
    await saveConfig({ ...cfg, instances: cfg.instances.map(i => i.id === item.id ? item : i) }, true); return report; }
