package net.scarrix.hud;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.hud.VanillaHudElements;
import net.fabricmc.fabric.api.client.screen.v1.ScreenEvents;
import net.fabricmc.fabric.api.client.screen.v1.ScreenKeyboardEvents;
import net.fabricmc.fabric.api.client.screen.v1.Screens;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.resources.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public final class ScarrixHud implements ClientModInitializer {
    static final Logger LOG = LoggerFactory.getLogger("Scarrix HUD");
    static final Path FILE = FabricLoader.getInstance().getConfigDir().resolve("scarrix-hud.json");
    static HudSettings settings = new HudSettings();
    static KeyMapping menu;
    static final int RED = 0xFFFF354E, WHITE = 0xFFEAF0FA, MUTED = 0xFF9BA8BE;

    @Override public void onInitializeClient() {
        try { settings = HudSettings.load(FILE); }
        catch (IOException ex) { LOG.warn("Could not load HUD settings; defaults remain in memory", ex); }
        var category = KeyMapping.Category.register(Identifier.fromNamespaceAndPath("scarrix_hud", "menu"));
        menu = KeyMappingHelper.registerKeyMapping(new KeyMapping("key.scarrix_hud.menu", InputConstants.Type.KEYSYM, InputConstants.KEY_RSHIFT, category));
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (menu.consumeClick()) {
                if (client.gui.screen() == null && client.player != null) client.gui.setScreen(new HudMenu(null));
            }
        });
        ScreenEvents.AFTER_INIT.register((client, screen, width, height) -> {
            if (screen instanceof TitleScreen || screen instanceof PauseScreen) {
                Screens.getWidgets(screen).add(new ScarrixButton(width - 100, 8, 92, net.minecraft.network.chat.Component.literal("SCARRIX HUD"), button -> client.gui.setScreen(new HudMenu(screen))));
                ScreenKeyboardEvents.afterKeyPress(screen).register((s, event) -> {
                    if (menu.matches(event)) client.gui.setScreen(new HudMenu(s));
                });
            }
        });
        HudElementRegistry.attachElementBefore(VanillaHudElements.CHAT, Identifier.fromNamespaceAndPath("scarrix_hud", "overlay"), (graphics, delta) -> render(graphics, false));
        LOG.info("Scarrix HUD ready: FPS, coordinates and key display. Open with the configured Scarrix menu key.");
    }

    static void render(GuiGraphicsExtractor g, boolean preview) {
        Minecraft mc = Minecraft.getInstance();
        if (!preview && (mc.player == null || mc.gui.screen() != null || mc.gui.hud.isHidden())) return;
        List<String> lines = new ArrayList<>();
        if (settings.fps) lines.add(mc.getFps() + " FPS");
        if (settings.coordinates) lines.add(mc.player == null ? "XYZ  128 / 64 / -32" : "XYZ  " + HudSettings.blockCoordinate(mc.player.getX()) + " / " + HudSettings.blockCoordinate(mc.player.getY()) + " / " + HudSettings.blockCoordinate(mc.player.getZ()));
        int width = 112;
        for (String line : lines) width = Math.max(width, mc.font.width(line) + 16);
        int height = 28 + lines.size() * 14 + (settings.keys ? 72 : 0);
        if (lines.isEmpty() && !settings.keys) return;
        int x = HudSettings.anchorX(mc.getWindow().getGuiScaledWidth(), width, settings.margin, settings.corner);
        int y = HudSettings.anchorY(mc.getWindow().getGuiScaledHeight(), height, settings.margin, settings.corner);
        if (settings.background) g.fill(x, y, x + width, y + height, 0xCC0B0F18);
        g.fill(x, y, x + 2, y + height, RED);
        g.text(mc.font, "SCARRIX", x + 8, y + 6, RED, false);
        int row = y + 22;
        for (String line : lines) { g.text(mc.font, line, x + 8, row, WHITE, false); row += 14; }
        if (settings.keys) {
            int mid = x + width / 2;
            key(g, mc.options.keyUp, mid - 12, row, 24, false);
            key(g, mc.options.keyLeft, mid - 38, row + 25, 24, false);
            key(g, mc.options.keyDown, mid - 12, row + 25, 24, false);
            key(g, mc.options.keyRight, mid + 14, row + 25, 24, false);
            key(g, mc.options.keyJump, mid - 38, row + 50, 76, true);
        }
    }
    private static void key(GuiGraphicsExtractor g, KeyMapping key, int x, int y, int width, boolean jump) {
        Minecraft mc = Minecraft.getInstance();
        boolean down = key.isDown() && mc.gui.screen() == null;
        g.fill(x, y, x + width, y + 22, down ? RED : 0xDD1A2231);
        String label = jump ? "\u2501" : key.getTranslatedKeyMessage().getString();
        label = mc.font.plainSubstrByWidth(label, width - 4);
        g.text(mc.font, label, x + (width - mc.font.width(label)) / 2, y + (22 - mc.font.lineHeight) / 2, WHITE, false);
    }
}
