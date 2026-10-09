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
import { Product } from './Product.entity';

@Entity('Contracts')
@Index(['farmerId', 'status'])
@Index(['enterpriseId', 'status'])
@Index(['status'])
@Index('IX_Contracts_Farmer_CreatedAt', ['farmerId', 'createdAt'])
@Index('IX_Contracts_Enterprise_CreatedAt', ['enterpriseId', 'createdAt'])
export class Contract {
  @PrimaryGeneratedColumn('uuid', { name: 'ContractId' })
  id: string;

  @Column({ name: 'ContractCode', type: 'nvarchar', length: 20, unique: true })
  contractCode: string;

  @Column({ name: 'ProductId', type: 'uniqueidentifier' })
  productId: string;

  @Column({ name: 'FarmerId', type: 'uniqueidentifier' })
  farmerId: string;

  @Column({ name: 'EnterpriseId', type: 'uniqueidentifier' })
  enterpriseId: string;

  // Snapshot
  @Column({ name: 'FarmerName', type: 'nvarchar', length: 200, nullable: true })
  farmerName: string;

  @Column({ name: 'EnterpriseName', type: 'nvarchar', length: 200, nullable: true })
  enterpriseName: string;

  @Column({ name: 'ProductName', type: 'nvarchar', length: 255, nullable: true })
  productName: string;

  // Quantity and price
  @Column({ name: 'Quantity', type: 'decimal', precision: 18, scale: 2 })
  quantity: number;

  @Column({ name: 'Unit', type: 'nvarchar', length: 50, nullable: true })
  unit: string;

  @Column({ name: 'PricePerUnit', type: 'decimal', precision: 18, scale: 2 })
  pricePerUnit: number;

  @Column({ name: 'TotalValue', type: 'decimal', precision: 18, scale: 2 })
  totalValue: number;

  @Column({ name: 'Commission', type: 'decimal', precision: 18, scale: 2, default: 0, nullable: true })
  commission: number;

  @Column({ name: 'CommissionRate', type: 'decimal', precision: 5, scale: 2, default: 0, nullable: true })
  commissionRate: number;

  @Column({ name: 'DepositAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  depositAmount: number;

  @Column({ name: 'DepositPercentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  depositPercentage: number;

  // Terms
  @Column({ name: 'PaymentTerms', type: 'nvarchar', length: 20 })
  paymentTerms: '50_50' | '30_70' | '100_delivery' | '100_upfront' | 'custom';

  @Column({ name: 'DeliveryDate', type: 'date', nullable: true })
  deliveryDate: Date;

  @Column({ name: 'Notes', type: 'nvarchar', length: 'max', nullable: true })
  notes: string;

  @Column({ name: 'FarmLocation', type: 'nvarchar', length: 500, nullable: true })
  farmLocation: string;

  @Column({ name: 'DeliveryAddress', type: 'nvarchar', length: 500, nullable: true })
  deliveryAddress: string;

  // Payment architecture discriminator. Legacy rows stay on escrow_v1; new
  // contracts can use direct_v2 without making status semantics ambiguous.
  @Column({ name: 'PaymentFlow', type: 'nvarchar', length: 20, default: 'escrow_v1' })
  paymentFlow: 'escrow_v1' | 'direct_v2';

  // Status
  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: 'draft' })
  status: 'draft' | 'pending' | 'approved' | 'active' | 'cancel_pending' | 'completed' | 'cancelled' | 'disputed';

  @Column({ name: 'SignedByFarmer', type: 'bit', default: false })
  signedByFarmer: boolean;

  @Column({ name: 'SignedByEnterprise', type: 'bit', default: false })
  signedByEnterprise: boolean;

  @Column({ name: 'SignedAt', type: 'datetime2', nullable: true })
  signedAt: Date;

  @Column({ name: 'CompletedAt', type: 'datetime2', nullable: true })
  completedAt: Date;

  @Column({ name: 'CancelledAt', type: 'datetime2', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'CancelReason', type: 'nvarchar', length: 500, nullable: true })
  cancelReason: string;

  @Column({ name: 'CancelRequestedBy', type: 'uniqueidentifier', nullable: true })
  cancelRequestedBy: string;

  // Farmer insurance
  @Column({ name: 'InsuranceEnabled', type: 'bit', default: false })
  insuranceEnabled: boolean;

  @Column({ name: 'InsuranceProvider', type: 'nvarchar', length: 100, nullable: true })
  insuranceProvider: string;

  @Column({ name: 'InsurancePackage', type: 'nvarchar', length: 100, nullable: true })
  insurancePackage: string;

  @Column({ name: 'InsuranceFee', type: 'decimal', precision: 18, scale: 2, nullable: true })
  insuranceFee: number;

  @Column({ name: 'InsuranceStatus', type: 'nvarchar', length: 30, nullable: true })
  insuranceStatus: 'none' | 'pending' | 'active' | 'expired' | 'cancelled';

  @Column({ name: 'InsurancePolicyNumber', type: 'nvarchar', length: 100, nullable: true })
  insurancePolicyNumber: string;

  @Column({ name: 'InsuredValue', type: 'decimal', precision: 18, scale: 2, nullable: true })
  insuredValue: number;

  @Column({ name: 'InsuranceCoveredEvents', type: 'nvarchar', length: 30, nullable: true })
  insuranceCoveredEvents: 'natural_disaster' | 'disease' | 'both';

  @Column({ name: 'InsuranceValidFrom', type: 'date', nullable: true })
  insuranceValidFrom: Date;

  @Column({ name: 'InsuranceValidTo', type: 'date', nullable: true })
  insuranceValidTo: Date;

  @Column({ name: 'InsuranceRiskSharingTerms', type: 'nvarchar', length: 'max', nullable: true })
  insuranceRiskSharingTerms: string;

  // Escrow / payment tracking
  @Column({ name: 'EscrowStatus', type: 'nvarchar', length: 30, nullable: true })
  escrowStatus: 'none' | 'pending' | 'funded' | 'released' | 'refunded';

  @Column({ name: 'PaidAmount', type: 'decimal', precision: 18, scale: 2, default: 0, nullable: true })
  paidAmount: number;

  @Column({ name: 'RemainingAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  remainingAmount: number;

  // Delivery tracking
  @Column({ name: 'DeliveryStatus', type: 'nvarchar', length: 30, nullable: true })
  deliveryStatus: 'pending' | 'preparing' | 'shipping' | 'delivered' | 'failed';

  @Column({ name: 'DeliveredAt', type: 'datetime2', nullable: true })
  deliveredAt: Date;

  @Column({ name: 'DeliveryNote', type: 'nvarchar', length: 500, nullable: true })
  deliveryNote: string;

  // Audit
  @Column({ name: 'CreatedBy', type: 'uniqueidentifier', nullable: true })
  createdBy: string;

  @Column({ name: 'UpdatedBy', type: 'uniqueidentifier', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'ProductId' })
  product: Product;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'FarmerId' })
  farmer: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'EnterpriseId' })
  enterprise: User;
}
