import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Config, Profile, ModHit, SavedImage } from './types';
import './style.css';

type Tab = 'home' | 'mods' | 'skins' | 'capes' | 'settings';
const de = {
  home: 'Spielen', mods: 'Mods', skins: 'Skins', capes: 'Capes', settings: 'Einstellungen',
  account: 'Minecraft-Konto', login: 'Mit Microsoft anmelden', logout: 'Abmelden',
  server: 'Serverübersicht', players: 'Spieler online', play: 'Spielen', check: 'Aktualisieren',
  news: 'Ankündigungen', search: 'Mods suchen', install: 'Installieren',
  notice: 'Info', save: 'Einstellungen speichern', skinUpload: 'Skin auswählen und hochladen',
  capeUpload: 'Cape-Vorschau hinzufügen', official: 'Offizielle Capes', library: 'Meine Bibliothek',
  guest: 'Nicht angemeldet', required: 'Für Minecraft Java ist ein gültiges Microsoft-Konto nötig.'
};
const en: typeof de = {
  home: 'Play', mods: 'Mods', skins: 'Skins', capes: 'Capes', settings: 'Settings',
  account: 'Minecraft account', login: 'Sign in with Microsoft', logout: 'Sign out',
  server: 'Server status', players: 'Online players', play: 'Play', check: 'Refresh',
  news: 'Announcements', search: 'Search mods', install: 'Install',
  notice: 'Notice', save: 'Save settings', skinUpload: 'Choose & upload skin',
  capeUpload: 'Add local cape preview', official: 'Official capes', library: 'My library',
  guest: 'Not signed in', required: 'A valid Minecraft Java Microsoft account is required.'
};

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<{online: boolean; players:number | null; maxPlayers: number | null; version:string | null} | null>(null);
  const [backendStatuses, setBackendStatuses] = useState<Array<{id: string; online: boolean | null; players: number | null; maxPlayers: number | null}> | null>(null);
  const [device, setDevice] = useState<{code: string;url:string;message:string} | null>(null);
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [modQuery, setModQuery] = useState('');
  const [source, setSource] = useState<'modrinth' | 'curseforge'>('modrinth');
  const [mods, setMods] = useState<ModHit[]>([]);
  const [skinModel, setSkinModel] = useState<'classic' | 'slim'>('classic');
  const [skins, setSkins] = useState<SavedImage[]>([]);
  const [capes, setCapes] = useState<SavedImage[]>([]);
  const [paths, setPaths] = useState<{minecraft: string; instance: string} | null>(null);
  const [selectedModeId, setSelectedModeId] = useState('survival');
  const [showNewInstance, setShowNewInstance] = useState(false);
  const [draftVersion, setDraftVersion] = useState('1.21.1');
  const [draftLoader, setDraftLoader] = useState<'vanilla' | 'fabric' | 'forge'>('vanilla');
  const [draftRam, setDraftRam] = useState(4);
  const [appVersion, setAppVersion] = useState('0.3.0');
  const t = config?.language === 'en' ? en : de;

  const run = async <T,>(job: () => Promise<T>, done?: (result:T) => void) => {
    setBusy(true); setNotice('');
    try { const result = await job(); done?.(result); }
    catch (e) { setNotice(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const refresh = () => {
    window.scarrix.status().then(setStatus).catch(e => setNotice(String(e)));
    window.scarrix.statusModes().then(setBackendStatuses).catch(() => setBackendStatuses([]));
  };
  useEffect(() => {
    window.scarrix.config.get().then(setConfig).catch(e => setNotice(String(e)));
    window.scarrix.version().then(setAppVersion).catch(() => {});
    window.scarrix.auth.profile().then(setProfile).catch(() => {});
    window.scarrix.paths().then(setPaths).catch(() => {});
    refresh();
    const unDevice = window.scarrix.onDevice(setDevice);
    const unNotice = window.scarrix.onNotice(setNotice);
    const unProgress = window.scarrix.onProgress(p => setProgress(p));
    return () => { unDevice(); unNotice(); unProgress(); };
  }, []);
  useEffect(() => {
    if (tab === 'skins') window.scarrix.skins.library().then(setSkins).catch(e => setNotice(String(e)));
    if (tab === 'capes') window.scarrix.capes.library().then(setCapes).catch(e => setNotice(String(e)));
    if (tab === 'settings') window.scarrix.paths().then(setPaths).catch(() => {});
  }, [tab]);
  const activeInstance = config?.instances.find(i => i.id === config.activeInstanceId) ?? config?.instances[0];
  const selectedMode = config?.modes.find(m => m.id === selectedModeId) ?? config?.modes[0];
  const save = (next: Config, success?: () => void) => run(() => window.scarrix.config.save(next), saved => {
    setConfig(saved);
    success?.();
    window.scarrix.paths().then(setPaths).catch(() => {});
  });
  const chooseInstance = (id: string) => {
    if (!config) return;
    const target = config.instances.find(i => i.id === id);
    if (!target) return;
    save({ ...config, activeInstanceId: target.id, minecraft: { ...config.minecraft, version: target.version, loader: target.loader, ramGB: target.ramGB } });
  };
  const createInstance = () => {
    if (!config) return;
    const version = draftVersion.trim();
    if (!/^\d+\.\d+(?:\.\d+)?(?:[.-][\w.]+)?$/.test(version)) {
      setNotice('Bitte gib eine gültige Minecraft-Version an, z. B. 1.21.1.'); return;
    }
    if (!Number.isInteger(draftRam) || draftRam < 2 || draftRam > 32) {
      setNotice('Bitte wähle 2 bis 32 GB RAM.'); return;
    }
    if (config.instances.length >= 16) { setNotice('Maximal 16 Instanzen möglich.'); return; }
    const id = 'instance-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const instance = { id, name: version + ' · ' + draftLoader.toUpperCase(), version, loader: draftLoader, ramGB: draftRam };
    save({ ...config, instances: [...config.instances, instance], activeInstanceId: id,
      minecraft: { ...config.minecraft, version, loader: draftLoader, ramGB: draftRam } },
      () => { setShowNewInstance(false); setNotice('Instanz erstellt und ausgewählt.'); });
  };
  const deleteInstance = () => {
    if (!config || !activeInstance || config.instances.length < 2) return;
    const instances = config.instances.filter(i => i.id !== activeInstance.id);
    const target = instances[0];
    save({ ...config, instances, activeInstanceId: target.id,
      minecraft: { ...config.minecraft, version: target.version, loader: target.loader, ramGB: target.ramGB } },
      () => setNotice('Instanz aus der Auswahl entfernt. Vorhandene Minecraft-Dateien bleiben erhalten.'));
  };
  const connect = () => run(() => window.scarrix.auth.start(), res => { setProfile(res); setDevice(null); setNotice(`Angemeldet als ${res.name}`); });
  if (!config) return <main className="loading">Scarrix Client wird vorbereitet …</main>;

  return <div className="shell" data-theme={config.launcher.theme}>
    <aside className="sidebar">
      <div className="brand"><div className="logo">S</div><div><b>SCARRIX</b><small>CLIENT · v{appVersion}</small></div></div>
      <div className="divider"></div>
      <nav>{(['home', 'mods', 'skins', 'capes', 'settings'] as Tab[]).map(item =>
        <button key={item} className={tab === item ? 'nav active' : 'nav'} onClick={() => setTab(item)}>
          <span className="symbol">{{home:'⌂',mods:'⬡',skins:'◈',capes:'✧',settings:'⚙'}[item]}</span>{t[item]}
        </button>
      )}</nav>
      <div className="grow"></div>
      <div className="account"><div className="avatar">{profile?.name?.[0]?.toUpperCase() ?? '?'}</div><div><strong>{profile?.name || t.guest}</strong><small>{profile ? 'Minecraft: Java Edition' : 'Microsoft OAuth'}</small></div></div>
      <button className="btn outline account-btn" disabled={busy} onClick={profile ? () => run(() => window.scarrix.auth.logout(), () => setProfile(null)) : connect}>{profile ? t.logout : t.login}</button>
    </aside>
    <main className="main">
      <header><div><p className="overline">SCARRIX NETWORK <span className="overline-separator">/</span> DESKTOP LAUNCHER</p><h1>{t[tab]}</h1></div><span className="header-chip"><span className="live-dot"></span> MINECRAFT JAVA EDITION</span></header>
      {notice && <div className="alert" role="status"><b>{t.notice}:</b> {notice}<button aria-label="Schließen" onClick={() => setNotice('')}>×</button></div>}
      {progress !== null && <div className="progress"><div style={{width: `${progress}%`}}></div><span>{progress}%</span></div>}
      {device && <section className="device panel"><h2>Microsoft-Anmeldung</h2><p>Öffne die Microsoft-Seite im Browser und gib dort den Code ein. Dein Passwort gehört ausschließlich auf die offizielle Microsoft-Seite.</p><div className="device-row"><code>{device.code}</code><button className="btn" onClick={() => window.scarrix.openUrl(device.url).catch(e => setNotice(String(e)))}>Microsoft-Anmeldeseite öffnen ↗</button></div><small>{device.url}</small></section>}


      {tab === 'home' && <>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">SCARRIX.NET / DEIN NETZWERK</p>
            <h2>Eine Welt.<br/><span>Unendliche Möglichkeiten.</span></h2>
            <p>Alles bereit für dein nächstes Abenteuer. Wähle deine Minecraft-Instanz und starte direkt ins Netzwerk.</p>
            <div className="hero-tags"><span>JAVA EDITION</span><span>MULTIPLAYER</span><span>COMMUNITY</span></div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="hero-ring ring-one"></div><div className="hero-ring ring-two"></div><div className="hero-emblem">S</div></div>
        </section>

        <section className="launch-card panel">
          <div className="launch-title"><div><p className="eyebrow">QUICK LAUNCH</p><h2>Bereit zum Spielen?</h2></div><span className="launch-destination">Ziel: {selectedMode?.group ? selectedMode.group + ' / ' : ''}{selectedMode?.name ?? 'Scarrix Lobby'}</span></div>
          <div className="launch-controls">
            <label className="instance-picker"><span>MINECRAFT-INSTANZ</span><select value={activeInstance?.id ?? ''} onChange={e => chooseInstance(e.target.value)} disabled={busy}>{config.instances.map(instance => <option key={instance.id} value={instance.id}>{instance.name}</option>)}</select></label>
            <button className="btn outline create-btn" disabled={busy} onClick={() => { setDraftVersion(activeInstance?.version ?? '1.21.1'); setDraftLoader(activeInstance?.loader ?? 'vanilla'); setDraftRam(activeInstance?.ramGB ?? 4); setShowNewInstance(true); }}>+ Neue Instanz</button>
            <button className="btn primary play-button" disabled={busy || !profile || !selectedMode} onClick={() => run(() => window.scarrix.game(selectedMode!.id), setNotice)}><span className="play-arrow">▶</span> {profile ? 'JETZT SPIELEN' : 'MICROSOFT-LOGIN AUSSTEHEND'}</button>
          </div>
          <div className="launch-detail"><span>⏣ {activeInstance?.version} <span className="bullet">•</span> {activeInstance?.loader.toUpperCase()} <span className="bullet">•</span> {activeInstance?.ramGB} GB RAM</span><div className="launch-actions"><button className="text-btn" disabled={busy || config.instances.length <= 1} onClick={deleteInstance}>Instanz entfernen</button><button className="text-btn accent-text" disabled={busy} onClick={() => run(() => window.scarrix.gamePrepare(), setNotice)}>Dateien vorbereiten ↗</button></div></div>
        </section>

        <div className="section-row"><div><p className="eyebrow">LIVE STATUS</p><h2>Netzwerkübersicht</h2></div><button className="btn ghost" onClick={refresh}>↻ Aktualisieren</button></div>
        <div className="summary">
          <div className="stat panel"><span className={'dot' + (status?.online ? ' online' : '')}></span><div><small>SCARRIX.NET</small><b>{status ? (status.online ? 'Online' : 'Nicht erreichbar') : 'Wird geprüft'}</b></div></div>
          <div className="stat panel"><span className="stat-symbol">♟</span><div><small>SPIELER ONLINE</small><b>{status?.players ?? '—'} <span className="subtle-text">/ {status?.maxPlayers ?? '—'}</span></b></div></div>
          <div className="stat panel"><span className="stat-symbol">▣</span><div><small>SERVER-VERSION</small><b>{status?.version ?? 'Minecraft Java'}</b></div></div>
        </div>
        <div className="section-row"><div><p className="eyebrow">DEIN SPIELMODUS</p><h2>Wohin geht's?</h2></div><small>Modus wählen, dann oben auf Spielen klicken</small></div>
        <div className="mode-grid">{config.modes.map((m, i) => <button type="button" className={'mode-card panel' + (selectedMode?.id === m.id ? ' selected' : '')} key={m.id} onClick={() => setSelectedModeId(m.id)}>
          <div className="mode-card-top"><span className="mode-icon">{['⛏','⚔','◆','✦','▦','◈'][i % 6]}</span><span className="mode-select-indicator">{selectedMode?.id === m.id ? '✓' : '↗'}</span></div>
          {m.group && <small className="mode-group">{m.group}</small>}
          <h3>{m.name}</h3>
          <div className="mode-availability">{(() => { const state = backendStatuses?.find(s => s.id === m.id); return !backendStatuses ? 'Prüfe Erreichbarkeit …' : state?.online ? `Erreichbar · ${state.players ?? '?'} Spieler` : 'Status nicht prüfbar'; })()}</div>
          <p className="mode-endpoint" title="Backend-Adresse nur zur Information – der Spielstart erfolgt über Scarrix.net"><code>{m.address}:{m.port}</code></p>
        </button>)}</div>
        <p className="backend-notice">Die Backend-Ports werden nur zur Information angezeigt. Zum Spielen wird das öffentliche Scarrix-Netzwerk geöffnet; der Untermodus muss derzeit noch in der Lobby ausgewählt werden.</p>
        <div className="section-row"><div><p className="eyebrow">UPDATES AUS DER COMMUNITY</p><h2>Ankündigungen</h2></div></div>
        <div className="news-grid">{config.news.length ? config.news.map((n,i) => <article className="panel news" key={i}><span className="eyebrow">NEWS</span><h3>{n.title}</h3><p>{n.text}</p></article>) : <article className="panel news"><span className="eyebrow">NEWS</span><h3>Willkommen auf Scarrix</h3><p>Neuigkeiten aus der Community erscheinen bald hier.</p></article>}</div>
      </>}

      {tab === 'mods' && <><div className="panel intro"><h2>Mod-Browser</h2><p>Finde kompatible Mods für {config.minecraft.version} / {config.minecraft.loader}. Mods werden nur in der aktuellen Instanz installiert.</p><form className="search" onSubmit={e => {e.preventDefault();run(() => window.scarrix.mods.search(modQuery, source), setMods);}}><input value={modQuery} onChange={e => setModQuery(e.target.value)} placeholder="Sodium, Iris, JEI …"/><select value={source} onChange={e => setSource(e.target.value as typeof source)}><option value="modrinth">Modrinth</option><option value="curseforge">CurseForge</option></select><button className="btn primary" disabled={busy || !modQuery.trim()}>{t.search}</button></form></div>
        <div className="mod-list">{mods.map(m => <div key={m.source+m.id} className="mod panel">{m.icon ? <img src={m.icon} alt=""/> : <div className="mod-placeholder">⬡</div>}<div className="mod-info"><b>{m.name}</b><p>{m.description}</p><small>{Number(m.downloads || 0).toLocaleString()} Downloads · {m.source}</small></div><button className="btn outline" disabled={busy} onClick={() => {setProgress(0); run(() => window.scarrix.mods.install(m.id, m.source), result => setNotice(`${result.filename} installiert. ${result.dependencies.length ? 'Benötigte Abhängigkeiten prüfen: ' + result.dependencies.join(', ') : ''}`));}}>{t.install}</button></div>)}</div>
        <p className="hint">Hinweis: Abhängigkeiten werden erkannt und gemeldet, jedoch nicht automatisch nachinstalliert. CurseForge benötigt einen API-Schlüssel und erlaubt nicht für jede Mod einen Download.</p>
      </>}

      {tab === 'skins' && <><div className="panel intro"><h2>Dein Minecraft-Skin</h2><p>Aktuelles Skin ansehen, eigenes PNG hochladen und alte Skins wiederverwenden.</p>{profile?.skins?.[0]?.url && <div className="current-skin"><img src={profile.skins[0].url} alt="Aktueller Skin"/><span>Aktuelles Skin · {profile.skins[0].variant || 'classic'}</span></div>}
        <div className="form-inline"><label>Arme / Modell <select value={skinModel} onChange={e => setSkinModel(e.target.value as typeof skinModel)}><option value="classic">Classic (Steve)</option><option value="slim">Slim (Alex)</option></select></label><button className="btn primary" disabled={!profile || busy} onClick={() => run(() => window.scarrix.skins.upload(skinModel), result => {setSkins(result.library);setNotice(result.message);window.scarrix.auth.refresh().then(setProfile);})}>{t.skinUpload}</button></div></div><h2>{t.library}</h2><div className="skin-grid">{skins.map(s => <div key={s.id} className="panel skin-item"><img src={s.dataUrl} alt="Gespeicherter Skin"/><button className="btn outline" disabled={!profile || busy} onClick={() => run(() => window.scarrix.skins.apply(s.id, skinModel), setProfile)}>Skin anwenden</button></div>)}</div><p className="hint">Nur PNG mit 64×64 oder 64×32 Pixeln. Zugang zu Minecraft Services erforderlich.</p></>}

      {tab === 'capes' && <><div className="panel intro"><h2>{t.official}</h2><p>Hier werden die Capes angezeigt, die dein offizielles Minecraft-Konto bereits besitzt.</p><div className="cape-list">{profile?.capes?.length ? profile.capes.map(c => <div key={c.id} className="cape panel"><img src={c.url} alt="Cape"/><b>{c.alias || c.id}</b><button className="btn outline" disabled={busy} onClick={() => run(() => window.scarrix.capes.select(c.id), setProfile)}>Ausrüsten</button></div>) : <p>Keine Capes geladen. Bitte anmelden.</p>}</div><button className="btn ghost" disabled={!profile || busy} onClick={() => run(() => window.scarrix.capes.select(null), setProfile)}>Cape ablegen</button></div><div className="panel intro"><h2>Eigene Cape-Vorschauen</h2><p>Ein eigenes Cape kann lokal gespeichert und angezeigt werden. Offizielle Minecraft-Capes lassen sich damit nicht neu erstellen oder auf Mojangs Server hochladen.</p><button className="btn primary" disabled={busy} onClick={() => run(() => window.scarrix.capes.upload(), result => {setCapes(result.library);setNotice(result.message);})}>{t.capeUpload}</button><div className="skin-grid">{capes.map(c => <div key={c.id} className="panel skin-item"><img src={c.dataUrl} alt="Eigene Cape-Vorschau"/></div>)}</div></div></>}


      {tab === 'settings' && <>
        <section className="panel launcher-settings">
          <div className="settings-heading"><span className="settings-icon">⚙</span><div><p className="eyebrow">PERSONALISIERUNG</p><h2>Launcher-Einstellungen</h2><p>Gestalte Scarrix Client nach deinem Geschmack. Minecraft-Version und RAM verwaltest du direkt beim Spielen.</p></div></div>
          <div className="preferences-grid">
            <label className="preference"><span>FARBDESIGN</span><small>Wähle deine Akzentfarbe. Der dunkle Hintergrund bleibt erhalten.</small><select value={config.launcher.theme} disabled={busy} onChange={e => save({ ...config, launcher: { theme: e.target.value as Config['launcher']['theme'] } })}><option value="red">Scarrix Rot · Standard</option><option value="blue">Electric Blue</option><option value="purple">Royal Purple</option><option value="gold">Amber Gold</option></select><div className="theme-dots"><i className="red"></i><i className="blue"></i><i className="purple"></i><i className="gold"></i></div></label>
            <label className="preference"><span>SPRACHE / LANGUAGE</span><small>Sprache der Launcher-Oberfläche.</small><select value={config.language} disabled={busy} onChange={e => save({ ...config, language: e.target.value as 'de' | 'en' })}><option value="de">Deutsch</option><option value="en">English</option></select></label>
          </div>
        </section>
        <section className="panel launcher-settings update-section">
          <div className="update-copy"><span className="update-symbol">↻</span><div><p className="eyebrow">SOFTWARE</p><h2>Launcher-Updates</h2><p>Installierte Version: <b>v{appVersion}</b></p><small>Bei einem privaten GitHub-Repository öffnet der Button die Releases-Seite. Automatische Updates erfordern einen öffentlichen Download-Kanal.</small></div></div>
          <button className="btn primary" disabled={busy} onClick={() => run(() => window.scarrix.update(), setNotice)}>Nach Updates suchen ↗</button>
        </section>
        <section className="panel launcher-settings info-section">
          <div><h2>Über Scarrix Client</h2><p>Community Launcher für Minecraft: Java Edition. Entwickelt für das Scarrix-Netzwerk.</p><p className="hint">Microsoft-Authentifizierung wird im Hintergrund verwaltet; eine Freigabe durch Minecraft Services steht noch aus. Client-IDs sind bei Desktop-Apps technisch auslesbar und keine geheimen Schlüssel.</p></div>
          <button className="btn outline" onClick={() => run(() => window.scarrix.logs(), setNotice)}>Diagnose / Logs</button>
        </section>
      </>}
      {showNewInstance && <div className="modal-backdrop" role="presentation" onClick={() => setShowNewInstance(false)}>
        <div className="instance-modal panel" role="dialog" aria-modal="true" aria-label="Neue Minecraft-Instanz erstellen" onClick={e => e.stopPropagation()}>
          <div className="modal-head"><div><p className="eyebrow">MINECRAFT</p><h2>Neue Instanz erstellen</h2></div><button className="close-modal" onClick={() => setShowNewInstance(false)} aria-label="Schließen">×</button></div>
          <p>Wähle deine Version, den Modloader und den verfügbaren RAM. Mods und Konfigurationen bleiben je Instanz getrennt.</p>
          <div className="modal-fields">
            <label>MINECRAFT-VERSION<input value={draftVersion} onChange={e => setDraftVersion(e.target.value)} placeholder="z. B. 1.21.1"/><small>Die Version wird beim Vorbereiten gegen das offizielle Manifest geprüft.</small></label>
            <label>MODLOADER<select value={draftLoader} onChange={e => setDraftLoader(e.target.value as typeof draftLoader)}><option value="vanilla">Vanilla – Ohne Mods</option><option value="fabric">Fabric</option><option value="forge">Forge</option></select></label>
            <label>ARBEITSSPEICHER (RAM)<div className="ram-selector"><input type="range" min="2" max="32" step="1" value={draftRam} onChange={e => setDraftRam(Number(e.target.value))}/><strong>{draftRam} GB</strong></div></label>
          </div>
          <div className="modal-footer"><button className="btn outline" onClick={() => setShowNewInstance(false)}>Abbrechen</button><button className="btn primary" disabled={busy} onClick={createInstance}>+ Instanz erstellen</button></div>
        </div>
      </div>}
      <footer>SCARRIX CLIENT · v{appVersion} · Nicht offiziell von Mojang Studios oder Microsoft unterstützt · <span>Open Source / MIT</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
