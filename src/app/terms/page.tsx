import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function TermsPage() {
  const t = useTranslations('terms');
  
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <Link href="/" className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm">
          ← {t('backToHome')}
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">{t('lastUpdated')}: 2026-06-24</p>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.agreement.title')}</h2>
            <p className="text-muted-foreground leading-relaxed">{t('sections.agreement.content')}</p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.account.title')}</h2>
            <p className="text-muted-foreground mb-3">{t('sections.account.content')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>{t('sections.account.items.responsible')}</li>
              <li>{t('sections.account.items.security')}</li>
              <li>{t('sections.account.items.compliance')}</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.service.title')}</h2>
            <p className="text-muted-foreground mb-3">{t('sections.service.content')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>{t('sections.service.items.aiDisclaimer')}</li>
              <li>{t('sections.service.items.approval')}</li>
              <li>{t('sections.service.items.uptime')}</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.limitation.title')}</h2>
            <p className="text-muted-foreground leading-relaxed">{t('sections.limitation.content')}</p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.termination.title')}</h2>
            <p className="text-muted-foreground leading-relaxed">{t('sections.termination.content')}</p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.contact.title')}</h2>
            <p className="text-muted-foreground leading-relaxed">{t('sections.contact.content')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
