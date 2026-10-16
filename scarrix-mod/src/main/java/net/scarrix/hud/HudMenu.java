package net.scarrix.hud;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.renderer.RenderPipelines;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;

public final class HudMenu extends ScarrixScreen {
    public HudMenu(Screen parent) { super(Component.literal("Scarrix Client"),parent); }
    @Override protected void init() {
        int w=Math.min(260,width-36),x=(width-w)/2,y=height/2;
        addRenderableWidget(new ScarrixButton(x,y,w,28,Component.literal("MOD MENU"),null,b -> minecraft.gui.setScreen(new ModScreen(this))));
        int total=3*36+12,start=(width-total)/2;
        String[] pages={"cosmetics","emotes","friends"},icons={"shirt","emote","friends"};
        for(int i=0;i<3;i++) { final String page=pages[i]; addRenderableWidget(new ScarrixButton(start+i*42,y+36,36,36,Component.translatable("scarrix."+page),icons[i],b -> minecraft.gui.setScreen(new CommunityScreen(this,page)))); }
    }
    @Override public void extractRenderState(GuiGraphicsExtractor g,int x,int y,float delta) {
        int center=width/2,top=height/2-58;
        g.blit(RenderPipelines.GUI_TEXTURED,Identifier.fromNamespaceAndPath("scarrix_hud","icon.png"),center-22,top-4,0,0,44,44,44,44);
        g.text(font,"SCARRIX",center-30-font.width("SCARRIX"),top+14,ScarrixHud.WHITE,false);
        g.text(font,"CLIENT",center+30,top+14,ScarrixHud.WHITE,false);
        super.extractRenderState(g,x,y,delta); hud(g,x,y);
    }
}
