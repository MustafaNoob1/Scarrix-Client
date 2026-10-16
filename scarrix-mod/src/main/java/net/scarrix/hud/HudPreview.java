package net.scarrix.hud;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

final class HudPreview extends Screen {
    private final Screen parent;
    HudPreview(Screen parent) { super(Component.translatable("scarrix.preview")); this.parent = parent; }
    @Override protected void init() {
        addRenderableWidget(new ScarrixButton((width - 120) / 2, height - 28, 120, Component.translatable("gui.back"), b -> onClose()));
    }
    @Override public void extractRenderState(GuiGraphicsExtractor g, int x, int y, float delta) {
        super.extractRenderState(g, x, y, delta);
        ScarrixHud.render(g, true);
    }
    @Override public void onClose() { minecraft.gui.setScreen(parent); }
}
