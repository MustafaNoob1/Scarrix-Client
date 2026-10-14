import {AccountManager,HomePreferences,Welcome,CrashAssistant} from './LauncherExtras';
import {FriendsDock} from './FriendsDock';
import {useMotionState} from './motion';
import {UiIcon,IconLabel} from './UiIcons';
import React, { useEffect, useState } from 'react';
import {UpdatePanel} from './UpdatePanel';
import { createRoot } from 'react-dom/client';
import {displayError} from './errors';
import type { Config, Profile, ModHit, SavedImage, DownloadStatus, GameSession } from './types';
import './style.css';
import './play.css';
import './clean.css';
import { SkinLibrary } from './SkinLibrary';
import { CapeLibrary } from './CapeLibrary';
import { CatalogBrowser } from './CatalogBrowser';
import {DownloadQueue} from './StudioTools';
import {ProfileStudio} from './ProfileStudio';
import { ProfilePicker } from './ProfilePicker';
import './studio.css';
import { InstanceLogs } from './InstanceLogs';
import './instance-logs.css';
import './responsive.css';
import { ScarrixMark } from './ScarrixMark';
import { AmbientBackground, backgrounds } from './AmbientBackground';
import { DownloadPanel, JavaPanel, InstalledModsPanel, DiagnosticsPanel } from './FeaturePanels';
import { SkinPreview } from './SkinPreview';
import './buttons.css';
import './motion.css';

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
  const [gameSessions,setGameSessions]=useState<GameSession[]>([]);
  const [showLogs,setShowLogs]=useState(false);
  const [accountManager,setAccountManager]=useState(false),[intro,setIntro]=useState(false),[crash,setCrash]=useState<GameSession|null>(null);
  const seenCrashes=React.useRef(new Set<string>());
  useEffect(()=>{for(const s of gameSessions)if(s.diagnosis&&!seenCrashes.current.has(s.id)){seenCrashes.current.add(s.id);setCrash(s);setNotice(s.diagnosis.title+' · Öffne Instanzen für Hinweise und Logs.');}},[gameSessions]);
  const runningCount=gameSessions.filter(s=>s.state!=='exited').length;
  useEffect(()=>{let cancelled=false;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const data=await window.scarrix.sessions.list();if(!cancelled)setGameSessions(data);}catch{}if(!cancelled)timer=setTimeout(poll,1000);};void poll();return()=>{cancelled=true;clearTimeout(timer);};},[]);
  const [config, setConfig] = useState<Config | null>(null);
  const [tab, rawSetTab] = useMotionState<Tab>('home');
  const [history, setHistory] = useState<Tab[]>(['home']);
  const [historyIndex,setHistoryIndex] = useState(0);
  const [accountMenu,setAccountMenu] = useState(false);
  const [noticeMenu,setNoticeMenu] = useState(false);
  const setTab = (next:Tab) => { rawSetTab(next);setAccountMenu(false);setNoticeMenu(false); if(next!==tab){setHistory([...history.slice(0,historyIndex+1),next]);setHistoryIndex(historyIndex+1);} };
  const go = (index:number) => {rawSetTab(history[index]);setHistoryIndex(index);setAccountMenu(false);setNoticeMenu(false);};
  const [capePreview,setCapePreview]=useState<{selectedId:string|null;dataUrl?:string}>({selectedId:null});
  useEffect(()=>{window.scarrix.capes.preview().then(setCapePreview).catch(()=>{});},[]);
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
  const [catalogTarget,setCatalogTarget]=useState<string|undefined>();
  const [playView, setPlayView] = useMotionState<'play' | 'profiles'>('play');
  const [settingsSection, setSettingsSection] = useMotionState('general');
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

  const run = async <T,>(job: () => Promise<T>, done?: (result:T) => void | Promise<void>) => {
    setBusy(true); setNotice('');
    try { const result = await job(); await done?.(result); }
    catch (e) { setNotice(displayError(e)); }
    finally { setBusy(false); }
  };
  const refresh = () => {
    window.scarrix.status().then(setStatus).catch(e => setNotice(String(e)));
    window.scarrix.statusModes().then(setBackendStatuses).catch(() => setBackendStatuses([]));
  };
  useEffect(() => {
    window.scarrix.config.get().then(c=>{setConfig(c);if(c.launcher.quickProfileId&&c.instances.some(i=>i.id===c.launcher.quickProfileId)&&c.activeInstanceId!==c.launcher.quickProfileId)void window.scarrix.config.save({...c,activeInstanceId:c.launcher.quickProfileId}).then(setConfig).catch(e=>setNotice(displayError(e)));}).catch(e => setNotice(String(e)));
    window.scarrix.version().then(setAppVersion).catch(() => {});
    window.scarrix.auth.profile().then(setProfile).catch(e => setNotice(e instanceof Error?e.message:String(e)));
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
    const oldInstance=config.instances.find(i=>i.id===editingId);
    const instance = { loaderVersion:oldInstance?.version===version&&oldInstance.loader===draftLoader?oldInstance.loaderVersion:undefined, id, name: instanceName.trim() || version + ' · ' + draftLoader.toUpperCase(), version, loader: draftLoader, ramGB: draftRam };
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
    useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!(e.ctrlKey||e.metaKey)||e.altKey||e.shiftKey||Array.from(document.querySelectorAll('[role="dialog"]')).some(d=>!d.closest('[inert]')&&d.getClientRects().length>0))return;const input=(e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]');if(e.key.toLowerCase()==='f'){const search=document.querySelector<HTMLInputElement>('.main input[placeholder*="durchsuchen"],.main input[placeholder*="suchen"]');if(search){e.preventDefault();search.focus();search.select();}return;}if(input)return;const routes=['home','home','mods','skins','capes'] as Tab[];if(/^[1-5]$/.test(e.key)){e.preventDefault();setTab(routes[Number(e.key)-1]);if(e.key==='1'||e.key==='2')setPlayView(e.key==='1'?'play':'profiles');}else if(e.key===','){e.preventDefault();setTab('settings');}else if(e.key.toLowerCase()==='l'){e.preventDefault();setShowLogs(true);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[tab,history,historyIndex]);
  const newProfile=()=>{setEditingId(null);setInstanceStep(0);setInstanceName('');setDraftRam(memory?memory.recommendedMB/1024:.5);setShowNewInstance(true);};
  if (!config) return <main className="loading">Scarrix Client wird vorbereitet …</main>;

  return <div className="shell" data-theme={config.launcher.theme} data-background={config.launcher.background ?? "grid"} data-animations={config.launcher.animations !== false}>
    <aside className="sidebar compact-sidebar">
      <button className="rail-brand" onClick={() => {setTab('home');setPlayView('play');}} title="Scarrix"><ScarrixMark decorative/></button>
      <nav>
        <button className={'nav ' + (tab === 'home' && playView === 'play' ? 'active' : '')} onClick={() => {setTab('home');setPlayView('play');}}><span><UiIcon glyph="▶"/></span><small>Spielen</small></button>
        <button className={'nav ' + (tab === 'home' && playView === 'profiles' ? 'active' : '')} onClick={() => {setTab('home');setPlayView('profiles');}}><span><UiIcon glyph="▣"/></span><small>Profile</small></button>
        {(['mods','skins','capes'] as Tab[]).map(item => <button key={item} className={'nav ' + (tab === item ? 'active' : '')} onClick={() => {if(item==='mods')setCatalogTarget(undefined);setTab(item);}}><span><IconLabel text={{mods:'⬡',skins:'◈',capes:'✧'}[item as 'mods'|'skins'|'capes']}/></span><small>{t[item]}</small></button>)}
      </nav>
      <div className="grow"/>
      <button className={'nav ' + (tab === 'settings' ? 'active' : '')} onClick={() => setTab('settings')}><span><UiIcon glyph="⚙"/></span><small>Optionen</small></button>
    </aside>
    <main className="main"><AmbientBackground mode={config.launcher.background ?? "aurora"} animated={config.launcher.backgroundMotion !== 'off'} motion={config.launcher.backgroundMotion ?? 'on'}/>
      <header className="client-topbar">
        <div className="topbar-left"><button className="header-icon" aria-label="Zurück" disabled={historyIndex===0} onClick={()=>go(historyIndex-1)}><UiIcon glyph="←"/></button><button className="header-icon" aria-label="Vorwärts" disabled={historyIndex===history.length-1} onClick={()=>go(historyIndex+1)}><UiIcon glyph="→"/></button><div className="topbar-brand"><div><b>SCARRIX</b><small>v{appVersion}</small></div></div></div>
        <div className="topbar-actions"><DownloadQueue onConfig={setConfig}/>
          <div className="header-popup-anchor"><button className="header-icon notification-button" aria-label="Mitteilungen" aria-expanded={noticeMenu} onClick={()=>{setNoticeMenu(!noticeMenu);setAccountMenu(false);}}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{notice&&<i/>}</button>{noticeMenu&&<div className="header-popup"><b>Mitteilungen</b><p>{notice||'Du bist auf dem neuesten Stand.'}</p><button disabled={busy} onClick={()=>{setNoticeMenu(false);run(()=>window.scarrix.update(),setNotice);}}>Nach Updates suchen</button></div>}</div>
          <button className={"instance-chip "+(runningCount?'has-running':'')} onClick={()=>{setShowLogs(true);setAccountMenu(false);setNoticeMenu(false);}}><UiIcon glyph="▣"/> <span>{runningCount} {runningCount===1?'INSTANZ':'INSTANZEN'}</span></button>
          <div className="header-popup-anchor"><button className="account-chip" aria-expanded={accountMenu} onClick={()=>{setAccountMenu(!accountMenu);setNoticeMenu(false);}}><AccountFace skin={profile?.skins?.[0]?.url}/><b>{profile?.name||'ANMELDEN'}</b><span><UiIcon glyph="▾"/></span></button>{accountMenu&&<div className="header-popup"><b>{profile?.name||'Minecraft-Konto'}</b><p>{profile?'Dein verknüpftes Konto':'Verknüpfe dein Microsoft-Konto.'}</p><button disabled={busy} onClick={()=>{setAccountMenu(false);profile?setTab('skins'):connect();}}>{profile?'Skin ändern':'Microsoft anmelden'}</button><button disabled={busy} onClick={()=>{setAccountMenu(false);setAccountManager(true);}}>Konten verwalten</button>{profile&&<button disabled={busy} onClick={()=>{setAccountMenu(false);run(()=>window.scarrix.auth.logout(),()=>setProfile(null));}}>Abmelden</button>}</div>}</div>
          <FriendsDock key={profile?.id??'guest'} profile={profile}/><button className="header-icon framed github-shortcut" aria-label="GitHub öffnen" onClick={()=>run(()=>window.scarrix.openUrl('https://github.com/MustafaNoob1/scarrix-client'))}><UiIcon glyph="↗"/></button>
          <div className="window-buttons"><button aria-label="Minimieren" onClick={()=>window.scarrix.windowControl('minimize')}>—</button><button aria-label="Maximieren oder Wiederherstellen" onClick={()=>window.scarrix.windowControl('maximize')}><UiIcon glyph="□"/></button><button className="close-window" aria-label="Schließen" onClick={()=>window.scarrix.windowControl('close')}><UiIcon glyph="×"/></button></div>
        </div>
      </header>
      {notice && <div className="alert" role="status"><b>{t.notice}:</b> {notice}<button aria-label="Schließen" onClick={() => setNotice('')}><UiIcon glyph="×"/></button></div>}
      {download && <DownloadPanel status={download} onClose={()=>setDownload(null)}/>}
      {progress !== null && <div className="progress"><div style={{width: `${progress}%`}}></div><span>{progress}%</span></div>}
      {device && <section className="device panel"><h2>Microsoft-Anmeldung</h2><p>Öffne die Microsoft-Seite im Browser und gib dort den Code ein. Dein Passwort gehört ausschließlich auf die offizielle Microsoft-Seite.</p><div className="device-row"><code>{device.code}</code><button className="btn" onClick={() => window.scarrix.openUrl(device.url).catch(e => setNotice(String(e)))}>Microsoft-Anmeldeseite öffnen <UiIcon glyph="↗"/></button></div><small>{device.url}</small></section>}


      {tab === 'home' && playView==='play' && <div className={"play-layout "+(config.launcher.showNews===false?"no-news":"")}>
        <div className="play-main">
          <div className="play-tabs"><button className='selected' onClick={() => setPlayView('play')}>SPIELEN</button><button className='' onClick={() => setPlayView('profiles')}>MEINE PROFILE <span>{config.instances.length}</span></button></div>
          {<section className="character-stage" data-skin-size={config.launcher.skinSize??"medium"}>
            <label className="rotation-toggle"><input type="checkbox" checked={config.launcher.rotateSkin !== false} onChange={e => save({...config,launcher:{...config.launcher,rotateSkin:e.target.checked}})}/> Skin-Rotation</label>
            <div className="stage-eyebrow">{profile ? "DEIN MINECRAFT-PROFIL" : "DEIN ABENTEUER BEGINNT HIER"}</div>
            <SkinPreview cape={capePreview.dataUrl??profile?.capes.find(c=>c.state==='ACTIVE')?.url} skin={profile?.skins?.[0]?.url} nameTag={profile?.name ?? "Gast"} model={profile?.skins?.[0]?.variant?.toLowerCase() === "slim" ? "slim" : "classic"} rotate={config.launcher.rotateSkin !== false} animate={config.launcher.animations !== false}/>
            <div className="character-platform"/>
            <div className="stage-launch">
              <div className="launch-split"><button className="btn primary" disabled={busy || !profile || !selectedMode} onClick={() => run(() => window.scarrix.game(selectedMode!.id), async v=>{setNotice(v);setProfile(await window.scarrix.auth.profile());})}><span className="button-label"><UiIcon glyph="▶"/> {busy ? 'WIRD VORBEREITET …' : 'SPIELEN'}</span><small>{activeInstance?.version} · {activeInstance?.loader.toUpperCase()}</small></button><ProfilePicker instances={config.instances} selected={activeInstance?.id??''} disabled={busy} onSelect={chooseInstance}/></div>
              {!profile && <button className="text-btn" disabled={busy} onClick={connect}>Mit Microsoft anmelden, um zu spielen</button>}
              <div className="stage-links"><button className="text-btn" onClick={() => setTab('skins')}><UiIcon glyph="◈"/> Skin ändern</button><button className="text-btn" disabled={busy} onClick={() => {setEditingId(null);setInstanceStep(0);setInstanceName('');setDraftRam(memory ? memory.recommendedMB/1024 : .5);setShowNewInstance(true);}}>+ Neues Profil</button><button className="text-btn" disabled={busy} onClick={() => run(() => window.scarrix.gamePrepare(), setNotice)}>Dateien vorbereiten</button></div>
            </div>
            <div className="stage-server"><span className={'dot' + (status?.online ? ' online' : '')}/><b>SCARRIX.NET</b><span>{status?.players ?? '—'} Spieler online</span><select aria-label="Spielmodus auswählen" value={selectedModeId} onChange={e => setSelectedModeId(e.target.value)}>{config.modes.map(m => <option value={m.id} key={m.id}>{m.group ? m.group + ' / ' : ''}{m.name}</option>)}</select></div>
          </section>}
        </div>
        {config.launcher.showNews!==false&&<aside className="news-rail"><p className="eyebrow">NEUIGKEITEN</p><h2>Scarrix Network</h2>{config.news.length ? config.news.map((n,i) => <article className="news-tile" key={i}><div className="news-art"><ScarrixMark decorative/></div><h3>{n.title}</h3><p>{n.text}</p></article>) : <><article className="news-tile"><div className="news-art landscape"><ScarrixMark decorative/><span>SCARRIX</span></div><h3>Dein nächstes Abenteuer</h3><p>Wähle dein Profil und starte ins Scarrix-Netzwerk.</p></article><article className="news-tile"><div className="news-art blocks"><UiIcon glyph="⬡"/></div><h3>Dein Spiel. Dein Profil.</h3><p>Vanilla, Fabric oder Forge — jede Instanz hat ihre eigenen Mods.</p><button className="text-btn" onClick={() => setPlayView('profiles')}>Profile öffnen <UiIcon glyph="↗"/></button></article></>}<div className="news-rail-footer">COMMUNITY LAUNCHER<small>Nicht offiziell von Mojang oder Microsoft.</small></div></aside>}
      </div>}

      {tab==='home'&&playView==='profiles'&&<ProfileStudio onProfile={setProfile} config={config} account={profile} busy={busy} run={run} onConfig={setConfig} modeId={selectedMode?.id??config.modes[0]?.id??''} connect={connect} onCreate={()=>{setEditingId(null);setInstanceStep(0);setInstanceName('');setDraftRam(memory?memory.recommendedMB/1024:.5);setShowNewInstance(true);}} onCatalog={id=>{setCatalogTarget(id);setTab('mods');}}/>}
      {tab === 'mods' && <CatalogBrowser targetInstanceId={catalogTarget} config={config} busy={busy} run={run} versions={versions} onProfiles={()=>{setTab('home');setPlayView('profiles');}}/>}

      {tab === 'skins' && <SkinLibrary config={config} profile={profile} busy={busy} run={run} onProfile={setProfile} connect={connect}/>}
      {tab === 'capes' && <CapeLibrary config={config} profile={profile} busy={busy} run={run} onProfile={setProfile} onPreview={setCapePreview}/>}

      {tab === 'settings' && <section className="settings-window">
        <div className="settings-title"><h2><UiIcon glyph="⚙"/> Einstellungen</h2><span>Launcher · v{appVersion}</span></div>
        <div className="settings-layout"><nav className="settings-nav">{[{id:'general',icon:'⚙',name:'Allgemein'},{id:'appearance',icon:'◈',name:'Darstellung'},{id:'java',icon:'▧',name:'Java'},{id:'diagnostics',icon:'≡',name:'Fehlerdiagnose'},{id:'updates',icon:'↻',name:'Updates'},{id:'about',icon:'ⓘ',name:'Über & Diagnose'}].map(s => <button key={s.id} className={settingsSection === s.id ? 'selected' : ''} onClick={() => setSettingsSection(s.id)}><UiIcon glyph={s.icon}/> {s.name}</button>)}</nav>
        <div className="settings-content">
          {settingsSection === 'general' && <><p className="eyebrow">ALLGEMEIN</p><h2>Mach den Launcher zu deinem.</h2><div className="setting-row"><div><h3>Sprache</h3><p>Sprache der Launcher-Navigation.</p></div><select value={config.language} disabled={busy} onChange={e => save({...config,language:e.target.value as 'de'|'en'})}><option value="de">Deutsch</option><option value="en">English</option></select></div><div className="setting-row"><div><h3>Minecraft-Konto</h3><p>{profile ? 'Angemeldet als ' + profile.name : 'Noch nicht angemeldet'}</p></div><button className="btn outline" disabled={busy} onClick={profile ? () => run(() => window.scarrix.auth.logout(), () => setProfile(null)) : connect}>{profile ? 'Abmelden' : 'Anmelden'}</button></div><div className="setting-row"><div><h3>Anmeldung merken</h3><p>Stellt dein Konto nach einem Neustart automatisch wieder her. Speicherung nur mit sicherer Systemverschlüsselung.</p></div><input className="switch" type="checkbox" checked={config.launcher.rememberAccount !== false} disabled={busy} onChange={e=>save({...config,launcher:{...config.launcher,rememberAccount:e.target.checked}})}/></div><HomePreferences config={config} busy={busy} save={save} onIntro={()=>setIntro(true)}/><div className="settings-note">Version, Modloader und RAM wählst du beim Erstellen eines Minecraft-Profils.</div></>}
          {settingsSection === 'appearance' && <><p className="eyebrow">DARSTELLUNG</p><h2>Dein Stil.</h2><div className="setting-row stacked"><div><h3>Akzentfarbe</h3><p>Dunkler Hintergrund mit deiner Lieblingsfarbe.</p></div><div className="color-options">{(['red','blue','purple','gold'] as const).map(theme => <button key={theme} aria-label={{red:'Rot',blue:'Blau',purple:'Lila',gold:'Gold'}[theme]} aria-pressed={config.launcher.theme === theme} className={'color-choice ' + theme} disabled={busy} onClick={() => save({...config,launcher:{...config.launcher,theme}})}><IconLabel text={config.launcher.theme === theme ? '✓' : ''}/></button>)}</div></div><div className="setting-row"><div><h3>Skin-Rotation</h3><p>Automatische Drehung auf der Spielen-Seite, unabhängig von der Windows-Bewegungseinstellung. Mit der Maus kannst du ihn jederzeit drehen.</p></div><input className="switch" type="checkbox" checked={config.launcher.rotateSkin !== false} disabled={busy} onChange={e => save({...config,launcher:{...config.launcher,rotateSkin:e.target.checked}})}/></div><div className="setting-row"><div><h3>Animationen</h3><p>Skin-Bewegung und dezente Übergänge.</p></div><input className="switch" type="checkbox" checked={config.launcher.animations !== false} disabled={busy} onChange={e => save({...config,launcher:{...config.launcher,animations:e.target.checked}})}/></div><div className="setting-row stacked background-setting"><div><h3>Animierter Hintergrund</h3><p>Wähle die Atmosphäre. Die Hintergrundbewegung steuerst du unabhängig von der Skin-Animation.</p></div><label className="background-motion">Bewegung<select disabled={busy} value={config.launcher.backgroundMotion??'on'} onChange={e=>save({...config,launcher:{...config.launcher,backgroundMotion:e.target.value as 'on'|'off'|'system'}})}><option value="on">Ein – immer animiert</option><option value="system">Windows-Einstellung folgen</option><option value="off">Aus</option></select></label><div className="background-options">{backgrounds.map(bg=><button key={bg.id} className={config.launcher.background === bg.id ? "selected" : ""} aria-pressed={config.launcher.background === bg.id} disabled={busy} onClick={()=>save({...config,launcher:{...config.launcher,background:bg.id}})}><div className={"background-thumbnail thumbnail-"+bg.id}><span><IconLabel text={bg.icon}/></span></div><b>{bg.name}</b><small>{bg.detail}</small>{config.launcher.background === bg.id && <i><UiIcon glyph="✓"/></i>}</button>)}</div></div></>}
          {settingsSection === 'java' && <JavaPanel busy={busy} run={run}/>}
          {settingsSection === 'diagnostics' && <DiagnosticsPanel busy={busy} run={run}/>}
          {settingsSection === 'updates' && <UpdatePanel version={appVersion} busy={busy} run={run}/>}
          {settingsSection === 'about' && <><p className="eyebrow">SCARRIX COMMUNITY</p><h2>Über Scarrix Client</h2><p>Dein Launcher für Minecraft: Java Edition und das Scarrix-Netzwerk.</p><div className="setting-row"><div><h3>Lokale Diagnose</h3><p>Zeigt den Speicherort deiner Minecraft-Logs.</p></div><button className="btn outline" onClick={() => run(() => window.scarrix.logs(), setNotice)}>Logs anzeigen</button></div><div className="settings-note">Microsoft-/Minecraft-Anmeldung benötigt weiterhin die offizielle Freigabe. Nicht offiziell von Mojang Studios oder Microsoft unterstützt.</div><small>Open Source · MIT · v{appVersion}</small></>}
        </div></div>
      </section>}
      {showNewInstance && <div className="modal-backdrop" role="presentation" onClick={() => setShowNewInstance(false)}>
        <div className="instance-modal panel" role="dialog" aria-modal="true" aria-label="Neue Minecraft-Instanz erstellen" onClick={e => e.stopPropagation()}>
          <div className="modal-head"><div><p className="eyebrow">MINECRAFT</p><h2>{editingId ? 'Profil bearbeiten' : 'Neue Instanz erstellen'}</h2></div><button className="close-modal" onClick={() => setShowNewInstance(false)} aria-label="Schließen"><UiIcon glyph="×"/></button></div>
          <p>{editingId && 'Deine Dateien bleiben erhalten. Bei Versions- oder Loaderwechsel bitte die installierten Mods prüfen. '}Wähle deine Version, den Modloader und den verfügbaren RAM. Mods und Konfigurationen bleiben je Instanz getrennt.</p>
          <div className="wizard-steps">{["Version", "Modloader", "Profil & RAM"].map((label,i) => <span className={i === instanceStep ? "selected" : ""} key={label}>{i+1} · {label}</span>)}</div><div className={"modal-fields wizard-step-" + instanceStep}><label className="profile-name-field">PROFILNAME<input maxLength={50} value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder={draftVersion + " · " + draftLoader.toUpperCase()}/></label>
            <label>MINECRAFT-VERSION<select value={versions.includes(draftVersion) ? draftVersion : ""} onChange={e => setDraftVersion(e.target.value)} disabled={!versions.length}><option value="" disabled>Version auswählen</option>{versions.map(v => <option key={v} value={v}>{v}</option>)}</select><small>{versionError || "Offizielle Minecraft-Releases"}</small>{versionError && <button className="text-btn" onClick={loadVersions}>Erneut laden</button>}</label>
            <label>MODLOADER<select value={draftLoader} onChange={e => setDraftLoader(e.target.value as typeof draftLoader)}><option value="vanilla">Vanilla – Ohne Mods</option><option value="fabric">Fabric</option><option value="forge">Forge</option></select></label>
            <label>ARBEITSSPEICHER (RAM)<div className="ram-selector"><input type="range" min="512" max={memory?.maxMB ?? 512} step="256" disabled={!memory} value={draftRam * 1024} onChange={e => setDraftRam(Number(e.target.value) / 1024)}/><strong>{formatRam(draftRam * 1024)}</strong></div><small>{memory ? `512 MB bis ${formatRam(memory.maxMB)} physischer RAM · Empfohlen: ${formatRam(memory.recommendedMB)}. Die Hälfte bleibt für das System; Modpacks benötigen eventuell mehr.` : "Systemspeicher wird erkannt …"}</small></label>
          </div>
          <div className="modal-footer"><button className="btn outline" onClick={() => instanceStep ? setInstanceStep(instanceStep-1) : setShowNewInstance(false)}><IconLabel text={instanceStep ? "← Zurück" : "Abbrechen"}/></button>{instanceStep < 2 ? <button className="btn primary" disabled={!versions.includes(draftVersion)} onClick={() => setInstanceStep(instanceStep+1)}>Weiter <UiIcon glyph="→"/></button> : <button className="btn primary" disabled={busy || !memory || !versions.includes(draftVersion)} onClick={createInstance}>{editingId ? 'Änderungen speichern' : '+ Profil erstellen'}</button>}</div>
        </div>
      </div>}
      {accountManager&&<AccountManager profile={profile} run={run} onProfile={setProfile} onClose={()=>setAccountManager(false)} connect={connect}/>}
      {(intro||config.launcher.onboardingDone!==true)&&<Welcome config={config} memory={memory} busy={busy} save={save} onClose={()=>setIntro(false)} onCreate={newProfile}/>}
      {crash&&!showLogs&&<CrashAssistant session={crash} onClose={()=>setCrash(null)} onLogs={()=>{setCrash(null);setShowLogs(true);}} onProfiles={()=>{setCrash(null);setTab('home');setPlayView('profiles');}}/>}
      {showLogs&&<InstanceLogs sessions={gameSessions} onClose={()=>setShowLogs(false)}/>}
      <footer>SCARRIX CLIENT · v{appVersion} · Nicht offiziell von Mojang Studios oder Microsoft unterstützt · <span>Open Source / MIT</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

