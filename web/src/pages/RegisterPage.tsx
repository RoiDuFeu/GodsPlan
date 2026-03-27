import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

const LANGUAGE_KEYS = ['latin', 'french', 'english', 'greek'] as const;

export function RegisterPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
    navigate('/');
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-transparent to-background" />
        <div className="absolute inset-0 bg-primary-container/10 mix-blend-overlay" />
      </div>

      {/* Registration Container */}
      <div className="relative z-10 w-full max-w-5xl glass-panel rounded-xl overflow-hidden shadow-2xl border border-border/10">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
          {/* Left Column: Branding */}
          <div className="hidden md:flex flex-col justify-between p-12 bg-secondary-container/30 relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-primary font-headline text-3xl font-extrabold tracking-tighter mb-8">
                {t('brand.sovereignEssence')}
              </div>
              <h1 className="font-headline text-5xl font-light leading-tight mb-6 tracking-tight">
                {t('register.enterThe')} <span className="text-primary font-bold">{t('register.sanctuary')}</span>
              </h1>
              <p className="text-on-surface-variant text-lg font-light max-w-xs leading-relaxed opacity-80">
                {t('register.description')}
              </p>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 text-primary mb-2">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                <span className="font-label text-[10px] uppercase tracking-[0.2em] font-semibold text-secondary">{t('register.sacredProtocol')}</span>
              </div>
              <div className="text-on-surface-variant text-sm font-light italic">
                "{t('register.soulQuote')}"
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
          </div>

          {/* Right Column: Form */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-surface-dim/40">
            <div className="mb-10 text-center md:text-left">
              <h2 className="font-headline text-2xl font-semibold mb-2">{t('register.createAccount')}</h2>
              <p className="text-on-surface-variant text-sm font-light">{t('register.establishPresence')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Full Name */}
              <div className="relative group">
                <label className="block font-label text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-1">{t('register.fullName')}</label>
                <Input
                  className="bg-transparent border-0 border-b-2 border-border rounded-none py-3 px-0 focus-visible:ring-0 focus-visible:border-primary transition-all duration-300 font-light placeholder:text-muted-foreground/50"
                  placeholder={t('register.namePlaceholder')}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="relative group">
                <label className="block font-label text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-1">{t('register.sacredContact')}</label>
                <Input
                  className="bg-transparent border-0 border-b-2 border-border rounded-none py-3 px-0 focus-visible:ring-0 focus-visible:border-primary transition-all duration-300 font-light placeholder:text-muted-foreground/50"
                  placeholder={t('register.emailPlaceholder')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="relative group">
                <label className="block font-label text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-1">{t('common.password')}</label>
                <Input
                  className="bg-transparent border-0 border-b-2 border-border rounded-none py-3 px-0 focus-visible:ring-0 focus-visible:border-primary transition-all duration-300 font-light placeholder:text-muted-foreground/50"
                  placeholder="••••••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Language / Rite */}
              <div>
                <label className="block font-label text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-4">{t('register.preferredLanguage')}</label>
                <div className="grid grid-cols-2 gap-3">
                  {LANGUAGE_KEYS.map((langKey) => {
                    const label = t(`register.languages.${langKey}`);
                    return (
                      <button
                        key={langKey}
                        type="button"
                        onClick={() => toggleLanguage(langKey)}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                          selectedLanguages.includes(langKey)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant/20 bg-surface-container-high/40 hover:bg-surface-container-highest text-foreground'
                        }`}
                      >
                        <span className="text-xs font-medium">{label}</span>
                        {selectedLanguages.includes(langKey) && (
                          <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-secondary-container hover:bg-secondary-container/80 text-primary font-headline font-bold py-4 rounded-lg flex items-center justify-center gap-2 group transition-all duration-500 shadow-lg"
                >
                  {t('register.createAccount')}
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
                </button>
              </div>

              {/* Footer */}
              <div className="text-center pt-2">
                <p className="text-on-surface-variant text-xs font-light tracking-wide">
                  {t('register.alreadyHaveAccount')}{' '}
                  <Link to="/login" className="text-primary font-semibold hover:underline underline-offset-4 ml-1 transition-all">{t('common.signIn')}</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Corner metadata */}
      <div className="absolute bottom-8 left-8 hidden lg:block">
        <div className="flex flex-col gap-1">
          <span className="font-label text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{t('register.established')}</span>
          <span className="font-headline text-xs font-bold text-on-surface-variant tracking-widest">MMXXIV</span>
        </div>
      </div>

      <div className="absolute top-8 right-8 hidden lg:block">
        <div className="flex items-center gap-6">
          <span className="font-label text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors cursor-pointer">{t('register.documentation')}</span>
          <span className="font-label text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors cursor-pointer">{t('register.privacy')}</span>
          <span className="font-label text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors cursor-pointer">{t('register.theOrder')}</span>
        </div>
      </div>
    </main>
  );
}
