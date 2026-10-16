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
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.resources.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.nio.file.Path;

public final class ScarrixHud implements ClientModInitializer {
    static final Logger LOG=LoggerFactory.getLogger("Scarrix HUD");
    static final Path FILE=FabricLoader.getInstance().getConfigDir().resolve("scarrix-hud.json");
    static HudSettings settings=new HudSettings();
    static KeyMapping menu;
    static final int RED=0xFFFF354E,WHITE=0xFFEAF0FA,MUTED=0xFF9BA8BE;
    @Override public void onInitializeClient() {
        try { settings=HudSettings.load(FILE); } catch(IOException ex) { settings.normalize(); LOG.warn("Could not load HUD settings",ex); }
        var category=KeyMapping.Category.register(Identifier.fromNamespaceAndPath("scarrix_hud","menu"));
        menu=KeyMappingHelper.registerKeyMapping(new KeyMapping("key.scarrix_hud.menu",InputConstants.Type.KEYSYM,InputConstants.KEY_RSHIFT,category));
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while(menu.consumeClick()) if(client.gui.screen()==null && client.player!=null) client.gui.setScreen(new HudMenu(null));
        });
        ScreenEvents.AFTER_INIT.register((client,screen,width,height) -> {
            if(screen instanceof TitleScreen || screen instanceof PauseScreen) {
                Screens.getWidgets(screen).add(new ScarrixButton(width-100,8,92,net.minecraft.network.chat.Component.literal("SCARRIX"),b -> client.gui.setScreen(new HudMenu(screen))));
                ScreenKeyboardEvents.afterKeyPress(screen).register((s,event) -> { if(menu.matches(event)) client.gui.setScreen(new HudMenu(s)); });
            }
        });
        HudElementRegistry.attachElementBefore(VanillaHudElements.CHAT,Identifier.fromNamespaceAndPath("scarrix_hud","overlay"),(g,d) -> HudOverlay.render(g,false));
        LOG.info("Scarrix HUD ready: modular HUD and drag editor. Open with the configured Scarrix menu key.");
    }
    static void render(GuiGraphicsExtractor g,boolean preview) { HudOverlay.render(g,preview); }
}
