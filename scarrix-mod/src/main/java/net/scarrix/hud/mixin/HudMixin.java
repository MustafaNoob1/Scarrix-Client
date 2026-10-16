package net.scarrix.hud.mixin;
import net.minecraft.client.gui.Hud;
import net.scarrix.hud.VisualHooks;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
@Mixin(Hud.class)
public abstract class HudMixin {
    @Inject(method="extractCrosshair",at=@At("HEAD"),cancellable=true)
    private void scarrixCrosshair(CallbackInfo ci) { if(VisualHooks.crosshair())ci.cancel(); }
}
