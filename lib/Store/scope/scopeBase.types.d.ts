export interface ScopeValueCallback<T> {
    (...args: any[]): T | Promise<T>;
}
