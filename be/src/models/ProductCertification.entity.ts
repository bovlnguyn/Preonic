import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product.entity';

@Entity('ProductCertifications')
export class ProductCertification {
  @PrimaryGeneratedColumn({ name: 'CertId' })
  id: number;

  @Column({ name: 'ProductId', type: 'uniqueidentifier' })
  productId: string;

  @Column({ name: 'Value', type: 'nvarchar', length: 200 })
  value: string;

  @Column({ name: 'SortOrder', type: 'tinyint', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Product, p => p.certifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ProductId' })
  product: Product;
}