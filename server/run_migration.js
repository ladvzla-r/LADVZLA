import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const conn = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ladvzla';
    console.log('Using connection:', conn);
    const pool = new Pool({ connectionString: conn });
    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sqlPath = path.resolve(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log('Applying migration...', sqlPath);
      await pool.query(sql);
    }

    const seedsDir = path.resolve(__dirname, '../db/seeds');
    if (fs.existsSync(seedsDir)) {
      const seedFiles = fs.readdirSync(seedsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();
      for (const file of seedFiles) {
        const sqlPath = path.resolve(seedsDir, file);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Applying seed...', sqlPath);
        await pool.query(sql);
      }
    }

    console.log('All migrations and seeds applied successfully');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
})();

