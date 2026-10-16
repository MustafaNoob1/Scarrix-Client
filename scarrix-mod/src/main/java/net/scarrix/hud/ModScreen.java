package net.scarrix.hud;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.input.MouseButtonEvent;
import net.minecraft.network.chat.Component;
import java.util.*;

final class ModScreen extends PanelScreen {
    private final List<ModTile> tiles=new ArrayList<>();
    private final List<Gear> gears=new ArrayList<>();
    private final List<ScarrixButton> categories=new ArrayList<>();
    private EditBox search;
    private String query="",category="all";
    private double offset,target;
    private long frame=System.nanoTime();
    private boolean scrollDragging;
    private int bodyTop(){return top+66;}
    private int bodyBottom(){return top+panelHeight-25;}
    private boolean inBody(double x,double y){return x>=left+8&&x<left+panelWidth-3&&y>=bodyTop()&&y<bodyBottom();}
    private List<Integer> matches(){
        List<Integer> out=new ArrayList<>();String needle=query.toLowerCase(Locale.ROOT);
        for(int i=0;i<tiles.size();i++){var m=tiles.get(i).module;String text=Component.translatable(m.title).getString()+" "+m.id+" "+Component.translatable(m.description).getString();
            if((category.equals("all")||category.equals(m.category))&&text.toLowerCase(Locale.ROOT).contains(needle))out.add(i);
        }return out;
    }
    private int maxOffset(){return Math.max(0,((matches().size()+1)/2)*58-4-(bodyBottom()-bodyTop()));}
    private void position(){
        for(var t:tiles){t.visible=false;t.active=false;}for(var g:gears){g.visible=false;g.active=false;}
        List<Integer> list=matches();int cell=(panelWidth-32)/2;
        for(int j=0;j<list.size();j++){int i=list.get(j),x=left+10+j%2*(cell+8),y=bodyTop()+j/2*58-(int)Math.round(offset);ModTile tile=tiles.get(i);Gear gear=gears.get(i);
            tile.setX(x);tile.setY(y);gear.setX(x+cell-23);gear.setY(y+32);
            boolean visible=y+54>bodyTop()&&y<bodyBottom();tile.visible=visible;tile.active=visible;gear.visible=visible;gear.active=visible;
        }
    }
    private void filter(){offset=target=0;position();for(int i=0;i<categories.size();i++){String id=new String[]{"all","hud","items","world","visual"}[i];categories.get(i).setMessage(Component.translatable("scarrix.category."+id).withColor(category.equals(id)?0xFF5268:0xA4A8B5));}}
    @Override protected void init(){
        layout();navigation();tiles.clear();gears.clear();categories.clear();
        addRenderableWidget(new ScarrixButton(left+10,top+7,54,Component.translatable("scarrix.mods"),b->{}));
        addRenderableWidget(new ScarrixButton(left+70,top+7,Math.min(92,panelWidth-206),Component.translatable("scarrix.edit_hud"),b->minecraft.gui.setScreen(new HudPreview(this))));
        search=new EditBox(font,left+panelWidth-128,top+8,118,18,Component.translatable("scarrix.search"));search.setBordered(false);search.setTextColor(ScarrixHud.WHITE);search.setMaxLength(80);search.setHint(Component.translatable("scarrix.search"));search.setValue(query);search.setResponder(value->{query=value;filter();});addRenderableWidget(search);
        String[] groups={"all","hud","items","world","visual"};int cw=(panelWidth-20)/5;
        for(int i=0;i<groups.length;i++){String id=groups[i];categories.add(addRenderableWidget(new ScarrixButton(left+10+i*cw,top+39,cw-4,18,Component.translatable("scarrix.category."+id),null,b->{category=id;filter();})));}
        int cell=(panelWidth-32)/2;
        for(HudModule m:HudModule.values()){
            ModTile tile=new ModTile(0,0,cell,54,m,b->{var o=ScarrixHud.settings.get(m);o.enabled=!o.enabled;persist();b.setMessage(state(m));});
            tile.setTooltip(Tooltip.create(Component.translatable(m.title).append(" — ").append(Component.translatable(m.description))));
            Gear gear=new Gear(m);gears.add(addWidget(gear));tiles.add(addRenderableWidget(tile));addRenderableOnly(gear);
        }
        target=Math.min(target,maxOffset());offset=Math.min(offset,maxOffset());position();
        for(int i=0;i<categories.size();i++)categories.get(i).setMessage(Component.translatable("scarrix.category."+groups[i]).withColor(category.equals(groups[i])?0xFF5268:0xA4A8B5));
    }
    ModScreen(Screen parent){super(Component.translatable("scarrix.mods"),parent);}
    private static Component state(HudModule m){return Component.translatable(m.title).append(": ").append(Component.translatable(ScarrixHud.settings.get(m).enabled?"options.on":"options.off"));}
    @Override public boolean mouseScrolled(double x,double y,double horizontal,double vertical){if(inBody(x,y)){target=HudLayout.clamp(target-vertical*58,0,maxOffset());return true;}return super.mouseScrolled(x,y,horizontal,vertical);}
    private void scrollTo(double y){target=HudLayout.clamp((y-bodyTop())/(bodyBottom()-bodyTop())*maxOffset(),0,maxOffset());offset=target;position();}
    @Override public boolean mouseClicked(MouseButtonEvent e,boolean twice){if(e.button()==0&&e.x()>=left+panelWidth-8&&e.x()<left+panelWidth&&e.y()>=bodyTop()&&e.y()<bodyBottom()&&maxOffset()>0){scrollDragging=true;scrollTo(e.y());return true;}return super.mouseClicked(e,twice);}
    @Override public boolean mouseDragged(MouseButtonEvent e,double dx,double dy){if(scrollDragging){scrollTo(e.y());return true;}return super.mouseDragged(e,dx,dy);}
    @Override public boolean mouseReleased(MouseButtonEvent e){if(scrollDragging){scrollDragging=false;return true;}return super.mouseReleased(e);}
    @Override public boolean keyPressed(net.minecraft.client.input.KeyEvent e){if(e.key()==com.mojang.blaze3d.platform.InputConstants.KEY_PAGEDOWN||e.key()==com.mojang.blaze3d.platform.InputConstants.KEY_PAGEUP){target=HudLayout.clamp(target+(e.key()==com.mojang.blaze3d.platform.InputConstants.KEY_PAGEDOWN?1:-1)*(bodyBottom()-bodyTop()),0,maxOffset());return true;}return super.keyPressed(e);}
    @Override public void extractRenderState(GuiGraphicsExtractor g,int x,int y,float delta){
        long now=System.nanoTime();offset+=(target-offset)*Math.min(1,(now-frame)/1e9*16);frame=now;if(Math.abs(target-offset)<0.2)offset=target;position();
        panel(g);g.fill(left+panelWidth-133,top+5,left+panelWidth-7,top+28,0x70111218);
        super.extractRenderState(g,x,y,delta);
        if(matches().isEmpty())g.centeredText(font,Component.translatable("scarrix.no_results"),left+panelWidth/2,bodyTop()+24,ScarrixHud.MUTED);
        if(maxOffset()>0){int h=bodyBottom()-bodyTop(),thumb=Math.max(14,h*h/(h+maxOffset())),sy=bodyTop()+(int)(offset/maxOffset()*(h-thumb));g.fill(left+panelWidth-5,sy,left+panelWidth-3,sy+thumb,0xFF9B3E50);}
        hud(g,x,y);
    }
    private final class Gear extends ScarrixButton{
        Gear(HudModule m){super(0,0,19,19,Component.literal("…"),null,b->minecraft.gui.setScreen(new ModuleScreen(ModScreen.this,m)));setTooltip(Tooltip.create(Component.translatable("scarrix.module_settings")));}
        @Override public boolean isMouseOver(double x,double y){return inBody(x,y)&&super.isMouseOver(x,y);}
        @Override protected void extractContents(GuiGraphicsExtractor g,int x,int y,float d){g.enableScissor(left+7,bodyTop(),left+panelWidth-7,bodyBottom());super.extractContents(g,x,y,d);g.disableScissor();}
    }
    private final class ModTile extends ScarrixButton{
        final HudModule module;
        ModTile(int x,int y,int w,int h,HudModule m,OnPress action){super(x,y,w,h,state(m),null,action);module=m;}
        @Override public boolean isMouseOver(double x,double y){return inBody(x,y)&&super.isMouseOver(x,y);}
        @Override public boolean mouseClicked(MouseButtonEvent e,boolean twice){if(!inBody(e.x(),e.y())||e.x()>=getX()+width-24&&e.y()>=getY()+32)return false;return super.mouseClicked(e,twice);}
        @Override protected void extractContents(GuiGraphicsExtractor g,int mx,int my,float delta){
            var mc=Minecraft.getInstance();var o=ScarrixHud.settings.get(module);int x=getX(),y=getY();g.enableScissor(left+7,bodyTop(),left+panelWidth-7,bodyBottom());
            g.fill(x,y,x+width,y+height,o.enabled?0xAA30212C:0xA914151C);g.outline(x,y,width,height,isHoveredOrFocused()?0xFFBB435B:o.enabled?0xFF63303F:0xFF30313B);
            IconPainter.draw(g,module.icon,x+8,y+7,16,o.enabled?ScarrixHud.WHITE:ScarrixHud.MUTED);
            g.text(mc.font,mc.font.plainSubstrByWidth(Component.translatable(module.title).getString(),width-42),x+30,y+8,o.enabled?ScarrixHud.WHITE:ScarrixHud.MUTED,false);
            var lines=mc.font.split(Component.translatable(module.description),width-36);for(int i=0;i<Math.min(2,lines.size());i++)g.text(mc.font,lines.get(i),x+8,y+27+i*10,ScarrixHud.MUTED,false);
            g.fill(x+width-10,y+9,x+width-6,y+13,o.enabled?0xFFEC5269:0xFF535560);g.disableScissor();
        }
    }
}
