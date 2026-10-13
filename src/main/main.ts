import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getConfig, saveConfig, instancePath, rootPath } from './config';
import { microsoftLogin, getPublicProfile, logout, refreshProfile, selectCape } from './auth';
import { javaVersion, startGame } from './game';
import { serverStatus } from './status';
import { searchMods, installMod } from './mods';
import { getLibrary, upload, applySavedSkin } from './skins';
import { checkForUpdate } from './updater';
import type { Config } from './types';

let window: BrowserWindow;
const notice = (text: string) => { if (window && !window.isDestroyed()) window.webContents.send('app:notice', text); };

function createWindow(): void {
  window = new BrowserWindow({
    width: 1200, height: 790, minWidth: 930, minHeight: 600,
    backgroundColor: '#0d1220', title: 'Scarrix Client',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: false }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(login\.microsoftonline\.com|microsoft\.com|www\.microsoft\.com|github\.com|docs\.modrinth\.com)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  const dev = process.env.SCARRIX_DEV_SERVER;
  if (dev && !app.isPackaged) window.loadURL(dev);
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  window.webContents.on('will-navigate', e => e.preventDefault());
  window.webContents.once('did-finish-load', () => { if (app.isPackaged) void checkForUpdate(window).catch(e => notice(`Update: ${e.message}`)); });
}

function handlers() {
  ipcMain.handle('config:get', () => getConfig());
  ipcMain.handle('config:save', (_e, config: Config) => saveConfig(config));
  ipcMain.handle('auth:start', () => microsoftLogin(window));
  ipcMain.handle('auth:profile', () => getPublicProfile());
  ipcMain.handle('auth:refresh', () => refreshProfile());
  ipcMain.handle('auth:logout', () => { logout(); return true; });
  ipcMain.handle('status:get', () => serverStatus());
  ipcMain.handle('java:version', () => javaVersion());
  ipcMain.handle('game:start', (_e, id: string) => startGame(String(id), notice));
  ipcMain.handle('mods:search', (_e, term: string, source: 'modrinth' | 'curseforge') => {
    if (!['modrinth','curseforge'].includes(source)) throw new Error('Unbekannte Modquelle');
    return searchMods(String(term), source);
  });
  ipcMain.handle('mods:install', (_e, id: string, source: 'modrinth' | 'curseforge') => {
    if (!['modrinth','curseforge'].includes(source)) throw new Error('Unbekannte Modquelle');
    return installMod(source, String(id), value => window.webContents.send('app:progress', value));
  });
  ipcMain.handle('skins:library', () => getLibrary('skins'));
  ipcMain.handle('skins:upload', (_e, model: 'classic' | 'slim') => upload('skins', model));
  ipcMain.handle('skins:apply', (_e, id: string, model: 'classic' | 'slim') => applySavedSkin(id, model));
  ipcMain.handle('capes:library', () => getLibrary('capes'));
  ipcMain.handle('capes:upload', () => upload('capes', 'classic'));
  ipcMain.handle('capes:select', (_e, id: string | null) => selectCape(id));
  ipcMain.handle('update:check', () => checkForUpdate(window));
  ipcMain.handle('paths:get', () => ({ minecraft: rootPath(), instance: instancePath() }));
  ipcMain.handle('logs:export', async () => {
    const folder = path.join(instancePath(), 'logs');
    if (!fs.existsSync(folder)) return 'Noch keine lokalen Minecraft-Logs vorhanden.';
    return `Logs bleiben lokal: ${folder}. Automatischer Upload ist absichtlich deaktiviert.`;
  });
  ipcMain.handle('url:open', async (_e, url: string) => {
    if (!/^https:\/\/(github\.com|microsoft\.com|www\.microsoft\.com|login\.microsoftonline\.com|modrinth\.com|docs\.curseforge\.com)/i.test(url)) throw new Error('URL ist nicht freigegeben.');
    await shell.openExternal(url); return true;
  });
}
app.whenReady().then(() => {
  app.setAppUserModelId('net.scarrix.client');
  handlers(); createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch(err => console.error(err));
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
