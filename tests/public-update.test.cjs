const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const load=require('./load-main.cjs');
function setup({signed=true,tamper=false,restart=false,changedMetadata=false}={}){
 const keys=crypto.generateKeyPairSync('ed25519');
 const publicKey=keys.publicKey.export({format:'pem',type:'spki'});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scarrix-update-test-'));
 const file=path.join(dir,'installer.exe');fs.writeFileSync(file,'checked installer');
 const name='Scarrix-Client-0.5.0-beta.2-win-x64.exe';
 const hash=crypto.createHash('sha512').update('checked installer').digest('hex');
 const meta=Buffer.from('version: 0.5.0-beta.2\nfiles:\n  - url: '+name+'\n    sha512: '+Buffer.from(hash,'hex').toString('base64')+'\n');
 const manifest=Buffer.from(JSON.stringify({version:'0.5.0-beta.2',assets:[{name,size:17,sha512:hash},{name:'latest.yml',size:meta.length,sha512:crypto.createHash('sha512').update(meta).digest('hex')}]}));
 const signature=crypto.sign(null,manifest,keys.privateKey).toString('base64');
 const assetNames=signed?['scarrix-update.json','scarrix-update.sig','latest.yml',name]:[name];
 const base='https://github.com/MustafaNoob1/scarrix-client/releases/download/v0.5.0-beta.2/';
 const release=[{draft:false,tag_name:'v0.5.0-beta.2',assets:assetNames.map(name=>({name,browser_download_url:base+name}))}];
 const bodies={'scarrix-update.json':manifest,'scarrix-update.sig':signature,'latest.yml':meta};
 class Updater {
  set channel(value){this.selectedChannel=value;this.allowDowngrade=true;}
  events={};on(k,cb){this.events[k]=cb;}setFeedURL(v){this.feed=v;}
  async checkForUpdates(){const info=require('js-yaml').load(meta.toString());if(changedMetadata)info.packages={x64:{path:'untrusted-package'}};return {updateInfo:info};}
  async downloadUpdate(){this.downloaded=true;const error=await this.verifyUpdateCodeSignature([],file);if(error)throw Error(error);await this.events['update-downloaded']();}
  quitAndInstall(...args){this.install=args;}
 }
 let prompts=0,blocked=false;const updater=new Updater();
 if(tamper)fs.writeFileSync(file,'tampered installer');
 const mocks={process:{...process,resourcesPath:dir,platform:'win32',arch:'x64'},'electron':{app:{isPackaged:true,getVersion:()=> '0.5.0-beta.1'},dialog:{showMessageBox:async()=>{prompts++;return {response:restart?0:1};}}},
  'electron-updater':{autoUpdater:updater,NsisUpdater:Updater},'./operations':{assertIdle:()=>{if(blocked)throw Error('Bitte beende zuerst Minecraft.');}},
  'node:fs':{...fs,readFileSync:(p,...args)=>String(p).endsWith('update-channel.json')?JSON.stringify({enabled:true,publicKey}):fs.readFileSync(p,...args)},
  fetch:async url=>{const body=url.includes('api.github.com')?JSON.stringify(release):bodies[url.split('/').pop()];const response=new Response(body);Object.defineProperty(response,'url',{value:url});return response;}
 };
 return {api:load('public-updater',mocks),updater,block:()=>{blocked=true;},get prompts(){return prompts;},win:{isDestroyed:()=>false,webContents:{send:()=>{}}},cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('signed public update applies silently and relaunches on the explicit apply button without a second dialog',async()=>{
 const s=setup({restart:true});try{await s.api.checkForUpdate(s.win);assert.equal(s.updater.downloaded,undefined);await s.api.downloadLauncherUpdate(s.win);assert.equal(s.updater.install,undefined);await s.api.installLauncherUpdate(s.win);assert.deepEqual(s.updater.install,[true,true]);assert.equal(s.updater.autoInstallOnAppQuit,false);assert.equal(s.updater.allowDowngrade,false);assert.equal(s.updater.disableDifferentialDownload,false);assert.equal(s.updater.feed.useMultipleRangeRequest,false);}finally{s.cleanup();}
});
test('unsigned releases and altered installers cannot install',async()=>{
 for(const opts of [{signed:false},{tamper:true}]){const s=setup(opts);try{if(opts.signed===false)await assert.rejects(s.api.checkForUpdate(s.win));else{await s.api.checkForUpdate(s.win);await assert.rejects(s.api.downloadLauncherUpdate(s.win));}assert.equal(s.updater.install,undefined);}finally{s.cleanup();}}
});
test('a downloaded update stays ready until the apply button is pressed',async()=>{
 const s=setup();try{await s.api.checkForUpdate(s.win);await s.api.downloadLauncherUpdate(s.win);assert.equal(s.updater.downloaded,true);assert.equal(s.prompts,0);assert.equal(s.updater.install,undefined);await s.api.checkForUpdate(s.win);assert.equal(s.updater.install,undefined);}finally{s.cleanup();}
});
test('metadata changed between signature check and SDK fetch cannot download or install',async()=>{
 const s=setup({changedMetadata:true});try{await s.api.checkForUpdate(s.win);await assert.rejects(s.api.downloadLauncherUpdate(s.win),/zwischenzeitlich/);assert.equal(s.updater.downloaded,undefined);assert.equal(s.updater.install,undefined);}finally{s.cleanup();}
});
test('manifest signature rejects a different signing key and changed payload',()=>{
 const {verifyRelease}=load('update-trust');const a=crypto.generateKeyPairSync('ed25519'),b=crypto.generateKeyPairSync('ed25519');
 const body=Buffer.from(JSON.stringify({version:'0.5.0',assets:[]}));const sig=crypto.sign(null,body,a.privateKey);
 assert.throws(()=>verifyRelease(body,sig,b.publicKey.export({type:'spki',format:'pem'})),/Signatur/);
 assert.throws(()=>verifyRelease(Buffer.from('{}'),sig,a.publicKey.export({type:'spki',format:'pem'})),/Signatur/);
});

test('startup and repeated manual checks only discover updates without downloads or restart prompts',async()=>{const s=setup();try{await s.api.checkForUpdate(s.win,false);assert.equal(s.api.updateState().status,'available');assert.equal(s.api.updateState().canDownload,true);assert.equal(s.updater.downloaded,undefined);assert.equal(s.updater.feed,undefined);assert.equal(s.prompts,0);assert.equal(s.updater.autoDownload,false);assert.equal(s.updater.autoInstallOnAppQuit,false);await s.api.checkForUpdate(s.win);assert.equal(s.updater.downloaded,undefined);assert.equal(s.prompts,0);}finally{s.cleanup();}});
test('download and installation require their own explicit actions and a verified available update',async()=>{const s=setup();try{await assert.rejects(s.api.downloadLauncherUpdate(s.win),/zuerst nach Updates/);await assert.rejects(s.api.installLauncherUpdate(s.win),/zuerst/);await s.api.checkForUpdate(s.win);await s.api.downloadLauncherUpdate(s.win);assert.equal(s.api.updateState().status,'ready');assert.equal(s.api.updateState().canDownload,false);assert.equal(s.prompts,0);await s.api.checkForUpdate(s.win,false);assert.equal(s.prompts,0);await s.api.installLauncherUpdate(s.win);assert.equal(s.prompts,0);assert.deepEqual(s.updater.install,[true,true]);}finally{s.cleanup();}});
test('apply still rejects running games and closed windows without starting installation',async()=>{for(const closed of [true,false]){const s=setup();try{await s.api.checkForUpdate(s.win);await s.api.downloadLauncherUpdate(s.win);if(closed)s.win.isDestroyed=()=>true;else s.block();await assert.rejects(s.api.installLauncherUpdate(s.win),closed?/Fenster/:/Minecraft/);assert.equal(s.updater.install,undefined);assert.equal(s.prompts,0);}finally{s.cleanup();}}});
