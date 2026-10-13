import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import translations from "../i18n";

const LanguageContext = createContext();

const STORAGE_KEY = "carbonx-language";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "en";
    } catch {
      return "en";
    }
  });

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage not available
    }
  }, []);

  // Update document lang attribute
  useEffect(() => {
    document.documentElement.lang = language === "hi" ? "hi" : "en";
  }, [language]);

  /**
   * t("buyer.header.portfolio") → looks up translations[language].buyer.header.portfolio
   * Supports simple interpolation: t("portfolio.equivalentTrees", { count: 42 })
   */
  const t = useCallback(
    (key, vars = {}) => {
      const keys = key.split(".");
      let value = translations[language];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          // Fallback to English
          let fallback = translations.en;
          for (const fk of keys) {
            if (fallback && typeof fallback === "object" && fk in fallback) {
              fallback = fallback[fk];
            } else {
              return key; // Return key if not found even in English
            }
          }
          value = fallback;
          break;
        }
      }

      if (typeof value !== "string") return key;

      // Simple interpolation: replace {varName} with vars.varName
      return value.replace(/\{(\w+)\}/g, (_, varName) =>
        vars[varName] !== undefined ? String(vars[varName]) : `{${varName}}`
      );
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Returns { language, setLanguage, t } */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

/**
 * Convenience alias:
 * const { t, language, setLanguage } = useTranslation();
 */
export const useTranslation = useLanguage;
