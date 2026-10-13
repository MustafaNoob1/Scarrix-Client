import type { BrowserWindow } from 'electron';
export function controlWindow(window: BrowserWindow, action: unknown): boolean {
  if (!['state','minimize','maximize','close'].includes(String(action))) throw new Error('Unbekannte Fensteraktion.');
  if (window.isDestroyed()) return false;
  if (action === 'minimize') window.minimize();
  if (action === 'maximize') { if (window.isMaximized()) window.unmaximize(); else window.maximize(); }
  if (action === 'close') { window.close(); return false; }
  return window.isMaximized();
}
