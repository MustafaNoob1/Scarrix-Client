const crypto=require('node:crypto');
module.exports=function signingKey(raw){
 let value=String(raw||'').trim().replace(/^\uFEFF/,'');
 if(value.startsWith('"')){try{const decoded=JSON.parse(value);if(typeof decoded==='string')value=decoded;}catch{}}
 value=value.replace(/\\r\\n/g,'\n').replace(/\\n/g,'\n').trim();
 if(!value.startsWith('-----BEGIN PRIVATE KEY-----')||!value.endsWith('-----END PRIVATE KEY-----'))throw Error('SCARRIX_UPDATE_PRIVATE_KEY benötigt den vollständigen PEM-Dateiinhalt inklusive BEGIN PRIVATE KEY und END PRIVATE KEY.');
 let key;try{key=crypto.createPrivateKey(value);}catch{throw Error('SCARRIX_UPDATE_PRIVATE_KEY ist kein lesbarer privater PEM-Schlüssel. Bitte vollständigen Dateiinhalt kopieren.');}
 if(key.asymmetricKeyType!=='ed25519')throw Error('Update-Schlüssel muss Ed25519 verwenden.');
 return key;
};
