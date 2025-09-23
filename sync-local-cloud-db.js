const mysql = require('mysql2/promise');
require('dotenv').config();

const localConfig = {
    host: 'localhost',
    user: 'root',
    password: 'sushanth2126',
    database: 'milk',
};

const cloudConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
};

async function getTables(connection) {
    const [rows] = await connection.execute('SHOW TABLES');
    return rows.map(row => Object.values(row)[0]);
}

async function getTableColumns(connection, table) {
    const [rows] = await connection.execute(`DESCRIBE \`${table}\``);
    return rows.map(row => ({ field: row.Field, type: row.Type }));
}

async function getRowCount(connection, table) {
    const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
    return rows[0].count;
}

function compareColumns(localCols, cloudCols) {
    const localFields = localCols.map(c => c.field);
    const cloudFields = cloudCols.map(c => c.field);

    const missingInCloud = localFields.filter(f => !cloudFields.includes(f));
    const missingInLocal = cloudFields.filter(f => !localFields.includes(f));

    return { missingInCloud, missingInLocal };
}

async function main() {
    let localConn, cloudConn;
    try {
        localConn = await mysql.createConnection(localConfig);
        cloudConn = await mysql.createConnection(cloudConfig);

        console.log('Connected to both local and cloud databases.');

        const localTables = await getTables(localConn);
        const cloudTables = await getTables(cloudConn);

        console.log('\nTables in local DB:', localTables);
        console.log('Tables in cloud DB:', cloudTables);

        // Tables missing in cloud
        const tablesMissingInCloud = localTables.filter(t => !cloudTables.includes(t));
        // Tables missing in local
        const tablesMissingInLocal = cloudTables.filter(t => !localTables.includes(t));

        console.log('\nTables missing in cloud DB:', tablesMissingInCloud);
        console.log('Tables missing in local DB:', tablesMissingInLocal);

        // Compare columns and row counts for common tables
        const commonTables = localTables.filter(t => cloudTables.includes(t));

        for (const table of commonTables) {
            console.log(`\nComparing table: ${table}`);

            const localCols = await getTableColumns(localConn, table);
            const cloudCols = await getTableColumns(cloudConn, table);

            const { missingInCloud, missingInLocal } = compareColumns(localCols, cloudCols);

            if (missingInCloud.length === 0 && missingInLocal.length === 0) {
                console.log('  Columns match.');
            } else {
                if (missingInCloud.length > 0) {
                    console.log('  Columns missing in cloud DB:', missingInCloud);
                }
                if (missingInLocal.length > 0) {
                    console.log('  Columns missing in local DB:', missingInLocal);
                }
            }

            const localCount = await getRowCount(localConn, table);
            const cloudCount = await getRowCount(cloudConn, table);

            console.log(`  Row count - Local: ${localCount}, Cloud: ${cloudCount}`);

            if (localCount !== cloudCount) {
                console.log('  Row count mismatch detected.');
            } else {
                console.log('  Row counts match.');
            }
        }

        console.log('\nComparison complete.');

    } catch (error) {
        console.error('Error during comparison:', error.message);
    } finally {
        if (localConn) await localConn.end();
        if (cloudConn) await cloudConn.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
