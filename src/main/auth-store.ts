import { safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { appData } from './config';
import type { AccountInfo } from '@azure/msal-node';
export interface RememberedAccount {clientId:string;account:AccountInfo;cache:string}
const file=()=>path.join(appData(),'account.enc');
export function secureAccountStorage(){return safeStorage.isEncryptionAvailable()&&(process.platform!=='linux'||!['basic_text','unknown'].includes(safeStorage.getSelectedStorageBackend()));}
export function readRememberedAccount(clientId:string):RememberedAccount|null {try{if(!secureAccountStorage()||!fs.existsSync(file())||fs.statSync(file()).size>4*1024*1024)return null;const value=JSON.parse(safeStorage.decryptString(fs.readFileSync(file())));if(value.clientId!==clientId||typeof value.cache!=='string'||!value.account||typeof value.account.homeAccountId!=='string')return null;return value;}catch{return null;}}
export function saveRememberedAccount(value:RememberedAccount){if(!secureAccountStorage())return false;const encrypted=safeStorage.encryptString(JSON.stringify(value));if(encrypted.length>4*1024*1024)return false;fs.mkdirSync(appData(),{recursive:true});const temp=file()+'.tmp';try{fs.writeFileSync(temp,encrypted,{mode:0o600});fs.renameSync(temp,file());}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}return true;}
export function forgetRememberedAccount(){if(fs.existsSync(file()))fs.unlinkSync(file());}
