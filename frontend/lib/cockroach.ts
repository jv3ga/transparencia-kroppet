import { Pool } from "pg";

// CockroachDB Serverless — shared pool para reutilizar conexiones entre requests
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
});

export default pool;
