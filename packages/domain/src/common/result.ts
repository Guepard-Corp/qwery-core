export class Result<TValue, TError> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: TValue,
    public readonly error?: TError,
  ) {}

  public static ok<TValue, TError = never>(value: TValue) {
    return new Result<TValue, TError>(true, value);
  }

  public static fail<TValue = never, TError = Error>(error: TError) {
    return new Result<TValue, TError>(false, undefined, error);
  }

  public get isFailure() {
    return !this.isSuccess;
  }
}
