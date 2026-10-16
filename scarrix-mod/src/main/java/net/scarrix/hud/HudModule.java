package net.scarrix.hud;

public enum HudModule {
    FPS("fps","fps","hud"), COORDINATES("coordinates","pin","hud"), KEYS("keys","keys","hud"), DIRECTION("direction","compass","hud"),
    PING("ping","signal","hud"), ARMOR("armor","shirt","items"), HELD_ITEM("held_item","sword","items"), SHIELD("shield","shield","items"),
    POTIONS("potions","potion","hud"), SPEED("speed","speed","hud"), LIGHT("light","sun","world"), BIOME("biome","tree","world"),
    CLOCK("clock","clock","hud"), SESSION("session","clock","hud"), PLAYTIME("playtime","clock","hud"), WORLD_AGE("world_age","sun","world"),
    INVENTORY("inventory","mods","items"), ITEM_COUNTER("item_counter","box","items"), CPS("cps","mouse","hud"),
    ZOOM("zoom","search","visual"), CROSSHAIR("crosshair","crosshair","visual"), NO_HURT_CAM("no_hurt_cam","camera","visual");
    public final String id,title,description,icon,category;
    HudModule(String id,String icon,String category) { this.id=id;title="scarrix."+id;description=title+"_desc";this.icon=icon;this.category=category; }
    public boolean overlay() { return this!=ZOOM && this!=NO_HURT_CAM; }
    public boolean draggable() { return overlay() && this!=CROSSHAIR; }
    public boolean enabledByDefault() { return this==FPS || this==COORDINATES || this==KEYS; }
}
