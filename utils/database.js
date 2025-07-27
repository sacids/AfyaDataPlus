import * as SQLite from 'expo-sqlite';
// Open database connection
export const openDatabase = () => {
    return SQLite.openDatabaseSync('afyadataplus-v1.db');
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
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NULL, 
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 0
  );`;



//PROJECT_SQL = `DROP TABLE IF EXISTS projects;`;

let FORM_DEFN_SQL = `CREATE TABLE IF NOT EXISTS form_defn (
  id INTEGER PRIMARY KEY NOT NULL,
  project TEXT NOT NULL,
  form_id TEXT NOT NULL UNIQUE,
  depends_on INTEGER DEFAULT 0,
  title TEXT NOT NULL, 
  version TEXT DEFAULT 0, 
  short_title TEXT, 
  code INTEGER, 
  form_type TEXT, 
  form_actions TEXT, 
  form_category TEXT, 
  form_defn TEXT, 
  description TEXT,  
  short_description TEXT, 
  compulsory TEXT,
  children TEXT, 
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 0
);`;

//FORM_DEFN_SQL = `DROP TABLE IF EXISTS form_defn;`;

let FORM_DATA_SQL = `CREATE TABLE IF NOT EXISTS form_data (
  id INTEGER PRIMARY KEY NOT NULL,
  project INTEGER NOT NULL DEFAULT 1,
  form TEXT NOT NULL, 
  title TEXT,
  uuid TEXT NOT NULL UNIQUE, 
  original_uuid TEXT,
  gps TEXT,
  deleted INTEGER DEFAULT 0, 
  archived INTEGER DEFAULT 0, 
  form_data TEXT NOT NULL, 
  created_by INTEGER NOT NULL,
  created_by_name TEXT NOT NULL,  
  created_on TEXT,
  status TEXT NOT NULL CHECK(status IN ('sent', 'draft', 'finalized')),
  status_date TEXT,
  synced INTEGER
);`;

//FORM_DATA_SQL = `DROP TABLE IF EXISTS form_data;`;

let MESSAGES_SQL = `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        formDataUUID TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sender_id TEXT,
        sender_name TEXT
      );`
//MESSAGES_SQL = `DROP TABLE IF EXISTS messages;`;

const TABLE_SQL = {
    'form_defn': FORM_DEFN_SQL,
    'form_data': FORM_DATA_SQL,
    'projects': PROJECT_SQL,
    'messages': MESSAGES_SQL,
};

const TABLE_VERSIONS = {
    'form_defn': 4,
    'form_data': 4,
    'projects': 6,
    'messages': 0,
};

// Create tables
export const createTables = async () => {
    try {
        await db.execAsync(MIGRATION_SQL);
        await db.execAsync(FORM_DEFN_SQL);
        await db.execAsync(FORM_DATA_SQL);
        await db.execAsync(MESSAGES_SQL);
        await db.execAsync(PROJECT_SQL);

        //await initializeDummyData();
        //await migrateTables();
    } catch (e) {
        console.error('Failed to create tables:', e);
        throw e;
    }

};

// Drop tables
export const dropTables = async () => {
    const FORM_DEFN_SQL = 'DROP TABLE form_defn';
    const FORM_DATA_SQL = 'DROP TABLE form_data';
    const MESSAGES_SQL = 'DROP TABLE messages';
    const PROJECT_SQL = 'DROP TABLE projects';
    const MIGRATION_SQL = 'DROP TABLE migration';

    try {
        await db.execAsync(FORM_DEFN_SQL);
        await db.execAsync(FORM_DATA_SQL);
        await db.execAsync(PROJECT_SQL);
        await db.execAsync(MESSAGES_SQL);
        await db.execAsync(MIGRATION_SQL);
        //console.log('Tables dropped');
    } catch (e) {
        console.error('Failed to drop tables:', e);
        throw e;
    }
};

// Get table versions
const getTableVersions = async () => {
    const sql = 'SELECT table_name, version FROM migration';
    return await db.getAllAsync(sql);
};

// Migrate tables
const migrateTables = async () => {
    const tableArray = await getTableVersions();
    const currentTableVersions = tableArray.reduce((acc, { table_name, version }) => {
        acc[table_name] = version;
        return acc;
    }, {});
    //console.log('Current table versions:', JSON.stringify(currentTableVersions, null, 1));

    for (let tableName in TABLE_VERSIONS) {
        const newVersion = TABLE_VERSIONS[tableName];
        //console.log('Migrating table:', tableName, newVersion);

        if (
            (tableName in currentTableVersions && newVersion > currentTableVersions[tableName]) ||
            !(tableName in currentTableVersions)
        ) {
            const tempTableName = `${tableName}_temp`;
            let newTableSQL = TABLE_SQL[tableName];

            // Get existing column names from the old table
            const columnQuery = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
            const oldColumns = columnQuery.map((col) => col.name).join(', ');

            // Create temporary table with the new schema
            await db.runAsync(`DROP TABLE IF EXISTS ${tempTableName};`);
            await db.runAsync(newTableSQL.replace(tableName, tempTableName));

            // Copy data from old table to new table
            if (oldColumns) {
                await db.runAsync(
                    `INSERT INTO ${tempTableName} (${oldColumns}) SELECT ${oldColumns} FROM ${tableName};`
                );
            }

            // Drop old table
            await db.runAsync(`DROP TABLE ${tableName};`);

            // Rename temp table to original name
            await db.runAsync(`ALTER TABLE ${tempTableName} RENAME TO ${tableName};`);

            // Update version in migrations table
            await db.runAsync(
                `INSERT INTO migration (table_name, version) VALUES (?, ?) 
         ON CONFLICT(table_name) DO UPDATE SET version = excluded.version;`,
                [tableName, newVersion]
            );

            console.log(`${tableName} migration complete.`);
        } else {
            await db.runAsync(
                `INSERT INTO migration (table_name, version) VALUES (?, ?) ON CONFLICT(table_name) DO NOTHING;`,
                [tableName, 0]
            );
        }
    }
};

// Delete table data
export const deleteTableData = async (tableName, whereClause, params = []) => {

    if (!tableName || !whereClause) {
        throw new Error('tableName and whereClause are required.');
    }

    const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;

    try {
        await db.runAsync(sql, params);
    } catch (error) {
        console.error('Failed to delete data:', error);
        throw error;
    }
};

// Insert a record
export const insert = async (tableName, data) => {

    //console.log('Inserting data:', tableName, data);

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
                } if (tableName == 'projects') {
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
        const result = await db.runAsync(sql, values);
        //console.log('Inserting sql:', sql, values, result);
        return result;
    } catch (error) {
        console.error('Error inserting data:', error);
        return null;
    }
};

// Select records
export const select = async (tableName, whereClause = '', whereArgs = []) => {
    try {
        const sql = `SELECT * FROM ${tableName} ${whereClause ? `WHERE ${whereClause}` : ''};`;
        //console.log('sql:', sql, whereArgs);
        const result = await db.getAllAsync(sql, whereArgs);
        //console.log('results:', result);
        return result;
    } catch (error) {
        console.error('Error selecting data:', error);
        return [];
    }
};

// Cached select
let queryCache = {};
export const cachedSelect = async (tbl, choice_filter) => {
    const cacheKey = `${tbl}_${choice_filter || ''}`;
    if (!queryCache[cacheKey]) {
        queryCache[cacheKey] = await select(tbl, choice_filter);
    }
    return queryCache[cacheKey];
};

export const getFormData = async (project_id) => {
    try {
        //console.log("Project ID type:", typeof project_id);
        let query = `SELECT fd.*, fdef.title AS form_title FROM form_data fd JOIN form_defn fdef ON fd.form = CAST(fdef.form_id AS TEXT) WHERE deleted = ? AND fd.project = ?;`
        //query = `SELECT * FROM form_data;`
        const result = await db.getAllAsync(query, [0, project_id]);
        //console.log('get form data', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Error getting form data:', error);
        return [];

    }
}

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