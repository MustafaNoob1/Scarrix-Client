import React,{createContext,useContext} from 'react';
import type {Language} from '../main/languages';
import {translate} from './translations';
const LanguageContext=createContext<Language>('de');
export function I18nProvider({language,children}:{language:Language;children:React.ReactNode}){return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;}
export function useI18n(){const language=useContext(LanguageContext);return {language,tr:(text:string)=>translate(language,text)};}
