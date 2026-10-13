import { BrowserWindow } from 'electron';
import { PublicClientApplication } from '@azure/msal-node';
import { MicrosoftAuthenticator, MojangClient } from '@xmcl/user';
import { getConfig } from './config';
import { Profile } from './types';
import { publicMinecraftProfile } from './user-profile';

let session: { token: string; profile: Profile; expires: number } | null = null;
let authenticating = false;
const mojang = new MojangClient({});

export function getPublicProfile(): Profile | null { return session?.profile ?? null; }
export function getSessionToken(): string {
  if (!session || Date.now() >= session.expires) throw new Error('Bitte melde dich erneut mit Microsoft an.');
  return session.token;
}
export function logout(): void { session = null; }
export async function refreshProfile(): Promise<Profile> {
  const raw = await mojang.getProfile(getSessionToken(), AbortSignal.timeout(20000));
  const profile = publicMinecraftProfile(raw);
  if (session) session.profile = profile;
  return profile;
}
export async function microsoftLogin(win: BrowserWindow): Promise<Profile> {
  if (authenticating) throw new Error('Eine Anmeldung läuft bereits.');
  const clientId = getConfig().microsoft.clientId.trim();
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) throw new Error('Microsoft-Anmeldung ist derzeit nicht eingerichtet. Bitte kontaktiere den Scarrix-Support.');
  authenticating = true;
  try {
    // No Microsoft password is ever entered into our client.
    const client = new PublicClientApplication({ auth: { clientId, authority: 'https://login.microsoftonline.com/consumers' } });
    const result = await client.acquireTokenByDeviceCode({
      scopes: ['XboxLive.signin', 'offline_access'],
      deviceCodeCallback: info => win.webContents.send('auth:device', {
        url: info.verificationUri, code: info.userCode, message: info.message
      })
    });
    if (!result?.accessToken) throw new Error('Microsoft hat kein gültiges Token zurückgegeben.');
    const auth = new MicrosoftAuthenticator({});
    const xbox = await auth.acquireXBoxToken(result.accessToken, AbortSignal.timeout(30000));
    const claim = xbox.minecraftXstsResponse.DisplayClaims.xui[0];
    const mc = await auth.loginMinecraftWithXBox(claim.uhs, xbox.minecraftXstsResponse.Token, AbortSignal.timeout(30000));
    // getProfile rejects accounts without a valid Minecraft Java profile.
    const raw = await mojang.getProfile(mc.access_token, AbortSignal.timeout(20000));
    session = {
      token: mc.access_token,
      expires: Date.now() + Math.max(60, mc.expires_in - 120) * 1000,
      profile: { id: raw.id, name: raw.name, skins: [], capes: [] }
    };
    return await refreshProfile();
  } catch (err) {
    session = null;
    const message = err instanceof Error ? err.message : String(err);
    if (/Invalid app registration|403/i.test(message)) throw new Error('Microsoft/Minecraft blockiert die App-Registrierung (HTTP 403). Für diesen Launcher ist ggf. eine offizielle Freigabe nötig. Details: docs/MICROSOFT-LOGIN.md');
    throw err;
  } finally { authenticating = false; }
}
export async function setSkin(fileName: string, file: Buffer, model: 'classic' | 'slim'): Promise<Profile> {
  await mojang.setSkin(fileName, file, model, getSessionToken(), AbortSignal.timeout(30000));
  return refreshProfile();
}
export async function selectCape(capeId: string | null): Promise<Profile> {
  if (capeId) {
    const current = (await refreshProfile()).capes;
    if (!current.some(c => c.id === capeId)) throw new Error('Dieses Cape gehört deinem Account nicht.');
    await mojang.showCape(capeId, getSessionToken(), AbortSignal.timeout(20000));
  } else {
    await mojang.hideCape(getSessionToken(), AbortSignal.timeout(20000));
  }
  return refreshProfile();
}

