package net.scarrix.hud;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.LinkedHashMap;
import java.util.Map;

/** Local, per-profile settings. Legacy 0.1 fields are migrated without losing disabled choices. */
public final class HudSettings {
    private static final Gson JSON = new GsonBuilder().setPrettyPrinting().create();
    public int schema = 2;
    public boolean fps = true, coordinates = true, keys = true, background = true;
    public int corner = 0, margin = 8;
    public Map<String, ModuleOptions> modules;
    public static final class ModuleOptions {
        public boolean enabled;
        public double x, y, scale = 1;
        public int background = 1, textColor = 0xEAF0FA, accentColor = 0xFF354E;
        public int compassWidth = 220, fieldOfView = 120;
        public boolean intercardinal = true, ticks = true, heading = true, fade = true;
        public boolean degreeNumbers = false, degreeSign = true;
        public void normalize() {
            x=HudLayout.clamp(x,0,1); y=HudLayout.clamp(y,0,1); scale=HudLayout.clamp(scale,0.5,2);
            background=Math.max(0,Math.min(2,background)); textColor &= 0xFFFFFF; accentColor &= 0xFFFFFF;
            compassWidth=Math.max(120,Math.min(360,compassWidth)); fieldOfView=Math.max(60,Math.min(180,fieldOfView));
        }
    }
    public static ModuleOptions defaults(HudModule module) {
        ModuleOptions o=new ModuleOptions();
        o.enabled=module!=HudModule.DIRECTION;
        o.x=module==HudModule.DIRECTION ? 0.5 : 0.015;
        o.y=switch(module) { case FPS -> 0.02; case COORDINATES -> 0.15; case KEYS -> 0.37; case DIRECTION -> 0.025; };
        return o;
    }
    public ModuleOptions get(HudModule module) { if(modules==null) normalize(); return modules.get(module.id); }
    public void reset(HudModule module) { modules.put(module.id,defaults(module)); }
    public void normalize() {
        corner = Math.max(0, Math.min(3, corner)); margin = Math.max(4, Math.min(32, margin));
        boolean legacy=modules==null;
        if(legacy) modules=new LinkedHashMap<>();
        modules.keySet().removeIf(k -> java.util.Arrays.stream(HudModule.values()).noneMatch(m -> m.id.equals(k)));
        for(HudModule module:HudModule.values()) {
            ModuleOptions o=modules.get(module.id);
            if(o==null) { o=defaults(module); modules.put(module.id,o); }
            if(legacy) {
                o.enabled=switch(module) {case FPS -> fps; case COORDINATES -> coordinates; case KEYS -> keys; case DIRECTION -> false;};
                o.background=background?1:0;
                if(corner%2==1) o.x=1-o.x;
                if(corner>=2) o.y=1-o.y;
            }
            o.normalize();
        }
        schema=2;
    }
    public static HudSettings load(Path file) throws IOException {
        if (!Files.exists(file)) { HudSettings result=new HudSettings(); result.normalize(); return result; }
        if (Files.isSymbolicLink(file) || Files.size(file) > 65536) throw new IOException("Invalid HUD settings file");
        try {
            HudSettings result=JSON.fromJson(Files.readString(file,StandardCharsets.UTF_8),HudSettings.class);
            if(result==null) throw new IOException("Empty HUD settings");
            result.normalize(); return result;
        } catch(com.google.gson.JsonParseException ex) { throw new IOException("Invalid HUD settings JSON",ex); }
    }
    public void save(Path file) throws IOException {
        normalize();
        fps=get(HudModule.FPS).enabled; coordinates=get(HudModule.COORDINATES).enabled; keys=get(HudModule.KEYS).enabled;
        Files.createDirectories(file.getParent());
        if(Files.isSymbolicLink(file)) throw new IOException("HUD settings must not be a link");
        Path temp=Files.createTempFile(file.getParent(),".scarrix-hud-",".tmp");
        try {
            Files.writeString(temp,JSON.toJson(this),StandardCharsets.UTF_8);
            try { Files.move(temp,file,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE); }
            catch(AtomicMoveNotSupportedException ex) { Files.move(temp,file,StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temp); }
    }
    public static int anchorX(int screen,int content,int margin,int corner) { return Math.max(0,Math.min(screen-content,corner%2==1?screen-content-margin:margin)); }
    public static int anchorY(int screen,int content,int margin,int corner) { return Math.max(0,Math.min(screen-content,corner>=2?screen-content-margin:margin)); }
    public static int blockCoordinate(double value) { return (int)Math.floor(value); }
}
