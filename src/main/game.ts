import { memoryInfo } from './memory';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import { ensureJava } from './java';
import { runInstallerTask, stepStatus } from './downloads';
import { exclusive } from './operations';
import { trackGame } from './game-sessions';
import { Version, launch } from '@xmcl/core';
import { getVersionList, installTask, installDependenciesTask, getLoaderArtifactListFor, installFabric, getForgeVersionList, installForge } from '@xmcl/installer';
import { getConfig, rootPath, instancePath } from './config';
import { getSessionToken, getPublicProfile, restoreSession } from './auth';
const execFileAsync = promisify(execFile);

export async function javaVersion(): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(getConfig().minecraft.javaPath || 'java', ['-version'], { timeout: 8000 });
    return (stderr || stdout).split(/\r?\n/)[0];
  } catch { throw new Error('Java wurde nicht gefunden. Installiere Java (für Minecraft 1.21.x normalerweise Java 21) und trage den Pfad in Einstellungen ein.'); }
}
// Download and check Minecraft files without requiring an approved Microsoft application.
async function doPrepare(notify: (message: string) => void) {
  const cfg = getConfig();
    const javaPath = await ensureJava(cfg.minecraft.version);
    const mcRoot = rootPath();
    const gameRoot = instancePath();
    fs.mkdirSync(mcRoot, { recursive: true });
    fs.mkdirSync(gameRoot, { recursive: true });
    const minecraft = cfg.minecraft;
    const versions = (await getVersionList()).versions;
    const vanilla = versions.find(v => v.id === minecraft.version && v.type === 'release');
    if (!vanilla) throw new Error('Minecraft-Version nicht im offiziellen Manifest gefunden.');
    notify(`Prüfe Minecraft ${minecraft.version} …`);
    await runInstallerTask(installTask(vanilla, mcRoot), 'Minecraft-Dateien herunterladen');
    let launchVersion = minecraft.version;
    if (minecraft.loader === 'fabric') {
      stepStatus('Fabric installieren');
      notify('Installiere Fabric …');
      const loaders = await getLoaderArtifactListFor(minecraft.version);
      const selected = minecraft.loaderVersion ? loaders.find(l=>l.loader.version===minecraft.loaderVersion) : loaders[0];
      if (!selected) throw new Error('Keine Fabric-Version verfügbar.');
      launchVersion = await installFabric(selected, mcRoot);
    } else if (minecraft.loader === 'forge') {
      stepStatus('Forge installieren');
      notify('Installiere Forge …');
      const list = await getForgeVersionList({ minecraft: minecraft.version });
      const selected = minecraft.loaderVersion ? list.versions?.find(l=>l.version===minecraft.loaderVersion) : list.versions?.[0];
      if (!selected) throw new Error('Kein Forge-Loader für diese Version gefunden.');
      launchVersion = await installForge(selected, mcRoot, { java: javaPath });
    } else if (minecraft.loader === 'quilt') {
      throw new Error('Quilt-Installation ist noch nicht implementiert. Wähle vorerst Vanilla, Fabric oder Forge.');
    }
    const resolved = await Version.parse(mcRoot, launchVersion);
    await runInstallerTask(installDependenciesTask(resolved), 'Bibliotheken und Spieldaten prüfen');
  return { resolved, gameRoot, mcRoot, javaPath };
}
let preparing: ReturnType<typeof doPrepare> | null = null;
function prepareMinecraft(notify: (message: string) => void) {
  if (!preparing) preparing = doPrepare(notify).finally(() => { preparing = null; });
  return preparing;
}
export async function prepareGame(notify: (message: string) => void): Promise<string> {
  await exclusive('Minecraft vorbereiten', () => prepareMinecraft(notify));
  stepStatus('Minecraft ist vorbereitet', 'done');
  return 'Minecraft-Dateien vorbereitet. Zum echten Spielstart ist weiterhin die Microsoft-/Minecraft-Anmeldung erforderlich.';
}

let launching = false;

export async function startGame(modeId: string, notify: (message: string) => void): Promise<string> {
  return exclusive('Minecraft starten', () => doStartGame(modeId, notify));
}
async function doStartGame(modeId: string, notify: (message: string) => void): Promise<string> {
  if (launching) throw new Error('Minecraft wird bereits vorbereitet.');
  launching = true;
  try {
    const cfg = getConfig();
    const mode = cfg.modes.find(m => m.id === modeId);
    if (!mode) throw new Error('Dieser Spielmodus ist nicht konfiguriert.');
    await restoreSession();
    const profile = getPublicProfile();
    const token = getSessionToken();
    if (!profile) throw new Error('Bitte zuerst mit Microsoft anmelden.');
    const { resolved, gameRoot, mcRoot, javaPath } = await prepareMinecraft(notify);
    const minecraft = cfg.minecraft;
    notify('Minecraft wird gestartet …');
    const child = await launch({
      javaPath,
      gamePath: gameRoot,
      resourcePath: mcRoot,
      version: resolved,
      gameProfile: { id: profile.id, name: profile.name },
      accessToken: token,
      launcherName: 'Scarrix Client', launcherBrand: 'scarrix-client',
      minMemory: 512, maxMemory: Math.min(minecraft.ramGB * 1024, memoryInfo().maxMB),
      server: { ip: cfg.server.address, port: cfg.server.port }
    });
    stepStatus('Minecraft gestartet', 'done');
    const instance=cfg.instances.find(i=>i.id===cfg.activeInstanceId);
    trackGame(child,{name:instance?.name??'Minecraft',version:minecraft.version,loader:minecraft.loader,player:profile.name,ramMB:Math.min(minecraft.ramGB*1024,memoryInfo().maxMB)},gameRoot,[token]);
    child.on('error', err => {notify('Minecraft-Prozessfehler: ' + err.message);});
    child.on('exit', code => {notify(`Minecraft beendet (Code ${code ?? 'unbekannt'}).`);});
    return `Minecraft gestartet für ${profile.name}. Verbinde über ${cfg.server.address}:${cfg.server.port}; wähle ${mode.group ? mode.group + " / " : ""}${mode.name} innerhalb des Netzwerks. Ein automatischer Wechsel zum Unterserver ist ohne Scarrix-Routing-API nicht möglich.`;
  } finally { launching = false; }
}

