# Profile, Katalog, Skins und Capes

Die Settings-Navigation verwendet feste, gleich hohe Einträge. Auf der Spielseite sind Spielen und Profil-Auswahl getrennte Bedienelemente; das Profil-Menü zeigt Name, Version und Loader.

## Inhalte installieren

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
