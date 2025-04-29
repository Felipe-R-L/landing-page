import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';

const supportedLocales = ['pt', 'en-US'];
const defaultLocale = 'en-US';
const targetLocaleForOthers = 'en-US';

function getBestLocale(request: Request): string {
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));
  const languages = new Negotiator({ headers }).languages();
  return match(languages, supportedLocales, defaultLocale);
}

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const p = url.pathname;

  const isApi = p.startsWith('/api/');
  const isAsset = /\.\w+$/.test(p);
  const isStatic =
    p.startsWith('/assets/') ||
    p.startsWith('/images/') ||
    p.startsWith('/static/');
  if (isApi || isAsset || isStatic) return undefined;

  const missingLocale = supportedLocales.every(
    (loc) => !p.startsWith(`/${loc}/`) && p !== `/${loc}`
  );
  if (missingLocale) {
    const best = getBestLocale(request);
    const target = best === 'pt' ? 'pt' : targetLocaleForOthers;
    url.pathname = `/${target}${p}`;
    return new Response(null, {
      status: 307,
      headers: { Location: url.toString() },
    });
  }

  return undefined;
}

export const config = {
  matcher: ['/((?!api|.*\\..*).*)', '/'],
};
