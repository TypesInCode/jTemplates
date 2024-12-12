import { wndw } from './window';
import { INodeConfig } from '../Node/nodeConfig';
import { List } from '../Utils/list';
import { CreateNodeValueAssignment } from './createPropertyAssignment';
import { CreateEventAssignment } from './createEventAssignment';
import { CreateAssignment } from './createAssignment';
import { CreatePropertyAssignment } from './createPropertyAssignment';

let pendingUpdates = List.Create<{(): void}>();
let updateScheduled = false;

const frameTime = 16;
let frameStart = 0;
function processUpdates() {
    List.Add(pendingUpdates, null);

    let callback: {(): void};
    while((callback = List.Pop(pendingUpdates)))
        callback();

    if(pendingUpdates.size === 0)
        updateScheduled = false;
    else {
        frameStart = Date.now();
        wndw.requestAnimationFrame(processUpdates);
    }
}

let highPriority = false;
function scheduleUpdate(callback: () => void) {
    if(highPriority)
        List.Push(pendingUpdates, callback);
    else
        List.Add(pendingUpdates, callback);

    if(!updateScheduled) {
        const now = Date.now();
        updateScheduled = true;
        if(now - frameStart < frameTime)
            queueMicrotask(processUpdates);
        else {
            frameStart = now;
            wndw.requestAnimationFrame(processUpdates);
        }
    }
}

function wrapPriorityUpdates<P extends any[]>(callback: (...args: P) => void) {
    return function(...args: P) {
        const currentPriority = highPriority;
        highPriority = true;
        callback(...args);
        highPriority = currentPriority;
    };
}

export const DOMNodeConfig: INodeConfig = {
    createNode(type: string, namespace?: string): Node {
        return namespace ? 
            wndw.document.createElementNS(namespace, type) : 
            wndw.document.createElement(type)
    },
    createTextNode(value: string = '') {
        return wndw.document.createTextNode(value);
    },
    isTextNode(target: Node) {
        return target.nodeType === Node.TEXT_NODE;
    },
    scheduleUpdate,
    wrapPriorityUpdates,
    addListener(target: Node, type: string, callback: {():void}) {
        target.addEventListener(type, callback);
    },
    removeListener(target: Node, type: string, callback: {():void}) {
        target.removeEventListener(type, callback);
    },
    addChild(root: Node, child: Node) {
        root.appendChild(child);
    },
    addChildFirst(root: Node, child: Node) {
        DOMNodeConfig.addChildBefore(root, root.firstChild, child);
    },
    addChildBefore(root: Node, sibling: Node, child: Node) {
        if(!sibling) {
            DOMNodeConfig.addChild(root, child);
            return;
        }

        if(child !== sibling)
            root.insertBefore(child, sibling);
    },
    addChildAfter(root: Node, sibling: Node, child: Node) {
        if(!sibling) {
            DOMNodeConfig.addChildFirst(root, child);
            return;
        }

        DOMNodeConfig.addChildBefore(root, sibling.nextSibling, child);
    },
    removeChild(root: Node, child: Node) {
        root.removeChild(child);
    },
    remove(target: Node) {
        target && target.parentNode && target.parentNode.removeChild(target);
    },
    createTextAssignment(target: HTMLElement) {
        return CreateNodeValueAssignment(target);
    },
    setText(target: Node, text: string) {
        target.nodeValue = text;
    },
    getAttribute(target: HTMLElement, attribute: string) {
        return target.getAttribute(attribute);
    },
    setAttribute(target: HTMLElement, attribute: string, value: string) {
        target.setAttribute(attribute, value);
    },
    createPropertyAssignment(target: HTMLElement) {
        return CreatePropertyAssignment(target);
    },
    createEventAssignment(target: HTMLElement) {
        return CreateAssignment(target, CreateEventAssignment);
    },
    fireEvent(target: HTMLElement, event: string, data: any) {
        var cEvent = new CustomEvent(event, data);
        target.dispatchEvent(cEvent);
    },
    getFirstChild(target: HTMLElement) {
        return target.firstChild;
    },
    getLastChild(target: HTMLElement) {
        return target.lastChild;
    },
    getNextSibling(target: HTMLElement) {
        return target.nextSibling;
    },
    replaceChildren(target: HTMLElement, children: HTMLElement[]) {
        target.replaceChildren(...children);
    },
}