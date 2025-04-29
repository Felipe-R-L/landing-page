// middleware.ts (Framework-Agnóstico COM Logs)
import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';

// --- Configuração ---
const supportedLocales = ['pt', 'en-US'];
const defaultLocale = 'pt';
const targetLocaleForOthers = 'en-US';
// --------------------

type MiddlewareRequest = Request;

function getBestLocale(request: MiddlewareRequest): string {
  const acceptLanguageHeader = request.headers.get('accept-language');
  console.log(`[Middleware] Accept-Language Header: ${acceptLanguageHeader}`);

  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  let languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  console.log(
    `[Middleware] Negotiator languages(): ${JSON.stringify(languages)}`
  );

  try {
    const bestMatch = match(languages, supportedLocales, defaultLocale);
    console.log(`[Middleware] Locale match(): ${bestMatch}`);
    return bestMatch;
  } catch (e) {
    console.error('[Middleware] Error matching locale:', e);
    console.log(`[Middleware] Defaulting to: ${defaultLocale}`);
    return defaultLocale;
  }
}

export function middleware(request: MiddlewareRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  console.log(`\n[Middleware] Executing for URL: ${request.url}`);
  console.log(`[Middleware] Pathname: ${pathname}`);

  const pathnameIsMissingLocale = supportedLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );
  console.log(
    `[Middleware] pathnameIsMissingLocale: ${pathnameIsMissingLocale}`
  );

  if (pathnameIsMissingLocale) {
    const bestLocale = getBestLocale(request);

    const targetLocale = bestLocale === 'pt' ? 'pt' : targetLocaleForOthers;
    console.log(`[Middleware] Determined targetLocale: ${targetLocale}`);

    const newUrl = new URL(request.url);
    newUrl.pathname = `/${targetLocale}${
      pathname.startsWith('/') ? '' : '/'
    }${pathname}`;
    if (url.search) {
      // Preserva query params
      newUrl.search = url.search;
    }

    console.log(`[Middleware] Redirecting to: ${newUrl.toString()}`);

    return new Response(null, {
      status: 307,
      headers: {
        Location: newUrl.toString(),
      },
    });
  }

  console.log('[Middleware] Pathname already has locale. Passing through.');
  return undefined;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|static|images|assets|.*\\..*).*)',
    '/',
  ],
};
