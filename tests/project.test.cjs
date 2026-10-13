const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('valid example configuration with no secrets', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
  assert.equal(cfg.server.address.toLowerCase(), 'scarrix.net');
  assert.equal(cfg.microsoft.clientId, '');
  assert.equal(cfg.curseforge.apiKey, '');
  assert.equal(cfg.modes[0].id, 'survival');
  assert.equal(cfg.modes.length, 6);
  assert.equal(cfg.modes[0].port, 24241);
  assert.deepEqual(cfg.modes.filter(m => m.group === 'ModernFFA').map(m => m.port), [25568, 25570, 25569]);
  assert.equal(cfg.github.owner, 'MustafaNoob1');
});
test('all necessary source files exist', () => {
  for (const file of ['src/main/main.ts','src/main/auth.ts','src/main/game.ts','src/renderer/index.tsx','LICENSE','README.md','.github/workflows/release.yml']) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
});

test('electron-updater uses the named CommonJS export (fix for the Electron startup crash)', () => {
  const code = fs.readFileSync(path.join(root, 'src/main/updater.ts'), 'utf8');
  assert.match(code, /import\s*\{\s*autoUpdater\s*\}\s*from\s*['"]electron-updater['"]/);
  assert.doesNotMatch(code, /import\s+electronUpdater\s+from/);
});
test('launcher connects to the public Scarrix proxy instead of inaccessible backend ports', () => {
  const code = fs.readFileSync(path.join(root, 'src/main/game.ts'), 'utf8');
  assert.match(code, /server:\s*\{\s*ip:\s*cfg\.server\.address,\s*port:\s*cfg\.server\.port\s*\}/);
});
