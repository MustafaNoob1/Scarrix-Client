import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Config, Profile, ModHit, SavedImage } from './types';
import './style.css';

type Tab = 'home' | 'mods' | 'skins' | 'capes' | 'settings';
const de = {
  home: 'Startseite', mods: 'Mods', skins: 'Skins', capes: 'Capes', settings: 'Einstellungen',
  account: 'Minecraft-Konto', login: 'Mit Microsoft anmelden', logout: 'Abmelden',
  server: 'Serverübersicht', players: 'Spieler online', play: 'Spielen', check: 'Aktualisieren',
  news: 'Ankündigungen', search: 'Mods suchen', install: 'Installieren',
  notice: 'Info', save: 'Einstellungen speichern', skinUpload: 'Skin auswählen und hochladen',
  capeUpload: 'Cape-Vorschau hinzufügen', official: 'Offizielle Capes', library: 'Meine Bibliothek',
  guest: 'Nicht angemeldet', required: 'Für Minecraft Java ist ein gültiges Microsoft-Konto nötig.'
};
const en: typeof de = {
  home: 'Home', mods: 'Mods', skins: 'Skins', capes: 'Capes', settings: 'Settings',
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
  const t = config?.language === 'en' ? en : de;

  const run = async <T,>(job: () => Promise<T>, done?: (result:T) => void) => {
    setBusy(true); setNotice('');
    try { const result = await job(); done?.(result); }
    catch (e) { setNotice(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const refresh = () => window.scarrix.status().then(setStatus).catch(e => setNotice(String(e)));
  useEffect(() => {
    window.scarrix.config.get().then(setConfig).catch(e => setNotice(String(e)));
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
  const patch = (section: keyof Config, name: string, value: string | number) => {
    if (!config) return;
    const group = config[section];
    if (!group || Array.isArray(group) || typeof group !== 'object') return;
    setConfig({ ...config, [section]: { ...group, [name]: value } });
  };
  const connect = () => run(() => window.scarrix.auth.start(), res => { setProfile(res); setDevice(null); setNotice(`Angemeldet als ${res.name}`); });
  if (!config) return <main className="loading">Scarrix Client wird vorbereitet …</main>;

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="logo">S</div><div><b>SCARRIX</b><small>CLIENT · BETA 0.1</small></div></div>
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
      <header><div><p className="overline">SCARRIX.NET / LAUNCHER</p><h1>{t[tab]}</h1></div><span className="header-chip">Minecraft Java</span></header>
      {notice && <div className="alert" role="status"><b>{t.notice}:</b> {notice}<button aria-label="Schließen" onClick={() => setNotice('')}>×</button></div>}
      {progress !== null && <div className="progress"><div style={{width: `${progress}%`}}></div><span>{progress}%</span></div>}
      {device && <section className="device panel"><h2>Microsoft-Anmeldung</h2><p>Öffne die Microsoft-Seite im Browser und gib dort den Code ein. Dein Passwort gehört ausschließlich auf die offizielle Microsoft-Seite.</p><div className="device-row"><code>{device.code}</code><button className="btn" onClick={() => window.scarrix.openUrl(device.url).catch(e => setNotice(String(e)))}>Microsoft-Anmeldeseite öffnen ↗</button></div><small>{device.url}</small></section>}

      {tab === 'home' && <>
        <section className="hero"><div className="hero-copy"><p className="eyebrow">DEIN MINECRAFT · DEIN SERVER</p><h2>Dein Abenteuer<br/><span>beginnt hier.</span></h2><p>Verbinde dich direkt mit {config.server.name}. Wähle deinen Modus und starte Minecraft.</p><button className="btn primary" disabled={busy || !profile} onClick={() => run(() => window.scarrix.game(config.modes[0].id), setNotice)}>{profile ? '▶  Scarrix-Lobby starten' : 'Zuerst mit Microsoft anmelden'}</button></div><div className="hero-art"><div className="pixel p1"></div><div className="pixel p2"></div><div className="pixel p3"></div><div className="hero-emblem">S</div></div></section>
        <div className="section-row"><h2>{t.server}</h2><button className="btn ghost" onClick={refresh}>{t.check} ↻</button></div>
        <div className="summary"><div className="stat panel"><span className="dot" style={{background: status?.online ? '#59df9c' : '#eb7c7c'}}></span><div><small>Scarrix.net</small><b>{status ? (status.online ? 'Online' : 'Offline') : '—'}</b></div></div><div className="stat panel"><span className="stat-symbol">♟</span><div><small>{t.players}</small><b>{status?.players ?? '—'} / {status?.maxPlayers ?? '—'}</b></div></div><div className="stat panel"><span className="stat-symbol">▣</span><div><small>Minecraft</small><b>{status?.version ?? config.minecraft.version}</b></div></div></div>
        <div className="section-row"><h2>Spielmodi</h2><small>Die Spielerzahl gilt aktuell nur für das gesamte Netzwerk.</small></div>
        <p className="backend-notice">Unterserver-IP und Port: nur zur Information (nicht bearbeitbar). Der Spielstart erfolgt über Scarrix.net; wähle deinen Spielmodus anschließend in der Lobby. Direkte Unterserver-Verbindungen wurden nicht bestätigt.</p>
        <div className="mode-grid">{config.modes.map((m, i) => <div className="mode-card panel" key={m.id}><div className="mode-icon">{['⛏','⚔','▦','✦'][i % 4]}</div>{m.group && <small className="mode-group">{m.group} · 3 Untermodi</small>}<h3>{m.name}</h3><p className="mode-endpoint" title="Nur Anzeige; diese Backend-Adresse wird nicht zum Spielstart verwendet">Backend (nur Anzeige): <code>{m.address}:{m.port}</code></p><button className="btn outline" disabled={busy || !profile} onClick={() => run(() => window.scarrix.game(m.id), setNotice)}>Lobby starten →</button></div>)}</div>
        <div className="section-row"><h2>{t.news}</h2></div><div className="news-grid">{config.news.length ? config.news.map((n,i) => <article className="panel news" key={i}><span className="eyebrow">NEWS</span><h3>{n.title}</h3><p>{n.text}</p></article>) : <article className="panel news">Noch keine Server-News konfiguriert.</article>}</div>
      </>}

      {tab === 'mods' && <><div className="panel intro"><h2>Mod-Browser</h2><p>Finde kompatible Mods für {config.minecraft.version} / {config.minecraft.loader}. Mods werden nur in der aktuellen Instanz installiert.</p><form className="search" onSubmit={e => {e.preventDefault();run(() => window.scarrix.mods.search(modQuery, source), setMods);}}><input value={modQuery} onChange={e => setModQuery(e.target.value)} placeholder="Sodium, Iris, JEI …"/><select value={source} onChange={e => setSource(e.target.value as typeof source)}><option value="modrinth">Modrinth</option><option value="curseforge">CurseForge</option></select><button className="btn primary" disabled={busy || !modQuery.trim()}>{t.search}</button></form></div>
        <div className="mod-list">{mods.map(m => <div key={m.source+m.id} className="mod panel">{m.icon ? <img src={m.icon} alt=""/> : <div className="mod-placeholder">⬡</div>}<div className="mod-info"><b>{m.name}</b><p>{m.description}</p><small>{Number(m.downloads || 0).toLocaleString()} Downloads · {m.source}</small></div><button className="btn outline" disabled={busy} onClick={() => {setProgress(0); run(() => window.scarrix.mods.install(m.id, m.source), result => setNotice(`${result.filename} installiert. ${result.dependencies.length ? 'Benötigte Abhängigkeiten prüfen: ' + result.dependencies.join(', ') : ''}`));}}>{t.install}</button></div>)}</div>
        <p className="hint">Hinweis: Abhängigkeiten werden erkannt und gemeldet, jedoch nicht automatisch nachinstalliert. CurseForge benötigt einen API-Schlüssel und erlaubt nicht für jede Mod einen Download.</p>
      </>}

      {tab === 'skins' && <><div className="panel intro"><h2>Dein Minecraft-Skin</h2><p>Aktuelles Skin ansehen, eigenes PNG hochladen und alte Skins wiederverwenden.</p>{profile?.skins?.[0]?.url && <div className="current-skin"><img src={profile.skins[0].url} alt="Aktueller Skin"/><span>Aktuelles Skin · {profile.skins[0].variant || 'classic'}</span></div>}
        <div className="form-inline"><label>Arme / Modell <select value={skinModel} onChange={e => setSkinModel(e.target.value as typeof skinModel)}><option value="classic">Classic (Steve)</option><option value="slim">Slim (Alex)</option></select></label><button className="btn primary" disabled={!profile || busy} onClick={() => run(() => window.scarrix.skins.upload(skinModel), result => {setSkins(result.library);setNotice(result.message);window.scarrix.auth.refresh().then(setProfile);})}>{t.skinUpload}</button></div></div><h2>{t.library}</h2><div className="skin-grid">{skins.map(s => <div key={s.id} className="panel skin-item"><img src={s.dataUrl} alt="Gespeicherter Skin"/><button className="btn outline" disabled={!profile || busy} onClick={() => run(() => window.scarrix.skins.apply(s.id, skinModel), setProfile)}>Skin anwenden</button></div>)}</div><p className="hint">Nur PNG mit 64×64 oder 64×32 Pixeln. Zugang zu Minecraft Services erforderlich.</p></>}

      {tab === 'capes' && <><div className="panel intro"><h2>{t.official}</h2><p>Hier werden die Capes angezeigt, die dein offizielles Minecraft-Konto bereits besitzt.</p><div className="cape-list">{profile?.capes?.length ? profile.capes.map(c => <div key={c.id} className="cape panel"><img src={c.url} alt="Cape"/><b>{c.alias || c.id}</b><button className="btn outline" disabled={busy} onClick={() => run(() => window.scarrix.capes.select(c.id), setProfile)}>Ausrüsten</button></div>) : <p>Keine Capes geladen. Bitte anmelden.</p>}</div><button className="btn ghost" disabled={!profile || busy} onClick={() => run(() => window.scarrix.capes.select(null), setProfile)}>Cape ablegen</button></div><div className="panel intro"><h2>Eigene Cape-Vorschauen</h2><p>Ein eigenes Cape kann lokal gespeichert und angezeigt werden. Offizielle Minecraft-Capes lassen sich damit nicht neu erstellen oder auf Mojangs Server hochladen.</p><button className="btn primary" disabled={busy} onClick={() => run(() => window.scarrix.capes.upload(), result => {setCapes(result.library);setNotice(result.message);})}>{t.capeUpload}</button><div className="skin-grid">{capes.map(c => <div key={c.id} className="panel skin-item"><img src={c.dataUrl} alt="Eigene Cape-Vorschau"/></div>)}</div></div></>}

      {tab === 'settings' && <><div className="panel intro settings"><h2>Launcher konfigurieren</h2><p>Du kannst alle Einstellungen hier anpassen. Die Microsoft Client-ID ist <b>kein</b> Passwort.</p>
        <div className="fields"><label>Minecraft-Version<input value={config.minecraft.version} onChange={e => patch('minecraft', 'version', e.target.value)}/></label><label>Mod-Loader<select value={config.minecraft.loader} onChange={e => patch('minecraft','loader',e.target.value)}><option value="vanilla">Vanilla</option><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="quilt">Quilt (noch nicht implementiert)</option></select></label>
        <label>RAM (GB)<input type="number" min="2" max="32" value={config.minecraft.ramGB} onChange={e => patch('minecraft','ramGB',Number(e.target.value))}/></label><label>Java-Pfad<input value={config.minecraft.javaPath} onChange={e => patch('minecraft','javaPath',e.target.value)}/></label>
        <label>Microsoft Application (Client) ID<input value={config.microsoft.clientId} onChange={e => patch('microsoft','clientId',e.target.value)} placeholder="00000000-0000-0000-0000-000000000000"/></label><label>GitHub-Benutzer / Organisation<input value={config.github.owner} onChange={e => patch('github','owner',e.target.value)}/></label>
        <label>Serveradresse<input value={config.server.address} onChange={e => patch('server','address',e.target.value)}/></label><label>CurseForge API-Key (optional)<input type="password" value={config.curseforge.apiKey} onChange={e => patch('curseforge','apiKey',e.target.value)} placeholder="Nicht im öffentlichen Repository ablegen"/></label>
        <label>Sprache / Language<select value={config.language} onChange={e => setConfig({...config,language:e.target.value as 'de'|'en'})}><option value="de">Deutsch</option><option value="en">English</option></select></label></div>
        <div className="buttons"><button className="btn primary" disabled={busy} onClick={() => run(() => window.scarrix.config.save(config), res => {setConfig(res);setNotice('Einstellungen gespeichert.');window.scarrix.paths().then(setPaths);})}>{t.save}</button><button className="btn outline" onClick={() => run(() => window.scarrix.java(), setNotice)}>Java prüfen</button><button className="btn outline" onClick={() => run(() => window.scarrix.update(), setNotice)}>Updates prüfen</button><button className="btn outline" onClick={() => run(() => window.scarrix.logs(), setNotice)}>Logs anzeigen</button></div>
      </div><div className="panel paths"><h2>Dateiordner</h2><p>Gemeinsame Minecraft-Downloads: <code>{paths?.minecraft}</code></p><p>Aktuelle Instanz mit Mods: <code>{paths?.instance}</code></p><p className="hint">Die Vorlage config.json im Projekt ist die Erstkonfiguration; spätere Änderungen liegen im Benutzerprofil. Microsoft- und Minecraft-Token werden nicht dauerhaft gespeichert.</p></div></>}
      <footer>SCARRIX CLIENT · Nicht offiziell von Mojang Studios oder Microsoft unterstützt · <span>Open Source / MIT</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
