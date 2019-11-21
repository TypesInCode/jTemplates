export interface INodeConfig {
    createNode(type: any, namespace: string): any;
    scheduleUpdate(callback: () => void): void;
    setText(target: any, text: string): void;
    getAttribute(target: any, attribute: string): string;
    setAttribute(target: any, attribute: string, value: string): void;
    addListener(target: any, type: string, callback: {
        (): void;
    }): void;
    removeListener(target: any, type: string, callback: {
        (): void;
    }): void;
    setPropertyOverrides: {
        [prop: string]: (target: any, value: any) => void;
    };
    addChild(root: any, child: any): void;
    addChildAfter(root: any, sibling: any, child: any): void;
    addChildFirst(root: any, child: any): void;
    addChildBefore(root: any, sibling: any, child: any): void;
    removeChild(root: any, child: any): void;
    remove(target: any): void;
    fireEvent(target: any, event: string, data: any): void;
}
export declare const NodeConfig: INodeConfig;
