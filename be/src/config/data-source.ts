import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// File này CHỈ dùng cho TypeORM CLI (migration:generate, migration:run, migration:revert)
// App chính vẫn dùng AppDataSource trong database.ts như bình thường
const CliDataSource = new DataSource({
  type:     'mssql',
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 1433),
  username: process.env.DB_USERNAME ?? 'sa',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'preonic',

  entities:   ['src/models/**/*.entity.ts'],
  migrations: ['src/migrations/**/*.ts'],

  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',

  options: {
    encrypt:                process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort:       true,
    instanceName:           process.env.DB_INSTANCE || undefined,
  },
});

export default CliDataSource;