import { dialog, nativeImage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { appData } from './config';
import { setSkin } from './auth';
import {normalizeCape} from './cape-images';

interface SavedImage { id: string; name: string; dataUrl: string; added: string; model?: 'classic'|'slim'; favorite?:boolean }
function libraryDir(kind: 'skins' | 'capes'): string { return path.join(appData(), kind); }
export function checkPng(data: Buffer, cape: boolean): void {
  if (data.length > 2 * 1024 * 1024 || data.length < 24) throw new Error('PNG ist zu groß oder ungültig (maximal 2 MB).');
  if (!data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Nur echte PNG-Dateien sind erlaubt.');
  if (data.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Fehlerhafter PNG-Header.');
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  const valid = cape ? ((width >= 64 && width <= 2048 && width % 64 === 0 && width === height * 2) || (width === 22 && height === 17)) : (width === 64 && (height === 64 || height === 32));
  if (!valid) throw new Error(cape ? 'Cape-Textur muss ein 64×32-Atlas oder ein HD-Vielfaches bis 2048×1024 sein.' : 'Skin muss 64×64 oder 64×32 Pixel haben.');
  const decoded = nativeImage.createFromBuffer(data);
  if (decoded.isEmpty() || decoded.getSize().width !== width || decoded.getSize().height !== height) throw new Error('PNG ist beschädigt oder konnte nicht gelesen werden.');
}
export function getLibrary(kind: 'skins' | 'capes'): SavedImage[] {
  const dir = libraryDir(kind);
  if (!fs.existsSync(dir)) return [];
  const meta=libraryMetadata(kind);
  return fs.readdirSync(dir).filter(n => /^[a-f0-9]{16}\.png$/.test(n)).sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs).slice(0, 40).map(n => {
    const file = path.join(dir, n), stat = fs.statSync(file);
    return { id: n, name: meta[n]?.name??n, model:meta[n]?.model??'classic',favorite:meta[n]?.favorite??false, dataUrl: `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`, added: stat.mtime.toISOString() };
  });
}
export async function upload(kind: 'skins' | 'capes', model: 'classic' | 'slim'):
  Promise<{ library: SavedImage[]; message: string; selectedId?: string }> {
  const chosen = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: kind==='capes'?'Cape-Bild (PNG oder JPG)':'PNG', extensions: kind==='capes'?['png','jpg','jpeg']:['png'] }] });
  if (chosen.canceled || !chosen.filePaths[0]) return { library: getLibrary(kind), message: 'Auswahl abgebrochen.' };
  const file = chosen.filePaths[0];
  if (fs.statSync(file).size > 2 * 1024 * 1024) throw new Error('Bild darf maximal 2 MB haben.');
  const input = fs.readFileSync(file);
  const cape = kind==='capes'?normalizeCape(input):null;
  const bytes = cape?.bytes??input;
  checkPng(bytes, kind === 'capes');
  const dir = libraryDir(kind);
  fs.mkdirSync(dir, { recursive: true });
  const id = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16) + '.png';
  fs.writeFileSync(path.join(dir, id), bytes, { mode: 0o600 });
  if(kind==='capes')editLibraryImage('capes',id,{name:path.parse(file).name.slice(0,50)||'Mein Cape'});
  return { library: getLibrary(kind), selectedId: id, message: kind === 'skins' ? 'Skin importiert. Wähle das Modell und klicke auf Skin anwenden.' : cape!.message+' Als lokale Launcher-Vorschau gespeichert.' };
}
export async function applySavedSkin(id: string, model: 'classic' | 'slim') {
  if (!['classic', 'slim'].includes(model)) throw new Error('Unbekanntes Skin-Modell.');
  if (!/^[a-f0-9]{16}\.png$/.test(id)) throw new Error('Ungültige Skin-ID.');
  const bytes = fs.readFileSync(path.join(libraryDir('skins'), id));
  checkPng(bytes, false);
  return setSkin(id, bytes, model);
}


interface ImageMetadata {name:string;model:'classic'|'slim';favorite:boolean}
function libraryMetadata(kind:'skins'|'capes'):Record<string,ImageMetadata>{try{const file=path.join(libraryDir(kind),'library.json');if(fs.statSync(file).size>64000)return {};const value=JSON.parse(fs.readFileSync(file,'utf8'));return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
function saveMetadata(kind:'skins'|'capes',meta:Record<string,ImageMetadata>){fs.mkdirSync(libraryDir(kind),{recursive:true});const file=path.join(libraryDir(kind),'library.json');fs.writeFileSync(file+'.tmp',JSON.stringify(meta));fs.renameSync(file+'.tmp',file);}
function imageFile(kind:'skins'|'capes',id:unknown){if(typeof id!=='string'||!/^([a-f0-9]{16})\.png$/.test(id))throw new Error('Ungültige Bild-ID.');const file=path.join(libraryDir(kind),id);if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink())throw new Error('Bild nicht gefunden.');return file;}
export function editLibraryImage(kind:'skins'|'capes',id:unknown,input:{name?:unknown;model?:unknown;favorite?:unknown}){imageFile(kind,id);const key=id as string;const meta=libraryMetadata(kind),existing=meta[key]??{name:key,model:'classic',favorite:false};if(input.name!==undefined){if(typeof input.name!=='string'||!input.name.trim()||input.name.length>50||/[\x00-\x1f]/.test(input.name))throw new Error('Name muss 1 bis 50 Zeichen haben.');existing.name=input.name.trim();}if(input.model!==undefined){if(!['classic','slim'].includes(String(input.model)))throw new Error('Ungültiges Skin-Modell.');existing.model=input.model as 'classic'|'slim';}if(input.favorite!==undefined)existing.favorite=input.favorite===true;meta[key]=existing;saveMetadata(kind,meta);return getLibrary(kind);}
export function removeLibraryImage(kind:'skins'|'capes',id:unknown){const file=imageFile(kind,id);fs.unlinkSync(file);const meta=libraryMetadata(kind);delete meta[id as string];saveMetadata(kind,meta);if(kind==='capes'&&capePreview().selectedId===id)setCapePreview(null);return getLibrary(kind);}
interface Draft {id:string;dataUrl:string;name:string;model:'classic'|'slim'}
const drafts=new Map<string,{bytes:Buffer;name:string;model:'classic'|'slim'}>();
async function boundedFetch(url:string,limit:number):Promise<Buffer>{const parsed=new URL(url);if(parsed.protocol!=='https:'||!['textures.minecraft.net','api.mojang.com','sessionserver.mojang.com'].includes(parsed.hostname)||parsed.username||parsed.password||parsed.port)throw new Error('Nur offizielle Minecraft-Textur-URLs werden unterstützt.');const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!response.ok||!response.body)throw new Error('Skin nicht erreichbar (HTTP '+response.status+').');let size=0;const parts:Buffer[]=[];for await(const chunk of response.body as any){const b=Buffer.from(chunk);size+=b.length;if(size>limit)throw new Error('Skin-Antwort zu groß.');parts.push(b);}return Buffer.concat(parts);}
export async function prepareSkin(input?:unknown):Promise<Draft|null>{let bytes:Buffer,name='Mein Skin',model:'classic'|'slim'='classic';if(input===undefined||input===''){const choice=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Minecraft-Skin',extensions:['png']}]});if(choice.canceled||!choice.filePaths[0])return null;if(fs.statSync(choice.filePaths[0]).size>2*1024*1024)throw new Error('Skin darf maximal 2 MB haben.');bytes=fs.readFileSync(choice.filePaths[0]);name=path.basename(choice.filePaths[0],'.png').slice(0,50);}else{if(typeof input!=='string'||input.length>512)throw new Error('Ungültige Skin-Quelle.');const source=input.trim();if(source.startsWith('https://')){const url=new URL(source);if(url.hostname!=='textures.minecraft.net'||!/^\/texture\/[a-f0-9]+$/i.test(url.pathname))throw new Error('Bitte eine textures.minecraft.net-URL, einen Namen oder eine UUID verwenden.');bytes=await boundedFetch(source,2*1024*1024);}else{let uuid=source.replace(/-/g,'');if(!/^[a-f0-9]{32}$/i.test(uuid)){if(!/^\w{3,16}$/.test(source))throw new Error('Bitte einen Spielernamen, eine UUID oder eine Minecraft-Textur-URL eingeben.');const profile=JSON.parse((await boundedFetch('https://api.mojang.com/users/profiles/minecraft/'+encodeURIComponent(source),32000)).toString('utf8'));uuid=profile.id;name=profile.name??source;}if(!/^[a-f0-9]{32}$/i.test(uuid))throw new Error('Spieler nicht gefunden.');const profile=JSON.parse((await boundedFetch('https://sessionserver.mojang.com/session/minecraft/profile/'+uuid,64000)).toString('utf8'));const property=profile.properties?.find((v:any)=>v.name==='textures');if(!property?.value||property.value.length>32000)throw new Error('Spieler hat keinen Skin.');const skin=JSON.parse(Buffer.from(property.value,'base64').toString('utf8')).textures?.SKIN;if(!skin?.url)throw new Error('Spieler hat keinen Skin.');const url=new URL(skin.url);if(url.hostname!=='textures.minecraft.net')throw new Error('Unbekannter Texturserver.');url.protocol='https:';bytes=await boundedFetch(url.href,2*1024*1024);name=profile.name??name;model=skin.metadata?.model==='slim'?'slim':'classic';}}
 checkPng(bytes,false);while(drafts.size>=8)drafts.delete(drafts.keys().next().value!);const id=crypto.randomUUID();drafts.set(id,{bytes,name,model});return {id,name,model,dataUrl:'data:image/png;base64,'+bytes.toString('base64')};}
export function saveSkinDraft(id:unknown,name:unknown,model:unknown){if(typeof id!=='string'||!drafts.has(id))throw new Error('Vorschau abgelaufen. Bitte Skin neu auswählen.');if(typeof name!=='string'||!name.trim()||name.length>50||/[\x00-\x1f]/.test(name)||!['classic','slim'].includes(String(model)))throw new Error('Skin-Name oder Modell ungültig.');const draft=drafts.get(id)!;const png=crypto.createHash('sha256').update(draft.bytes).digest('hex').slice(0,16)+'.png';fs.mkdirSync(libraryDir('skins'),{recursive:true});fs.writeFileSync(path.join(libraryDir('skins'),png),draft.bytes,{mode:0o600});drafts.delete(id);return {library:editLibraryImage('skins',png,{name,model}),selectedId:png};}
export function capePreview():{selectedId:string|null;dataUrl?:string}{try{const file=path.join(libraryDir('capes'),'selection.json');const saved=JSON.parse(fs.readFileSync(file,'utf8'));const bytes=fs.readFileSync(imageFile('capes',saved.selectedId));checkPng(bytes,true);return {selectedId:saved.selectedId,dataUrl:'data:image/png;base64,'+bytes.toString('base64')};}catch{return {selectedId:null};}}
export function setCapePreview(id:unknown){if(id!==null)imageFile('capes',id);fs.mkdirSync(libraryDir('capes'),{recursive:true});fs.writeFileSync(path.join(libraryDir('capes'),'selection.json'),JSON.stringify({selectedId:id}));return capePreview();}
