import { User } from '../models/User.entity';

export const displayName = (user: User) =>
  user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
