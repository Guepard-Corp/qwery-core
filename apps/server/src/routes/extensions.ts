import { Hono } from 'hono';
import { ExtensionsRegistry, ExtensionScope } from '@qwery/extensions-sdk';
import { Code } from '@qwery/domain/common';
import {
  createNotFoundErrorResponse,
  createValidationErrorResponse,
} from '../lib/http-utils';

const SCOPE_VALUES = Object.values(ExtensionScope) as string[];

export function createExtensionsRoutes() {
  const app = new Hono();

  app.get('/', (c) => {
    const scopeParam = c.req.query('scope');
    if (scopeParam && !SCOPE_VALUES.includes(scopeParam)) {
      return createValidationErrorResponse(
        `Invalid scope. Expected one of: ${SCOPE_VALUES.join(', ')}`,
      );
    }
    const scope = scopeParam as ExtensionScope | undefined;
    const extensions = ExtensionsRegistry.list(scope);
    return c.json(
      extensions.map((e) => ({
        ...e,
        schema: null,
        icon: e.icon
          ? e.icon.replace('media', `/extensions/${e.id}`)
          : undefined,
      })),
    );
  });

  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const extension = ExtensionsRegistry.get(id);
    if (!extension) {
      return createNotFoundErrorResponse(
        `Extension ${id} not found`,
        Code.ENTITY_NOT_FOUND_ERROR,
      );
    }
    const serialized = {
      ...extension,
      schema: null as null,
      icon: extension.icon.replace('media', `/extensions/${extension.id}`),
    };
    return c.json(serialized);
  });

  return app;
}
