package net.scarrix.hud;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import java.io.IOException;

public final class HudMenu extends Screen {
    private final Screen parent;
    private boolean failed;
    private int top, left, panelWidth;
    public HudMenu(Screen parent) { super(Component.literal("Scarrix HUD")); this.parent = parent; }
    private Component label(String key, boolean value) { return Component.translatable(key).append(": ").append(Component.translatable(value ? "options.on" : "options.off")); }
    private void row(String key, int y, java.util.function.BooleanSupplier read, Runnable toggle) {
        addRenderableWidget(new ScarrixButton(left + 14, y, panelWidth - 28, label(key, read.getAsBoolean()), b -> { toggle.run(); b.setMessage(label(key, read.getAsBoolean())); }));
    }
    @Override protected void init() {
        panelWidth = Math.min(330, width - 16);
        left = (width - panelWidth) / 2;
        top = Math.max(6, (height - 234) / 2);
        var s = ScarrixHud.settings;
        row("scarrix.fps", top + 46, () -> s.fps, () -> s.fps = !s.fps);
        row("scarrix.coordinates", top + 70, () -> s.coordinates, () -> s.coordinates = !s.coordinates);
        row("scarrix.keys", top + 94, () -> s.keys, () -> s.keys = !s.keys);
        row("scarrix.background", top + 118, () -> s.background, () -> s.background = !s.background);
        addRenderableWidget(new ScarrixButton(left + 14, top + 142, panelWidth - 28, position(), b -> { s.corner = (s.corner + 1) % 4; b.setMessage(position()); }));
        int half = (panelWidth - 34) / 2;
        addRenderableWidget(new ScarrixButton(left + 14, top + 174, half, Component.translatable("scarrix.preview"), b -> minecraft.gui.setScreen(new HudPreview(this))));
        addRenderableWidget(new ScarrixButton(left + 20 + half, top + 174, half, Component.translatable("scarrix.reset"), b -> { ScarrixHud.settings = new HudSettings(); rebuildWidgets(); }));
        addRenderableWidget(new ScarrixButton(left + 14, top + 202, panelWidth - 28, Component.translatable("gui.done"), b -> onClose()));
    }
    private Component position() { return Component.translatable("scarrix.position").append(": ").append(Component.translatable("scarrix.corner." + ScarrixHud.settings.corner)); }
    @Override public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
        g.fill(left, top, left + panelWidth, top + 232, 0xF00B0F18);
        g.fill(left, top, left + panelWidth, top + 2, ScarrixHud.RED);
        super.extractRenderState(g, mouseX, mouseY, delta);
        g.text(font, "SCARRIX", (width - font.width("SCARRIX")) / 2, top + 10, ScarrixHud.RED, false);
        Component hint = Component.translatable(failed ? "scarrix.save_error" : "scarrix.subtitle");
        g.text(font, hint, (width - font.width(hint)) / 2, top + 27, failed ? ScarrixHud.RED : ScarrixHud.MUTED, false);
    }
    @Override public void onClose() {
        try { ScarrixHud.settings.save(ScarrixHud.FILE); minecraft.gui.setScreen(parent); }
        catch (IOException ex) { failed = true; ScarrixHud.LOG.warn("Could not save HUD settings", ex); }
    }
    @Override public boolean keyPressed(net.minecraft.client.input.KeyEvent event) {
        if (ScarrixHud.menu.matches(event)) { onClose(); return true; }
        return super.keyPressed(event);
    }
    @Override public boolean isPauseScreen() { return true; }
}
