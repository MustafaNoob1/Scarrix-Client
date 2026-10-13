# Sicherer Update-Kanal
Preview 0.3.1 bleibt ohne automatisches Update, bis ein Betreiber den Kanal bereitstellt.
Private GitHub-Releases sind nicht anonym herunterladbar. Keine GitHub-Zugangsdaten im Client.
## Betrieb
HTTPS-Dateiserver/CDN für veröffentlichte Installer, latest.yml und blockmap bereitstellen. Stabile Updates und Preview getrennt halten.
Windows-EXE mit Authenticode signieren. In update-channel.json den vollständigen Zertifikat-Subject als publisher pinnen, HTTPS-Basis-URL setzen und enabled aktivieren. Danach Client neu bauen. Die Datei liegt in den App-Ressourcen und kann nicht durch Launcher-Einstellungen verändert werden.
CI kopiert die Dateien mit ausschließlich serverseitigen Secrets auf den Kanal; Metadaten zuletzt atomar austauschen. SHA512 prüft Download-Integrität; zusätzlich muss Authenticode gültig sein und exakt der gepinnte Subject passen.
Alternativ privater Backend-Dienst: GitHub-App-Zugriff ausschließlich auf dem Server, mit kurzlebigen URLs nach Benutzeranmeldung. Noch nicht implementiert; Microsoft-Login allein berechtigt nicht zum GitHub-Repository.
## Grenzen und Abnahme
Windows NSIS: Download, Fortschritt, Signaturprüfung, expliziter Installations-/Neustartdialog. Später installiert nicht beim Beenden.
macOS/Linux bleiben gesperrt, bis ihre Signaturprüfung und Verteilung eingerichtet sind.
Zertifikat, Hosting und Serverzugang fehlen. Daher ist der Live-Kanal deaktiviert. Vor Freigabe zwei installierte signierte Versionen testen: Upgrade, falscher Herausgeber, beschädigter Download, Netzwerkunterbrechung, späterer Neustart. Die unsignierten Preview-Installer bleiben manuell installierbar.
https://www.electron.build/v26/docs/win/

Auch build.win.signtoolOptions.publisherName auf den Zertifikat-Herausgeber setzen (der Platzhalter erzwingt im unsignierten Preview die Verifier-Ausführung, ist keine echte Signatur). Signier-Secrets nur in CI, niemals im Repository.
