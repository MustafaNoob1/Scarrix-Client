import {zipFabricNamespaceIssue} from './fabric-compatibility';
import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import semver from 'semver';
import {getConfig} from './config';
import {profileContents} from './profile-studio';
import {profilePath} from './profile-files';
export interface ModIssue {severity:'error'|'warning';file:string;message:string}
export function modPreflight(id:unknown){
 const selected=getConfig().instances.find(i=>i.id===id);if(!selected)throw Error('Profil nicht gefunden.');const item=selected;
 const files=profileContents(item.id,'mod').filter(f=>f.enabled),issues:ModIssue[]=[],mods:Array<{file:string;data:any;nested:boolean;namespaceIssue:string|null}>=[];let nestedBytes=0,incomplete=false;
 const issue=(severity:ModIssue['severity'],file:string,message:string)=>issues.push({severity,file,message});
 function read(zip:AdmZip,file:string,depth=0){const entry=zip.getEntry('fabric.mod.json');if(!entry){if(depth===0&&item.loader==='fabric'&&(zip.getEntry('META-INF/mods.toml')||zip.getEntry('META-INF/neoforge.mods.toml')))issue('error',file,'Forge-/NeoForge-Mod im Fabric-Profil.');return;}
  if(entry.header.size>64000)throw Error('Metadaten zu groß');const data=JSON.parse(entry.getData().toString('utf8'));if(typeof data.id!=='string'||typeof data.version!=='string')throw Error('Mod-ID oder Version fehlt');
  if(data.environment==='server'){if(depth===0)issue('warning',file,'Diese Mod ist nur für Server und wird vom Client nicht geladen.');return;}
  mods.push({file,data,nested:depth>0,namespaceIssue:item.loader==='fabric'?zipFabricNamespaceIssue(zip,data,item.version):null});if(depth===0&&item.loader!=='fabric'&&!zip.getEntry('META-INF/mods.toml'))issue('error',file,'Fabric-Mod benötigt ein Fabric-Profil.');
  for(const jar of Array.isArray(data.jars)?data.jars:[]){if(depth>=3||mods.length>=200)throw Error('Zu viele eingebettete Mods');if(typeof jar.file!=='string')continue;const e=zip.getEntry(jar.file);if(!e)continue;if(e.header.size>16*1024*1024||(nestedBytes+=e.header.size)>32*1024*1024)throw Error('Eingebettete Mod zu groß');read(new AdmZip(e.getData()),file+' → '+jar.file,depth+1);}
 }
 for(const file of files){try{if(file.size>150*1024*1024)throw Error('Datei zu groß');read(new AdmZip(path.join(profilePath(item),'mods',file.filename)),file.filename);}catch{incomplete=true;issue('warning',file.filename,'Metadaten nicht vollständig prüfbar. Die Datei wurde nicht verändert.');}}
 const byId=new Map<string,typeof mods>();for(const mod of mods){for(const id of [mod.data.id,...(Array.isArray(mod.data.provides)?mod.data.provides.filter((v:unknown)=>typeof v==='string'):[])])byId.set(id,[...(byId.get(id)??[]),mod]);}
 for(const [id,entries] of byId)if(entries.filter(m=>!m.nested&&m.data.id===id).length>1)issue('error',entries.filter(m=>!m.nested).map(m=>m.file).join(', '),'Mod-ID „'+id+'“ ist mehrfach aktiviert.');
 function matches(version:string,range:unknown):boolean|null {const ranges=Array.isArray(range)?range:[range];let unknown=false;for(const r of ranges){if(r==='*')return true;if(typeof r!=='string'){unknown=true;continue;}const v=semver.valid(version)??semver.valid(version+'.0');const valid=semver.validRange(r);if(!v||valid===null){unknown=true;continue;}if(semver.satisfies(v,valid,{includePrerelease:true}))return true;}return unknown?null:false;}
 if(item.loader==='fabric')for(const mod of mods.filter(m=>!m.nested||byId.get(m.data.id)?.length===1)){if(mod.namespaceIssue)issue('error',mod.file,mod.namespaceIssue);for(const [id,range] of Object.entries(mod.data.depends??{})){if(id==='java')continue;const builtin=id==='minecraft'?item.version:id==='fabricloader'?item.loaderVersion:undefined;if(id==='fabricloader'&&!builtin)continue;const providers=byId.get(id);if(!builtin&&!providers?.length){issue(incomplete?'warning':'error',mod.file,'„'+mod.data.id+'“ benötigt die fehlende Mod „'+id+'“.');continue;}const results=builtin?[matches(builtin,range)]:providers!.map(p=>matches(p.data.version,range));if(results.every(r=>r===false))issue('error',mod.file,'„'+id+'“ hat nicht die benötigte Version ('+JSON.stringify(range)+').'+(id==='fabricloader'?' Aktuell: '+builtin+'. Wähle im Profil unter Installation einen passenden Fabric-Loader.':''));else if(!results.includes(true))issue('warning',mod.file,'Versionsregel für „'+id+'“ konnte nicht sicher geprüft werden.');}
  for(const [id,range] of Object.entries(mod.data.breaks??{})){if(byId.get(id)?.some(p=>matches(p.data.version,range)===true))issue('error',mod.file,'„'+mod.data.id+'“ ist laut Metadaten mit „'+id+'“ inkompatibel.');}
 }
 if(item.loader==='vanilla'&&files.length)issue('warning','mods','Vanilla lädt die Dateien im Mods-Ordner nicht.');
 return {profileId:item.id,checked:files.length,issues,canLaunch:!issues.some(i=>i.severity==='error'),note:'Lokale Metadatenprüfung. Fabric-Abhängigkeiten, Mod-IDs und offensichtliche Loader-Konflikte werden erkannt. Forge-Abhängigkeiten, Java-Regeln und Laufzeit-Konflikte prüft weiterhin der Modloader.'};
}
