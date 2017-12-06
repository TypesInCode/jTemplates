export interface Callback {
    (sender: any, ...args: any[]): void;
}
declare class Emitter {
    private callbackMap;
    AddListener(name: string, callback: Callback): void;
    RemoveListener(name: string, callback: Callback): void;
    Fire(name: string, ...args: any[]): void;
    Clear(name: string): void;
    ClearAll(): void;
}
export default Emitter;
