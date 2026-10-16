package net.scarrix.hud;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

abstract class PanelScreen extends ScarrixScreen {
    protected int left,top,panelWidth,panelHeight;
    PanelScreen(Component title,Screen parent) { super(title,parent); }
    protected void layout() { panelWidth=Math.min(450,width-72); panelHeight=Math.min(260,height-36); left=(width-panelWidth+40)/2; top=(height-panelHeight)/2; }
    protected void navigation() {
        addRenderableWidget(new ScarrixButton(left-44,top,36,30,Component.translatable("gui.back"),"back",b -> onClose()));
        String[] pages={"mods","cosmetics","emotes","friends"},icons={"mods","shirt","emote","friends"};
        for(int i=0;i<4;i++) { final String p=pages[i]; addRenderableWidget(new ScarrixButton(left-44,top+38+i*36,36,30,Component.translatable("scarrix."+p),icons[i],b -> {
            persist(); minecraft.gui.setScreen(p.equals("mods")?new ModScreen(parent):new CommunityScreen(parent,p));
        })); }
    }
    protected void panel(GuiGraphicsExtractor g) {
        g.fill(left-48,top,left-4,top+panelHeight,0xE9171820); g.outline(left-48,top,44,panelHeight,0xFF383944);
        g.fill(left,top,left+panelWidth,top+panelHeight,0xE9181922); g.outline(left,top,panelWidth,panelHeight,0xFF383944);
        g.fill(left,top+32,left+panelWidth,top+33,0xFF383944);
        g.fill(left,top+panelHeight-22,left+panelWidth,top+panelHeight-21,0xFF383944);
        String footer=Component.translatable("scarrix.local").getString();
        g.text(font,footer,left+panelWidth-font.width(footer)-10,top+panelHeight-14,ScarrixHud.MUTED,false);
    }
    @Override protected void hud(GuiGraphicsExtractor g,int x,int y) {
        super.hud(g,x,y);
        // Navigation stays usable even if an existing HUD position overlaps the sidebar.
        g.nextStratum(); g.fill(left-48,top,left-4,top+panelHeight,0xFF171820);
        g.outline(left-48,top,44,panelHeight,0xFF383944);
        for(var child:children()) if(child instanceof net.minecraft.client.gui.components.AbstractWidget w && w.getX()<left) w.extractRenderState(g,x,y,0);
    }
    @Override public boolean mouseClicked(net.minecraft.client.input.MouseButtonEvent event,boolean doubleClick) {
        if(event.x()>=left-48 && event.x()<left-4 && event.y()>=top && event.y()<top+panelHeight) {
            for(var child:children()) if(child instanceof net.minecraft.client.gui.components.AbstractWidget w && w.getX()<left && w.isMouseOver(event.x(),event.y())) {
                setFocused(w); return w.mouseClicked(event,doubleClick);
            }
            return true;
        }
        return super.mouseClicked(event,doubleClick);
    }
}
