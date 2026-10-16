package net.scarrix.hud;

/** Resolution-independent positioning and compass math, shared by render and mouse hit tests. */
public final class HudLayout {
    public static double clamp(double v, double min, double max) { return Double.isFinite(v) ? Math.max(min, Math.min(max,v)) : min; }
    public static int pixel(int screen, int extent, double fraction) { return (int)Math.round(clamp(fraction,0,1)*Math.max(0,screen-extent)); }
    public static double fraction(double pixel, int screen, int extent) { return screen<=extent ? 0 : clamp(pixel/(screen-extent),0,1); }
    public static double fittedScale(double requested,int screenWidth,int screenHeight,int width,int height) { return Math.min(requested,Math.min(screenWidth/(double)width,screenHeight/(double)height)); }
    public static double heading(double yaw) { return ((yaw+180)%360+360)%360; }
    public static double difference(double direction, double heading) { return ((direction-heading+540)%360+360)%360-180; }
    public record Box(int x, int y, int width, int height) {
        public boolean contains(double px, double py) { return px>=x && py>=y && px<x+width && py<y+height; }
    }
}
