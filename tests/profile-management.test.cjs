const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),AdmZip=require('adm-zip');
const load=require('./load-main.cjs');
test('profile archive traversal, links, unexpected paths and invalid sizes are rejected',()=>{
 const api=load('profile-files',{'electron':{},'./config':{},'./java':{archiveSafe:n=>n&&!n.startsWith('/')&&!n.includes('\\')&&!n.includes(':')&&!n.split('/').includes('..')}});
 const entry=(entryName,size=1,attr=0)=>({entryName,header:{size},attr});
 for(const bad of ['files/mods/../../outside.jar','C:/escape','files/auth/token.json','settings.json'])assert.throws(()=>api.validateArchiveEntries([entry(bad)]));
 assert.throws(()=>api.validateArchiveEntries([entry('files/mods/link.jar',1,0xa000<<16)]));
 api.validateArchiveEntries([entry('files/mods/big.jar',5*1024**3)]);
 assert.throws(()=>api.validateArchiveEntries([entry('files/mods/big.jar',Number.MAX_SAFE_INTEGER+1)]));
 assert.throws(()=>api.validateArchiveEntries([entry('files/mods/A.jar'),entry('files/mods/a.jar')]));
 api.validateArchiveEntries([entry('profile.json'),entry('files/mods/test.jar')]);
});
test('profile export/import and duplicate preserve files while creating new IDs',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scarrix-profile-test-'));
 const file=path.join(dir,'export.zip');let chosen=file;
 let cfg={instances:[{id:'default',name:'Vanilla',version:'1.21.1',loader:'vanilla',ramGB:4}],activeInstanceId:'default'};
 const root=path.join(dir,'minecraft');const folder=path.join(root,'instances','default','mods');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'test.jar'),'mod-data');fs.writeFileSync(path.join(root,'instances','default','options.txt'),'game-options');
 const config={getConfig:()=>cfg,rootPath:()=>root,instancePath:()=>path.join(root,'instances',cfg.activeInstanceId),saveConfig:async c=>(cfg=c)};
 const api=load('profile-files',{'electron':{dialog:{showSaveDialog:async()=>({filePath:file,canceled:false}),showOpenDialog:async()=>({filePaths:[chosen],canceled:false})}},'./config':config,'./java':{archiveSafe:n=>n&&!n.startsWith('/')&&!n.includes('\\')&&!n.includes(':')&&!n.split('/').includes('..')}});
 try {
  await api.exportProfile('default');
  const zip=new AdmZip(file);assert.equal(zip.getEntry('files/mods/test.jar').getData().toString(),'mod-data');assert.equal(zip.getEntries().some(e=>e.entryName.includes('auth')),false);
  const imported=await api.importProfile();assert.equal(imported.instances.length,2);assert.notEqual(imported.activeInstanceId,'default');
  assert.equal(fs.readFileSync(path.join(root,'instances',imported.activeInstanceId,'mods','test.jar'),'utf8'),'mod-data');
  const duplicated=await api.duplicateProfile(imported.activeInstanceId);assert.equal(duplicated.instances.length,3);assert.notEqual(duplicated.activeInstanceId,imported.instances[1].id);
  assert.equal(fs.readFileSync(path.join(root,'instances',duplicated.activeInstanceId,'mods','test.jar'),'utf8'),'mod-data');assert.equal(fs.readFileSync(path.join(root,'instances',duplicated.activeInstanceId,'options.txt'),'utf8'),'game-options');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('installed mod toggling and removal only touch the chosen profile',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scarrix-mod-test-'));fs.mkdirSync(path.join(dir,'mods'));fs.writeFileSync(path.join(dir,'mods','one.jar'),'mod');
 const api=load('mods',{'./config':{instancePath:()=>dir,getConfig:()=>({})}});
 try {
  assert.equal(api.installedMods()[0].enabled,true);
  assert.equal(api.toggleMod('one.jar',false)[0].enabled,false);
  assert.equal(api.toggleMod('one.jar.disabled',true)[0].filename,'one.jar');
  assert.throws(()=>api.removeMod('../outside.jar'));
  assert.equal(api.removeMod('one.jar').length,0);
  assert.equal(fs.readdirSync(path.join(dir,'removed-mods')).length,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
