import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getConfig, saveConfig, instancePath, rootPath } from './config';
import { microsoftLogin, getPublicProfile, logout, refreshProfile, selectCape } from './auth';
import { javaVersion, startGame, prepareGame } from './game';
import { serverStatus, modeStatuses } from './status';
import { installedMods, toggleMod, removeMod, searchMods, installMod } from './mods';
import { getLibrary, upload, applySavedSkin } from './skins';
import { memoryInfo } from './memory';
import { officialVersions } from './versions';
import { checkForUpdate } from './updater';
import { ensureJava, javaDetails } from './java';
import { setDownloadSink, downloadStatus, stepStatus } from './downloads';
import { exclusive } from './operations';
import { duplicateProfile, importProfile, exportProfile } from './profile-files';
import { recordError, friendlyError, readLogs, openLogs, exportLogs } from './diagnostics';
import { controlWindow } from './window-controls';
import type { Config } from './types';

let window: BrowserWindow;
const notice = (text: string) => { if (window && !window.isDestroyed()) window.webContents.send('app:notice', text); };

function createWindow(): void {
  window = new BrowserWindow({
    frame: false, width: 1200, height: 790, minWidth: 930, minHeight: 600,
    icon: app.isPackaged ? path.join(process.resourcesPath,'icon.png') : path.resolve('assets/icons/icon.png'),
    backgroundColor: '#09090b', title: 'Scarrix Client', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: false }
  });
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(login\.microsoftonline\.com|microsoft\.com|www\.microsoft\.com|github\.com|docs\.modrinth\.com)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  const dev = process.env.SCARRIX_DEV_SERVER;
  if (dev && !app.isPackaged) window.loadURL(dev);
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  window.webContents.on('will-navigate', e => e.preventDefault());
  window.webContents.once('did-finish-load', () => { if (app.isPackaged) void checkForUpdate(window, false).catch(e => notice(`Update: ${e.message}`)); });
}

function publicConfig(cfg:Config) { return {...cfg,microsoft:{clientId:''},curseforge:{apiKey:''}}; }
function handle(channel:string, action:(event:Electron.IpcMainInvokeEvent,...args:any[])=>any) {
  ipcMain.handle(channel, async(event,...args)=>{try{return await action(event,...args);}catch(error){try{recordError(error);}catch{}if(['game:prepare','game:start','java:install','mods:install','update:check'].includes(channel))stepStatus(friendlyError(error),'error');throw new Error(friendlyError(error));}});
}
function handlers() {
  handle('window:control',(event,action:unknown)=>{if(event.sender!==window.webContents)throw new Error('Unzulässiges Fenster.');return controlWindow(window,action);});
  setDownloadSink(status=>{if(window&&!window.isDestroyed())window.webContents.send('download:status',status);});
  handle('download:get',()=>downloadStatus());
  handle('java:details',()=>javaDetails());
  handle('java:install',()=>exclusive('Java installieren',async()=>{await ensureJava(getConfig().minecraft.version);stepStatus('Java installiert','done');return javaDetails();}));
  handle('profiles:duplicate',async(_e,id:string)=>publicConfig(await duplicateProfile(id)));
  handle('profiles:export',(_e,id:string)=>exportProfile(id));
  handle('profiles:import',async()=>{const cfg=await importProfile();return cfg?publicConfig(cfg):null;});
  handle('mods:list',()=>installedMods());
  handle('mods:toggle',(_e,name:string,enabled:boolean)=>toggleMod(name,enabled===true));
  handle('mods:remove',(_e,name:string)=>removeMod(name));
  handle('diagnostics:read',()=>readLogs());
  handle('diagnostics:open',()=>openLogs());
  handle('diagnostics:export',()=>exportLogs());
  // Never send app authentication configuration into the renderer process.
  handle('config:get', () => {
    const cfg = getConfig();
    return { ...cfg, microsoft: { clientId: '' }, curseforge: { apiKey: '' } };
  });
  handle('system:memory', () => memoryInfo());
  handle('minecraft:versions', () => officialVersions());
  handle('app:version', () => app.getVersion());
  handle('config:save', async (_e, config: Config) => publicConfig(await saveConfig(config)));
  handle('auth:start', () => microsoftLogin(window));
  handle('auth:profile', () => getPublicProfile());
  handle('auth:refresh', () => refreshProfile());
  handle('auth:logout', () => { logout(); return true; });
  handle('status:get', () => serverStatus());
  handle('status:modes', () => modeStatuses());
  handle('java:version', () => javaVersion());
  handle('game:start', (_e, id: string) => startGame(String(id), notice));
  handle('game:prepare', () => prepareGame(notice));
  handle('mods:search', (_e, term: string, source: 'modrinth' | 'curseforge') => {
    if (!['modrinth','curseforge'].includes(source)) throw new Error('Unbekannte Modquelle');
    return searchMods(String(term), source);
  });
  handle('mods:install', (_e, id: string, source: 'modrinth' | 'curseforge') => {
    if (!['modrinth','curseforge'].includes(source)) throw new Error('Unbekannte Modquelle');
    return exclusive('Mod installieren', async()=>{try{const result=await installMod(source, String(id), value => window.webContents.send('app:progress', value));stepStatus('Mod installiert','done');return result;}finally{window.webContents.send('app:progress',null);}});
  });
  handle('skins:library', () => getLibrary('skins'));
  handle('skins:upload', (_e, model: 'classic' | 'slim') => upload('skins', model));
  handle('skins:apply', (_e, id: string, model: 'classic' | 'slim') => applySavedSkin(id, model));
  handle('capes:library', () => getLibrary('capes'));
  handle('capes:upload', () => upload('capes', 'classic'));
  handle('capes:select', (_e, id: string | null) => selectCape(id));
  handle('update:check', () => checkForUpdate(window));
  handle('paths:get', () => ({ minecraft: rootPath(), instance: instancePath() }));
  handle('logs:export', async () => {
    const folder = path.join(instancePath(), 'logs');
    if (!fs.existsSync(folder)) return 'Noch keine lokalen Minecraft-Logs vorhanden.';
    return `Logs bleiben lokal: ${folder}. Automatischer Upload ist absichtlich deaktiviert.`;
  });
  handle('url:open', async (_e, url: string) => {
    if (!/^https:\/\/(github\.com|microsoft\.com|www\.microsoft\.com|login\.microsoftonline\.com|modrinth\.com|docs\.curseforge\.com|adoptium\.net|www\.adoptium\.net)/i.test(url)) throw new Error('URL ist nicht freigegeben.');
    await shell.openExternal(url); return true;
  });
}
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  app.setAppUserModelId('net.scarrix.client');
  handlers(); createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch(err => console.error(err));
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

