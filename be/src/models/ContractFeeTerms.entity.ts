import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contract } from './Contract.entity';
import { PlatformFeePolicy } from './PlatformFeePolicy.entity';

@Entity('ContractFeeTerms')
@Index('UX_ContractFeeTerms_Contract', ['contractId'], { unique: true })
@Index('IX_ContractFeeTerms_Policy', ['feePolicyId'])
export class ContractFeeTerms {
  @PrimaryGeneratedColumn('uuid', { name: 'ContractFeeTermsId' })
  id: string;

  @Column({ name: 'ContractId', type: 'uniqueidentifier' })
  contractId: string;

  @Column({ name: 'FeePolicyId', type: 'uniqueidentifier' })
  feePolicyId: string;

  @Column({ name: 'BuyerFeeBps', type: 'int' })
  buyerFeeBps: number;

  @Column({ name: 'SellerFeeBps', type: 'int' })
  sellerFeeBps: number;

  @Column({ name: 'Currency', type: 'char', length: 3, default: 'VND' })
  currency: string;

  @Column({ name: 'SnapshottedAt', type: 'datetime2' })
  snapshottedAt: Date;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @ManyToOne(() => Contract, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ContractId' })
  contract: Contract;

  @ManyToOne(() => PlatformFeePolicy, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'FeePolicyId' })
  feePolicy: PlatformFeePolicy;
}
