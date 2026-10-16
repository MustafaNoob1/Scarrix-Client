package net.scarrix.hud;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

class ExtraModulesTest {
    @TempDir Path temp;
    @Test void clickCountersExpireIndependentlyAndRemainBounded() {
        var c=new ClickCounter(); c.record(0,0);c.record(1,300_000_000);c.record(0,700_000_000);
        assertEquals(2,c.count(0,900_000_000)); assertEquals(1,c.count(1,900_000_000));
        assertEquals(1,c.count(0,1_000_000_000)); assertEquals(0,c.count(1,1_300_000_000));
        for(int i=0;i<2000;i++)c.record(0,2_000_000_000L);
        assertEquals(1000,c.count(0,2_000_000_000L)); assertEquals(0,c.count(0,3_000_000_000L));
    }
    @Test void upgradingAProfileKeepsExistingPreferencesAndNewModulesOff() throws Exception {
        Path file=temp.resolve("old.json"); Files.writeString(file,"{\"schema\":2,\"modules\":{\"fps\":{\"enabled\":false,\"x\":0.7},\"direction\":{\"enabled\":true,\"scale\":0.8}}}");
        var s=HudSettings.load(file);assertFalse(s.get(HudModule.FPS).enabled);assertEquals(0.7,s.get(HudModule.FPS).x);assertTrue(s.get(HudModule.DIRECTION).enabled);assertEquals(0.8,s.get(HudModule.DIRECTION).scale);
        assertEquals(22,s.modules.size());for(var m:HudModule.values())if(m.ordinal()>3)assertFalse(s.get(m).enabled,m.id);
    }
    @Test void visualOptionsAndPlaytimePersistWithValidatedBounds() throws Exception {
        var s=new HudSettings();s.normalize();s.playedSeconds=12345;s.get(HudModule.ZOOM).zoomFactor=9;s.get(HudModule.CROSSHAIR).crosshairSize=16;s.get(HudModule.CROSSHAIR).crosshairDot=true;
        var p=temp.resolve("settings.json");s.save(p);var restored=HudSettings.load(p);assertEquals(12345,restored.playedSeconds);assertEquals(9,restored.get(HudModule.ZOOM).zoomFactor);assertTrue(restored.get(HudModule.CROSSHAIR).crosshairDot);
        restored.get(HudModule.ZOOM).zoomFactor=Double.POSITIVE_INFINITY;restored.get(HudModule.CROSSHAIR).crosshairThickness=500;restored.normalize();assertEquals(2,restored.get(HudModule.ZOOM).zoomFactor);assertEquals(4,restored.get(HudModule.CROSSHAIR).crosshairThickness);
        assertFalse(HudModule.ZOOM.overlay());assertFalse(HudModule.NO_HURT_CAM.draggable());assertFalse(HudModule.CROSSHAIR.draggable());assertTrue(HudModule.ARMOR.draggable());
    }
}
