const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
module.exports=function loadMain(name,mocks={},cache=new Map()){
 const file=path.resolve('src/main',name.endsWith('.ts')?name:name+'.ts');
 if(cache.has(file))return cache.get(file);
 const exports={};cache.set(file,exports);
 const req=id=>{
  if(Object.hasOwn(mocks,id))return mocks[id];
  if(id.startsWith('.'))return module.exports(path.relative(path.resolve('src/main'),path.resolve(path.dirname(file),id)),mocks,cache);
  return require(id);
 };
 const box={exports,require:req,Buffer,process:mocks.process||process,URL,URLSearchParams,fetch:mocks.fetch||fetch,AbortSignal,AbortController,setTimeout,clearTimeout,console,TextDecoder};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,box,{filename:file});
 return exports;
};
