import { app, BrowserWindow, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { getConfig } from './config';
let configured = false;
export async function checkForUpdate(win: BrowserWindow, manual = true): Promise<string> {
  const cfg = getConfig();
  if (!app.isPackaged) return 'Updates funktionieren nur in einer installierten Release-Version.';
  if (cfg.github.privateRepo !== false) {
    if (manual) await shell.openExternal(`https://github.com/${encodeURIComponent(cfg.github.owner)}/${encodeURIComponent(cfg.github.repo)}/releases`);
    return 'Das Repository ist privat: Der Download der neuesten Version öffnet sich in GitHub. Automatisches Update innerhalb der App braucht einen öffentlichen Update-Kanal.';
  }
  if (!cfg.github.owner || cfg.github.owner === 'CHANGE_ME') return 'GitHub-Owner ist noch nicht eingerichtet.';
  if (!configured) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.setFeedURL({ provider: 'github', owner: cfg.github.owner, repo: cfg.github.repo });
    autoUpdater.on('checking-for-update', () => win.webContents.send('app:notice', 'Suche nach Updates …'));
    autoUpdater.on('update-available', () => win.webContents.send('app:notice', 'Update wird heruntergeladen …'));
    autoUpdater.on('update-not-available', () => win.webContents.send('app:notice', 'Du verwendest die aktuelle Version.'));
    autoUpdater.on('download-progress', i => win.webContents.send('app:progress', Math.round(i.percent)));
    autoUpdater.on('update-downloaded', () => win.webContents.send('app:notice', 'Update heruntergeladen. Es wird beim nächsten Beenden installiert.'));
    autoUpdater.on('error', e => win.webContents.send('app:notice', `Update-Fehler: ${e.message}`));
    configured = true;
  }
  await autoUpdater.checkForUpdates();
  return 'Update-Prüfung gestartet.';
}
