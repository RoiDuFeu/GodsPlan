import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isFr = i18n.language.startsWith('fr');

  const toggleLanguage = () => {
    i18n.changeLanguage(isFr ? 'en' : 'fr');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      aria-label={isFr ? 'Switch to English' : 'Passer en français'}
      title={isFr ? 'English' : 'Français'}
      className="text-xs font-bold"
    >
      {isFr ? 'EN' : 'FR'}
    </Button>
  );
}
