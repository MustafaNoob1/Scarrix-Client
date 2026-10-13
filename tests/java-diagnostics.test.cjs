const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./load-main.cjs');
test('required Java comes from official metadata and fallback supports older versions',async()=>{
 const api=load('java',{'./config':{},'./versions':{officialMetadata:async()=>({javaVersion:{majorVersion:25}})}});
 assert.equal(await api.requiredJava('26.1'),25);
 for(const [version,major] of [['1.16.5',8],['1.17.1',16],['1.18.2',17],['1.20.4',17],['1.20.5',21],['1.21.1',21]])assert.equal(api.fallbackJavaMajor(version),major);
 for(const bad of ['../file','/root','C:/file','a\\b','mods/CON.jar','mods/file.'])assert.equal(api.archiveSafe(bad),false);
 assert.equal(api.archiveSafe('jdk/bin/java.exe'),true);
});
test('diagnostics hide bearer tokens and explain network, disk and expired login errors',()=>{
 const api=load('diagnostics',{'electron':{},'./config':{}});
 assert.match(api.friendlyError(Error('fetch failed')),/Verbindung/);
 assert.match(api.friendlyError(Error('ENOSPC')),/Speicherplatz/);
 assert.match(api.friendlyError(Error('HTTP 401')),/abgelaufen/);
  assert.equal(api.friendlyError('Bearer secret-token-value'),'Bearer [entfernt]');
});
test('active operations and running game block conflicting changes',async()=>{
 const api=load('operations');let unblock;
 const running=api.exclusive('Download',()=>new Promise(resolve=>unblock=resolve));
 assert.throws(()=>api.assertIdle(),/Download/);unblock();await running;api.assertIdle();
 api.setGameRunning(true);assert.throws(()=>api.assertIdle(),/Minecraft/);api.setGameRunning(false);api.assertIdle();
});
