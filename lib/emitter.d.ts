declare class Emitter {
    private callbackMap;
    AddListener(name: string, callback: {
        (...args: any[]): void;
    }): void;
    RemoveListener(name: string, callback: {
        (...args: any[]): void;
    }): void;
    Fire(name: string, ...args: any[]): void;
    Clear(name: string): void;
    ClearAll(): void;
}
export default Emitter;
