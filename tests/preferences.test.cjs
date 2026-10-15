const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup(language='de') {
  const legacy = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  legacy.launcher = {theme:'red'};legacy.language=language;
  let config = JSON.stringify(legacy);
  let temp;
  const fakeFs = {existsSync:()=>true,readFileSync:()=>config,mkdirSync:()=>{},writeFileSync:(_p,c)=>temp=c,renameSync:()=>config=temp};
  const box={exports:{},process,require:id=>{
    if(id==='./languages')return require('./load-main.cjs')('languages');
    if(id==='./launcher-options')return require('./load-main.cjs')('launcher-options');
    if(id==='./profile-options')return require('./load-main.cjs')('profile-options');
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
test('home preferences, favorites, profile colors and preferred accounts survive a config round trip',async()=>{
 const api=setup(),c=api.getConfig();c.launcher={...c.launcher,discordPresence:false,showNews:false,skinSize:'large',quickProfileId:'default',onboardingDone:true};Object.assign(c.instances[0],{favorite:true,color:'gold',preferredAccountId:'a'.repeat(32)});const saved=await api.saveConfig(c);assert.equal(saved.launcher.discordPresence,false);assert.equal(saved.launcher.showNews,false);assert.equal(saved.launcher.skinSize,'large');assert.equal(saved.launcher.onboardingDone,true);assert.equal(saved.launcher.quickProfileId,'default');assert.equal(saved.instances[0].favorite,true);assert.equal(saved.instances[0].color,'gold');assert.equal(saved.instances[0].preferredAccountId,'a'.repeat(32));
 await assert.rejects(api.saveConfig({...saved,instances:[{...saved.instances[0],color:'javascript'}]}));await assert.rejects(api.saveConfig({...saved,instances:[{...saved.instances[0],preferredAccountId:'../file'}]}));
});
test('animated backgrounds are saved and unknown options fall back safely',async()=>{
  const api=setup();
  for(const background of ['aurora','stars','nebula','embers','matrix','horizon']){
    const cfg=api.getConfig();cfg.launcher.background=background;
    assert.equal((await api.saveConfig(cfg)).launcher.background,background);
  }
  const cfg=api.getConfig();cfg.launcher.background='unknown-background';
  assert.equal((await api.saveConfig(cfg)).launcher.background,'grid');
});
test('background motion is independent of other animations and validates saved values',async()=>{
 const api=setup();
 for(const motion of ['on','off','system']){const c=api.getConfig();c.launcher.animations=false;c.launcher.backgroundMotion=motion;const saved=await api.saveConfig(c);assert.equal(saved.launcher.backgroundMotion,motion);assert.equal(saved.launcher.animations,false);}
 const c=api.getConfig();c.launcher.backgroundMotion='invalid';assert.equal((await api.saveConfig(c)).launcher.backgroundMotion,'on');
});

test('remember preference and exact modpack loader version survive config round trips',async()=>{const api=setup();const c=api.getConfig();c.launcher.rememberAccount=false;c.instances[0].loader='fabric';c.instances[0].loaderVersion='0.16.10';const saved=await api.saveConfig(c);assert.equal(saved.launcher.rememberAccount,false);assert.equal(saved.minecraft.loaderVersion,'0.16.10');assert.equal(api.getConfig().instances[0].loaderVersion,'0.16.10');c.instances[0].loaderVersion='../invalid';await assert.rejects(api.saveConfig(c),/Loader-Version/);});
test('per-profile preferences persist and shared groups reject incompatible installations',async()=>{const api=setup(),c=api.getConfig();c.instances[0]={...c.instances[0],group:'Modpacks',sharedGroup:true,window:{width:1920,height:1080,fullscreen:true},jvmArgs:['-XX:+UseG1GC'],javaPath:require('node:path').resolve('java-test')};const saved=await api.saveConfig(c);assert.equal(saved.instances[0].window.width,1920);assert.equal(saved.instances[0].sharedGroup,true);assert.equal(saved.instances[0].jvmArgs[0],'-XX:+UseG1GC');c.instances.push({...c.instances[0],id:'second',loader:'fabric'});await assert.rejects(api.saveConfig(c),/gemeinsamem Gruppenordner/);});

test('all seven supported languages persist and unknown locales are rejected or migrated safely',async()=>{const api=setup();for(const language of ['de','en','pl','fr','it','tr','pt']){const c=api.getConfig();c.language=language;assert.equal((await api.saveConfig(c)).language,language);}for(const language of ['ru','DE','__proto__'])await assert.rejects(api.saveConfig({...api.getConfig(),language}));assert.equal(setup('invalid').getConfig().language,'de');});
