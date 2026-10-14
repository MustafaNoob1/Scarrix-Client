import { PublicClientApplication } from '@azure/msal-node';
import { readRememberedAccount, saveRememberedAccount, forgetRememberedAccount } from './auth-store';
import type { AccountInfo } from '@azure/msal-node';
import type { BrowserWindow } from 'electron';
let pending: {clientId:string;account:AccountInfo;client:PublicClientApplication}|null=null;
export function forgetMicrosoftAccount(){pending=null;forgetRememberedAccount();}
export function rememberMicrosoftAccount(){if(!pending)return false;const value=pending;pending=null;try{return saveRememberedAccount({clientId:value.clientId,account:value.account,cache:value.client.getTokenCache().serialize()});}catch{return false;}}
function keepAccount(client:PublicClientApplication,clientId:string,result:any){if(result.account)pending={client,clientId,account:result.account};}
function brokerPlugin(){const {NativeBrokerPlugin}=require('@azure/msal-node-extensions');const plugin=new NativeBrokerPlugin();if(!plugin.isBrokerAvailable)throw new Error('Microsoft-Anmeldefenster ist nicht verfügbar.');return plugin;}
export async function restoreMicrosoftToken(clientId:string):Promise<string|null>{const saved=readRememberedAccount(clientId);if(!saved)return null;const client=new PublicClientApplication({auth:{clientId,authority:'https://login.microsoftonline.com/consumers'},...(process.platform==='win32'?{broker:{nativeBrokerPlugin:brokerPlugin()}}:{}),system:{loggerOptions:{piiLoggingEnabled:false,loggerCallback:()=>{}}}});if(saved.cache)client.getTokenCache().deserialize(saved.cache);try{const result=await client.acquireTokenSilent({account:saved.account,scopes:['XboxLive.signin','offline_access']});if(!result?.accessToken)return null;keepAccount(client,clientId,result);return result.accessToken;}catch{return null;}}
export async function acquireMicrosoftToken(win: BrowserWindow, clientId: string): Promise<string> {
  pending=null;
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
      keepAccount(client,clientId,result);
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
  keepAccount(client,clientId,result);
  return result.accessToken;
}
