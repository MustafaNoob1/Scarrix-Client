package net.scarrix.hud;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

final class CommunityScreen extends PanelScreen {
    private final String page;
    CommunityScreen(Screen parent,String page) { super(Component.translatable("scarrix."+page),parent); this.page=page; }
    @Override protected void init() {
        layout(); navigation(); addRenderableWidget(new ScarrixButton(left+10,top+7,panelWidth-20,Component.translatable("scarrix."+page),b -> {}));
        addRenderableWidget(new ScarrixButton(left+12,top+panelHeight-52,panelWidth-24,Component.translatable("gui.back"),b -> onClose()));
    }
    @Override public void extractRenderState(GuiGraphicsExtractor g,int x,int y,float delta) {
        panel(g); IconPainter.draw(g,page.equals("cosmetics")?"shirt":page.equals("emotes")?"emote":"friends",left+panelWidth/2-15,top+46,30,ScarrixHud.RED);
        var lines=font.split(Component.translatable("scarrix."+page+"_status"),panelWidth-36);
        for(int i=0;i<Math.min(5,lines.size());i++) g.text(font,lines.get(i),left+18,top+88+i*12,ScarrixHud.MUTED,false);
        super.extractRenderState(g,x,y,delta); hud(g,x,y);
    }
}
