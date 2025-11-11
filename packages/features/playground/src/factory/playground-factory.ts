import { PGlitePlayground } from './impl/pglite-playground';
import type { PlaygroundDatabase } from './playground-database';

export class PlaygroundFactory {
  static create(id: string, _name: string): PlaygroundDatabase {
    switch (id) {
      case 'pglite':
        return new PGlitePlayground();
      default:
        throw new Error(`Unsupported playground id: ${id}`);
    }
  }
}
