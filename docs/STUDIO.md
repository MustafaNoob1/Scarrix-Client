# Profile, Katalog, Skins und Capes

Die Settings-Navigation verwendet feste, gleich hohe Einträge. Auf der Spielseite sind Spielen und Profil-Auswahl getrennte Bedienelemente; das Profil-Menü zeigt Name, Version und Loader.

## Profilseite und Einstellungen

Alle/Modpacks, Namenssuche und Sortierung zeigen die Profilbibliothek. Spielen startet direkt das angeklickte Profil mit seinem RAM, Java und Fensteroptionen; Microsoft-/Minecraft-Prüfung bleibt erforderlich. Mods öffnet die Inhaltsansicht dieses Profils. Das Zahnrad bietet Bearbeiten, Duplizieren, Exportieren, Ordner öffnen und Entfernen. Entfernte Profile bleiben mit ihren Dateien auf dem Datenträger erhalten.

Die Inhaltsansicht liest tatsächliche Dateien aus dem Profil: Mods, Ressourcenpakete, Shader und Datapacks einer ausgewählten Welt. Fabric-Metadaten liefern Name, Version und Bild; andere Dateien verwenden vorhandene Pack-Bilder bzw. Dateinamen. Schalter aktivieren/deaktivieren eine Datei über .disabled. Entfernen sichert sie in removed-content. Welten, Screenshots und Logs öffnen den passenden lokalen Ordner.

Die ausdrückliche Updateprüfung sendet Datei-Prüfsummen an [Modrinths Versions-API](https://docs.modrinth.com/api/operations/getlatestversionsfromhashes/) und berücksichtigt die Spielversion und den Loader. Nicht erkannte Dateien werden nicht ersetzt. Einzelne oder alle gefundenen stabilen Updates verwenden den bereits geprüften Downloadweg; deaktivierte Inhalte bleiben deaktiviert. Mod-Abhängigkeiten werden gemeldet und müssen gegebenenfalls zusätzlich installiert werden. Es gibt noch keine automatische CurseForge-Updateprüfung.

Profileinstellungen: Allgemein (Name, PNG-Bild, Gruppe, gemeinsamer Gruppenordner, Schnellstart einer vorhandenen Welt, aktuelles Konto), Installation (offizielle Spielversionen, Vanilla/Fabric/Forge und passende Loader-Versionen), Java & Speicher (dynamischer physischer RAM, optionaler Java-Pfad, Erkennung/Kompatibilitätsprüfung, begrenzte GC-Argumente) und Fenster (Breite, Höhe, Auflösungsvorlagen, Vollbild). Quilt/NeoForge sind noch nicht installierbar und werden nicht als funktionierende Optionen angezeigt.

Gemeinsame Gruppenordner liegen getrennt von Einzelprofilen unter minecraft/groups. Nur Profile mit identischer Minecraft-/Loader-Version dürfen einen Ordner gemeinsam verwenden. Alte Einzelprofil-Dateien bleiben erhalten und werden beim Umschalten nicht verschoben. Duplizieren erzeugt wieder ein eigenes Profil. Export übernimmt portable Einstellungen; lokale Java-Pfade und die Gruppenfreigabe werden nicht in ein anderes System importiert.

Spielzeit und letzter Start werden lokal erfasst. Speicherangaben zählen bis 20.000 Dateien und ignorieren Links; bei größeren Profilen ist die Anzeige eine Untergrenze. Schnellstart öffnet ab Minecraft 1.20 eine vorhandene Welt anstelle der Netzwerkverbindung. Benutzerdefiniertes Java muss zur offiziell benötigten Java-Version passen; sonst stoppt der Start mit einem Hinweis. Ohne Override kann der Launcher passendes Java weiterhin automatisch installieren.

## Inhalte installieren

### Profil exportieren

Das Zahnrad öffnet einen Export-Dialog mit Dateiname, Formatwahl und aufklappbarer Datei-/Ordnerauswahl. Alle auswählen/abwählen wirken auf die ganze Liste. Ohne Auswahl wird nur die Profilkonfiguration exportiert. Der Speicherort wird anschließend im nativen Speichern-Dialog gewählt; „Ordner nach Export öffnen“ markiert das fertige Paket im Dateimanager.

ScarrixPack (.scarrixpack) ist ein ZIP mit profile.json und ausschließlich ausgewählten Dateien unter files/. Der Scarrix-Import akzeptiert dieses Format sowie alte .scarrix.zip-Pakete. Portable Profiloptionen bleiben erhalten; lokale Java-Pfade und Konto-Daten werden nicht exportiert.

Modrinth (.mrpack) folgt der [offiziellen Spezifikation](https://support.modrinth.com/en/articles/8802351-modrinth-modpack-format-mrpack): modrinth.index.json, festgelegte Minecraft-/Loader-Version, SHA1/SHA512 und HTTPS-Downloadverweise für per Hash erkannte Modrinth-Dateien. Andere ausgewählte Dateien werden unter overrides/ eingebettet. Bei einem nicht erreichbaren Katalog bleiben die ausgewählten Dateien als Overrides erhalten. Die Freigabe zum Veröffentlichen eingebetteter Inhalte wird damit nicht automatisch bestätigt.

CurseForge (.zip) enthält manifest.json und overrides/ entsprechend dem [CurseForge-Paketaufbau](https://support.curseforge.com/support/solutions/articles/9000198500-exporting-a-modpack-for-curseforge-project-submission). Bekannte CurseForge-Downloads werden mit Projekt-/Datei-ID referenziert, wenn der konfigurierte API-Key und die offizielle Datei-Prüfsumme sie bestätigen. Ohne diese Bestätigung werden die ausgewählten Dateien eingebettet. Das Paket wird weder hochgeladen noch als zur Veröffentlichung auf CurseForge zugelassen bezeichnet.

Die Auswahl umfasst unterstützte Spielordner, Welten, Screenshots, ausdrücklich gewählte Logs und Optionen. Launcher-Tokens, Systemlaufzeiten, Links und ausführbare Systemdateien sind nicht in der Dateiliste. Exportgrenzen: 20.000 Einträge, 1 GB ausgewählte Daten, maximal 300 MB fertiges Archiv. Der Export muss außerhalb des Profilordners gespeichert werden, damit er sich nicht selbst einschließt. Eine fehlende oder geänderte Auswahl wird vor dem Schreiben erneut geprüft.

Modrinth zeigt Mods, Ressourcenpakete, Shader und Datenpakete mit Projektbildern, Autor, Downloads und Kategorien. Suche, Minecraft-Version, Loader, Kategorie und Sortierung filtern den Katalog. CurseForge-Mods benötigen den bereits unterstützten API-Key; dieser wird nicht an den Renderer übertragen. Ohne Key bleibt Modrinth verfügbar.

Installieren öffnet die Profil-Auswahl und ermittelt für jedes Profil eine zur Minecraft-Version und zum Loader passende Veröffentlichung. Auch eine explizit ausgewählte Version muss zum Zielprofil passen. Inkompatible Profile bleiben gesperrt. Die Installation verändert nicht das aktive Profil. Dateien werden aus erlaubten HTTPS-CDNs geladen, anhand der Anbieter-Prüfsumme geprüft und erst anschließend übernommen.

Die Versionsliste lässt sich mit dem Pfeil ausklappen und nach Veröffentlichungstyp, Spielversion und Loader filtern. Datenpakete brauchen eine vorhandene Welt; Shader zusätzlich einen passenden Renderer wie Iris. Erforderliche Mod-Abhängigkeiten werden automatisch mit installiert; Details zu Grenzen und Sicherungen stehen unten. Der Modpacks-Reiter bietet einen Modrinth-Suchkatalog; der lokale .mrpack-Import bleibt zusätzlich in Profile verfügbar.

## Skin-Bibliothek

Skins lassen sich aus PNG-Dateien, Spielernamen, UUIDs oder offiziellen textures.minecraft.net-Textur-URLs importieren. Beliebige fremde Download-Adressen werden nicht akzeptiert. Die Vorschau erlaubt Name und Classic-/Slim-Modell; erst Speichern legt den Skin in der lokalen Bibliothek ab. Bearbeiten und Entfernen ändern die Bibliothek. Erst die ausdrückliche Aktion „Skin auf Konto anwenden“ ändert den angemeldeten Minecraft-Skin. Ohne Konto ist eine Vorschau möglich.

## Capes und Community

Der Cape-Tab bietet lokale PNG-Uploads, Favoriten, Namenssuche, eine 3D-Vorschau mit Cape/Elytra und „Kein Cape“. Eigene Uploads sind aktuell ausschließlich lokale Launcher-Vorschauen. Offizielle Konto-Capes können nach erfolgreicher Minecraft-Anmeldung separat ausgerüstet oder abgelegt werden.

Der lokale Cape-Import erkennt PNG und JPG am Dateiinhalt, auch bei falscher Dateiendung. Bilder dürfen maximal 2 MB und 2048×2048 Pixel haben. 64×32-Texturen und HD-Vielfache bis 2048×1024 bleiben unverändert. Alte 22×17-Texturen werden auf die Standardfläche erweitert. Andere Bildmotive werden mit bilinearer Skalierung auf Vorder- und Rückseite eines HD-Atlas übertragen (bis 2048×1024; sichtbares Motiv bis 320×512). Bereits früher auf 10×16 verkleinerte Motive müssen aus der Originaldatei neu importiert werden; verlorene Details können nicht rekonstruiert werden. Beschädigte und andere Bildformate werden mit einer verständlichen Meldung zurückgewiesen; Skins behalten ihre strikten PNG-Abmessungen.

„Cape-Vorlage“ neben Hochladen speichert eine echte HD-PNG mit 1024×512 Pixeln. Rot markiert die Vorderseite (x=16–175, y=16–271), Dunkelrot die Rückseite (x=192–351, y=16–271). Schmale Streifen bilden die Kanten. Die übrige Fläche ist transparent und sollte frei bleiben. Die Vorlage lässt sich bearbeiten und anschließend ohne Auflösungsverlust wieder importieren. Die Galerie verwendet größere Vorschaubilder mit glatter Skalierung. Die vorbereitete Community-API akzeptiert dieselben HD-Abmessungen, ohne herunterzuskalieren; die spätere Minecraft-Mod muss diese Auflösung ebenfalls erhalten.

Es existiert noch kein gehosteter Community-Dienst. community-channel.json ist deshalb deaktiviert. Der lesende Launcher-Adapter und ein separater [Cape-Service](../community-capes-server/README.md) mit Konto-Verifikation, privaten ausstehenden Uploads, Moderation und Auswahl pro Spieler-UUID sind vorbereitet und getestet. Server-Schlüssel gehören ausschließlich auf den Server.

Vor einer Freischaltung fehlen Deployment unter HTTPS, die echte Integrationsprüfung mit einem freigegebenen Java-Konto, authentifizierter Community-Upload/Ausrüsten im Launcher und die Minecraft-Mod für die Darstellung. Andere Spieler sehen eigene Capes erst mit dieser Mod und dem gehosteten Dienst. Das ist kein bereits funktionierender globaler Cape-Katalog.

## Entwicklung und Prüfung

Zusätzlich zu npm ci im Hauptprojekt: npm ci --prefix community-capes-server --ignore-scripts. Dann npm run typecheck, npm test, npm test --prefix community-capes-server und npm run build. Die Release-Pipeline führt diese Prüfungen auf allen drei Plattformen vor der Installer-Veröffentlichung aus.

## Update-Auswahl und Icons

Beim Start prüft der installierte Windows-Launcher ausschließlich die Verfügbarkeit neuer Versionen. Einstellungen → Updates bietet getrennte Aktionen: Nach Updates suchen, Update herunterladen, Installieren & neu starten. Verfügbare Version, Downloadfortschritt und Installationsbereitschaft bleiben im Bereich sichtbar. Schließen des Launchers installiert kein bereits heruntergeladenes Update automatisch. Vor dem Download werden die signierten Release-Metadaten geprüft; vor der Installation wird der Installer gegen das signierte Manifest geprüft.

Die Oberfläche verwendet gemeinsame SVG-Icons statt von der Systemschrift abhängiger Symbolzeichen. Modrinth und CurseForge werden im Katalog und bei der Export-Auswahl durch lokal gebündelte Anbieter-Logos gekennzeichnet. Herkunft und Hinweise stehen in src/renderer/assets/BRAND-ICONS.md.

## Abhängigkeiten, Sicherungen und Downloads

Pflicht-Abhängigkeiten von Mods werden rekursiv über Modrinth bzw. CurseForge aufgelöst. Genau festgelegte Versionen bleiben festgelegt; Spielversion und Loader müssen zum Zielprofil passen. Optionale Abhängigkeiten werden nicht automatisch installiert. Zyklen werden dedupliziert; widersprüchliche Versionsvorgaben, kollidierende Dateinamen und mehr als 64 Projekte werden vor dem Download zurückgewiesen. Fehlende externe Pflichtdateien werden gemeldet. Vor jeder Inhaltsinstallation oder Aktualisierung entsteht eine Sicherung. Schlägt eine Datei fehl oder wird abgebrochen, wird der gesicherte Inhalt automatisch wiederhergestellt.

Im Profil öffnen die Reiter Inhalte, Welten, Screenshots und Sicherungen die jeweilige Verwaltung. Vollständige Sicherungen enthalten die Profileinstellungen, Mod-/Ressourcenordner, Welten und Screenshots. Automatische Inhaltssicherungen lassen Welten/Screenshots aus; Datapacks sichern die betroffene Welt. Welt sichern erstellt eine eigene Sicherung. Vor einer ausdrücklichen Wiederherstellung wird eine zusätzliche Schutzsicherung des betroffenen Bereichs angelegt. Gemeinsam genutzte Profilordner werden gemeinsam verändert; dies wird im Dialog angezeigt. Kontodaten/Launcher-Tokens und Java-Laufzeiten gehören nicht zu diesen Sicherungen. Grenzen: 1 GB pro Sicherung, maximal 20 Sicherungen je Profil; die letzten fünf automatischen Inhaltssicherungen werden behalten. Manuelle Sicherungen werden nur nach ausdrücklicher Aktion entfernt.

Modrinth-Modpacks lassen sich direkt unter Mods → Modpacks suchen, mit Bildern/Downloads anzeigen und nach Spielversion/Kategorie filtern. Der Dialog bietet konkrete Pack-Versionen. Das mrpack wird anhand von SHA1/SHA512 und zulässigen HTTPS-Quellen geprüft und anschließend über denselben sicheren Import als neues Profil angelegt. Vanilla, Fabric und Forge werden unterstützt; Quilt/NeoForge-Packs werden verständlich zurückgewiesen. Nach dem Pack-Download fragt der Import nach optionalen Client-Dateien. Minecraft-/Microsoft-Anmeldung ist zum späteren Start weiterhin notwendig.

Die Download-Schaltfläche oben öffnet eine Warteschlange für Katalog-Inhalte, Mod-Updates und Modpacks. Bis zu 20 Aufträge warten, maximal 50 Einträge bleiben in der Sitzungsansicht. Fortschritt und Ergebnis werden angezeigt; laufende oder wartende Aufträge sind abbrechbar und fehlgeschlagene/abgebrochene Aufträge erneut startbar. Ein erneuter Versuch lädt die betroffenen Dateien neu. Während Minecraft oder eine andere Profilaktion läuft, wartet der nächste Auftrag. Die Warteschlange gilt für die laufende Launcher-Sitzung, sie ist kein Download-Resume über einen App-Neustart. Java-/Spieldateien und Launcher-Updates behalten ihre getrennten Fortschrittsanzeigen.

Welten und Screenshots zeigen bis zu 120 lokale Einträge mit Datum und PNG-Vorschau. Weltordner und Originalbilder lassen sich öffnen, Screenshots separat speichern. Es findet kein automatischer Upload statt. Einstellungen → Fehlerdiagnose zeigt eine wahrscheinliche Ursache, passende Schritte, relevante Fehlerzeilen und den neuesten lokalen Absturzbericht. Die Analyse ist eine Hilfestellung, keine garantierte Ursachenerkennung. Erkannte Zugangstokens werden wie bei der Logansicht entfernt.

API-Grundlagen: [Modrinth-Versionen und Abhängigkeiten](https://docs.modrinth.com/api/operations/getversion/), [Modrinth-Suche](https://docs.modrinth.com/api/operations/searchprojects/) und [mrpack-Format](https://support.modrinth.com/en/articles/8802351-modrinth-modpack-format-mrpack).

## Zusätzliche Atmosphäre

Darstellung bietet zusätzlich Scarrix Nebula, Crimson Forge, Scarrix Codefall und Neon Horizon. Die dekorativen Ebenen bleiben hinter den lesbaren Inhaltsflächen und reagieren auf die vorhandene Einstellung Bewegung (Ein/Aus/System). Keine Videos oder externen Grafik-Downloads sind erforderlich. Profilbild, Name und Metadaten in der Profilliste stehen wieder links; Spielen, Mods und Zahnrad bleiben rechts. Normale Aktionsbuttons behalten zentrierte Beschriftungen.

## Freunde-Panel und Bewegung

Der Freunde-Button rechts neben dem Konto öffnet ein von rechts einfahrendes Panel. Das Zahnrad öffnet einen zweiten Einschub links daneben; bei kleinen Fenstern liegt dieser über dem Freunde-Panel. Escape schließt zuerst die Einstellungen und danach das Panel. Fokus bleibt im geöffneten Dialog und kehrt zu den auslösenden Buttons zurück. Suche, lokal vorgemerkte Spielernamen und kontoabhängige Einstellungen werden ohne Versand an einen Server gespeichert (friends/<Minecraft-UUID>.json, für Gäste separat guest.json). Namen werden auf das Minecraft-Namensformat begrenzt, Duplikate und Pfade zurückgewiesen. Profil-Sicherungen enthalten diese Dateien nicht.

Es ist noch kein Freunde-Dienst verbunden. Der Launcher zeigt keine erfundenen Kontakte, Anfragen oder Online-Zustände an. Vorgemerkte Namen sind nicht verifiziert und bedeuten keine bestätigte Freundschaft; Chat und Einladungen bleiben ohne Backend gesperrt. Status, Server-Sichtbarkeit, Anfragen, Einladungen und Benachrichtigungen sind lokale Wünsche, noch keine wirksamen Server-Einstellungen. Eine spätere Anbindung benötigt einen authentifizierten Dienst mit Minecraft-Konto-Verifikation, beidseitigen Anfragen, Presence, Blockieren/Entfernen und begrenzten Nachrichten-/Einladungsendpunkten. Vom Client übergebene UUIDs dürfen serverseitig nicht als Identitätsnachweis gelten. Es werden weder Microsoft-Tokens an neue Dienste gesendet noch Zugangsdaten eingebettet.

Tab-, Profilansichts- und Einstellungswechsel nutzen die View Transition API für kurze Aus-/Einblendungen mit sanfter Bewegung. Aktive Tabs, Button-Klicks, Menüs und Dialoge bekommen passende Übergänge. Bei schnellen Wechseln wird die vorherige Transition beendet; ohne API bleibt die Navigation normal nutzbar. Animationen aus und die Systemeinstellung reduzierte Bewegung schalten diese UI-Bewegung ab. Hintergrundbewegung bleibt unabhängig über die vorhandene Darstellungseinstellung steuerbar.


## Profil-Komfort, Startbildschirm und Konten

Profile lassen sich mit dem Stern als Favorit markieren. Favoriten stehen zuerst und haben einen eigenen Filter. Profilbilder waren bereits vorhanden; zusätzlich gibt es im Profil-Editor vier Profilfarben. Die Farbe markiert den linken Rand der Profilzeile. Favoriten und Kontozuordnungen bleiben lokal und werden nicht in öffentliche Modpack-Exporte übernommen.

Die Profilübersicht zeigt Gesamtspielzeit, letzte abgeschlossene Sitzung und sieben UTC-Tage. Neue Sitzungen werden bei ihrem Ende auf Tagesgrenzen aufgeteilt; vorhandene Gesamtzeiten bleiben erhalten. Frühere Versionen haben keine Tageswerte erfasst, daher werden dafür keine erfundenen Balken angezeigt. Bei einem abrupt beendeten Launcher kann die laufende Sitzung fehlen. Es gibt keine Hintergrund-Telemetrie.

Unter Einstellungen → Allgemein lassen sich Neuigkeiten auf der Spielen-Seite ausblenden, die Skin-Größe ändern und ein Profil zur Auswahl beim Launcher-Start festlegen. Es erfolgt kein automatischer Minecraft-Start. Wird das bevorzugte Profil gelöscht, wird diese Auswahl zurückgesetzt. Der überspringbare Einrichtungsdialog zeigt Stil, tatsächlich erkannten RAM und den Einstieg in den Profil-Assistenten. Er kann später in den Einstellungen erneut geöffnet werden.

Tastenkürzel: Strg/Cmd+1 Spielen, +2 Profile, +3 Mods, +4 Skins, +5 Capes, +Komma Einstellungen, +L Instanzen, +F die vorhandene Suche im aktuellen Tab. Bei geöffneten Dialogen greifen die globalen Kürzel nicht. Eingabefelder behalten normale Texteingaben.

Der Konto-Manager ist im Menü neben dem Spielernamen erreichbar. Maximal acht erfolgreich mit Microsoft und Minecraft bestätigte Konten werden mit Electron safeStorage in accounts.enc gespeichert; die bisherige account.enc bleibt der aktive Wiederherstellungseintrag. Ohne sichere Systemverschlüsselung gibt es keine dauerhafte Speicherung. Der Renderer erhält nur Minecraft-UUID und Namen, keine MSAL-Caches oder Tokens. Deaktivieren von „Anmeldung merken“ entfernt beide lokalen Speicher. Abmelden entfernt das aktive gespeicherte Konto; weitere Konten können separat nach Bestätigung entfernt werden. Das Betriebssystem-Microsoft-Konto wird dadurch nicht gelöscht.

Ein Kontowechsel stellt das gespeicherte Microsoft-Konto still wieder her und validiert erneut das Minecraft-Profil einschließlich UUID-Vergleich. Bei Ablauf, Netzwerkfehler oder falscher Identität bleiben vorherige Sitzung und aktiver verschlüsselter Eintrag erhalten. Während laufender Spiele/Installationen ist der manuelle Wechsel gesperrt. Ein Profil kann ein bevorzugtes gespeichertes Konto wählen; es wird vor dem Spielstart geprüft, ohne interaktive Anmeldung automatisch zu öffnen. Diese Abläufe sind mit simulierten Antworten getestet; echte Mehrkonto-End-to-End-Tests benötigen weiterhin die Minecraft-App-Freigabe.

## Prüfung vor dem Start und Absturz-Assistent

Jeder Spielstart prüft vor Anmeldung und Downloads die aktivierten Mod-Dateien. Der Profil-Button „Mods auf Konflikte prüfen“ zeigt die Ergebnisse auch ohne Konto. Erfasst werden doppelte Fabric-Mod-IDs, lokale Fabric-Pflichtabhängigkeiten und Versionsregeln, bereitgestellte Alias-IDs, eingebettete Mods sowie deklarierte breaks-Konflikte und offensichtliche Fabric/Forge-Verwechslungen. Deaktivierte Dateien und reine Server-Mods blockieren den Client nicht. Bei unlesbaren Metadaten werden vermutete fehlende Abhängigkeiten als Hinweise statt als sichere Startblocker gemeldet. Die Prüfung verändert keine Dateien und lädt nichts herunter.

Die Analyse ist begrenzt: Forge-TOML-Abhängigkeiten, Java-Regeln, alternative Fabric-Nested-Versionauflösung und Laufzeit-Konflikte prüft weiterhin der Modloader. Unbekannte Versionsregeln liefern einen Hinweis. Der Launcher behebt Konflikte nicht durch eigenständiges Löschen oder Deaktivieren. Nach einem erkannten Spielabsturz öffnet sich ein Assistent mit der vorhandenen Log-Diagnose, konkreten Schritten sowie Verweisen auf Instanzen/Logs und Profile. Normales Beenden und vom Benutzer gestoppte Prozesse lösen keinen Crash-Dialog aus.


## Einstellungen, Sprache und Suche

Die Einstellungsnavigation ist in Allgemein (Sprache, Akzentfarbe, Verhalten, Downloads & Oberfläche), Hintergrund, Erweitert (Java und Updates) sowie Debug (Fehlerdiagnose und Info) gegliedert. Unterpunkte springen innerhalb der Seite zum passenden Abschnitt. Die Suche arbeitet über alle Einträge, übersetzte Namen und feste Synonyme, ignoriert Großschreibung und Akzente und öffnet den gewählten Treffer direkt. Nicht vorhandene Funktionen wie Clip-Aufnahme werden nicht als leere Schaltflächen angezeigt. Minecraft-Einstellungen bleiben in den Profilen.

Das Sprachmenü bietet Deutsch, Englisch, Polnisch, Französisch, Italienisch, Türkisch und Portugiesisch mit gebündelten SVG-Flaggen. Auswahl per Maus, Pfeiltasten, Anfangsbuchstabe, Home/End und Enter; Escape verwirft nur die offene Auswahl. Das Menü passt sich der Fensterhöhe an und wird über der Oberfläche dargestellt, damit es in kleinen Fenstern nicht abgeschnitten wird. Die Auswahl wird gespeichert, im Hauptprozess geprüft und auch im HTML-lang-Attribut gesetzt.

Übersetzt sind die Launcher-Navigation, zentrale Aktionen sowie die Launcher-Einstellungen einschließlich Suchergebnissen und Hintergrundbeschreibungen. Es sind lokale Sprachpakete, kein Übersetzungsdienst. Profilnamen, eingegebene Texte, Mod-/Nachrichten-Inhalte und Logs werden nicht verändert. Andere Detaildialoge und technische Meldungen können weiterhin die ursprüngliche Sprache verwenden. Unbekannte Sprachcodes werden beim Lesen auf Deutsch zurückgesetzt und beim Speichern abgelehnt.


## Freigegebene Minecraft-Anmeldung und Texturen

Offizielle Profil- und Cape-Adressen von textures.minecraft.net werden vor der Ausgabe an die Oberfläche von HTTP auf HTTPS normalisiert. Dadurch bleiben die strengen Bildregeln erhalten und der echte Kontoskin wird sowohl in der Spielansicht als auch im Kontomenü geladen. Der Kopf berücksichtigt die zweite Skin-Ebene und zeigt bei einem Ladefehler das Scarrix-Zeichen statt einer leeren Fläche. Nur Gäste verwenden Steve. Der eigentliche Spielstart benötigt weiterhin eine gültige Microsoft-/Minecraft-Sitzung; die App-Freigabe ersetzt keine Prüfung der Profil-Mods und Loader-Version.

Minecraft-Downloads verwenden eine eigene begrenzte Warteschlange mit maximal acht gleichzeitigen Verbindungen pro Host. Metadatenabfragen für Minecraft und Fabric verwenden den nativen Fetch-Transport mit 30 Sekunden Zeitlimit; der Forge-Adapter nutzt den begrenzten Dispatcher. Dateiübertragungen verwenden automatische IPv4/IPv6-Auswahl. Die SDK-Prüfsummen, Cache-Prüfung und begrenzten Netzwerk-Wiederholungen bleiben aktiv. Ein Integrationstest mit dem echten SDK prüft Parallelität, Vermeidung eines Metadaten-Staus, Wiederaufnahme nach einem simulierten Verbindungsabbruch, Wiederverwendung geprüfter Dateien und Reparatur beschädigter Dateien.

Fabric verwendet das offizielle versionsgebundene Startprofil von meta.fabricmc.net statt des veralteten SDK-Profilgenerators. Dadurch werden auch neue deobfuskierte Minecraft-Versionen mit intermediary 0.0.0 korrekt von ihrer tatsächlichen Minecraft-Version abgeleitet; erforderliche JVM-Argumente bleiben erhalten. Profil-ID, Vererbung, Hauptklasse und Bibliotheksquellen werden vor dem Speichern geprüft. Basisspiel und endgültige Loader-Abhängigkeiten werden getrennt installiert, damit Assets pro Vorbereitung nur einmal geprüft werden.

Der Installer wurde innerhalb der kompatiblen Aufgaben-API auf 6.1.2 mit dem neuen Stream-Downloader 2.0.3 aktualisiert. Undici ist für diese Downloads explizit auf 7.29.0 festgelegt. Die SDK-6.3-API benötigt einen eigenen umfassenden Integrationsumbau und wird deshalb nicht halb integriert.

Live-Prüfung am 15.10.2026 unter Windows: Stille Wiederherstellung eines freigegebenen Java-Kontos, HTTPS-Skin/Kopf im echten Launcher-Fenster und Minecraft 26.2 mit stabilem Fabric 0.19.5/Java 25 bis ins sichtbare Hauptmenü geprüft. Dabei wurde ein vorhandenes sauberes Fabric-Profil verwendet. Ein separates Modprofil mit einer nur für 1.21.11 geeigneten Bibliothek bleibt durch die Mod-Prüfung geschützt; dessen Mods wurden nicht entfernt.
