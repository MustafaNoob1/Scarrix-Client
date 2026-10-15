export interface LauncherUpdateState {status:'idle'|'checking'|'available'|'downloading'|'ready'|'current'|'manual'|'disabled'|'error';version:string|null;message:string;canDownload:boolean;percent:number|null}
export interface ProfileContent {filename:string;name:string;version:string;icon?:string;enabled:boolean;size:number;kind:ContentKind;world?:string;update?:{project:string;version:string;number:string}}
export interface ModPreflight {profileId:string;checked:number;canLaunch:boolean;issues:Array<{severity:'error'|'warning';file:string;message:string}>;note:string}
export interface ProfileOverview {bytes:number;truncated:boolean;worlds:string[];lastPlayed:number|null;playtime:number;lastDuration?:number;week?:Array<{date:string;duration:number}>}
export type ContentKind='mod'|'resourcepack'|'shader'|'datapack';
export interface CatalogItem {id:string;name:string;description:string;downloads:number;icon?:string;author:string;categories:string[];kind:ContentKind|'modpack';source:'modrinth'|'curseforge'}
export interface CatalogVersion {id:string;name:string;number:string;type:string;gameVersions:string[];loaders:string[];downloads:number;published:string}
export interface CatalogTarget extends Instance {compatible:boolean;installed:boolean;selectedVersion:CatalogVersion|null;worlds:string[]}
export interface GameSession {id:string;name:string;version:string;loader:string;player:string;startedAt:number;endedAt:number|null;pid:number|null;ramMB:number;state:'running'|'stopping'|'exited';exitCode:number|null;diagnosis?:{kind:string;title:string;message:string;steps:string[];confidence:'likely'|'unknown'}|null}
export interface GameLogLine {sequence:number;time:number;level:'ERROR'|'WARN'|'INFO'|'DEBUG'|'TRACE';text:string}
export interface Profile { id: string; name: string; skins: { id?: string; url: string; variant?: string }[]; capes: { id: string; alias?: string; url: string; state?: string }[] }
export interface Mode { id: string; name: string; address: string; port: number; group?: string }
export interface Instance { id: string; name: string; version: string; loader: 'vanilla' | 'fabric' | 'forge'; loaderVersion?: string; ramGB: number;favorite?:boolean;color?:'red'|'blue'|'purple'|'gold';preferredAccountId?:string;group?:string;sharedGroup?:boolean;quickPlayWorld?:string;javaPath?:string;jvmArgs?:string[];window?:{width:number;height:number;fullscreen:boolean};icon?:string }
export interface Config {
  server: { name: string; address: string; port: number; group?: string };
  minecraft: { version: string; loader: 'vanilla' | 'fabric' | 'forge' | 'quilt'; loaderVersion?: string; javaPath: string; ramGB: number };
  microsoft: { clientId: string }; github: { owner: string; repo: string; privateRepo?: boolean };
  modrinth: { userAgent: string }; curseforge: { apiKey: string };
  launcher: { discordPresence?:boolean;showNews?:boolean;skinSize?:'small'|'medium'|'large';quickProfileId?:string;onboardingDone?:boolean; theme: 'red' | 'blue' | 'purple' | 'gold'; rememberAccount?: boolean; rotateSkin?: boolean; animations?: boolean; backgroundMotion?: 'on' | 'off' | 'system'; background?: 'grid' | 'glow' | 'plain' | 'aurora' | 'stars' | 'nebula' | 'embers' | 'matrix' | 'horizon' };
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
export interface QueueJob {id:string;label:string;state:'queued'|'running'|'done'|'error'|'cancelled';percent:number|null;message:string;created:number;attempt:number}
export interface Backup {id:string;name:string;created:number;bytes:number;scope:string}
export interface MediaItem {name:string;modified:number;bytes:number|null;image?:string}
export interface DiagnosticAnalysis {diagnosis:NonNullable<GameSession['diagnosis']>|null;errors:string[];report:string;message:string}
export interface FriendPreferences {status:'online'|'away'|'busy'|'invisible';showServer:boolean;allowRequests:boolean;allowInvites:boolean;notifications:boolean}
export interface FriendsSnapshot {connected:false;contacts:Array<{id:string;name:string;added:number}>;preferences:FriendPreferences;requests:never[]}
export interface DiscordPresenceState {status:'disabled'|'unconfigured'|'waiting'|'connecting'|'connected'|'error';message:string;page:string}
export interface Api {
  discord:{state():Promise<DiscordPresenceState>;page(page:'play'|'profiles'|'mods'|'skins'|'capes'|'settings'):Promise<DiscordPresenceState>};
  friends:{get():Promise<FriendsSnapshot>;preferences(value:FriendPreferences):Promise<FriendsSnapshot>;add(name:string):Promise<FriendsSnapshot>;remove(id:string):Promise<FriendsSnapshot>};
  queue:{list():Promise<QueueJob[]>;cancel(id:string):Promise<QueueJob[]>;retry(id:string):Promise<QueueJob[]>};onQueue(cb:(jobs:QueueJob[])=>void):()=>void;
  catalog:{modpack(id:string,version:string):Promise<QueueJob>;search(source:string,query:{term:string;kind:ContentKind|'modpack';version?:string;loader?:string;category?:string;sort?:string;offset?:number}):Promise<{items:CatalogItem[];total:number}>;categories(kind:ContentKind|'modpack'):Promise<Array<{id:string;name:string}>>;versions(source:string,id:string,filter?:{gameVersion?:string;loader?:string}):Promise<CatalogVersion[]>;targets(source:string,id:string,version:string|null,kind:ContentKind):Promise<CatalogTarget[]>;install(source:string,id:string,instance:string,version:string|null,kind:ContentKind,world?:string):Promise<QueueJob>};
  sessions:{list():Promise<GameSession[]>;logs(id:string,since:number):Promise<{lines:GameLogLine[];lastSequence:number;truncated:boolean}>;stop(id:string):Promise<void>;folder(id:string):Promise<void>;exportTree(id:string):Promise<Array<{path:string;directory:boolean;size:number}>>;export(id:string,options?:{format:"scarrixpack"|"mrpack"|"curseforge";fileName:string;selected:string[];openFolder:boolean}):Promise<string>};
  windowControl(action:'state'|'minimize'|'maximize'|'close'):Promise<boolean>;
  javaDetails():Promise<JavaDetails>; javaInstall():Promise<JavaDetails>;
  profiles:{preflight(id:string):Promise<ModPreflight>;backups(id:string):Promise<Backup[]>;backup(id:string,scope?:string):Promise<Backup>;restore(id:string,backup:string):Promise<Config>;removeBackup(id:string,backup:string):Promise<Backup[]>;media(id:string,kind:string):Promise<MediaItem[]>;openMedia(id:string,kind:string,name:string):Promise<void>;saveScreenshot(id:string,name:string):Promise<string>;contents(id:string,kind:ContentKind,world?:string):Promise<ProfileContent[]>;overview(id:string):Promise<ProfileOverview>;toggle(id:string,kind:ContentKind,name:string,enabled:boolean,world?:string):Promise<ProfileContent[]>;removeContent(id:string,kind:ContentKind,name:string,world?:string):Promise<ProfileContent[]>;updates(id:string,kind:ContentKind,world?:string):Promise<ProfileContent[]>;updateContent(id:string,kind:ContentKind,name:string,world?:string):Promise<QueueJob>;folder(id:string,section?:string):Promise<void>;delete(id:string):Promise<Config>;loaders(version:string,loader:string):Promise<Array<{version:string;stable:boolean}>>;icon():Promise<string|null>;javaPick():Promise<string|null>;java(version:string,path?:string):Promise<{required:number;items:Array<{path:string;version:string;major:number;compatible:boolean}>}>;modpack():Promise<Config|null>;duplicate(id:string):Promise<Config>;exportTree(id:string):Promise<Array<{path:string;directory:boolean;size:number}>>;export(id:string,options?:{format:"scarrixpack"|"mrpack"|"curseforge";fileName:string;selected:string[];openFolder:boolean}):Promise<string>;import():Promise<Config|null>};
  diagnostics:{analyze():Promise<DiagnosticAnalysis>;read():Promise<{launcher:string;minecraft:string}>;open():Promise<void>;export():Promise<string>};
  downloadStatus():Promise<DownloadStatus|null>;
  onDownload(cb:(status:DownloadStatus)=>void):()=>void;
  config: { get(): Promise<Config>; save(c: Config): Promise<Config> };
  auth: {accounts():Promise<Array<{id:string;name:string}>>;switch(id:string):Promise<Profile>;remove(id:string):Promise<Array<{id:string;name:string}>>; start(): Promise<Profile>; profile(): Promise<Profile | null>; refresh(): Promise<Profile>; logout(): Promise<void> };
  status(): Promise<{ online: boolean; players: number | null; maxPlayers: number | null; version: string | null }>;
  statusModes(): Promise<Array<{ id: string; online: boolean | null; players: number | null; maxPlayers: number | null }>>;
  java(): Promise<string>; game(mode: string,instanceId?:string): Promise<string>; gamePrepare(): Promise<string>;
  mods: { list():Promise<InstalledMod[]>;toggle(name:string,enabled:boolean):Promise<InstalledMod[]>;remove(name:string):Promise<InstalledMod[]>;search(term: string, source: string): Promise<ModHit[]>; install(id: string, source: string): Promise<{ filename: string; dependencies: string[] }> };
  skins: {prepare(input?:string):Promise<SkinDraft|null>;save(id:string,name:string,model:string):Promise<{library:SavedImage[];selectedId:string}>;edit(id:string,input:{name?:string;model?:string;favorite?:boolean}):Promise<SavedImage[]>;remove(id:string):Promise<SavedImage[]>; library(): Promise<SavedImage[]>; upload(model: string): Promise<{library: SavedImage[]; message: string; selectedId?: string}>; apply(id: string, model: string): Promise<Profile> };
  capes: {template():Promise<string>;community():Promise<{enabled:boolean;items:Array<{id:string;name:string;ownerName:string;uses:number;url:string}>}>;preview():Promise<{selectedId:string|null;dataUrl?:string}>;setPreview(id:string|null):Promise<{selectedId:string|null;dataUrl?:string}>;edit(id:string,input:{name?:string;favorite?:boolean}):Promise<SavedImage[]>;remove(id:string):Promise<SavedImage[]>; library(): Promise<SavedImage[]>; upload(): Promise<{library: SavedImage[]; message: string; selectedId?: string}>; select(id: string | null): Promise<Profile> };
  memory(): Promise<{ maxMB: number; recommendedMB: number }>;
  versions(): Promise<string[]>;
  version(): Promise<string>; paths(): Promise<{minecraft:string; instance:string}>; logs(): Promise<string>; update(): Promise<string>;updateState():Promise<LauncherUpdateState>;updateDownload():Promise<string>;updateInstall():Promise<string>;onUpdate(cb:(state:LauncherUpdateState)=>void):()=>void;
  openUrl(url: string): Promise<void>;
  onDevice(cb: (msg: { code: string; url: string; message: string }) => void): () => void;
  onNotice(cb: (msg: string) => void): () => void;
  onProgress(cb: (pct: number | null) => void): () => void;
}
declare global { interface Window { scarrix: Api } }

