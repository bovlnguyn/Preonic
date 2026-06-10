import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Product } from './Product.entity';
import { User } from './User.entity';

@Entity('Reviews')
@Unique(['productId', 'reviewerId'])   // UQ_Reviews_Product_Reviewer
export class Review {
  @PrimaryGeneratedColumn('uuid', { name: 'ReviewId' })
  id: string;

  @Column({ name: 'ProductId', type: 'uniqueidentifier' })
  productId: string;

  @Column({ name: 'ReviewerId', type: 'uniqueidentifier' })
  reviewerId: string;

  @Column({ name: 'ReviewerName', type: 'nvarchar', length: 200, nullable: true })
  reviewerName: string;

  @Column({ name: 'ReviewerAvatar', type: 'nvarchar', length: 500, nullable: true })
  reviewerAvatar: string;

  // Rating BETWEEN 1 AND 5 — CHECK constraint ở SQL, validate ở service
  @Column({ name: 'Rating', type: 'tinyint' })
  rating: number;

  @Column({ name: 'Text', type: 'nvarchar', length: 'max', nullable: true })
  text: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ProductId' })
  product: Product;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ReviewerId' })
  reviewer: User;
}