# Komfortfunktionen und Prüfung

## Anmeldung
Die gespeicherte Kontoidentität und der MSAL-Cache werden mit dem Systemschlüsselspeicher verschlüsselt. Minecraft-Zugangstoken bleiben im Arbeitsspeicher des Hauptprozesses. Fehlt sichere Verschlüsselung, gibt es keine Klartext-Ausweichlösung. Startwiederherstellung öffnet keine Anmeldefenster automatisch. Ein abgelaufener oder widerrufener Zugang erfordert erneute Bestätigung. Microsoft-/Minecraft-Profilvalidierung bleibt unverändert erforderlich.

## Absturzdiagnose
Nach einem unerwarteten Prozessende werden die letzten Live-Logzeilen und der neueste Crashbericht dieser Spielsitzung nach bekannten Hinweisen untersucht. Ergebnis und konkrete Schritte erscheinen in der Instanzansicht. Das Ergebnis beschreibt einen Hinweis, keine garantierte Ursache. Ein normaler Exit oder bewusstes Stoppen erzeugt keinen Absturzbericht.

## Modpacks
Unter Meine Profile kann eine `.mrpack`-Datei ausgewählt werden. Der Import zeigt Name, Minecraft-Version und Loader vor dem Start; optionale Client-Dateien sind wählbar. Server-Dateien werden ausgelassen. Client-Overrides werden nach allgemeinen Overrides angewandt. Neue Profile übernehmen die im Pack geforderte Fabric-/Forge-Version. Ist ein festgelegter Fabric-Loader für enthaltene Mods zu alt, wird eine passende offizielle Version gewählt und die Anpassung im Importbericht erklärt. Keine Übernahme von eigenen JVM-Argumenten oder Java-Pfaden aus dem Pack.

Profilarchive haben keine feste Größen- oder Dateianzahlbegrenzung. Dateien werden mit ZIP64 gestreamt; die tatsächliche freie Festplattenkapazität wird vor dem Import geprüft. Begrenzte Profilbeschreibungen werden getrennt von den großen Nutzdateien gelesen. Weiterhin gilt: HTTPS über definierte Modrinth/GitHub/GitLab-Hosts einschließlich geprüfter Weiterleitungen. SHA1 und SHA512 werden kontrolliert. Unsichere Pfade, Links und ausführbare Betriebssystemdateien sind nicht erlaubt. Bei einem Fehler werden das neue Profil und alle angefangenen Importdateien zurückgenommen. Nur Minecraft-Release-Versionen und Vanilla/Fabric/Forge; andere Loader werden klar abgewiesen.

## Fenster und Darstellung
Fenstergröße, normale Position und Maximierungszustand werden beim Schließen gespeichert. Nach Monitorwechseln wird das Fenster in die verfügbare Arbeitsfläche zurückgesetzt. Profile, Einstellungen und Logansicht passen sich kleineren Fenstern an; lange Namen werden umgebrochen oder gekürzt.

Geprüft: Funktionstests einschließlich echter Testprozess-Logs, vollständiger Import eines Test-Modpacks mit Prüfsummen und Fehler-Rückabwicklung, tatsächliche Windows-safeStorage-Verschlüsselung mit einem nicht persönlichen Testwert. Sichtprüfung in isolierter Electron-Vorschau bei 780×560 und 720×440 logischen Pixeln sowie 150 Prozent App-Skalierung. Keine Änderung der Windows-Systemskalierung und keine Automatisierung echter Anmeldedialoge.

Microsoft-Anmeldung und Minecraft-26.2-Fabric-Spielstart wurden nach Freigabe erfolgreich geprüft. Details zum Import fremder Profile: [Profilimport und große Exporte](PROFILE-IMPORT.md).

Quellen: https://support.modrinth.com/en/articles/8802351-modrinth-modpack-format-mrpack ; https://www.electronjs.org/docs/latest/api/safe-storage ; https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests
