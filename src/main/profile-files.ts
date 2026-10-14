import { dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { getConfig, saveConfig, instancePath, rootPath, sharedProfilePath } from './config';
import type { Instance } from './types';
import { exclusive } from './operations';
import { archiveSafe } from './java';
const allowed=['mods','config','resourcepacks','shaderpacks','saves'];
const maxExpanded=1024**3;
export function profilePath(instance: Instance) {
  const destination=path.join(rootPath(),'instances',instance.id);
  const legacy=path.join(rootPath(),'instances',instance.version+'-'+instance.loader+(instance.id==='default'?'':'-'+instance.id));
  if(!fs.existsSync(destination)&&fs.existsSync(legacy))fs.renameSync(legacy,destination);
  return sharedProfilePath?.(instance)??destination;
}
function newId() { return 'instance-'+crypto.randomUUID(); }
function walk(folder:string, root=folder):Array<{file:string;name:string}> {
  if(!fs.existsSync(folder))return [];
  const output:Array<{file:string;name:string}>=[];
  for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw new Error('Profil enthält einen symbolischen Link. Export wurde gestoppt.');
    const file=path.join(folder,entry.name);
    if(entry.isDirectory())output.push(...walk(file,root));
    else if(entry.isFile())output.push({file,name:path.relative(root,file).split(path.sep).join('/')});
  }return output;
}
export async function duplicateProfile(id:string) {
  return exclusive('Profil kopieren',async()=>{
    const cfg=getConfig();const original=cfg.instances.find(i=>i.id===id);
    if(!original)throw new Error('Profil nicht gefunden.');
    if(cfg.instances.length>=16)throw new Error('Maximal 16 Profile.');
    const item={...original,id:newId(),name:(original.name+' Kopie').slice(0,50),sharedGroup:false};
    const from=id===cfg.activeInstanceId?instancePath():profilePath(original);
    const to=profilePath(item);
    let size=0;
    try{
      for(const dir of allowed)for(const entry of walk(path.join(from,dir))){size+=fs.statSync(entry.file).size;if(size>maxExpanded)throw new Error('Profil zu groß (maximal 1 GB).');const dest=path.join(to,dir,entry.name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(entry.file,dest);}
      return await saveConfig({...cfg,instances:[...cfg.instances,item],activeInstanceId:item.id},true);
    }catch(e){fs.rmSync(to,{recursive:true,force:true});throw e;}
  });
}
export async function exportProfile(id:string):Promise<string> {
  return exclusive('Profil exportieren',async()=>{
    const cfg=getConfig();const item=cfg.instances.find(i=>i.id===id);
    if(!item)throw new Error('Profil nicht gefunden.');
    const choice=await dialog.showSaveDialog({defaultPath:item.name.replace(/[^a-zA-Z0-9_-]/g,'_')+'.scarrix.zip',filters:[{name:'Scarrix-Profil',extensions:['zip']}]});
    if(choice.canceled||!choice.filePath)return 'Export abgebrochen.';
    const zip=new AdmZip();
    zip.addFile('profile.json',Buffer.from(JSON.stringify({format:'scarrix-profile',schema:1,profile:{name:item.name,version:item.version,loader:item.loader,loaderVersion:item.loaderVersion,ramGB:item.ramGB,group:item.group,icon:item.icon,window:item.window,jvmArgs:item.jvmArgs,quickPlayWorld:item.quickPlayWorld}},null,2)));
    const from=id===cfg.activeInstanceId?instancePath():profilePath(item);let size=0;
    for(const dir of allowed)for(const entry of walk(path.join(from,dir))){size+=fs.statSync(entry.file).size;if(size>maxExpanded)throw new Error('Profil zu groß (maximal 1 GB).');zip.addLocalFile(entry.file,'files/'+dir+'/'+path.posix.dirname(entry.name),path.posix.basename(entry.name));}
    const temp=choice.filePath+'.tmp-'+crypto.randomUUID();
    try{zip.writeZip(temp);fs.renameSync(temp,choice.filePath);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
    return 'Profil exportiert: '+choice.filePath;
  });
}
export function validateArchiveEntries(entries:Array<{entryName:string;header:{size:number};attr:number}>) {
  let size=0;const seen=new Set<string>();
  if(entries.length>20000)throw new Error('Zu viele Dateien im Profil.');
  for(const entry of entries){
    const name=entry.entryName;size+=entry.header.size;
    if(!archiveSafe(name)||size>maxExpanded||((entry.attr>>>16)&0xf000)===0xa000||seen.has(name.toLowerCase()))throw new Error('Unsicheres oder zu großes Profilarchiv.');
    seen.add(name.toLowerCase());
    if(name==='profile.json')continue;
    const parts=name.split('/');
    if(parts[0]!=='files'||!allowed.includes(parts[1]))throw new Error('Nicht erlaubte Datei im Profilarchiv.');
  }
}
export async function importProfile() {
  return exclusive('Profil importieren',async()=>{
    const cfg=getConfig();
    if(cfg.instances.length>=16)throw new Error('Maximal 16 Profile.');
    const choice=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Scarrix-Profil',extensions:['zip']}]});
    if(choice.canceled||!choice.filePaths[0])return null;
    if(fs.statSync(choice.filePaths[0]).size>300*1024*1024)throw new Error('Profilarchiv zu groß (maximal 300 MB).');
    const zip=new AdmZip(choice.filePaths[0]);validateArchiveEntries(zip.getEntries());
    const metadata=zip.getEntry('profile.json');
    if(!metadata||metadata.header.size>256000)throw new Error('Profilbeschreibung fehlt oder ist zu groß.');
    const raw=JSON.parse(metadata.getData().toString('utf8'));
    if(raw.format!=='scarrix-profile'||raw.schema!==1)throw new Error('Unbekanntes Profilformat.');
    const p=raw.profile;
    const item:Instance={id:newId(),name:p?.name,version:p?.version,loader:p?.loader,loaderVersion:p?.loaderVersion,ramGB:p?.ramGB,group:p?.group,icon:p?.icon,window:p?.window,jvmArgs:p?.jvmArgs,quickPlayWorld:p?.quickPlayWorld};
    const dest=profilePath(item);
    // Validate all settings before extracting; rollback on any extraction failure.
    const next={...cfg,instances:[...cfg.instances,item],activeInstanceId:item.id};
    const previous=cfg;
    let saved=false;
    try {
      const result=await saveConfig(next,true);saved=true;
      for(const entry of zip.getEntries())if(entry.entryName.startsWith('files/')&&!entry.isDirectory){const file=path.join(dest,entry.entryName.slice(6));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,entry.getData(),{flag:'wx'});}
      return result;
    }catch(e){fs.rmSync(dest,{recursive:true,force:true});if(saved)await saveConfig(previous,true);throw e;}
  });
}
