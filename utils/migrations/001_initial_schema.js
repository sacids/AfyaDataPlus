export default {
  id: "001_initial_schema",
  description: "Create all initial tables, indexes and triggers",

  up: [
    // ---------- core tables ----------
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY NOT NULL,
      project TEXT NOT NULL UNIQUE,
      created_by TEXT,
      tags TEXT,
      icon TEXT,
      instance_url TEXT,
      instance_name TEXT,
      country TEXT,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT NULL,
      project_image TEXT NULL,
      project_image_local TEXT NULL,
      project_color TEXT NULL,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS form_defn (
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
      form_role TEXT DEFAULT 'ROOT',
      form_actions TEXT,
      form_category TEXT,
      form_defn TEXT,
      description TEXT,
      short_description TEXT,
      compulsory TEXT,
      children TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );`,

    `CREATE TABLE IF NOT EXISTS form_data (
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
      form_role TEXT DEFAULT 'ROOT',
      form_data TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      created_on TEXT DEFAULT CURRENT_TIMESTAMP,
      seen_by TEXT,
      status TEXT NOT NULL CHECK(status IN ('sent', 'draft', 'finalized')),
      status_date TEXT,
      synced INTEGER DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id TEXT UNIQUE,
      local_id TEXT UNIQUE,
      formDataUUID TEXT NOT NULL,
      conversation_id TEXT,
      text TEXT NOT NULL,
      sender_id TEXT,
      sender_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending'
    );`,

    `CREATE TABLE IF NOT EXISTS last_sync (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      project_id TEXT NOT NULL UNIQUE,
      table_name TEXT NOT NULL,
      last_sync_timestamp TEXT NOT NULL,
      last_sync_version TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS tb_form_data_workflow (
      id TEXT PRIMARY KEY,
      form_data_uuid TEXT UNIQUE NOT NULL,
      project_id TEXT NOT NULL,
      workflow_definition_code TEXT,
      workflow_state TEXT NOT NULL,
      assigned_group TEXT,
      assigned_to TEXT,
      last_action TEXT,
      is_locked INTEGER DEFAULT 0,
      is_closed INTEGER DEFAULT 0,
      escalation_level INTEGER DEFAULT 0,
      reopened_count INTEGER DEFAULT 0,
      due_at TEXT,
      metadata TEXT,
      sync_status INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS tb_workflow_action_logs (
      id TEXT PRIMARY KEY,
      form_data_uuid TEXT NOT NULL,
      project_id TEXT NOT NULL,
      workflow_definition_code TEXT,
      transition_action TEXT,
      from_state TEXT,
      to_state TEXT,
      action_by TEXT,
      comment TEXT,
      transition_form_uuid TEXT,
      metadata TEXT,
      sync_status INTEGER DEFAULT 0,
      created_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS tb_disease_knowledge (
      id TEXT PRIMARY KEY,
      knowledge_id TEXT UNIQUE NOT NULL,
      project_id TEXT,
      name TEXT,
      description TEXT,
      image TEXT,
      created_at TEXT,
      updated_at TEXT,
      created_by TEXT,
      updated_by TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS form_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reaction_id INTEGER UNIQUE,
      form TEXT,
      priority INTEGER,
      condition TEXT,
      actions_json TEXT
    );`,

    // ---------- indexes ----------
    `CREATE INDEX IF NOT EXISTS idx_form_data_parent_uuid
     ON form_data(parent_uuid) WHERE parent_uuid IS NOT NULL;`,

    `CREATE INDEX IF NOT EXISTS idx_form_data_uuid
     ON form_data(uuid);`,

    `CREATE INDEX IF NOT EXISTS idx_form_data_deleted
     ON form_data(deleted) WHERE deleted = 0;`,

    `CREATE INDEX IF NOT EXISTS idx_form_data_seen_by
     ON form_data(seen_by) WHERE seen_by IS NOT NULL;`,

    // ---------- soft-delete cascade trigger ----------
    `CREATE TRIGGER IF NOT EXISTS soft_delete_form_data_cascade
     AFTER UPDATE OF deleted ON form_data
     FOR EACH ROW
     WHEN NEW.deleted = 1 AND OLD.deleted = 0
     BEGIN
       UPDATE form_data
       SET deleted = 1
       WHERE parent_uuid = OLD.uuid AND deleted = 0;
     END;`
  ],

  // Reverse order is important
  down: [
    `DROP TRIGGER IF EXISTS soft_delete_form_data_cascade;`,

    `DROP INDEX IF EXISTS idx_form_data_seen_by;`,
    `DROP INDEX IF EXISTS idx_form_data_deleted;`,
    `DROP INDEX IF EXISTS idx_form_data_uuid;`,
    `DROP INDEX IF EXISTS idx_form_data_parent_uuid;`,

    `DROP TABLE IF EXISTS form_reactions;`,
    `DROP TABLE IF EXISTS tb_disease_knowledge;`,
    `DROP TABLE IF EXISTS tb_workflow_action_logs;`,
    `DROP TABLE IF EXISTS tb_form_data_workflow;`,
    `DROP TABLE IF EXISTS last_sync;`,
    `DROP TABLE IF EXISTS messages;`,
    `DROP TABLE IF EXISTS form_data;`,
    `DROP TABLE IF EXISTS form_defn;`,
    `DROP TABLE IF EXISTS projects;`
  ]
};