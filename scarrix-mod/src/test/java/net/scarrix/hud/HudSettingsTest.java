package net.scarrix.hud;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

class HudSettingsTest {
    @TempDir Path temp;
    @Test void savesAndRestoresEveryToggle() throws Exception {
        Path file = temp.resolve("config/scarrix-hud.json");
        HudSettings s = new HudSettings();
        s.fps = false; s.coordinates = false; s.keys = false; s.background = false; s.corner = 3; s.margin = 20;
        s.save(file);
        HudSettings result = HudSettings.load(file);
        assertFalse(result.fps); assertFalse(result.coordinates); assertFalse(result.keys); assertFalse(result.background);
        assertEquals(3, result.corner); assertEquals(20, result.margin);
        assertEquals(1, Files.list(file.getParent()).count());
    }
    @Test void missingFieldsKeepDefaultsAndBoundsAreClamped() throws Exception {
        Path file = temp.resolve("settings.json");
        Files.writeString(file, "{\"corner\": 900, \"margin\": -100, \"keys\": false}");
        HudSettings result = HudSettings.load(file);
        assertTrue(result.fps); assertTrue(result.coordinates); assertFalse(result.keys);
        assertEquals(3, result.corner); assertEquals(4, result.margin);
    }
    @Test void invalidSettingsAreNotSilentlyOverwritten() throws Exception {
        Path file = temp.resolve("bad.json"); Files.writeString(file, "{broken}");
        assertThrows(java.io.IOException.class, () -> HudSettings.load(file));
        assertEquals("{broken}", Files.readString(file));
    }
    @Test void coordinatesAndCornersHandleNegativesAndSmallWindows() {
        assertEquals(-1, HudSettings.blockCoordinate(-0.01));
        assertEquals(-33, HudSettings.blockCoordinate(-32.2));
        assertEquals(8, HudSettings.anchorX(400, 100, 8, 0));
        assertEquals(292, HudSettings.anchorX(400, 100, 8, 1));
        assertEquals(192, HudSettings.anchorY(300, 100, 8, 2));
        assertEquals(0, HudSettings.anchorX(40, 100, 8, 1));
    }
}
