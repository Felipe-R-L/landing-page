import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';

const supportedLocales = ['pt', 'en-US'];
const defaultLocale = 'en-US';

function getBestLocale(request: Request) {
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));
  const langs = new Negotiator({ headers }).languages();
  return match(langs, supportedLocales, defaultLocale);
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const p = url.pathname;

  if (
    p.startsWith('/api/') ||
    /\.\w+$/.test(p) ||
    p.startsWith('/assets/') ||
    p.startsWith('/images/')
  ) {
    return undefined;
  }

  const hasLocale = supportedLocales.find(
    (loc) => p === `/${loc}` || p.startsWith(`/${loc}/`)
  );
  if (hasLocale) {
    const indexPath = `${hasLocale}/index.html`;
    return fetch(new Request(`${url.origin}/${indexPath}`, request));
  }

  const best = getBestLocale(request);
  url.pathname = `/${best}${p}`;
  return new Response(null, {
    status: 307,
    headers: { Location: url.toString() },
  });
}

export const config = {
  matcher: ['/', '/((?!api|.*\\..*).*)'],
};
