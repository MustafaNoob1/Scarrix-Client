const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('valid example configuration with no secrets', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
  assert.equal(cfg.server.address.toLowerCase(), 'scarrix.net');
  // OAuth public client IDs are identifiers, not passwords or client secrets.
  assert.match(cfg.microsoft.clientId, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
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

test('preview workflow creates downloadable installers for three platforms', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8');
  for (const os of ['windows-latest', 'macos-latest', 'ubuntu-latest']) assert.ok(workflow.includes(os));
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /gh release create/);
  assert.match(workflow, /--prerelease/);
});
test('Minecraft files can be prepared without an approved Microsoft account', () => {
  const game = fs.readFileSync(path.join(root, 'src/main/game.ts'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main/main.ts'), 'utf8');
  assert.match(game, /export async function prepareGame/);
  assert.match(main, /ipcMain.handle\('game:prepare'/);
});

test('backend status does not claim private backends are offline', () => {
  const status = fs.readFileSync(path.join(root, 'src/main/status.ts'), 'utf8');
  assert.match(status, /export async function modeStatuses/);
  assert.match(status, /data\.online !== true/);
  assert.match(status, /online: null/);
});

test('native Electron File/Edit/View menu removed', () => {
  const main = fs.readFileSync(path.join(root, 'src/main/main.ts'), 'utf8');
  assert.match(main, /Menu\.setApplicationMenu\(null\)/);
  assert.match(main, /setMenuBarVisibility\(false\)/);
});
test('Microsoft client ID stays out of renderer configuration and settings', () => {
  const ui = fs.readFileSync(path.join(root, 'src/renderer/index.tsx'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main/main.ts'), 'utf8');
  assert.doesNotMatch(ui, /Microsoft Application \(Client\) ID/);
  assert.match(main, /microsoft: \{ clientId: '' \}/);
});
test('instances and themes are configured through main process', () => {
  const cfg = fs.readFileSync(path.join(root, 'src/main/config.ts'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'src/renderer/index.tsx'), 'utf8');
  assert.match(cfg, /activeInstanceId/);
  assert.match(cfg, /instances: value\.instances/);
  assert.match(ui, /Neue Instanz erstellen/);
  assert.match(ui, /theme: e\.target\.value/);
});
