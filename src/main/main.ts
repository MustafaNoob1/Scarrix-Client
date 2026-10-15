import {startDiscordPresence,stopDiscordPresence,updateDiscordPresence,discordPresenceState} from './discord-presence';
import {listAccounts,switchAccount,removeAccount} from './auth';
import {forgetAllSavedAccounts} from './account-vault';
import {assertIdle} from './operations';
import {modPreflight} from './mod-preflight';
import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getConfig, saveConfig, instancePath, rootPath } from './config';
import { microsoftLogin, getPublicProfile, logout, refreshProfile, selectCape, restoreSession } from './auth';
import { javaVersion, startGame, prepareGame } from './game';
import { serverStatus, modeStatuses } from './status';
import { installedMods, toggleMod, removeMod, searchMods, installMod } from './mods';
import { getLibrary, upload, applySavedSkin, prepareSkin, saveSkinDraft, editLibraryImage, removeLibraryImage, capePreview, setCapePreview } from './skins';
import { memoryInfo } from './memory';
import { officialVersions } from './versions';
import { checkForUpdate,downloadLauncherUpdate,installLauncherUpdate,updateState } from './updater';
import { ensureJava, javaDetails } from './java';
import { setDownloadSink, downloadStatus, stepStatus } from './downloads';
import { exclusive } from './operations';
import { duplicateProfile, importProfile, exportProfile } from './profile-files';
import { recordError, friendlyError, readLogs, openLogs, exportLogs } from './diagnostics';
import { listGameSessions, gameSessionLogs, stopGameSession, openGameSessionFolder, exportGameSessionLogs } from './game-sessions';
import { readWindowState, watchWindowState } from './window-state';
import { forgetMicrosoftAccount } from './microsoft-token';
import { importModpack } from './modpack';
import { searchCatalog, catalogVersions, catalogTargets, installCatalog, catalogCategories } from './catalog';
import { communityCapes } from './community-capes';
import {profileExportTree,exportSelectedProfile} from './profile-export';
import {saveCapeTemplate} from './cape-images';
import { controlWindow } from './window-controls';
import {profileContents,profileOverview,toggleProfileContent,removeProfileContent,openProfileFolder,profileLoaders,profileIcon,profileJavaPick,profileJava,checkProfileUpdates,updateProfileContent,deleteProfile} from './profile-studio';
import type { Config } from './types';
import {friendsSnapshot,saveFriendPreferences,addLocalContact,removeLocalContact} from './friends';
import {enqueueDownload,queueState,setQueueSink,cancelDownload,retryDownload} from './download-queue';
import {createBackup,listBackups,restoreBackup,removeBackup} from './profile-backups';
import {profileMedia,openProfileMedia,saveScreenshot} from './profile-media';
import {installCatalogModpack} from './modpack-catalog';
import {analyzeDiagnostics} from './diagnostics';

let window: BrowserWindow;
const notice = (text: string) => { if (window && !window.isDestroyed()) window.webContents.send('app:notice', text); };

function createWindow(): void {
  const savedWindow=readWindowState();
  window = new BrowserWindow({
    frame: false, ...savedWindow,
    icon: app.isPackaged ? path.join(process.resourcesPath,'icon.png') : path.resolve('assets/icons/icon.png'),
    backgroundColor: '#09090b', title: 'Scarrix Client', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: false }
  });
  watchWindowState(window);
  startDiscordPresence();
  if(savedWindow.maximized)window.maximize();
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
  handle('discord:state',()=>discordPresenceState());
  handle('discord:page',(event,page)=>{if(event.sender.id!==window.webContents.id)throw Error('Fenster nicht freigegeben.');return updateDiscordPresence(page);});
  handle('friends:get',()=>friendsSnapshot());
  handle('friends:preferences',(_e,value)=>saveFriendPreferences(value));
  handle('friends:add',(_e,name)=>addLocalContact(name));
  handle('friends:remove',(_e,id)=>removeLocalContact(id));
  setQueueSink(jobs=>{if(window&&!window.isDestroyed())window.webContents.send('queue:state',jobs);});
  handle('queue:list',()=>queueState());
  handle('queue:cancel',(_e,id)=>cancelDownload(id));
  handle('queue:retry',(_e,id)=>retryDownload(id));
  handle('profiles:backups',(_e,id)=>listBackups(id));
  handle('profiles:backup',(_e,id,scope)=>exclusive('Sicherung erstellen',()=>createBackup(id,scope??'full','Manuelle Sicherung',true)));
  handle('profiles:restore',(_e,id,backup)=>exclusive('Sicherung wiederherstellen',async()=>{const chosen=listBackups(id).find(b=>b.id===backup);if(!chosen)throw Error('Sicherung nicht gefunden.');await createBackup(id,chosen.scope,'Schutz vor Wiederherstellung',true);await restoreBackup(id,backup,true);return publicConfig(getConfig());}));
  handle('profiles:backup:remove',(_e,id,backup)=>removeBackup(id,backup));
  handle('profiles:media',(_e,id,kind)=>profileMedia(id,kind));
  handle('profiles:media:open',(_e,id,kind,name)=>openProfileMedia(id,kind,name));
  handle('profiles:screenshot:save',(_e,id,name)=>saveScreenshot(id,name));
  handle('diagnostics:analyze',()=>analyzeDiagnostics());
  handle('catalog:modpack',(_e,id,version)=>enqueueDownload('Modpack installieren',()=>installCatalogModpack(id,version)));
  handle('profiles:contents',(_e,id,kind,world)=>profileContents(id,kind,world));
  handle('profiles:preflight',(_e,id)=>modPreflight(id));
  handle('profiles:overview',(_e,id)=>profileOverview(id));
  handle('profiles:toggle',(_e,id,kind,name,enabled,world)=>toggleProfileContent(id,kind,name,enabled===true,world));
  handle('profiles:content:remove',(_e,id,kind,name,world)=>removeProfileContent(id,kind,name,world));
  handle('profiles:folder',(_e,id,section)=>openProfileFolder(id,section));
  handle('profiles:delete',async(_e,id)=>publicConfig(await deleteProfile(id)));
  handle('profiles:loaders',(_e,version,loader)=>profileLoaders(version,loader));
  handle('profiles:icon',()=>profileIcon());
  handle('profiles:java:pick',()=>profileJavaPick());
  handle('profiles:java',(_e,version,javaPath)=>profileJava(version,javaPath));
  handle('profiles:updates',(_e,id,kind,world)=>checkProfileUpdates(id,kind,world));
  handle('profiles:content:update',(_e,id,kind,name,world)=>enqueueDownload('Profilinhalt aktualisieren',async()=>{const result=await updateProfileContent(id,kind,name,world,()=>{});return result.filename+' aktualisiert.';}));
  handle('capes:community',()=>communityCapes());
  handle('skins:prepare',(_e,input:unknown)=>prepareSkin(input));
  handle('skins:save',(_e,id:unknown,name:unknown,model:unknown)=>saveSkinDraft(id,name,model));
  handle('skins:edit',(_e,id:unknown,input:any)=>editLibraryImage('skins',id,input));
  handle('skins:remove',(_e,id:unknown)=>removeLibraryImage('skins',id));
  handle('capes:edit',(_e,id:unknown,input:any)=>editLibraryImage('capes',id,input));
  handle('capes:remove',(_e,id:unknown)=>removeLibraryImage('capes',id));
  handle('capes:preview',()=>capePreview());
  handle('capes:preview:set',(_e,id:unknown)=>setCapePreview(id));
  handle('catalog:search',(_e,source:unknown,query:any)=>searchCatalog(source,query));
  handle('catalog:categories',(_e,kind:unknown)=>catalogCategories(kind));
  handle('catalog:versions',(_e,source:unknown,id:unknown,filter:any)=>catalogVersions(source,id,filter));
  handle('catalog:targets',(_e,source:unknown,id:unknown,version:unknown,kind:unknown)=>catalogTargets(source,id,version,kind));
  handle('catalog:install',(_e,source,id,instance,version,kind,world)=>enqueueDownload('Inhalt installieren',async()=>{const result=await installCatalog(source,id,instance,version,kind,world,()=>{});return result.filename+' in '+result.profileName+' installiert.'+(result.dependencies.length?' '+result.dependencies.length+' Pflicht-Abhängigkeiten installiert.':'');}));
  handle('profiles:modpack',async()=>{const cfg=await importModpack();return cfg?publicConfig(cfg):null;});
  handle('sessions:list',()=>listGameSessions());
  handle('sessions:logs',(_e,id:unknown,since:unknown)=>gameSessionLogs(id,since));
  handle('sessions:stop',(_e,id:unknown)=>stopGameSession(id));
  handle('sessions:folder',(_e,id:unknown)=>openGameSessionFolder(id));
  handle('sessions:export',(_e,id:unknown)=>exportGameSessionLogs(id));
  handle('window:control',(event,action:unknown)=>{if(event.sender!==window.webContents)throw new Error('Unzulässiges Fenster.');return controlWindow(window,action);});
  setDownloadSink(status=>{if(window&&!window.isDestroyed())window.webContents.send('download:status',status);});
  handle('download:get',()=>downloadStatus());
  handle('java:details',()=>javaDetails());
  handle('java:install',()=>exclusive('Java installieren',async()=>{await ensureJava(getConfig().minecraft.version);stepStatus('Java installiert','done');return javaDetails();}));
  handle('profiles:duplicate',async(_e,id:string)=>publicConfig(await duplicateProfile(id)));
  handle('profiles:export:tree',(_e,id)=>profileExportTree(id));
  handle('profiles:export',async(_e,id:string,options)=>{const result=await (options?exportSelectedProfile(id,options):exportProfile(id));notice(result);return result;});
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
  handle('config:save', async (_e, config: Config) => {const saved=await saveConfig(config);if(!saved.launcher.rememberAccount){forgetMicrosoftAccount();forgetAllSavedAccounts();}startDiscordPresence();return publicConfig(saved);});
  handle('auth:accounts',()=>listAccounts());
  handle('auth:switch',(_e,id)=>{assertIdle();return switchAccount(id);});
  handle('auth:remove',(_e,id)=>{assertIdle();return removeAccount(id);});
  handle('auth:start', () => {assertIdle();return microsoftLogin(window);});
  handle('auth:profile', () => restoreSession());
  handle('auth:refresh', () => refreshProfile());
  handle('auth:logout', () => { logout(); return true; });
  handle('status:get', () => serverStatus());
  handle('status:modes', () => modeStatuses());
  handle('java:version', () => javaVersion());
  handle('game:start', (_e, id: string,instanceId?:string) => startGame(String(id), notice,instanceId));
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
  handle('capes:template',()=>saveCapeTemplate());
  handle('capes:select', (_e, id: string | null) => selectCape(id));
  handle('update:check', () => checkForUpdate(window));
  handle('update:state',()=>updateState());
  handle('update:download',()=>downloadLauncherUpdate(window));
  handle('update:install',()=>installLauncherUpdate(window));
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
app.on('before-quit',()=>stopDiscordPresence());
app.on('window-all-closed', () => {stopDiscordPresence(); if (process.platform !== 'darwin') app.quit(); });

