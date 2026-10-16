import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import { openProfileArchive } from './profile-archive';
import type { Instance } from './types';

const stateFile = 'scarrix-hud-install.json';
const hash = (file: string) => crypto.createHash('sha512').update(fs.readFileSync(file)).digest('hex');
function noLink(file: string) { if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw Error('Scarrix-HUD-Pfad enthält einen Link.'); }
async function metadata(file: string) {
    const zip = await openProfileArchive(file);
    try { const e = zip.entry('fabric.mod.json'); return e ? JSON.parse((await zip.read(e, 1024 * 1024)).toString('utf8')) : null; }
    finally { await zip.close(); }
}

/** Only our bundled, checked client mod is managed here. User jars are never adopted or replaced. */
export async function installScarrixHud(item: Instance, root: string, bundle?: string): Promise<string | null> {
    if (item.loader !== 'fabric' || !item.baseMods || item.version !== '26.2') return null;
    const resources = bundle ?? (app.isPackaged ? path.join(process.resourcesPath, 'scarrix-mods') : path.join(app.getAppPath(), 'assets', 'mods'));
    const manifest = JSON.parse(fs.readFileSync(path.join(resources, 'manifest.json'), 'utf8'));
    if (manifest.schema !== 1 || manifest.minecraft !== item.version || manifest.id !== 'scarrix_hud' || !/^scarrix-hud-[\w.+-]+\.jar$/.test(manifest.filename) || !/^[a-f0-9]{128}$/.test(manifest.sha512)) throw Error('Ungültige Scarrix-HUD-Bundle-Metadaten.');
    const source = path.join(resources, manifest.filename);
    noLink(source);
    if (fs.statSync(source).size > 4 * 1024 * 1024 || hash(source) !== manifest.sha512) throw Error('Scarrix-HUD-Prüfsumme stimmt nicht.');
    const data = await metadata(source);
    if (data?.id !== manifest.id || data.version !== manifest.version || data.environment !== 'client' || data.depends?.minecraft !== item.version) throw Error('Scarrix-HUD passt nicht zu diesem Profil.');
    const mods = path.join(root, 'mods'), statePath = path.join(root, stateFile);
    for (const p of [root, mods, statePath]) noLink(p);
    fs.mkdirSync(mods, { recursive: true });
    let state: {filename: string; sha512: string} | undefined;
    if (fs.existsSync(statePath)) {
        if (fs.statSync(statePath).size > 4096) throw Error('Ungültiger Scarrix-HUD-Installationsstatus.');
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        if (!state || !/^scarrix-hud-[\w.+-]+\.jar$/.test(state.filename) || !/^[a-f0-9]{128}$/.test(state.sha512)) throw Error('Ungültiger Scarrix-HUD-Installationsstatus.');
    }
    const own: {file: string; disabled: boolean}[] = [];
    for (const name of fs.readdirSync(mods).filter(n => /\.jar(?:\.disabled)?$/i.test(n))) {
        const file = path.join(mods, name); noLink(file);
        if ((await metadata(file))?.id === manifest.id) own.push({file, disabled: name.endsWith('.disabled')});
    }
    if (own.some(m => m.disabled)) return 'Scarrix HUD bleibt deaktiviert.';
    if (own.length > 1) throw Error('Scarrix HUD ist mehrfach vorhanden. Bitte im Mods-Tab prüfen.');
    const existing = own[0]?.file;
    if (existing && fs.statSync(existing).size <= 4 * 1024 * 1024 && hash(existing) === manifest.sha512) return null;
    if (existing && (!state || path.basename(existing) !== state.filename || fs.statSync(existing).size > 4 * 1024 * 1024 || hash(existing) !== state.sha512)) return 'Eigene Scarrix-HUD-Datei bleibt unverändert.';
    if (!existing && state) return 'Entfernte Scarrix-HUD-Mod wird nicht automatisch erneut installiert.';
    const destination = path.join(mods, manifest.filename);
    if (fs.readdirSync(mods).some(n => n.toLowerCase() === manifest.filename.toLowerCase() && path.join(mods, n) !== existing)) throw Error('Scarrix-HUD-Dateiname ist bereits belegt.');
    const stage = path.join(root, '.scarrix-hud-' + crypto.randomUUID());
    fs.mkdirSync(stage);
    const staged = path.join(stage, manifest.filename), backup = path.join(stage, 'previous.jar');
    let moved = false, installed = false;
    try {
        fs.copyFileSync(source, staged, fs.constants.COPYFILE_EXCL);
        if (hash(staged) !== manifest.sha512) throw Error('Scarrix-HUD-Kopie beschädigt.');
        fs.writeFileSync(path.join(stage, 'state.json'), JSON.stringify({filename: manifest.filename, sha512: manifest.sha512}));
        if (existing) { fs.renameSync(existing, backup); moved = true; }
        fs.renameSync(staged, destination); installed = true;
        fs.renameSync(path.join(stage, 'state.json'), statePath);
        return 'Scarrix HUD installiert · Menü: Rechte Umschalttaste (änderbar in Minecraft).';
    } catch (error) {
        if (installed) fs.unlinkSync(destination);
        if (moved && existing) fs.renameSync(backup, existing);
        throw error;
    } finally { fs.rmSync(stage, {recursive: true, force: true}); }
}
