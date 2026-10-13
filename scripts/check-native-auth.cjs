const path=require('node:path'),{spawnSync}=require('node:child_process');
if(process.platform!=='win32')process.exit(0);
const exe=path.resolve('release/win-unpacked/Scarrix Client.exe');
const modulePath=path.resolve('release/win-unpacked/resources/app.asar/node_modules/@azure/msal-node-extensions');
const code=`const {NativeBrokerPlugin}=require(${JSON.stringify(modulePath)});const p=new NativeBrokerPlugin();if(typeof p.isBrokerAvailable!=='boolean')throw Error('Broker initialization failed');console.log('Packaged Microsoft broker modules load successfully; available='+p.isBrokerAvailable);`;
const result=spawnSync(exe,['-e',code],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8',timeout:30000});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');if(result.error)throw result.error;if(result.status!==0)process.exit(1);
