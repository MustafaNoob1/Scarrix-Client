import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { NsisUpdater } from 'electron-updater';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
const execute = promisify(execFile);
let configured = false;
let checking = false;
let target: BrowserWindow;
let downloaded = false;
const send = (channel: string, data: unknown) => {
  if (target && !target.isDestroyed()) target.webContents.send(channel, data);
};
export async function checkForUpdate(win: BrowserWindow, manual = true): Promise<string> {
  target = win;
  if (!app.isPackaged) return 'Updates funktionieren nur in einer installierten Release-Version.';
  const policyPath = path.join(process.resourcesPath, 'update-channel.json');
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8')) as { enabled: boolean; url: string; publisher: string };
  if (!policy.enabled) return manual ? 'In-App-Updates sind noch nicht freigeschaltet: HTTPS-Distributionskanal und signierte Installer fehlen. Private GitHub-Releases können ohne Berechtigung nicht heruntergeladen werden.' : '';
  const url = new URL(policy.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !policy.publisher.trim()) throw new Error('Ungültiger Update-Kanal.');
  if (process.platform !== 'win32' || !(autoUpdater instanceof NsisUpdater)) return 'Sichere automatische Updates sind derzeit nur für signierte Windows-NSIS-Installationen freigeschaltet.';
  if (checking) return 'Eine Update-Prüfung läuft bereits.';
  if (!configured) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.setFeedURL({ provider: 'generic', url: policy.url });
    // Fail closed: electron-updater v6 otherwise skips verification without publisherName.
    const publisher = policy.publisher;
    autoUpdater.verifyUpdateCodeSignature = async (_names, file) => {
      const script = '$s=Get-AuthenticodeSignature -LiteralPath $env:SCARRIX_UPDATE_FILE; [pscustomobject]@{status=[string]$s.Status;subject=$s.SignerCertificate.Subject}|ConvertTo-Json -Compress';
      try {
        const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
          timeout: 30000, windowsHide: true, env: { ...process.env, SCARRIX_UPDATE_FILE: file }
        });
        const signature = JSON.parse(stdout);
        return signature.status === 'Valid' && signature.subject === publisher ? null : 'Update-Signatur oder Herausgeber ungültig.';
      } catch { return 'Update-Signatur konnte nicht geprüft werden.'; }
    };
    autoUpdater.on('checking-for-update', () => send('app:notice', 'Suche nach Updates …'));
    autoUpdater.on('update-available', () => { send('app:progress', 0); send('app:notice', 'Update wird heruntergeladen …'); });
    autoUpdater.on('update-not-available', () => send('app:notice', 'Du verwendest die aktuelle Version.'));
    autoUpdater.on('download-progress', i => send('app:progress', Math.max(0, Math.min(100, Math.round(i.percent)))));
    autoUpdater.on('error', () => { checking = false; send('app:progress', null); send('app:notice', 'Update fehlgeschlagen. Bitte später erneut versuchen.'); });
    autoUpdater.on('update-downloaded', async () => {
      checking = false; downloaded = true; send('app:progress', null);
      send('app:notice', 'Update geprüft und heruntergeladen. Erneut auf Updates klicken, um die Installation zu starten.');
      await promptRestart();
    });
    configured = true;
  }
  if (downloaded) { await promptRestart(); return 'Update bereit zur Installation.'; }
  checking = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result?.downloadPromise) {
      void result.downloadPromise.finally(() => { checking = false; }).catch(() => {});
    } else checking = false;
    return 'Update-Prüfung abgeschlossen.';
  } catch { checking = false; throw new Error('Update-Prüfung fehlgeschlagen. Bitte später erneut versuchen.'); }
}
async function promptRestart() {
  if (!target || target.isDestroyed()) return;
  const answer = await dialog.showMessageBox(target, { type: 'info', title: 'Launcher aktualisieren',
    message: 'Update heruntergeladen und geprüft. Jetzt installieren und neu starten?',
    buttons: ['Jetzt neu starten', 'Später'], defaultId: 0, cancelId: 1 });
  if (answer.response === 0 && downloaded) autoUpdater.quitAndInstall(false, true);
}
