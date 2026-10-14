# Scarrix Client – Downloads, Installer und Releases

## Automatischer Preview-Release

Bei jedem Push auf `main` startet GitHub Actions den Workflow `.github/workflows/release.yml`.
Er installiert die Abhängigkeiten mit `npm ci`, prüft TypeScript und die automatisierten Tests und baut:

- Windows: NSIS-Setup (`.exe`) mit Installationsassistent
- macOS: `.dmg` und `.zip` (ohne Apple-Notarisierung)
- Linux: `.AppImage` und `.deb`

Wenn **alle drei** Plattformen erfolgreich gebaut wurden, veröffentlicht GitHub Actions automatisch einen **Prärelease** namens `Scarrix Client 0.6.0-beta.N` unter `Releases` und hängt die Installer an. Die Dateien bleiben außerdem 30 Tage als Actions-Artefakte verfügbar.

**Erster Schritt:** Auf GitHub unter `Actions` den Workflow und die Schritte prüfen. Unter `Releases` erscheint ein Download erst nach erfolgreich abgeschlossenem Lauf.

## Updates selbst auswählen

Das Repository ist jetzt öffentlich; veröffentlichte Installer sind ohne GitHub-Token herunterladbar. Im installierten Windows-Launcher wird beim Start nur geprüft. Unter Einstellungen → Updates entscheidet der Benutzer mit „Update herunterladen“, ob die neue Version geladen wird. Fortschritt und Status werden angezeigt. „Installieren & neu starten“ fordert anschließend eine Neustart-Bestätigung an. Beim normalen Beenden findet keine automatische Installation statt.

Release-Metadaten tragen eine Ed25519-Signatur. Der Client enthält nur den öffentlichen Prüfschlüssel; der private Schlüssel bleibt im Actions-Secret. Installer und Update-Metadaten müssen zum signierten Manifest passen. Eine Änderung der Metadaten zwischen Prüfung und Download wird zurückgewiesen. Dies ersetzt kein Windows-Herausgeberzertifikat. macOS/Linux bieten den manuellen Installer-Download.

Bei erneuter privater Sichtbarkeit braucht es einen öffentlichen Distributionskanal. Niemals GitHub-Tokens in den Client einbetten.
## Warnungen und bekannte Grenzen

- **Microsoft/Minecraft OAuth**: App-Freigabe noch ausstehend. Spielstart erst danach prüfbar.
- **Windows SmartScreen**: Windows-Installer sind nicht mit einem Herausgeberzertifikat signiert.
- **macOS Gatekeeper**: Nicht signierte/nicht notarisierte App kann blockiert werden.
- **Java**: Minecraft 1.21.x benötigt normalerweise Java 21; Java separat installieren und Pfad prüfen.
- **Mod-Unterstützung**: Pflicht-Abhängigkeiten aus Modrinth/CurseForge werden automatisch installiert. Externe, optionale oder unpassende Dateien benötigen weiterhin eine manuelle Entscheidung.
- **Unterserver**: Ports sind nur Anzeige; Spielbeitritt geht über den öffentlichen Proxy `Scarrix.net:25565`.

## Release herunterladen

1. Öffentliches Scarrix-Repository öffnen.
2. In GitHub `Actions` den Lauf `Scarrix Client installers and preview release` prüfen.
3. Nach erfolgreichem Build `Releases` öffnen.
4. Unter `Assets` für Windows die `.exe` auswählen, herunterladen und installieren.
5. Wenn kein Release sichtbar ist, die Fehlermeldung im GitHub-Actions-Job ansehen und zuerst beheben.

Der Preview-Release ist eine Testversion, kein fertig getesteter Produktionslauncher.


Windows-In-App-Updates verwenden den Silent-Modus des geprüften NSIS-Pakets (`quitAndInstall(true, true)`): kein Setup-Assistent, automatische Rückkehr in den Launcher nach dem Anwenden. Technisch bleibt das signatur- und prüfsummengeprüfte Update-Paket erforderlich, damit gesperrte Programmdateien nach dem Beenden sicher ersetzt werden. Für die erste Installation bleibt ein normaler Installer verfügbar. Eine systemseitige Administratorabfrage kann bei einer Installation in geschützten Ordnern weiterhin erforderlich sein. Der Benutzer startet Download und Neustart ausdrücklich; normale Starts/Beenden lösen keine automatische Installation aus.

## Differenzielle Windows-Updates

Der Windows-Updater aktiviert differenzielle Downloads mit den bereits veröffentlichten .exe.blockmap-Dateien und einzelnen HTTP-Range-Anfragen. Unveränderte Blöcke stammen aus dem lokalen Installer-Cache. Die rekonstruierte Datei muss weiterhin sowohl die vollständige SHA512-Prüfsumme als auch die Prüfung gegen das signierte Release-Manifest bestehen. Ohne passenden Cache, bei fehlenden Blockmaps oder nicht funktionierenden Range-Downloads verwendet electron-updater einen vollständigen Download. Ein garantiert ausschließlich kleiner Patch bei jeder Installation ist damit nicht möglich. Die Umstellung greift erst ab der installierten Version mit aktiviertem Differential-Modus.

Ein Integrationstest verwendet den echten GenericDifferentialDownloader: Nur der geänderte von drei Blöcken wird über HTTP geladen, die gesamte Datei wiederhergestellt und geprüft. Manipulierte Patch-Daten schlagen an der abschließenden Prüfsumme fehl. Erstinstallation und Installations-/Neustart-Bestätigung bleiben unverändert.
