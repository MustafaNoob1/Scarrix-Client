const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const parse=require('../scripts/signing-key.cjs');
test('PEM secret accepts normal, JSON-quoted and escaped-linebreak copies',()=>{
 const pair=crypto.generateKeyPairSync('ed25519');const raw=pair.privateKey.export({type:'pkcs8',format:'pem'});
 for(const input of [raw,JSON.stringify(raw),raw.replace(/\n/g,'\\n'),'\uFEFF'+raw]){
  const key=parse(input);const body=Buffer.from('update');
  assert.equal(crypto.verify(null,body,pair.publicKey,crypto.sign(null,body,key)),true);
 }
});
test('paths, incomplete secrets and public keys are rejected without disclosing their value',()=>{
 for(const value of ['scarrix-update-private.pem','C:/Users/private.pem','wrong-secret-value','-----BEGIN PUBLIC KEY-----\nkey\n-----END PUBLIC KEY-----']){
  assert.throws(()=>parse(value),/vollständigen PEM/);
  try{parse(value);}catch(error){assert.equal(error.message.includes(value),false);}
 }
});
