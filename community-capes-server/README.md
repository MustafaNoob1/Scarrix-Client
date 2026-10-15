# Scarrix Community Cape API – vorbereitet, nicht gehostet

Start: Node 22+, `npm ci`, Umgebungsvariablen SCARRIX_CAPE_SIGNING_KEY (mindestens 32 zufällige Zeichen), SCARRIX_CAPE_ADMIN_KEY (separater zufälliger Schlüssel), SCARRIX_CAPE_DATA und PORT setzen. `npm start` bindet nur 127.0.0.1; vor öffentlichem Betrieb HTTPS-Reverse-Proxy, Backups und Monitoring einrichten. Schlüssel gehören ausschließlich auf den Server. Keine Schlüssel in Launcher oder Mod.

## Konto-Proof
1. Launcher sendet Name und UUID des angemeldeten Java-Kontos an POST /v1/auth/challenge.
2. Launcher meldet das Konto mit seinem Minecraft-Token bei der offiziellen Session-Join-API für die zurückgegebene serverId an. Der Minecraft-Token wird NICHT an den Cape-Server übertragen. Dieser Vorgang darf nicht während einer laufenden Multiplayer-Sitzung erfolgen.
3. POST /v1/auth/complete mit challengeId. Der Server überprüft selbst über Mojang hasJoined, dass Name und UUID zum erfolgreich beigetretenen Konto gehören. Kein Vertrauen in einen frei eingegebenen Spielernamen.
4. Der eigene API-Token gilt 30 Minuten und ist nur für diesen Dienst gültig.

## Endpunkte
GET /v1/capes – freigegebene Capes; GET /v1/capes?mine=1 mit eigenem API-Token – eigene Uploads einschließlich Moderationsstatus. POST /v1/capes akzeptiert PNG-Atlanten mit 64×32 Pixeln oder HD-Vielfachen bis 2048×1024 (maximal 2 MB, Breite durch 64 teilbar); die vollständige Auflösung bleibt erhalten. Erforderlich: Authorization: Bearer eigener API-Token, X-Cape-Name. Uploads bleiben bis zur Moderation privat. PUT /v1/admin/capes/{id} mit X-Scarrix-Admin und JSON status approved/rejected. PUT /v1/me/cape mit eigenem API-Token und capeId oder null. GET /v1/players/{uuid} liefert nur ein freigegebenes ausgewähltes Cape. GET /v1/capes/{id}/texture.png liefert die PNG.

## Launcher und Minecraft-Mod
community-channel.json bleibt enabled=false/apiOrigin=null, bis eine eigene geprüfte HTTPS-Adresse existiert. Der Launcher hat einen lesenden Katalogadapter vorbereitet. Authentifizierter Community-Upload/Ausrüsten wird erst mit dem gehosteten Dienst integriert und real getestet; momentan werden Uploads lokal gespeichert.

Für die Sichtbarkeit im Spiel fehlt zusätzlich eine Scarrix-Minecraft-Mod. Sie muss pro Spieler-UUID GET /v1/players/{uuid} lesen, freigegebene Texturen laden, ein begrenztes Cache/Timeout verwenden und den Cape-Renderer ergänzen. Nur Nutzer dieser Mod sehen eigene Community-Capes. Offizielle Vanilla-Capes bleiben unabhängig davon erhalten. Ein beliebiges PNG kann nicht über die offizielle Microsoft-Cape-API freigeschaltet werden.

Dieser Dienst ist ein Ausgangspunkt für Deployment und Integration, kein bereits betriebener öffentlicher Dienst. Vor Aktivierung sind echte Java-Konto-Verifikation, HTTPS, Last-/Missbrauchstests, Moderation, Datenschutzhinweise und die Mod-Integration nötig.
