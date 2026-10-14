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

Die Versionsliste lässt sich mit dem Pfeil ausklappen und nach Veröffentlichungstyp, Spielversion und Loader filtern. Datenpakete brauchen eine vorhandene Welt; Shader zusätzlich einen passenden Renderer wie Iris. Erforderliche Mod-Abhängigkeiten werden nach der Installation gemeldet, noch nicht automatisch installiert. Der Modpacks-Reiter führt zum vorhandenen .mrpack-Import in Profile; er ist noch kein Modpack-Suchkatalog.

## Skin-Bibliothek

Skins lassen sich aus PNG-Dateien, Spielernamen, UUIDs oder offiziellen textures.minecraft.net-Textur-URLs importieren. Beliebige fremde Download-Adressen werden nicht akzeptiert. Die Vorschau erlaubt Name und Classic-/Slim-Modell; erst Speichern legt den Skin in der lokalen Bibliothek ab. Bearbeiten und Entfernen ändern die Bibliothek. Erst die ausdrückliche Aktion „Skin auf Konto anwenden“ ändert den angemeldeten Minecraft-Skin. Ohne Konto ist eine Vorschau möglich.

## Capes und Community

Der Cape-Tab bietet lokale PNG-Uploads, Favoriten, Namenssuche, eine 3D-Vorschau mit Cape/Elytra und „Kein Cape“. Eigene Uploads sind aktuell ausschließlich lokale Launcher-Vorschauen. Offizielle Konto-Capes können nach erfolgreicher Minecraft-Anmeldung separat ausgerüstet oder abgelegt werden.

Es existiert noch kein gehosteter Community-Dienst. community-channel.json ist deshalb deaktiviert. Der lesende Launcher-Adapter und ein separater [Cape-Service](../community-capes-server/README.md) mit Konto-Verifikation, privaten ausstehenden Uploads, Moderation und Auswahl pro Spieler-UUID sind vorbereitet und getestet. Server-Schlüssel gehören ausschließlich auf den Server.

Vor einer Freischaltung fehlen Deployment unter HTTPS, die echte Integrationsprüfung mit einem freigegebenen Java-Konto, authentifizierter Community-Upload/Ausrüsten im Launcher und die Minecraft-Mod für die Darstellung. Andere Spieler sehen eigene Capes erst mit dieser Mod und dem gehosteten Dienst. Das ist kein bereits funktionierender globaler Cape-Katalog.

## Entwicklung und Prüfung

Zusätzlich zu npm ci im Hauptprojekt: npm ci --prefix community-capes-server --ignore-scripts. Dann npm run typecheck, npm test, npm test --prefix community-capes-server und npm run build. Die Release-Pipeline führt diese Prüfungen auf allen drei Plattformen vor der Installer-Veröffentlichung aus.
