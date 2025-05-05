enum ResultStatus {
    Ok,
    Err,
}

/** Inspired by Rust's `Result` type, this class represents a computation that can either succeed with a value or fail with an error. */
export class Result<T, E> {
    protected constructor(readonly status: ResultStatus, private _value: T, public _error: E) {}

    static ok<T, E>(value: T): Result<T, E> {
        return new Result(ResultStatus.Ok, value, null as unknown as E);
    }

    static err<T, E>(error: E): Result<T, E> {
        return new Result(ResultStatus.Err, null as unknown as T, error);
    }

    isOk(): this is Result<T, never> {
        return this.status === ResultStatus.Ok;
    }

    isErr(): this is Result<never, E> {
        return this.status === ResultStatus.Err;
    }

    unwrap(): T {
        if (this.isErr()) {
            throw new Error("Attempted to unwrap an error result.");
        }
        return this._value;
    }

    unwrapOr(defaultValue: T): T {
        if (this.isOk()) {
            return this._value;
        }
        return defaultValue;
    }

    unwrapErr(): E {
        if (this.isOk()) {
            throw new Error("Attempted to unwrap an ok result.");
        }
        return this._error as E;
    }

    unwrapOrThrow() {
        if (this.isOk()) {
            return this._value;
        }
        throw this._error as E;
    }

    okOrElse(fn: (error: E) => T): T {
        if (this.isOk()) {
            return this._value;
        }
        return fn(this._error as E);
    }

}

export function Ok<T, E>(value: T): Result<T, E> {
    return Result.ok(value);
}
export function Err<T, E>(error: E): Result<T, E> {
    return Result.err(error);
}

function ResultDecorator() {
    return function <A, T, E>(_target: unknown, _propertyKey: unknown, descriptor: PropertyDescriptor) {
        const originalMethod: (...args: A[]) => T = descriptor.value;
        if (typeof originalMethod !== "function") {
            throw new Error(`@ResultDecorator can only be applied to methods, not ${typeof originalMethod}`);
        }
        descriptor.value = function (...args: A[]): Result<T, E> {
            try {
                const result = originalMethod.apply(this, args);
                if (result instanceof Result) {
                    return result;
                }
                return Ok(result);
            }
            catch (error) {
                return Err(error as E);
            }
        };
        return descriptor;
    };
}

export { ResultDecorator as IntoResult };