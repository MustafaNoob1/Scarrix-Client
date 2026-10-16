package net.scarrix.hud;

import net.minecraft.client.Minecraft;

public final class VisualHooks {
    public static final ClickCounter CLICKS=new ClickCounter();
    public static boolean enabled(HudModule module) { return ScarrixHud.settings.get(module).enabled; }
    public static float zoomDivisor() {
        var mc=Minecraft.getInstance();
        return enabled(HudModule.ZOOM) && mc.player!=null && mc.gui.screen()==null && ScarrixHud.zoom!=null && ScarrixHud.zoom.isDown()?(float)ScarrixHud.settings.get(HudModule.ZOOM).zoomFactor:1;
    }
    public static boolean crosshair() {
        var mc=Minecraft.getInstance();return enabled(HudModule.CROSSHAIR) && mc.player!=null && !mc.player.isSpectator() && mc.options.getCameraType().isFirstPerson();
    }
    public static void mouseClick(int button,int action) {
        var mc=Minecraft.getInstance();if(action==1 && mc.player!=null && mc.gui.screen()==null && enabled(HudModule.CPS)) CLICKS.record(button,System.nanoTime());
    }
}
