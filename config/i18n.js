import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from '../locales/fr.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import pt from '../locales/pt.json';
import ar from '../locales/ar.json';
import zh from '../locales/zh.json';
import hi from '../locales/hi.json';
import bn from '../locales/bn.json';
import ru from '../locales/ru.json';
import ja from '../locales/ja.json';
import de from '../locales/de.json';
import ko from '../locales/ko.json';
import vi from '../locales/vi.json';
import tr from '../locales/tr.json';
import it from '../locales/it.json';
import ur from '../locales/ur.json';
import id from '../locales/id.json';
import sw from '../locales/sw.json';
import ha from '../locales/ha.json';
import fa from '../locales/fa.json';
import th from '../locales/th.json';
import pl from '../locales/pl.json';
import uk from '../locales/uk.json';
import nl from '../locales/nl.json';
import ro from '../locales/ro.json';
import ms from '../locales/ms.json';
import yo from '../locales/yo.json';
import am from '../locales/am.json';
import tl from '../locales/tl.json';
import pa from '../locales/pa.json';

export const LANGUES_SUPPORTEES = ['fr','en','es','pt','ar','zh','hi','bn','ru','ja','de','ko','vi','tr','it','ur','id','sw','ha','fa','th','pl','uk','nl','ro','ms','yo','am','tl','pa'];

export const NOMS_LANGUES = {
  fr: 'Français', en: 'English', es: 'Español', pt: 'Português', ar: 'العربية',
  zh: '中文', hi: 'हिन्दी', bn: 'বাংলা', ru: 'Русский', ja: '日本語',
  de: 'Deutsch', ko: '한국어', vi: 'Tiếng Việt', tr: 'Türkçe', it: 'Italiano',
  ur: 'اردو', id: 'Bahasa Indonesia', sw: 'Kiswahili', ha: 'Hausa', fa: 'فارسی',
  th: 'ไทย', pl: 'Polski', uk: 'Українська', nl: 'Nederlands', ro: 'Română',
  ms: 'Bahasa Melayu', yo: 'Yorùbá', am: 'አማርኛ', tl: 'Tagalog', pa: 'ਪੰਜਾਬੀ',
};

const CLE_STOCKAGE_LANGUE = 'langue_choisie';

const langueTelephone = Localization.getLocales()[0]?.languageCode || 'en';
const langueParDefaut = LANGUES_SUPPORTEES.includes(langueTelephone) ? langueTelephone : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr }, en: { translation: en }, es: { translation: es },
      pt: { translation: pt }, ar: { translation: ar }, zh: { translation: zh },
      hi: { translation: hi }, bn: { translation: bn }, ru: { translation: ru },
      ja: { translation: ja }, de: { translation: de }, ko: { translation: ko },
      vi: { translation: vi }, tr: { translation: tr }, it: { translation: it },
      ur: { translation: ur }, id: { translation: id }, sw: { translation: sw },
      ha: { translation: ha }, fa: { translation: fa }, th: { translation: th },
      pl: { translation: pl }, uk: { translation: uk }, nl: { translation: nl },
      ro: { translation: ro }, ms: { translation: ms }, yo: { translation: yo },
      am: { translation: am }, tl: { translation: tl }, pa: { translation: pa },
    },
    lng: langueParDefaut,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

AsyncStorage.getItem(CLE_STOCKAGE_LANGUE).then((langueSauvegardee) => {
  if (langueSauvegardee && LANGUES_SUPPORTEES.includes(langueSauvegardee)) {
    i18n.changeLanguage(langueSauvegardee);
  }
});

export async function changerLangue(code) {
  await AsyncStorage.setItem(CLE_STOCKAGE_LANGUE, code);
  i18n.changeLanguage(code);
}

export default i18n;
