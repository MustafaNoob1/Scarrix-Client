const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const load=require('./load-main.cjs');
function setup({signed=true,tamper=false,restart=false}={}){
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
  events={};on(k,cb){this.events[k]=cb;}setFeedURL(v){this.feed=v;}
  async checkForUpdates(){return {updateInfo:{version:'0.5.0-beta.2'}};}
  async downloadUpdate(){this.downloaded=true;const error=await this.verifyUpdateCodeSignature([],file);if(error)throw Error(error);await this.events['update-downloaded']();}
  quitAndInstall(...args){this.install=args;}
 }
 const updater=new Updater();
 if(tamper)fs.writeFileSync(file,'tampered installer');
 const mocks={process:{...process,resourcesPath:dir,platform:'win32',arch:'x64'},'electron':{app:{isPackaged:true,getVersion:()=> '0.5.0-beta.1'},dialog:{showMessageBox:async()=>({response:restart?0:1})}},
  'electron-updater':{autoUpdater:updater,NsisUpdater:Updater},
  'node:fs':{...fs,readFileSync:(p,...args)=>String(p).endsWith('update-channel.json')?JSON.stringify({enabled:true,publicKey}):fs.readFileSync(p,...args)},
  fetch:async url=>{const body=url.includes('api.github.com')?JSON.stringify(release):bodies[url.split('/').pop()];const response=new Response(body);Object.defineProperty(response,'url',{value:url});return response;}
 };
 return {api:load('public-updater',mocks),updater,win:{isDestroyed:()=>false,webContents:{send:()=>{}}},cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('signed public update is downloaded and restarts after explicit confirmation',async()=>{
 const s=setup({restart:true});try{await s.api.checkForUpdate(s.win);assert.deepEqual(s.updater.install,[false,true]);assert.equal(s.updater.autoInstallOnAppQuit,false);}finally{s.cleanup();}
});
test('unsigned releases and altered installers cannot install',async()=>{
 for(const opts of [{signed:false},{tamper:true}]){const s=setup(opts);try{await assert.rejects(s.api.checkForUpdate(s.win));assert.equal(s.updater.install,undefined);}finally{s.cleanup();}}
});
test('later leaves verified update ready without restarting',async()=>{
 const s=setup();try{await s.api.checkForUpdate(s.win);assert.equal(s.updater.downloaded,true);assert.equal(s.updater.install,undefined);await s.api.checkForUpdate(s.win);assert.equal(s.updater.install,undefined);}finally{s.cleanup();}
});
test('manifest signature rejects a different signing key and changed payload',()=>{
 const {verifyRelease}=load('update-trust');const a=crypto.generateKeyPairSync('ed25519'),b=crypto.generateKeyPairSync('ed25519');
 const body=Buffer.from(JSON.stringify({version:'0.5.0',assets:[]}));const sig=crypto.sign(null,body,a.privateKey);
 assert.throws(()=>verifyRelease(body,sig,b.publicKey.export({type:'spki',format:'pem'})),/Signatur/);
 assert.throws(()=>verifyRelease(Buffer.from('{}'),sig,a.publicKey.export({type:'spki',format:'pem'})),/Signatur/);
});
