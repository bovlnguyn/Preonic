import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix 08 - các composite index phục vụ các query được gọi thường xuyên ở dashboard,
 * danh sách sản phẩm, escrow, dispute và messaging.
 *
 * Migration chỉ thêm index, không thay đổi/xóa dữ liệu nghiệp vụ.
 */
export class AddPerformanceIndexes1786680000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1786680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Contracts_Farmer_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Contracts')
      )
      CREATE INDEX IX_Contracts_Farmer_CreatedAt
        ON dbo.Contracts (FarmerId, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Contracts_Enterprise_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Contracts')
      )
      CREATE INDEX IX_Contracts_Enterprise_CreatedAt
        ON dbo.Contracts (EnterpriseId, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Escrows_Farmer_Status_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Escrows')
      )
      CREATE INDEX IX_Escrows_Farmer_Status_CreatedAt
        ON dbo.Escrows (FarmerId, Status, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Escrows_Enterprise_Status_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Escrows')
      )
      CREATE INDEX IX_Escrows_Enterprise_Status_CreatedAt
        ON dbo.Escrows (EnterpriseId, Status, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Products_CreatedBy_IsActive_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Products')
      )
      CREATE INDEX IX_Products_CreatedBy_IsActive_CreatedAt
        ON dbo.Products (CreatedBy, IsActive, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Products_IsActive_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Products')
      )
      CREATE INDEX IX_Products_IsActive_CreatedAt
        ON dbo.Products (IsActive, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Products_IsActive_Category_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Products')
      )
      CREATE INDEX IX_Products_IsActive_Category_CreatedAt
        ON dbo.Products (IsActive, Category, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Products_IsActive_Region_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Products')
      )
      CREATE INDEX IX_Products_IsActive_Region_CreatedAt
        ON dbo.Products (IsActive, Region, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Disputes_RaisedBy_Status_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Disputes')
      )
      CREATE INDEX IX_Disputes_RaisedBy_Status_CreatedAt
        ON dbo.Disputes (RaisedBy, Status, CreatedAt);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Disputes_Against_Status_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Disputes')
      )
      CREATE INDEX IX_Disputes_Against_Status_CreatedAt
        ON dbo.Disputes (AgainstUserId, Status, CreatedAt);
    `);

    // PK hiện tại có thứ tự ConversationId, UserId. Index đảo chiều giúp truy vấn
    // "mọi conversation của user" không phải scan toàn bảng participant.
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_ConversationParticipants_UserId_ConversationId'
          AND object_id = OBJECT_ID('dbo.ConversationParticipants')
      )
      CREATE INDEX IX_ConversationParticipants_UserId_ConversationId
        ON dbo.ConversationParticipants (UserId, ConversationId);
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Conversations_LastMessageAt_CreatedAt'
          AND object_id = OBJECT_ID('dbo.Conversations')
      )
      CREATE INDEX IX_Conversations_LastMessageAt_CreatedAt
        ON dbo.Conversations (LastMessageAt, CreatedAt);
    `);

    // Messages da co metadata index trong entity tu truoc. Chi tao index named neu
    // database hien tai chua co bat ky index nao co 2 key dau ConversationId, CreatedAt.
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic1
          ON ic1.object_id = i.object_id AND ic1.index_id = i.index_id AND ic1.key_ordinal = 1
        INNER JOIN sys.columns c1
          ON c1.object_id = ic1.object_id AND c1.column_id = ic1.column_id
        INNER JOIN sys.index_columns ic2
          ON ic2.object_id = i.object_id AND ic2.index_id = i.index_id AND ic2.key_ordinal = 2
        INNER JOIN sys.columns c2
          ON c2.object_id = ic2.object_id AND c2.column_id = ic2.column_id
        WHERE i.object_id = OBJECT_ID('dbo.Messages')
          AND c1.name = 'ConversationId'
          AND c2.name = 'CreatedAt'
      )
      CREATE INDEX IX_Messages_Conversation_CreatedAt
        ON dbo.Messages (ConversationId, CreatedAt);
    `);

    // PK hiện tại có thứ tự MessageId, UserId. Index này phục vụ unread count theo user.
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_MessageReadBy_UserId_MessageId'
          AND object_id = OBJECT_ID('dbo.MessageReadBy')
      )
      CREATE INDEX IX_MessageReadBy_UserId_MessageId
        ON dbo.MessageReadBy (UserId, MessageId);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes: Array<[string, string]> = [
      ['dbo.Contracts', 'IX_Contracts_Farmer_CreatedAt'],
      ['dbo.Contracts', 'IX_Contracts_Enterprise_CreatedAt'],
      ['dbo.Escrows', 'IX_Escrows_Farmer_Status_CreatedAt'],
      ['dbo.Escrows', 'IX_Escrows_Enterprise_Status_CreatedAt'],
      ['dbo.Products', 'IX_Products_CreatedBy_IsActive_CreatedAt'],
      ['dbo.Products', 'IX_Products_IsActive_CreatedAt'],
      ['dbo.Products', 'IX_Products_IsActive_Category_CreatedAt'],
      ['dbo.Products', 'IX_Products_IsActive_Region_CreatedAt'],
      ['dbo.Disputes', 'IX_Disputes_RaisedBy_Status_CreatedAt'],
      ['dbo.Disputes', 'IX_Disputes_Against_Status_CreatedAt'],
      ['dbo.ConversationParticipants', 'IX_ConversationParticipants_UserId_ConversationId'],
      ['dbo.Conversations', 'IX_Conversations_LastMessageAt_CreatedAt'],
      ['dbo.Messages', 'IX_Messages_Conversation_CreatedAt'],
      ['dbo.MessageReadBy', 'IX_MessageReadBy_UserId_MessageId'],
    ];

    for (const [table, index] of indexes) {
      await queryRunner.query(`
        IF EXISTS (
          SELECT 1 FROM sys.indexes
          WHERE name = '${index}'
            AND object_id = OBJECT_ID('${table}')
        )
        DROP INDEX ${index} ON ${table};
      `);
    }
  }
}
