package net.scarrix.hud;

import com.mojang.blaze3d.platform.InputConstants;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.client.input.MouseButtonInfo;
import net.minecraft.network.chat.Component;

/** Real client tests live in their own source set and are never shipped in the mod. */
public final class HudClientTest implements FabricClientGameTest {
    private static void require(boolean condition,String message) { if(!condition) throw new AssertionError(message); }
    @Override public void runTest(ClientGameTestContext ctx) {
        try(var world=ctx.worldBuilder().create()) {
            world.getConnection().waitForChunksRender();
            ctx.getInput().resizeWindow(1280,720);
            ctx.runOnClient(mc -> { mc.options.guiScale().set(2); mc.resizeGui(); ScarrixHud.settings=new HudSettings(); ScarrixHud.settings.normalize(); });
            ctx.setScreen(() -> null); ctx.getInput().pressKey(InputConstants.KEY_RSHIFT); ctx.waitForScreen(HudMenu.class); ctx.waitTicks(3);
            ctx.getInput().setCursorPos(0,0); ctx.takeScreenshot("scarrix-home");
            ctx.clickScreenButton("MOD MENU"); ctx.waitForScreen(ModScreen.class);
            String label=ctx.computeOnClient(mc -> Component.translatable(HudModule.DIRECTION.title).append(": ").append(Component.translatable("options.off")).getString());
            ctx.clickScreenButton(label);
            ctx.runOnClient(mc -> require(ScarrixHud.settings.get(HudModule.DIRECTION).enabled,"Tile did not enable Direction HUD"));
            ctx.runOnClient(mc -> {
                var search=(net.minecraft.client.gui.components.EditBox)mc.gui.screen().children().stream().filter(w -> w instanceof net.minecraft.client.gui.components.EditBox).findFirst().orElseThrow();
                search.setValue("direction");
                long visibleGears=mc.gui.screen().children().stream().filter(w -> w instanceof AbstractWidget a && a.visible && a.getMessage().getString().equals("…")).count();
                require(visibleGears==1,"Search did not filter the module list"); search.setValue("");
            });
            ctx.getInput().setCursorPos(0,0); ctx.waitTicks(2); ctx.takeScreenshot("scarrix-mods-direction");
            // Hit the actual ellipsis button inside its tile: this must open settings rather than toggle the tile.
            ctx.runOnClient(mc -> {
                var screen=mc.gui.screen();
                AbstractWidget gear=(AbstractWidget)screen.children().stream().filter(w -> w instanceof AbstractWidget a && a.getMessage().getString().equals("…")).skip(3).findFirst().orElseThrow();
                screen.mouseClicked(new MouseButtonEvent(gear.getX()+10,gear.getY()+10,new MouseButtonInfo(0,0)),false);
            });
            ctx.waitForScreen(ModuleScreen.class); ctx.waitTicks(2); ctx.takeScreenshot("scarrix-direction-settings");
            ctx.runOnClient(mc -> require(ScarrixHud.settings.get(HudModule.DIRECTION).enabled,"Ellipsis toggled instead of opening settings"));
            ctx.runOnClient(mc -> {
                var screen=(ModuleScreen)mc.gui.screen();
                var color=(net.minecraft.client.gui.components.EditBox)screen.children().stream().filter(w -> w instanceof net.minecraft.client.gui.components.EditBox a && a.getValue().equals("#EAF0FA")).findFirst().orElseThrow();
                color.setValue("#ABCDEF"); require(ScarrixHud.settings.get(HudModule.DIRECTION).textColor==0xABCDEF,"RGB color edit was not applied");
                for(int i=0;i<7;i++) screen.mouseScrolled(screen.left+20,screen.top+80,0,-1);
                for(var child:screen.children()) if(child instanceof AbstractWidget a && a.visible && a.getX()>=screen.left && a.getY()>=screen.top+33)
                    require(a.getY()>=screen.top+52 && a.getY()+a.getHeight()<=screen.top+screen.panelHeight-25,"A scrolled row covers the panel header or footer");
            });
            ctx.waitTicks(2); ctx.takeScreenshot("scarrix-compass-options");
            String degrees=ctx.computeOnClient(mc -> Component.translatable("scarrix.degree_numbers").append(": ").append(Component.translatable("options.off")).getString());
            ctx.clickScreenButton(degrees); ctx.runOnClient(mc -> require(ScarrixHud.settings.get(HudModule.DIRECTION).degreeNumbers,"Compass option did not toggle"));
            ctx.runOnClient(mc -> {
                var screen=(ModuleScreen)mc.gui.screen();
                var cosmetics=(AbstractWidget)screen.children().stream().filter(w -> w instanceof AbstractWidget a && a.getX()<screen.left && a.getMessage().getString().equals(Component.translatable("scarrix.cosmetics").getString())).findFirst().orElseThrow();
                screen.mouseClicked(new MouseButtonEvent(cosmetics.getX()+18,cosmetics.getY()+15,new MouseButtonInfo(0,0)),false);
            });
            ctx.waitForScreen(CommunityScreen.class);
            // Scrolling and categories must expose real modules further down the larger list.
            ctx.setScreen(()->new ModScreen(null));
            ctx.clickScreenButton(Component.translatable("scarrix.category.visual").getString());
            ctx.waitTicks(3); ctx.takeScreenshot("scarrix-visual-modules");
            ctx.runOnClient(mc->{
                long visible=mc.gui.screen().children().stream().filter(w->w instanceof AbstractWidget a&&a.visible&&a.getMessage().getString().equals("…")).count();
                require(visible==3,"Visual category must contain zoom, crosshair and hurt-camera modules");
            });
            ctx.clickScreenButton(Component.translatable("scarrix.category.all").getString());
            ctx.runOnClient(mc->{var s=(ModScreen)mc.gui.screen();s.mouseScrolled(s.left+20,s.top+100,0,-20);});
            ctx.waitTicks(15);ctx.takeScreenshot("scarrix-modules-scrolled");
            ctx.runOnClient(mc->{
                require(mc.gui.screen().children().stream().anyMatch(w->w instanceof AbstractWidget a&&a.visible&&a.getMessage().getString().startsWith(Component.translatable(HudModule.NO_HURT_CAM.title).getString())),"Last module cannot be reached by scrolling");
            });
            // The displays consume actual client inventory/effect data, never sample values in a world.
            ctx.runOnClient(mc->{
                mc.player.getInventory().setItem(0,new net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.DIAMOND,16));
                mc.player.getInventory().setItem(9,new net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.DIAMOND,32));
                require(HudData.lines(HudModule.ITEM_COUNTER).getFirst().endsWith("48"),"Item counter does not sum matching stacks");
                mc.player.setItemSlot(net.minecraft.world.entity.EquipmentSlot.CHEST,new net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.DIAMOND_CHESTPLATE));
                mc.player.setItemSlot(net.minecraft.world.entity.EquipmentSlot.OFFHAND,new net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.SHIELD));
                mc.player.addEffect(new net.minecraft.world.effect.MobEffectInstance(net.minecraft.world.effect.MobEffects.SPEED,600,1));
                require(!HudData.shield().isEmpty(),"Shield HUD did not read equipped shield");
                require(HudData.lines(HudModule.POTIONS).stream().anyMatch(s->s.contains("2")),"Effect level is missing");
                require(HudData.lines(HudModule.PING).getFirst().endsWith("—"),"Singleplayer invents a server ping");
                require(!HudData.lines(HudModule.BIOME).isEmpty()&&!HudData.lines(HudModule.LIGHT).isEmpty(),"World readouts are missing");
            });
            ctx.setScreen(()->null);
            ctx.runOnClient(mc->{ScarrixHud.settings.get(HudModule.ZOOM).enabled=true;ScarrixHud.settings.get(HudModule.NO_HURT_CAM).enabled=true;});
            ctx.waitTicks(3);float fov=ctx.computeOnClient(mc->mc.gameRenderer.mainCamera().getFov());
            int fovOption=ctx.computeOnClient(mc->mc.options.fov().get());
            ctx.getInput().holdKey(InputConstants.KEY_C);ctx.waitTicks(4);
            ctx.runOnClient(mc->require(mc.gameRenderer.mainCamera().getFov()<fov*0.6,"Zoom did not reduce the rendered field of view"));
            ctx.takeScreenshot("scarrix-zoom");ctx.getInput().releaseKey(InputConstants.KEY_C);ctx.waitTicks(4);
            ctx.runOnClient(mc->{require(mc.gameRenderer.mainCamera().getFov()>fov*0.9,"Zoom did not restore field of view");require(mc.options.fov().get()==fovOption,"Zoom modified the saved FOV option");ScarrixHud.settings.get(HudModule.CPS).enabled=true;});
            ctx.getInput().pressMouse(0);ctx.getInput().pressMouse(1);
            ctx.runOnClient(mc->require(VisualHooks.CLICKS.count(0,System.nanoTime())>0&&VisualHooks.CLICKS.count(1,System.nanoTime())>0,"CPS missed physical clicks"));
            // Render every overlay once, including a centered custom crosshair, with all runtime data present.
            for(HudModule module:HudModule.values())if(module.overlay()){
                ctx.runOnClient(mc->{for(var m:HudModule.values())ScarrixHud.settings.get(m).enabled=m==module;});ctx.waitTicks(1);
            }
            ctx.takeScreenshot("scarrix-custom-crosshair");
            ctx.runOnClient(mc->{
                for(var m:HudModule.values())ScarrixHud.settings.get(m).enabled=false;
                HudModule[] examples={HudModule.ARMOR,HudModule.HELD_ITEM,HudModule.POTIONS,HudModule.INVENTORY,HudModule.CPS,HudModule.LIGHT};
                for(int i=0;i<examples.length;i++){var o=ScarrixHud.settings.get(examples[i]);o.enabled=true;o.x=i%2==0?0.02:0.98;o.y=0.03+(i/2)*0.32;o.scale=0.8;}
            });
            ctx.waitTicks(2);ctx.takeScreenshot("scarrix-extra-huds");
            ctx.runOnClient(mc->{for(var m:HudModule.values())ScarrixHud.settings.get(m).enabled=m.enabledByDefault()||m==HudModule.DIRECTION;});
            ctx.setScreen(() -> new HudPreview(new ModScreen(null)));
            ctx.runOnClient(mc -> {
                var editor=mc.gui.screen(); var box=HudOverlay.bounds(HudModule.DIRECTION);
                editor.mouseClicked(new MouseButtonEvent(box.x()+box.width()/2.0,box.y()+box.height()/2.0,new MouseButtonInfo(0,0)),false);
                editor.mouseDragged(new MouseButtonEvent(box.x()+box.width()/2.0+75,box.y()+box.height()/2.0+95,new MouseButtonInfo(0,0)),75,95);
                editor.mouseReleased(new MouseButtonEvent(0,0,new MouseButtonInfo(0,0)));
                require(ScarrixHud.settings.get(HudModule.DIRECTION).y>0.1,"Dragging did not change HUD position");
                HudSettings restored;
                try { restored=HudSettings.load(ScarrixHud.FILE); } catch(java.io.IOException e) { throw new java.io.UncheckedIOException(e); }
                require(Math.abs(restored.get(HudModule.DIRECTION).y-ScarrixHud.settings.get(HudModule.DIRECTION).y)<0.0001,"Dragged position was not saved");
            });
            ctx.waitTicks(2); ctx.takeScreenshot("scarrix-hud-dragged");
            // Resizing and large scales must keep the complete overlay inside the visible area.
            ctx.getInput().resizeWindow(854,480);
            ctx.runOnClient(mc -> {
                ScarrixHud.settings.get(HudModule.DIRECTION).scale=2;
                var box=HudOverlay.bounds(HudModule.DIRECTION);
                require(box.x()>=0 && box.x()+box.width()<=mc.getWindow().getGuiScaledWidth(),"HUD leaves the resized window");
            });
            ctx.waitTicks(2); ctx.takeScreenshot("scarrix-compact");
            ctx.setScreen(() -> null);
        }
    }
}
