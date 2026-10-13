let active: string | null = null;
let gameRunning = false;
export function setGameRunning(value:boolean) { gameRunning=value; }
export function operationName() { return active; }
export function assertIdle() { if (active) throw new Error('Bitte warte, bis ' + active + ' abgeschlossen ist.'); if(gameRunning)throw new Error('Bitte beende zuerst Minecraft.'); }
export async function exclusive<T>(name: string, action: () => Promise<T>): Promise<T> {
  assertIdle(); active = name;
  try { return await action(); } finally { active = null; }
}
