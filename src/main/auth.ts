import { BrowserWindow } from 'electron';
import { acquireMicrosoftToken, restoreMicrosoftToken, rememberMicrosoftAccount, forgetMicrosoftAccount } from './microsoft-token';
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
let accountEpoch=0;
export function logout(): void { accountEpoch++;session = null;forgetMicrosoftAccount(); }
async function minecraftSession(microsoftToken:string){const auth=new MicrosoftAuthenticator({});const xbox=await auth.acquireXBoxToken(microsoftToken,AbortSignal.timeout(30000));const claim=xbox.minecraftXstsResponse.DisplayClaims.xui[0];const mc=await auth.loginMinecraftWithXBox(claim.uhs,xbox.minecraftXstsResponse.Token,AbortSignal.timeout(30000));const raw=await mojang.getProfile(mc.access_token,AbortSignal.timeout(20000));return {token:mc.access_token,expires:Date.now()+Math.max(60,mc.expires_in-120)*1000,profile:publicMinecraftProfile(raw)};}
let restoring:Promise<Profile|null>|null=null;
export async function restoreSession():Promise<Profile|null>{if(session&&session.expires>Date.now())return session.profile;if(authenticating)return null;if(!getConfig().launcher.rememberAccount)return null;if(restoring)return restoring;const epoch=accountEpoch;restoring=(async()=>{const token=await restoreMicrosoftToken(getConfig().microsoft.clientId);if(!token)return null;try{const result=await minecraftSession(token);if(epoch!==accountEpoch)return null;session=result;rememberMicrosoftAccount();return result.profile;}catch{if(epoch===accountEpoch)session=null;throw new Error('Gespeicherte Anmeldung konnte nicht wiederhergestellt werden. Bitte melde dich erneut an.');}})().finally(()=>{restoring=null;});return restoring;}

export async function refreshProfile(): Promise<Profile> {
  if(!session||session.expires<=Date.now())await restoreSession();
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
  const epoch=accountEpoch;
  try {
    if(restoring)await restoring.catch(()=>{});
    const microsoftToken = await acquireMicrosoftToken(win, clientId);
    const result=await minecraftSession(microsoftToken);
    if(epoch!==accountEpoch)throw new Error('Anmeldung wurde abgebrochen.');
    session=result;
    if(getConfig().launcher.rememberAccount)rememberMicrosoftAccount();else forgetMicrosoftAccount();
    return result.profile;
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

