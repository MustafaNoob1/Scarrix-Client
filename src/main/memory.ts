import os from 'node:os';
export function memoryInfo(bytes = os.totalmem()) {
  const maxMB = Math.floor(bytes / 1024 / 1024 / 256) * 256;
  if (!Number.isFinite(maxMB) || maxMB < 512) throw new Error('Systemspeicher konnte nicht zuverlässig erkannt werden.');
  const recommendedMB = Math.max(512, Math.min(8192, Math.floor(maxMB / 2 / 256) * 256));
  return { maxMB, recommendedMB };
}
export function validMemory(gb: number, maxMB = memoryInfo().maxMB) {
  const mb = gb * 1024;
  return Number.isFinite(mb) && Number.isInteger(mb) && mb >= 512 && mb <= maxMB && mb % 256 === 0;
}
