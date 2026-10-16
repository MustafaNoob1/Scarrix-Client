package net.scarrix.hud.mixin;
import net.minecraft.client.renderer.GameRenderer;
import net.scarrix.hud.VisualHooks;
import net.scarrix.hud.HudModule;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
@Mixin(GameRenderer.class)
public abstract class GameRendererMixin {
    @Inject(method="bobHurt",at=@At("HEAD"),cancellable=true)
    private void scarrixNoHurtCamera(CallbackInfo ci) { if(VisualHooks.enabled(HudModule.NO_HURT_CAM))ci.cancel(); }
}
