import { CookieOptions } from 'express';

const DEFAULT_REFRESH_DAYS = 30;
const GOOGLE_ONBOARDING_MAX_AGE_MS = 10 * 60 * 1000;

type SupportedSameSite = 'strict' | 'lax' | 'none';

const getSameSite = (): SupportedSameSite => {
  const value = String(process.env.AUTH_COOKIE_SAME_SITE || 'strict')
    .trim()
    .toLowerCase();

  if (value === 'lax' || value === 'none' || value === 'strict') return value;
  return 'strict';
};

const getSecure = (sameSite: SupportedSameSite): boolean => {
  // SameSite=None is rejected by modern browsers unless Secure=true.
  if (sameSite === 'none') return true;
  if (process.env.AUTH_COOKIE_SECURE !== undefined) {
    return process.env.AUTH_COOKIE_SECURE === 'true';
  }
  return process.env.NODE_ENV === 'production';
};

const getRefreshMaxAge = (): number => {
  const configured = Number(process.env.REFRESH_COOKIE_MAX_AGE_DAYS);
  const days = Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_REFRESH_DAYS;
  return days * 24 * 60 * 60 * 1000;
};

const buildBaseOptions = (): CookieOptions => {
  const sameSite = getSameSite();
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure: getSecure(sameSite),
    sameSite,
    path: '/',
    ...(domain ? { domain } : {}),
  };
};

export const getRefreshCookieOptions = (): CookieOptions => ({
  ...buildBaseOptions(),
  maxAge: getRefreshMaxAge(),
});

export const getRefreshCookieClearOptions = (): CookieOptions => ({
  ...buildBaseOptions(),
});

export const getGoogleOnboardingCookieOptions = (): CookieOptions => ({
  ...buildBaseOptions(),
  maxAge: GOOGLE_ONBOARDING_MAX_AGE_MS,
});

export const getGoogleOnboardingCookieClearOptions = (): CookieOptions => ({
  ...buildBaseOptions(),
});

export const REFRESH_COOKIE_NAME = 'refreshToken';
export const GOOGLE_ONBOARDING_COOKIE_NAME = 'googleOnboarding';
