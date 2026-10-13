import { contextBridge, ipcRenderer } from 'electron';
const listen = (channel: string, cb: (data: any) => void) => {
  const listener = (_e: Electron.IpcRendererEvent, data: unknown) => cb(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('scarrix', {
  windowControl: (action: 'state'|'minimize'|'maximize'|'close') => ipcRenderer.invoke('window:control',action),
  config: { get: () => ipcRenderer.invoke('config:get'), save: (cfg: unknown) => ipcRenderer.invoke('config:save', cfg) },
  auth: { start: () => ipcRenderer.invoke('auth:start'), profile: () => ipcRenderer.invoke('auth:profile'), refresh: () => ipcRenderer.invoke('auth:refresh'), logout: () => ipcRenderer.invoke('auth:logout') },
  status: () => ipcRenderer.invoke('status:get'),
  statusModes: () => ipcRenderer.invoke('status:modes'),
  javaDetails: () => ipcRenderer.invoke('java:details'),
  javaInstall: () => ipcRenderer.invoke('java:install'),
  profiles: { duplicate:(id:string)=>ipcRenderer.invoke('profiles:duplicate',id), export:(id:string)=>ipcRenderer.invoke('profiles:export',id), import:()=>ipcRenderer.invoke('profiles:import') },
  diagnostics: {read:()=>ipcRenderer.invoke('diagnostics:read'),open:()=>ipcRenderer.invoke('diagnostics:open'),export:()=>ipcRenderer.invoke('diagnostics:export')},
  downloadStatus:()=>ipcRenderer.invoke('download:get'),
  onDownload:(cb:(data:unknown)=>void)=>listen('download:status',cb),
  java: () => ipcRenderer.invoke('java:version'),
  game: (mode: string) => ipcRenderer.invoke('game:start', mode),
  gamePrepare: () => ipcRenderer.invoke('game:prepare'),
  mods: { list:()=>ipcRenderer.invoke('mods:list'), toggle:(name:string,enabled:boolean)=>ipcRenderer.invoke('mods:toggle',name,enabled), remove:(name:string)=>ipcRenderer.invoke('mods:remove',name), search: (query: string, source: string) => ipcRenderer.invoke('mods:search', query, source), install: (id: string, source: string) => ipcRenderer.invoke('mods:install', id, source) },
  skins: { library: () => ipcRenderer.invoke('skins:library'), upload: (model: string) => ipcRenderer.invoke('skins:upload', model), apply: (id: string, model: string) => ipcRenderer.invoke('skins:apply', id, model) },
  capes: { library: () => ipcRenderer.invoke('capes:library'), upload: () => ipcRenderer.invoke('capes:upload'), select: (id: string | null) => ipcRenderer.invoke('capes:select', id) },
  memory: () => ipcRenderer.invoke('system:memory'),
  versions: () => ipcRenderer.invoke('minecraft:versions'),
  version: () => ipcRenderer.invoke('app:version'),
  paths: () => ipcRenderer.invoke('paths:get'), logs: () => ipcRenderer.invoke('logs:export'), update: () => ipcRenderer.invoke('update:check'),
  openUrl: (url: string) => ipcRenderer.invoke('url:open', url),
  onDevice: (cb: (m: unknown) => void) => listen('auth:device', cb),
  onNotice: (cb: (m: unknown) => void) => listen('app:notice', cb),
  onProgress: (cb: (m: unknown) => void) => listen('app:progress', cb)
});

