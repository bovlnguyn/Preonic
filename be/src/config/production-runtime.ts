const requireValue = (name: string): string => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required in production`);
  return value;
};

const requireStrongSecret = (name: string): string => {
  const value = requireValue(name);
  if (Buffer.byteLength(value, 'utf8') < 32 || /CHANGE_THIS|replace[_-]with/i.test(value)) {
    throw new Error(`${name} must be a non-placeholder secret of at least 32 bytes`);
  }
  return value;
};

export const validateProductionRuntimeConfiguration = (): void => {
  const frontendUrl = new URL(requireValue('FRONTEND_URL'));
  if (frontendUrl.protocol !== 'https:') throw new Error('FRONTEND_URL must use HTTPS in production');

  const jwtSecret = requireStrongSecret('JWT_SECRET');
  const refreshSecret = requireStrongSecret('JWT_REFRESH_SECRET');
  if (jwtSecret === refreshSecret) throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');

  if (process.env.DB_SYNCHRONIZE === 'true') {
    throw new Error('DB_SYNCHRONIZE must be false in production');
  }

  requireValue('OPENAI_API_KEY');
  requireValue('CLOUDINARY_CLOUD_NAME');
  requireValue('CLOUDINARY_API_KEY');
  requireValue('CLOUDINARY_API_SECRET');
  requireStrongSecret('GHN_WEBHOOK_SECRET');
};
