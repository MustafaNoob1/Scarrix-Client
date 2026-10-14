# Microsoft-Anmeldung für Scarrix Client

## Windows: Microsoft-Systemfenster

Der Launcher nutzt Microsofts Windows Web Account Manager (WAM) über MSAL Node und den offiziellen NativeBrokerPlugin. Beim Anmelden erscheint die native Microsoft-Kontoauswahl über dem Launcher. Es wird kein externer Browser geöffnet und kein eigenes Passwortformular verwendet. Windows Hello und vorhandene Windows-Konten werden vom Microsoft-Systemdialog verwaltet.

### App-Registrierung

1. In Microsoft Entra die Scarrix-Anwendung öffnen (Client-ID `604d79e5-9f8c-4e1c-ab0f-6d8001175151`).
2. Persönliche Microsoft-Konten müssen unterstützt werden. Öffentliche Clientflows aktivieren.
3. Unter **Authentifizierung → Plattform hinzufügen → Mobile und Desktopanwendungen** diese Rücksprungadresse eintragen:
   `ms-appx-web://Microsoft.AAD.BrokerPlugin/604d79e5-9f8c-4e1c-ab0f-6d8001175151`
4. Speichern. Kein Client-Secret erstellen oder in den Launcher einbetten.
5. Anmelden im Launcher. Abbrechen im Microsoft-Fenster beendet den Versuch; danach ist eine neue Anmeldung möglich.

Die zusätzliche Minecraft-Services-Freigabe der App bleibt erforderlich. Der Systemdialog umgeht die Freigabe nicht: Microsoft-Token → Xbox Live/XSTS → Minecraft Services → gültiges Minecraft-Java-Profil. Erst nach erfolgreicher Profilprüfung gilt das Konto als angemeldet.

## macOS und Linux

Diese Version verwendet dort weiterhin den Device-Code-Flow. Der Launcher zeigt einen Code; Nutzer öffnen die echte Microsoft-Seite und melden sich dort an. Der Windows-Broker wird auf diesen Plattformen nicht geladen.

## Datenschutz und Grenzen

Minecraft-Token bleiben im Hauptprozess und im Arbeitsspeicher. Microsofts Broker verwaltet seine eigenen Konten/Token im Betriebssystem; dieser Speicher wird vom Launcher weder ausgelesen noch exportiert. „Abmelden“ trennt das Minecraft-Konto vom Launcher, meldet aber nicht das gesamte Windows-Konto ab. Bei aktivem „Anmeldung merken“ speichert der Launcher die gewählte Microsoft-Kontoidentität und den MSAL-Cache verschlüsselt über Electron safeStorage (unter Windows DPAPI). Auf Linux mit basic_text oder ohne sicheren Schlüsselspeicher erfolgt keine dauerhafte Speicherung. Erst nach einer erfolgreichen Minecraft-Profilprüfung wird gespeichert. Beim Start wird ausschließlich eine stille Anmeldung versucht; nötige Kontobestätigung erfordert einen Klick auf Anmelden. Abmelden oder das Ausschalten der Merken-Funktion löscht die lokale verschlüsselte Datei. Kein Loggen von Passwörtern oder Token, keine automatische Browser-Ausweichanmeldung unter Windows.

Der Paket-Build prüft, ob die nativen Broker-Module aus dem fertigen Windows-Paket geladen werden können. End-to-End-Anmeldung mit einem echten Minecraft-Konto muss nach App-Registrierung und Freigabe geprüft werden. Falls Windows/WAM nicht verfügbar ist, erscheint eine verständliche Fehlermeldung.

Offizielle Referenzen:
- https://learn.microsoft.com/en-us/entra/msal/javascript/node/brokering
- https://learn.microsoft.com/en-us/entra/msal/dotnet/acquiring-tokens/desktop-mobile/wam

Verschlüsselung: https://www.electronjs.org/docs/latest/api/safe-storage
