import { registerPostgresqlExtension } from '@qwery/extension-postgresql';

let registered = false;

export function registerCliExtensions(): void {
  if (registered) {
    return;
  }

  registerPostgresqlExtension();

  registered = true;
}
