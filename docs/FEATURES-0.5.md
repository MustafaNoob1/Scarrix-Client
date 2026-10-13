# Scarrix 0.5
- Profile bearbeiten: Name, Version, Vanilla/Fabric/Forge und RAM. Das Profil behält seinen Datenordner bei Versionswechseln; Mods müssen kompatibel sein.
- Profile kopieren, importieren und exportieren als Scarrix ZIP. Enthalten sind Einstellungen, Mods, config, resourcepacks, shaderpacks und saves. Keine Zugangsdaten oder Logs. Grenzen: 16 Profile, 300 MB Import-ZIP, 1 GB entpackt.
- Java automatisch passend zur offiziellen Minecraft-Metadatei installieren. Windows/macOS/Linux und x64/arm64 werden durch die Adoptium-Verfügbarkeit bestimmt. SHA256-geprüft, Installation nur im Launcher-Datenordner.
- Installierte Mods aktivieren/deaktivieren und entfernen. Entfernte Dateien bleiben unter removed-mods.
- Download-Schritte, übertragenes Volumen, Geschwindigkeit, Dateizahl und geschätzte Restzeit. Unbekannte Gesamtgrößen werden nicht als erfundene Prozentwerte dargestellt.
- Launcher- und Minecraft-Logs ansehen, Ordner öffnen und lokal exportieren. Keine automatische Weitergabe.
- Öffentliche GitHub-Updates: Version prüfen, signierte Windows-NSIS-Datei herunterladen, Fortschritt, Installation und Neustart nach Bestätigung.

## Noch erforderlich
Für automatisch installierbare Updates muss das Repository-Secret SCARRIX_UPDATE_PRIVATE_KEY einmal eingerichtet werden. Der Client enthält nur den öffentlichen Ed25519-Schlüssel. Der private Schlüssel wird nicht ins Repository hochgeladen. Ohne Secret erstellt die Pipeline weiterhin manuell installierbare Previews, aber keine akzeptierte Update-Signatur.
Alte Clients bis 0.4.1 hatten einen abgeschalteten Updater. Die erste 0.5-Vorschau daher einmal manuell installieren.
macOS/Linux zeigen neue Versionen an, automatische Installation ist für diese Plattformen noch nicht freigeschaltet.
Der Minecraft-Login und echtes Spielen benötigen weiterhin die offizielle App-Freigabe. Diese Implementierung umgeht sie nicht.
