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
    addChildFirst(root: any, child: any): void;
    addChildBefore(root: any, sibling: any, child: any): void;
    addChildAfter(root: any, sibling: any, child: any): void;
    removeChild(root: any, child: any): void;
    remove(target: any): void;
    setText(target: any, text: string): void;
    createContainer(): any;
    addContainerChild(container: any, child: any): void;
    addChildContainer(root: any, container: any): void;
}
