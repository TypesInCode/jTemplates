export declare class DeferredPromise<T> implements PromiseLike<T> {
    private promise;
    private resolve;
    private executor;
    constructor(executor: {
        (resolve: {
            (value?: T | PromiseLike<T>): void;
        }, reject: {
            (reason?: any): void;
        }): void;
    });
    Invoke(): void;
    then<TResult1, TResult2>(onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2>;
    catch<TResult>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<T | TResult>;
    readonly [Symbol.toStringTag]: "Promise";
}
