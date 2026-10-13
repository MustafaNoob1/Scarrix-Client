import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { getConfig, instancePath } from './config';
import { ModHit, ModInstallResult } from './types';
import { assertIdle } from './operations';
import { progressReporter } from './downloads';

const base = 'https://api.modrinth.com/v2';
async function json(url: string, headers: Record<string, string> = {}): Promise<any> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Mod-API HTTP ${response.status}`);
  return response.json();
}
const agent = () => ({ 'User-Agent': getConfig().modrinth.userAgent });
const cfHeaders = () => {
  const key = getConfig().curseforge.apiKey.trim();
  if (!key) throw new Error('CurseForge benötigt einen freigegebenen API-Key. Trage ihn unter Einstellungen ein.');
  return { 'x-api-key': key };
};
export async function searchMods(term: string, source: 'modrinth' | 'curseforge'): Promise<ModHit[]> {
  if (!term.trim() || term.length > 100) return [];
  const { version, loader } = getConfig().minecraft;
  if (source === 'modrinth') {
    const facets = [['project_type:mod'], [`versions:${version}`]];
    if (loader !== 'vanilla') facets.push([`categories:${loader}`]);
    const q = new URLSearchParams({ query: term, limit: '20', facets: JSON.stringify(facets) });
    const res = await json(`${base}/search?${q}`, agent());
    return (res.hits ?? []).map((v: any) => ({ id: v.project_id, name: v.title, description: v.description, downloads: v.downloads, icon: v.icon_url, source: 'modrinth' }));
  }
  const q = new URLSearchParams({ gameId: '432', classId: '6', searchFilter: term, gameVersion: version, pageSize: '20' });
  const res = await json(`https://api.curseforge.com/v1/mods/search?${q}`, cfHeaders());
  return (res.data ?? []).map((v: any) => ({ id: String(v.id), name: v.name, description: v.summary, downloads: v.downloadCount || 0, icon: v.logo?.url, source: 'curseforge' }));
}

function safeJar(name: string): string {
  const file = path.basename(name).replace(/[^\w.() -]/g, '_');
  if (!file.toLowerCase().endsWith('.jar') || file.length > 180 || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(file)) throw new Error('Die Mod-Datei ist keine zulässige JAR-Datei.');
  return file;
}
async function downloadJar(url: string, fileName: string, expectedSha512: string | undefined, notify: (percent: number) => void): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Es sind nur HTTPS-Downloads erlaubt.');
  const folder = path.join(instancePath(), 'mods');
  fs.mkdirSync(folder, { recursive: true });
  const dest = path.join(folder, safeJar(fileName));
  const temp = dest + '.part';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`Download fehlgeschlagen (HTTP ${response.status}).`);
    if (new URL(response.url).protocol !== 'https:') throw new Error('Unsichere Weiterleitung verhindert.');
    const length = Number(response.headers.get('content-length') || 0);
    const limit = 150 * 1024 * 1024;
    if (length > limit) throw new Error('Mod-Datei ist zu groß (maximal 150 MB).');
    const digest = crypto.createHash('sha512');
    let count = 0;
    const detailedProgress=progressReporter('Mod herunterladen: '+fileName);
    const progress = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        count += chunk.length;
        if (count > limit) return cb(new Error('Dateigrößenlimit überschritten.'));
        digest.update(chunk);
        detailedProgress(count,length||null);
        if (length) notify(Math.round(count / length * 100));
        cb(null, chunk);
      }
    });
    await pipeline(Readable.fromWeb(response.body as any), progress, fs.createWriteStream(temp, { flags: 'wx' }));
    if (expectedSha512 && digest.digest('hex').toLowerCase() !== expectedSha512.toLowerCase()) throw new Error('SHA512-Prüfsumme stimmt nicht überein.');
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(temp, dest);
    notify(100);
    return path.basename(dest);
  } catch (err) { if (fs.existsSync(temp)) fs.unlinkSync(temp); throw err; }
  finally { clearTimeout(timeout); }
}
export function installedMods(): Array<{filename:string;enabled:boolean;size:number}> {
  const folder=path.join(instancePath(),'mods');
  if(!fs.existsSync(folder))return [];
  return fs.readdirSync(folder).filter(n=>/\.jar(?:\.disabled)?$/i.test(n)).filter(n=>!fs.lstatSync(path.join(folder,n)).isSymbolicLink()).map(filename=>({filename,enabled:!filename.endsWith('.disabled'),size:fs.statSync(path.join(folder,filename)).size})).sort((a,b)=>a.filename.localeCompare(b.filename));
}
function managedMod(filename:string) {
  if(typeof filename!=='string'||path.basename(filename)!==filename||filename.includes('\\')||!/^.{1,190}\.jar(?:\.disabled)?$/i.test(filename))throw new Error('Ungültige Mod-Datei.');
  const file=path.join(instancePath(),'mods',filename);
  if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())throw new Error('Mod-Datei nicht gefunden.');
  return file;
}
export function toggleMod(filename:string,enabled:boolean) {
  assertIdle();const file=managedMod(filename);
  const dest=enabled?file.replace(/\.disabled$/,''):file.endsWith('.disabled')?file:file+'.disabled';
  if(file!==dest){if(fs.existsSync(dest))throw new Error('Eine Mod-Datei mit diesem Namen existiert bereits.');fs.renameSync(file,dest);}
  return installedMods();
}
export function removeMod(filename:string) {
  assertIdle();const file=managedMod(filename);
  const folder=path.join(instancePath(),'removed-mods');fs.mkdirSync(folder,{recursive:true});
  fs.renameSync(file,path.join(folder,Date.now()+'-'+crypto.randomUUID()+'-'+filename));
  return installedMods();
}

export async function installMod(source: 'modrinth' | 'curseforge', id: string, notify: (percent: number) => void): Promise<ModInstallResult> {
  if (!/^[\w-]{1,40}$/.test(id)) throw new Error('Ungültige Mod-ID.');
  const cfg = getConfig();
  if (cfg.minecraft.loader === 'vanilla') throw new Error('Mods benötigen Fabric oder Forge. Ändere zuerst den Loader in den Einstellungen.');
  if (source === 'modrinth') {
    const params = new URLSearchParams({ game_versions: JSON.stringify([cfg.minecraft.version]), loaders: JSON.stringify([cfg.minecraft.loader]) });
    const versions: any[] = await json(`${base}/project/${id}/version?${params}`, agent());
    if (!versions.length) throw new Error('Keine kompatible Mod-Version gefunden.');
    const selected = versions.find(v => v.version_type === 'release') ?? versions[0];
    const file = selected.files?.find((f: any) => f.primary) ?? selected.files?.[0];
    if (!file?.url || !file.filename) throw new Error('Mod-Version enthält keinen Download.');
    const filename = await downloadJar(file.url, file.filename, file.hashes?.sha512, notify);
    const dependencies = (selected.dependencies ?? []).filter((d: any) => d.dependency_type === 'required').map((d: any) => d.project_id || d.version_id).filter(Boolean);
    return { filename, dependencies };
  }
  const headers = cfHeaders();
  const response = await json(`https://api.curseforge.com/v1/mods/${id}/files?pageSize=50`, headers);
  const candidates = (response.data ?? []).filter((v: any) => v.gameVersions?.includes(cfg.minecraft.version));
  const selected = candidates[0];
  if (!selected) throw new Error('Keine Datei für diese Minecraft-Version bei CurseForge gefunden.');
  // Files without a provided download URL cannot legally be mirrored/downloaded by this API consumer.
  const urlResponse = await json(`https://api.curseforge.com/v1/mods/${id}/files/${selected.id}/download-url`, headers);
  const downloadUrl = urlResponse.data;
  if (!downloadUrl || typeof downloadUrl !== 'string') throw new Error('CurseForge erlaubt für diese Datei keinen direkten API-Download.');
  const filename = await downloadJar(downloadUrl, selected.fileName, undefined, notify);
  const dependencies = (selected.dependencies ?? []).filter((d: any) => d.relationType === 3).map((d: any) => String(d.modId));
  return { filename, dependencies };
}

