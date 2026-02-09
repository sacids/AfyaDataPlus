// i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import { config } from '../constants/config';

const loadLocalResource = async (lng) => {
  const fileUri = `${config.LOCAL_PATH}${lng}.json`;
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    const content = await FileSystem.readAsStringAsync(fileUri);
    return JSON.parse(content);
  }
  return null;
};

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  lng: 'en', // default
  resources: {
    en: { translation: require('./assets/locales/en.json') } // Ship with 1 base language
  },
  interpolation: { escapeValue: false }
});

export default i18n;