import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./public/locales/en/translation.json";
import hi from "./public/locales/hi/translation.json";
import te from "./public/locales/te/translation.json";
import ta from "./public/locales/ta/translation.json";
import kn from "./public/locales/kn/translation.json";
import ml from "./public/locales/ml/translation.json";
import bn from "./public/locales/bn/translation.json";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
  ta: { translation: ta },
  kn: { translation: kn },
  ml: { translation: ml },
  bn: { translation: bn },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      supportedLngs: ["en", "hi", "te", "ta", "kn", "ml", "bn"],
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      load: "languageOnly",
    });
}

export default i18n;