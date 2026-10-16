package net.scarrix.hud;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.client.input.KeyEvent;
import net.minecraft.network.chat.Component;
import java.io.IOException;

/** Blurred game underlay, independent HUD layer and shared persistent drag editor. */
abstract class ScarrixScreen extends Screen {
    protected final Screen parent;
    private HudModule dragging;
    private double dragX,dragY;
    protected boolean saveFailed;
    ScarrixScreen(Component title,Screen parent) { super(title); this.parent=parent; }
    @Override public void extractBackground(GuiGraphicsExtractor g,int x,int y,float delta) {
        if(minecraft.level==null) super.extractBackground(g,x,y,delta);
        else { extractBlurredBackground(g); g.fill(0,0,width,height,0x4807080D); }
    }
    protected void hud(GuiGraphicsExtractor g,int x,int y) {
        g.nextStratum(); HudOverlay.render(g,true);
        for(HudModule m:HudModule.values()) if(ScarrixHud.settings.get(m).enabled && HudOverlay.bounds(m).contains(x,y)) {
            g.setTooltipForNextFrame(font,Component.translatable("scarrix.drag_hint"),x,y); break;
        }
        if(saveFailed) g.centeredText(font,Component.translatable("scarrix.save_error"),width/2,4,ScarrixHud.RED);
    }
    @Override public boolean mouseClicked(MouseButtonEvent event,boolean doubleClick) {
        HudModule[] modules=HudModule.values();
        for(int i=modules.length-1;i>=0;i--) {
            HudModule m=modules[i]; var box=HudOverlay.bounds(m);
            if(!ScarrixHud.settings.get(m).enabled || !box.contains(event.x(),event.y())) continue;
            if(event.button()==1) { minecraft.gui.setScreen(new ModuleScreen(this,m)); return true; }
            if(event.button()==0) { dragging=m; dragX=event.x()-box.x(); dragY=event.y()-box.y(); setFocused(null); return true; }
        }
        return super.mouseClicked(event,doubleClick);
    }
    @Override public boolean mouseDragged(MouseButtonEvent event,double dx,double dy) {
        if(dragging!=null) {
            var box=HudOverlay.bounds(dragging); var o=ScarrixHud.settings.get(dragging);
            o.x=HudLayout.fraction(event.x()-dragX,width,box.width()); o.y=HudLayout.fraction(event.y()-dragY,height,box.height());
            return true;
        }
        return super.mouseDragged(event,dx,dy);
    }
    @Override public boolean mouseReleased(MouseButtonEvent event) {
        if(dragging!=null) { dragging=null; persist(); return true; }
        return super.mouseReleased(event);
    }
    protected boolean persist() {
        try { ScarrixHud.settings.save(ScarrixHud.FILE); saveFailed=false; return true; }
        catch(IOException ex) { saveFailed=true; ScarrixHud.LOG.warn("Could not save HUD settings",ex); return false; }
    }
    @Override public void onClose() {
        // A second close after an explicit save failure leaves the screen without trapping the player.
        if(saveFailed || persist()) minecraft.gui.setScreen(parent);
    }
    @Override public boolean keyPressed(KeyEvent event) {
        if(ScarrixHud.menu.matches(event)) { if(persist() || saveFailed) minecraft.gui.setScreen(null); return true; }
        return super.keyPressed(event);
    }
    @Override public boolean isPauseScreen() { return false; }
}
