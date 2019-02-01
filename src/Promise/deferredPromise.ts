export class DeferredPromise<T> implements PromiseLike<T> {
    private promise: Promise<T>;
    private resolve: {(value?: T | PromiseLike<T>): void};
    private executor: {(resolve: {(value?: T | PromiseLike<T>): void}, reject: {(reason?: any): void}): void};

    constructor(executor: {(resolve: {(value?: T | PromiseLike<T>): void}, reject: {(reason?: any): void}): void}) {
        this.promise = new Promise(r => {
            this.resolve = r;
        });
        this.executor = executor;
    }

    public Invoke() {
        this.resolve(new Promise(this.executor));
    }

    public then<TResult1, TResult2>(
        onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>, 
        onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>
    ): Promise<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    public catch<TResult>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<T | TResult> {
        return this.promise.catch(onrejected);
    }

    readonly [Symbol.toStringTag]: "Promise";
}