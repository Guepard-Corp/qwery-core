import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { FormRenderer } from '../src/qwery/form-renderer';

const simpleSchema = z.object({
  name: z.string(),
  age: z.number(),
  active: z.boolean(),
  role: z.enum(['admin', 'user']),
});

const datasourceUnionSchema = z.union([
  z.object({
    connectionUrl: z.string().url(),
  }),
  z.object({
    host: z.string(),
    port: z.number().int(),
    database: z.string(),
  }),
]);

const datasourceUnionSchemaFieldsFirst = z.union([
  z.object({
    host: z.string(),
    port: z.number().int(),
    database: z.string(),
  }),
  z.object({
    connectionUrl: z.string().url(),
  }),
]);

describe('FormRenderer', () => {
  it('renders fields for a simple ZodObject (string, number, boolean, enum)', () => {
    const onSubmit = vi.fn();
    render(<FormRenderer schema={simpleSchema} onSubmit={onSubmit} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
  });

  it('submits and calls onSubmit with parsed values', async () => {
    const onSubmit = vi.fn();
    render(
      <>
        <FormRenderer
          formId="test-form"
          schema={simpleSchema}
          onSubmit={onSubmit}
          defaultValues={{ active: false, role: 'admin' }}
        />
        <button type="submit" form="test-form">
          Submit
        </button>
      </>,
    );
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Alice' },
    });
    fireEvent.change(screen.getByLabelText(/age/i), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice',
          age: 30,
          active: false,
          role: 'admin',
        }),
      );
    });
  });

  it('uses default values from schema and defaultValues prop', () => {
    const schemaWithDefaults = z.object({
      name: z.string().default('Bob'),
      count: z.number().default(10),
    });
    const onSubmit = vi.fn();
    render(
      <FormRenderer
        schema={schemaWithDefaults}
        onSubmit={onSubmit}
        defaultValues={{ count: 5 }}
      />,
    );
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const countInput = screen.getByLabelText(/count/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Bob');
    expect(Number(countInput.value)).toBe(5);
  });

  it('calls onFormReady when form is ready', async () => {
    const onFormReady = vi.fn();
    render(
      <FormRenderer
        schema={simpleSchema}
        onSubmit={vi.fn()}
        onFormReady={onFormReady}
      />,
    );
    await waitFor(() => {
      expect(onFormReady).toHaveBeenCalled();
    });
  });

  it('supports union schema for datasource connectionUrl vs fields (connectionUrl variant)', async () => {
    const onSubmit = vi.fn();
    render(
      <>
        <FormRenderer
          formId="ds-union-form-url"
          schema={datasourceUnionSchema}
          onSubmit={onSubmit}
        />
        <button type="submit" form="ds-union-form-url">
          Submit
        </button>
      </>,
    );

    // Union root should render a Mode selector
    expect(screen.getByText(/mode/i)).toBeInTheDocument();

    // First variant is the connectionUrl object
    fireEvent.change(screen.getByLabelText(/connection url/i), {
      target: { value: 'postgres://user:pass@host:5432/db' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionUrl: 'postgres://user:pass@host:5432/db',
        }),
      );
    });
  });

  it('resolves label from meta.i18n when locale is passed', () => {
    const fieldSchema = z.string().url();
    const def = (
      fieldSchema as { _def?: { metadata?: Record<string, unknown> } }
    )._def;
    if (def) {
      def.metadata = {
        label: 'Shared link',
        i18n: { en: 'Shared link', fr: 'Lien partagé' },
      };
    }
    const i18nSchema = z.object({ sharedLink: fieldSchema });
    const onSubmit = vi.fn();

    const { rerender } = render(
      <FormRenderer schema={i18nSchema} onSubmit={onSubmit} locale="fr" />,
    );
    expect(screen.getByLabelText('Lien partagé')).toBeInTheDocument();

    rerender(
      <FormRenderer schema={i18nSchema} onSubmit={onSubmit} locale="en" />,
    );
    expect(screen.getByLabelText('Shared link')).toBeInTheDocument();
  });

  it('falls back to meta.label or humanized key when locale is omitted', () => {
    const fieldSchema = z.string().url();
    const def = (
      fieldSchema as { _def?: { metadata?: Record<string, unknown> } }
    )._def;
    if (def) {
      def.metadata = {
        label: 'Shared link',
        i18n: { en: 'Shared link', fr: 'Lien partagé' },
      };
    }
    const i18nSchema = z.object({ sharedLink: fieldSchema });
    const onSubmit = vi.fn();
    render(<FormRenderer schema={i18nSchema} onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Shared link')).toBeInTheDocument();
  });

  it('supports union schema for datasource when field-based variant is first', async () => {
    const onSubmit = vi.fn();
    render(
      <>
        <FormRenderer
          formId="ds-union-form-fields"
          schema={datasourceUnionSchemaFieldsFirst}
          onSubmit={onSubmit}
        />
        <button type="submit" form="ds-union-form-fields">
          Submit
        </button>
      </>,
    );

    fireEvent.change(screen.getByLabelText(/host/i), {
      target: { value: 'db.internal.example.com' },
    });
    fireEvent.change(screen.getByLabelText(/port/i), {
      target: { value: '5432' },
    });
    fireEvent.change(screen.getByLabelText(/database/i), {
      target: { value: 'app_production' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'db.internal.example.com',
          port: 5432,
          database: 'app_production',
        }),
      );
    });
  });
});
