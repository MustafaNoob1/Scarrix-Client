const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup() {
  let config = JSON.stringify(JSON.parse(fs.readFileSync('config.json', 'utf8')));
  let temp;
  const fakeFs = {existsSync:()=>true,readFileSync:()=>config,mkdirSync:()=>{},writeFileSync:(_p,c)=>temp=c,renameSync:()=>config=temp};
  const box={exports:{},process,require:id=>{
    if(id==='./operations')return {assertIdle:()=>{}};
    if(id==='electron')return {app:{getPath:()=>'/fake',isPackaged:false}};
    if(id==='node:fs')return fakeFs;
    if(id==='./memory')return {validMemory:gb=>gb>=.5 && gb<=16 && gb*1024%256===0};
    if(id==='./versions')return {officialVersions:async()=>['1.21.1']};
    return require(id);
  }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/main/config.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,box);
  return box.exports;
}
test('appearance preferences survive a save/reload and profile names accept German characters',async()=>{
  const api=setup();const c=api.getConfig();
  c.launcher={theme:'purple',rotateSkin:false,animations:false,background:'plain'};
  c.instances.push({id:'new',name:'Überleben · Fabric',version:'1.21.1',loader:'fabric',ramGB:.5});
  c.activeInstanceId='new';
  const saved=await api.saveConfig(c);
  assert.equal(saved.launcher.theme,'purple');
  assert.equal(saved.launcher.rotateSkin,false);
  assert.equal(saved.launcher.animations,false);
  assert.equal(saved.launcher.background,'plain');
  assert.equal(saved.minecraft.ramGB,.5);
  assert.equal(saved.instances[1].name,'Überleben · Fabric');
});
test('old installations gain appearance defaults',()=>{
  const c=setup().getConfig();
  assert.equal(c.launcher.rotateSkin,true);
  assert.equal(c.launcher.animations,true);
  assert.equal(c.launcher.background,'grid');
});
