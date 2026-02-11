import { AbstractQueryEngine } from '@qwery/domain/ports';

const engines = new Map<string, AbstractQueryEngine>();

export const QweryEngineRegistry = {
  register(engine: AbstractQueryEngine): void {
    engines.set(engine.id, engine);
  },
  get(id: string): AbstractQueryEngine | undefined {
    return engines.get(id);
  },
  list(): AbstractQueryEngine[] {
    return Array.from(engines.values());
  },
};
