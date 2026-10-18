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

  test('provides complete and payment-ready direct-flow scenarios', () => {
    const contractIds = new Set(
      [...seedSql.matchAll(/'((?:20000000-0000-4000-8000-0000000000)\d{2})'/g)]
        .map((match) => match[1])
    );

    expect(contractIds.size).toBe(10);
    expect(seedSql).toContain("N'direct_v2'");
    expect(seedSql).toMatch(/N'100_delivery'\s*,\s*0\s*,\s*-1\s*,\s*N'active'\s*,\s*N'shipping'/);
    expect(seedSql.match(/N'completed'\s*,\s*N'delivered'/g)).toHaveLength(2);
    expect(seedSql).toContain('INSERT dbo.ContractFeeTerms');
    expect(seedSql).toMatch(/INSERT\s+(?:INTO\s+)?dbo\.DirectGoodsPayments/i);
    expect(seedSql).toMatch(/INSERT\s+(?:INTO\s+)?dbo\.PlatformFeeLedgerEntries/i);
    expect(seedSql).toMatch(/INSERT\s+(?:INTO\s+)?dbo\.PartnerRatings/i);
    expect(seedSql).toContain("N'******2468', 0, N'disabled'");
    expect(seedSql).toContain("N'confirmed', N'farmer_manual'");
    expect(seedSql).toContain("COL_LENGTH('dbo.UserSettlementBankAccounts', 'VerificationStatus')");
    expect(seedSql.indexOf('COMMIT TRANSACTION')).toBeLessThan(
      seedSql.indexOf('PreOnic demo seed completed')
    );
    expect(seedSql).not.toMatch(/INSERT\s+(?:INTO\s+)?dbo\.PlatformFeePayments/i);
  });

  test('adds report and partner-rating indexes used by dashboard queries', () => {
    const schemaSql = readWorkspaceFile('Preonic Database/01_Preonic_V2_CreateDatabase.sql');
    expect(schemaSql).toContain('IX_Users_CreatedAt');
    expect(schemaSql).toContain('IX_Contracts_CreatedAt');
    expect(schemaSql).toContain('IX_Contracts_UnsignedExpiry');
    expect(schemaSql).toContain('IX_Reviews_Product_CreatedAt');
    expect(schemaSql).toContain('IX_PR_Reviewee_CreatedAt');
    expect(schemaSql).toContain('IX_PR_Reviewer_CreatedAt');
  });

  test('schema compatibility checks the actual ContractFeeTerms primary key', () => {
    const schemaCheck = readWorkspaceFile('be/src/config/schema-compatibility.ts');
    expect(schemaCheck).toContain('"ContractFeeTermsId"');
    expect(schemaCheck).not.toContain('"ContractFeeTermId"');
  });

  test('fresh schema persists bank verification evidence without exposing account numbers', () => {
    const schemaSql = readWorkspaceFile('Preonic Database/01_Preonic_V2_CreateDatabase.sql');
    expect(schemaSql).toContain('VerificationStatus');
    expect(schemaSql).toContain('VerifiedAccountHolder');
    expect(schemaSql).toContain('VerificationReference');
    expect(schemaSql).toMatch(/CHECK \(VerificationStatus IN \('unverified','verified','failed'\)\)/);
  });
});
