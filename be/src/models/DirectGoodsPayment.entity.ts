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
import { Contract } from './Contract.entity';
import { User } from './User.entity';
import { UserSettlementBankAccount } from './UserSettlementBankAccount.entity';
import {
  DirectGoodsPaymentStatus,
  GoodsPaymentConfirmationMethod,
  GoodsPaymentTrigger,
} from '../modules/direct-payment-v2/types';

@Entity('DirectGoodsPayments')
@Index('UX_DirectGoodsPayments_Contract_Sequence', ['contractId', 'installmentSequence'], { unique: true })
@Index('UX_DirectGoodsPayments_TransferContent', ['transferContent'], { unique: true })
@Index('UX_DirectGoodsPayments_IdempotencyKey', ['idempotencyKey'], { unique: true })
@Index('IX_DirectGoodsPayments_Payer_Status', ['payerUserId', 'status', 'createdAt'])
@Index('IX_DirectGoodsPayments_Payee_Status', ['payeeUserId', 'status', 'createdAt'])
export class DirectGoodsPayment {
  @PrimaryGeneratedColumn('uuid', { name: 'GoodsPaymentId' })
  id: string;

  @Column({ name: 'ContractId', type: 'uniqueidentifier' })
  contractId: string;

  @Column({ name: 'PayerUserId', type: 'uniqueidentifier' })
  payerUserId: string;

  @Column({ name: 'PayeeUserId', type: 'uniqueidentifier' })
  payeeUserId: string;

  @Column({ name: 'BankAccountId', type: 'uniqueidentifier' })
  bankAccountId: string;

  @Column({ name: 'InstallmentSequence', type: 'smallint', default: 1 })
  installmentSequence: number;

  @Column({ name: 'Trigger', type: 'nvarchar', length: 30 })
  trigger: GoodsPaymentTrigger;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'Currency', type: 'char', length: 3, default: 'VND' })
  currency: string;

  @Column({ name: 'TransferContent', type: 'nvarchar', length: 100 })
  transferContent: string;

  @Column({ name: 'RecipientBankCode', type: 'nvarchar', length: 30 })
  recipientBankCode: string;

  @Column({ name: 'RecipientAccountHolder', type: 'nvarchar', length: 150 })
  recipientAccountHolder: string;

  @Column({ name: 'RecipientMaskedAccountNumber', type: 'nvarchar', length: 40 })
  recipientMaskedAccountNumber: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: 'planned' })
  status: DirectGoodsPaymentStatus;

  @Column({ name: 'ConfirmationMethod', type: 'nvarchar', length: 30, nullable: true })
  confirmationMethod: GoodsPaymentConfirmationMethod | null;

  @Column({ name: 'IdempotencyKey', type: 'nvarchar', length: 128 })
  idempotencyKey: string;

  @Column({ name: 'DueAt', type: 'datetime2', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'ExpiresAt', type: 'datetime2', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'ConfirmedAt', type: 'datetime2', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'ConfirmedBy', type: 'uniqueidentifier', nullable: true })
  confirmedBy: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => Contract, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ContractId' })
  contract: Contract;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'PayerUserId' })
  payer: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'PayeeUserId' })
  payee: User;

  @ManyToOne(() => UserSettlementBankAccount, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BankAccountId' })
  bankAccount: UserSettlementBankAccount;
}
