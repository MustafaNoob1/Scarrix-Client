import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { Config } from './types';

const defaults: Config = {
  server: { name: 'Scarrix.net', address: 'Scarrix.net', port: 25565 },
  minecraft: { version: '1.21.1', loader: 'vanilla', javaPath: 'java', ramGB: 4 },
  microsoft: { clientId: '' }, github: { owner: 'MustafaNoob1', repo: 'scarrix-client' },
  modrinth: { userAgent: 'MustafaNoob1/scarrix-client/0.1.1' },
  curseforge: { apiKey: '' }, language: 'de',
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
  const instance = getConfig().minecraft;
  // Different version/loader combinations have different mods and configs.
  const safe = `${instance.version}-${instance.loader}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(rootPath(), 'instances', safe);
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

  return {
    ...defaults, ...custom,
    server: { ...defaults.server, ...custom.server },
    minecraft: { ...defaults.minecraft, ...custom.minecraft },
    microsoft: { ...defaults.microsoft, ...custom.microsoft },
    github: { ...defaults.github, ...custom.github, owner: custom.github?.owner?.trim() || defaults.github.owner },
    modrinth: { ...defaults.modrinth, ...custom.modrinth },
    curseforge: { ...defaults.curseforge, ...custom.curseforge },
    modes: Array.isArray(custom.modes) ? custom.modes : defaults.modes,
    news: Array.isArray(custom.news) ? custom.news : defaults.news
  };
}

export function saveConfig(value: Config): Config {
  if (!/^[\w.:-]{1,255}$/.test(value.server.address) || !/^\d+\.\d+(?:\.\d+)?(?:[.-][\w.]+)?$/.test(value.minecraft.version)) throw new Error('Serveradresse oder Minecraft-Version ungültig.');
  if (!Number.isInteger(value.minecraft.ramGB) || value.minecraft.ramGB < 2 || value.minecraft.ramGB > 32) throw new Error('RAM muss zwischen 2 und 32 GB liegen.');
  if (!['vanilla','fabric','forge','quilt'].includes(value.minecraft.loader)) throw new Error('Unbekannter Mod-Loader.');
  if (!['de','en'].includes(value.language)) throw new Error('Ungültige Sprache.');
  if (!Array.isArray(value.modes) || value.modes.length > 30) throw new Error('Ungültige Spielmodi.');
  const file = location();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
  return getConfig();
}
