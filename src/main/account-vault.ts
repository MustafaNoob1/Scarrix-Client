import {safeStorage} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {appData} from './config';
import {secureAccountStorage,type RememberedAccount} from './auth-store';
type Entry={id:string;name:string;credentials:RememberedAccount};
const file=()=>path.join(appData(),'accounts.enc');
function read():Entry[]{if(!secureAccountStorage()||!fs.existsSync(file()))return [];if(fs.lstatSync(file()).isSymbolicLink()||fs.statSync(file()).size>16*1024*1024)throw Error('Kontenspeicher ungültig.');try{const rows=JSON.parse(safeStorage.decryptString(fs.readFileSync(file())));if(!Array.isArray(rows))throw Error();return rows.filter(e=>/^[a-f0-9]{32}$/i.test(e.id)&&/^[A-Za-z0-9_]{3,16}$/.test(e.name)&&typeof e.credentials?.clientId==='string'&&typeof e.credentials?.cache==='string'&&typeof e.credentials?.account?.homeAccountId==='string').slice(0,8);}catch{throw Error('Kontenspeicher konnte nicht entschlüsselt werden.');}}
function write(rows:Entry[]){if(!secureAccountStorage())throw Error('Sichere Systemverschlüsselung ist nicht verfügbar.');const bytes=safeStorage.encryptString(JSON.stringify(rows));if(bytes.length>16*1024*1024)throw Error('Kontenspeicher ist voll.');fs.mkdirSync(appData(),{recursive:true});const temp=file()+'.tmp-'+crypto.randomUUID();try{fs.writeFileSync(temp,bytes,{mode:0o600,flag:'wx'});fs.renameSync(temp,file());}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
export function savedAccounts(clientId:string){return read().filter(e=>e.credentials.clientId===clientId).map(e=>({id:e.id,name:e.name}));}
export function savedCredentials(clientId:string,id:unknown){if(typeof id!=='string'||!/^[a-f0-9]{32}$/i.test(id))throw Error('Konto-ID ungültig.');const row=read().find(e=>e.id===id&&e.credentials.clientId===clientId);if(!row)throw Error('Gespeichertes Konto nicht gefunden.');return row.credentials;}
export function rememberValidatedAccount(profile:{id:string;name:string},credentials:RememberedAccount){if(!secureAccountStorage())return false;if(!/^[a-f0-9]{32}$/i.test(profile.id)||!/^[A-Za-z0-9_]{3,16}$/.test(profile.name))throw Error('Minecraft-Konto ungültig.');const rows=read().filter(e=>e.id!==profile.id);if(rows.length>=8)throw Error('Maximal acht gespeicherte Konten.');write([...rows,{id:profile.id,name:profile.name,credentials}]);return true;}
export function removeSavedAccount(id:unknown){const rows=read();if(!rows.some(e=>e.id===id))throw Error('Konto nicht gefunden.');write(rows.filter(e=>e.id!==id));}
export function forgetAllSavedAccounts(){if(fs.existsSync(file()))fs.unlinkSync(file());}
