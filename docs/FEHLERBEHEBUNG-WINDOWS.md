# Windows: Scarrix Client startet nicht (autoUpdater)

## Ursache

Die alte Importzeile `import electronUpdater from 'electron-updater';` erzeugte einen **undefinierten Default-Export** in CommonJS. Der Launcher stürzte beim Laden ab.

## Sofortfix in der alten Installation

1. Öffne `src/main/updater.ts`.
2. Ersetze `import electronUpdater from 'electron-updater';` durch `import { autoUpdater } from 'electron-updater';`.
3. Lösche `const { autoUpdater } = electronUpdater;` (diese Zeile wird nicht mehr benötigt).
4. Installiere Node.js **mindestens 22.12.0** und starte PowerShell neu.
5. Wechsle in den Projektordner und führe aus:

```powershell
node -v
npm install
npm run typecheck
npm test
npm run dev
```

`npm warn deprecated` ist nicht selbst die Ursache des Electron-Absturzes. `npm audit` zeigt Paket-Sicherheitswarnungen, die später einzeln und ohne blinde Breaking-Upgrades geprüft werden sollten.

## Neue Version installieren

Entpacke die neue ZIP in einen **neuen Ordner** (nicht ins bestehende `node_modules` mischen). Du kannst die alte projektinterne `node_modules`-Ordner löschen. **Benutzerdaten im AppData-Ordner nicht löschen**. Nach dem nächsten Start erkennt der Client die unveränderten Demo-Modus-Einträge aus der ursprünglichen Konfiguration und ersetzt sie mit den neuen Serverangaben.

## Spielmodi und Netzwerk

Die bekannten Backend-Adressen werden auf der Startseite angezeigt und können dort nicht verändert werden. **Minecraft wird immer über Scarrix.net:25565 gestartet**. Die direkte Verbindung zu den einzelnen Unterservern wurde nicht geprüft. Ohne Scarrix-Proxy-Routing ist noch kein automatisches Betreten einzelner Untermodi implementiert.
