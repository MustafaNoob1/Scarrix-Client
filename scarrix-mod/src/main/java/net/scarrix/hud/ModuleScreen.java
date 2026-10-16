package net.scarrix.hud;

import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import java.util.Locale;
import java.util.function.DoubleConsumer;

final class ModuleScreen extends PanelScreen {
    private final HudModule module;
    private int scroll;
    ModuleScreen(Screen parent,HudModule module) { super(Component.translatable(module.title),parent); this.module=module; }
    private HudSettings.ModuleOptions options() { return ScarrixHud.settings.get(module); }
    private void toggle(String name,int y,java.util.function.BooleanSupplier read,Runnable change) {
        addRenderableWidget(new ScarrixButton(left+12,y,panelWidth-24,Component.translatable(name).append(": ").append(Component.translatable(read.getAsBoolean()?"options.on":"options.off")),b -> {
            change.run(); persist(); b.setMessage(Component.translatable(name).append(": ").append(Component.translatable(read.getAsBoolean()?"options.on":"options.off")));
        }));
    }
    private int row(int index) { return top+56+index*26-scroll*26; }
    private void slider(String name,int index,double min,double max,double value,DoubleConsumer write,boolean integer) {
        addRenderableWidget(new SettingSlider(left+12,row(index),panelWidth-24,name,min,max,value,write,integer));
    }
    private void color(String name,int index,boolean accent) {
        int y=row(index); EditBox input=new EditBox(font,left+panelWidth-91,y,79,20,Component.translatable(name));
        input.setMaxLength(7); input.setValue(String.format(Locale.ROOT,"#%06X",accent?options().accentColor:options().textColor));
        input.setResponder(value -> {
            boolean valid=value.matches("#[0-9a-fA-F]{6}"); input.setTextColor(valid?ScarrixHud.WHITE:ScarrixHud.RED);
            if(valid) { int c=Integer.parseInt(value.substring(1),16); if(accent) options().accentColor=c; else options().textColor=c; persist(); }
        }); addRenderableWidget(input);
        int[] palette=accent?new int[]{0xFF354E,0xA177FF,0x40B8FF,0x45E8AD}:new int[]{0xEAF0FA,0xFFD267,0x75DCFF,0xC1C4D4};
        int start=left+12;
        for(int i=0;i<palette.length;i++) { final int c=palette[i]; addRenderableWidget(new ScarrixButton(start+i*24,y,20,Component.literal("■").withColor(c),b -> input.setValue(String.format(Locale.ROOT,"#%06X",c)))); }
    }
    @Override protected void init() {
        layout(); navigation();
        int maxScroll=Math.max(0,count()-Math.max(1,(panelHeight-80)/26)); scroll=Math.min(scroll,maxScroll);
        addRenderableWidget(new ScarrixButton(left+10,top+7,Math.max(60,panelWidth-145),Component.translatable(module.title),b -> onClose()));
        addRenderableWidget(new ScarrixButton(left+panelWidth-128,top+7,48,Component.translatable(options().enabled?"options.on":"options.off"),b -> { options().enabled=!options().enabled; persist(); rebuildWidgets(); }));
        addRenderableWidget(new ScarrixButton(left+panelWidth-74,top+7,64,Component.translatable("scarrix.reset"),b -> { ScarrixHud.settings.reset(module); persist(); rebuildWidgets(); }));
        int contentStart=children().size();
        var o=options();
        slider("scarrix.scale",0,0.5,2,o.scale,v -> o.scale=v,false);
        addRenderableWidget(new ScarrixButton(left+12,row(1),panelWidth-24,Component.translatable("scarrix.background").append(": ").append(Component.translatable("scarrix.background."+o.background)),b -> {
            o.background=(o.background+1)%3; persist(); b.setMessage(Component.translatable("scarrix.background").append(": ").append(Component.translatable("scarrix.background."+o.background)));
        }));
        color("scarrix.text_color",2,false); color("scarrix.accent_color",3,true);
        if(module==HudModule.DIRECTION) {
            slider("scarrix.compass_width",4,120,360,o.compassWidth,v -> o.compassWidth=(int)Math.round(v),true);
            slider("scarrix.fov",5,60,180,o.fieldOfView,v -> o.fieldOfView=(int)Math.round(v),true);
            toggle("scarrix.intercardinal",row(6),() -> o.intercardinal,() -> o.intercardinal=!o.intercardinal);
            toggle("scarrix.ticks",row(7),() -> o.ticks,() -> o.ticks=!o.ticks);
            toggle("scarrix.heading",row(8),() -> o.heading,() -> o.heading=!o.heading);
            toggle("scarrix.fade",row(9),() -> o.fade,() -> o.fade=!o.fade);
            toggle("scarrix.degree_numbers",row(10),() -> o.degreeNumbers,() -> o.degreeNumbers=!o.degreeNumbers);
            toggle("scarrix.degree_sign",row(11),() -> o.degreeSign,() -> o.degreeSign=!o.degreeSign);
        }
        // Keep invisible rows out of hit testing and keyboard navigation as well as rendering.
        for(int i=contentStart;i<children().size();i++) if(children().get(i) instanceof net.minecraft.client.gui.components.AbstractWidget widget) {
            boolean visible=widget.getY()>=top+52 && widget.getY()+widget.getHeight()<=top+panelHeight-25;
            widget.visible=visible; widget.active=visible;
        }
    }
    private int count() { return module==HudModule.DIRECTION?12:4; }
    @Override public boolean mouseScrolled(double x,double y,double horizontal,double vertical) {
        if(x>=left && x<left+panelWidth && y>=top+33 && y<top+panelHeight-22) {
            int max=Math.max(0,count()-Math.max(1,(panelHeight-80)/26)),next=Math.max(0,Math.min(max,scroll-(int)Math.signum(vertical)));
            if(next!=scroll) { scroll=next; rebuildWidgets(); } return true;
        }
        return super.mouseScrolled(x,y,horizontal,vertical);
    }
    @Override public boolean keyPressed(net.minecraft.client.input.KeyEvent event) {
        if(event.key()==com.mojang.blaze3d.platform.InputConstants.KEY_PAGEDOWN || event.key()==com.mojang.blaze3d.platform.InputConstants.KEY_PAGEUP) {
            scroll=Math.max(0,Math.min(Math.max(0,count()-(panelHeight-80)/26),scroll+(event.key()==com.mojang.blaze3d.platform.InputConstants.KEY_PAGEDOWN?1:-1))); rebuildWidgets(); return true;
        }
        return super.keyPressed(event);
    }
    @Override public void extractRenderState(GuiGraphicsExtractor g,int x,int y,float delta) {
        panel(g);
        Component description=Component.translatable(module.description);
        g.text(font,font.plainSubstrByWidth(description.getString(),panelWidth-24),left+12,top+39,ScarrixHud.MUTED,false);
        for(int i:new int[]{2,3}) if(row(i)>=top+52 && row(i)+20<=top+panelHeight-25) {
            String text=Component.translatable(i==2?"scarrix.text_color":"scarrix.accent_color").getString();
            g.text(font,font.plainSubstrByWidth(text,panelWidth-220),left+114,row(i)+6,ScarrixHud.MUTED,false);
        }
        int visible=Math.max(1,(panelHeight-80)/26);
        if(count()>visible) { int track=panelHeight-80,handle=Math.max(12,track*visible/count()); int sy=top+52+(track-handle)*scroll/(count()-visible); g.fill(left+panelWidth-5,sy,left+panelWidth-3,sy+handle,ScarrixHud.RED); }
        super.extractRenderState(g,x,y,delta); hud(g,x,y);
    }
    private final class SettingSlider extends AbstractSliderButton {
        private final String name; private final double min,max; private final DoubleConsumer write; private final boolean integer;
        SettingSlider(int x,int y,int width,String name,double min,double max,double current,DoubleConsumer write,boolean integer) {
            super(x,y,width,20,Component.empty(),(current-min)/(max-min)); this.name=name; this.min=min; this.max=max; this.write=write; this.integer=integer; updateMessage();
        }
        @Override protected void updateMessage() { double n=min+value*(max-min); setMessage(Component.translatable(name).append(": "+(integer?String.valueOf((int)Math.round(n)):String.format(Locale.ROOT,"%.2f",n)))); }
        @Override protected void applyValue() { write.accept(min+value*(max-min)); }
        @Override public void extractWidgetRenderState(GuiGraphicsExtractor g,int x,int y,float delta) {
            g.fill(getX(),getY(),getX()+width,getY()+height,0xEE151720); g.outline(getX(),getY(),width,height,isHoveredOrFocused()?ScarrixHud.RED:0xFF383944);
            int end=getX()+(int)(value*width); g.fill(getX(),getY()+height-3,end,getY()+height,ScarrixHud.RED);
            String label=font.plainSubstrByWidth(getMessage().getString(),width-12); g.text(font,label,getX()+(width-font.width(label))/2,getY()+(height-font.lineHeight)/2,ScarrixHud.WHITE,false);
        }
        @Override public void onRelease(net.minecraft.client.input.MouseButtonEvent event) { super.onRelease(event); persist(); }
    }
}
