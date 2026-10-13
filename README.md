# Scarrix Client 🟢

**Open-Source-Minecraft-Java-Launcher für Scarrix.net (inoffizieller Community-Prototyp).**

Der Launcher ist als **Electron + TypeScript + React**-Projekt aufgebaut und stellt eine Benutzeroberfläche mit Startseite, Serverstatus, Microsoft-Anmeldung, Mod-Browser, Skin-Bibliothek, offiziellem Cape-Wechsel und Einstellungen bereit.

> ⚠️ **Status: Entwickler-Prototyp (v0.1.1), kein getesteter Release.** Microsoft/Minecraft-Authentifizierung benötigt eine passende App-Registrierung und eventuell eine zusätzliche Minecraft-Services-Zulassung. Builds und echter Minecraft-Start müssen auf Windows/macOS/Linux noch geprüft werden. Microsoft, Mojang und Scarrix.net haben den Client nicht offiziell bestätigt.

## Voraussetzungen

- **Node.js 22** (inkl. npm); Git optional; Terminal/PowerShell und Texteditor wie VS Code.
- **Java 21** für viele Minecraft-1.21-Versionen (bei anderen Versionen können andere Java-Versionen nötig sein).
- Internet für die erstmaligen Downloads, ein **Microsoft-Konto mit Minecraft: Java Edition** für den regulären Spielstart.
- Eine Microsoft Entra **Application (Client) ID** und ggf. Freigabe durch Minecraft Services (siehe [detaillierte Microsoft-Anleitung](docs/MICROSOFT-LOGIN.md)).
- **CurseForge API-Key** optional; für Modrinth ist keiner nötig.

## Schnelllösung: Absturz mit autoUpdater / falsche Node-Version

Fehlermeldung: `Cannot destructure property 'autoUpdater' of 'electron_updater_1.default' as it is undefined`. In v0.1.0 war der `electron-updater`-Import falsch. **In v0.1.1 korrigiert:**

```ts
import { autoUpdater } from 'electron-updater';
```

`const { autoUpdater } = electronUpdater;` gehört nicht mehr in die Datei.

Unter Windows zuerst Node.js 22.12+ installieren, PowerShell **neu starten** und im Projektordner ausführen:

```powershell
node --version
npm install
npm run typecheck
npm test
npm run dev
```

Die früheren `EBADENGINE`-Warnungen stammen von Node 20. Wenn `npm install` noch nicht funktioniert, `node_modules` und `package-lock.json` entfernen und erneut installieren (gespeicherte Launcher-Einstellungen nicht löschen). **`npm audit fix --force` nicht unüberlegt ausführen**, da es inkompatible Hauptversions-Upgrades auslösen kann.

> **Hinweis zu GitHub:** Das Repository ist öffentlich; die hier angezeigten Backend-IPs und Ports sind daher ebenfalls öffentlich, sobald du diese Konfiguration hochlädst. Nur veröffentlichen, wenn dies für deinen Server ausdrücklich vorgesehen ist.

## In 10 Schritten zum ersten Start

### 1. Werkzeuge installieren

1. Node.js (LTS/Node 22): https://nodejs.org/
2. Git: https://git-scm.com/downloads (optional)
3. VS Code: https://code.visualstudio.com/ (optional)
4. Java 21, z. B. Eclipse Temurin: https://adoptium.net/
5. Terminal neu öffnen, Versionen prüfen:

```sh
node --version
npm --version
java -version
```

### 2. Projektordner öffnen

Entpacke das Projektarchiv in einen Ordner `scarrix-client`. In VS Code **Datei → Ordner öffnen** wählen; anschließend **Terminal → Neues Terminal**. Terminal muss im Projektordner stehen, in dem `package.json` liegt.

### 3. Abhängigkeiten installieren

```sh
npm install
```

Dieser Befehl benötigt eine aktive Internetverbindung. Danach entsteht `node_modules/` und eine `package-lock.json`; letztere für reproduzierbare GitHub-Builds **mit committen**.

### 4. Konfiguration prüfen

`config.json` enthält eine Beispielkonfiguration. Öffne sie und prüfe beispielsweise:

```json
{
  "server": { "name": "Scarrix.net", "address": "Scarrix.net", "port": 25565 },
  "minecraft": { "version": "1.21.1", "loader": "vanilla", "javaPath": "java", "ramGB": 4 },
  "microsoft": { "clientId": "DEINE-APPLICATION-CLIENT-ID" }
}
```

**Wichtig:** Das ist nur ein *Ausschnitt*, keine vollständig ersetzbare `config.json`. Die vollständige mitgelieferte Vorlage behalten. Minecraft-Version, Serverport und Modloader müssen mit dem **tatsächlichen Scarrix-Server** kompatibel sein. Die bekannten Unterserver-IPs und Ports sind aufgenommen (aus den übermittelten Angaben); eine öffentlich erreichbare Unterserver-Schnittstelle wurde nicht überprüft.

### 5. Microsoft-Login konfigurieren

Folge **[docs/MICROSOFT-LOGIN.md](docs/MICROSOFT-LOGIN.md)** vollständig. Gehe zum Microsoft Entra Admin Center, erstelle eine Registrierung für **persönliche Microsoft-Konten**, aktiviere **öffentliche Clientflows** und übernimm die **Application (Client) ID**. Eine Entra-Registrierung garantiert noch keine Minecraft-Services-Freigabe (HTTP 403 möglich).

### 6. Client in der Entwicklungsumgebung starten

```sh
npm run dev
```

Der Client öffnet ein Electron-Fenster. Beim ersten Start wird die Beispiel-`config.json` in den Benutzerdatenordner kopiert. Änderungen über den Tab **Einstellungen** landen in dieser persönlichen Kopie.

### 7. Einloggen

Links unten **Mit Microsoft anmelden** anklicken → Browser-Link öffnen → Code nur auf der Microsoft-Seite eingeben → Minecraft-Profil wird überprüft. Fehlt die Zulassung der App, kann dieser Schritt mit **403 Invalid app registration** enden; siehe Anleitung.

### 8. Java und Minecraft einstellen

Unter **Einstellungen** Version (z. B. `1.21.1`), `vanilla`/`fabric`/`forge`, RAM (2–32 GB) und `java` oder den vollständigen Pfad zur Java-Programmdatei setzen. Auf Windows könnte das zum Beispiel `C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\java.exe` sein; der tatsächliche Pfad ist installationsabhängig. Auf macOS/Linux oft `/usr/bin/java` oder der Java-Pfad des JDK.

### 9. Modus auswählen und spielen

Startseite → Survival / ModernFFA / CityBuild / Primemines → **Spielen**. Der Launcher versucht, Version und Bibliotheken zu laden und dann direkt `Scarrix.net` zu öffnen. Die Karten zeigen **Backend-IP und Port als nur lesbare Information**. Der Spielstart nutzt für alle Modi die öffentlich angegebene **Scarrix.net-Lobby**. Der genaue Modus muss dort ausgewählt werden, bis es eine bestätigte Proxy-/Routing-API gibt. Die angegebenen Backend-Ports wurden nicht auf öffentliche Erreichbarkeit geprüft.

### 10. Eigene Installationsdatei erstellen

```sh
npm run typecheck
npm test
npm run dist -- --publish never
```

Nach erfolgreichem Build liegen Dateien in `release/`. Windows erzeugt normalerweise `.exe`, macOS `.dmg`/`.zip` und Linux `.AppImage`/`.deb` (jeweils vom entsprechenden Betriebssystem). Auf macOS wird ggf. Signierung/Notarisierung benötigt, um Sicherheitswarnungen zu vermeiden. Windows SmartScreen kann bei unsignierten Binaries warnen.

## GitHub – Repository `scarrix-client` veröffentlichen

**Dein Repository:** https://github.com/MustafaNoob1/scarrix-client. Für den lokalen Start ist kein Repository nötig; für automatische Releases/Updates muss der Code veröffentlicht werden.

1. Öffne dein bereits vorhandenes Repository: https://github.com/MustafaNoob1/scarrix-client. Es war beim Prüfen noch leer.
2. Dein GitHub-Benutzername ist **`MustafaNoob1`**.
3. In `package.json` ist unter `build.publish[0].owner` bereits **`MustafaNoob1`** eingetragen.
4. In `config.json` ist `github.owner` bereits eingetragen; vorhandene Benutzerkonfigurationen werden bei leerem Owner automatisch mit dem Standardwert ergänzt.
5. Im Terminal:

```sh
git init
git branch -M main
npm install
npm run typecheck
npm test
git add .
git commit -m "Initial Scarrix Client"
git remote add origin https://github.com/MustafaNoob1/scarrix-client.git
git push -u origin main
```

6. Auf GitHub → **Actions** den Workflow `Build and release Scarrix Client` öffnen. Bei Push auf `main` soll er die Builds erstellen und als Workflow-Artefakte speichern.
7. **Eine Versionsmarke erstellen**, z. B.:

```sh
git tag v0.1.1
git push origin v0.1.1
```

8. GitHub Actions baut nun pro Betriebssystem eine Installation und versucht sie als **GitHub Release** hochzuladen. Unter **Settings → Actions → General → Workflow permissions** ggf. **Read and write permissions** zulassen, damit `GITHUB_TOKEN` Releases veröffentlichen darf.
9. Unter **Releases** prüfen, ob `.exe`, `.dmg`, `.AppImage` und Update-Metadaten (`latest*.yml`) veröffentlicht wurden. **Ohne vollständige Release-Dateien oder korrekt eingerichteten Owner funktioniert Auto-Update nicht.**
10. Bei Signierung und Notarisierung zusätzliche Zertifikate/Secrets einrichten, bevor du die Software breit verteilst.

> Gib **keine** GitHub Personal Access Tokens, CurseForge-Keys oder Microsoft-Tokens an andere weiter oder in Chatnachrichten ein. Für GitHub Actions genügt normalerweise das automatisch bereitgestellte `GITHUB_TOKEN`.

## Features: Stand im Projekt

| Funktion | Stand / Einschränkung |
|---|---|
| Desktop-Oberfläche | Vorhanden: Electron/React, Deutsch/Englisch (wesentliche UI) |
| Microsoft-Anmeldung | Implementierter Device-Code-/Xbox-/Minecraft-Flow, **ungetestet** und abhängig von Microsoft-Freigabe |
| Passwortschutz | Keine Passwörter im Launcher; Token nur während der Sitzung im RAM |
| Serverstatus | Implementiert über mcstatus.io für das **Gesamtnetzwerk** |
| Modus-Status/Spielerzahlen | **Nicht vorhanden** ohne eigene Scarrix-Modus-API bzw. getrennte erreichbare Server |
| Direktstart | Start über die öffentliche Scarrix.net-Lobby; Modus muss dort gewählt werden; tatsächlicher Minecraft-Start noch zu testen |
| Modrinth | Suche, Versionsfilter, JAR-Download, SHA512-Prüfung, Fortschritt |
| CurseForge | Suche/Download mit **x-api-key**, sofern die API das erlaubt |
| Mod-Abhängigkeiten | Werden erkannt/gemeldet; noch kein automatischer Resolver |
| Mod-Loader | Vanilla, Fabric, Forge (Backend-Integrationen) – bei Versionen prüfen; Quilt noch nicht implementiert |
| Gemeinsame Downloads | Assets, Libraries & Minecraft-Versionen geteilt; **Mods getrennt je Version/Loader** gegen Konflikte |
| Skinverwaltung | Profil-Skin anzeigen, Classic/Slim PNG hochladen, lokale Bibliothek, erneut anwenden |
| Capeverwaltung | Offizielle Capes anzeigen, ausrüsten und ablegen; eigene PNG nur **lokale Vorschau** |
| Updates | electron-updater-Import in v0.1.1 korrigiert; GitHub-Releases erforderlich |
| Java | Verfügbare Java-Ausführungsdatei prüfen; **kein automatischer Java-Download** |
| News | Beispielnachrichten aus `config.json`; keine Live-News-API angebunden |
| Discord | Nicht implementiert (benötigt Datenschutzkonzept und Discord-Integration) |
| Crash-Logs | Lokale Logs erreichbar, **kein automatischer Upload** ohne Einwilligung |
| macOS/Windows/Linux | GitHub-Actions-Buildpipeline angelegt; echte Builds noch zu prüfen |

## Konfiguration & Dateistruktur

```text
scarrix-client/
├── .github/workflows/release.yml
├── docs/MICROSOFT-LOGIN.md
├── src/main/
│   ├── main.ts       # Electron-Fenster, sichere IPC-Befehle
│   ├── preload.ts    # Eingeschränkte Renderer-Schnittstelle
│   ├── auth.ts       # Microsoft/Xbox/Minecraft-Login
│   ├── game.ts       # Minecraft-Installation & Spielstart
│   ├── mods.ts       # Modrinth & CurseForge
│   ├── skins.ts      # Skin-/Cape-Bibliothek
│   ├── status.ts     # Serverstatus
│   ├── updater.ts    # Release-Updates
│   └── config.ts     # Benutzereinstellungen
├── src/renderer/     # React-Oberfläche
├── tests/            # Minimaltests
├── config.json       # Musterkonfiguration
├── package.json
├── LICENSE
└── README.md
```

Benutzerdateien werden getrennt vom Quellcode unter dem Electron-`userData`-Pfad gespeichert (unter Windows meistens `%APPDATA%/scarrix-client`, unter Linux typischerweise `~/.config/scarrix-client`, unter macOS `~/Library/Application Support/scarrix-client`; der genaue App-Ordnername kann abweichen).

Der gemeinsame Minecraft-Ordner liegt unter `userData/minecraft`. Dort liegen gemeinsam verwendete Minecraft-Assets und Libraries. Je Version und Modloader liegen die jeweiligen Mods/Configs unter `minecraft/instances/<version>-<loader>/`. Das verhindert, dass z. B. Fabric-Mods einer Version die nächste Version kaputtmachen. Es wird **nicht** blind der echte `.minecraft`-Ordner des offiziellen Launchers überschrieben.

## Serverbetrieb: fehlende Scarrix-Daten

Für reale pro-Modus Spielerzahlen und sofortigen Einstieg in **ModernFFA** etc. benötigen wir vom Serverbetreiber:

- Echte Serveradresse je Modus (oder eine dokumentierte Proxy-API/Join-Kommando).
- Eine API, die pro Modus Spieleranzahl, Wartungsstatus und Start-/Join-Ziele ausgibt (mit Beispieldaten, Dokumentation und CORS/Authentifizierungsregeln).
- Eine genaue Versionsliste, erlaubte Mods und Modloader für Scarrix.
- Für Live-News einen offiziellen HTTPS-Endpunkt.

Ohne diese Angaben werden **keine ausgedachten Spielerzahlen** angezeigt.

## Sicherheit

- Electron mit `contextIsolation: true`, `nodeIntegration: false` und isolierter Preload-API.
- Netzwerkaufrufe zu Drittanbietern mit Timeouts; Modrinth mit eindeutigem `User-Agent`.
- Mod-JAR-Dateien werden in den Instanzordner heruntergeladen, nicht ausgeführt. **Mods bleiben ausführbarer Drittcode, installiere nur vertrauenswürdige Projekte.**
- PNG-Größe und Abmessungen werden geprüft. Bibliotheken sind lokal und begrenzt.
- Kein Auto-Upload von Crashlogs und kein persistenter Microsoft-Token-Speicher.
- **Produktionsreife Sicherheitschecks fehlen noch** (besonders Redirect-Allowlisting, vollständige Datei-/Mime-Prüfung, automatisierte Integrationstests, Code-Signierung).

## Fehlerbehebung

**`npm` oder `node` nicht erkannt:** Node.js 22 installieren und Terminal neu starten.

**`npm ci` schlägt wegen fehlender Lockdatei fehl:** Zuerst lokal `npm install` ausführen und die erzeugte `package-lock.json` committen. Der mitgelieferte Workflow verwendet bis dahin `npm install`.

**`npm install` schlägt wegen Netzwerk/DNS fehl:** Internet, Proxy und npm-Registry prüfen. Ohne npm-Abhängigkeiten kann das ZIP noch nicht als App gestartet werden.

**`403 Invalid app registration`:** Siehe Microsoft-Login-Anleitung; eine andere Entra-Einstellung reicht dafür eventuell nicht aus.

**Minecraft beendet sich / Java-Version falsch:** Prüfe `java -version`, Modloader- und Minecraft-Version, RAM, lokale `logs/` der Instanz.

**Kein direkter Modusbeitritt:** Es fehlen die tatsächlichen Subserver-Adressen oder der Scarrix-Routingmechanismus. Die aktuell vier Karten starten mit derselben Beispiel-Adresse.

**Modrinth-Mod installiert, aber Mod lädt nicht:** Kompatibilität mit der Minecraft-Version/Loader und alle aufgelisteten Abhängigkeiten prüfen. Bei `vanilla` sind Loader-Mods nicht nutzbar.

**Auto-Update macht nichts:** Nur in paketierten GitHub-Releases aktiv; `github.owner` und `package.json`-Publish-Owner müssen gesetzt sein, Updates brauchen neuere Tags und korrekte Metadaten.

## Originalquellen und Dokumentation

- Microsoft Entra: https://learn.microsoft.com/de-de/entra/identity-platform/quickstart-register-app
- Device Code Flow: https://learn.microsoft.com/en-us/entra/identity-platform/scenario-desktop-acquire-token-device-code-flow
- Microsoft Minecraft-Services-Restriktion: https://learn.microsoft.com/en-us/answers/questions/5984225/minecraft-services-http-403-invalid-app-registrati
- XMCL Core: https://xmcl.app/en/core/
- Modrinth API: https://docs.modrinth.com/api/
- CurseForge API (for Studios): https://docs.curseforge.com/rest-api/
- mcstatus.io: https://mcstatus.io/docs
- electron-updater: https://www.electron.build/docs/features/auto-update/

## Lizenz & Hinweise

Der eigene Scarrix-Client-Quellcode in diesem Repository steht unter der MIT-Lizenz (siehe `LICENSE`). Die Abhängigkeiten stehen unter ihren jeweiligen Lizenzen. Minecraft und Minecraft Java Edition unterliegen den Bedingungen von Mojang/Microsoft. Keine Spielkopien, Passwörter oder Tokens veröffentlichen.

## Preview 0.2.0: Installationspakete und Minecraft-Vorbereitung

Die CI-Pipeline baut auf jedem Push nach `main` Installationspakete für Windows, macOS und Linux. Nach erfolgreicher Prüfung **aller Plattformen** erstellt sie einen privaten **Preview-Release** mit den Installationsdateien. Details und Einschränkungen: [Release-Anleitung](docs/RELEASES.md).

Ohne Microsoft-Login können Minecraft-Versionsdateien jetzt über **„Minecraft-Dateien vorbereiten“** im Client heruntergeladen/geprüft werden. Dafür sind eine passende Java-Installation und Internetzugang erforderlich. Der Minecraft-Login und Spielstart bleiben von der Microsoft/Minecraft-Freigabe abhängig. Eine erfolgreich vorbereitete Spielversion beweist noch nicht, dass ein echter Online-Spielstart funktioniert.

**Hinweis:** Private GitHub-Releases stehen nur berechtigten Benutzern zur Verfügung. Auto-Updates an öffentliche Spieler sind damit ohne einen eigenen öffentlichen Update-Kanal nicht möglich. Windows- und macOS-Installer sind derzeit nicht signiert.

## Vorschau für Unterserver-Status und Java-Download

Die Startseite führt für jeden konfigurierten Unterserver eine zusätzliche **best-effort**-Abfrage über mcstatus.io aus. Nur erfolgreich erreichbare Backends werden mit einer Spielerzahl als erreichbar markiert. Eine fehlgeschlagene Abfrage bedeutet **nicht**, dass der Unterserver offline ist: interne/private Ports können von außen nicht abgefragt werden. Der direkte Spielbeitritt funktioniert weiterhin ausschließlich über den Scarrix-Proxy.

Unter **Einstellungen** gibt es außerdem einen Link zu [Eclipse Temurin / Adoptium](https://adoptium.net/) für den Download der benötigten Java-Version. Java wird weiterhin nicht ungefragt automatisch installiert.
