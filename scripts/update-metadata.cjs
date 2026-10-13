const fs=require('fs'),path=require('path');
for(const name of fs.readdirSync('release'))if(/^beta(?:-mac|-linux)?\.yml$/.test(name))fs.copyFileSync(path.join('release',name),path.join('release',name.replace('beta','latest')));
