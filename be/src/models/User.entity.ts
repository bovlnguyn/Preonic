import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
  BeforeInsert, BeforeUpdate,
} from 'typeorm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

@Entity('Users')
@Index(['role'])
@Index(['isActive'])
@Index('UX_Users_Phone', ['phone'], { unique: true, where: '[Phone] IS NOT NULL' })
export class User {

  @PrimaryGeneratedColumn('uuid', { name: 'UserId' })
  id: string;

  @Index({ unique: true })
  @Column({ name: 'Email', type: 'nvarchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'Password', type: 'nvarchar', length: 255, select: false })
  password: string;

  @Column({ name: 'Role', type: 'nvarchar', length: 20 })
  role: 'farmer' | 'enterprise' | 'admin';

  // Nguồn tạo tài khoản — 'google' thì mật khẩu là random, người dùng không biết
  @Column({ name: 'AuthProvider', type: 'nvarchar', length: 20, default: 'local' })
  authProvider: 'local' | 'google';

  @Column({ name: 'FirstName', type: 'nvarchar', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'LastName', type: 'nvarchar', length: 100, nullable: true })
  lastName: string;

  // FullName là COMPUTED COLUMN trong SQL (AS ... PERSISTED) → insert:false, update:false
  @Column({ name: 'FullName', type: 'nvarchar', length: 200, nullable: true, insert: false, update: false })
  fullName: string;

  @Column({ name: 'Phone', type: 'nvarchar', length: 20, nullable: true })
  phone: string;

  @Column({ name: 'Avatar', type: 'nvarchar', length: 500, nullable: true })
  avatar: string;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive: boolean;

  @Column({ name: 'IsVerified', type: 'bit', default: false })
  isVerified: boolean;

  @Column({ name: 'EmailVerificationToken', type: 'nvarchar', length: 255, nullable: true, select: false })
  emailVerificationToken: string;

  @Column({ name: 'EmailVerificationExpires', type: 'datetime2', nullable: true, select: false })
  emailVerificationExpires: Date;

  @Column({ name: 'RefreshToken', type: 'nvarchar', length: 512, nullable: true, select: false })
  refreshToken: string;

  @Column({ name: 'PasswordResetToken', type: 'nvarchar', length: 255, nullable: true, select: false })
  passwordResetToken: string;

  @Column({ name: 'PasswordResetExpires', type: 'datetime2', nullable: true, select: false })
  passwordResetExpires: Date;

  @Column({ name: 'PasswordChangedAt', type: 'datetime2', nullable: true, select: false })
  passwordChangedAt: Date;

  @Column({ name: 'LastLogin', type: 'datetime2', nullable: true })
  lastLogin: Date;

  @Column({ name: 'LoginAttempts', type: 'tinyint', default: 0 })
  loginAttempts: number;

  @Column({ name: 'LockUntil', type: 'datetime2', nullable: true })
  lockUntil: Date | null;

  @Column({ name: 'Province', type: 'nvarchar', length: 100, nullable: true })
  province: string;

  @Column({ name: 'District', type: 'nvarchar', length: 100, nullable: true })
  district: string;

  @Column({ name: 'Ward', type: 'nvarchar', length: 100, nullable: true })
  ward: string;

  @Column({ name: 'Address', type: 'nvarchar', length: 500, nullable: true })
  address: string;

  @Column({ name: 'Latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ name: 'Longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ name: 'VirtualBalance', type: 'decimal', precision: 18, scale: 2, default: 10000000 })
  virtualBalance: number;

  @Column({ name: 'ReputationScore', type: 'decimal', precision: 3, scale: 2, default: 0 })
  reputationScore: number;

  @Column({ name: 'TotalRatings', type: 'int', default: 0 })
  totalRatings: number;

  // ── Profile chi tiết theo role ──
  @Column({ name: 'FarmName', type: 'nvarchar', length: 255, nullable: true })
  farmName: string;

  @Column({ name: 'FarmSize', type: 'decimal', precision: 10, scale: 2, nullable: true })
  farmSize: number;

  @Column({ name: 'CompanyName', type: 'nvarchar', length: 255, nullable: true })
  companyName: string;

  @Column({ name: 'TaxCode', type: 'nvarchar', length: 20, nullable: true })
  taxCode: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  // ── Hooks ──
  @BeforeInsert()
  @BeforeUpdate()
  buildFullName() {
    if (this.firstName || this.lastName) {
      this.fullName = `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim();
    }
  }

  async hashPassword(): Promise<void> {
    if (!this.password) return;
    this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(12));
  }

  // ── Methods ──
  async comparePassword(candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.password);
  }

  createPasswordResetToken(): string {
    const raw = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(raw).digest('hex');
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    return raw;
  }

  createEmailVerificationToken(): string {
    const raw = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(raw).digest('hex');
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return raw;
  }

  isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  changedPasswordAfter(jwtTimestamp: number): boolean {
    if (this.passwordChangedAt) {
      return jwtTimestamp < Math.floor(this.passwordChangedAt.getTime() / 1000);
    }
    return false;
  }

  incrementLoginAttempts(): void {
    if (this.lockUntil && this.lockUntil < new Date()) {
      this.loginAttempts = 1;
      this.lockUntil = null;
    } else {
      this.loginAttempts += 1;
      if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        this.lockUntil = new Date(Date.now() + LOCK_TIME);
      }
    }
  }

  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockUntil = null;
    this.lastLogin = new Date();
  }
  isProfileComplete(): boolean {
    if (!this.firstName?.trim()) return false;
    if (!this.lastName?.trim()) return false;
    if (!this.phone?.trim()) return false;
    if (!this.province?.trim()) return false;
    if (!this.district?.trim()) return false;
    if (!this.address?.trim()) return false;

    if (this.role === 'farmer') {
      return Boolean(this.farmName?.trim());
    }

    if (this.role === 'enterprise') {
      return Boolean(this.companyName?.trim() && this.taxCode?.trim());
    }

    return true;
  }

  toJSON() {
    const { password, refreshToken, passwordResetToken,
            passwordResetExpires, emailVerificationToken, ...safe } = this as any;
    return safe;
  }
}