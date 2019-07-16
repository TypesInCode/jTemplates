export interface IBindingConfig {
    scheduleUpdate(callback: () => void): void;
    updateComplete(callback: () => void): void;
    addListener(target: any, type: string, callback: {
        (): void;
    }): void;
    removeListener(target: any, type: string, callback: {
        (): void;
    }): void;
    createBindingTarget(type: any, namespace: string): any;
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
    getAttribute(target: any, attribute: string): string;
    setAttribute(target: any, attribute: string, value: string): void;
    setPropertyOverrides: {
        [prop: string]: (target: any, value: any) => void;
    };
}
