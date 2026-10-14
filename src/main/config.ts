import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { validMemory } from './memory';
import { officialVersions } from './versions';
import { assertIdle } from './operations';
import { Config, Instance } from './types';
import crypto from 'node:crypto';
import {validateProfileOptions} from './profile-options';

const defaults: Config = {
  server: { name: 'Scarrix.net', address: 'Scarrix.net', port: 25565 },
  minecraft: { version: '1.21.1', loader: 'vanilla', javaPath: 'java', ramGB: 4 },
  microsoft: { clientId: '604d79e5-9f8c-4e1c-ab0f-6d8001175151' }, github: { owner: 'MustafaNoob1', repo: 'scarrix-client', privateRepo: false },
  modrinth: { userAgent: 'MustafaNoob1/scarrix-client/0.1.1' },
  curseforge: { apiKey: '' }, language: 'de',
  launcher: { rememberAccount: true, theme: 'red', background: 'aurora', animations: true, rotateSkin: true },
  instances: [{ id: 'default', name: 'Standard', version: '1.21.1', loader: 'vanilla', ramGB: 4 }],
  activeInstanceId: 'default',
  modes: [
    {'id': 'survival', 'name': 'Survival', 'address': '135.181.19.35', 'port': 24241},
    {'id': 'hardcoreffa', 'name': 'Hardcore FFA', 'group': 'ModernFFA', 'address': '135.181.19.35', 'port': 25568},
    {'id': 'smpffa', 'name': 'SMPFFA', 'group': 'ModernFFA', 'address': '135.181.19.35', 'port': 25570},
    {'id': 'maceffa', 'name': 'MaceFFA', 'group': 'ModernFFA', 'address': '135.181.19.35', 'port': 25569},
    {'id': 'citybuild', 'name': 'CityBuild', 'address': '135.181.19.35', 'port': 12112},
    {'id': 'primemines', 'name': 'PrimeMines', 'address': '135.181.19.35', 'port': 65455}
  ], news: []
};

export function appData(): string { return app.getPath('userData'); }
export function rootPath(): string { return path.join(appData(), 'minecraft'); }
export function sharedProfilePath(instance:Instance){return instance.sharedGroup&&instance.group?.trim()?path.join(rootPath(),'groups',crypto.createHash('sha256').update(instance.group.trim().toLowerCase()).digest('hex').slice(0,24)):null;}
export function instancePath(): string {
  const config = getConfig();
  const instance = config.minecraft;
  // Different version/loader combinations have different mods and configs.
  const safe = `${instance.version}-${instance.loader}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const suffix = config.activeInstanceId === 'default' ? '' : `-${config.activeInstanceId}`;
  const destination=path.join(rootPath(),'instances',config.activeInstanceId);
  const legacy=path.join(rootPath(),'instances',safe+suffix);
  if(!fs.existsSync(destination)&&fs.existsSync(legacy))fs.renameSync(legacy,destination);
  return sharedProfilePath(config.instances.find(i=>i.id===config.activeInstanceId)!)??destination;
}
function location(): string { return path.join(appData(), 'config.json'); }

export function getConfig(): Config {
  const file = location();
  if (!fs.existsSync(file)) {
    let source = path.join(process.resourcesPath, 'config.json');
    if (!app.isPackaged) source = path.resolve(process.cwd(), 'config.json');
    fs.mkdirSync(appData(), { recursive: true });
    if (fs.existsSync(source)) fs.copyFileSync(source, file);
    else fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
  }
  const custom: Partial<Config> = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Migrate the four untouched example modes from v0.1.0. Do not change user-defined endpoints.
  const legacyIds = ['survival', 'modernffa', 'citybuild', 'primemines'];
  const legacyModes = Array.isArray(custom.modes) && custom.modes.length === 4 &&
    custom.modes.every((m, i) => m.id === legacyIds[i] && m.address?.toLowerCase() === 'scarrix.net' && m.port === 25565);
  if (legacyModes) custom.modes = defaults.modes;

  const combined: Config = {
    ...defaults, ...custom,
    server: { ...defaults.server, ...custom.server },
    minecraft: { ...defaults.minecraft, ...custom.minecraft },
    microsoft: { clientId: custom.microsoft?.clientId?.trim() || defaults.microsoft.clientId },
    github: { ...defaults.github, ...custom.github, owner: custom.github?.owner?.trim() || defaults.github.owner },
    modrinth: { ...defaults.modrinth, ...custom.modrinth },
    curseforge: { ...defaults.curseforge, ...custom.curseforge },
    modes: Array.isArray(custom.modes) ? custom.modes : defaults.modes,
    news: Array.isArray(custom.news) ? custom.news : defaults.news
  };
  // Existing installations are upgraded without losing their old version/RAM settings.
  const instances: Instance[] = Array.isArray(custom.instances) && custom.instances.length
    ? custom.instances
    : [{ id: 'default', name: 'Standard', version: combined.minecraft.version, loader: combined.minecraft.loader === 'quilt' ? 'vanilla' : combined.minecraft.loader, ramGB: combined.minecraft.ramGB }];
  const selected = instances.find(item => item.id === custom.activeInstanceId) ?? instances[0];
  const theme = ['red', 'blue', 'purple', 'gold'].includes(custom.launcher?.theme ?? '') ? custom.launcher!.theme : 'red';
  return {
    ...combined, instances, activeInstanceId: selected.id, launcher: { rememberAccount: custom.launcher?.rememberAccount !== false, theme, rotateSkin: custom.launcher?.rotateSkin !== false, animations: custom.launcher?.animations !== false, backgroundMotion: ['on','off','system'].includes(custom.launcher?.backgroundMotion ?? '') ? custom.launcher?.backgroundMotion : 'on', background: ['grid','glow','plain','aurora','stars','nebula','embers','matrix','horizon'].includes(custom.launcher?.background ?? '') ? custom.launcher!.background : 'grid' },
    minecraft: { ...combined.minecraft, version: selected.version, loader: selected.loader, loaderVersion: selected.loaderVersion, ramGB: selected.ramGB }
  };
}

export async function saveConfig(value: Config, internal = false): Promise<Config> {
  if(!internal)assertIdle();
  // The renderer can only update launcher preferences and selected Minecraft instances.
  // Microsoft credentials, API keys and server endpoints stay under main-process control.
  const existing = getConfig();
  if (!['de', 'en'].includes(value.language)) throw new Error('Ungültige Sprache.');
  if (!['red', 'blue', 'purple', 'gold'].includes(value.launcher?.theme)) throw new Error('Unbekanntes Farbschema.');
  if (!Array.isArray(value.instances) || value.instances.length < 1 || value.instances.length > 16) throw new Error('Maximal 16 Instanzen sind erlaubt.');
  const needsVersions = value.instances.some(item => !existing.instances.some(old => old.id === item.id && old.version === item.version));
  const versions = needsVersions ? await officialVersions() : [];
  const ids = new Set<string>();
  for (const item of value.instances) {
    validateProfileOptions(item);
    if (!/^[a-zA-Z0-9_-]{1,60}$/.test(item.id) || ids.has(item.id)) throw new Error('Ungültige oder doppelte Instanz-ID.');
    ids.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 50 || /[\u0000-\u001f\u007f]/.test(item.name)) throw new Error('Ungültiger Instanzname.');
    if (!/^\d+\.\d+(?:\.\d+)?(?:[.-][\w.]+)?$/.test(item.version)) throw new Error('Ungültige Minecraft-Version.');
    if (!['vanilla', 'fabric', 'forge'].includes(item.loader)) throw new Error('Unbekannter Mod-Loader.');
    if(item.loaderVersion!==undefined&&(item.loader==='vanilla'||typeof item.loaderVersion!=='string'||!/^\d[\w.+-]{0,59}$/.test(item.loaderVersion)))throw new Error('Ungültige Loader-Version.');
    if (!validMemory(item.ramGB)) throw new Error('RAM muss zwischen 512 MB und dem physischen Systemspeicher liegen (256-MB-Schritte).');
    if (!existing.instances.some(old => old.id === item.id && old.version === item.version) && !versions.includes(item.version)) throw new Error('Keine offizielle Minecraft-Release-Version.');
  }
  const active = value.instances.find(item => item.id === value.activeInstanceId);
  const groups=new Map<string,string>();
  for(const item of value.instances.filter(i=>i.sharedGroup)){const group=item.group!.trim().toLowerCase(),signature=item.version+':'+item.loader+':'+(item.loaderVersion??'auto');if(groups.has(group)&&groups.get(group)!==signature)throw new Error('Profile mit gemeinsamem Gruppenordner müssen dieselbe Minecraft- und Loader-Version verwenden.');groups.set(group,signature);}
  if (!active) throw new Error('Bitte wähle eine vorhandene Instanz.');
  for (const old of existing.instances) {
    const legacy=path.join(rootPath(),'instances',old.version+'-'+old.loader+(old.id==='default'?'':'-'+old.id));
    const target=path.join(rootPath(),'instances',old.id);
    if(fs.existsSync(legacy)&&!fs.existsSync(target))fs.renameSync(legacy,target);
  }
  const safe: Config = {
    ...existing, language: value.language,
    launcher: { rememberAccount: value.launcher.rememberAccount !== false, theme: value.launcher.theme, rotateSkin: value.launcher.rotateSkin !== false, animations: value.launcher.animations !== false, backgroundMotion: ['on','off','system'].includes(value.launcher.backgroundMotion ?? '') ? value.launcher.backgroundMotion : 'on', background: ['grid','glow','plain','aurora','stars','nebula','embers','matrix','horizon'].includes(value.launcher.background ?? '') ? value.launcher.background : 'grid' },
    instances: value.instances,
    activeInstanceId: active.id,
    minecraft: { ...existing.minecraft, version: active.version, loader: active.loader, loaderVersion: active.loaderVersion, ramGB: active.ramGB }
  };
  const file = location();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(safe, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
  return getConfig();
}

