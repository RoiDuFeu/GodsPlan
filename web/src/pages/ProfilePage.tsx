import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from 'react-i18next';

export function ProfilePage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('c.valerius@sacredessence.org');
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="p-6 md:p-8 lg:p-16 lg:p-24 max-w-5xl mx-auto no-scrollbar">
      <div className="space-y-16 md:space-y-20">
        {/* Profile Hero */}
        <section className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8 border-b border-outline-variant/15 pb-8 md:pb-12">
          <div className="relative">
            <div className="w-28 h-28 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-surface-container-high shadow-2xl bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl md:text-6xl text-muted-foreground/30">person</span>
            </div>
            <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-1.5 md:p-2 rounded-full shadow-lg border-4 border-surface">
              <span className="material-symbols-outlined text-xs md:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-3xl md:text-4xl lg:text-6xl font-headline font-bold tracking-tighter leading-none">Constantine Valerius</h1>
              <span className="px-3 py-1 bg-secondary-container text-secondary text-[0.6rem] font-bold tracking-widest uppercase rounded-full self-start sm:self-auto">{t('profile.sovereignMember')}</span>
            </div>
            <p className="text-on-surface-variant font-light text-lg md:text-xl">c.valerius@sacredessence.org</p>
            <div className="flex items-center gap-4 md:gap-6 pt-2 md:pt-4">
              <div className="flex flex-col">
                <span className="font-label uppercase tracking-[0.1em] text-[0.6rem] text-muted-foreground">{t('profile.memberSince')}</span>
                <span className="text-sm font-medium">November 12, 2023</span>
              </div>
              <div className="w-px h-8 bg-outline-variant/20" />
              <div className="flex flex-col">
                <span className="font-label uppercase tracking-[0.1em] text-[0.6rem] text-muted-foreground">{t('profile.sanctuaryTier')}</span>
                <span className="text-sm font-medium text-primary">{t('profile.goldGuardian')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Column 1: Account & Preferences */}
          <div className="lg:col-span-7 space-y-12 md:space-y-16">
            {/* Account Settings */}
            <section className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary">manage_accounts</span>
                <h2 className="font-headline font-semibold tracking-tight text-lg">{t('profile.accountSettings')}</h2>
              </div>
              <div className="space-y-6 md:space-y-8">
                <div className="relative group">
                  <label className="block font-label uppercase tracking-[0.1em] text-[0.6875rem] text-muted-foreground mb-2 group-focus-within:text-primary transition-colors">{t('profile.emailAddress')}</label>
                  <Input
                    className="bg-transparent border-0 border-b-2 border-border rounded-none py-3 px-0 focus-visible:ring-0 focus-visible:border-primary transition-all"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <label className="block font-label uppercase tracking-[0.1em] text-[0.6875rem] text-muted-foreground mb-2 group-focus-within:text-primary transition-colors">{t('common.password')}</label>
                  <Input
                    className="bg-transparent border-0 border-b-2 border-border rounded-none py-3 px-0 focus-visible:ring-0 focus-visible:border-primary transition-all"
                    type="password"
                    defaultValue="••••••••••••"
                  />
                  <button className="absolute right-0 bottom-3 text-muted-foreground hover:text-primary">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Preferences */}
            <section className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary">tune</span>
                <h2 className="font-headline font-semibold tracking-tight text-lg">{t('profile.preferences')}</h2>
              </div>
              <div className="relative group">
                <label className="block font-label uppercase tracking-[0.1em] text-[0.6875rem] text-muted-foreground mb-2">{t('profile.preferredRite')}</label>
                <Select defaultValue="roman">
                  <SelectTrigger className="w-full bg-transparent border-0 border-b-2 border-border rounded-none focus:ring-0 focus:border-primary cursor-pointer">
                    <SelectValue placeholder={t('profile.selectRite')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roman">{t('profile.romanRite')}</SelectItem>
                    <SelectItem value="tridentine">{t('profile.tridentineMass')}</SelectItem>
                    <SelectItem value="byzantine">{t('profile.byzantineRite')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Theme Toggle */}
              <div className="p-4 md:p-6 bg-surface-container-low rounded-xl flex items-center justify-between border border-outline-variant/10">
                <div className="flex items-center gap-3 md:gap-4">
                  <span className="material-symbols-outlined text-muted-foreground">dark_mode</span>
                  <div>
                    <p className="font-medium text-sm">{t('profile.deepSanctuary')}</p>
                    <p className="text-xs text-muted-foreground">{t('profile.deepSanctuaryDesc')}</p>
                  </div>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
            </section>
          </div>

          {/* Column 2: Notifications & Welcome */}
          <div className="lg:col-span-5 space-y-12 md:space-y-16">
            {/* Notifications */}
            <section className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary">notifications</span>
                <h2 className="font-headline font-semibold tracking-tight text-lg">{t('profile.notifications')}</h2>
              </div>
              <div className="space-y-4">
                {[
                  { label: t('profile.dailyLiturgy'), checked: true },
                  { label: t('profile.parishEvents'), checked: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Checkbox defaultChecked={item.checked} />
                  </div>
                ))}
              </div>
            </section>

            {/* Welcome */}
            <section className="p-6 md:p-8 bg-surface-container-low rounded-xl border border-primary/20 relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl transition-all group-hover:bg-primary/10" />
              <div className="relative z-10 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-primary tracking-tight">{t('profile.welcome')}</h3>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {t('profile.welcomeMessage')}
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="pt-8 md:pt-12 flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6 border-t border-outline-variant/15">
          <button className="text-muted-foreground hover:text-destructive transition-colors text-sm font-medium">
            {t('profile.deactivateAccount')}
          </button>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button className="px-6 md:px-8 py-3 md:py-4 rounded-md border border-outline-variant/20 hover:bg-muted/50 transition-all text-sm font-bold flex-1 sm:flex-none">
              {t('common.cancel')}
            </button>
            <button className="px-8 md:px-10 py-3 md:py-4 rounded-md sacred-gradient text-primary-foreground font-bold text-sm shadow-xl transition-all flex-1 sm:flex-none">
              {t('common.saveChanges')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
