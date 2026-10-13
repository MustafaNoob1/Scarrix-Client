const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),yaml=require('js-yaml');
const dir=process.argv[2]||'release-assets';
const privateKey=process.env.SCARRIX_UPDATE_PRIVATE_KEY;
if(!privateKey){console.log('Update signing is not configured. Preview installers remain manually installable.');process.exit(0);}
const publicKey=JSON.parse(fs.readFileSync('update-channel.json','utf8')).publicKey;
const derived=crypto.createPublicKey(privateKey).export({type:'spki',format:'pem'});
if(derived.trim()!==publicKey.trim())throw Error('Update signing key does not match pinned public key.');
const names=fs.readdirSync(dir).filter(n=>/\.(exe|dmg|zip|AppImage|deb|yml|blockmap)$/.test(n)).sort();
let version;
const assets=names.map(name=>{
 if(!/^[a-zA-Z0-9._-]+$/.test(name))throw Error('Unsafe asset name: '+name);
 const bytes=fs.readFileSync(path.join(dir,name));
 if(name==='latest.yml')version=yaml.load(bytes.toString()).version;
 return {name,sha512:crypto.createHash('sha512').update(bytes).digest('hex'),size:bytes.length};
});
if(!version)throw Error('Windows update metadata missing.');
const payload=Buffer.from(JSON.stringify({version,assets}));
fs.writeFileSync(path.join(dir,'scarrix-update.json'),payload);
fs.writeFileSync(path.join(dir,'scarrix-update.sig'),crypto.sign(null,payload,privateKey).toString('base64'));
console.log('Signed update manifest created for '+version);
