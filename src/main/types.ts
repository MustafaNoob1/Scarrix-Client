export interface Mode { id: string; name: string; address: string; port: number; group?: string }
export interface Instance { id: string; name: string; version: string; loader: 'vanilla' | 'fabric' | 'forge'; ramGB: number }
export interface Config {
  server: { name: string; address: string; port: number; group?: string };
  minecraft: { version: string; loader: 'vanilla' | 'fabric' | 'forge' | 'quilt'; javaPath: string; ramGB: number };
  microsoft: { clientId: string };
  github: { owner: string; repo: string; privateRepo?: boolean };
  modrinth: { userAgent: string };
  curseforge: { apiKey: string };
  launcher: { theme: 'red' | 'blue' | 'purple' | 'gold'; rotateSkin?: boolean; animations?: boolean; backgroundMotion?: 'on' | 'off' | 'system'; background?: 'grid' | 'glow' | 'plain' | 'aurora' | 'stars' };
  instances: Instance[];
  activeInstanceId: string;
  language: 'de' | 'en';
  modes: Mode[];
  news: { title: string; text: string }[];
}
export interface Profile { id: string; name: string; skins: Array<{ id?: string; url: string; variant?: string }>; capes: Array<{ id: string; alias?: string; url: string; state?: string }> }
export interface ModHit { id: string; name: string; description: string; downloads: number; source: 'modrinth' | 'curseforge'; icon?: string }
export interface DeviceMessage { code: string; url: string; message: string }
export interface ModInstallResult { filename: string; dependencies: string[] }

