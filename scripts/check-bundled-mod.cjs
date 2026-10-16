const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const dir = path.resolve(__dirname, '../assets/mods');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
if (m.schema !== 1 || m.id !== 'scarrix_hud' || m.minecraft !== '26.2' || !/^scarrix-hud-[\w.+-]+\.jar$/.test(m.filename)) throw Error('Scarrix HUD bundle is missing or invalid. See scarrix-mod/README.md.');
if (crypto.createHash('sha512').update(fs.readFileSync(path.join(dir, m.filename))).digest('hex') !== m.sha512) throw Error('Scarrix HUD checksum mismatch');
console.log('Scarrix HUD bundle verified');
