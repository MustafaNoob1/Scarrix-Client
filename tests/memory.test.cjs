const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const code = ts.transpileModule(fs.readFileSync('src/main/memory.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const box = {exports:{},require};
vm.runInNewContext(code,box);
const {memoryInfo,validMemory} = box.exports;
test('physical RAM is rounded down and recommendation leaves system headroom', () => {
  for (const mb of [1024,4096,8192,16384,65536]) {
    const info=memoryInfo(mb*1024*1024+123);
    assert.equal(info.maxMB,mb);
    assert.equal(info.recommendedMB,Math.min(8192,mb/2));
  }
  assert.equal(memoryInfo(7890*1024*1024).maxMB,7680);
  assert.throws(()=>memoryInfo(NaN));
});
test('RAM accepts half GB and quarter GB steps but rejects oversized/invalid values', () => {
  assert.equal(validMemory(.5,8192),true);
  assert.equal(validMemory(.75,8192),true);
  for (const gb of [.25,.6,9,NaN,Infinity]) assert.equal(validMemory(gb,8192),false);
});
