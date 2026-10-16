package net.scarrix.hud;

import net.minecraft.client.Minecraft;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import java.util.*;

final class HudOverlay {
    static int width(HudModule module) {
        if(module==HudModule.DIRECTION)return ScarrixHud.settings.get(module).compassWidth;
        if(module==HudModule.KEYS)return 88;
        if(module==HudModule.ARMOR)return 112;
        if(module==HudModule.INVENTORY)return 170;
        if(module==HudModule.CROSSHAIR){var o=ScarrixHud.settings.get(module);return 2*(o.crosshairGap+o.crosshairSize+o.crosshairThickness+2);}
        return Math.min(230,Math.max(66,HudData.lines(module).stream().mapToInt(Minecraft.getInstance().font::width).max().orElse(60)+16+(module==HudModule.HELD_ITEM||module==HudModule.SHIELD?20:0)));
    }
    static int height(HudModule module) {
        return switch(module) {case KEYS -> 80;case DIRECTION -> 38;case ARMOR -> 94;case INVENTORY -> 62;case CROSSHAIR -> width(module);default -> 12+12*Math.max(1,HudData.lines(module).size());};
    }
    static HudLayout.Box bounds(HudModule module) {
        var mc=Minecraft.getInstance(); var o=ScarrixHud.settings.get(module);
        double scale=scale(module);
        int w=(int)Math.ceil(width(module)*scale),h=(int)Math.ceil(height(module)*scale);
        if(module==HudModule.CROSSHAIR)return new HudLayout.Box((mc.getWindow().getGuiScaledWidth()-w)/2,(mc.getWindow().getGuiScaledHeight()-h)/2,w,h);
        return new HudLayout.Box(HudLayout.pixel(mc.getWindow().getGuiScaledWidth(),w,o.x),HudLayout.pixel(mc.getWindow().getGuiScaledHeight(),h,o.y),w,h);
    }
    private static double scale(HudModule module) { var mc=Minecraft.getInstance(); return HudLayout.fittedScale(ScarrixHud.settings.get(module).scale,mc.getWindow().getGuiScaledWidth(),mc.getWindow().getGuiScaledHeight(),width(module),height(module)); }
    static void render(GuiGraphicsExtractor g,boolean editing) {
        var mc=Minecraft.getInstance();
        if(!editing && (mc.player==null || mc.gui.screen()!=null || mc.gui.hud.isHidden())) return;
        for(HudModule module:HudModule.values()) {
            var o=ScarrixHud.settings.get(module); if(!o.enabled || !module.overlay()) continue;
            if(module==HudModule.CROSSHAIR && !editing && !VisualHooks.crosshair())continue;
            var box=bounds(module); int w=width(module),h=height(module);
            g.pose().pushMatrix(); g.pose().translate(box.x(),box.y()); g.pose().scale((float)scale(module),(float)scale(module));
            if(o.background==1 && module!=HudModule.CROSSHAIR) g.fill(0,0,w,h,0xC010121A);
            if(o.background==2 && module!=HudModule.CROSSHAIR) g.outline(0,0,w,h,0xFF000000|o.accentColor);
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
                case ARMOR -> armor(g,o);
                case INVENTORY -> inventory(g,o);
                case CROSSHAIR -> crosshair(g,o);
                default -> {
                    var lines=HudData.lines(module);int offset=module==HudModule.HELD_ITEM||module==HudModule.SHIELD?20:0;
                    if(offset>0){var item=module==HudModule.SHIELD?HudData.shield():HudData.held();g.item(item,5,5);if(o.showNumbers)g.itemDecorations(mc.font,item,5,5);}
                    for(int i=0;i<lines.size();i++)g.text(mc.font,mc.font.plainSubstrByWidth(lines.get(i),w-16-offset),8+offset,6+i*12,color,false);
                }
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
    private static void armor(GuiGraphicsExtractor g,HudSettings.ModuleOptions o) {
        var mc=Minecraft.getInstance();for(int i=0;i<4;i++) {
            var stack=mc.player==null?net.minecraft.world.item.ItemStack.EMPTY:mc.player.getItemBySlot(HudData.ARMOR[i]);
            g.item(stack,5,4+i*22);if(o.showNumbers)g.itemDecorations(mc.font,stack,5,4+i*22);
            g.text(mc.font,HudData.durability(stack),26,8+i*22,0xFF000000|o.textColor,false);
        }
    }
    private static void inventory(GuiGraphicsExtractor g,HudSettings.ModuleOptions o) {
        var mc=Minecraft.getInstance();for(int i=0;i<27;i++) {
            int x=4+(i%9)*18,y=4+(i/9)*18;g.fill(x,y,x+17,y+17,0x35000000|o.textColor);
            var stack=mc.player==null?net.minecraft.world.item.ItemStack.EMPTY:mc.player.getInventory().getItem(i+9);
            g.item(stack,x,y);if(o.showNumbers)g.itemDecorations(mc.font,stack,x,y);
        }
    }
    private static void crosshair(GuiGraphicsExtractor g,HudSettings.ModuleOptions o) {
        int c=width(HudModule.CROSSHAIR)/2,gap=o.crosshairGap,n=o.crosshairSize,t=o.crosshairThickness,color=0xFF000000|o.textColor;
        int[][] bars={{c-gap-n,c-t/2,c-gap,c-t/2+t},{c+gap+1,c-t/2,c+gap+n+1,c-t/2+t},{c-t/2,c-gap-n,c-t/2+t,c-gap},{c-t/2,c+gap+1,c-t/2+t,c+gap+n+1}};
        for(int[] b:bars) {if(o.crosshairOutline)g.fill(b[0]-1,b[1]-1,b[2]+1,b[3]+1,0xFF000000);g.fill(b[0],b[1],b[2],b[3],color);}
        if(o.crosshairDot) {if(o.crosshairOutline)g.fill(c-1,c-1,c+t+1,c+t+1,0xFF000000);g.fill(c,c,c+t,c+t,0xFF000000|o.accentColor);}
    }

}
