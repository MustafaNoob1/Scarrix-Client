import { PublicClientApplication } from '@azure/msal-node';
import type { BrowserWindow } from 'electron';
export async function acquireMicrosoftToken(win: BrowserWindow, clientId: string): Promise<string> {
  const auth = { clientId, authority: 'https://login.microsoftonline.com/consumers' };
  const scopes = ['XboxLive.signin', 'offline_access'];
  if (process.platform === 'win32') {
    // Load native modules only on Windows. Never silently open an external browser.
    let plugin: import('@azure/msal-node-extensions').NativeBrokerPlugin;
    try { const { NativeBrokerPlugin } = require('@azure/msal-node-extensions'); plugin = new NativeBrokerPlugin(); }
    catch { throw new Error('Das Microsoft-Anmeldefenster konnte nicht geladen werden. Bitte installiere die aktuelle Scarrix-Version erneut.'); }
    if (!plugin.isBrokerAvailable) throw new Error('Das Microsoft-Anmeldefenster ist auf diesem Windows-System nicht verfügbar. Bitte Windows aktualisieren.');
    const client = new PublicClientApplication({ auth, broker: { nativeBrokerPlugin: plugin }, system: { loggerOptions: { piiLoggingEnabled: false, loggerCallback: ()=>{} } } });
    try {
      const result = await client.acquireTokenInteractive({ scopes, prompt: 'select_account', windowHandle: win.getNativeWindowHandle(), redirectUri: `ms-appx-web://Microsoft.AAD.BrokerPlugin/${clientId}`, openBrowser: async()=>{throw new Error('Das native Microsoft-Anmeldefenster ist nicht verfügbar.');} });
      if (!result?.accessToken) throw new Error('Microsoft hat kein gültiges Token zurückgegeben.');
      return result.accessToken;
    } catch (error) {
      const code = String((error as {errorCode?:string})?.errorCode ?? '');
      if (/cancel|user_canceled|user_cancelled/i.test(code)) throw new Error('Microsoft-Anmeldung abgebrochen. Du kannst dich erneut anmelden.');
      // Do not expose WAM account details or native diagnostic responses to logs/UI.
      throw new Error('Microsoft-Anmeldung nicht abgeschlossen. Prüfe die App-Registrierung (Desktop-Rücksprungadresse), deine Internetverbindung und versuche es erneut.');
    }
  }
  // Existing device-code flow remains available for macOS and Linux.
  const client = new PublicClientApplication({ auth });
  const result = await client.acquireTokenByDeviceCode({ scopes, deviceCodeCallback: info=>win.webContents.send('auth:device',{url:info.verificationUri,code:info.userCode,message:info.message}) });
  if (!result?.accessToken) throw new Error('Microsoft hat kein gültiges Token zurückgegeben.');
  return result.accessToken;
}
