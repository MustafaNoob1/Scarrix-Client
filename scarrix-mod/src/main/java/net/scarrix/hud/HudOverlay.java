package net.scarrix.hud;

import net.minecraft.client.Minecraft;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import java.util.*;

final class HudOverlay {
    static int width(HudModule module) {
        var mc=Minecraft.getInstance();
        return switch(module) {
            case FPS -> Math.max(66,mc.font.width(mc.getFps()+" FPS")+16);
            case COORDINATES -> mc.font.width(coordinates())+16;
            case KEYS -> 88;
            case DIRECTION -> ScarrixHud.settings.get(module).compassWidth;
        };
    }
    static int height(HudModule module) { return switch(module) { case FPS,COORDINATES -> 24; case KEYS -> 80; case DIRECTION -> 38; }; }
    static HudLayout.Box bounds(HudModule module) {
        var mc=Minecraft.getInstance(); var o=ScarrixHud.settings.get(module);
        double scale=scale(module);
        int w=(int)Math.ceil(width(module)*scale),h=(int)Math.ceil(height(module)*scale);
        return new HudLayout.Box(HudLayout.pixel(mc.getWindow().getGuiScaledWidth(),w,o.x),HudLayout.pixel(mc.getWindow().getGuiScaledHeight(),h,o.y),w,h);
    }
    private static double scale(HudModule module) { var mc=Minecraft.getInstance(); return HudLayout.fittedScale(ScarrixHud.settings.get(module).scale,mc.getWindow().getGuiScaledWidth(),mc.getWindow().getGuiScaledHeight(),width(module),height(module)); }
    static void render(GuiGraphicsExtractor g,boolean editing) {
        var mc=Minecraft.getInstance();
        if(!editing && (mc.player==null || mc.gui.screen()!=null || mc.gui.hud.isHidden())) return;
        for(HudModule module:HudModule.values()) {
            var o=ScarrixHud.settings.get(module); if(!o.enabled) continue;
            var box=bounds(module); int w=width(module),h=height(module);
            g.pose().pushMatrix(); g.pose().translate(box.x(),box.y()); g.pose().scale((float)scale(module),(float)scale(module));
            if(o.background==1) g.fill(0,0,w,h,0xC010121A);
            if(o.background==2) g.outline(0,0,w,h,0xFF000000|o.accentColor);
            int color=0xFF000000|o.textColor;
            switch(module) {
                case FPS -> g.text(mc.font,mc.getFps()+" FPS",8,8,color,false);
                case COORDINATES -> g.text(mc.font,coordinates(),8,8,color,false);
                case KEYS -> {
                    key(g,mc.options.keyUp,32,4,24,false,o);
                    key(g,mc.options.keyLeft,6,29,24,false,o); key(g,mc.options.keyDown,32,29,24,false,o); key(g,mc.options.keyRight,58,29,24,false,o);
                    key(g,mc.options.keyJump,6,54,76,true,o);
                }
                case DIRECTION -> compass(g,w,o);
            }
            g.pose().popMatrix();
            if(editing) g.outline(box.x(),box.y(),box.width(),box.height(),0xB0FF354E);
        }
    }
    private static String coordinates() {
        var p=Minecraft.getInstance().player;
        return p==null?"XYZ 128 / 64 / -32":"XYZ "+HudSettings.blockCoordinate(p.getX())+" / "+HudSettings.blockCoordinate(p.getY())+" / "+HudSettings.blockCoordinate(p.getZ());
    }
    private static void key(GuiGraphicsExtractor g,KeyMapping key,int x,int y,int w,boolean jump,HudSettings.ModuleOptions o) {
        var mc=Minecraft.getInstance(); boolean down=key.isDown() && mc.gui.screen()==null;
        g.fill(x,y,x+w,y+22,down?0xFF000000|o.accentColor:0xCE242631);
        String label=jump?"\u2501":mc.font.plainSubstrByWidth(key.getTranslatedKeyMessage().getString(),w-4);
        g.text(mc.font,label,x+(w-mc.font.width(label))/2,y+(22-mc.font.lineHeight)/2,0xFF000000|o.textColor,false);
    }
    private static void compass(GuiGraphicsExtractor g,int w,HudSettings.ModuleOptions o) {
        var mc=Minecraft.getInstance(); double heading=mc.player==null?0:HudLayout.heading(mc.player.getYRot());
        int center=w/2,accent=0xFF000000|o.accentColor;
        if(o.heading) {
            String label=String.valueOf((int)Math.round(heading)%360)+(o.degreeSign?"°":"");
            g.text(mc.font,label,center-mc.font.width(label)/2,3,0xFF000000|o.textColor,false);
        }
        g.fill(center-2,14,center+3,16,accent); g.fill(center-1,16,center+2,18,accent);
        String[] names={"N","NE","E","SE","S","SW","W","NW"};
        for(int degrees=0;degrees<360;degrees+=15) {
            double offset=HudLayout.difference(degrees,heading);
            if(Math.abs(offset)>o.fieldOfView/2.0) continue;
            int x=center+(int)Math.round(offset/o.fieldOfView*(w-20));
            int alpha=o.fade?(int)Math.round(255*HudLayout.clamp((o.fieldOfView/2.0-Math.abs(offset))/12,0.1,1)):255;
            int color=alpha<<24|o.textColor;
            if(o.ticks) g.fill(x,23,x+1,27,color);
            String label=degrees%90==0?names[degrees/45]:degrees%45==0&&o.intercardinal?names[degrees/45]:o.degreeNumbers?String.valueOf(degrees):"";
            if(!label.isEmpty() && x-mc.font.width(label)/2>=0 && x+mc.font.width(label)/2<w) g.text(mc.font,label,x-mc.font.width(label)/2,28,color,false);
        }
    }
}
