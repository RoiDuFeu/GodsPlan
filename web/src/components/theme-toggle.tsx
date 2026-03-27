import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  // Determine the actual applied theme
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={t('theme.toggleTheme')}
      title={isDark ? t('theme.lightMode') : t('theme.darkMode')}
    >
      {isDark ? (
        <Sun className="h-5 w-5 transition-transform hover:rotate-12" />
      ) : (
        <Moon className="h-5 w-5 transition-transform hover:-rotate-12" />
      )}
      <span className="sr-only">{t('theme.toggleTheme')}</span>
    </Button>
  );
}
