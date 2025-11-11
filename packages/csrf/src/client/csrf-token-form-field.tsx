import { UseFormRegisterReturn } from 'react-hook-form';

type Field = { field: UseFormRegisterReturn };
type Value = { value: string | null };

export function CsrfTokenFormField(props: Field | Value) {
  const field =
    'field' in props
      ? props.field
      : {
          name: 'csrfToken',
          value: props.value ?? '',
        };

  return <input type="hidden" {...field} />;
}
