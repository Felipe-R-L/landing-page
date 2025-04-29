import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';

const supportedLocales = ['pt', 'en-US'];
const defaultLocale = 'pt'; // DEFINA SEU PADRÃO AQUI
const targetLocaleForOthers = 'en-US';

function getBestLocale(request: Request): string {
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));
  const languages = new Negotiator({ headers }).languages();
  try {
    return match(languages, supportedLocales, defaultLocale);
  } catch {
    return defaultLocale;
  }
}

export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const isApi = pathname.startsWith('/api/');
  const isAsset = /\.\w+$/.test(pathname);
  const isVercelInternal = pathname.startsWith('/_vercel/');
  const isStaticAssetFolder =
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/static/'); // Adicione outras pastas se necessário

  if (isApi || isAsset || isVercelInternal || isStaticAssetFolder) {
    return undefined;
  }

  const pathnameIsMissingLocale = supportedLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const bestLocale = getBestLocale(request);
    const targetLocale = bestLocale === 'pt' ? 'pt' : targetLocaleForOthers;

    const destinationUrl = new URL(request.url);
    destinationUrl.pathname = `/${targetLocale}${
      pathname.startsWith('/') ? '' : '/'
    }${pathname}`;
    if (url.search) {
      destinationUrl.search = url.search;
    }

    return new Response(null, {
      status: 307,
      headers: { Location: destinationUrl.toString() },
    });
  }

  return undefined;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|static|images|assets|_vercel|.*\\.\\w+).*)',
    '/',
  ],
};
