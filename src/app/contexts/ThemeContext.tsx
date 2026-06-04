import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type ThemeType = 'cyan' | 'green';

interface ThemeColors {
  primary: string;
  primaryHex: string;
  primaryRgb: string;
  secondary: string;
  secondaryHex: string;
  secondaryRgb: string;
  gradient1: string;
  gradient2: string;
  gradient3: string;
  deepTeal: string;
  softMint: string;
}

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  colors: ThemeColors;
}

const themeColors = {
  cyan: {
    primary: 'rgba(var(--codedock-primary-rgb)',
    primaryHex: '#20E3FF',
    primaryRgb: '32, 227, 255',
    secondary: '#0EA5E9',
    secondaryHex: '#39FF88',
    secondaryRgb: '57, 255, 136',
    gradient1: 'rgba(32, 227, 255, 0.20)',
    gradient2: 'rgba(57, 255, 136, 0.13)',
    gradient3: 'rgba(59, 130, 246, 0.16)',
    deepTeal: '#00A9A5',
    softMint: '#B7FFE3'
  },
  green: {
    primary: 'rgba(var(--codedock-primary-rgb)',
    primaryHex: '#39FF88',
    primaryRgb: '57, 255, 136',
    secondary: '#10B981',
    secondaryHex: '#20E3FF',
    secondaryRgb: '32, 227, 255',
    gradient1: 'rgba(57, 255, 136, 0.24)',
    gradient2: 'rgba(34, 197, 94, 0.18)',
    gradient3: 'rgba(16, 185, 129, 0.16)',
    deepTeal: '#10B981',
    softMint: '#C8FFE2'
  }
};

const THEME_STORAGE_KEY = 'codedock-theme';

function getInitialTheme(): ThemeType {
  if (typeof window === 'undefined') return 'cyan';

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'green' || savedTheme === 'cyan' ? savedTheme : 'cyan';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>(getInitialTheme);
  const colors = themeColors[theme];

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.codedockTheme = theme;
    root.style.setProperty('--codedock-primary', colors.primaryHex);
    root.style.setProperty('--codedock-primary-rgb', colors.primaryRgb);
    root.style.setProperty('--codedock-secondary', colors.secondaryHex);
    root.style.setProperty('--codedock-secondary-rgb', colors.secondaryRgb);
    root.style.setProperty('--codedock-deep-teal', colors.deepTeal);
    root.style.setProperty('--codedock-soft-mint', colors.softMint);
    root.style.setProperty('--neon-cyan', colors.primaryHex);
    root.style.setProperty('--matrix-green', colors.secondaryHex);
    root.style.setProperty('--deep-teal', colors.deepTeal);
    root.style.setProperty('--soft-mint', colors.softMint);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [colors, theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      colors
    }),
    [colors, theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
