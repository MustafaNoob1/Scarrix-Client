import fs from 'node:fs';
import AdmZip from 'adm-zip';

// 26.1 is the first unobfuscated Minecraft release. A broad dependency such as
// >=1.21.9 does not make an intermediary-compiled mod compatible with it.
export function fabricRuntimeNamespace(version: string): 'official' | 'intermediary' | null {
  const match=/^(\d+)\.(\d+)(?:\.|$|[-+])/.exec(version);
  if(!match)return null;
  const major=Number(match[1]);
  return major>=26?'official':major===1?'intermediary':null;
}
export function fabricNamespaceIssue(version:string,header:string):string|null {
  const match=/^(?:accessWidener|classTweaker)\s+v\d+\s+(\S+)/.exec(header.replace(/^\uFEFF/,'').trim());
  const expected=fabricRuntimeNamespace(version);
  if(!match||!expected||match[1]===expected)return null;
  return 'Diese Mod-Datei verwendet den Namensraum „'+match[1]+'“, Minecraft '+version+' benötigt „'+expected+'“. Installiere eine ausdrücklich passende Mod-Version oder verwende ein Profil für die ursprüngliche Minecraft-Version. Ein neuerer Fabric-Loader allein behebt das nicht.';
}
export function zipFabricNamespaceIssue(zip:AdmZip,data:any,version:string):string|null {
  if(typeof data.accessWidener!=='string')return null;
  const entry=zip.getEntry(data.accessWidener);
  if(!entry||entry.header.size>1024*1024)throw Error('Class-Tweaker-Metadaten nicht lesbar.');
  return fabricNamespaceIssue(version,entry.getData().toString('utf8').split(/\r?\n/,1)[0]);
}
export function fileFabricNamespaceIssue(file:string,version:string):string|null {
  // Broken or unusually large metadata is handled by the full preflight check.
  try{if(fs.statSync(file).size>150*1024*1024)return null;const zip=new AdmZip(file),entry=zip.getEntry('fabric.mod.json');if(!entry||entry.header.size>64000)return null;return zipFabricNamespaceIssue(zip,JSON.parse(entry.getData().toString('utf8')),version);}catch{return null;}
}
