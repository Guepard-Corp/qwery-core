import type { TodoItem } from '@qwery/domain/entities';
import { ITodoRepository } from '@qwery/domain/repositories';
import { createDatabase, initializeSchema } from './db.js';

export class TodoRepository extends ITodoRepository {
  private db: ReturnType<typeof createDatabase>;
  private initPromise: Promise<void> | null = null;

  constructor(private dbPath?: string) {
    super();
    this.db = createDatabase(this.dbPath);
    this.init();
  }

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = Promise.resolve(initializeSchema(this.db));
    return this.initPromise;
  }

  async findByConversationId(conversationId: string): Promise<TodoItem[]> {
    await this.init();

    const row = this.db
      .prepare('SELECT todos_json FROM todo WHERE conversation_id = ?')
      .get(conversationId) as { todos_json: string } | undefined;

    if (!row) {
      return [];
    }

    try {
      const todos = JSON.parse(row.todos_json) as TodoItem[];
      return Array.isArray(todos) ? todos : [];
    } catch {
      return [];
    }
  }

  async upsertByConversationId(
    conversationId: string,
    todos: TodoItem[],
  ): Promise<TodoItem[]> {
    await this.init();

    const todosJson = JSON.stringify(todos);

    this.db
      .prepare(
        `INSERT INTO todo (conversation_id, todos_json)
         VALUES (?, ?)
         ON CONFLICT(conversation_id) DO UPDATE SET todos_json = excluded.todos_json`,
      )
      .run(conversationId, todosJson);

    return todos;
  }
}
