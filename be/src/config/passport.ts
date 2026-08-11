import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { createLogger } from '../utils/logger';

const logger = createLogger('Passport');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

if (googleClientId && googleClientSecret && googleCallbackUrl) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const repo = AppDataSource.getRepository(User);
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) return done(new Error('Không lấy được email từ Google'));

          // Google profile normally exposes email_verified in _json. If Google
          // explicitly says the email is not verified, do not trust it for account linking.
          const emailVerified = (profile as any)?._json?.email_verified;
          if (emailVerified === false) {
            return done(new Error('Email Google chưa được xác minh'));
          }

          const existingUser = await repo.findOne({ where: { email } });
          if (existingUser) {
            if (!existingUser.isActive) {
              return done(new Error('Tài khoản đã bị vô hiệu hóa'));
            }
            return done(null, existingUser);
          }

          // Important: this object is only used to create a short-lived, signed,
          // httpOnly onboarding cookie in the callback. It is never trusted from FE.
          return done(null, {
            isNewUser: true,
            googleId: profile.id,
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            avatar: profile.photos?.[0]?.value,
          } as any);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
} else {
  logger.warn(
    'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to enable it.'
  );
}
