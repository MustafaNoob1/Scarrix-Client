import { app, BrowserWindow, dialog } from 'electron';
import { autoUpdater, NsisUpdater } from 'electron-updater';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import semver from 'semver';
import { load as yaml } from 'js-yaml';
import { verifyRelease, verifyInstaller, SignedRelease } from './update-trust';
import { assertIdle } from './operations';
import { progressReporter, stepStatus } from './downloads';
const repo='MustafaNoob1/scarrix-client';
let checking=false, downloaded=false, configured=false;
let target:BrowserWindow;
let installer:SignedRelease['assets'][number]|undefined;
const send=(channel:string,data:unknown)=>{if(target&&!target.isDestroyed())target.webContents.send(channel,data);};
async function fetchBytes(url:string,limit=2*1024*1024) {
  const response=await fetch(url,{headers:{'User-Agent':'Scarrix-Client','Accept':'application/vnd.github+json'},signal:AbortSignal.timeout(30000)});
  if(!response.ok||!response.body||new URL(response.url).protocol!=='https:')throw new Error('Update-Server nicht erreichbar (HTTP '+response.status+').');
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of response.body as any){size+=chunk.length;if(size>limit)throw new Error('Update-Beschreibung zu groß.');chunks.push(Buffer.from(chunk));}
  return Buffer.concat(chunks);
}
export async function checkForUpdate(win:BrowserWindow, manual=true):Promise<string> {
  target=win;
  if(!app.isPackaged)return 'Updates funktionieren nur in einer installierten Version.';
  assertIdle();
  if(checking)return 'Update-Prüfung oder Download läuft bereits.';
  if(downloaded){await promptRestart();return 'Update bereit zur Installation.';}
  checking=true;
  try {
    const policy=JSON.parse(fs.readFileSync(path.join(process.resourcesPath,'update-channel.json'),'utf8')) as {enabled:boolean;publicKey:string};
    if(!policy.enabled)return 'Update-Kanal ist deaktiviert.';
    const releases=JSON.parse((await fetchBytes('https://api.github.com/repos/'+repo+'/releases?per_page=20')).toString()) as any[];
    const release=releases.filter(r=>!r.draft && semver.valid(r.tag_name?.replace(/^v/,''))).sort((a,b)=>semver.rcompare(a.tag_name.replace(/^v/,''),b.tag_name.replace(/^v/,'')))[0];
    if(!release||!semver.gt(release.tag_name.replace(/^v/,''),app.getVersion()))return 'Du verwendest die aktuelle Version.';
    const publishedVersion=release.tag_name.replace(/^v/,'');
    if(process.platform!=='win32'||!(autoUpdater instanceof NsisUpdater))return 'Neue Version '+publishedVersion+' verfügbar. Für macOS/Linux bitte den Installer von der öffentlichen Releases-Seite verwenden.';
    const assetUrl=(name:string)=>{
      const asset=release.assets.find((a:any)=>a.name===name);
      if(!asset)throw new Error('Update '+publishedVersion+' ist verfügbar, aber noch nicht signiert. Bitte vorerst manuell installieren.');
      const url=new URL(asset.browser_download_url);
      if(url.protocol!=='https:'||url.hostname!=='github.com'||!url.pathname.startsWith('/'+repo+'/releases/download/'))throw new Error('Unbekannte Update-Quelle.');
      return url.href;
    };
    const payload=await fetchBytes(assetUrl('scarrix-update.json'),1024*1024);
    const signature=Buffer.from((await fetchBytes(assetUrl('scarrix-update.sig'),1024)).toString().trim(),'base64');
    const manifest=verifyRelease(payload,signature,policy.publicKey);
    if(manifest.version!==publishedVersion)throw new Error('Signierte Update-Version stimmt nicht mit dem Release überein.');
    const metadataAsset=manifest.assets.find(a=>a.name==='latest.yml');
    if(!metadataAsset)throw new Error('Signierte Update-Metadaten fehlen.');
    const metadata=await fetchBytes(assetUrl('latest.yml'));
    if(crypto.createHash('sha512').update(metadata).digest('hex')!==metadataAsset.sha512)throw new Error('Update-Metadaten wurden verändert.');
    const info=yaml(metadata.toString()) as any;
    if(info.version!==manifest.version||!Array.isArray(info.files))throw new Error('Ungültige Update-Metadaten.');
    const expected=manifest.assets.find(a=>a.name.endsWith('-win-'+process.arch+'.exe'));
    if(!expected)throw new Error('Kein Update für diese Prozessorarchitektur verfügbar.');
    const entry=info.files.find((f:any)=>f.url===expected.name);
    if(!entry||Buffer.from(entry.sha512,'base64').toString('hex')!==expected.sha512||info.files.some((f:any)=>!manifest.assets.some(a=>a.name===f.url)))throw new Error('Installer stimmt nicht mit der signierten Veröffentlichung überein.');
    installer=expected;
    autoUpdater.autoDownload=false;
    autoUpdater.autoInstallOnAppQuit=false;
    autoUpdater.allowPrerelease=true;
    autoUpdater.allowDowngrade=false;
    autoUpdater.channel='latest';
    autoUpdater.disableDifferentialDownload=true;
    autoUpdater.setFeedURL({provider:'generic',url:new URL('./',assetUrl('latest.yml')).href});
    // Pinned Ed25519 signatures verify the full installer before execution. No client-side GitHub token.
    autoUpdater.verifyUpdateCodeSignature=async(_names,file)=>installer?verifyInstaller(file,installer):'Keine signierte Update-Datei freigegeben.';
    if(!configured){
      autoUpdater.on('error',()=>{send('app:progress',null);stepStatus('Update fehlgeschlagen','error');send('app:notice','Update fehlgeschlagen. Bitte erneut versuchen.');});
      autoUpdater.on('download-progress',i=>{send('app:progress',Math.round(i.percent));updateProgress(i.transferred,i.total);});
      autoUpdater.on('update-downloaded',async()=>{downloaded=true;send('app:progress',null);stepStatus('Update heruntergeladen und geprüft','done');send('app:notice','Update bereit. Installation benötigt einen Neustart.');try{await promptRestart();}catch(error){send('app:notice',error instanceof Error?error.message:'Update bleibt bereit. Bitte Minecraft beenden und erneut auf Updates klicken.');}});
      configured=true;
    }
    const result=await autoUpdater.checkForUpdates();
    const refreshed=result?.updateInfo as any;
    if(!refreshed||refreshed.version!==manifest.version||refreshed.packages||refreshed.path!==info.path||JSON.stringify(refreshed.files)!==JSON.stringify(info.files))throw new Error('Update wurde zwischenzeitlich geändert. Bitte erneut prüfen.');
    updateProgress=progressReporter('Launcher-Update herunterladen');
    send('app:notice','Signiertes Update '+publishedVersion+' wird heruntergeladen …');
    await autoUpdater.downloadUpdate();
    return 'Update heruntergeladen und geprüft.';
  }finally{checking=false;}
}
let updateProgress=progressReporter('Launcher-Update herunterladen');
async function promptRestart(){
  if(!target||target.isDestroyed())return;
  const result=await dialog.showMessageBox(target,{type:'info',title:'Launcher aktualisieren',message:'Geprüftes Update jetzt installieren und neu starten?',buttons:['Jetzt neu starten','Später'],defaultId:0,cancelId:1});
  if(result.response===0&&downloaded){assertIdle();autoUpdater.quitAndInstall(false,true);}
}
