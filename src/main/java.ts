import path from 'node:path';
import fs from 'node:fs';
import AdmZip from 'adm-zip';
import { x as untar } from 'tar';
import { resolveJava } from '@xmcl/installer';
import { appData, getConfig } from './config';
import { officialMetadata } from './versions';
import { verifiedDownload, stepStatus } from './downloads';
export function fallbackJavaMajor(version: string) {
  const parts=version.split('.').map(Number);
  if(parts[0]>=26 || parts[1]>=21 || (parts[1]===20 && (parts[2]||0)>=5))return 21;
  if(parts[1]>=18)return 17;
  if(parts[1]===17)return 16;
  return 8;
}
export async function requiredJava(version: string): Promise<number> {
  const metadata=await officialMetadata(version);
  const major=metadata.javaVersion?.majorVersion ?? fallbackJavaMajor(version);
  if(!Number.isInteger(major)||major<8||major>40)throw new Error('Unbekannte benötigte Java-Version.');
  return major;
}
export function archiveSafe(name: string) {
  return !!name && !name.includes('\\') && !name.startsWith('/') && !name.includes(':') && !name.split('/').some(part=>part==='..'||/[. ]$/.test(part)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
}
function findJava(folder: string, depth=0): string | null {
  const bin=path.join(folder,'bin',process.platform==='win32'?'java.exe':'java');
  if(fs.existsSync(bin)&&fs.statSync(bin).isFile())return bin;
  if(depth>4)return null;
  for(const entry of fs.readdirSync(folder,{withFileTypes:true}))if(entry.isDirectory()&&!entry.isSymbolicLink()){const found=findJava(path.join(folder,entry.name),depth+1);if(found)return found;}
  return null;
}
export async function ensureJava(version: string): Promise<string> {
  stepStatus('Passende Java-Version prüfen');
  const major=await requiredJava(version);
  const configured=getConfig().minecraft.javaPath || 'java';
  const found=await resolveJava(configured);
  if(found?.majorVersion===major)return found.path;
  const dir=path.join(appData(),'runtime',String(major)+'-'+process.platform+'-'+process.arch);
  if(fs.existsSync(dir)){const candidate=findJava(dir);if(candidate&&(await resolveJava(candidate))?.majorVersion===major)return candidate;}
  const os={win32:'windows',darwin:'mac',linux:'linux'}[process.platform as 'win32'|'darwin'|'linux'];
  const arch={x64:'x64',arm64:'aarch64',ia32:'x86'}[process.arch as 'x64'|'arm64'|'ia32'];
  if(!os||!arch)throw new Error('Automatische Java-Installation unterstützt diesen PC noch nicht.');
  const response=await fetch('https://api.adoptium.net/v3/assets/latest/'+major+'/hotspot?'+new URLSearchParams({os,architecture:arch,image_type:'jdk',vendor:'eclipse'}),{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Java-Downloadserver nicht erreichbar.');
  const assets:any[]=await response.json();
  const pkg=assets[0]?.binary?.package;
  if(!pkg?.link || !/^[a-f0-9]{64}$/i.test(pkg.checksum))throw new Error('Keine geprüfte Java-Version für diesen PC verfügbar.');
  const target=new URL(pkg.link);
  if(target.protocol!=='https:'||target.hostname!=='github.com'||!target.pathname.startsWith('/adoptium/'))throw new Error('Unbekannte Java-Downloadquelle.');
  fs.mkdirSync(path.dirname(dir),{recursive:true});
  const stage=fs.mkdtempSync(dir+'-install-');
  try {
    const archive=path.join(stage,'java-download'+(pkg.name.endsWith('.zip')?'.zip':'.tar.gz'));
    await verifiedDownload(pkg.link,archive,pkg.checksum,'sha256','Java '+major+' herunterladen');
    const content=path.join(stage,'content');fs.mkdirSync(content);
    stepStatus('Java entpacken und prüfen');
    if(archive.endsWith('.zip')){
      const zip=new AdmZip(archive);let expanded=0;
      for(const entry of zip.getEntries()){
        expanded+=entry.header.size;
        if(!archiveSafe(entry.entryName)||expanded>2*1024**3||((entry.attr>>>16)&0xf000)===0xa000)throw new Error('Unsicheres Java-Archiv.');
      }
      zip.extractAllTo(content,true);
    } else await untar({file:archive,cwd:content,strict:true,preservePaths:false,filter:(name,entry)=>{
      if(!archiveSafe(name))throw new Error('Unsicherer Archivpfad.');
      if('type' in entry && (entry.type==='SymbolicLink'||entry.type==='Link')){
        if(!entry.linkpath)throw new Error('Archivlink ohne Ziel.');
        const linked=path.resolve(entry.type==='Link'?content:path.dirname(path.join(content,name)),entry.linkpath);
        if(!linked.startsWith(content+path.sep))throw new Error('Unsicherer Archivlink.');
      }return true;
    }});
    const java=findJava(content);
    if(!java)throw new Error('Java fehlt im heruntergeladenen Archiv.');
    if(process.platform!=='win32')fs.chmodSync(java,0o755);
    if((await resolveJava(java))?.majorVersion!==major)throw new Error('Heruntergeladenes Java hat die falsche Version.');
    // Preserve existing runtime until replacement has been checked.
    if(fs.existsSync(dir))fs.renameSync(dir,dir+'-old-'+Date.now());
    fs.renameSync(content,dir);
    return findJava(dir)!;
  } finally { fs.rmSync(stage,{recursive:true,force:true}); }
}
export async function javaDetails() {
  const cfg=getConfig();let required:number;
  try{required=await requiredJava(cfg.minecraft.version);}catch{required=fallbackJavaMajor(cfg.minecraft.version);}
  const configured=await resolveJava(cfg.minecraft.javaPath||'java');
  const dir=path.join(appData(),'runtime',String(required)+'-'+process.platform+'-'+process.arch);
  const managed=fs.existsSync(dir)?findJava(dir):null;
  const actual=managed?await resolveJava(managed):configured;
  return {required,version:actual?.version??null,path:actual?.path??null,compatible:actual?.majorVersion===required};
}
