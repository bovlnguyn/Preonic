import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';

// Đăng ký strategy ngay trong file này
passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL!,
    },
   async (_accessToken, _refreshToken, profile, done) => {
  try {
    const repo = AppDataSource.getRepository(User);
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Không lấy được email từ Google'));

    // Tìm user cũ
    const existingUser = await repo.findOne({ where: { email } });
    
    if (existingUser) {
      // User cũ → đăng nhập bình thường
      return done(null, existingUser);
    }

    // User mới → trả về profile để FE chọn role
    return done(null, { 
      isNewUser: true,
      email,
      firstName: profile.name?.givenName  || '',
      lastName:  profile.name?.familyName || '',
      avatar:    profile.photos?.[0]?.value,
    } as any);
  } catch (err) {
    return done(err as Error);
  }
}
  )
);