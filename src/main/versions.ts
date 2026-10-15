import {minecraftRequests} from './minecraft-downloads';
import { getVersionList } from '@xmcl/installer';
import crypto from 'node:crypto';
let cached: string[] = [];
let expires = 0;
let pending: Promise<string[]> | undefined;
export async function officialVersions(): Promise<string[]> {
  if (Date.now() < expires) return cached;
  if (!pending) pending = (async () => {
    const list = (await getVersionList(minecraftRequests)).versions.filter(v => v.type === 'release').map(v => v.id);
    if (!list.length) throw new Error('Offizielle Versionsliste ist leer.');
    cached = list; expires = Date.now() + 300000; return list;
  })().finally(() => { pending = undefined; });
  return pending;
}
export async function officialMetadata(version: string): Promise<any> {
  const record=(await getVersionList(minecraftRequests)).versions.find(v=>v.id===version && v.type==='release') as {url:string;sha1?:string}|undefined;
  if(!record || new URL(record.url).protocol!=='https:')throw new Error('Version nicht im offiziellen Manifest gefunden.');
  const response=await fetch(record.url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('Minecraft-Versionsdaten nicht erreichbar.');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>4*1024*1024)throw new Error('Minecraft-Versionsdaten zu groß.');
  if(record.sha1 && crypto.createHash('sha1').update(bytes).digest('hex')!==record.sha1)throw new Error('Minecraft-Versionsdaten beschädigt.');
  return JSON.parse(bytes.toString('utf8'));
}

