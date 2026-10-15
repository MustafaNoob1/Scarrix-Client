export const languages=['de','en','pl','fr','it','tr','pt'] as const;
export type Language=typeof languages[number];
export function validLanguage(value:unknown):value is Language{return languages.includes(value as Language);}
