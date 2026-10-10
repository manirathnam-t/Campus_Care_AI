
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "campuscare",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );

    console.log("PostgreSQL connected successfully!");
    console.log("Database:", result.rows[0].database);
    console.log("Server time:", result.rows[0].server_time);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
