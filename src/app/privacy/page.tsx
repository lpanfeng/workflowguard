import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function PrivacyPage() {
  const t = useTranslations('privacy');
  
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
            <h2 className="text-xl font-semibold mb-3">{t('sections.intro.title')}</h2>
            <p className="text-muted-foreground leading-relaxed">{t('sections.intro.content')}</p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.dataCollection.title')}</h2>
            <p className="text-muted-foreground mb-3">{t('sections.dataCollection.content')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>{t('sections.dataCollection.items.account')}</li>
              <li>{t('sections.dataCollection.items.workflow')}</li>
              <li>{t('sections.dataCollection.items.audit')}</li>
              <li>{t('sections.dataCollection.items.usage')}</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.cookies.title')}</h2>
            <p className="text-muted-foreground leading-relaxed">{t('sections.cookies.content')}</p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.userRights.title')}</h2>
            <p className="text-muted-foreground mb-3">{t('sections.userRights.content')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>{t('sections.userRights.items.access')}</li>
              <li>{t('sections.userRights.items.correct')}</li>
              <li>{t('sections.userRights.items.delete')}</li>
              <li>{t('sections.userRights.items.export')}</li>
              <li>{t('sections.userRights.items.object)}</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('sections.gdpr.title')}</h2>
            <p className="text-muted-foreground leading-relaxed">{t('sections.gdpr.content')}</p>
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
