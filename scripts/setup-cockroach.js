#!/usr/bin/env node
// Aplica el schema en CockroachDB
// Uso: node scripts/setup-cockroach.js

// Leer DATABASE_URL del .env.local manualmente
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../frontend/.env.local");
fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
});

const { Pool } = require(path.join(__dirname, "../frontend/node_modules/pg"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "cockroach-schema.sql"), "utf8");
  // Separar por ; y ejecutar cada statement
  // Eliminar líneas de comentario antes de parsear
  const cleaned = sql.split("\n").filter(l => !l.trim().startsWith("--")).join("\n");
  const statements = cleaned
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const client = await pool.connect();
  try {
    for (const stmt of statements) {
      process.stdout.write(`Ejecutando: ${stmt.slice(0, 60).replace(/\n/g, " ")}... `);
      await client.query(stmt);
      console.log("✓");
    }
    console.log("\n✅ Schema creado correctamente en CockroachDB");
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
