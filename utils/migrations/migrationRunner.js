import { db } from "../database";
import { migrations } from "./index";

export const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_id TEXT NOT NULL UNIQUE,
    description TEXT,
    executed_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Run all pending migrations (forward).
 */
export async function runMigrations() {
  await db.execAsync(MIGRATIONS_TABLE_SQL);

  const rows = await db.getAllAsync(`SELECT migration_id FROM migrations`);
  const executed = new Set(rows.map((r) => r.migration_id));

  for (const migration of migrations) {
    if (executed.has(migration.id)) continue;

    console.log(`Running migration ${migration.id}`);

    await db.execAsync("BEGIN TRANSACTION");

    try {
      for (const sql of migration.up) {
        await db.execAsync(sql);
      }

      await db.runAsync(
        `INSERT INTO migrations (migration_id, description) VALUES (?, ?)`,
        [migration.id, migration.description]
      );

      await db.execAsync("COMMIT");
      console.log(`✓ Migration ${migration.id} applied`);
    } catch (e) {
      await db.execAsync("ROLLBACK");
      console.error(`Migration ${migration.id} failed`, e);
      throw e;
    }
  }
}

/**
 * Rollback the last N migrations (default = 1).
 * @param {number} steps  How many migrations to undo
 */
export async function rollbackMigrations(steps = 1) {
  if (steps < 1) return;

  await db.execAsync(MIGRATIONS_TABLE_SQL);

  // Get applied migrations in reverse chronological order
  const applied = await db.getAllAsync(
    `SELECT migration_id FROM migrations ORDER BY id DESC`
  );

  const toRollback = applied.slice(0, steps);

  if (toRollback.length === 0) {
    console.log("No migrations to rollback");
    return;
  }

  // Build a lookup from id → migration object
  const migrationMap = new Map(migrations.map((m) => [m.id, m]));

  for (const row of toRollback) {
    const migration = migrationMap.get(row.migration_id);

    if (!migration) {
      throw new Error(
        `Migration ${row.migration_id} is recorded but missing from code`
      );
    }

    if (!migration.down || migration.down.length === 0) {
      throw new Error(
        `Migration ${migration.id} has no down() implementation – cannot rollback`
      );
    }

    console.log(`Rolling back migration ${migration.id}`);

    await db.execAsync("BEGIN TRANSACTION");

    try {
      // Run down statements in the order provided
      for (const sql of migration.down) {
        await db.execAsync(sql);
      }

      // Remove the record so it can be re-applied later
      await db.runAsync(
        `DELETE FROM migrations WHERE migration_id = ?`,
        [migration.id]
      );

      await db.execAsync("COMMIT");
      console.log(`✓ Migration ${migration.id} rolled back`);
    } catch (e) {
      await db.execAsync("ROLLBACK");
      console.error(`Rollback of ${migration.id} failed`, e);
      throw e;
    }
  }
}

/**
 * Rollback everything until (and including) the given migration id.
 * Example: rollbackTo("002_add_last_modified")
 */
export async function rollbackTo(targetMigrationId) {
  await db.execAsync(MIGRATIONS_TABLE_SQL);

  const applied = await db.getAllAsync(
    `SELECT migration_id FROM migrations ORDER BY id DESC`
  );

  const targetIndex = applied.findIndex(
    (r) => r.migration_id === targetMigrationId
  );

  if (targetIndex === -1) {
    console.log(`Migration ${targetMigrationId} is not applied – nothing to do`);
    return;
  }

  // +1 because we want to include the target itself
  await rollbackMigrations(targetIndex + 1);
}