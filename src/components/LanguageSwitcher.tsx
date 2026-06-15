'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function LanguageSwitcher() {
  const t = useTranslations('Common');
  const router = useRouter();
  const pathname = usePathname();
  const [locale, setLocale] = useState('zh');

  useEffect(() => {
    const saved = localStorage.getItem('locale') || 'zh';
    setLocale(saved);
  }, []);

  const toggleLanguage = () => {
    const newLocale = locale === 'zh' ? 'en' : 'zh';
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    
    // Strip current locale prefix and re-route
    const pathWithoutLocale = pathname.replace(/^\/(zh|en)(\/|$)/, '/$1');
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="text-xs h-7 w-14"
      title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      {locale === 'zh' ? 'EN' : '中文'}
    </Button>
  );
}
