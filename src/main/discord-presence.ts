import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {app} from 'electron';
import {getConfig} from './config';
export type PresencePage='play'|'profiles'|'mods'|'skins'|'capes'|'settings';
const labels:Record<PresencePage,string>={play:'Idling',profiles:'Managing Profiles',mods:'Browsing Mods',skins:'Browsing Skins',capes:'Browsing Capes',settings:'Configuring Settings'};
export function presenceDelay(history:number[],now:number){const recent=history.filter(t=>t>now-20000);return recent.length>=5?Math.max(0,recent[0]+20001-now):0;}
export function presenceActivity(page:PresencePage,started:number,image:string){return {type:0,details:labels[page],timestamps:{start:started},assets:{large_image:image,large_text:'Scarrix Client'}};}
export function rpcFrame(op:number,data:unknown){const body=Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data),'utf8'),header=Buffer.alloc(8);header.writeUInt32LE(op,0);header.writeUInt32LE(body.length,4);return Buffer.concat([header,body]);}
export function discordPipePaths(platform=process.platform,env=process.env){const bases=platform==='win32'?['\\\\?\\pipe']:Array.from(new Set([env.XDG_RUNTIME_DIR,env.TMPDIR,env.TMP,env.TEMP,'/tmp'].filter((p):p is string=>!!p&&path.posix.isAbsolute(p))));return bases.flatMap(base=>Array.from({length:10},(_,i)=>platform==='win32'?base+'\\discord-ipc-'+i:path.posix.join(base,'discord-ipc-'+i)));}
export interface PresenceState {status:'disabled'|'unconfigured'|'waiting'|'connecting'|'connected'|'error';message:string;page:PresencePage}
export class DiscordPresence {
 private socket:net.Socket|null=null;private buffer:Buffer=Buffer.alloc(0);private ready=false;private stopped=true;private retry:ReturnType<typeof setTimeout>|undefined;private update:ReturnType<typeof setTimeout>|undefined;private timeout:ReturnType<typeof setTimeout>|undefined;
 private page:PresencePage='play';private started=Math.floor(Date.now()/1000);private history:number[]=[];private sent='';private pending:string|null=null;private attempts=0;
 private state:PresenceState={status:'waiting',message:'Warte auf die Discord-Desktop-App.',page:'play'};
 constructor(private readonly applicationId:string,private readonly image='scarrix_logo',private readonly paths=discordPipePaths(),private readonly now=()=>Date.now()){}
 snapshot(){return {...this.state,page:this.page};}
 private status(status:PresenceState['status'],message:string){this.state={status,message,page:this.page};}
 start(){if(!this.stopped)return;this.stopped=false;this.connect(0);}
 setPage(value:unknown){if(typeof value!=='string'||!Object.hasOwn(labels,value))throw Error('Unbekannte Discord-Ansicht.');this.page=value as PresencePage;this.schedule();return this.snapshot();}
 private clearTimers(){clearTimeout(this.retry);clearTimeout(this.update);clearTimeout(this.timeout);this.retry=this.update=this.timeout=undefined;}
 stop(){this.stopped=true;this.clearTimers();const socket=this.socket;this.socket=null;this.ready=false;this.pending=null;this.sent='';if(socket){if(socket.writable&& !socket.destroyed&&this.state.status==='connected')socket.end(rpcFrame(1,{cmd:'SET_ACTIVITY',args:{pid:process.pid,activity:null},nonce:crypto.randomUUID()}));else socket.destroy();}this.status('disabled','Discord-Anzeige ausgeschaltet.');}
 private connect(index:number){if(this.stopped)return;if(index>=this.paths.length){this.status('waiting','Warte auf die Discord-Desktop-App.');this.reconnect();return;}this.status('connecting','Discord-Verbindung wird aufgebaut.');let connected=false;const socket=net.createConnection(this.paths[index]);this.socket=socket;this.buffer=Buffer.alloc(0);this.ready=false;this.pending=null;
  const fail=()=>{if(this.socket!==socket)return;this.socket=null;socket.destroy();clearTimeout(this.timeout);clearTimeout(this.update);this.pending=null;this.ready=false;this.sent='';if(this.stopped)return;if(!connected)this.connect(index+1);else{if(this.state.status!=='error')this.status('waiting','Discord nicht verbunden. Neuer Versuch folgt.');this.reconnect();}};
  socket.on('error',fail);socket.on('close',fail);
  socket.once('connect',()=>{if(this.stopped||this.socket!==socket)return socket.destroy();connected=true;socket.write(rpcFrame(0,{v:1,client_id:this.applicationId}));});
  this.timeout=setTimeout(fail,5000);this.timeout.unref();
  socket.on('data',(chunk:Buffer)=>{if(this.socket!==socket)return;if(this.buffer.length+chunk.length>1024*1024+8){fail();return;}this.buffer=Buffer.concat([this.buffer,chunk]);try{while(this.buffer.length>=8){const op=this.buffer.readUInt32LE(0),length=this.buffer.readUInt32LE(4);if(length>1024*1024)throw Error();if(this.buffer.length<length+8)return;const bytes=this.buffer.subarray(8,length+8);this.buffer=this.buffer.subarray(length+8);if(op===3){socket.write(rpcFrame(4,bytes));continue;}if(op===2){fail();return;}if(op!==1)continue;const event=JSON.parse(bytes.toString('utf8'));if(event.evt==='ERROR'){this.status('error','Discord hat die Anzeige abgelehnt. Application ID und Bild im Developer Portal prüfen.');socket.destroy();return;}if(event.cmd==='DISPATCH'&&event.evt==='READY'){clearTimeout(this.timeout);this.ready=true;this.attempts=0;this.schedule();}else if(event.cmd==='SET_ACTIVITY'&&event.nonce===this.pending){clearTimeout(this.timeout);this.pending=null;this.status('connected','In Discord sichtbar.');this.schedule();}}}catch{fail();}});
 }
 private reconnect(){if(this.stopped)return;clearTimeout(this.retry);this.retry=setTimeout(()=>this.connect(0),Math.min(60000,10000*2**Math.min(this.attempts++,3)));this.retry.unref();}
 private schedule(){if(this.stopped||!this.ready||this.pending||!this.socket)return;const activity=presenceActivity(this.page,this.started,this.image),signature=JSON.stringify(activity);if(signature===this.sent)return;clearTimeout(this.update);const now=this.now();this.history=this.history.filter(t=>t>now-20000);const delay=presenceDelay(this.history,now);if(delay){this.update=setTimeout(()=>this.schedule(),delay);this.update.unref();return;}const socket=this.socket;this.sent=signature;this.history.push(now);this.pending=crypto.randomUUID();socket.write(rpcFrame(1,{cmd:'SET_ACTIVITY',args:{pid:process.pid,activity},nonce:this.pending}));this.timeout=setTimeout(()=>socket.destroy(),10000);this.timeout.unref();}
}
let client:DiscordPresence|undefined;let page:PresencePage='play';let fallback:PresenceState={status:'unconfigured',message:'Discord-Anwendung wird noch eingerichtet.',page};
function policy(){try{const file=app.isPackaged?path.join(process.resourcesPath,'discord-presence.json'):path.resolve('discord-presence.json');if(fs.statSync(file).size>4096)return null;const data=JSON.parse(fs.readFileSync(file,'utf8'));if(!/^[0-9]{17,20}$/.test(data.applicationId)||typeof data.largeImage!=='string'||!/^[a-z0-9_-]{1,64}$/.test(data.largeImage))return null;return data as {applicationId:string;largeImage:string};}catch{return null;}}
export function startDiscordPresence(){if(getConfig().launcher.discordPresence===false){stopDiscordPresence();return;}const config=policy();if(!config){fallback={status:'unconfigured',message:'Discord-Anwendung wird noch eingerichtet.',page};return;}if(!client){client=new DiscordPresence(config.applicationId,config.largeImage);client.setPage(page);}client.start();}
export function stopDiscordPresence(){client?.stop();client=undefined;fallback={status:'disabled',message:'Discord-Anzeige ausgeschaltet.',page};}
export function discordPresenceState(){return client?.snapshot()??{...fallback,page};}
export function updateDiscordPresence(value:unknown){if(typeof value!=='string'||!Object.hasOwn(labels,value))throw Error('Unbekannte Discord-Ansicht.');page=value as PresencePage;client?.setPage(page);return discordPresenceState();}
