const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-main.cjs');
test('play avatar uses the active Minecraft skin and the real profile name',()=>{
 const api=load('user-profile');
 const result=api.publicMinecraftProfile({id:'id',name:'Musti',skins:[{url:'old',state:'INACTIVE'},{url:'current',state:'ACTIVE',variant:'SLIM'}]});
 assert.equal(result.name,'Musti');assert.equal(result.skins.length,1);assert.equal(result.skins[0].url,'current');assert.equal(result.skins[0].variant,'SLIM');
});
test('a profile without skins remains empty for the guest/placeholder preview',()=>{
 const api=load('user-profile');assert.equal(api.publicMinecraftProfile({id:'id',name:'Musti'}).skins.length,0);
});
