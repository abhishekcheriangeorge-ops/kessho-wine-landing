import { next } from '@vercel/functions';

/**
 * Vercel Edge Middleware — A/B Test
 * 
 * Variant A (control): CTAs → pre-filled Shopify cart URLs
 * Variant B (treatment): CTAs → Shopify product pages
 *
 * 50/50 split, sticky via cookie for 30 days.
 * Both variants served at the same URL (/).
 */

const COOKIE_NAME = 'ab_cart_vs_pdp';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const config = {
  matcher: '/',
};

export default async function middleware(request) {
  const url = new URL(request.url);

  // Parse existing cookie
  const cookieHeader = request.headers.get('cookie') || '';
  let existingVariant = null;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(COOKIE_NAME + '=')) {
      existingVariant = trimmed.substring(COOKIE_NAME.length + 1);
      break;
    }
  }

  // Determine variant
  const isNew = existingVariant !== 'A' && existingVariant !== 'B';
  const variant = isNew ? (Math.random() < 0.5 ? 'A' : 'B') : existingVariant;

  const setCookie = isNew
    ? `${COOKIE_NAME}=${variant}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
    : null;

  // Variant A: serve index.html (default behavior)
  if (variant === 'A') {
    if (setCookie) {
      return next({ headers: { 'Set-Cookie': setCookie } });
    }
    return next();
  }

  // Variant B: fetch variant-b.html and serve it at /
  const variantUrl = new URL('/variant-b.html', request.url);
  variantUrl.search = url.search;

  const variantResponse = await fetch(variantUrl);
  const response = new Response(variantResponse.body, {
    status: variantResponse.status,
    headers: new Headers(variantResponse.headers),
  });

  if (setCookie) {
    response.headers.set('Set-Cookie', setCookie);
  }

  return response;
}
