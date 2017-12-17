export interface Callback {
    (sender: Emitter, ...args: any[]): void;
}
export declare class Emitter {
    private callbackMap;
    private firingEvents;
    private removedEvents;
    AddListener(name: string, callback: Callback): void;
    RemoveListener(name: string, callback: Callback): void;
    Fire(name: string, ...args: any[]): void;
    Clear(name: string): void;
    ClearAll(): void;
}
export default Emitter;
