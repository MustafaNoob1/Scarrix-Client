package net.scarrix.hud;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import java.util.*;

final class ModScreen extends PanelScreen {
    private EditBox search;
    private final List<ModTile> tiles=new ArrayList<>();
    private final List<ScarrixButton> gears=new ArrayList<>();
    ModScreen(Screen parent) { super(Component.translatable("scarrix.mods"),parent); }
    @Override protected void init() {
        layout(); navigation(); tiles.clear(); gears.clear();
        addRenderableWidget(new ScarrixButton(left+10,top+7,58,Component.translatable("scarrix.mods"),b -> {}));
        addRenderableWidget(new ScarrixButton(left+74,top+7,92,Component.translatable("scarrix.edit_hud"),b -> minecraft.gui.setScreen(new HudPreview(this))));
        search=new EditBox(font,left+10,top+40,panelWidth-20,18,Component.translatable("scarrix.search")); search.setMaxLength(80); search.setHint(Component.translatable("scarrix.search"));
        search.setResponder(this::filter); addRenderableWidget(search);
        int cell=(panelWidth-28)/2,h=Math.max(44,(panelHeight-94)/2);
        for(int i=0;i<HudModule.values().length;i++) {
            HudModule m=HudModule.values()[i]; int x=left+10+(i%2)*(cell+8),y=top+65+(i/2)*(h+6);
            ModTile tile=new ModTile(x,y,cell,h,m,b -> { var o=ScarrixHud.settings.get(m); o.enabled=!o.enabled; persist(); b.setMessage(state(m)); });
            tile.setTooltip(Tooltip.create(Component.translatable(m.title).append(" — ").append(Component.translatable(m.description))));
            var gear=new ScarrixButton(x+cell-24,y+h-23,20,Component.literal("…"),b -> minecraft.gui.setScreen(new ModuleScreen(this,m)));
            // Minecraft targets the first child under the pointer. Register the nested action first,
            // but draw it last so the card cannot intercept it or paint over it.
            gears.add(addWidget(gear));
            tiles.add(addRenderableWidget(tile));
            addRenderableOnly(gear);
        }
    }
    private static Component state(HudModule m) { return Component.translatable(m.title).append(": ").append(Component.translatable(ScarrixHud.settings.get(m).enabled?"options.on":"options.off")); }
    private void filter(String query) {
        String needle=query.toLowerCase(Locale.ROOT);
        for(int i=0;i<tiles.size();i++) { HudModule m=tiles.get(i).module; boolean show=(Component.translatable(m.title).getString()+" "+m.id+" "+Component.translatable(m.description).getString()).toLowerCase(Locale.ROOT).contains(needle); tiles.get(i).visible=show; gears.get(i).visible=show; }
    }
    @Override public void extractRenderState(GuiGraphicsExtractor g,int x,int y,float delta) {
        panel(g); super.extractRenderState(g,x,y,delta); hud(g,x,y);
    }
    private static final class ModTile extends ScarrixButton {
        final HudModule module;
        ModTile(int x,int y,int w,int h,HudModule m,OnPress action) { super(x,y,w,h,state(m),null,action); module=m; }
        @Override public boolean mouseClicked(net.minecraft.client.input.MouseButtonEvent event,boolean doubleClick) {
            if(event.x()>=getX()+width-24 && event.y()>=getY()+height-23) return false;
            return super.mouseClicked(event,doubleClick);
        }
        @Override protected void extractContents(GuiGraphicsExtractor g,int mouseX,int mouseY,float delta) {
            var mc=Minecraft.getInstance(); var o=ScarrixHud.settings.get(module); int x=getX(),y=getY();
            g.fill(x,y,x+width,y+height,o.enabled?0xD82C1D27:0xD515161E); g.outline(x,y,width,height,isHoveredOrFocused()?ScarrixHud.RED:o.enabled?0xFF893045:0xFF383944);
            IconPainter.draw(g,module.icon,x+7,y+10,18,o.enabled?ScarrixHud.WHITE:ScarrixHud.MUTED);
            String title=mc.font.plainSubstrByWidth(Component.translatable(module.title).getString(),width-42);
            g.text(mc.font,title,x+32,y+8,o.enabled?ScarrixHud.WHITE:ScarrixHud.MUTED,false);
            var lines=mc.font.split(Component.translatable(module.description),width-40);
            for(int i=0;i<Math.min(2,lines.size());i++) g.text(mc.font,lines.get(i),x+8,y+34+i*10,ScarrixHud.MUTED,false);
            g.fill(x+width-10,y+8,x+width-5,y+13,o.enabled?ScarrixHud.RED:0xFF545763);
        }
    }
}
