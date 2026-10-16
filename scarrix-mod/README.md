# Scarrix HUD

Own MIT-licensed client-only Fabric mod. First supported target: **Minecraft 26.2, Java 25, Fabric Loader 0.19.5+, Fabric API 0.161.0+26.2+**. Other Minecraft versions are deliberately skipped by the launcher; this JAR must not be installed there.

## Use

Enable the Scarrix base for a 26.2 Fabric profile, or click **Basis ergänzen** in that profile. The launcher installs its bundled HUD offline, after verifying SHA-512 and its Fabric metadata. Open the menu with **Right Shift** in a world, title screen or pause screen, or use the **SCARRIX** button in the title/pause screen. Change this binding under Minecraft → Options → Controls → Key Binds → Scarrix Client.

- Right Shift opens a centered Scarrix home menu above a blurred game world. It has Mod Menu plus Cosmetics, Emotes and Friends, with original Scarrix branding and line icons.
- Mod Menu has 22 working modules, category filters (HUD, Items, World, Visual), a compact two-column list with smooth scrolling and a draggable scrollbar, and persistent search/category/scroll state when returning from settings. Each ellipsis opens that module's settings without changing its enabled state.
- Drag any enabled overlay on any Scarrix screen, or open the dedicated HUD editor. Right-click a HUD to open its settings. Positions are normalized to available screen space, persist per module, and remain inside the resized window; very large HUDs shrink to fit.
- Every module has its own scale, dark/outline/transparent background, text and accent RGB colors. Color presets or hexadecimal inputs are available. Direction HUD also provides width, field of view, intermediate directions, ticks, heading, edge fade, degree labels and degree sign. Scroll or use Page Up/Down for further settings.
- Direction HUD uses actual Minecraft yaw; 0° is north, 90° east, 180° south and 270° west. It does not currently include waypoints or pings. No third-party mod features are implied by the cards.
- Movement labels follow Minecraft's key bindings; jump is drawn as a bar. Ordinary HUDs hide with F1, outside a world and in unrelated screens. Scarrix menus keep the editor overlays visible.
- Cosmetics, Emotes and Friends have explicit availability pages. Additional in-game cosmetics/emotes are not implemented; shared cosmetics and friends still need the community service. No invented friends, online counts, synchronization or server requests are shown.
- German and English, with Minecraft's English fallback for other languages. Settings are atomically saved in the profile's config/scarrix-hud.json. Versions 0.1 and 0.2 settings migrate disabled choices, styles and positions. All 18 newly added modules start disabled. Reset affects only the selected module; resetting positions leaves styles and enabled states intact.
- Disable/remove the mod in the launcher Mods tab. Only an unchanged Scarrix-managed copy is automatically upgraded; user replacements and disabled/removed copies are respected. Settings survive upgrades. No account data, telemetry, networking or authentication changes are included.

## Build

Install **JDK 25 and Gradle 9.7.1**. From the repository root:

```sh
gradle -p scarrix-mod build --no-daemon
npm ci
npm run mod:bundle
npm run build
```

Loom 1.18.4 is pinned; 26.2 uses official unobfuscated class names and no intermediary remapping. Java tests cover persistence, migration, independent settings, drag geometry, resized windows, compass wraparound and negative coordinates. Fabric client game tests exercise Right Shift, home/menu cards, the ellipsis, dragging, saved positions and resizing in an isolated world, with screenshots. Run them with `gradle -p scarrix-mod runClientGameTest`; test classes and their local development world are excluded from release JARs. Launcher tests cover integrity, target matching, opt-out, user file preservation and safe managed upgrades.

The release workflow builds/tests the mod once, bundles the exact same JAR into all three launcher installers and publishes the JAR and source JAR as release assets. Generated JARs, Gradle caches and game directories are not committed. The ordinary launcher update verifies its release signature before applying the installer, which also protects the bundled mod manifest; this is not an independently signed network mod channel.

Fabric API references: [HUD API](https://docs.fabricmc.net/develop/rendering/hud), [key mappings](https://docs.fabricmc.net/develop/key-mappings), [screens](https://docs.fabricmc.net/develop/rendering/gui/custom-screens). Implementation is original Scarrix code; no NoRisk modules or source are included. The modules are client-side display/camera features: no gameplay automation, authentication bypass, server protocol changes, community/cape backend or cosmetics are included in this first mod.

## Modules in 0.3.0

Existing: FPS, coordinates, key display, Direction HUD.

New: ping, armor durability, held-item HUD, shield status, active effects, horizontal speed, block/sky light, biome, local clock, session timer, saved per-profile playtime, world age, inventory HUD, held-item counter, left/right CPS, hold-to-zoom, custom crosshair, and no hurt camera.

- Ping comes from Minecraft's player network information; singleplayer displays a dash. TPS is not estimated or invented.
- Inventory is a read-only view of the 27 main inventory slots. Item Counter counts the same item and components as the held stack; it is not a slot-locking or search mod. Item HUD shows the held item, not a rotating 3D model.
- CPS counts actual mouse press events in the game, excluding menus. Each side has a bounded one-second counter; it generates no clicks or other inputs.
- Zoom defaults to holding C (rebindable in Minecraft). Its 2–10× factor changes the rendered camera FOV, leaving the saved FOV option alone. No Hurt Cam cancels only the local hurt tilt. Four small, required client mixins target Minecraft 26.2's exact camera, renderer, crosshair and mouse APIs.
- Custom Crosshair remains centered; only ordinary HUDs can be dragged. Line length, gap, thickness, scale, colors, black outline and center dot are configurable. It replaces the vanilla crosshair render, including that layer's attack indicator; the vanilla crosshair returns when disabled.
- Session time starts with mod initialization. Playtime counts unpaused time in a world, is saved roughly every minute and on clean exit, and belongs to that profile. World Age is world game ticks / 24,000, not a local override of server time. The local clock uses the operating system time.
- Effect HUD displays up to six active effects. Armor and item displays use actual equipped items and durability. Empty or unavailable values remain dashes or a translated empty state.
- Block/sky light and biome are sampled from the loaded client world. No server packets, private services or authentication changes are added.

The reference video also contains substantial features such as item physics, freelook, fullbright, waypoints, chat editing, a community service, emotes and minigames. Those have not been implemented or advertised as working cards in this release. Original Scarrix code and line icons are used; no NoRisk source, module binaries or graphics are copied.

Client tests verify category filtering, scrolling to the last module, real inventory/effect readouts, physical CPS events, zoom's actual rendered FOV and restoration, rendering every overlay, drag persistence and resizing. Unit tests add bounded CPS expiry and migration with all new features off.
