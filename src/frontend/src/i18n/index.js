import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import zh from './locales/zh';
import ja from './locales/ja';
import es from './locales/es';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  ja: { translation: ja },
  es: { translation: es }
};

const savedLanguage = localStorage.getItem('language') || navigator.language?.split('-')[0] || 'en';
const supportedLanguages = ['en', 'zh', 'ja', 'es'];
const initialLanguage = supportedLanguages.includes(savedLanguage) ? savedLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];
