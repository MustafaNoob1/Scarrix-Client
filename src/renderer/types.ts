export type ContentKind='mod'|'resourcepack'|'shader'|'datapack';
export interface CatalogItem {id:string;name:string;description:string;downloads:number;icon?:string;author:string;categories:string[];kind:ContentKind;source:'modrinth'|'curseforge'}
export interface CatalogVersion {id:string;name:string;number:string;type:string;gameVersions:string[];loaders:string[];downloads:number;published:string}
export interface CatalogTarget extends Instance {compatible:boolean;installed:boolean;selectedVersion:CatalogVersion|null;worlds:string[]}
export interface GameSession {id:string;name:string;version:string;loader:string;player:string;startedAt:number;endedAt:number|null;pid:number|null;ramMB:number;state:'running'|'stopping'|'exited';exitCode:number|null;diagnosis?:{kind:string;title:string;message:string;steps:string[];confidence:'likely'|'unknown'}|null}
export interface GameLogLine {sequence:number;time:number;level:'ERROR'|'WARN'|'INFO'|'DEBUG'|'TRACE';text:string}
export interface Profile { id: string; name: string; skins: { id?: string; url: string; variant?: string }[]; capes: { id: string; alias?: string; url: string; state?: string }[] }
export interface Mode { id: string; name: string; address: string; port: number; group?: string }
export interface Instance { id: string; name: string; version: string; loader: 'vanilla' | 'fabric' | 'forge'; loaderVersion?: string; ramGB: number }
export interface Config {
  server: { name: string; address: string; port: number; group?: string };
  minecraft: { version: string; loader: 'vanilla' | 'fabric' | 'forge' | 'quilt'; loaderVersion?: string; javaPath: string; ramGB: number };
  microsoft: { clientId: string }; github: { owner: string; repo: string; privateRepo?: boolean };
  modrinth: { userAgent: string }; curseforge: { apiKey: string };
  launcher: { theme: 'red' | 'blue' | 'purple' | 'gold'; rememberAccount?: boolean; rotateSkin?: boolean; animations?: boolean; backgroundMotion?: 'on' | 'off' | 'system'; background?: 'grid' | 'glow' | 'plain' | 'aurora' | 'stars' };
  instances: Instance[];
  activeInstanceId: string;
  language: 'de' | 'en'; modes: Mode[]; news: { title: string; text: string }[];
}
export interface ModHit { id: string; name: string; description: string; downloads: number; source: 'modrinth' | 'curseforge'; icon?: string }
export interface SavedImage { id: string; name: string; dataUrl: string; added: string; model?:'classic'|'slim';favorite?:boolean }
export interface SkinDraft {id:string;name:string;dataUrl:string;model:'classic'|'slim'}
export interface DownloadStatus {step:string;percent:number|null;downloaded:number;total:number|null;speed:number;remainingSeconds:number|null;completedFiles:number;state:'working'|'done'|'error'}
export interface JavaDetails {required:number;version:string|null;path:string|null;compatible:boolean}
export interface InstalledMod {filename:string;enabled:boolean;size:number}
export interface Api {
  catalog:{search(source:string,query:{term:string;kind:ContentKind;version?:string;loader?:string;category?:string;sort?:string;offset?:number}):Promise<{items:CatalogItem[];total:number}>;categories(kind:ContentKind):Promise<Array<{id:string;name:string}>>;versions(source:string,id:string,filter?:{gameVersion?:string;loader?:string}):Promise<CatalogVersion[]>;targets(source:string,id:string,version:string|null,kind:ContentKind):Promise<CatalogTarget[]>;install(source:string,id:string,instance:string,version:string|null,kind:ContentKind,world?:string):Promise<{filename:string;dependencies:string[];profileName:string;version:string}>};
  sessions:{list():Promise<GameSession[]>;logs(id:string,since:number):Promise<{lines:GameLogLine[];lastSequence:number;truncated:boolean}>;stop(id:string):Promise<void>;folder(id:string):Promise<void>;export(id:string):Promise<string>};
  windowControl(action:'state'|'minimize'|'maximize'|'close'):Promise<boolean>;
  javaDetails():Promise<JavaDetails>; javaInstall():Promise<JavaDetails>;
  profiles:{modpack():Promise<Config|null>;duplicate(id:string):Promise<Config>;export(id:string):Promise<string>;import():Promise<Config|null>};
  diagnostics:{read():Promise<{launcher:string;minecraft:string}>;open():Promise<void>;export():Promise<string>};
  downloadStatus():Promise<DownloadStatus|null>;
  onDownload(cb:(status:DownloadStatus)=>void):()=>void;
  config: { get(): Promise<Config>; save(c: Config): Promise<Config> };
  auth: { start(): Promise<Profile>; profile(): Promise<Profile | null>; refresh(): Promise<Profile>; logout(): Promise<void> };
  status(): Promise<{ online: boolean; players: number | null; maxPlayers: number | null; version: string | null }>;
  statusModes(): Promise<Array<{ id: string; online: boolean | null; players: number | null; maxPlayers: number | null }>>;
  java(): Promise<string>; game(mode: string): Promise<string>; gamePrepare(): Promise<string>;
  mods: { list():Promise<InstalledMod[]>;toggle(name:string,enabled:boolean):Promise<InstalledMod[]>;remove(name:string):Promise<InstalledMod[]>;search(term: string, source: string): Promise<ModHit[]>; install(id: string, source: string): Promise<{ filename: string; dependencies: string[] }> };
  skins: {prepare(input?:string):Promise<SkinDraft|null>;save(id:string,name:string,model:string):Promise<{library:SavedImage[];selectedId:string}>;edit(id:string,input:{name?:string;model?:string;favorite?:boolean}):Promise<SavedImage[]>;remove(id:string):Promise<SavedImage[]>; library(): Promise<SavedImage[]>; upload(model: string): Promise<{library: SavedImage[]; message: string; selectedId?: string}>; apply(id: string, model: string): Promise<Profile> };
  capes: {community():Promise<{enabled:boolean;items:Array<{id:string;name:string;ownerName:string;uses:number;url:string}>}>;preview():Promise<{selectedId:string|null;dataUrl?:string}>;setPreview(id:string|null):Promise<{selectedId:string|null;dataUrl?:string}>;edit(id:string,input:{name?:string;favorite?:boolean}):Promise<SavedImage[]>;remove(id:string):Promise<SavedImage[]>; library(): Promise<SavedImage[]>; upload(): Promise<{library: SavedImage[]; message: string; selectedId?: string}>; select(id: string | null): Promise<Profile> };
  memory(): Promise<{ maxMB: number; recommendedMB: number }>;
  versions(): Promise<string[]>;
  version(): Promise<string>; paths(): Promise<{minecraft:string; instance:string}>; logs(): Promise<string>; update(): Promise<string>;
  openUrl(url: string): Promise<void>;
  onDevice(cb: (msg: { code: string; url: string; message: string }) => void): () => void;
  onNotice(cb: (msg: string) => void): () => void;
  onProgress(cb: (pct: number | null) => void): () => void;
}
declare global { interface Window { scarrix: Api } }

