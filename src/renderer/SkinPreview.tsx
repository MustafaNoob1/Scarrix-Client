import React, { useEffect, useRef, useState } from 'react';
import { SkinViewer, IdleAnimation, NameTagObject } from 'skinview3d';
export function SkinPreview({ skin, rotate, animate, model, nameTag }: { skin?: string; rotate: boolean; animate: boolean; model?: 'classic' | 'slim'; nameTag?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<'loading'|'ready'|'placeholder'>('loading');
  useEffect(() => {
    if (!canvas.current) return;
    let viewer: SkinViewer | undefined;
    let motionQuery: MediaQueryList | undefined;
    let motionChanged: (()=>void) | undefined;
    let disposed = false;
    setFailed(false);
    setPhase(skin ? 'loading' : 'placeholder');
    try {
      viewer = new SkinViewer({ canvas: canvas.current, width: 360, height: 430 });
      viewer.zoom = nameTag ? .76 : .85;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery = reducedMotion;
      motionChanged = ()=>{if(viewer){viewer.autoRotate=rotate&&!reducedMotion.matches;viewer.animation=animate&&!reducedMotion.matches?new IdleAnimation():null;}};
      reducedMotion.addEventListener('change',motionChanged);
      viewer.autoRotate = rotate && !reducedMotion.matches;
      viewer.autoRotateSpeed = .35;
      viewer.animation = animate && !reducedMotion.matches ? new IdleAnimation() : null;
      if(nameTag) viewer.nameTag = new NameTagObject(nameTag.slice(0,32),{font:"bold 40px 'Segoe UI', sans-serif",height:2.3,margin:[9,16,9,16],backgroundStyle:'rgba(6,8,14,.78)',textStyle:'#f6f6fa',repaintAfterLoaded:false});
      viewer.controls.enableZoom = false;
      viewer.controls.enablePan = false;
      const placeholder = document.createElement('canvas');
      placeholder.width = 64; placeholder.height = 64;
      const ctx = placeholder.getContext('2d')!;
      ctx.fillStyle = '#838997'; ctx.fillRect(0,0,32,16);
      ctx.fillStyle = '#202632';ctx.fillRect(0,0,32,8);
      ctx.fillStyle = '#252b38';ctx.fillRect(16,16,24,16);ctx.fillRect(40,16,16,16);ctx.fillRect(32,48,16,16);
      ctx.fillStyle = '#171d28';ctx.fillRect(0,16,16,16);ctx.fillRect(16,48,16,16);
      ctx.fillStyle = '#c43149';ctx.fillRect(20,20,8,2);ctx.fillRect(44,20,4,2);ctx.fillRect(36,52,4,2);
      ctx.fillStyle = '#e8eaf0';ctx.fillRect(9,11,2,1);ctx.fillRect(13,11,2,1);
      ctx.fillRect(22,24,4,1);ctx.fillRect(21,25,2,2);ctx.fillRect(22,27,4,1);ctx.fillRect(25,28,1,1);ctx.fillRect(21,29,5,1);
      const current = viewer;
      const fallback=()=>{if(!disposed)void current.loadSkin(placeholder.toDataURL(),{model:'default'}).then(()=>{if(!disposed)setPhase('placeholder');}).catch(()=>{if(!disposed)setFailed(true);});};
      if(skin) void current.loadSkin(skin,{model:model==='classic'?'default':model}).then(()=>{if(!disposed)setPhase('ready');}).catch(fallback);
      else fallback();
    } catch { setFailed(true); }
    return () => { disposed = true;if(motionQuery&&motionChanged)motionQuery.removeEventListener('change',motionChanged);viewer?.dispose(); };
  }, [skin, rotate, animate, model, nameTag]);
  return <div className="skin-preview"><canvas ref={canvas} aria-label={nameTag ? 'Minecraft-Skin von '+nameTag+' mit Namensschild' : 'Minecraft-Skin, mit der Maus drehbar'} hidden={failed}/>{failed && <div className="skin-unavailable">◈<small>3D-Vorschau nicht verfügbar</small></div>}{!failed&&nameTag&&<small className="skin-status" role="status">{phase==='loading'?'Skin wird geladen …':phase==='placeholder'?(skin?'Skin nicht erreichbar · Platzhalter':'Platzhalter · Kein Konto verknüpft'):'Mit der Maus drehen'}</small>}</div>;
}
