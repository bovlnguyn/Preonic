import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('PlatformFeePolicies')
@Index('UX_PlatformFeePolicies_Code', ['code'], { unique: true })
@Index('IX_PlatformFeePolicies_ActiveWindow', ['isActive', 'effectiveFrom', 'effectiveTo'])
export class PlatformFeePolicy {
  @PrimaryGeneratedColumn('uuid', { name: 'FeePolicyId' })
  id: string;

  @Column({ name: 'Code', type: 'nvarchar', length: 50 })
  code: string;

  @Column({ name: 'Name', type: 'nvarchar', length: 150 })
  name: string;

  @Column({ name: 'BuyerFeeBps', type: 'int' })
  buyerFeeBps: number;

  @Column({ name: 'SellerFeeBps', type: 'int' })
  sellerFeeBps: number;

  @Column({ name: 'Currency', type: 'char', length: 3, default: 'VND' })
  currency: string;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive: boolean;

  @Column({ name: 'EffectiveFrom', type: 'datetime2' })
  effectiveFrom: Date;

  @Column({ name: 'EffectiveTo', type: 'datetime2', nullable: true })
  effectiveTo: Date | null;

  @Column({ name: 'Notes', type: 'nvarchar', length: 500, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;
}
