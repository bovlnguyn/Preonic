import fs from 'fs';
import path from 'path';

const readWorkspaceFile = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../..', relativePath), 'utf8');

describe('Fresh database bootstrap data', () => {
  const seedSql = readWorkspaceFile('Preonic Database/02_Preonic_V2_SeedData.sql');

  test('provides ten demo products, each with a distinct public image URL', () => {
    const productIds = new Set(
      [...seedSql.matchAll(/'((?:10000000-0000-4000-8000-0000000000)\d{2})'/g)]
        .map((match) => match[1])
    );
    const imageUrls = new Set(
      [...seedSql.matchAll(/https:\/\/images\.unsplash\.com\/[^"']+/g)]
        .map((match) => match[0])
    );
    const imageJsonValues = [...seedSql.matchAll(/N'(\["https:\/\/images\.unsplash\.com\/[^']+"\])'/g)]
      .map((match) => match[1]);

    expect(productIds.size).toBe(10);
    expect(imageUrls.size).toBe(10);
    expect(imageJsonValues).toHaveLength(10);
    imageJsonValues.forEach((value) => expect(() => JSON.parse(value)).not.toThrow());
  });

  test('provides ten direct-flow contracts without fabricated money movement', () => {
    const contractIds = new Set(
      [...seedSql.matchAll(/'((?:20000000-0000-4000-8000-0000000000)\d{2})'/g)]
        .map((match) => match[1])
    );

    expect(contractIds.size).toBe(10);
    expect(seedSql).toContain("N'direct_v2'");
    expect(seedSql).toMatch(/N'100_delivery'\s*,\s*0\s*,\s*25\s*,\s*N'active'/);
    expect(seedSql).toContain('INSERT dbo.ContractFeeTerms');
    expect(seedSql).not.toMatch(/INSERT\s+(?:INTO\s+)?dbo\.DirectGoodsPayments/i);
    expect(seedSql).not.toMatch(/INSERT\s+(?:INTO\s+)?dbo\.PlatformFeeLedgerEntries/i);
    expect(seedSql).not.toMatch(/INSERT\s+(?:INTO\s+)?dbo\.PlatformFeePayments/i);
  });

  test('schema compatibility checks the actual ContractFeeTerms primary key', () => {
    const schemaCheck = readWorkspaceFile('be/src/config/schema-compatibility.ts');
    expect(schemaCheck).toContain('"ContractFeeTermsId"');
    expect(schemaCheck).not.toContain('"ContractFeeTermId"');
  });
});
