const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function setup({cancel=false,decoded=true}={}) {
  const png=Buffer.alloc(32);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(64,16);png.writeUInt32BE(64,20);
  const saved=new Map();let calls=[];
  const fakeFs={existsSync:()=>true,statSync:()=>({size:png.length,mtime:new Date(),mtimeMs:1}),readFileSync:p=>saved.get(p)||png,
    readdirSync:()=>[...saved.keys()].map(p=>require('node:path').basename(p)),mkdirSync:()=>{},writeFileSync:(p,b)=>saved.set(p,b)};
  const box={exports:{},Buffer,require:id=>{
    if(id==='electron')return {dialog:{showOpenDialog:async()=>({canceled:cancel,filePaths:['/chosen/skin.png']})},nativeImage:{createFromBuffer:()=>({isEmpty:()=>!decoded,getSize:()=>({width:64,height:64})})}};
    if(id==='node:fs')return fakeFs;
    if(id==='./cape-images')return require('./load-main.cjs')('cape-images',{'electron':{}});
    if(id==='./config')return {appData:()=>'/fake'};
    if(id==='./auth')return {setSkin:async(...args)=>{calls.push(args);return {id:'player',name:'Musti',skins:[{url:'new-skin'}]};}};
    return require(id);
  }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/main/skins.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,box);
  return {api:box.exports,calls,saved};
}
test('skin import is local and apply is explicit with the selected model',async()=>{
  const s=setup();const imported=await s.api.upload('skins','classic');
  assert.equal(s.calls.length,0);assert.equal(s.saved.size,1);
  assert.match(imported.selectedId,/^[a-f0-9]{16}\.png$/);
  const profile=await s.api.applySavedSkin(imported.selectedId,'slim');
  assert.equal(s.calls.length,1);assert.equal(s.calls[0][2],'slim');assert.equal(profile.skins[0].url,'new-skin');
});
test('cancelled import never saves or changes the Minecraft skin',async()=>{
  const s=setup({cancel:true});const result=await s.api.upload('skins','classic');
  assert.equal(result.selectedId,undefined);assert.equal(s.saved.size,0);assert.equal(s.calls.length,0);
});
test('broken PNG, path traversal and invalid model are rejected',async()=>{
  const s=setup({decoded:false});await assert.rejects(s.api.upload('skins','classic'),/beschädigt/);
  await assert.rejects(s.api.applySavedSkin('../skin.png','classic'),/Skin-ID/);
  await assert.rejects(s.api.applySavedSkin('0123456789abcdef.png','bad'),/Skin-Modell/);
  assert.equal(s.calls.length,0);
});
