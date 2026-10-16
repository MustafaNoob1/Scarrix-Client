package net.scarrix.hud.mixin;
import net.minecraft.client.MouseHandler;
import net.minecraft.client.input.MouseButtonInfo;
import net.scarrix.hud.VisualHooks;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
@Mixin(MouseHandler.class)
public abstract class MouseHandlerMixin {
    @Inject(method="onButton",at=@At("HEAD"))
    private void scarrixPhysicalClicks(long window,MouseButtonInfo button,int action,CallbackInfo ci) { VisualHooks.mouseClick(button.button(),action); }
}
