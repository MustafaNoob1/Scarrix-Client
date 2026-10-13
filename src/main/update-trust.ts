import crypto from 'node:crypto';
import fs from 'node:fs';
import semver from 'semver';
export interface SignedRelease { version:string; assets:Array<{name:string;sha512:string;size:number}> }
export function verifyRelease(payload:Buffer, signature:Buffer, publicKey:string):SignedRelease {
  if(payload.length>1024*1024||!publicKey||!crypto.verify(null,payload,publicKey,signature))throw new Error('Update-Signatur ungültig. Installation verhindert.');
  const manifest=JSON.parse(payload.toString('utf8')) as SignedRelease;
  if(!semver.valid(manifest.version)||!Array.isArray(manifest.assets)||manifest.assets.length>100)throw new Error('Ungültige Update-Beschreibung.');
  const names=new Set<string>();
  for(const asset of manifest.assets){
    if(!/^[a-zA-Z0-9._-]+$/.test(asset.name)||!asset.sha512.match(/^[a-f0-9]{128}$/i)||!Number.isSafeInteger(asset.size)||asset.size<0||asset.size>1024**3||names.has(asset.name))throw new Error('Ungültige Update-Datei.');
    names.add(asset.name);
  }return manifest;
}
export async function verifyInstaller(file:string, asset:SignedRelease['assets'][number]) {
  if(fs.statSync(file).size!==asset.size)return 'Update-Dateigröße stimmt nicht überein.';
  const hash=crypto.createHash('sha512');
  for await(const chunk of fs.createReadStream(file))hash.update(chunk as Buffer);
  return hash.digest('hex')===asset.sha512?null:'Update-Datei wurde verändert. Installation verhindert.';
}
