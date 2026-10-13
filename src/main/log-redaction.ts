export function redact(text:string) {
  return text.replace(/(?:Bearer\s+)[A-Za-z0-9._~-]+/gi,'Bearer [entfernt]').replace(/(--accessToken\s+|access[_-]?token["']?[=:]\s*["']?)[^\s"'&]+/gi,'$1[entfernt]').replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/g,'[Token entfernt]');
}
