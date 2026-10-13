import { IdleAnimation, type SkinViewer } from 'skinview3d';
// Rotation is an explicit launcher preference; passive idle motion follows the OS.
export function applySkinMotion(viewer: Pick<SkinViewer,'autoRotate'|'autoRotateSpeed'|'animation'>, rotate: boolean, animate: boolean, reducedMotion: boolean): void {
  viewer.autoRotate = rotate;
  viewer.autoRotateSpeed = .65;
  viewer.animation = animate && !reducedMotion ? new IdleAnimation() : null;
}
