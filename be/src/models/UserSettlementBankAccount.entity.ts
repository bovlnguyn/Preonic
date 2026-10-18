import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';

@Entity('UserSettlementBankAccounts')
@Index('IX_UserSettlementBankAccounts_User_Status', ['userId', 'status'])
@Index('UX_UserSettlementBankAccounts_User_Fingerprint', ['userId', 'accountNumberFingerprint'], { unique: true })
@Index('UX_UserSettlementBankAccounts_Default', ['userId'], {
  unique: true,
  where: '[IsDefault] = 1',
})
export class UserSettlementBankAccount {
  @PrimaryGeneratedColumn('uuid', { name: 'BankAccountId' })
  id: string;

  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId: string;

  @Column({ name: 'BankCode', type: 'nvarchar', length: 30 })
  bankCode: string;

  @Column({ name: 'BankName', type: 'nvarchar', length: 100, nullable: true })
  bankName: string | null;

  @Column({ name: 'AccountHolder', type: 'nvarchar', length: 150 })
  accountHolder: string;

  @Column({ name: 'AccountNumberCiphertext', type: 'nvarchar', length: 'max', select: false })
  accountNumberCiphertext: string;

  @Column({ name: 'AccountNumberIv', type: 'nvarchar', length: 64, select: false })
  accountNumberIv: string;

  @Column({ name: 'AccountNumberAuthTag', type: 'nvarchar', length: 64, select: false })
  accountNumberAuthTag: string;

  @Column({ name: 'EncryptionKeyVersion', type: 'smallint', default: 1 })
  encryptionKeyVersion: number;

  @Column({ name: 'AccountNumberFingerprint', type: 'char', length: 64, select: false })
  accountNumberFingerprint: string;

  @Column({ name: 'MaskedAccountNumber', type: 'nvarchar', length: 40 })
  maskedAccountNumber: string;

  @Column({ name: 'IsDefault', type: 'bit', default: false })
  isDefault: boolean;

  @Column({ name: 'Status', type: 'nvarchar', length: 20, default: 'active' })
  status: 'active' | 'disabled';

  @Column({ name: 'VerificationStatus', type: 'nvarchar', length: 20, default: 'unverified' })
  verificationStatus: 'unverified' | 'verified' | 'failed';

  @Column({ name: 'VerifiedAccountHolder', type: 'nvarchar', length: 150, nullable: true })
  verifiedAccountHolder: string | null;

  @Column({ name: 'VerificationProvider', type: 'nvarchar', length: 50, nullable: true })
  verificationProvider: string | null;

  @Column({ name: 'VerificationReference', type: 'nvarchar', length: 120, nullable: true })
  verificationReference: string | null;

  @Column({ name: 'VerifiedAt', type: 'datetime2', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'UserId' })
  user: User;
}
