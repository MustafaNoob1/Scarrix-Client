import { dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { appData } from './config';
import { setSkin } from './auth';

interface SavedImage { id: string; name: string; dataUrl: string; added: string }
function libraryDir(kind: 'skins' | 'capes'): string { return path.join(appData(), kind); }
function checkPng(data: Buffer, cape: boolean): void {
  if (data.length > 2 * 1024 * 1024 || data.length < 24) throw new Error('PNG ist zu groß oder ungültig (maximal 2 MB).');
  if (!data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Nur echte PNG-Dateien sind erlaubt.');
  if (data.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Fehlerhafter PNG-Header.');
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  const valid = cape ? ((width === 64 && height === 32) || (width === 22 && height === 17)) : (width === 64 && (height === 64 || height === 32));
  if (!valid) throw new Error(cape ? 'Cape-Vorschau muss 64×32 oder 22×17 Pixel haben.' : 'Skin muss 64×64 oder 64×32 Pixel haben.');
}
export function getLibrary(kind: 'skins' | 'capes'): SavedImage[] {
  const dir = libraryDir(kind);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(n => n.endsWith('.png')).slice(0, 40).map(n => {
    const file = path.join(dir, n), stat = fs.statSync(file);
    return { id: n, name: n, dataUrl: `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`, added: stat.mtime.toISOString() };
  });
}
export async function upload(kind: 'skins' | 'capes', model: 'classic' | 'slim'):
  Promise<{ library: SavedImage[]; message: string }> {
  const chosen = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'PNG', extensions: ['png'] }] });
  if (chosen.canceled || !chosen.filePaths[0]) return { library: getLibrary(kind), message: 'Auswahl abgebrochen.' };
  const file = chosen.filePaths[0];
  if (fs.statSync(file).size > 2 * 1024 * 1024) throw new Error('Bild darf maximal 2 MB haben.');
  const bytes = fs.readFileSync(file);
  checkPng(bytes, kind === 'capes');
  const dir = libraryDir(kind);
  fs.mkdirSync(dir, { recursive: true });
  const id = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16) + '.png';
  if (kind === 'skins') await setSkin(path.basename(file), bytes, model);
  fs.writeFileSync(path.join(dir, id), bytes, { mode: 0o600 });
  return { library: getLibrary(kind), message: kind === 'skins' ? 'Skin wurde im Minecraft-Profil gesetzt und lokal gespeichert.' : 'Eigenes Cape wurde nur lokal als Vorschau gespeichert. Microsoft bietet keinen offiziellen Custom-Cape-Upload.' };
}
export async function applySavedSkin(id: string, model: 'classic' | 'slim') {
  if (!/^[a-f0-9]{16}\.png$/.test(id)) throw new Error('Ungültige Skin-ID.');
  const bytes = fs.readFileSync(path.join(libraryDir('skins'), id));
  checkPng(bytes, false);
  return setSkin(id, bytes, model);
}
