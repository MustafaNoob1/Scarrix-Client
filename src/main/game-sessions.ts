import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { shell, dialog } from 'electron';
import { setGameRunning } from './operations';
import { diagnoseCrash, recentCrashText, type CrashDiagnosis } from './crash-diagnosis';
import { redact } from './log-redaction';
export interface GameSession {id:string;name:string;version:string;loader:string;player:string;startedAt:number;endedAt:number|null;pid:number|null;ramMB:number;state:'running'|'stopping'|'exited';exitCode:number|null;diagnosis?:CrashDiagnosis|null}
export interface GameLogLine {sequence:number;time:number;level:'ERROR'|'WARN'|'INFO'|'DEBUG'|'TRACE';text:string}
interface Tracked {info:GameSession;child:ChildProcess;folder:string;lines:GameLogLine[];sequence:number;secrets:string[];stoppedByUser:boolean}
const sessions=new Map<string,Tracked>();
const MAX_LINES=1000;
function syncRunning(){setGameRunning([...sessions.values()].some(s=>s.info.state!=='exited'));}
function find(id:unknown){if(typeof id!=='string'||!sessions.has(id))throw new Error('Diese Minecraft-Instanz ist nicht vorhanden.');return sessions.get(id)!;}
function append(s:Tracked,text:string,fallback:GameLogLine['level']='INFO'){
 for(const secret of s.secrets)if(secret)text=text.split(secret).join('[Token entfernt]');
 text=redact(text).replace(/\x1b\[[0-9;]*m/g,'').replace(/\r$/,'');
 if(!text)return;
 const level=text.match(/\b(ERROR|FATAL|WARN|INFO|DEBUG|TRACE)\b/i)?.[1].toUpperCase();
 s.lines.push({sequence:++s.sequence,time:Date.now(),level:(level==='FATAL'?'ERROR':level||fallback) as GameLogLine['level'],text:text.slice(0,2000)});
 if(s.lines.length>MAX_LINES)s.lines.splice(0,s.lines.length-MAX_LINES);
}
export function trackGame(child:ChildProcess,details:Omit<GameSession,'id'|'startedAt'|'endedAt'|'pid'|'state'|'exitCode'>,folder:string,secrets:string[]=[]) {
 const s:Tracked={info:{...details,id:randomUUID(),startedAt:Date.now(),endedAt:null,pid:child.pid??null,state:'running',exitCode:null},child,folder,lines:[],sequence:0,secrets,stoppedByUser:false};
 sessions.set(s.info.id,s);syncRunning();
 const ended=[...sessions.values()].filter(v=>v.info.state==='exited');while(ended.length>4){sessions.delete(ended.shift()!.info.id);}
 const attach=(stream:NodeJS.ReadableStream|null,fallback:GameLogLine['level'])=>{if(!stream)return;const decoder=new StringDecoder('utf8');let pending='';stream.on('data',(chunk:Buffer|string)=>{pending+=typeof chunk==='string'?chunk:decoder.write(chunk);let index;while((index=pending.indexOf('\n'))>=0){append(s,pending.slice(0,index),fallback);pending=pending.slice(index+1);}if(pending.length>32768){append(s,pending,fallback);pending='';}});stream.on('end',()=>{pending+=decoder.end();append(s,pending,fallback);pending='';});};
 attach(child.stdout,'INFO');attach(child.stderr,'WARN');
 append(s,'Minecraft gestartet · '+s.info.version+' · '+s.info.player);
 let finished=false;const finish=(code:number|null)=>{if(finished)return;finished=true;s.info.state='exited';s.info.endedAt=Date.now();s.info.exitCode=code;append(s,'Minecraft beendet · Exit-Code '+(code??'unbekannt'));syncRunning();};
 child.once('error',()=>{append(s,'Minecraft-Prozess konnte nicht ausgeführt werden.','ERROR');if(!child.pid)finish(null);});
 child.once('exit',finish);child.once('close',(code)=>{finish(code);s.info.diagnosis=diagnoseCrash(s.lines.map(l=>l.text).join('\n')+'\n'+recentCrashText(s.folder,s.info.startedAt),code,s.stoppedByUser);});if(child.exitCode!==null&&child.exitCode!==undefined)finish(child.exitCode);
 return s.info.id;
}
export function listGameSessions():GameSession[]{return [...sessions.values()].map(s=>({...s.info})).reverse();}
export function gameSessionLogs(id:unknown,since:unknown=0){const s=find(id);const cursor=typeof since==='number'&&Number.isSafeInteger(since)&&since>=0?since:0;return {lines:s.lines.filter(l=>l.sequence>cursor).map(l=>({...l})),lastSequence:s.sequence,truncated:s.lines.length>0&&cursor<s.lines[0].sequence-1};}
export async function stopGameSession(id:unknown){const s=find(id);if(s.info.state==='exited')throw new Error('Minecraft wurde bereits beendet.');if(s.info.state==='stopping')return;s.info.state='stopping';s.stoppedByUser=true;
 try{if(process.platform==='win32'){if(!s.info.pid||!Number.isSafeInteger(s.info.pid))throw new Error('Prozess nicht verfügbar.');await new Promise<void>((resolve,reject)=>execFile('taskkill.exe',['/PID',String(s.info.pid),'/T','/F'],{timeout:15000,windowsHide:true},error=>error?reject(error):resolve()));}else if(!s.child.kill('SIGTERM'))throw new Error('Prozess konnte nicht beendet werden.');append(s,'Beenden angefordert.');}
 catch{s.stoppedByUser=false;if((s.info.state as GameSession['state'])!=='exited')s.info.state='running';throw new Error('Minecraft konnte nicht beendet werden. Bitte schließe das Spielfenster.');}
}
export async function openGameSessionFolder(id:unknown){const error=await shell.openPath(find(id).folder);if(error)throw new Error('Instanzordner konnte nicht geöffnet werden.');}
export async function exportGameSessionLogs(id:unknown){const s=find(id);const result=await dialog.showSaveDialog({defaultPath:'scarrix-minecraft-logs.txt',filters:[{name:'Minecraft-Logs',extensions:['txt']}]});if(result.canceled||!result.filePath)return 'Speichern abgebrochen.';fs.writeFileSync(result.filePath,s.lines.map(l=>new Date(l.time).toISOString()+' ['+l.level+'] '+l.text).join('\n'),{mode:0o600});return 'Logs lokal gespeichert.';}
