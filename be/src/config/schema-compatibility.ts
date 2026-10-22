import { DataSource } from "typeorm";
import { createLogger } from "../utils/logger";

const logger = createLogger("SchemaCheck");

interface SchemaRequirement {
    table: string;
    columns: string[];
}


/**
 * Những table/column bắt buộc để hệ thống PreOnic chạy ổn định.
 *
 * Lưu ý:
 * - Đây không thay thế migration.
 * - Đây chỉ là lớp bảo vệ khi startup.
 */
const REQUIRED_SCHEMA: SchemaRequirement[] = [

    {
        table: "Users",
        columns: [
            "UserId",
            "Email",
            "Role",
            "AuthProvider",
            "IsActive",
            "ReputationScore",
            "TotalRatings",
        ],
    },


    {
        table: "Products",
        columns: [
            "ProductId",
            "CreatedBy",
            "Name",
            "PriceMin",
            "TotalQuantity",
            "Remaining",
            "PriceUnit",
            "PlantDate",
            "CoverageRate",
        ],
    },


    {
        table: "Contracts",
        columns: [
            "ContractId",
            "FarmerId",
            "EnterpriseId",
            "ProductId",
            "Status",
            "FirstPaymentPercentage",
            "PaymentFlow",
            "PaidAmount",
            "RemainingAmount",
            "DeliveryStatus",
        ],
    },


    {
        table: "DirectGoodsPayments",
        columns: [
            "GoodsPaymentId",
            "ContractId",
            "PayerUserId",
            "PayeeUserId",
            "BankAccountId",
            "Amount",
            "Status",
            "TransferContent",
            "ConfirmationMethod",
            "ConfirmedAt",
            "ConfirmedBy",
            "ProviderTransactionId",
            "ProviderPayloadHash",
        ],
    },

    {
        table: "FulfillmentOrders",
        columns: [
            "OrderId",
            "ContractId",
            "Stage",
            "Carrier",
            "TrackingCode",
            "LoadingPhotoUrl",
            "EnterpriseReceivedAt",
        ],
    },

    {
        table: "CropProgressReports",
        columns: ["ReportId", "OrderId", "Status", "ImageUrls", "DueAt", "SubmittedAt"],
    },

    {
        table: "ShipmentTrackingEvents",
        columns: ["TrackingEventId", "OrderId", "ProviderEventId", "Status", "OccurredAt"],
    },

    {
        table: "UserSettlementBankAccounts",
        columns: [
            "BankAccountId",
            "UserId",
            "BankCode",
            "AccountNumberCiphertext",
            "AccountNumberIv",
            "AccountNumberAuthTag",
            "EncryptionKeyVersion",
            "AccountNumberFingerprint",
            "IsDefault",
            "Status",
            "VerificationStatus",
            "AdminReviewedBy",
            "AdminReviewedAt",
            "AdminReviewNote",
            "VerifiedAccountHolder",
            "VerificationProvider",
            "VerificationReference",
            "VerifiedAt",
        ],
    },

    {
        table: "PlatformFeePolicies",
        columns: [
            "FeePolicyId",
            "BuyerFeeBps",
            "SellerFeeBps",
            "IsActive",
            "EffectiveFrom",
            "EffectiveTo",
        ],
    },

    {
        table: "ContractFeeTerms",
        columns: [
            "ContractFeeTermsId",
            "ContractId",
            "FeePolicyId",
            "BuyerFeeBps",
            "SellerFeeBps",
        ],
    },

    {
        table: "PlatformFeeAccounts",
        columns: [
            "FeeAccountId",
            "UserId",
            "OutstandingAmount",
            "OverdueAmount",
            "Status",
        ],
    },

    {
        table: "PlatformFeeStatements",
        columns: [
            "FeeStatementId",
            "UserId",
            "AmountDueSnapshot",
            "AmountPaid",
            "Status",
        ],
    },

    {
        table: "PlatformFeeLedgerEntries",
        columns: ["FeeLedgerEntryId", "UserId", "Direction", "Amount", "Status"],
    },

    {
        table: "PlatformFeePayments",
        columns: [
            "FeePaymentId",
            "UserId",
            "Amount",
            "Provider",
            "ProviderPaymentId",
            "Status",
            "TransferContent",
        ],
    },

    {
        table: "PlatformFeePaymentEvents",
        columns: [
            "FeePaymentEventId",
            "FeePaymentId",
            "Provider",
            "ProviderEventId",
            "PayloadHash",
        ],
    },

    {
        table: "PlatformFeePaymentApplications",
        columns: [
            "FeePaymentApplicationId",
            "FeePaymentId",
            "FeeLedgerEntryId",
            "Amount",
        ],
    },


    {
        table: "SystemLogs",
        columns: [
            "LogId",
            "Category",
            "Action",
            "Level",
            "Message",
            "CreatedAt",
        ],
    },

];



/**
 * Validate database schema before application starts.
 */
export async function validateDatabaseSchema(
    dataSource: DataSource
): Promise<void> {


    logger.info(
        "[SchemaCheck] Starting database schema validation..."
    );


    const queryRunner =
        dataSource.createQueryRunner();


    try {


        const missingTables: string[] = [];

        const missingColumns: string[] = [];



        for (const requirement of REQUIRED_SCHEMA) {


            /**
             * Check table exists
             */
            const tableResult =
                await queryRunner.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_NAME = @0
                    `,
                    [
                        requirement.table
                    ]
                );



            if (
                Number(tableResult[0].count) === 0
            ) {

                missingTables.push(
                    requirement.table
                );

                continue;
            }



            /**
             * Get existing columns
             */
            const columnResult =
                await queryRunner.query(
                    `
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = @0
                    `,
                    [
                        requirement.table
                    ]
                );



            const existingColumns =
                columnResult.map(
                    (item: {
                        COLUMN_NAME:string
                    }) =>
                        item.COLUMN_NAME
                );



            /**
             * Compare columns
             */
            for (
                const requiredColumn of requirement.columns
            ) {


                if (
                    !existingColumns.includes(
                        requiredColumn
                    )
                ) {

                    missingColumns.push(
                        `${requirement.table}.${requiredColumn}`
                    );

                }

            }


        }



        /**
         * Throw if mismatch
         */
        if (
            missingTables.length > 0
            ||
            missingColumns.length > 0
        ) {


            logger.error(
                "[SchemaCheck] Database schema mismatch"
            );


            if (
                missingTables.length > 0
            ) {

                logger.error(
                    `Missing tables: ${
                        missingTables.join(", ")
                    }`
                );

            }



            if (
                missingColumns.length > 0
            ) {

                logger.error(
                    `Missing columns: ${
                        missingColumns.join(", ")
                    }`
                );

            }


            throw new Error(
                "DATABASE_SCHEMA_MISMATCH"
            );

        }



        logger.info(
            "[SchemaCheck] Database schema OK"
        );


    }
    catch(error) {


        logger.error(
            "[SchemaCheck] Validation failed"
        );


        throw error;


    }
    finally {


        await queryRunner.release();


    }

}
