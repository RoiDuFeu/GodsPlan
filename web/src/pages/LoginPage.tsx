import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
    navigate('/');
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
        <div className="absolute inset-0 bg-primary-container/10 mix-blend-overlay" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[480px]">
        {/* Decorative circle */}
        <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full border border-primary/20 pointer-events-none hidden md:block" />

        <div className="glass-panel p-10 md:p-14 rounded-xl border border-border/10 shadow-2xl relative overflow-hidden">
          {/* Brand */}
          <div className="flex flex-col items-center mb-12">
            <div className="mb-6">
              <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
            </div>
            <h1 className="font-headline text-3xl font-bold tracking-tighter text-primary mb-2">{t('brand.name')}</h1>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary">{t('brand.tagline')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-8">
              {/* Email */}
              <div className="relative group">
                <label className="block font-label text-[11px] uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-primary" htmlFor="email">
                  {t('login.emailLabel')}
                </label>
                <Input
                  className="bg-transparent border-0 border-b-2 border-border rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 py-3 placeholder-muted-foreground/50 transition-all duration-300"
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="relative group">
                <div className="flex justify-between items-end">
                  <label className="block font-label text-[11px] uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-primary" htmlFor="password">
                    {t('login.passwordLabel')}
                  </label>
                  <button type="button" className="text-[10px] uppercase tracking-wider text-secondary hover:text-primary transition-colors font-label">
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <Input
                  className="bg-transparent border-0 border-b-2 border-border rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 py-3 placeholder-muted-foreground/50 transition-all duration-300"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full royal-gradient text-primary font-headline font-bold py-5 rounded-md shadow-lg hover:shadow-primary/10 transition-all duration-300 group relative overflow-hidden"
              >
                <span className="relative z-10 tracking-widest uppercase text-sm">{t('common.signIn')}</span>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t('login.newToSanctuary')}{' '}
              <Link to="/register" className="text-primary font-semibold ml-1 hover:underline decoration-primary/30 underline-offset-4 transition-all">
                {t('login.createAccount')}
              </Link>
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-8 flex justify-center items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="font-label text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t('login.securePortal')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="font-label text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{t('login.version')}</span>
          </div>
        </div>
      </div>

      {/* Decorative flare */}
      <div className="fixed top-0 right-0 p-12 pointer-events-none opacity-20">
        <span className="material-symbols-outlined text-8xl text-primary font-extralight">flare</span>
      </div>
    </main>
  );
}
