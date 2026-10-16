package net.scarrix.hud;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

/** Local, per-profile settings. No accounts, network access or telemetry. */
public final class HudSettings {
    private static final Gson JSON = new GsonBuilder().setPrettyPrinting().create();
    public boolean fps = true;
    public boolean coordinates = true;
    public boolean keys = true;
    public boolean background = true;
    public int corner = 0;
    public int margin = 8;

    public void normalize() {
        corner = Math.max(0, Math.min(3, corner));
        margin = Math.max(4, Math.min(32, margin));
    }
    public static HudSettings load(Path file) throws IOException {
        if (!Files.exists(file)) return new HudSettings();
        if (Files.isSymbolicLink(file) || Files.size(file) > 65536) throw new IOException("Invalid HUD settings file");
        try {
            HudSettings result = JSON.fromJson(Files.readString(file, StandardCharsets.UTF_8), HudSettings.class);
            if (result == null) throw new IOException("Empty HUD settings");
            result.normalize();
            return result;
        } catch (com.google.gson.JsonParseException ex) { throw new IOException("Invalid HUD settings JSON", ex); }
    }
    public void save(Path file) throws IOException {
        normalize();
        Files.createDirectories(file.getParent());
        if (Files.isSymbolicLink(file)) throw new IOException("HUD settings must not be a link");
        Path temp = Files.createTempFile(file.getParent(), ".scarrix-hud-", ".tmp");
        try {
            Files.writeString(temp, JSON.toJson(this), StandardCharsets.UTF_8);
            try { Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException ex) { Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temp); }
    }
    public static int anchorX(int screen, int content, int margin, int corner) {
        return Math.max(0, Math.min(screen - content, (corner % 2 == 1) ? screen - content - margin : margin));
    }
    public static int anchorY(int screen, int content, int margin, int corner) {
        return Math.max(0, Math.min(screen - content, corner >= 2 ? screen - content - margin : margin));
    }
    public static int blockCoordinate(double value) { return (int)Math.floor(value); }
}
