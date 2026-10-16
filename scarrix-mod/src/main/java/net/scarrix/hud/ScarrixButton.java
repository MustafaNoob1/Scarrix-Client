package net.scarrix.hud;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.network.chat.Component;

/** Keeps Minecraft's keyboard focus, click handling and narration with Scarrix visuals. */
final class ScarrixButton extends Button {
    ScarrixButton(int x, int y, int width, Component label, OnPress action) {
        super(x, y, width, 20, label, action, DEFAULT_NARRATION);
    }
    @Override protected void extractContents(GuiGraphicsExtractor g, int mouseX, int mouseY, float delta) {
        var font = Minecraft.getInstance().font;
        boolean highlighted = isHoveredOrFocused();
        int x = getX(), y = getY();
        g.fill(x, y, x + width, y + height, highlighted ? 0xFF52202E : 0xFF192130);
        g.fill(x, y + height - 1, x + width, y + height, highlighted ? ScarrixHud.RED : 0xFF354155);
        String text = font.plainSubstrByWidth(getMessage().getString(), width - 12);
        g.text(font, text, x + (width - font.width(text)) / 2, y + (height - font.lineHeight) / 2, active ? ScarrixHud.WHITE : ScarrixHud.MUTED, false);
    }
}
