import type {Config} from './types';
export function homeOptions(value:Config['launcher']) {
 return {discordPresence:value.discordPresence!==false,showNews:value.showNews!==false,skinSize:['small','medium','large'].includes(value.skinSize??'')?value.skinSize!:'medium' as 'small'|'medium'|'large',quickProfileId:typeof value.quickProfileId==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(value.quickProfileId)?value.quickProfileId:undefined,onboardingDone:value.onboardingDone===true};
}
