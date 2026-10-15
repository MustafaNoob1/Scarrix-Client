const test=require('node:test'),assert=require('node:assert/strict'),load=require('./load-main.cjs');
test('play avatar uses the active Minecraft skin and the real profile name',()=>{
 const api=load('user-profile');
 const result=api.publicMinecraftProfile({id:'id',name:'Musti',skins:[{url:'old',state:'INACTIVE'},{url:'current',state:'ACTIVE',variant:'SLIM'}]});
 assert.equal(result.name,'Musti');assert.equal(result.skins.length,1);assert.equal(result.skins[0].url,'current');assert.equal(result.skins[0].variant,'SLIM');
});
test('a profile without skins remains empty for the guest/placeholder preview',()=>{
 const api=load('user-profile');assert.equal(api.publicMinecraftProfile({id:'id',name:'Musti'}).skins.length,0);
});

test('legacy official HTTP skin and cape addresses become HTTPS without weakening the renderer policy',()=>{const api=load('user-profile');const raw={id:'id',name:'MMusti',skins:[{url:'http://textures.minecraft.net/texture/a9d82c55',state:'ACTIVE',variant:'SLIM'}],capes:[{id:'cape',url:'http://textures.minecraft.net/texture/abc123',state:'ACTIVE'}]};const p=api.publicMinecraftProfile(raw);assert.equal(p.skins[0].url,'https://textures.minecraft.net/texture/a9d82c55');assert.equal(p.capes[0].url,'https://textures.minecraft.net/texture/abc123');assert.equal(api.minecraftTextureUrl('http://example.org/texture/abc'),'http://example.org/texture/abc');assert.equal(api.minecraftTextureUrl('data:image/png;base64,AA'),'data:image/png;base64,AA');});
