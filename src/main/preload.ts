import { contextBridge, ipcRenderer } from 'electron';
const listen = (channel: string, cb: (data: any) => void) => {
  const listener = (_e: Electron.IpcRendererEvent, data: unknown) => cb(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('scarrix', {
  config: { get: () => ipcRenderer.invoke('config:get'), save: (cfg: unknown) => ipcRenderer.invoke('config:save', cfg) },
  auth: { start: () => ipcRenderer.invoke('auth:start'), profile: () => ipcRenderer.invoke('auth:profile'), refresh: () => ipcRenderer.invoke('auth:refresh'), logout: () => ipcRenderer.invoke('auth:logout') },
  status: () => ipcRenderer.invoke('status:get'),
  java: () => ipcRenderer.invoke('java:version'),
  game: (mode: string) => ipcRenderer.invoke('game:start', mode),
  mods: { search: (query: string, source: string) => ipcRenderer.invoke('mods:search', query, source), install: (id: string, source: string) => ipcRenderer.invoke('mods:install', id, source) },
  skins: { library: () => ipcRenderer.invoke('skins:library'), upload: (model: string) => ipcRenderer.invoke('skins:upload', model), apply: (id: string, model: string) => ipcRenderer.invoke('skins:apply', id, model) },
  capes: { library: () => ipcRenderer.invoke('capes:library'), upload: () => ipcRenderer.invoke('capes:upload'), select: (id: string | null) => ipcRenderer.invoke('capes:select', id) },
  paths: () => ipcRenderer.invoke('paths:get'), logs: () => ipcRenderer.invoke('logs:export'), update: () => ipcRenderer.invoke('update:check'),
  openUrl: (url: string) => ipcRenderer.invoke('url:open', url),
  onDevice: (cb: (m: unknown) => void) => listen('auth:device', cb),
  onNotice: (cb: (m: unknown) => void) => listen('app:notice', cb),
  onProgress: (cb: (m: unknown) => void) => listen('app:progress', cb)
});
