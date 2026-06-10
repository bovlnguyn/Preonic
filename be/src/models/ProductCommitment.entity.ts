import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product.entity';

@Entity('ProductCommitments')
export class ProductCommitment {
  @PrimaryGeneratedColumn({ name: 'CommitId' })
  id: number;

  @Column({ name: 'ProductId', type: 'uniqueidentifier' })
  productId: string;

  @Column({ name: 'Value', type: 'nvarchar', length: 500 })
  value: string;

  @Column({ name: 'SortOrder', type: 'tinyint', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Product, p => p.commitments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ProductId' })
  product: Product;
}