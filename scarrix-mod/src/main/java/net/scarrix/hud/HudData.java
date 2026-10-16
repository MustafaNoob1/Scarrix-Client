package net.scarrix.hud;

import net.minecraft.client.Minecraft;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.level.LightLayer;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.network.chat.Component;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

final class HudData {
    static final EquipmentSlot[] ARMOR={EquipmentSlot.HEAD,EquipmentSlot.CHEST,EquipmentSlot.LEGS,EquipmentSlot.FEET};
    private static final DateTimeFormatter CLOCK=DateTimeFormatter.ofPattern("HH:mm:ss");
    static String duration(long seconds) { return String.format(Locale.ROOT,"%02d:%02d:%02d",seconds/3600,seconds/60%60,seconds%60); }
    static String tr(String key) { return Component.translatable("scarrix."+key).getString(); }
    static ItemStack held() { var p=Minecraft.getInstance().player;return p==null?ItemStack.EMPTY:p.getMainHandItem(); }
    static ItemStack shield() {var p=Minecraft.getInstance().player;if(p==null)return ItemStack.EMPTY;return p.getOffhandItem().is(Items.SHIELD)?p.getOffhandItem():p.getMainHandItem().is(Items.SHIELD)?p.getMainHandItem():ItemStack.EMPTY;}
    static String durability(ItemStack item) {return item.isEmpty()?"—":item.isDamageableItem()?Math.max(0,item.getMaxDamage()-item.getDamageValue())+" / "+item.getMaxDamage():"×"+item.getCount();}
    static List<String> lines(HudModule module) {
        var mc=Minecraft.getInstance();var p=mc.player;var level=mc.level;
        return switch(module) {
            case FPS -> List.of(mc.getFps()+" FPS");
            case COORDINATES -> List.of(p==null?"XYZ —":"XYZ "+HudSettings.blockCoordinate(p.getX())+" / "+HudSettings.blockCoordinate(p.getY())+" / "+HudSettings.blockCoordinate(p.getZ()));
            case PING -> {var info=p!=null&&mc.getConnection()!=null?mc.getConnection().getPlayerInfo(p.getUUID()):null;yield List.of(tr("ping")+": "+(mc.hasSingleplayerServer()||info==null?"—":info.getLatency()+" ms"));}
            case SPEED -> List.of(tr("speed")+": "+String.format(Locale.ROOT,"%.2f m/s",p==null?0:Math.hypot(p.getX()-p.xo,p.getZ()-p.zo)*20));
            case LIGHT -> List.of(tr("light")+": "+(p==null||level==null?"—":level.getBrightness(LightLayer.BLOCK,p.blockPosition())+" / "+level.getBrightness(LightLayer.SKY,p.blockPosition())));
            case BIOME -> List.of(tr("biome")+": "+(p==null||level==null?"—":level.getBiome(p.blockPosition()).unwrapKey().map(k -> k.identifier().getPath().replace('_',' ')).orElse("—")));
            case CLOCK -> List.of(LocalTime.now().format(CLOCK));
            case SESSION -> List.of(tr("session")+": "+duration((System.nanoTime()-ScarrixHud.startedAt)/1_000_000_000L));
            case PLAYTIME -> List.of(tr("playtime")+": "+duration(ScarrixHud.settings.playedSeconds));
            case WORLD_AGE -> List.of(tr("world_age")+": "+(level==null?"—":String.format(Locale.ROOT,"%.1f",level.getGameTime()/24000.0)));
            case CPS -> List.of(VisualHooks.CLICKS.count(0,System.nanoTime())+" | "+VisualHooks.CLICKS.count(1,System.nanoTime())+" CPS");
            case SHIELD -> List.of(tr("shield")+": "+(shield().isEmpty()?"—":tr(p.isBlocking()?"blocking":"ready")),durability(shield()));
            case HELD_ITEM -> List.of(held().isEmpty()?"—":held().getHoverName().getString(),durability(held()));
            case ITEM_COUNTER -> {
                ItemStack selected=held();int count=0;
                if(p!=null&&!selected.isEmpty())for(int i=0;i<p.getInventory().getContainerSize();i++){ItemStack stack=p.getInventory().getItem(i);if(ItemStack.isSameItemSameComponents(selected,stack))count+=stack.getCount();}
                yield List.of(selected.isEmpty()?tr("item_counter")+": —":selected.getHoverName().getString()+": "+count);
            }
            case POTIONS -> {
                List<String> result=new ArrayList<>();if(p!=null)for(var effect:p.getActiveEffects()) {if(result.size()==6)break;result.add(effect.getEffect().value().getDisplayName().getString()+" "+(effect.getAmplifier()+1)+" · "+(effect.isInfiniteDuration()?"∞":duration(effect.getDuration()/20)));}
                if(result.isEmpty())result.add(tr("no_effects"));yield result;
            }
            default -> List.of();
        };
    }
}
