// i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    lng: 'en', 
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
    react: {
        useSuspense: false,
    },
    resources: {}
});

export default i18n;