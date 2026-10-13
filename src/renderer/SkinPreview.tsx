import React, { useEffect, useRef, useState } from 'react';
import { SkinViewer, IdleAnimation } from 'skinview3d';
export function SkinPreview({ skin, rotate, animate }: { skin?: string; rotate: boolean; animate: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!canvas.current) return;
    let viewer: SkinViewer | undefined;
    let disposed = false;
    setFailed(false);
    try {
      viewer = new SkinViewer({ canvas: canvas.current, width: 360, height: 430 });
      viewer.zoom = .85;
      viewer.autoRotate = rotate;
      viewer.autoRotateSpeed = .35;
      viewer.animation = animate ? new IdleAnimation() : null;
      viewer.controls.enableZoom = false;
      viewer.controls.enablePan = false;
      const placeholder = document.createElement('canvas');
      placeholder.width = 64; placeholder.height = 64;
      const ctx = placeholder.getContext('2d')!;
      ctx.fillStyle = '#b88166'; ctx.fillRect(0, 0, 64, 64);
      ctx.clearRect(32, 0, 32, 16);
      ctx.clearRect(0, 32, 64, 16); ctx.clearRect(0, 48, 16, 16); ctx.clearRect(48, 48, 16, 16);
      ctx.fillStyle = '#19191e'; ctx.fillRect(0, 0, 32, 8); ctx.fillRect(16, 16, 24, 16);
      ctx.fillStyle = '#bc3040'; ctx.fillRect(20, 20, 8, 3);
      ctx.fillStyle = '#24252c'; ctx.fillRect(0, 16, 16, 16); ctx.fillRect(16, 48, 16, 16);
      ctx.fillStyle = '#eee'; ctx.fillRect(9, 11, 2, 1); ctx.fillRect(13, 11, 2, 1);
      const current = viewer;
      void current.loadSkin(skin || placeholder.toDataURL()).catch(() => {
        if (!disposed) void current.loadSkin(placeholder.toDataURL()).catch(() => setFailed(true));
      });
    } catch { setFailed(true); }
    return () => { disposed = true; viewer?.dispose(); };
  }, [skin, rotate, animate]);
  return <div className="skin-preview"><canvas ref={canvas} aria-label="Minecraft-Skin, mit der Maus drehbar" hidden={failed}/>{failed && <div className="skin-unavailable">◈<small>3D-Vorschau nicht verfügbar</small></div>}</div>;
}
