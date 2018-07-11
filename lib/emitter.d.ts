export interface Callback<T> {
    (sender: T, ...args: any[]): void;
}
export declare class Emitter<T> {
    private callbackMap;
    private removedEvents;
    AddListener(name: string, callback: Callback<T>): void;
    RemoveListener(name: string, callback: Callback<T>): void;
    Fire(name: string, ...args: any[]): void;
    Clear(name: string): void;
    ClearAll(): void;
}
export default Emitter;
