export interface IBindingConfig {
    scheduleUpdate(callback: () => void): void;
    addListener(target: any, type: string, callback: {
        (): void;
    }): void;
    removeListener(target: any, type: string, callback: {
        (): void;
    }): void;
    createBindingTarget(type: any): any;
    addChild(root: any, child: any): void;
    removeChild(root: any, child: any): void;
    setText(target: any, text: string): void;
}
