import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import fr from '../locales/fr.json';
import en from '../locales/en.json';

const LANGUES_SUPPORTEES = ['fr', 'en'];

const langueTelephone = Localization.getLocales()[0]?.languageCode || 'en';
const langueParDefaut = LANGUES_SUPPORTEES.includes(langueTelephone) ? langueTelephone : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: langueParDefaut,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
