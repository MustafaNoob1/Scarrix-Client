package net.scarrix.hud;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

final class HudPreview extends ScarrixScreen {
    HudPreview(Screen parent) { super(Component.translatable("scarrix.edit_hud"),parent); }
    @Override protected void init() {
        addRenderableWidget(new ScarrixButton(width/2-125,height-28,120,Component.translatable("gui.back"),b -> onClose()));
        addRenderableWidget(new ScarrixButton(width/2+5,height-28,120,Component.translatable("scarrix.reset_positions"),b -> {
            for(HudModule m:HudModule.values()) { var d=HudSettings.defaults(m); var o=ScarrixHud.settings.get(m); o.x=d.x; o.y=d.y; } persist();
        }));
    }
    @Override public void extractRenderState(GuiGraphicsExtractor g,int x,int y,float delta) {
        g.centeredText(font,Component.translatable("scarrix.drag_hint"),width/2,height-44,ScarrixHud.WHITE);
        super.extractRenderState(g,x,y,delta); hud(g,x,y);
    }
}
