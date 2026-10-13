import fs from 'node:fs';
import path from 'node:path';
import { app, shell, dialog } from 'electron';
import { appData, instancePath } from './config';
import { redact } from './log-redaction';
export function recordError(error:unknown) {
  fs.mkdirSync(appData(),{recursive:true});
  const file=path.join(appData(),'launcher.log');
  if(fs.existsSync(file)&&fs.statSync(file).size>1024*1024)fs.renameSync(file,file+'.previous');
  fs.appendFileSync(file,new Date().toISOString()+' '+redact(error instanceof Error?error.stack||error.message:String(error))+'\n');
}
export function friendlyError(error:unknown) {
  const text=error instanceof Error?error.message:String(error);
  if(/ENOTFOUND|ECONNRESET|fetch failed|network/i.test(text))return 'Verbindung fehlgeschlagen. Prüfe Internet und Firewall und versuche es erneut.';
  if(/ENOSPC/i.test(text))return 'Nicht genug Speicherplatz. Gib Platz auf deinem Laufwerk frei.';
  if(/EACCES|EPERM/i.test(text))return 'Dateizugriff verweigert. Schließe Minecraft und prüfe die Schreibrechte.';
  if(/403|Invalid app registration/i.test(text))return 'Microsoft/Minecraft hat den Zugriff verweigert. Die App-Freigabe steht möglicherweise noch aus.';
  if(/401/i.test(text))return 'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.';
  return redact(text).slice(0,700);
}
export function readLogs() {
  const game=path.join(instancePath(),'logs','latest.log');
  const launcher=path.join(appData(),'launcher.log');
  const read=(file:string)=>{if(!fs.existsSync(file))return 'Noch keine Logs vorhanden.';const size=fs.statSync(file).size;const buf=Buffer.alloc(Math.min(size,200000));const fd=fs.openSync(file,'r');try{fs.readSync(fd,buf,0,buf.length,Math.max(0,size-buf.length));}finally{fs.closeSync(fd);}return redact(buf.toString('utf8'));};
  return {launcher:read(launcher),minecraft:read(game)};
}
export async function openLogs() {const dir=path.join(instancePath(),'logs');fs.mkdirSync(dir,{recursive:true});const error=await shell.openPath(dir);if(error)throw new Error(error);}
export async function exportLogs() {
  const chosen=await dialog.showSaveDialog({defaultPath:'scarrix-diagnose.txt',filters:[{name:'Text',extensions:['txt']}]});
  if(chosen.canceled||!chosen.filePath)return 'Export abgebrochen.';
  const logs=readLogs();fs.writeFileSync(chosen.filePath,'Scarrix '+app.getVersion()+'\n\nLauncher\n'+logs.launcher+'\n\nMinecraft\n'+logs.minecraft,{mode:0o600});
  return 'Diagnose lokal gespeichert. Prüfe den Inhalt vor dem Weitergeben.';
}
