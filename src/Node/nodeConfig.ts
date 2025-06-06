import { DOMNodeConfig } from "../DOM/domNodeConfig";

export interface INodeConfig {
    createNode(type: any, namespace: string): any;
    createTextNode(value?: string): any;
    scheduleUpdate(callback: () => void): void;
    wrapPriorityUpdates<P extends any[]>(callback: (...args: P) => void): (...args: P) => void;
    setText(target: any, text: string): void;
    isTextNode(target: any): boolean;
    getAttribute(target: any, attribute: string): string;
    setAttribute(target: any, attribute: string, value: string): void;
    addListener(target: any, type: string, callback: {(): void}): void;
    removeListener(target: any, type: string, callback: {(): void}): void;
    addChild(root: any, child: any): void;
    addChildAfter(root: any, sibling: any, child: any): void;
    addChildFirst(root: any, child: any): void;
    addChildBefore(root: any, sibling: any, child: any): void;
    removeChild(root: any, child: any): void;
    remove(target: any): void;
    fireEvent(target: any, event: string, data: any): void;
    createTextAssignment(target: any): {(next: string): void};
    createPropertyAssignment(target: any): {(next: any): void};
    assignProperties(target: any, next: any): void;
    createEventAssignment(target: any): {(next: {[event: string]: (event: Event) => void }): void};
    assignEvents(target: any, next: any): void;
    createAttributeAssignment(target: any): {(next: {[attribute: string]: string }): void};
    getFirstChild(target: any): any;
    getLastChild(target: any): any;
    getNextSibling(target: any): any;
    replaceChildren(target: any, children: any[]): void;
    reconcileChildren(target: any, children: any[]): void;
}

export const NodeConfig = DOMNodeConfig as INodeConfig;
