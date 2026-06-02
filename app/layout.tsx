import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '@/i18n/config';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ToastProvider } from '@/contexts/ToastContext';
import { getActiveTheme, flattenThemeToCss } from '@/lib/theme-utils';
import { Toaster } from 'sonner';
import Script from 'next/script';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const theme = getActiveTheme();
  const lightCss = flattenThemeToCss({ colors: theme.colors });
  const darkCss = flattenThemeToCss({ colors: theme.darkColors });
  const darkMode = theme.darkMode || 'system';

  let htmlClass = cn("font-sans", geist.variable);
  if (darkMode === 'dark') {
    htmlClass = cn(htmlClass, 'dark');
  }

  const themeScript = `
    (function() {
      const darkMode = ${JSON.stringify(darkMode)};
      const setDarkClass = (isDark) => {
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      };
      if (darkMode === 'dark') {
        setDarkClass(true);
      } else if (darkMode === 'light') {
        setDarkClass(false);
      } else if (darkMode === 'system') {
        const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        setDarkClass(darkModeMedia.matches);
        darkModeMedia.addEventListener('change', (e) => setDarkClass(e.matches));
      }
    })();
  `;

  return (
    <html lang="zh" suppressHydrationWarning className={htmlClass}>
      <head>
        <style id="theme-light">{`:root { ${lightCss} }`}</style>
        <style id="theme-dark">{`.dark { ${darkCss} }`}</style>
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ToastProvider>
        <Toaster position="top-right" richColors />
        <Script
          id="theme-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </body>
    </html>
  );
}