import { createContext, useContext, useState, ReactNode } from 'react';

export type ThemeType = 'cyan' | 'green';

interface ThemeColors {
  primary: string;
  primaryHex: string;
  secondary: string;
  gradient1: string;
  gradient2: string;
  gradient3: string;
}

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  colors: ThemeColors;
}

const themeColors = {
  cyan: {
    primary: 'rgba(32, 227, 255',
    primaryHex: '#20E3FF',
    secondary: '#0EA5E9',
    gradient1: 'rgba(32, 227, 255, 0.20)',
    gradient2: 'rgba(57, 255, 136, 0.13)',
    gradient3: 'rgba(59, 130, 246, 0.16)'
  },
  green: {
    primary: 'rgba(57, 255, 136',
    primaryHex: '#39FF88',
    secondary: '#10B981',
    gradient1: 'rgba(57, 255, 136, 0.24)',
    gradient2: 'rgba(34, 197, 94, 0.18)',
    gradient3: 'rgba(16, 185, 129, 0.16)'
  }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>('cyan');

  const value = {
    theme,
    setTheme,
    colors: themeColors[theme]
  };

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
