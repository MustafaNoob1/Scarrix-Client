export interface Profile { id: string; name: string; skins: { id?: string; url: string; variant?: string }[]; capes: { id: string; alias?: string; url: string; state?: string }[] }
export interface Mode { id: string; name: string; address: string; port: number; group?: string }
export interface Config {
  server: { name: string; address: string; port: number; group?: string };
  minecraft: { version: string; loader: 'vanilla' | 'fabric' | 'forge' | 'quilt'; javaPath: string; ramGB: number };
  microsoft: { clientId: string }; github: { owner: string; repo: string; privateRepo?: boolean };
  modrinth: { userAgent: string }; curseforge: { apiKey: string };
  language: 'de' | 'en'; modes: Mode[]; news: { title: string; text: string }[];
}
export interface ModHit { id: string; name: string; description: string; downloads: number; source: 'modrinth' | 'curseforge'; icon?: string }
export interface SavedImage { id: string; name: string; dataUrl: string; added: string }
export interface Api {
  config: { get(): Promise<Config>; save(c: Config): Promise<Config> };
  auth: { start(): Promise<Profile>; profile(): Promise<Profile | null>; refresh(): Promise<Profile>; logout(): Promise<void> };
  status(): Promise<{ online: boolean; players: number | null; maxPlayers: number | null; version: string | null }>;
  java(): Promise<string>; game(mode: string): Promise<string>; gamePrepare(): Promise<string>;
  mods: { search(term: string, source: string): Promise<ModHit[]>; install(id: string, source: string): Promise<{ filename: string; dependencies: string[] }> };
  skins: { library(): Promise<SavedImage[]>; upload(model: string): Promise<{library: SavedImage[]; message: string}>; apply(id: string, model: string): Promise<Profile> };
  capes: { library(): Promise<SavedImage[]>; upload(): Promise<{library: SavedImage[]; message: string}>; select(id: string | null): Promise<Profile> };
  paths(): Promise<{minecraft:string; instance:string}>; logs(): Promise<string>; update(): Promise<string>;
  openUrl(url: string): Promise<void>;
  onDevice(cb: (msg: { code: string; url: string; message: string }) => void): () => void;
  onNotice(cb: (msg: string) => void): () => void;
  onProgress(cb: (pct: number) => void): () => void;
}
declare global { interface Window { scarrix: Api } }
