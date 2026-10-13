# Microsoft-Login für Scarrix Client – Schritt-für-Schritt-Anleitung

Stand: Oktober 2026. Der Launcher verwendet Microsofts **Device-Code-Flow** (Anmeldecode im Browser), danach Xbox Live/XSTS und Minecraft Services. Der Nutzer gibt **niemals sein Microsoft-Passwort im Launcher** ein. Die Minecraft-Java-Edition muss zum Microsoft-Konto gehören; das bloße Vorhandensein eines Microsoft-Accounts reicht nicht.

## Teil 1 – Microsoft-Anwendung anlegen

1. Öffne https://entra.microsoft.com/ und melde dich mit einem Konto an, das App-Registrierungen anlegen darf. Wenn du keinen passenden Entra-Mandanten hast, musst du zuerst die Voraussetzungen im Microsoft Entra Admin Center klären. Je nach Konto und Verwaltung kann das nicht ohne Weiteres möglich sein.
2. Gehe zu **Entra ID → App-Registrierungen → Neue Registrierung** (englisch: Entra ID → App registrations → New registration).
3. Vergib den Namen **Scarrix Client**.
4. Wähle als unterstützten Kontotyp **Persönliche Microsoft-Konten** oder **Konten in beliebigen Organisationsverzeichnissen und persönliche Microsoft-Konten**, damit Xbox-/private Microsoft-Konten prinzipiell zugelassen sind. *Keinesfalls* nur „Konten in diesem Organisationsverzeichnis“, wenn öffentliche Spieler sich anmelden sollen.
5. Für den im Projekt verwendeten Device-Code-Flow ist kein Client-Secret erforderlich. Registriere die App.
6. Kopiere auf **Übersicht** den Wert **Anwendungs-ID (Client)** (Application (client) ID). Er ist im Format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Das ist **keine** Client-Secret-ID und **kein** Kennwort.
7. Öffne **Authentifizierung → Erweiterte Einstellungen** und aktiviere **Öffentliche Clientflows zulassen** (Allow public client flows = Yes). Speichern.
8. Trage die Client-ID im gestarteten Scarrix Client unter **Einstellungen → Microsoft Application (Client) ID** ein und klicke auf **Einstellungen speichern**. Alternativ trägst du sie **vor dem ersten Programmstart** in `config.json` bei `microsoft.clientId` ein.
9. Prüfe, dass keine Kennwörter, geheimen Client-Schlüssel oder persönlichen Zugriffstoken im Code oder Repository veröffentlicht werden.

**WICHTIGE ZUSÄTZLICHE EINSCHRÄNKUNG:** Eine gültige Microsoft-Entra-App erlaubt noch nicht automatisch Minecraft Java OAuth über Minecraft Services. Seit mindestens 2026 berichten Entwickler über HTTP 403 `Invalid app registration` bei `https://api.minecraftservices.com/authentication/login_with_xbox`. Microsofts Antwort verweist auf eine separate Freigabe/Allowlisting des App-Client-IDs (Xbox Developer / ID@Xbox). Es gibt keine garantierte öffentliche Selbstfreischaltung im Entra-Portal. Der Launcher umgeht diesen Schutz nicht. Wenn diese Meldung erscheint, benötigst du die für Minecraft geltende Berechtigung oder einen anderen rechtmäßig freigegebenen Integrationsweg.

Referenz: https://learn.microsoft.com/en-us/answers/questions/5984225/minecraft-services-http-403-invalid-app-registrati

## Teil 2 – Microsoft-Konto im Scarrix Client anmelden

1. Starte den Scarrix Client (`npm run dev` nach Installation der Abhängigkeiten).
2. Klicke links unten auf **Mit Microsoft anmelden**.
3. Im Client erscheint ein einmaliger **Code** und die Adresse **microsoft.com/devicelogin**.
4. Klicke auf **Microsoft-Anmeldeseite öffnen** oder öffne `https://www.microsoft.com/devicelogin` selbst im Browser.
5. Gib **nur auf der offiziellen Microsoft-Seite** den Code ein. Melde dich dort mit deinem persönlichen Microsoft-Konto an, das Minecraft: Java Edition besitzt.
6. Erteile nur die angezeigten, nachvollziehbaren Berechtigungen. Wenn der Vorgang abgebrochen wird, kannst du im Client neu beginnen.
7. Nach erfolgreicher Microsoft-Anmeldung überprüft der Client die Xbox-/Minecraft-Anmeldung und ruft deinen Minecraft-Spielernamen und dein Profil ab. Erst dann wird „Angemeldet als …“ angezeigt.
8. Wähle auf der Startseite einen Servermodus und klicke auf **Spielen**. Für den ersten Start lädt der Launcher Minecraft-Dateien herunter.

## Teil 3 – Häufige Fehler

| Fehlermeldung | Bedeutung und Lösung |
| --- | --- |
| `Application (Client) ID` fehlt | Entra-ID erstellen und unter Einstellungen eintragen. |
| `unauthorized_client` | App unterstützt den gewählten Kontotyp nicht oder die öffentlichen Clientflows sind nicht aktiviert. |
| `invalid_scope` | Freigabe/Scopes sind nicht für die App verfügbar. Microsoft-App-Einrichtung und Minecraft-Zulassung prüfen. |
| `Invalid app registration (403)` | Minecraft Services verlangt zusätzliche Freigabe; Entra-Änderungen allein genügen möglicherweise nicht. |
| Kein Minecraft-Profil | Falsches Microsoft-Konto oder keine Java-Edition bzw. kein fertiges Minecraft-Profil. |
| `Java wurde nicht gefunden` | Installiere die zu Minecraft passende Java-Version und trage den ausführbaren Java-Pfad ein. |
| Anmeldung läuft ab | In dieser Version liegen Token absichtlich nur im Arbeitsspeicher. Nach Neustart erneut anmelden. |

## Sicherheit und Datenschutz

- Keine Passwortabfrage im Launcher. Keine `password grant`-/„Cracked Account“-Anmeldung.
- Microsoft-/Minecraft-Token bleiben bis zum Beenden des Programms ausschließlich im Hauptprozess/Arbeitsspeicher (kein dauerhafter Refresh-Token-Cache).
- Der Browser zeigt die echte Microsoft-Domain. Gib Codes nicht an Fremde weiter.
- `microsoft.clientId` ist eine öffentliche Kennung, kein Secret. Ein CurseForge-API-Key dagegen sollte nicht in einem öffentlichen Repository landen.
- Der Launcher überträgt keine privaten Crash-Logs automatisch.

Quellen: Microsoft App-Registrierung https://learn.microsoft.com/de-de/entra/identity-platform/quickstart-register-app ; Device Code Flow https://learn.microsoft.com/en-us/entra/identity-platform/scenario-desktop-acquire-token-device-code-flow ; XMCL Auth https://xmcl.app/en/core/user
