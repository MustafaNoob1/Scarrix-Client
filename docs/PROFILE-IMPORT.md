# Profilimport und große Exporte

Unter **Profile → Profil importieren** werden ScarrixPack, NoRisk-Profil (`.noriskpack`), Modrinth (`.mrpack`) und CurseForge-ZIP automatisch anhand ihrer Beschreibung erkannt. Jedes Archiv wird als neues Profil importiert. Ein Fehler entfernt ausschließlich die eigenen angefangenen Importdateien; bestehende Profile werden nicht überschrieben.

## NoRisk-Profile

Für einen vollständigen NoRisk-Profilexport empfiehlt sich `.noriskpack`: Die native Profilbeschreibung enthält RAM, Fenstergröße, Loader-Auswahl und Aktivierungszustände der Mods. Automatische Loader-Auswahl bleibt automatisch; eine dabei veraltete gespeicherte Loader-Version wird nicht versehentlich festgesetzt. Explizite Loader-Overrides bleiben erhalten, soweit sie zu den enthaltenen Fabric-Mods passen.

Mods, Resourcepacks, Konfigurationen, Welten, Karten und andere portable Dateien unter `overrides` werden übernommen. NoRisk-Modordner für die gewählte Spielversion werden in den normalen Mods-Ordner überführt. Andere Versionsordner bleiben außerhalb des aktiven Mods-Ordners erhalten. Inaktive Mods, Mods für andere Spielversionen und ältere doppelte Fabric-Mod-IDs bleiben als deaktivierte Dateien erhalten. Bei doppelten IDs wird die neueste lokal erkennbare Version verwendet. Lokale Metadaten können nicht alle Laufzeitkonflikte vorhersagen; vor dem Spielstart bleibt die Mod-Prüfung aktiv.

Anpassungen stehen im Profilordner in `scarrix-import-report.json`. Fremde Kontozuordnungen, Zugangsdaten und Java-Programmpfade werden nicht übernommen. Entbehrliche Cache- und fremde Launcher-Verzeichnisse in externen Overrides werden mit einem Hinweis ausgelassen, statt den gesamten Profilimport zu verhindern. Java wird für die Minecraft-Version ausgewählt; portable GC-Optionen werden geprüft. RAM wird an den eigenen physischen Systemspeicher angepasst.

## Download-Verweise und Formate

- ScarrixPack enthält die gewählte Profilkonfiguration und ausgewählten Dateien.
- Modrinth-Import prüft SHA-1 und SHA-512, berücksichtigt optionale Client-Dateien und wendet Client-Overrides zuletzt an.
- Native NoRisk-Verweise werden mit der gespeicherten SHA-1-Prüfsumme geprüft; zusätzliche Modrinth-Metadaten liefern, soweit vorhanden, auch SHA-512 und Dateigröße. Das funktioniert auch für gespeicherte öffentliche ForgeCDN-Adressen ohne eingebetteten API-Schlüssel.
- Ein gewöhnliches CurseForge-Manifest mit ausschließlich Projekt-/Datei-IDs benötigt einen selbst konfigurierten CurseForge-API-Schlüssel. Ohne diesen wird der Import mit verständlicher Erklärung beendet. Ein natives `.noriskpack` mit geprüften Download-Adressen ist dafür die Alternative. Fremde API-Schlüssel werden nicht aus anderen Launchern übernommen.
- MRPack und CurseForge definieren keine standardisierte Übertragung aller launcher-spezifischen Profiloptionen. Dateien und unterstützte Minecraft-/Loader-Versionen werden übernommen; nicht enthaltene Einstellungen lassen sich nicht rekonstruieren.

Minecraft-Release-Versionen sowie Vanilla, Fabric und Forge werden unterstützt. Nicht implementierte Loader werden vor der Installation erklärt und abgewiesen.

## Größe und Integrität

Für Profilimport, Profilexport und Profilkopien gibt es kein pauschales MB-/GB- oder Dateianzahllimit. ZIP64 unterstützt auch einzelne Dateien über 4 GiB. Nutzdateien werden als Datenstrom komprimiert, gelesen und extrahiert, statt das gesamte Archiv oder einzelne große Dateien im RAM zu halten. Praktische Grenzen sind freier Datenträgerspeicher, Dateisystem und Betriebssystem; Profilbeschreibungen bleiben gegen übergroße Metadaten geschützt.

CRC32 und tatsächliche entpackte Dateigrößen werden bei der Extraktion geprüft. Verzeichniswechsel, Links, Gerätepfade, doppelte Pfade, vertrauliche Launcher-Verzeichnisse und ausführbare Betriebssystemdateien bleiben gesperrt. Diese Prüfungen werden durch das Entfernen der pauschalen Größenlimits nicht abgeschaltet. Die getrennte lokale Sicherungsfunktion behält ihre bisherigen Schutzlimits.

Prüfung: `npm test` enthält native Profilimporte, deaktivierte Dateien, Versionsordner, Loader-Anpassung, Referenzdownloads, CRC-Fehler und ZIP64-Roundtrips. `node scripts/check-large-profile.cjs` streamt zusätzlich 4 GiB + 17 Byte und prüft die vollständigen Daten per SHA-512, ohne eine große Rohdatei abzulegen.
