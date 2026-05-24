import type { CodeDescription } from './code';
import type { Optional } from './common-types';

export type CreateExceptionPayload<TData> = {
  code: CodeDescription;
  overrideMessage?: string;
  data?: TData;
};

export class Exception<TData> extends Error {
  public readonly code: number;

  public readonly data: Optional<TData>;

  private constructor(codeDescription: CodeDescription, overrideMessage?: string, data?: TData) {
    super();

    this.name = this.constructor.name;
    this.code = codeDescription.code;
    this.data = data;
    this.message = overrideMessage || codeDescription.message;

    const captureStackTrace = (
      Error as { captureStackTrace?: (target: object, ctor: (...args: never[]) => unknown) => void }
    ).captureStackTrace;
    if (captureStackTrace) captureStackTrace(this, this.constructor as (...args: never[]) => unknown);
  }

  public static new<TData>(payload: CreateExceptionPayload<TData>): Exception<TData> {
    return new Exception(payload.code, payload.overrideMessage, payload.data);
  }
}
