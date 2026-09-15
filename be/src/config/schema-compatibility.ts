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
            "VirtualBalance",
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
            "Price",
            "Quantity",
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
            "EscrowStatus",
            "PaidAmount",
            "RemainingAmount",
            "DeliveryStatus",
        ],
    },


    {
        table: "PaymentTransactions",
        columns: [
            "TransactionId",
            "Type",
            "Status",
            "PaymentMethod",
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