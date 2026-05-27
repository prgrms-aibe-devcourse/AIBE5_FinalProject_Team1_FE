import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LanguageType = "ko" | "en";

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (language: LanguageType) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageType>(() => {
    if (typeof window === "undefined") {
      return "ko";
    }

    return window.localStorage.getItem("codedock-language") === "en" ? "en" : "ko";
  });

  useEffect(() => {
    window.localStorage.setItem("codedock-language", language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === "ko" ? "en" : "ko")),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
