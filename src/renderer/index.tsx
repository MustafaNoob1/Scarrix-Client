import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Config, Profile, ModHit, SavedImage, DownloadStatus } from './types';
import './style.css';
import './play.css';
import './clean.css';
import { ScarrixMark } from './ScarrixMark';
import { AmbientBackground, backgrounds } from './AmbientBackground';
import { DownloadPanel, JavaPanel, InstalledModsPanel, DiagnosticsPanel } from './FeaturePanels';
import { SkinPreview } from './SkinPreview';

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

function AccountFace({skin}:{skin?:string}) {
  const canvas=React.useRef<HTMLCanvasElement>(null);
  useEffect(()=>{let active=true;const context=canvas.current?.getContext('2d');context?.clearRect(0,0,32,32);if(!skin)return;const image=new Image();image.onload=()=>{if(!active||!context)return;context.imageSmoothingEnabled=false;context.drawImage(image,8,8,8,8,0,0,32,32);context.drawImage(image,40,8,8,8,0,0,32,32);};image.src=skin;return()=>{active=false;};},[skin]);
  return <span className="account-face">{skin?<canvas ref={canvas} width={32} height={32}/>:<ScarrixMark decorative/>}</span>;
}
function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [tab, rawSetTab] = useState<Tab>('home');
  const [history, setHistory] = useState<Tab[]>(['home']);
  const [historyIndex,setHistoryIndex] = useState(0);
  const [accountMenu,setAccountMenu] = useState(false);
  const [noticeMenu,setNoticeMenu] = useState(false);
  const setTab = (next:Tab) => { rawSetTab(next);setAccountMenu(false);setNoticeMenu(false); if(next!==tab){setHistory([...history.slice(0,historyIndex+1),next]);setHistoryIndex(historyIndex+1);} };
  const go = (index:number) => {rawSetTab(history[index]);setHistoryIndex(index);setAccountMenu(false);setNoticeMenu(false);};
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
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null);
  const [skinModel, setSkinModel] = useState<'classic' | 'slim'>('classic');
  const [skins, setSkins] = useState<SavedImage[]>([]);
  const [capes, setCapes] = useState<SavedImage[]>([]);
  const [paths, setPaths] = useState<{minecraft: string; instance: string} | null>(null);
  const [selectedModeId, setSelectedModeId] = useState('survival');
  const [playView, setPlayView] = useState<'play' | 'profiles'>('play');
  const [settingsSection, setSettingsSection] = useState('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [download, setDownload] = useState<DownloadStatus|null>(null);
  const [modRefresh, setModRefresh] = useState(0);
  const [instanceStep, setInstanceStep] = useState(0);
  const [instanceName, setInstanceName] = useState('');
  const [showNewInstance, setShowNewInstance] = useState(false);
  const [draftVersion, setDraftVersion] = useState('1.21.1');
  const [draftLoader, setDraftLoader] = useState<'vanilla' | 'fabric' | 'forge'>('vanilla');
  const [draftRam, setDraftRam] = useState(4);
  const [versions, setVersions] = useState<string[]>([]);
  const [memory, setMemory] = useState<{maxMB:number; recommendedMB:number} | null>(null);
  const [versionError, setVersionError] = useState('');
  const loadVersions = () => { setVersionError(''); window.scarrix.versions().then(setVersions).catch(() => setVersionError('Versionsliste nicht erreichbar. Bitte erneut laden.')); };
  const formatRam = (mb: number) => mb < 1024 ? `${mb} MB` : `${mb / 1024} GB (${mb} MB)`;
  const [appVersion, setAppVersion] = useState('0.6.0');
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
    loadVersions();
    window.scarrix.memory().then(setMemory).catch(e => setNotice(String(e)));
    refresh();
    window.scarrix.downloadStatus().then(setDownload).catch(()=>{});
    const unDownload=window.scarrix.onDownload(setDownload);
    const unDevice = window.scarrix.onDevice(setDevice);
    const unNotice = window.scarrix.onNotice(setNotice);
    const unProgress = window.scarrix.onProgress(p => setProgress(p));
    return () => { unDownload(); unDevice(); unNotice(); unProgress(); };
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
    if (!versions.includes(version)) {
      setNotice('Bitte gib eine gültige Minecraft-Version an, z. B. 1.21.1.'); return;
    }
    if (!memory || draftRam * 1024 < 512 || draftRam * 1024 > memory.maxMB || draftRam * 1024 % 256 !== 0) {
      setNotice('Bitte wähle RAM innerhalb des erkannten Systemspeichers.'); return;
    }
    if (!editingId && config.instances.length >= 16) { setNotice('Maximal 16 Instanzen möglich.'); return; }
    const id = editingId || 'instance-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const instance = { id, name: instanceName.trim() || version + ' · ' + draftLoader.toUpperCase(), version, loader: draftLoader, ramGB: draftRam };
    save({ ...config, instances: editingId ? config.instances.map(i=>i.id===editingId?instance:i) : [...config.instances, instance], activeInstanceId: id,
      minecraft: { ...config.minecraft, version, loader: draftLoader, ramGB: draftRam } },
      () => { setShowNewInstance(false); setEditingId(null); setNotice(editingId ? 'Profil geändert. Prüfe die Mod-Kompatibilität bei neuer Version oder neuem Loader.' : 'Instanz erstellt und ausgewählt.'); });
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

  return <div className="shell" data-theme={config.launcher.theme} data-background={config.launcher.background ?? "grid"} data-animations={config.launcher.animations !== false}>
    <aside className="sidebar compact-sidebar">
      <button className="rail-brand" onClick={() => {setTab('home');setPlayView('play');}} title="Scarrix"><ScarrixMark decorative/></button>
      <nav>
        <button className={'nav ' + (tab === 'home' && playView === 'play' ? 'active' : '')} onClick={() => {setTab('home');setPlayView('play');}}><span>▶</span><small>Spielen</small></button>
        <button className={'nav ' + (tab === 'home' && playView === 'profiles' ? 'active' : '')} onClick={() => {setTab('home');setPlayView('profiles');}}><span>▣</span><small>Profile</small></button>
        {(['mods','skins','capes'] as Tab[]).map(item => <button key={item} className={'nav ' + (tab === item ? 'active' : '')} onClick={() => setTab(item)}><span>{{mods:'⬡',skins:'◈',capes:'✧'}[item as 'mods'|'skins'|'capes']}</span><small>{t[item]}</small></button>)}
      </nav>
      <div className="grow"/>
      <button className={'nav ' + (tab === 'settings' ? 'active' : '')} onClick={() => setTab('settings')}><span>⚙</span><small>Optionen</small></button>
    </aside>
    <main className="main"><AmbientBackground mode={config.launcher.background ?? "aurora"} animated={config.launcher.backgroundMotion !== 'off'} motion={config.launcher.backgroundMotion ?? 'on'}/>
      <header className="client-topbar">
        <div className="topbar-left"><button className="header-icon" aria-label="Zurück" disabled={historyIndex===0} onClick={()=>go(historyIndex-1)}>←</button><button className="header-icon" aria-label="Vorwärts" disabled={historyIndex===history.length-1} onClick={()=>go(historyIndex+1)}>→</button><div className="topbar-brand"><div><b>SCARRIX</b><small>v{appVersion}</small></div></div></div>
        <div className="topbar-actions">
          <div className="header-popup-anchor"><button className="header-icon notification-button" aria-label="Mitteilungen" aria-expanded={noticeMenu} onClick={()=>{setNoticeMenu(!noticeMenu);setAccountMenu(false);}}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{notice&&<i/>}</button>{noticeMenu&&<div className="header-popup"><b>Mitteilungen</b><p>{notice||'Du bist auf dem neuesten Stand.'}</p><button disabled={busy} onClick={()=>{setNoticeMenu(false);run(()=>window.scarrix.update(),setNotice);}}>Nach Updates suchen</button></div>}</div>
          <button className="instance-chip" onClick={()=>{setTab('home');setPlayView('profiles');}}>▣ <span>{config.instances.length} {config.instances.length===1?'INSTANZ':'INSTANZEN'}</span></button>
          <div className="header-popup-anchor"><button className="account-chip" aria-expanded={accountMenu} onClick={()=>{setAccountMenu(!accountMenu);setNoticeMenu(false);}}><AccountFace skin={profile?.skins?.[0]?.url}/><b>{profile?.name||'ANMELDEN'}</b><span>▾</span></button>{accountMenu&&<div className="header-popup"><b>{profile?.name||'Minecraft-Konto'}</b><p>{profile?'Dein verknüpftes Konto':'Verknüpfe dein Microsoft-Konto.'}</p><button disabled={busy} onClick={()=>{setAccountMenu(false);profile?setTab('skins'):connect();}}>{profile?'Skin ändern':'Microsoft anmelden'}</button>{profile&&<button disabled={busy} onClick={()=>{setAccountMenu(false);run(()=>window.scarrix.auth.logout(),()=>setProfile(null));}}>Abmelden</button>}</div>}</div>
          <button className="header-icon framed" aria-label="GitHub öffnen" onClick={()=>run(()=>window.scarrix.openUrl('https://github.com/MustafaNoob1/scarrix-client'))}>↗</button>
          <div className="window-buttons"><button aria-label="Minimieren" onClick={()=>window.scarrix.windowControl('minimize')}>—</button><button aria-label="Maximieren oder Wiederherstellen" onClick={()=>window.scarrix.windowControl('maximize')}>□</button><button className="close-window" aria-label="Schließen" onClick={()=>window.scarrix.windowControl('close')}>×</button></div>
        </div>
      </header>
      {notice && <div className="alert" role="status"><b>{t.notice}:</b> {notice}<button aria-label="Schließen" onClick={() => setNotice('')}>×</button></div>}
      {download && <DownloadPanel status={download} onClose={()=>setDownload(null)}/>}
      {progress !== null && <div className="progress"><div style={{width: `${progress}%`}}></div><span>{progress}%</span></div>}
      {device && <section className="device panel"><h2>Microsoft-Anmeldung</h2><p>Öffne die Microsoft-Seite im Browser und gib dort den Code ein. Dein Passwort gehört ausschließlich auf die offizielle Microsoft-Seite.</p><div className="device-row"><code>{device.code}</code><button className="btn" onClick={() => window.scarrix.openUrl(device.url).catch(e => setNotice(String(e)))}>Microsoft-Anmeldeseite öffnen ↗</button></div><small>{device.url}</small></section>}


      {tab === 'home' && <div className="play-layout">
        <div className="play-main">
          <div className="play-tabs"><button className={playView === 'play' ? 'selected' : ''} onClick={() => setPlayView('play')}>SPIELEN</button><button className={playView === 'profiles' ? 'selected' : ''} onClick={() => setPlayView('profiles')}>MEINE PROFILE <span>{config.instances.length}</span></button></div>
          {playView === 'play' ? <section className="character-stage">
            <label className="rotation-toggle"><input type="checkbox" checked={config.launcher.rotateSkin !== false} onChange={e => save({...config,launcher:{...config.launcher,rotateSkin:e.target.checked}})}/> Skin-Rotation</label>
            <div className="stage-eyebrow">{profile ? "DEIN MINECRAFT-PROFIL" : "DEIN ABENTEUER BEGINNT HIER"}</div>
            <SkinPreview skin={profile?.skins?.[0]?.url} nameTag={profile?.name ?? "Gast"} model={profile?.skins?.[0]?.variant?.toLowerCase() === "slim" ? "slim" : "classic"} rotate={config.launcher.rotateSkin !== false} animate={config.launcher.animations !== false}/>
            <div className="character-platform"/>
            <div className="stage-launch">
              <div className="launch-split"><button className="btn primary" disabled={busy || !profile || !selectedMode} onClick={() => run(() => window.scarrix.game(selectedMode!.id), setNotice)}>▶ {busy ? 'WIRD VORBEREITET …' : 'SPIELEN'}<small>{activeInstance?.version} · {activeInstance?.loader.toUpperCase()}</small></button><select aria-label="Minecraft-Profil auswählen" value={activeInstance?.id ?? ''} onChange={e => chooseInstance(e.target.value)} disabled={busy}>{config.instances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
              {!profile && <button className="text-btn" disabled={busy} onClick={connect}>Mit Microsoft anmelden, um zu spielen</button>}
              <div className="stage-links"><button className="text-btn" onClick={() => setTab('skins')}>◈ Skin ändern</button><button className="text-btn" disabled={busy} onClick={() => {setEditingId(null);setInstanceStep(0);setInstanceName('');setDraftRam(memory ? memory.recommendedMB/1024 : .5);setShowNewInstance(true);}}>+ Neues Profil</button><button className="text-btn" disabled={busy} onClick={() => run(() => window.scarrix.gamePrepare(), setNotice)}>Dateien vorbereiten</button></div>
            </div>
            <div className="stage-server"><span className={'dot' + (status?.online ? ' online' : '')}/><b>SCARRIX.NET</b><span>{status?.players ?? '—'} Spieler online</span><select aria-label="Spielmodus auswählen" value={selectedModeId} onChange={e => setSelectedModeId(e.target.value)}>{config.modes.map(m => <option value={m.id} key={m.id}>{m.group ? m.group + ' / ' : ''}{m.name}</option>)}</select></div>
          </section> : <section className="profiles-view">
            <div className="section-row"><div><p className="eyebrow">DEINE SAMMLUNG</p><h2>Minecraft-Profile</h2></div><button className="btn primary" disabled={busy} onClick={() => {setEditingId(null);setInstanceStep(0);setInstanceName('');setDraftRam(memory ? memory.recommendedMB/1024 : .5);setShowNewInstance(true);}}>{editingId ? 'Änderungen speichern' : '+ Profil erstellen'}</button></div>
            {config.instances.map(i => <article key={i.id} className={'profile-row ' + (i.id === activeInstance?.id ? 'selected' : '')}><div className={'profile-icon ' + i.loader}>{i.loader === 'vanilla' ? '▧' : i.loader === 'fabric' ? '⬡' : '⚒'}</div><div className="profile-copy"><b>{i.name}</b><small>{i.version} · {i.loader.toUpperCase()} · {formatRam(i.ramGB*1024)}</small></div><button className="text-btn" disabled={busy} onClick={()=>{setEditingId(i.id);setInstanceName(i.name);setDraftVersion(i.version);setDraftLoader(i.loader);setDraftRam(memory?Math.min(i.ramGB,memory.maxMB/1024):i.ramGB);setInstanceStep(0);setShowNewInstance(true);}}>Bearbeiten</button><button className="text-btn" disabled={busy} onClick={()=>run(()=>window.scarrix.profiles.duplicate(i.id),setConfig)}>Kopieren</button><button className="text-btn" disabled={busy} onClick={()=>run(()=>window.scarrix.profiles.export(i.id),setNotice)}>Export</button><button className="btn outline" disabled={busy} onClick={() => {chooseInstance(i.id);setPlayView('play');}}>{i.id === activeInstance?.id ? '▶ Spielen' : 'Auswählen'}</button></article>)}
            <div className="profile-bottom"><button className="btn outline" disabled={busy} onClick={()=>run(()=>window.scarrix.profiles.import(),result=>{if(result){setConfig(result);setNotice("Profil importiert. Prüfe Mods vor dem Start.");}})}>Profil importieren</button><button className="text-btn" disabled={busy || config.instances.length < 2} onClick={deleteInstance}>Ausgewähltes Profil entfernen</button><small>Minecraft-Dateien bleiben erhalten.</small></div>
          </section>}
        </div>
        <aside className="news-rail"><p className="eyebrow">NEUIGKEITEN</p><h2>Scarrix Network</h2>{config.news.length ? config.news.map((n,i) => <article className="news-tile" key={i}><div className="news-art"><ScarrixMark decorative/></div><h3>{n.title}</h3><p>{n.text}</p></article>) : <><article className="news-tile"><div className="news-art landscape"><ScarrixMark decorative/><span>SCARRIX</span></div><h3>Dein nächstes Abenteuer</h3><p>Wähle dein Profil und starte ins Scarrix-Netzwerk.</p></article><article className="news-tile"><div className="news-art blocks">⬡</div><h3>Dein Spiel. Dein Profil.</h3><p>Vanilla, Fabric oder Forge — jede Instanz hat ihre eigenen Mods.</p><button className="text-btn" onClick={() => setPlayView('profiles')}>Profile öffnen ↗</button></article></>}<div className="news-rail-footer">COMMUNITY LAUNCHER<small>Nicht offiziell von Mojang oder Microsoft.</small></div></aside>
      </div>}

      {tab === 'mods' && <><InstalledModsPanel profileId={config.activeInstanceId} refreshKey={modRefresh} busy={busy} run={run}/><div className="panel intro"><h2>Mod-Browser</h2><p>Finde kompatible Mods für {config.minecraft.version} / {config.minecraft.loader}. Mods werden nur in der aktuellen Instanz installiert.</p><form className="search" onSubmit={e => {e.preventDefault();run(() => window.scarrix.mods.search(modQuery, source), setMods);}}><input value={modQuery} onChange={e => setModQuery(e.target.value)} placeholder="Sodium, Iris, JEI …"/><select value={source} onChange={e => setSource(e.target.value as typeof source)}><option value="modrinth">Modrinth</option><option value="curseforge">CurseForge</option></select><button className="btn primary" disabled={busy || !modQuery.trim()}>{t.search}</button></form></div>
        <div className="mod-list">{mods.map(m => <div key={m.source+m.id} className="mod panel">{m.icon ? <img src={m.icon} alt=""/> : <div className="mod-placeholder">⬡</div>}<div className="mod-info"><b>{m.name}</b><p>{m.description}</p><small>{Number(m.downloads || 0).toLocaleString()} Downloads · {m.source}</small></div><button className="btn outline" disabled={busy} onClick={() => {setProgress(0); run(() => window.scarrix.mods.install(m.id, m.source), result => {setModRefresh(n=>n+1);setNotice(`${result.filename} installiert. ${result.dependencies.length ? 'Benötigte Abhängigkeiten prüfen: ' + result.dependencies.join(', ') : ''}`);});}}>{t.install}</button></div>)}</div>
        <p className="hint">Hinweis: Abhängigkeiten werden erkannt und gemeldet, jedoch nicht automatisch nachinstalliert. CurseForge benötigt einen API-Schlüssel und erlaubt nicht für jede Mod einen Download.</p>
      </>}

      {tab === 'skins' && <section className="skin-editor">
        <div className="skin-editor-heading"><div><p className="eyebrow">DEIN MINECRAFT-LOOK</p><h2>Skin ändern</h2><p>PNG auswählen, Modell prüfen und auf dein Minecraft-Konto anwenden.</p></div><button className="btn outline" disabled={busy} onClick={() => run(() => window.scarrix.skins.upload(skinModel), result => {setSkins(result.library);if(result.selectedId)setSelectedSkinId(result.selectedId);setNotice(result.message);})}>+ Skin auswählen</button></div>
        <div className="skin-editor-layout"><div className="skin-editor-preview">
          <SkinPreview skin={skins.find(s => s.id === selectedSkinId)?.dataUrl || profile?.skins?.[0]?.url} model={selectedSkinId ? skinModel : profile?.skins?.[0]?.variant?.toLowerCase() === 'slim' ? 'slim' : 'classic'} rotate={config.launcher.rotateSkin !== false} animate={config.launcher.animations !== false}/>
          <span className="skin-preview-label">{selectedSkinId ? 'VORSCHAU · NOCH NICHT ANGEWENDET' : profile ? 'AKTUELLER SKIN' : 'VORSCHAU'}</span>
        </div><div className="skin-editor-controls"><p className="eyebrow">MODELL</p><h3>Welche Arme hat dein Skin?</h3><div className="skin-model-options">{([{id:'classic',title:'Classic',detail:'Steve · breite Arme'},{id:'slim',title:'Slim',detail:'Alex · schmale Arme'}] as const).map(m => <button key={m.id} className={skinModel === m.id ? 'selected' : ''} disabled={busy} onClick={() => setSkinModel(m.id)}><b>{m.title}</b><small>{m.detail}</small></button>)}</div>
          <p className="hint">PNG mit 64×64 oder 64×32 Pixeln, maximal 2 MB. Deine Auswahl wird zuerst lokal gespeichert.</p>
          {!profile && <div className="settings-note">Du kannst Skins bereits auswählen und ansehen. Zum Ändern deines Minecraft-Skins musst du dich mit deinem Java-Konto anmelden.<button className="text-btn" disabled={busy} onClick={connect}>Mit Microsoft anmelden →</button></div>}
          <button className="btn primary skin-apply" disabled={busy || !profile || !selectedSkinId} onClick={() => run(() => window.scarrix.skins.apply(selectedSkinId!, skinModel), updated => {setProfile(updated);setSelectedSkinId(null);setNotice('Skin auf deinem Minecraft-Konto geändert. Die Spielen-Seite zeigt jetzt deinen neuen Skin.');})}>{busy ? 'Wird verarbeitet …' : '✓ Skin anwenden'}</button>
          {selectedSkinId && <button className="text-btn" disabled={busy} onClick={() => setSelectedSkinId(null)}>Auswahl verwerfen</button>}
          {profile && <button className="text-btn" disabled={busy} onClick={() => run(() => window.scarrix.auth.refresh(), updated => {setProfile(updated);setNotice('Aktueller Skin vom Minecraft-Konto geladen.');})}>Aktuellen Skin neu laden ↻</button>}
        </div></div>
        <div className="section-row"><h2>Meine Skins</h2><small>{skins.length} gespeichert</small></div><div className="skin-library">{skins.length ? skins.map(s => <button key={s.id} className={'skin-library-card ' + (selectedSkinId === s.id ? 'selected' : '')} disabled={busy} onClick={() => setSelectedSkinId(s.id)}><img src={s.dataUrl} alt="Gespeicherter Minecraft-Skin"/><span>{selectedSkinId === s.id ? '✓ Ausgewählt' : 'Skin auswählen'}</span></button>) : <div className="skin-library-empty">Noch keine Skins gespeichert. Wähle oben deine erste PNG-Datei aus.</div>}</div>
      </section>}

      {tab === 'capes' && <><div className="panel intro"><h2>{t.official}</h2><p>Hier werden die Capes angezeigt, die dein offizielles Minecraft-Konto bereits besitzt.</p><div className="cape-list">{profile?.capes?.length ? profile.capes.map(c => <div key={c.id} className="cape panel"><img src={c.url} alt="Cape"/><b>{c.alias || c.id}</b><button className="btn outline" disabled={busy} onClick={() => run(() => window.scarrix.capes.select(c.id), setProfile)}>Ausrüsten</button></div>) : <p>Keine Capes geladen. Bitte anmelden.</p>}</div><button className="btn ghost" disabled={!profile || busy} onClick={() => run(() => window.scarrix.capes.select(null), setProfile)}>Cape ablegen</button></div><div className="panel intro"><h2>Eigene Cape-Vorschauen</h2><p>Ein eigenes Cape kann lokal gespeichert und angezeigt werden. Offizielle Minecraft-Capes lassen sich damit nicht neu erstellen oder auf Mojangs Server hochladen.</p><button className="btn primary" disabled={busy} onClick={() => run(() => window.scarrix.capes.upload(), result => {setCapes(result.library);setNotice(result.message);})}>{t.capeUpload}</button><div className="skin-grid">{capes.map(c => <div key={c.id} className="panel skin-item"><img src={c.dataUrl} alt="Eigene Cape-Vorschau"/></div>)}</div></div></>}


      {tab === 'settings' && <section className="settings-window">
        <div className="settings-title"><h2>⚙ Einstellungen</h2><span>Launcher · v{appVersion}</span></div>
        <div className="settings-layout"><nav className="settings-nav">{[{id:'general',icon:'⚙',name:'Allgemein'},{id:'appearance',icon:'◈',name:'Darstellung'},{id:'java',icon:'▧',name:'Java'},{id:'diagnostics',icon:'≡',name:'Fehlerdiagnose'},{id:'updates',icon:'↻',name:'Updates'},{id:'about',icon:'ⓘ',name:'Über & Diagnose'}].map(s => <button key={s.id} className={settingsSection === s.id ? 'selected' : ''} onClick={() => setSettingsSection(s.id)}>{s.icon} {s.name}</button>)}</nav>
        <div className="settings-content">
          {settingsSection === 'general' && <><p className="eyebrow">ALLGEMEIN</p><h2>Mach den Launcher zu deinem.</h2><div className="setting-row"><div><h3>Sprache</h3><p>Sprache der Launcher-Navigation.</p></div><select value={config.language} disabled={busy} onChange={e => save({...config,language:e.target.value as 'de'|'en'})}><option value="de">Deutsch</option><option value="en">English</option></select></div><div className="setting-row"><div><h3>Minecraft-Konto</h3><p>{profile ? 'Angemeldet als ' + profile.name : 'Noch nicht angemeldet'}</p></div><button className="btn outline" disabled={busy} onClick={profile ? () => run(() => window.scarrix.auth.logout(), () => setProfile(null)) : connect}>{profile ? 'Abmelden' : 'Anmelden'}</button></div><div className="settings-note">Version, Modloader und RAM wählst du beim Erstellen eines Minecraft-Profils.</div></>}
          {settingsSection === 'appearance' && <><p className="eyebrow">DARSTELLUNG</p><h2>Dein Stil.</h2><div className="setting-row stacked"><div><h3>Akzentfarbe</h3><p>Dunkler Hintergrund mit deiner Lieblingsfarbe.</p></div><div className="color-options">{(['red','blue','purple','gold'] as const).map(theme => <button key={theme} aria-label={{red:'Rot',blue:'Blau',purple:'Lila',gold:'Gold'}[theme]} aria-pressed={config.launcher.theme === theme} className={'color-choice ' + theme} disabled={busy} onClick={() => save({...config,launcher:{...config.launcher,theme}})}>{config.launcher.theme === theme ? '✓' : ''}</button>)}</div></div><div className="setting-row"><div><h3>Skin-Rotation</h3><p>Automatische Drehung auf der Spielen-Seite, unabhängig von der Windows-Bewegungseinstellung. Mit der Maus kannst du ihn jederzeit drehen.</p></div><input className="switch" type="checkbox" checked={config.launcher.rotateSkin !== false} disabled={busy} onChange={e => save({...config,launcher:{...config.launcher,rotateSkin:e.target.checked}})}/></div><div className="setting-row"><div><h3>Animationen</h3><p>Skin-Bewegung und dezente Übergänge.</p></div><input className="switch" type="checkbox" checked={config.launcher.animations !== false} disabled={busy} onChange={e => save({...config,launcher:{...config.launcher,animations:e.target.checked}})}/></div><div className="setting-row stacked background-setting"><div><h3>Animierter Hintergrund</h3><p>Wähle die Atmosphäre. Die Hintergrundbewegung steuerst du unabhängig von der Skin-Animation.</p></div><label className="background-motion">Bewegung<select disabled={busy} value={config.launcher.backgroundMotion??'on'} onChange={e=>save({...config,launcher:{...config.launcher,backgroundMotion:e.target.value as 'on'|'off'|'system'}})}><option value="on">Ein – immer animiert</option><option value="system">Windows-Einstellung folgen</option><option value="off">Aus</option></select></label><div className="background-options">{backgrounds.map(bg=><button key={bg.id} className={config.launcher.background === bg.id ? "selected" : ""} aria-pressed={config.launcher.background === bg.id} disabled={busy} onClick={()=>save({...config,launcher:{...config.launcher,background:bg.id}})}><div className={"background-thumbnail thumbnail-"+bg.id}><span>{bg.icon}</span></div><b>{bg.name}</b><small>{bg.detail}</small>{config.launcher.background === bg.id && <i>✓</i>}</button>)}</div></div></>}
          {settingsSection === 'java' && <JavaPanel busy={busy} run={run}/>}
          {settingsSection === 'diagnostics' && <DiagnosticsPanel busy={busy} run={run}/>}
          {settingsSection === 'updates' && <><p className="eyebrow">SOFTWARE</p><h2>Launcher-Updates</h2><div className="setting-row"><div><h3>Installierte Version</h3><p>Scarrix Client {appVersion}</p></div><span className="version-badge">v{appVersion}</span></div><p>Updates werden über den sicheren Kanal heruntergeladen, geprüft und nach deiner Bestätigung installiert.</p><div className="settings-note">Öffentliche GitHub-Releases werden direkt geprüft. Windows-Updates werden erst installiert, wenn ihre Signatur mit dem eingebauten öffentlichen Schlüssel übereinstimmt. Unsignierte Previews bleiben manuell installierbar.</div><button className="btn primary" disabled={busy} onClick={() => run(() => window.scarrix.update(), setNotice)}>↻ Nach Updates suchen</button></>}
          {settingsSection === 'about' && <><p className="eyebrow">SCARRIX COMMUNITY</p><h2>Über Scarrix Client</h2><p>Dein Launcher für Minecraft: Java Edition und das Scarrix-Netzwerk.</p><div className="setting-row"><div><h3>Lokale Diagnose</h3><p>Zeigt den Speicherort deiner Minecraft-Logs.</p></div><button className="btn outline" onClick={() => run(() => window.scarrix.logs(), setNotice)}>Logs anzeigen</button></div><div className="settings-note">Microsoft-/Minecraft-Anmeldung benötigt weiterhin die offizielle Freigabe. Nicht offiziell von Mojang Studios oder Microsoft unterstützt.</div><small>Open Source · MIT · v{appVersion}</small></>}
        </div></div>
      </section>}
      {showNewInstance && <div className="modal-backdrop" role="presentation" onClick={() => setShowNewInstance(false)}>
        <div className="instance-modal panel" role="dialog" aria-modal="true" aria-label="Neue Minecraft-Instanz erstellen" onClick={e => e.stopPropagation()}>
          <div className="modal-head"><div><p className="eyebrow">MINECRAFT</p><h2>{editingId ? 'Profil bearbeiten' : 'Neue Instanz erstellen'}</h2></div><button className="close-modal" onClick={() => setShowNewInstance(false)} aria-label="Schließen">×</button></div>
          <p>{editingId && 'Deine Dateien bleiben erhalten. Bei Versions- oder Loaderwechsel bitte die installierten Mods prüfen. '}Wähle deine Version, den Modloader und den verfügbaren RAM. Mods und Konfigurationen bleiben je Instanz getrennt.</p>
          <div className="wizard-steps">{["Version", "Modloader", "Profil & RAM"].map((label,i) => <span className={i === instanceStep ? "selected" : ""} key={label}>{i+1} · {label}</span>)}</div><div className={"modal-fields wizard-step-" + instanceStep}><label className="profile-name-field">PROFILNAME<input maxLength={50} value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder={draftVersion + " · " + draftLoader.toUpperCase()}/></label>
            <label>MINECRAFT-VERSION<select value={versions.includes(draftVersion) ? draftVersion : ""} onChange={e => setDraftVersion(e.target.value)} disabled={!versions.length}><option value="" disabled>Version auswählen</option>{versions.map(v => <option key={v} value={v}>{v}</option>)}</select><small>{versionError || "Offizielle Minecraft-Releases"}</small>{versionError && <button className="text-btn" onClick={loadVersions}>Erneut laden</button>}</label>
            <label>MODLOADER<select value={draftLoader} onChange={e => setDraftLoader(e.target.value as typeof draftLoader)}><option value="vanilla">Vanilla – Ohne Mods</option><option value="fabric">Fabric</option><option value="forge">Forge</option></select></label>
            <label>ARBEITSSPEICHER (RAM)<div className="ram-selector"><input type="range" min="512" max={memory?.maxMB ?? 512} step="256" disabled={!memory} value={draftRam * 1024} onChange={e => setDraftRam(Number(e.target.value) / 1024)}/><strong>{formatRam(draftRam * 1024)}</strong></div><small>{memory ? `512 MB bis ${formatRam(memory.maxMB)} physischer RAM · Empfohlen: ${formatRam(memory.recommendedMB)}. Die Hälfte bleibt für das System; Modpacks benötigen eventuell mehr.` : "Systemspeicher wird erkannt …"}</small></label>
          </div>
          <div className="modal-footer"><button className="btn outline" onClick={() => instanceStep ? setInstanceStep(instanceStep-1) : setShowNewInstance(false)}>{instanceStep ? "← Zurück" : "Abbrechen"}</button>{instanceStep < 2 ? <button className="btn primary" disabled={!versions.includes(draftVersion)} onClick={() => setInstanceStep(instanceStep+1)}>Weiter →</button> : <button className="btn primary" disabled={busy || !memory || !versions.includes(draftVersion)} onClick={createInstance}>{editingId ? 'Änderungen speichern' : '+ Profil erstellen'}</button>}</div>
        </div>
      </div>}
      <footer>SCARRIX CLIENT · v{appVersion} · Nicht offiziell von Mojang Studios oder Microsoft unterstützt · <span>Open Source / MIT</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

