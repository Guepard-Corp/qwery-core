import Database from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

export function createDatabase(dbPath?: string): Database.Database {
  const defaultPath = dbPath || join(process.cwd(), 'qwery.db');

  // Ensure directory exists
  const dir = dirname(defaultPath);
  mkdirSync(dir, { recursive: true });

  const db = new Database(defaultPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  return db;
}

export function initializeSchema(db: Database.Database): void {
  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      description TEXT,
      status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
    CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
  `);

  // Organizations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // Datasources table
  db.exec(`
    CREATE TABLE IF NOT EXISTS datasources (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      project_id TEXT NOT NULL,
      datasource_provider TEXT NOT NULL,
      datasource_driver TEXT NOT NULL,
      datasource_kind TEXT NOT NULL,
      datasource_config TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_datasources_project_id ON datasources(project_id);
    CREATE INDEX IF NOT EXISTS idx_datasources_slug ON datasources(slug);
  `);

  // Notebooks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      project_id TEXT NOT NULL,
      datasources TEXT NOT NULL,
      cells TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_notebooks_project_id ON notebooks(project_id);
    CREATE INDEX IF NOT EXISTS idx_notebooks_slug ON notebooks(slug);
  `);

  // Notebook versions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notebook_versions (
      version_id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      data TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_notebook_versions_notebook_id ON notebook_versions(notebook_id);
    CREATE INDEX IF NOT EXISTS idx_notebook_versions_version ON notebook_versions(version);
  `);

  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      project_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      datasources TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_task_id ON conversations(task_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_slug ON conversations(slug);
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      content TEXT NOT NULL,
      role TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  `);

  // Usage table (time series data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      reasoning_tokens INTEGER NOT NULL DEFAULT 0,
      cached_input_tokens INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      context_size INTEGER NOT NULL DEFAULT 0,
      credits_cap INTEGER NOT NULL DEFAULT 0,
      credits_used INTEGER NOT NULL DEFAULT 0,
      cpu REAL NOT NULL DEFAULT 0,
      memory REAL NOT NULL DEFAULT 0,
      network REAL NOT NULL DEFAULT 0,
      gpu REAL NOT NULL DEFAULT 0,
      storage REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_usage_conversation_id ON usage(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_usage_id ON usage(id);
    CREATE INDEX IF NOT EXISTS idx_usage_project_id ON usage(project_id);
    CREATE INDEX IF NOT EXISTS idx_usage_organization_id ON usage(organization_id);
    CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);
  `);

  // Todo table (one row per conversation, JSON array of todo items)
  db.exec(`
    CREATE TABLE IF NOT EXISTS todo (
      conversation_id TEXT PRIMARY KEY,
      todos_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_todo_conversation_id ON todo(conversation_id);
  `);

  // Migration: add cost column if missing (existing DBs created before cost was added)
  try {
    db.exec('ALTER TABLE usage ADD COLUMN cost REAL NOT NULL DEFAULT 0');
  } catch {
    // Column already exists
  }
}
