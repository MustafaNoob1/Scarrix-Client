const test=require('node:test'),assert=require('node:assert/strict');
class IdleAnimation{}
const apply=require('./load-main.cjs')('../renderer/skin-motion',{'skinview3d':{IdleAnimation}}).applySkinMotion;
test('explicit skin rotation stays enabled under Windows reduced motion',()=>{const viewer={};apply(viewer,true,true,true);assert.equal(viewer.autoRotate,true);assert.equal(viewer.autoRotateSpeed,.65);assert.equal(viewer.animation,null);});
test('rotation and idle switches update an existing viewer independently',()=>{const viewer={};apply(viewer,true,false,false);assert.equal(viewer.autoRotate,true);assert.equal(viewer.animation,null);apply(viewer,false,true,false);assert.equal(viewer.autoRotate,false);assert.ok(viewer.animation instanceof IdleAnimation);apply(viewer,false,false,false);assert.equal(viewer.animation,null);});
