import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { Config, Instance } from './types';

const defaults: Config = {
  server: { name: 'Scarrix.net', address: 'Scarrix.net', port: 25565 },
  minecraft: { version: '1.21.1', loader: 'vanilla', javaPath: 'java', ramGB: 4 },
  microsoft: { clientId: '604d79e5-9f8c-4e1c-ab0f-6d8001175151' }, github: { owner: 'MustafaNoob1', repo: 'scarrix-client', privateRepo: true },
  modrinth: { userAgent: 'MustafaNoob1/scarrix-client/0.1.1' },
  curseforge: { apiKey: '' }, language: 'de',
  launcher: { theme: 'red' },
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
export function instancePath(): string {
  const config = getConfig();
  const instance = config.minecraft;
  // Different version/loader combinations have different mods and configs.
  const safe = `${instance.version}-${instance.loader}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const suffix = config.activeInstanceId === 'default' ? '' : `-${config.activeInstanceId}`;
  return path.join(rootPath(), 'instances', safe + suffix);
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
    ...combined, instances, activeInstanceId: selected.id, launcher: { theme },
    minecraft: { ...combined.minecraft, version: selected.version, loader: selected.loader, ramGB: selected.ramGB }
  };
}

export function saveConfig(value: Config): Config {
  // The renderer can only update launcher preferences and selected Minecraft instances.
  // Microsoft credentials, API keys and server endpoints stay under main-process control.
  const existing = getConfig();
  if (!['de', 'en'].includes(value.language)) throw new Error('Ungültige Sprache.');
  if (!['red', 'blue', 'purple', 'gold'].includes(value.launcher?.theme)) throw new Error('Unbekanntes Farbschema.');
  if (!Array.isArray(value.instances) || value.instances.length < 1 || value.instances.length > 16) throw new Error('Maximal 16 Instanzen sind erlaubt.');
  const ids = new Set<string>();
  for (const item of value.instances) {
    if (!/^[a-zA-Z0-9_-]{1,60}$/.test(item.id) || ids.has(item.id)) throw new Error('Ungültige oder doppelte Instanz-ID.');
    ids.add(item.id);
    if (!/^[a-zA-Z0-9 ._-]{1,50}$/.test(item.name)) throw new Error('Ungültiger Instanzname.');
    if (!/^\d+\.\d+(?:\.\d+)?(?:[.-][\w.]+)?$/.test(item.version)) throw new Error('Ungültige Minecraft-Version.');
    if (!['vanilla', 'fabric', 'forge'].includes(item.loader)) throw new Error('Unbekannter Mod-Loader.');
    if (!Number.isInteger(item.ramGB) || item.ramGB < 2 || item.ramGB > 32) throw new Error('RAM muss zwischen 2 und 32 GB liegen.');
  }
  const active = value.instances.find(item => item.id === value.activeInstanceId);
  if (!active) throw new Error('Bitte wähle eine vorhandene Instanz.');
  const safe: Config = {
    ...existing, language: value.language,
    launcher: { theme: value.launcher.theme },
    instances: value.instances,
    activeInstanceId: active.id,
    minecraft: { ...existing.minecraft, version: active.version, loader: active.loader, ramGB: active.ramGB }
  };
  const file = location();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(safe, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
  return getConfig();
}
