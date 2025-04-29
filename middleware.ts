// middleware.ts (Versão para Angular / Framework-Agnóstica)

import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';

const supportedLocales = ['pt', 'en-US'];
const defaultLocale = 'en-US';
const fallbackLocale = 'pt';

type MiddlewareRequest = Request;

function getBestLocale(request: MiddlewareRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  let languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  try {
    return match(languages, supportedLocales, defaultLocale);
  } catch (e) {
    console.warn('Error matching locale, defaulting to:', defaultLocale, e);
    return defaultLocale;
  }
}

export function middleware(request: MiddlewareRequest) {
  const pathname = new URL(request.url).pathname;

  // 1. Verifica se o caminho já inclui um dos locales suportados
  const pathnameIsMissingLocale = supportedLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const bestLocale = getBestLocale(request);
    const targetLocale = bestLocale === 'pt' ? 'pt' : fallbackLocale;

    const newUrl = new URL(request.url);
    newUrl.pathname = `/${targetLocale}${
      pathname.startsWith('/') ? '' : '/'
    }${pathname}`;

    console.log(
      `Redirecting from "${pathname}" to "${newUrl.pathname}" based on locale "${bestLocale}"`
    );

    return new Response(null, {
      status: 307,
      headers: {
        Location: newUrl.toString(),
      },
    });
  }
  return undefined;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|static|images|assets|.*\\..*).*)',
    '/',
  ],
};
