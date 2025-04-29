// middleware.ts  (put in the project root, alongside your Angular `dist` folder)
import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';

const supportedLocales = ['pt', 'en-US'];
const defaultLocale = 'en-US'; // fallback when nothing matches

function getBestLocale(request: Request): string {
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => (headers[k] = v));
  const languages = new Negotiator({ headers }).languages();
  return match(languages, supportedLocales, defaultLocale);
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const p = url.pathname;

  // 1️⃣  If this is an asset or API, let it through (no redirect):
  const isAsset =
    p.startsWith('/assets/') ||
    p.startsWith('/images/') ||
    /\.\w+$/.test(p) || // any “.js/.css/.png/etc” file
    p.startsWith('/api/');
  if (isAsset) {
    //—but if it’s an asset _with_ a locale prefix, strip it off:
    const m = p.match(/^\/(pt|en-US)(\/assets\/.*)/);
    if (m) {
      const rewritten = url.origin + m[2] + url.search;
      return fetch(new Request(rewritten, request));
    }
    return fetch(request);
  }

  // 2️⃣  If it already has a locale prefix, just let it through
  if (
    supportedLocales.some((loc) => p === `/${loc}` || p.startsWith(`/${loc}/`))
  ) {
    return fetch(request);
  }

  // 3️⃣  Otherwise—no locale in the path—detect & redirect
  const best = getBestLocale(request);
  const destination = `${url.origin}/${best}${p}${url.search}`;
  return new Response(null, {
    status: 307,
    headers: { Location: destination },
  });
}

export const config = {
  matcher: [
    // run on everything except static file‐extensions and /api
    '/((?!api|.*\\..*).*)',
    '/',
  ],
};
