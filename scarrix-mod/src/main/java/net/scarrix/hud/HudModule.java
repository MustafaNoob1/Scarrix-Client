package net.scarrix.hud;

public enum HudModule {
    FPS("fps", "fps", "fps_desc", "fps"),
    COORDINATES("coordinates", "coordinates", "coordinates_desc", "pin"),
    KEYS("keys", "keys", "keys_desc", "keys"),
    DIRECTION("direction", "direction", "direction_desc", "compass");
    public final String id, title, description, icon;
    HudModule(String id, String title, String description, String icon) {
        this.id=id; this.title="scarrix."+title; this.description="scarrix."+description; this.icon=icon;
    }
}
