package net.scarrix.hud;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.network.chat.Component;

class ScarrixButton extends Button {
    private final String icon;
    private double hover;
    private long last=System.nanoTime();
    ScarrixButton(int x,int y,int width,Component label,OnPress action) { this(x,y,width,20,label,null,action); }
    ScarrixButton(int x,int y,int width,int height,Component label,String icon,OnPress action) {
        super(x,y,width,height,label,action,DEFAULT_NARRATION); this.icon=icon;
        if(icon!=null) setTooltip(Tooltip.create(label));
    }
    @Override protected void extractContents(GuiGraphicsExtractor g,int mouseX,int mouseY,float delta) {
        var font=Minecraft.getInstance().font; boolean highlighted=isHoveredOrFocused();
        long now=System.nanoTime(); double dt=Math.min(0.1,(now-last)/1e9); last=now;
        hover+=((highlighted?1:0)-hover)*Math.min(1,dt*14);
        int r=(int)(22+hover*46),green=(int)(24+hover*8),b=(int)(32+hover*14);
        g.fill(getX(),getY(),getX()+width,getY()+height,0xE8000000|r<<16|green<<8|b);
        g.outline(getX(),getY(),width,height,highlighted?ScarrixHud.RED:0xFF383944);
        if(icon!=null) IconPainter.draw(g,icon,getX()+(width-22)/2,getY()+(height-22)/2,22,highlighted?ScarrixHud.WHITE:ScarrixHud.MUTED);
        else {
            String text=font.plainSubstrByWidth(getMessage().getString(),width-10);
            g.text(font,font.width(getMessage())<=width-10?getMessage():Component.literal(text),getX()+(width-font.width(text))/2,getY()+(height-font.lineHeight)/2,active?ScarrixHud.WHITE:ScarrixHud.MUTED,false);
        }
    }
}
