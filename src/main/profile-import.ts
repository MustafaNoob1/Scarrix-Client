import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { dialog } from 'electron';
import { getConfig, saveConfig, rootPath } from './config';
import { memoryInfo } from './memory';
import { officialVersions } from './versions';
import { exclusive } from './operations';
import { assertDownloadActive, downloadSignal, stepStatus } from './downloads';
import { openProfileArchive, ProfileArchive, requireProfileSpace, ProfileArchiveEntry } from './profile-archive';
import { archivePath, portableProfilePath, checkedSize, sumSizes } from './profile-policy';
import { parsePack, validatePackArchive, downloadPackFile, safePackPath, safePackUrl, PackFile } from './modpack';
import { validateArchiveEntries } from './profile-files';
import { validateProfileOptions } from './profile-options';
import { reconcileImportedMods } from './profile-import-mods';
import type { Instance } from './types';
interface Plan {
    kind: 'scarrix' | 'norisk' | 'modrinth' | 'curseforge';
    item: Instance;
    files: PackFile[];
    raw?: any;
    prefix: string;
    messages: string[];
    targets: Map<string, string>;
}
function name(value: unknown) { if (typeof value !== 'string' || !value.trim() || /[\x00-\x1f\x7f]/.test(value) || value.length > 100)
    throw Error('Ungültiger Profilname.'); return value.trim().slice(0, 50); }
function component(value: unknown) { if (typeof value !== 'string' || value.includes('/'))
    throw Error('Ungültiger Dateiname im Profil.'); return safePackPath(value); }
function clampRam(value: unknown) { const info = memoryInfo(), mb = typeof value === 'number' && Number.isFinite(value) ? value : info.recommendedMB; return Math.max(512, Math.min(info.maxMB ?? mb, Math.floor(mb / 256) * 256)) / 1024; }
export function noRiskProfile(raw: any): {
    item: Omit<Instance, 'id'>;
    messages: string[];
} {
    const loader = typeof raw?.loader === 'string' ? raw.loader.toLowerCase() : '';
    if (!['vanilla', 'fabric', 'forge'].includes(loader) || typeof raw.game_version !== 'string' || !Array.isArray(raw.mods))
        throw Error('Unbekanntes oder nicht unterstütztes NoRisk-Profil.');
    const settings = raw.settings ?? {}, messages: string[] = [], item: Omit<Instance, 'id'> = { name: name(raw.name), version: raw.game_version, loader: loader as Instance['loader'], ramGB: clampRam(settings.memory?.max), group: typeof raw.group === 'string' ? raw.group.slice(0, 40) : 'Importiert' };
    if (settings.use_overwrite_loader_version === true)
        item.loaderVersion = settings.overwrite_loader_version ?? raw.loader_version;
    else if (raw.loader_version)
        messages.push('Die automatische Loader-Auswahl wurde übernommen; die veraltete gespeicherte Version ' + raw.loader_version + ' wurde nicht festgesetzt.');
    const resolution = settings.resolution;
    if (resolution && Number.isInteger(resolution.width) && Number.isInteger(resolution.height))
        item.window = { width: resolution.width, height: resolution.height, fullscreen: settings.fullscreen === true };
    else if (settings.fullscreen === true)
        item.window = { width: 854, height: 480, fullscreen: true };
    if (settings.custom_jvm_args) {
        const args = Array.isArray(settings.custom_jvm_args) ? settings.custom_jvm_args : String(settings.custom_jvm_args).split(/\s+/);
        item.jvmArgs = [];
        for (const arg of args) {
            try {
                validateProfileOptions({ ...item, id: 'import', jvmArgs: [arg] });
                item.jvmArgs.push(arg);
            }
            catch {
                messages.push('Nicht portable Java-Option nicht übernommen: ' + String(arg).slice(0, 80));
            }
        }
        if (item.jvmArgs.length > 20)
            item.jvmArgs = item.jvmArgs.slice(0, 20);
    }
    if (settings.use_custom_java_path)
        messages.push('Java wird passend zu Minecraft automatisch gewählt; ein fremder Programmpfad wird nicht ausgeführt.');
    return { item, messages };
}
async function json(url: string, init: RequestInit = {}) { const response = await fetch(url, { ...init, headers: { 'User-Agent': getConfig().modrinth?.userAgent ?? 'ScarrixClient/ProfileImport', ...init.headers }, redirect: 'error', signal: downloadSignal(30000) }); if (!response.ok || !response.body)
    throw Error('Profil-Dateiinformationen nicht erreichbar (HTTP ' + response.status + ').'); const chunks: Buffer[] = []; let size = 0; for await (const chunk of response.body as any) {
    size += chunk.length;
    if (size > 64 * 1024 * 1024)
        throw Error('Dateiinformationen sind zu groß.');
    chunks.push(Buffer.from(chunk));
} return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
async function remoteSize(url: string) { for (let hop = 0; hop <= 5; hop++) {
    url = safePackUrl(url);
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: downloadSignal(30000) });
    await response.body?.cancel();
    if (response.status >= 300 && response.status < 400) {
        const next = response.headers.get('location');
        if (!next || hop === 5)
            throw Error('Ungültige Download-Weiterleitung.');
        url = new URL(next, url).href;
        continue;
    }
    if (!response.ok || !response.headers.has('content-length'))
        throw Error('Profildatei ohne verlässliche Größenangabe.');
    return checkedSize(Number(response.headers.get('content-length')));
} throw Error('Profildatei nicht erreichbar.'); }
function noRiskActive(mod: any, item: Instance) { if (mod.enabled === false)
    return false; if (Array.isArray(mod.force_include_versions) && mod.force_include_versions.includes(item.version))
    return true; if (Array.isArray(mod.game_versions) && mod.game_versions.length && !mod.game_versions.includes(item.version))
    return false; if (mod.associated_loader && mod.associated_loader !== item.loader && mod.associated_loader !== 'vanilla')
    return false; return true; }
async function noRiskFiles(plan: Plan, archive: ProfileArchive) {
    const mods = plan.raw.mods, hashes = mods.filter((m: any) => m.source?.type === 'modrinth').map((m: any) => String(m.source.file_hash_sha1 ?? '').toLowerCase());
    let lookup: Record<string, any> = {};
    for (let offset = 0; offset < hashes.length; offset += 500) {
        try {
            Object.assign(lookup, await json('https://api.modrinth.com/v2/version_files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashes: hashes.slice(offset, offset + 500), algorithm: 'sha1' }) }));
        }
        catch {
            plan.messages.push('Einige Download-Quellen werden direkt anhand ihrer gespeicherten SHA-1-Prüfsumme geprüft.');
        }
    }
    const reserved = new Set<string>();
    for (const mod of mods) {
        const source = mod?.source;
        if (!source || typeof source.type !== 'string')
            throw Error('Mod im NoRisk-Profil ohne Quelle.');
        const original = component(source.file_name ?? mod.file_name_override ?? path.basename(String(source.path ?? ''))), active = noRiskActive(mod, plan.item), hash = String(source.file_hash_sha1 ?? '').toLowerCase(), version = lookup[hash], remote = version?.files?.find((f: any) => f.hashes?.sha1?.toLowerCase() === hash), loaders = version?.loaders ?? [];
        let folder = /\.zip$/i.test(original) ? loaders.some((l: string) => ['iris', 'optifine', 'canvas'].includes(l)) ? 'shaderpacks' : loaders.includes('datapack') ? 'datapacks' : 'resourcepacks' : 'mods';
        let target = folder + '/' + component(mod.file_name_override ?? original);
        if (!active && !target.endsWith('.disabled'))
            target += '.disabled';
        if (reserved.has(target.toLowerCase())) {
            const parts = path.posix.parse(target);
            target = parts.dir + '/' + parts.name + '-' + crypto.createHash('sha1').update(hash + String(mod.id ?? original)).digest('hex').slice(0, 8) + parts.ext;
        }
        reserved.add(target.toLowerCase());
        plan.targets.set(original.toLowerCase(), target);
        if (!active)
            plan.messages.push(original + ' wurde wie im Quellprofil inaktiv übernommen.');
        const embedded = archive.entries.find(e => !e.isDirectory && e.entryName.startsWith('overrides/') && path.posix.basename(e.entryName).toLowerCase().replace(/\.disabled$/, '') === original.toLowerCase().replace(/\.disabled$/, ''));
        if (embedded)
            continue;
        if (!['modrinth', 'curse_forge', 'curseforge'].includes(source.type))
            throw Error('Lokale Mod fehlt im Profilarchiv: ' + original);
        if (!/^[a-f0-9]{40}$/.test(hash))
            throw Error('Mod ohne gültige Prüfsumme: ' + original);
        const url = safePackUrl(remote?.url ?? source.download_url), fileSize = remote ? checkedSize(remote.size) : await remoteSize(url);
        plan.files.push({ path: target, fileSize, hashes: { sha1: hash, ...(/^[a-f0-9]{128}$/i.test(remote?.hashes?.sha512 ?? '') ? { sha512: remote.hashes.sha512 } : {}) }, downloads: [url] });
    }
}
async function curseforgeFiles(plan: Plan) { const cfg = getConfig(), raw = plan.raw; if (raw.files.length && !cfg.curseforge?.apiKey)
    throw Error('Dieses CurseForge-ZIP enthält nur Download-IDs. Dafür ist ein CurseForge-API-Schlüssel nötig. Für dein NoRisk-Profil bitte die .noriskpack-Datei verwenden; sie enthält geprüfte Download-Adressen.'); const seen = new Set<string>(); for (const ref of raw.files) {
    if (!Number.isSafeInteger(ref.projectID) || ref.projectID < 1 || !Number.isSafeInteger(ref.fileID) || ref.fileID < 1)
        throw Error('Ungültige CurseForge-Datei-ID.');
    const info = (await json('https://api.curseforge.com/v1/mods/' + ref.projectID + '/files/' + ref.fileID, { headers: { 'x-api-key': cfg.curseforge.apiKey } })).data;
    if (info?.id !== ref.fileID || info.modId !== ref.projectID)
        throw Error('CurseForge-Datei gehört nicht zum Profil.');
    const sha1 = info.hashes?.find((h: any) => h.algo === 1)?.value;
    if (!/^[a-f0-9]{40}$/i.test(sha1 ?? ''))
        throw Error('CurseForge-Datei ohne Prüfsumme.');
    const project = (await json('https://api.curseforge.com/v1/mods/' + ref.projectID, { headers: { 'x-api-key': cfg.curseforge.apiKey } })).data, folder = project?.classId === 12 ? 'resourcepacks' : project?.classId === 6552 ? 'shaderpacks' : 'mods', target = folder + '/' + component(info.fileName);
    if (seen.has(target.toLowerCase()))
        throw Error('Doppelte CurseForge-Datei.');
    seen.add(target.toLowerCase());
    const url = info.downloadUrl ?? (await json('https://api.curseforge.com/v1/mods/' + ref.projectID + '/files/' + ref.fileID + '/download-url', { headers: { 'x-api-key': cfg.curseforge.apiKey } })).data;
    plan.files.push({ path: target, fileSize: checkedSize(info.fileLength), hashes: { sha1 }, downloads: [safePackUrl(url)] });
} }
async function readPlan(archive: ProfileArchive): Promise<Plan> {
    const id = 'instance-' + crypto.randomUUID(), base = { id, name: 'Importiert', version: '', loader: 'vanilla' as const, ramGB: memoryInfo().recommendedMB / 1024 }, plan: Plan = { kind: 'scarrix', item: base, files: [], prefix: 'files/', messages: [], targets: new Map() };
    const own = archive.entry('profile.json'), mr = archive.entry('modrinth.index.json'), cf = archive.entry('manifest.json');
    if (own) {
        const raw = JSON.parse((await archive.read(own)).toString('utf8'));
        if (raw.format === 'scarrix-profile' && raw.schema === 1) {
            validateArchiveEntries(archive.entries);
            const p = raw.profile;
            plan.item = { ...base, name: name(p?.name), version: p?.version, loader: p?.loader, loaderVersion: p?.loaderVersion, ramGB: clampRam(typeof p?.ramGB === 'number' ? p.ramGB * 1024 : undefined), group: p?.group, icon: p?.icon, window: p?.window, jvmArgs: p?.jvmArgs, quickPlayWorld: p?.quickPlayWorld, favorite: p?.favorite, color: p?.color };
        }
        else {
            const parsed = noRiskProfile(raw);
            plan.kind = 'norisk';
            plan.raw = raw;
            plan.item = { ...parsed.item, id };
            plan.messages = parsed.messages;
            plan.prefix = 'overrides/';
        }
    }
    else if (mr) {
        validatePackArchive(archive.entries);
        const p = parsePack(JSON.parse((await archive.read(mr)).toString('utf8')));
        plan.kind = 'modrinth';
        plan.item = { ...base, name: p.name, version: p.version, loader: p.loader, loaderVersion: p.loaderVersion, group: 'Modpacks' };
        plan.files = p.files;
        plan.prefix = 'overrides/';
    }
    else if (cf) {
        const raw = JSON.parse((await archive.read(cf)).toString('utf8'));
        if (raw.manifestType !== 'minecraftModpack' || raw.manifestVersion !== 1 || !Array.isArray(raw.files) || typeof raw.minecraft?.version !== 'string' || !Array.isArray(raw.minecraft?.modLoaders))
            throw Error('Ungültiges CurseForge-Profil.');
        const list = raw.minecraft.modLoaders, selected = list.find((v: any) => v.primary) ?? list[0], match = selected && /^(fabric|forge)-([\w.+-]+)$/.exec(selected.id);
        if (selected && !match)
            throw Error('Dieser Modloader wird noch nicht unterstützt.');
        plan.kind = 'curseforge';
        plan.raw = raw;
        plan.item = { ...base, name: name(raw.name), version: raw.minecraft.version, loader: match ? match[1] as Instance['loader'] : 'vanilla', loaderVersion: match?.[2], group: 'Modpacks' };
        const prefix = raw.overrides ?? 'overrides';
        plan.prefix = archivePath(prefix) + '/';
    }
    else
        throw Error('Keine unterstützte Profilbeschreibung gefunden (.scarrixpack, .noriskpack, .mrpack oder CurseForge-ZIP).');
    if (!['vanilla', 'fabric', 'forge'].includes(plan.item.loader) || typeof plan.item.version !== 'string' || !/^\d+\.\d+(?:\.\d+)?(?:[.-][\w.]+)?$/.test(plan.item.version))
        throw Error('Ungültige Minecraft-/Loader-Version im Profil.');
    validateProfileOptions(plan.item);
    return plan;
}
function targetPath(plan: Plan, entry: ProfileArchiveEntry) { let relative: string | undefined; if (entry.entryName.startsWith(plan.prefix))
    relative = entry.entryName.slice(plan.prefix.length);
else if (plan.kind === 'modrinth' && entry.entryName.startsWith('client-overrides/'))
    relative = entry.entryName.slice(17); if (!relative || entry.isDirectory)
    return null; relative = safePackPath(relative); if (plan.kind === 'norisk' && relative.startsWith('mods/')) {
    const basename = path.posix.basename(relative).toLowerCase(), mapped = plan.targets.get(basename) ?? plan.targets.get(basename.replace(/\.disabled$/, ''));
    if (mapped)
        return basename.endsWith('.disabled') && !mapped.endsWith('.disabled') ? mapped + '.disabled' : mapped;
    const parts = relative.split('/');
    if (parts.length > 2) {
        if (parts[1] === 'nrc-' + plan.item.version + '-' + plan.item.loader)
            return 'mods/' + parts.slice(2).join('/');
        return 'scarrix-imported-inactive/' + relative;
    }
} return relative; }
export async function importProfileArchive(input?: string, internal = false) {
    const action = async () => {
        const cfg = getConfig();
        if (cfg.instances.length >= 16)
            throw Error('Maximal 16 Profile.');
        const choice = input ? { canceled: false, filePaths: [input] } : await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Minecraft-Profil', extensions: ['scarrixpack', 'noriskpack', 'mrpack', 'zip'] }] });
        if (choice.canceled || !choice.filePaths[0])
            return null;
        const archive = await openProfileArchive(choice.filePaths[0]);
        let stage = '', destination = '', stageCreated = false, destinationCreated = false;
        const parent = path.resolve(rootPath(), 'instances');
        try {
            const plan = await readPlan(archive);
            if (plan.kind !== 'scarrix' && !(await officialVersions()).includes(plan.item.version))
                throw Error('Keine unterstützte offizielle Minecraft-Release-Version.');
            const optional = plan.files.filter(f => f.env?.client === 'optional').length;
            const confirmation = plan.kind === 'scarrix' ? { response: 0, checkboxChecked: false } : await dialog.showMessageBox({ type: 'question', title: 'Profil importieren', message: plan.item.name, detail: plan.item.version + ' · ' + plan.item.loader + '\nDas Profil wird vollständig als neue Instanz übernommen. Inkompatible oder doppelte Fabric-Mods bleiben als deaktivierte Dateien erhalten. Downloads und Archive werden auf Prüfsummen geprüft.', buttons: ['Importieren', 'Abbrechen'], cancelId: 1, defaultId: 0, ...(optional ? { checkboxLabel: optional + ' optionale Client-Dateien mit installieren', checkboxChecked: false } : {}) });
            if (confirmation.response !== 0)
                return null;
            assertDownloadActive();
            if (plan.kind === 'norisk')
                await noRiskFiles(plan, archive);
            if (plan.kind === 'curseforge')
                await curseforgeFiles(plan);
            const files = plan.files.filter(f => f.env?.client !== 'unsupported' && (f.env?.client !== 'optional' || confirmation.checkboxChecked)), entries = archive.entries.slice().sort((a, b) => Number(a.entryName.startsWith('client-overrides/')) - Number(b.entryName.startsWith('client-overrides/'))).map(entry => ({ entry, target: targetPath(plan, entry) })).filter((e): e is {
                entry: ProfileArchiveEntry;
                target: string;
            } => !!e.target);
            const required = sumSizes([...files.map(f => f.fileSize), ...entries.map(e => e.entry.header.size)]);
            for (let at = parent;; at = path.dirname(at)) {
                if (fs.existsSync(at) && fs.lstatSync(at).isSymbolicLink())
                    throw Error('Importziel enthält einen Link.');
                if (at === path.resolve(rootPath()))
                    break;
            }
            await requireProfileSpace(parent, required);
            stage = path.join(parent, '.import-' + plan.item.id);
            destination = path.join(parent, plan.item.id);
            if (fs.existsSync(stage) || fs.existsSync(destination))
                throw Error('Importziel existiert bereits.');
            fs.mkdirSync(stage);
            stageCreated = true;
            stepStatus('Profil wird importiert');
            for (let n = 0; n < files.length; n++) {
                assertDownloadActive();
                const file = files[n], target = path.join(stage, file.path);
                fs.mkdirSync(path.dirname(target), { recursive: true });
                await downloadPackFile(file, target, 'Profil ' + (n + 1) + '/' + files.length + ' · ' + path.basename(file.path));
            }
            for (const { entry, target } of entries) {
                assertDownloadActive();
                await archive.extract(entry, path.join(stage, target));
            }
            if (plan.kind !== 'scarrix')
                await reconcileImportedMods(stage, plan.item, plan.messages);
            if (plan.messages.length)
                fs.writeFileSync(path.join(stage, 'scarrix-import-report.json'), JSON.stringify({ format: plan.kind, messages: plan.messages }, null, 2));
            fs.renameSync(stage, destination);
            stageCreated = false;
            destinationCreated = true;
            const saved = await saveConfig({ ...cfg, instances: [...cfg.instances, plan.item], activeInstanceId: plan.item.id }, true);
            stepStatus('Profil vollständig importiert' + (plan.messages.length ? ' · Hinweise in scarrix-import-report.json' : ''), 'done');
            return saved;
        }
        catch (e) {
            for (const folder of [stageCreated ? stage : '', destinationCreated ? destination : ''])
                if (folder && path.dirname(path.resolve(folder)) === parent && fs.existsSync(folder))
                    fs.rmSync(folder, { recursive: true, force: true });
            stepStatus('Profil-Import fehlgeschlagen', 'error');
            throw e;
        }
        finally {
            archive.close();
        }
    };
    return internal ? action() : exclusive('Profil importieren', action);
}
