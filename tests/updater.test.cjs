const test=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(policy,signature={status:'Valid',subject:'CN=Scarrix'}) {
  class Updater { on(k,cb){this.events[k]=cb;} events={}; setFeedURL(v){this.feed=v;} async checkForUpdates(){return {};} quitAndInstall(...args){this.install=args;} }
  const updater=new Updater(); const messages=[];
  const box={exports:{},process:{resourcesPath:'resources',platform:'win32',env:{}},URL,require:(id)=>{
    if(id==='electron')return {app:{isPackaged:true},dialog:{showMessageBox:async()=>({response:0})}};
    if(id==='electron-updater')return {autoUpdater:updater,NsisUpdater:Updater};
    if(id==='node:fs')return {readFileSync:()=>JSON.stringify(policy)};
    if(id==='node:util')return {promisify:()=>async()=>({stdout:JSON.stringify(signature)})};
    if(id==='node:child_process')return {execFile:(_file,_args,_options,cb)=>cb(null,JSON.stringify(signature),'')};
    return require(id);
  }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/main/updater.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,box);
  return {api:box.exports,updater,win:{isDestroyed:()=>false,webContents:{send:(...args)=>messages.push(args)}},messages};
}
test('disabled private update channel never contacts feed',async()=>{
  const s=setup({enabled:false});assert.match(await s.api.checkForUpdate(s.win),/nicht freigeschaltet/);assert.equal(s.updater.feed,undefined);
});
test('HTTPS channel verifies publisher and downloads then restarts only after prompt',async()=>{
  const s=setup({enabled:true,url:'https://updates.example.com/stable/',publisher:'CN=Scarrix'});
  await s.api.checkForUpdate(s.win);
  assert.equal(s.updater.autoInstallOnAppQuit,false);
  assert.equal(await s.updater.verifyUpdateCodeSignature([], 'installer.exe'),null);
  await s.updater.events['update-downloaded']();
  assert.deepEqual(s.updater.install,[false,true]);
});
test('wrong publisher and insecure feed are rejected',async()=>{
  const s=setup({enabled:true,url:'https://updates.example.com/',publisher:'CN=Scarrix'},{status:'Valid',subject:'CN=Other'});
  await s.api.checkForUpdate(s.win);
  assert.match(await s.updater.verifyUpdateCodeSignature([],'installer.exe'),/ungültig/);
  const bad=setup({enabled:true,url:'http://example.com/',publisher:'CN=Scarrix'});
  await assert.rejects(bad.api.checkForUpdate(bad.win),/Ungültiger/);
});
