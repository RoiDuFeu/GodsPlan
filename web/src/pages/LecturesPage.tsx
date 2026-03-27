import { useTranslation } from 'react-i18next';

export function LecturesPage() {
  const { t, i18n } = useTranslation();

  const today = new Date().toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-6 md:p-8 lg:p-16 max-w-6xl mx-auto no-scrollbar">
      {/* Header */}
      <section className="mb-16 md:mb-24 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <div className="lg:w-2/3">
          <span className="text-primary uppercase tracking-[0.2em] font-medium block mb-4 text-sm font-label">{today}</span>
          <h1 className="text-3xl md:text-[3.5rem] font-headline leading-none tracking-tighter mb-4">
            {t('lectures.title')}
          </h1>
        </div>
        <div className="lg:w-1/3">
          <p className="text-on-surface-variant font-light leading-relaxed border-l border-primary/20 pl-6 italic">
            {t('lectures.headerQuote')}
          </p>
        </div>
      </section>

      {/* Readings */}
      <div className="space-y-20 md:space-y-32">
        {/* First Reading */}
        <article className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16">
          <div className="lg:col-span-3">
            <h2 className="font-headline text-primary text-xl font-bold uppercase tracking-widest border-b border-outline-variant/20 pb-4">{t('lectures.firstReading')}</h2>
            <p className="text-muted-foreground text-xs mt-4 tracking-tighter font-mono uppercase">Acts 16:11-15</p>
          </div>
          <div className="lg:col-span-9">
            <div className="serif-text text-xl md:text-2xl lg:text-3xl leading-[1.6] font-light mb-8">
              {t('lectures.firstReadingText')}
            </div>
            <div className="space-y-6 text-on-surface-variant leading-relaxed max-w-2xl">
              <p>{t('lectures.firstReadingP1')}</p>
              <p>{t('lectures.firstReadingP2')}</p>
            </div>
            <div className="mt-8 md:mt-12 p-6 md:p-8 bg-surface-container-low rounded-xl border-l-2 border-primary">
              <h4 className="text-xs uppercase tracking-widest text-primary font-bold mb-4">{t('lectures.reflection')}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('lectures.reflectionText')}
              </p>
            </div>
          </div>
        </article>

        {/* Responsorial Psalm */}
        <article className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16">
          <div className="lg:col-span-3">
            <h2 className="font-headline text-primary text-xl font-bold uppercase tracking-widest border-b border-outline-variant/20 pb-4">{t('lectures.responsorialPsalm')}</h2>
            <p className="text-muted-foreground text-xs mt-4 tracking-tighter font-mono uppercase">Psalm 149</p>
          </div>
          <div className="lg:col-span-9 flex flex-col items-center text-center py-8 md:py-12 bg-surface-container-lowest rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <p className="text-primary text-sm uppercase tracking-widest mb-6 font-bold">{t('lectures.theResponse')}</p>
              <p className="serif-text text-2xl md:text-3xl lg:text-4xl italic mb-12">"{t('lectures.psalmResponse')}"</p>
              <div className="space-y-8 serif-text text-lg md:text-xl text-on-surface-variant font-light">
                {t('lectures.psalmVerse1').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
                <p>
                  {t('lectures.psalmVerse2').split('\n').map((line, i) => (
                    <span key={i}>{line}{i === 0 && <br />}</span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Gospel */}
        <article className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16">
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-28">
              <h2 className="font-headline text-primary text-xl font-bold uppercase tracking-widest border-b border-outline-variant/20 pb-4">{t('lectures.theGospel')}</h2>
              <p className="text-muted-foreground text-xs mt-4 tracking-tighter font-mono uppercase">John 15:26—16:4a</p>
            </div>
          </div>
          <div className="lg:col-span-9">
            <div className="flex items-center gap-4 mb-8">
              <span className="h-[1px] flex-1 bg-outline-variant/30" />
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              <span className="h-[1px] flex-1 bg-outline-variant/30" />
            </div>
            <div className="serif-text text-xl md:text-2xl lg:text-3xl leading-[1.6] font-light mb-8">
              {t('lectures.gospelText')}
            </div>
            <div className="space-y-6 text-on-surface-variant leading-relaxed max-w-2xl text-base md:text-lg">
              <p>{t('lectures.gospelP1')}</p>
              <p>{t('lectures.gospelP2')}</p>
            </div>

            {/* Commentary */}
            <div className="mt-12 md:mt-20 border-t border-outline-variant/10 pt-8 md:pt-12">
              <h3 className="font-headline text-lg font-bold mb-6">{t('lectures.commentaryTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-on-surface-variant font-light leading-relaxed">
                <p>{t('lectures.commentaryP1')}</p>
                <p>{t('lectures.commentaryP2')}</p>
              </div>
            </div>
          </div>
        </article>

        {/* Daily Meditation */}
        <section className="mt-20 md:mt-40 mb-12 md:mb-20 relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-8xl text-primary/10 font-serif leading-none">&ldquo;</div>
          <div className="bg-surface-container-low rounded-2xl md:rounded-3xl p-8 md:p-12 lg:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            <div className="max-w-3xl mx-auto relative z-10">
              <span className="material-symbols-outlined text-primary text-5xl mb-8" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
              <h3 className="text-2xl md:text-3xl lg:text-5xl font-headline font-extralight tracking-tight mb-8 italic">
                "{t('lectures.meditationQuote')}"
              </h3>
              <div className="h-1 w-12 bg-primary mx-auto mb-6" />
              <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">{t('lectures.dailyMeditation')}</p>
              <div className="mt-12 md:mt-16 flex flex-col sm:flex-row justify-center gap-4">
                <button className="px-8 py-3 bg-primary text-primary-foreground rounded-md font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors">
                  {t('lectures.journalReflection')}
                </button>
                <button className="px-8 py-3 border border-outline-variant/30 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-muted/50 transition-colors">
                  {t('lectures.shareLecture')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-20 md:mt-32 pb-20 text-center border-t border-outline-variant/10 pt-12 md:pt-16">
        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-2">{t('lectures.footerTitle')}</p>
        <p className="text-[0.625rem] text-muted-foreground/60">{t('lectures.footerSubtitle')}</p>
      </footer>
    </div>
  );
}
