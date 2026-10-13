# Einmalige Einrichtung der Update-Signierung

1. In GitHub: Repository Settings → Secrets and variables → Actions → New repository secret.
2. Name: SCARRIX_UPDATE_PRIVATE_KEY
3. Wert: kompletter PEM-Inhalt des lokal bereitgestellten privaten Signierschlüssels, inklusive BEGIN/END-Zeilen.
4. Die Pipeline „Public installers and signed preview updates“ erneut starten oder eine Änderung veröffentlichen.
5. Im veröffentlichten Release müssen scarrix-update.json und scarrix-update.sig vorhanden sein.

Der öffentliche Schlüssel ist in update-channel.json eingebaut. Der private Schlüssel wird ausschließlich im Signierschritt als GitHub-Secret verwendet. Nicht als Repository-Datei, Release-Anhang, Nachricht oder Build-Artefakt veröffentlichen.
Alte Clients bis 0.4.1 einmal manuell auf 0.5 aktualisieren. Danach funktionieren neuere signierte Windows-Updates in der App.
Die Signatur authentifiziert die Metadaten und den vollständigen Installer. Ein Authenticode-Zertifikat ist dafür nicht erforderlich; Windows SmartScreen kann bei einer Erstinstallation weiterhin eine Meldung anzeigen.
Bei Schlüsselwechsel müssen bestehende Clients erst mit dem alten Schlüssel eine Version mit dem neuen Vertrauen erhalten. Nicht einfach den öffentlichen Schlüssel austauschen.
Release-Dateien nach Veröffentlichung nicht ändern. Eine neue Version veröffentlichen.
