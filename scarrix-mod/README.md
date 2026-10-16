# Scarrix HUD

Own MIT-licensed client-only Fabric mod. First supported target: **Minecraft 26.2, Java 25, Fabric Loader 0.19.5+, Fabric API 0.161.0+26.2+**. Other Minecraft versions are deliberately skipped by the launcher; this JAR must not be installed there.

## Use

Enable the Scarrix base for a 26.2 Fabric profile, or click **Basis ergänzen** in that profile. The launcher installs its bundled HUD offline, after verifying SHA-512 and its Fabric metadata. Open the menu with **Right Shift** in a world, title screen or pause screen, or use the **SCARRIX HUD** button in the title/pause screen. Change this binding under Minecraft → Options → Controls → Key Binds → Scarrix Client.

- FPS, block coordinates and movement/jump key display can be toggled independently.
- Key labels follow Minecraft's configured bindings. The space/jump key is drawn as a bar. Displays are hidden when F1 is active, in other screens, and outside a world.
- Choose any screen corner, panel background, preview, or reset to defaults. Text and icons are centered in the mod's keyboard-accessible, narrated buttons.
- German and English translations; Minecraft's other languages fall back to English.
- Settings are stored atomically in the profile's `config/scarrix-hud.json`. A save error is shown in the menu; no account information or network requests are used.
- Disable/remove it in the profile's Mods tab. Explicit disabled/removed copies and manually replaced JARs are preserved. Only an unchanged file installed by Scarrix can be upgraded automatically. Turning off the base stops automatic installs; it does not delete installed mods.

## Build

Install **JDK 25 and Gradle 9.7.1**. From the repository root:

```sh
gradle -p scarrix-mod build --no-daemon
npm ci
npm run mod:bundle
npm run build
```

Loom 1.18.4 is pinned; 26.2 uses official unobfuscated class names and no intermediary remapping. Java tests cover settings persistence, malformed JSON, bounds and negative coordinates. Launcher tests cover integrity, target matching, opt-out, user file preservation and safe managed upgrades.

The release workflow builds/tests the mod once, bundles the exact same JAR into all three launcher installers and publishes the JAR and source JAR as release assets. Generated JARs, Gradle caches and game directories are not committed. The ordinary launcher update verifies its release signature before applying the installer, which also protects the bundled mod manifest; this is not an independently signed network mod channel.

Fabric API references: [HUD API](https://docs.fabricmc.net/develop/rendering/hud), [key mappings](https://docs.fabricmc.net/develop/key-mappings), [screens](https://docs.fabricmc.net/develop/rendering/gui/custom-screens). Implementation is original Scarrix code; no NoRisk modules or source are included. The HUD is purely a display feature: no gameplay automation, authentication bypass, server protocol changes, community/cape backend or cosmetics are included in this first mod.
