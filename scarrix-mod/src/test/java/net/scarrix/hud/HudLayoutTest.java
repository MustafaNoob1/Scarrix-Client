package net.scarrix.hud;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;

class HudLayoutTest {
    @TempDir Path temp;
    @Test void minecraftYawUsesNorthEastSouthWestAndWrapsAtNorth() {
        assertEquals(0,HudLayout.heading(-180)); assertEquals(90,HudLayout.heading(-90));
        assertEquals(180,HudLayout.heading(0)); assertEquals(270,HudLayout.heading(90));
        assertEquals(2,HudLayout.difference(1,359)); assertEquals(-2,HudLayout.difference(359,1));
        assertEquals(0,HudLayout.difference(720,0));
    }
    @Test void dragCoordinatesRoundTripAndClampAtEdges() {
        assertEquals(150,HudLayout.pixel(400,100,HudLayout.fraction(150,400,100)));
        assertEquals(0,HudLayout.fraction(-30,400,100)); assertEquals(1,HudLayout.fraction(900,400,100));
        assertEquals(0,HudLayout.fraction(10,60,100));
        assertEquals(320.0/360,HudLayout.fittedScale(2,320,240,360,38),0.00001);
        assertTrue(new HudLayout.Box(5,10,30,20).contains(5,10)); assertFalse(new HudLayout.Box(5,10,30,20).contains(35,30));
    }
    @Test void oldConfigMigratesDisabledChoicesAndBackground() throws Exception {
        Path file=temp.resolve("old.json"); Files.writeString(file,"{\"fps\":false,\"coordinates\":true,\"keys\":false,\"background\":false,\"corner\":1}");
        var s=HudSettings.load(file);
        assertFalse(s.get(HudModule.FPS).enabled); assertTrue(s.get(HudModule.COORDINATES).enabled);
        assertFalse(s.get(HudModule.KEYS).enabled); assertFalse(s.get(HudModule.DIRECTION).enabled);
        assertEquals(0,s.get(HudModule.FPS).background); assertTrue(s.get(HudModule.FPS).x>0.9);
    }
    @Test void independentPositionsColorsAndCompassOptionsSurviveSaveAndReload() throws Exception {
        var s=new HudSettings(); s.normalize(); var o=s.get(HudModule.DIRECTION);
        o.enabled=true; o.x=0.75; o.y=0.6; o.scale=1.5; o.textColor=0x123456; o.accentColor=0xABCDEF;
        o.compassWidth=300; o.fieldOfView=180; o.intercardinal=false; o.fade=false; o.degreeNumbers=true;
        Path file=temp.resolve("new.json"); s.save(file); var loaded=HudSettings.load(file).get(HudModule.DIRECTION);
        assertEquals(0.75,loaded.x); assertEquals(0.6,loaded.y); assertEquals(1.5,loaded.scale);
        assertEquals(0x123456,loaded.textColor); assertEquals(0xABCDEF,loaded.accentColor);
        assertEquals(300,loaded.compassWidth); assertEquals(180,loaded.fieldOfView); assertFalse(loaded.fade); assertFalse(loaded.intercardinal); assertTrue(loaded.degreeNumbers);
        assertEquals(0.015,s.get(HudModule.FPS).x);
    }
    @Test void resetOnlyChangesTheSelectedModuleAndBoundsRejectNonFiniteValues() {
        var s=new HudSettings(); s.normalize(); s.get(HudModule.FPS).x=0.8; var o=s.get(HudModule.DIRECTION);
        o.x=Double.NaN; o.y=Double.POSITIVE_INFINITY; o.scale=-100; o.fieldOfView=900; o.compassWidth=-10; s.normalize();
        assertEquals(0,o.x); assertEquals(0,o.y); assertEquals(0.5,o.scale); assertEquals(180,o.fieldOfView); assertEquals(120,o.compassWidth);
        s.reset(HudModule.DIRECTION); assertEquals(0.8,s.get(HudModule.FPS).x); assertEquals(220,s.get(HudModule.DIRECTION).compassWidth);
    }
}
