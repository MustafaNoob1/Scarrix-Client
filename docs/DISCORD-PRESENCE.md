# Discord Rich Presence

Die öffentliche Application ID steht in discord-presence.json. Der Anzeigename Scarrix Client und das App-Icon werden im Discord Developer Portal verwaltet. Das unter Rich Presence → Art Assets hochgeladene Logo muss scarrix_logo heißen. Weder Client Secret noch Bot- oder Benutzertoken werden benötigt oder ausgeliefert.

Angezeigt werden Idling auf Spielen/Einstellungen, Managing Profiles in der Profilbibliothek, Browsing Mods, Browsing Skins und Browsing Capes. Die Laufzeit wird beim Tabwechsel nicht zurückgesetzt. Das Logo wird als large_image-Asset mit dem Hinweis Scarrix Client verwendet. Einstellungen → Allgemein → Discord Rich Presence schaltet die Anzeige ab und leert die Aktivität.

Die Anbindung erfolgt im Electron-Hauptprozess über Discords dokumentierte lokale IPC-Pipes (0–9), unter Windows als Named Pipe und unter macOS/Linux über Unix-Sockets. Es werden ausschließlich feste Tab-Texte, PID, Startzeit und Logo-Schlüssel gesendet. Keine Spielernamen, Serveradressen, Microsoft-Tokens, Nachrichten oder Freundeslisten. READY-Benutzerdaten werden nicht gespeichert oder protokolliert. Der Renderer kann nur bekannte Ansichten melden.

Nach einem Disconnect wird mit begrenztem Backoff erneut verbunden. Handshake und Aktivitätsantworten haben Zeitlimits. Aufgeteilte/zusammenhängende Frames, Ping/Pong und zu große/ungültige Frames werden berücksichtigt. Schnelle Tabwechsel werden zusammengefasst, maximal eine Aktualisierung pro 15 Sekunden; dadurch kann die Discord-Anzeige kurz hinterherhinken. Ein bestätigtes SET_ACTIVITY führt zum Status In Discord sichtbar. Das bestätigt die RPC-Annahme, nicht eine Sichtbarkeit trotz Discord-Privatsphäre-Einstellungen.

Voraussetzung ist eine laufende Discord-Desktop-App mit erlaubter Aktivitätsanzeige. Die Browser-Version wird nicht unterstützt. Fremde IPC-Pakete lösen keine Aktionen, Nachrichten oder Spielbeitritte aus. Community-Server und Microsoft-App-Freigabe sind für diese reine Launcher-Anzeige nicht erforderlich. Tests simulieren das dokumentierte Protokoll; Name/Icon/Assets sind zusätzlich im echten Discord-Profil zu prüfen.

Referenzen: [Discord RPC over IPC](https://discord.com/developers/docs/topics/rpc), [SET_ACTIVITY und IPC-Hinweise](https://github.com/discord/discord-rpc/blob/master/documentation/hard-mode.md).
