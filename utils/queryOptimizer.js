const pool = require("../db");

class QueryOptimizer {
    constructor() {
        this.queryCache = new Map();
    }

    // --- Existing functions (unchanged) ---
    static optimizeUserProfileQuery() { /* your query here */ }
    static optimizeSubscriptionQuery() { /* your query here */ }
    static optimizeDashboardQuery() { /* your query here */ }
    static paginateQuery(baseQuery, page = 1, limit = 20) { /* unchanged */ }
    static getIndexSuggestions() { /* unchanged */ }
    static getPoolConfig() { /* unchanged */ }
    static async executeWithTimeout(connection, query, params, timeout = 5000) { /* unchanged */ }

    // --- NEW FUNCTION: Apply all index optimizations ---
    static async optimizeAll() {
        const connection = await pool.getConnection();
        try {
            const indexQueries = this.getIndexSuggestions();
            for (const sql of indexQueries) {
                try {
                    await connection.query(sql);
                    console.log(`✅ Applied optimization: ${sql}`);
                } catch (err) {
                    if (err.code === "ER_DUP_KEYNAME") {
                        console.log(`ℹ️ Index already exists: ${sql}`);
                    } else {
                        console.warn(`⚠️ Failed to apply optimization: ${sql}`, err.message);
                    }
                }
            }
            console.log("🚀 Query optimizations completed.");
        } catch (error) {
            console.error("❌ Optimization failed:", error.message);
        } finally {
            connection.release();
        }
    }
}

module.exports = QueryOptimizer;
