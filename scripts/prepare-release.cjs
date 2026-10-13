const fs=require('fs');
const base=require('../package.json').version.split('-')[0];
const version=process.env.GITHUB_RUN_NUMBER ? base+'-beta.'+process.env.GITHUB_RUN_NUMBER : base;
for(const file of ['package.json','package-lock.json']){
 const obj=JSON.parse(fs.readFileSync(file));obj.version=version;
 if(obj.packages)obj.packages[''].version=version;
 fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n');
}
console.log('Release version: '+version);
