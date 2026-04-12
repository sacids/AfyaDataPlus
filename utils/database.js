import * as SQLite from 'expo-sqlite';

// Open database connection
export const openDatabase = () => {
    return SQLite.openDatabaseSync('afyadataplus-v2.db');
};

const db = openDatabase();


const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS migration (
  table_name TEXT PRIMARY KEY, 
  version INTEGER DEFAULT 0
);`;

let PROJECT_SQL = `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY NOT NULL, 
    project TEXT NOT NULL UNIQUE,
    created_by TEXT,
    tags TEXT,
    icon TEXT,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NULL, 
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 0
  );`;

let FORM_DEFN_SQL = `CREATE TABLE IF NOT EXISTS form_defn (
  id INTEGER PRIMARY KEY NOT NULL,
  project TEXT NOT NULL,
  form_id TEXT NOT NULL UNIQUE,
  depends_on INTEGER DEFAULT 0,
  title TEXT NOT NULL, 
  version TEXT DEFAULT 0, 
  short_title TEXT, 
  code INTEGER,
  icon TEXT,
  form_type TEXT, 
  is_root INTEGER DEFAULT 1,
  form_actions TEXT, 
  form_category TEXT, 
  form_defn TEXT, 
  description TEXT,  
  short_description TEXT, 
  compulsory TEXT,
  children TEXT, 
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);`;

let FORM_DATA_SQL = `CREATE TABLE IF NOT EXISTS form_data (
  id INTEGER PRIMARY KEY NOT NULL,
  project TEXT NOT NULL,
  form TEXT NOT NULL, 
  title TEXT,
  uuid TEXT NOT NULL UNIQUE, 
  original_uuid TEXT,
  parent_uuid TEXT,
  gps TEXT,
  deleted INTEGER DEFAULT 0, 
  archived INTEGER DEFAULT 0, 
  form_data TEXT NOT NULL, 
  created_by INTEGER NOT NULL,
  created_by_name TEXT NOT NULL,  
  created_on TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL CHECK(status IN ('sent', 'draft', 'finalized')),
  status_date TEXT,
  synced INTEGER DEFAULT 0
);`;

// let MESSAGES_SQL = `CREATE TABLE IF NOT EXISTS messages (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         formDataUUID TEXT NOT NULL,
//         text TEXT NOT NULL,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         sender_id TEXT,
//         sender_name TEXT
//       );`;

let MESSAGES_SQL = `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remote_id TEXT UNIQUE, -- The UUID from Django
    local_id TEXT UNIQUE,
    formDataUUID TEXT NOT NULL,
    conversation_id TEXT, -- The Conversation UUID from Django
    text TEXT NOT NULL,
    sender_id TEXT,
    sender_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sync_status TEXT DEFAULT 'pending' -- 'pending', 'synced'
);`;

//MESSAGES_SQL = `DROP TABLE messages`

// SOFT DELETE CASCADE TRIGGER SQL
const SOFT_DELETE_CASCADE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS soft_delete_form_data_cascade
AFTER UPDATE OF deleted ON form_data
FOR EACH ROW
WHEN NEW.deleted = 1 AND OLD.deleted = 0
BEGIN
    -- Mark all children as deleted when parent is soft-deleted
    UPDATE form_data 
    SET deleted = 1 
    WHERE parent_uuid = OLD.uuid AND deleted = 0;
    
    -- Recursively handle grandchildren through subsequent trigger fires
END;
`;

// Optional: Index for better performance
const PARENT_UUID_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_form_data_parent_uuid 
ON form_data(parent_uuid) 
WHERE parent_uuid IS NOT NULL;
`;

const UUID_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_form_data_uuid 
ON form_data(uuid);
`;

const DELETED_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_form_data_deleted 
ON form_data(deleted) 
WHERE deleted = 0;
`;


const FORM_REACTIONS_SQL = `CREATE TABLE IF NOT EXISTS form_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reaction_id INTEGER UNIQUE,
    form TEXT,        
    priority INTEGER,
    condition TEXT,       
    actions_json TEXT     
);`;


// Create tables with soft delete cascade
export const createTables = async () => {
    try {
        await db.execAsync(MIGRATION_SQL);
        await db.execAsync(FORM_DEFN_SQL);
        await db.execAsync(FORM_DATA_SQL);
        await db.execAsync(MESSAGES_SQL);
        await db.execAsync(PROJECT_SQL);

        // New First Aid Tables
        await db.execAsync(FORM_REACTIONS_SQL);
        // Create soft delete cascade trigger
        await db.execAsync(SOFT_DELETE_CASCADE_TRIGGER_SQL);

        // Create indexes for better performance
        await db.execAsync(PARENT_UUID_INDEX_SQL);
        await db.execAsync(UUID_INDEX_SQL);
        await db.execAsync(DELETED_INDEX_SQL);

        // Enable foreign key support
        await db.execAsync('PRAGMA foreign_keys = ON;');

        //await initializeDummyData();
        //await migrateTables();
    } catch (e) {
        console.error('Failed to create tables:', e);
        throw e;
    }
};



// Soft Delete Functions
export const softDeleteFormData = async (uuid) => {
    try {
        const sql = `UPDATE form_data SET deleted = 1 WHERE uuid = ?`;
        const result = await db.runAsync(sql, [uuid]);

        // The trigger will automatically cascade the soft delete to children
        console.log(`Soft deleted form data with UUID: ${uuid}, affected rows: ${result.changes}`);
        return result.changes;
    } catch (error) {
        console.error('Error in softDeleteFormData:', error);
        throw error;
    }
};

// Soft delete with explicit cascade (alternative approach)
export const softDeleteFormDataCascade = async (uuid) => {
    try {
        // Start transaction for atomic operation
        await db.execAsync('BEGIN TRANSACTION;');

        // Recursive Common Table Expression (CTE) to get all children
        const deleteQuery = `
            WITH RECURSIVE children AS (
                SELECT uuid FROM form_data WHERE uuid = ?
                UNION ALL
                SELECT f.uuid FROM form_data f
                INNER JOIN children c ON f.parent_uuid = c.uuid
                WHERE f.deleted = 0
            )
            UPDATE form_data 
            SET deleted = 1 
            WHERE uuid IN (SELECT uuid FROM children);
        `;

        const result = await db.runAsync(deleteQuery, [uuid]);

        await db.execAsync('COMMIT;');

        console.log(`Soft deleted form data with UUID: ${uuid} and all children, affected rows: ${result.changes}`);
        return result.changes;
    } catch (error) {
        await db.execAsync('ROLLBACK;');
        console.error('Error in softDeleteFormDataCascade:', error);
        throw error;
    }
};

// Restore soft-deleted records (with optional cascade)
export const restoreFormData = async (uuid, cascade = false) => {
    try {
        if (cascade) {
            // Restore parent and all children
            const restoreQuery = `
                WITH RECURSIVE children AS (
                    SELECT uuid FROM form_data WHERE uuid = ?
                    UNION ALL
                    SELECT f.uuid FROM form_data f
                    INNER JOIN children c ON f.parent_uuid = c.uuid
                    WHERE f.deleted = 1
                )
                UPDATE form_data 
                SET deleted = 0 
                WHERE uuid IN (SELECT uuid FROM children);
            `;

            const result = await db.runAsync(restoreQuery, [uuid]);
            console.log(`Restored form data with UUID: ${uuid} and all children, affected rows: ${result.changes}`);
            return result.changes;
        } else {
            // Restore only the parent (children remain deleted)
            const sql = `UPDATE form_data SET deleted = 0 WHERE uuid = ?`;
            const result = await db.runAsync(sql, [uuid]);
            console.log(`Restored form data with UUID: ${uuid}, affected rows: ${result.changes}`);
            return result.changes;
        }
    } catch (error) {
        console.error('Error in restoreFormData:', error);
        throw error;
    }
};

// Get only non-deleted records (default behavior)
export const getActiveFormData = async (project_id, currentData_uuid = false) => {
    try {
        let query = '';
        let params = [0, project_id]; // deleted = 0

        if (currentData_uuid) {
            params = [...params, currentData_uuid];
            query = `SELECT fd.*, fdef.title AS form_title 
                     FROM form_data fd 
                     JOIN form_defn fdef ON fd.form = CAST(fdef.form_id AS TEXT) 
                     WHERE fd.deleted = ?
                     AND fd.project = ?
                     AND parent_uuid = ?`;
        } else {
            query = `SELECT fd.*, fdef.title AS form_title 
                     FROM form_data fd 
                     JOIN form_defn fdef ON fd.form = CAST(fdef.form_id AS TEXT) 
                     WHERE fd.deleted = ?
                     AND fd.project = ?
                     AND fdef.is_root = 1`;
        }

        const result = await db.getAllAsync(query, params);
        return result;
    } catch (error) {
        console.error('Error getting active form data:', error);
        return [];
    }
};

// Get all records including deleted ones
export const getAllFormData = async (project_id, currentData_uuid = false) => {
    try {
        let query = '';
        let params = [project_id];

        if (currentData_uuid) {
            params = [...params, currentData_uuid];
            query = `SELECT fd.*, fdef.title AS form_title 
                     FROM form_data fd 
                     JOIN form_defn fdef ON fd.form = CAST(fdef.form_id AS TEXT) 
                     WHERE fd.project = ?
                     AND deleted = 0
                     AND parent_uuid = ?`;
        } else {
            query = `SELECT fd.*, fdef.title AS form_title 
                     FROM form_data fd 
                     JOIN form_defn fdef ON fd.form = CAST(fdef.form_id AS TEXT) 
                     WHERE fd.project = ?
                     AND deleted = 0
                     AND fdef.is_root = 1`;
        }

        const result = await db.getAllAsync(query, params);
        return result;
    } catch (error) {
        console.error('Error getting all form data:', error);
        return [];
    }
};

// Get deleted records only
export const getDeletedFormData = async (project_id) => {
    try {
        const query = `SELECT fd.*, fdef.title AS form_title 
                       FROM form_data fd 
                       JOIN form_defn fdef ON fd.form = CAST(fdef.form_id AS TEXT) 
                       WHERE fd.deleted = 1
                       AND fd.project = ?`;

        const result = await db.getAllAsync(query, [project_id]);
        return result;
    } catch (error) {
        console.error('Error getting deleted form data:', error);
        return [];
    }
};

// Permanently delete (hard delete) soft-deleted records
export const purgeDeletedFormData = async (uuid = null) => {
    try {
        await db.execAsync('BEGIN TRANSACTION;');

        let result;
        if (uuid) {
            // Delete a specific record and its soft-deleted children
            const purgeQuery = `
                WITH RECURSIVE children AS (
                    SELECT uuid FROM form_data WHERE uuid = ? AND deleted = 1
                    UNION ALL
                    SELECT f.uuid FROM form_data f
                    INNER JOIN children c ON f.parent_uuid = c.uuid
                    WHERE f.deleted = 1
                )
                DELETE FROM form_data 
                WHERE uuid IN (SELECT uuid FROM children);
            `;

            result = await db.runAsync(purgeQuery, [uuid]);
        } else {
            // Delete all soft-deleted records
            const sql = `DELETE FROM form_data WHERE deleted = 1`;
            result = await db.runAsync(sql);
        }

        await db.execAsync('COMMIT;');

        console.log(`Purged deleted form data, affected rows: ${result.changes}`);
        return result.changes;
    } catch (error) {
        await db.execAsync('ROLLBACK;');
        console.error('Error in purgeDeletedFormData:', error);
        throw error;
    }
};

// Get child records (including/excluding deleted)
export const getChildren = async (parent_uuid, includeDeleted = false) => {
    try {
        let query = '';
        let params = [parent_uuid];

        if (!includeDeleted) {
            query = `SELECT * FROM form_data WHERE parent_uuid = ? AND deleted = 0`;
        } else {
            query = `SELECT * FROM form_data WHERE parent_uuid = ?`;
        }

        const result = await db.getAllAsync(query, params);
        return result;
    } catch (error) {
        console.error('Error getting children:', error);
        return [];
    }
};

// Get all descendants (nested children) of a record
export const getDescendants = async (parent_uuid, includeDeleted = false) => {
    try {
        let whereClause = '';
        if (!includeDeleted) {
            whereClause = 'AND deleted = 0';
        }

        const query = `
            WITH RECURSIVE descendants AS (
                SELECT uuid, parent_uuid, deleted, 1 as level 
                FROM form_data 
                WHERE parent_uuid = ?
                ${whereClause}
                UNION ALL
                SELECT f.uuid, f.parent_uuid, f.deleted, d.level + 1 as level
                FROM form_data f
                INNER JOIN descendants d ON f.parent_uuid = d.uuid
                ${whereClause}
            )
            SELECT d.*, fd.* FROM descendants d
            JOIN form_data fd ON d.uuid = fd.uuid
            ORDER BY level;
        `;

        const result = await db.getAllAsync(query, [parent_uuid]);
        return result;
    } catch (error) {
        console.error('Error getting descendants:', error);
        return [];
    }
};

// Helper function to check if a record has children
export const hasChildren = async (uuid, includeDeleted = false) => {
    try {
        let query = '';
        let params = [uuid];

        if (!includeDeleted) {
            query = `SELECT COUNT(*) as count FROM form_data WHERE parent_uuid = ? AND deleted = 0`;
        } else {
            query = `SELECT COUNT(*) as count FROM form_data WHERE parent_uuid = ?`;
        }

        const result = await db.getFirstAsync(query, params);
        return result && result.count > 0;
    } catch (error) {
        console.error('Error checking children:', error);
        return false;
    }
};


// Update your existing select function to exclude deleted by default
export const select = async (tableName, whereClause = '', whereArgs = [], fields = '*', order_by = false, includeDeleted = false) => {
    try {
        let finalWhereClause = whereClause;
        let finalWhereArgs = whereArgs;

        // Automatically exclude deleted records unless explicitly requested
        if (tableName === 'form_data' && !includeDeleted && !whereClause.includes('deleted')) {
            finalWhereClause = whereClause
                ? `deleted = 0 AND ${whereClause}`
                : 'deleted = 0';
        }

        const sql = `SELECT ${fields} FROM ${tableName} ${finalWhereClause ? `WHERE ${finalWhereClause}` : ''} ${order_by ? `ORDER BY ${order_by}` : ''};`;
        //console.log(sql, finalWhereArgs)
        const result = await db.getAllAsync(sql, finalWhereArgs);
        return result;
    } catch (error) {
        console.error('Error selecting data:', error);
        return [];
    }
};



export const getFormData = async (user_id, project_id, currentData_uuid = false) => {
    try {
        let query = '';
        let params = [0, project_id, user_id];
        let result = [];
        if (currentData_uuid) {
            params = [...params, currentData_uuid]
            query = `SELECT fd.*, is_root, fdef.title AS form_title, fdef.icon 
                     FROM form_data fd 
                     JOIN form_defn fdef ON fd.form = CAST(fdef.form_id AS TEXT) 
                     WHERE fd.deleted = ?
                     AND fd.project = ?
                     AND fd.created_by = ?
                     AND parent_uuid = ?
                     ORDER BY id DESC`;
        } else {
            query = `SELECT fd.*, is_root, fdef.title AS form_title, fdef.icon 
                     FROM form_data fd 
                     JOIN form_defn fdef ON fd.form = CAST(fdef.form_id AS TEXT) 
                     WHERE fd.deleted = ?
                     AND fd.project = ?
                     AND fd.created_by = ?
                     AND fdef.is_root = 1
                     ORDER BY id DESC`;
            //console.log('query', query)
        }
        //console.log('query', query, params)
        result = await db.getAllAsync(query, params);
        //console.log('results', JSON.stringify(result, null, 5))
        return result;
    } catch (error) {
        console.error('Error getting form data:', error);
        return [];
    }
};



export const getFormDefns = async (project_id, codes = null) => {
    try {
        let query = '';
        let params = [1, project_id];
        let result = [];

        if (codes && Array.isArray(codes) && codes.length > 0) {
            // Create placeholders for the IN clause
            const placeholders = codes.map(() => '?').join(',');

            query = `SELECT *
                     FROM form_defn fdef
                     WHERE active = ? 
                     AND project = ?
                     AND fdef.code IN (${placeholders});`;

            // Combine all parameters
            params = params.concat(codes);
            //console.log('list form codes', params, test)

            result = await db.getAllAsync(query, params);
        } else {

            //let test = await select('form_defn', '', '', 'project, is_root, code, active')
            //console.log('form defn ', JSON.stringify(test, null, 2))
            query = `SELECT * 
                     FROM form_defn fdef 
                     WHERE active = ? 
                     AND project = ? AND is_root = 1;`;


            //console.log('q1', query, params)
            result = await db.getAllAsync(query, params);
        }

        //console.log('database get form defn', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Error getting form data:', error);
        return [];
    }
};
// Update a records
export const update = async (tableName, data, whereClause, whereArgs = []) => {
    try {
        const keys = Object.keys(data);
        const setClause = keys.map((key) => `${key} = ?`).join(', ');
        const values = [...keys.map((key) => data[key]), ...whereArgs];
        const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`;
        //console.log('Updating sql:', sql, values);
        const result = await db.runAsync(sql, values);
        return result.changes;
    } catch (error) {
        console.error('Error updating data:', error);
        return 0;
    }
};

// Remove records
export const remove = async (tableName, whereClause, whereArgs = []) => {
    try {
        const sql = `DELETE FROM ${tableName} ${whereClause ? `WHERE ${whereClause}` : ''};`;
        const result = await db.runAsync(sql, whereArgs);
        return result.changes;
    } catch (error) {
        console.error('Error deleting data:', error);
        return 0;
    }
};
// Update your existing deleteTableData to use soft delete for form_data
export const deleteTableData = async (tableName, whereClause, params = []) => {
    if (!tableName || !whereClause) {
        throw new Error('tableName and whereClause are required.');
    }

    // For form_data, use soft delete instead of hard delete
    if (tableName === 'form_data') {
        try {
            const sql = `UPDATE ${tableName} SET deleted = 1 WHERE ${whereClause}`;
            await db.runAsync(sql, params);
            console.log(`Soft deleted records from ${tableName} where ${whereClause}`);
        } catch (error) {
            console.error('Failed to soft delete data:', error);
            throw error;
        }
    } else {
        // For other tables, use hard delete
        const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
        try {
            await db.runAsync(sql, params);
        } catch (error) {
            console.error('Failed to delete data:', error);
            throw error;
        }
    }
};

// Insert a record
export const insert = async (tableName, data) => {

    //console.log('Inserting data:', tableName, JSON.stringify(data, null, 8));

    try {
        // Fetch local table column names
        //console.log('Inserting data:', tableName, data);
        const columnQuery = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
        const columns = columnQuery.map((col) => col.name);

        // Filter data keys
        const filteredData = {};
        const filteredKeys = [];

        Object.keys(data).forEach((key) => {
            let dbKey = key;

            if (key === 'id') {
                if (columns.includes('form_id')) {
                    dbKey = 'form_id';
                } if (columns.includes('reaction_id')) {
                    dbKey = 'reaction_id';
                } if (tableName === 'projects') {
                    dbKey = 'project';
                } else {
                    return;
                }
            }

            if (columns.includes(dbKey)) {
                filteredData[dbKey] = data[key];
                filteredKeys.push(dbKey);
            }
        });

        // Construct the INSERT statement
        if (filteredKeys.length === 0) {
            console.warn('No matching columns found. Data not inserted.');
            return null;
        }

        const placeholders = filteredKeys.map(() => '?').join(', ');
        const values = filteredKeys.map((key) => filteredData[key]);

        const sql = `INSERT OR REPLACE INTO ${tableName} (${filteredKeys.join(', ')}) VALUES (${placeholders});`;
        //console.log('sql')
        //console.log('Inserting sql:', sql, values);
        const result = await db.runAsync(sql, values);
        return result;
    } catch (error) {
        console.error('Error inserting data:', error);
        return null;
    }
};

export const insert_into_messages = async (message) => {
    // 1️⃣ Try updating existing local message
    if (message.local_id) {
        const updateSql = `
      UPDATE messages SET
        remote_id   = COALESCE(remote_id, ?),
        text        = ?,
        sender_id   = ?,
        sender_name = ?,
        created_at  = ?,
        sync_status = 'synced'
      WHERE local_id = ?;
    `;

        const updateParams = [
            message.remote_id || null,
            message.text,
            message.sender_id,
            message.sender_name,
            message.created_at,
            message.local_id,
        ];

        const updateResult = await db.runAsync(updateSql, updateParams);

        // If updated, we are done
        if (updateResult.rowsAffected > 0) {
            return updateResult;
        }
    }

    // 2️⃣ Fallback: insert or update by remote_id
    const insertSql = `
    INSERT INTO messages (
      remote_id,
      local_id,
      formDataUUID,
      conversation_id,
      text,
      sender_id,
      sender_name,
      created_at,
      sync_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(remote_id) DO UPDATE SET
      text = excluded.text,
      created_at = excluded.created_at,
      sync_status = 'synced';
  `;

    const insertParams = [
        message.remote_id || null,
        message.local_id || null,
        message.formDataUUID,
        message.conversation_id,
        message.text,
        message.sender_id,
        message.sender_name,
        message.created_at,
        message.sync_status || 'synced',
    ];

    return db.runAsync(insertSql, insertParams);
};

export const dropTables = async () => {
    const TABLES_TO_DROP = [
        'form_defn',
        'form_data',
        'projects',
        'messages',
        'migration',
        'form_reactions'
    ];

    try {
        // Disable foreign key enforcement
        await db.execAsync('PRAGMA foreign_keys = OFF;');

        // Drop triggers first (important)
        await db.execAsync('DROP TRIGGER IF EXISTS soft_delete_form_data_cascade;');

        // Drop tables
        for (const table of TABLES_TO_DROP) {
            await db.execAsync(`DROP TABLE IF EXISTS ${table};`);
        }

        // Re-enable foreign keys
        await db.execAsync('PRAGMA foreign_keys = ON;');

        console.log('All tables and triggers dropped');
    } catch (e) {
        console.error('Failed to drop tables:', e);
        throw e;
    }
};



// Drop tables - add trigger cleanup
export const dropTables1 = async () => {
    const FORM_DEFN_SQL = 'DROP TABLE IF EXISTS form_defn';
    const FORM_DATA_SQL = 'DROP TABLE IF EXISTS form_data';
    const MESSAGES_SQL = 'DROP TABLE IF EXISTS messages';
    const PROJECT_SQL = 'DROP TABLE IF EXISTS projects';
    const MIGRATION_SQL = 'DROP TABLE IF EXISTS migration';
    const DROP_TRIGGER_SQL = 'DROP TRIGGER IF EXISTS soft_delete_form_data_cascade';

    try {
        // Drop trigger first
        await db.execAsync(DROP_TRIGGER_SQL);

        // Then drop tables
        await db.execAsync(FORM_DEFN_SQL);
        await db.execAsync(FORM_DATA_SQL);
        await db.execAsync(PROJECT_SQL);
        await db.execAsync(MESSAGES_SQL);
        await db.execAsync(MIGRATION_SQL);

        console.log('Tables and trigger dropped');
    } catch (e) {
        console.error('Failed to drop tables:', e);
        throw e;
    }
};

// The rest of your existing functions remain the same (insert, update, remove, etc.)
// ... [Keep all your existing functions below unchanged] ...

// Example usage in your React Native component:
/*
import { 
  softDeleteFormData, 
  restoreFormData, 
  getActiveFormData,
  getDeletedFormData,
  purgeDeletedFormData 
} from './database';

// Soft delete a form and all its children
const handleDelete = async (uuid) => {
  try {
    await softDeleteFormData(uuid);
    // Refresh your UI
    const activeForms = await getActiveFormData(projectId);
    // Update state with activeForms
  } catch (error) {
    console.error('Delete failed:', error);
  }
};

// View deleted forms
const viewDeleted = async () => {
  const deletedForms = await getDeletedFormData(projectId);
  // Show in UI
};

// Restore a deleted form
const handleRestore = async (uuid) => {
  await restoreFormData(uuid, true); // true = restore with children
};

// Permanently delete all soft-deleted forms
const handlePurge = async () => {
  await purgeDeletedFormData();
};
*/