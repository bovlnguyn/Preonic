import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  Index, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { User } from './User.entity';
import { ProductCertification } from './ProductCertification.entity';
import { ProductCommitment } from './ProductCommitment.entity';

@Entity('Products')
@Index(['category'])
@Index(['region'])
@Index(['isActive'])
@Index(['createdBy'])
@Index('IX_Products_CreatedBy_IsActive_CreatedAt', ['createdBy', 'isActive', 'createdAt'])
@Index('IX_Products_IsActive_CreatedAt', ['isActive', 'createdAt'])
@Index('IX_Products_IsActive_Category_CreatedAt', ['isActive', 'category', 'createdAt'])
@Index('IX_Products_IsActive_Region_CreatedAt', ['isActive', 'region', 'createdAt'])
export class Product {

  @PrimaryGeneratedColumn('uuid', { name: 'ProductId' })
  id: string;

  @Column({ name: 'Name', type: 'nvarchar', length: 255 })
  name: string;

  @Column({ name: 'Location', type: 'nvarchar', length: 255, nullable: true })
  location: string;

  @Column({ name: 'Farm', type: 'nvarchar', length: 255, nullable: true })
  farm: string;

  @Column({ name: 'Variety', type: 'nvarchar', length: 200, nullable: true })
  variety: string;

  @Column({ name: 'Area', type: 'decimal', precision: 10, scale: 2, nullable: true })
  area: number;

  @Column({ name: 'Image', type: 'nvarchar', length: 500, nullable: true })
  image: string;

  @Column({ name: 'PriceMin', type: 'decimal', precision: 18, scale: 2, nullable: true })
  priceMin: number;
  @Column({ name: 'Images', type: 'nvarchar', length: 'max', nullable: true })
  images: string; // JSON.stringify(['url1.jpg', 'url2.jpg', ...])

  @Column({ name: 'PriceMax', type: 'decimal', precision: 18, scale: 2, nullable: true })
  priceMax: number;

  @Column({ name: 'Unit', type: 'nvarchar', length: 50, nullable: true })
  unit: string;

  // Đơn vị tính giá (VNĐ/kg, VNĐ/tạ, VNĐ/tấn...) — độc lập với đơn vị sản lượng ở trên
  @Column({ name: 'PriceUnit', type: 'nvarchar', length: 50, nullable: true })
  priceUnit: string;

  @Column({ name: 'PlantDate', type: 'date', nullable: true })
  plantDate: Date;

  @Column({ name: 'ExpectedDate', type: 'date', nullable: true })
  expectedDate: Date;

  @Column({ name: 'Progress', type: 'decimal', precision: 5, scale: 2, nullable: true, default: 0 })
  progress: number;

  @Column({ name: 'CoverageRate', type: 'tinyint', default: 50 })
  coverageRate: number;

  @Column({ name: 'Remaining', type: 'decimal', precision: 18, scale: 2, nullable: true })
  remaining: number;

  @Column({ name: 'TotalQuantity', type: 'decimal', precision: 18, scale: 2, nullable: true })
  totalQuantity: number;

  @Column({ name: 'Note', type: 'nvarchar', length: 'max', nullable: true })
  note: string;

  @Column({ name: 'Badge', type: 'nvarchar', length: 100, nullable: true })
  badge: string;

  @Column({ name: 'Category', type: 'nvarchar', length: 30 })
  category: 'fruit' | 'vegetable' | 'rice' | 'coffee' | 'tea' | 'spice' | 'grain' | 'other';

  @Column({ name: 'Region', type: 'nvarchar', length: 10 })
  region: 'north' | 'central' | 'south';

  @Column({ name: 'Type', type: 'nvarchar', length: 20 })
  type: 'fresh' | 'dried' | 'processed';

  @Column({ name: 'Rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'ReviewCount', type: 'int', default: 0 })
  reviewCount: number;

  @Column({ name: 'Description', type: 'nvarchar', length: 'max', nullable: true })
  description: string;

  @Column({ name: 'NutritionInfo', type: 'nvarchar', length: 'max', nullable: true })
  nutritionInfo: string;

  // ── Seller snapshot ──
  @Column({ name: 'SellerUserId', type: 'uniqueidentifier', nullable: true })
  sellerUserId: string;

  @Column({ name: 'SellerName', type: 'nvarchar', length: 200, nullable: true })
  sellerName: string;

  @Column({ name: 'SellerAvatar', type: 'nvarchar', length: 500, nullable: true })
  sellerAvatar: string;

  @Column({ name: 'SellerRating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  sellerRating: number;

  @Column({ name: 'SellerTotalContracts', type: 'int', nullable: true })
  sellerTotalContracts: number;

  @Column({ name: 'CreatedBy', type: 'uniqueidentifier' })
  createdBy: string;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt: Date;

  // ── Relations ──
  @ManyToOne(() => User)
  @JoinColumn({ name: 'CreatedBy' })
  creator: User;

  @OneToMany(() => ProductCertification, c => c.product, { cascade: true, eager: false })
  certifications: ProductCertification[];

  @OneToMany(() => ProductCommitment, c => c.product, { cascade: true, eager: false })
  commitments: ProductCommitment[];
}