const test=require('node:test'),assert=require('node:assert/strict');
const control=require('./load-main.cjs')('window-controls').controlWindow;
test('window controls toggle maximize, minimize and close using only supported actions',()=>{let max=false,closed=false,min=false;const w={isDestroyed:()=>false,isMaximized:()=>max,maximize:()=>max=true,unmaximize:()=>max=false,minimize:()=>min=true,close:()=>closed=true};assert.equal(control(w,'maximize'),true);assert.equal(control(w,'maximize'),false);control(w,'minimize');assert.ok(min);control(w,'close');assert.ok(closed);assert.throws(()=>control(w,'destroy'));});
test('destroyed windows do not receive actions',()=>{assert.equal(control({isDestroyed:()=>true},'maximize'),false);});
