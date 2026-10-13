# Scarrix Client – Downloads, Installer und Releases

## Automatischer Preview-Release

Bei jedem Push auf `main` startet GitHub Actions den Workflow `.github/workflows/release.yml`.
Er installiert die Abhängigkeiten mit `npm ci`, prüft TypeScript und die automatisierten Tests und baut:

- Windows: NSIS-Setup (`.exe`) mit Installationsassistent
- macOS: `.dmg` und `.zip` (ohne Apple-Notarisierung)
- Linux: `.AppImage` und `.deb`

Wenn **alle drei** Plattformen erfolgreich gebaut wurden, veröffentlicht GitHub Actions automatisch einen **Prärelease** namens `Scarrix Client 0.2.0 Preview #...` unter `Releases` und hängt die Installer an. Die Dateien bleiben außerdem 30 Tage als Actions-Artefakte verfügbar.

**Erster Schritt:** Auf GitHub unter `Actions` den Workflow und die Schritte prüfen. Unter `Releases` erscheint ein Download erst nach erfolgreich abgeschlossenem Lauf.

## Privates Repository = private Downloads

Das Repository ist privat. Deshalb können **nur berechtigte GitHub-Konten** Releases und Actions-Artefakte herunterladen. Für öffentliche Spieler-Downloads muss später ein öffentlicher Veröffentlichungsort eingerichtet werden, ohne Servergeheimnisse oder private Konfiguration hochzuladen.

Die automatische `electron-updater`-Aktualisierung funktioniert für öffentlich verteilte Installer aus einem privaten Repo **nicht ohne zusätzliche Update-Infrastruktur und Authentifizierung**. Bis dahin kann der Repository-Inhaber neue Installer manuell installieren.

## Warnungen und bekannte Grenzen

- **Microsoft/Minecraft OAuth**: App-Freigabe noch ausstehend. Spielstart erst danach prüfbar.
- **Windows SmartScreen**: Windows-Installer sind nicht mit einem Herausgeberzertifikat signiert.
- **macOS Gatekeeper**: Nicht signierte/nicht notarisierte App kann blockiert werden.
- **Java**: Minecraft 1.21.x benötigt normalerweise Java 21; Java separat installieren und Pfad prüfen.
- **Mod-Unterstützung**: Einige Mods erfordern Abhängigkeiten; sie werden noch nicht automatisch installiert.
- **Unterserver**: Ports sind nur Anzeige; Spielbeitritt geht über den öffentlichen Proxy `Scarrix.net:25565`.

## Release herunterladen

1. Privates Repository mit berechtigtem GitHub-Konto öffnen.
2. In GitHub `Actions` den Lauf `Scarrix Client installers and preview release` prüfen.
3. Nach erfolgreichem Build `Releases` öffnen.
4. Unter `Assets` für Windows die `.exe` auswählen, herunterladen und installieren.
5. Wenn kein Release sichtbar ist, die Fehlermeldung im GitHub-Actions-Job ansehen und zuerst beheben.

Der Preview-Release ist eine Testversion, kein fertig getesteter Produktionslauncher.
