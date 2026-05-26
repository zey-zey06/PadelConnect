import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';
import ar from './ar.json';

const savedLang = localStorage.getItem('padelconnect_lang') || 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: savedLang,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
  });

// Sync <html dir> and <html lang> on init
document.documentElement.lang = savedLang;
document.documentElement.dir  = savedLang === 'ar' ? 'rtl' : 'ltr';

export function setLanguage(lang) {
  i18n.changeLanguage(lang);
  localStorage.setItem('padelconnect_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
}

export default i18n;
