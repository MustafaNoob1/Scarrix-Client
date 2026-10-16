package net.scarrix.hud.mixin;
import net.minecraft.client.Camera;
import net.scarrix.hud.VisualHooks;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
@Mixin(Camera.class)
public abstract class CameraMixin {
    @Inject(method="calculateFov",at=@At("RETURN"),cancellable=true)
    private void scarrixZoom(float partialTick,CallbackInfoReturnable<Float> cir) { cir.setReturnValue(cir.getReturnValue()/VisualHooks.zoomDivisor()); }
}
