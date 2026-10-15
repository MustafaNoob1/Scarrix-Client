# Scarrix-Basis für Fabric

Neue Fabric-Profile erhalten automatisch eine eigene Scarrix-Mod-Basis. Bei nativen NoRisk-Profilexporten mit ausgewähltem zusätzlichem NoRisk-Paket wird die öffentliche Scarrix-Basis ergänzt. Gewöhnliche MRPack-/CurseForge-Modpacks behalten ihre Zusammenstellung; die Ergänzung ist dort über **Profil → Basis ergänzen** möglich. Bestehende Profile werden nicht ungefragt umgestellt.

## Enthaltene Projekte

- [Fabric API](https://modrinth.com/mod/fabric-api)
- [Cloth Config](https://modrinth.com/mod/cloth-config)
- [Fabric Language Kotlin](https://modrinth.com/mod/fabric-language-kotlin)
- [Sodium](https://modrinth.com/mod/sodium)
- [Lithium](https://modrinth.com/mod/lithium)
- [FerriteCore](https://modrinth.com/mod/ferrite-core)
- [Entity Culling](https://modrinth.com/mod/entityculling)
- [ImmediatelyFast](https://modrinth.com/mod/immediatelyfast)
- [Mod Menu](https://modrinth.com/mod/modmenu)

Benötigte zusätzliche Pflicht-Abhängigkeiten werden anhand ihrer offiziellen Modrinth-Projekt-/Versionsverweise nachgeladen. Zur getesteten 26.2-Zusammenstellung gehört beispielsweise auch Placeholder API. Versionen werden exakt nach Minecraft-Version und Fabric gefiltert. Releases werden bevorzugt; wenn es keinen Release gibt, ist eine passende Beta zulässig. Fehlt für einen optionalen Basis-Baustein eine veröffentlichte Version, wird das im Ergebnis erklärt. Für zwingend benötigte, aber nicht verfügbare Abhängigkeiten stoppt die Installation mit einem Hinweis.

Die Mod-JARs sind nicht im Scarrix-Installer enthalten. Downloads erfolgen von den Originalquellen mit SHA-1-/SHA-512-Prüfung. Die oben verlinkten Projekte enthalten Urheber-, Quellcode- und Lizenzinformationen. NoRisk-eigene `nrc-*`-Module gehören nicht zu dieser Basis und werden nicht kopiert.

## Verwaltung und Schutz vorhandener Dateien

Unter **Profil bearbeiten → Installation** lässt sich „Scarrix-Basis automatisch ergänzen“ ein- oder ausschalten. Ausschalten beendet die automatische Ergänzung; bereits installierte Mods bleiben im normalen Mods-Tab und können dort einzeln verwaltet werden. **Basis ergänzen** aktiviert die Ergänzung für dieses Profil und reiht die Prüfung in die Download-Warteschlange ein. Für neue Fabric-Profile wird sie direkt nach dem Anlegen eingereiht. Vor dem Start beziehungsweise Vorbereiten werden noch fehlende Basis-Dateien ergänzt.

Bereits vorhandene passende Mods werden anhand ihrer Fabric-Mod-ID erkannt und unverändert verwendet. Deaktivierte Mods werden nicht eingeschaltet. Entfernte, zuvor von der Basis installierte Mods werden für dieselbe Spielversion als abgewählt vermerkt. Wird eine abgewählte Bibliothek zwingend benötigt, erscheint eine Erklärung; Scarrix umgeht die Auswahl nicht. Beim NoRisk-Import wird zwischen einer ausdrücklich deaktivierten Mod und einer wegen falscher Quell-Spielversion automatisch inaktiv übernommenen Datei unterschieden. Für Letztere darf eine passende Basis-Version ergänzt werden.

Bereits vorhandene Versionen werden nicht automatisch überschrieben oder herabgestuft, auch wenn eine Pflicht-Abhängigkeit eine andere Version benötigt. In diesem Fall muss sie gezielt im Profil aktualisiert werden. Offensichtlich unpassende Minecraft-/Namespace-Versionen bleiben gesperrt; die Basis konvertiert keine alten Mods.

Downloads werden zunächst in einem eigenen Staging-Verzeichnis geprüft. Fehler bei Prüfsummen, Versionsbezügen, Dateikollisionen oder erkannten Konflikten nehmen ausschließlich die neu angefangenen Dateien zurück. Welten und eigene Konfigurationen werden nicht verändert. Es gilt weiterhin die lokale Mod-Prüfung; unbekannte Versionsregeln werden nicht als sicher erkannte Konflikte behandelt.

`scarrix-base.json` im Profilordner dokumentiert installierte Projekt-/Versions-IDs, Prüfsummen, abgewählte Bausteine und Hinweise. Ist die lokale Zusammenstellung unverändert, braucht die Basis bei weiteren Starts keinen erneuten Modrinth-Download. Die manuelle Ergänzung prüft fehlende beziehungsweise bislang nicht verfügbare Bausteine erneut; Aktualisierungen vorhandener Mods bleiben im bisherigen Update-Dialog.

ScarrixPack übernimmt die profilbezogene Basis-Einstellung. Die einzelnen Dateien und der Basis-Vermerk können im Exportdialog ausgewählt werden. Die Download- und Warteschlangenanzeige zeigt Fortschritt, Abbruch, Fehler und erneuten Versuch.
