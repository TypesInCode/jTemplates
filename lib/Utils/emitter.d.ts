export interface Callback {
    (...args: any[]): void;
}
export declare class Emitter {
    private callbackMap;
    addListener(name: string, callback: Callback): void;
    removeListener(name: string, callback: Callback): void;
    emit(name: string, ...args: any[]): void;
    clear(name: string): void;
    removeAllListeners(): void;
}
export default Emitter;
