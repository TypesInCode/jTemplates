import { wndw } from './window';
import { INodeConfig } from '../Node/nodeConfig';
import { List } from '../Utils/list';
import { CreateAssignment, CreateNodeValueAssignment } from './utils';
// import { Synch } from '../Utils/thread';

let pendingUpdates = List.Create<{(): void}>();
let updateScheduled = false;

const updateMs = 16;
function processUpdates() {
    List.Add(pendingUpdates, null);
    const start = Date.now();

    let callback: {(): void};
    while((callback = List.Pop(pendingUpdates)))
        callback();
        // Synch(callback);
    
    if(pendingUpdates.size === 0)
        updateScheduled = false;
    else if(Date.now() - start < updateMs)
        processUpdates();
    else
        wndw.requestAnimationFrame(processUpdates);
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
    scheduleUpdate(callback: () => void): void {
        List.Add(pendingUpdates, callback);
    
        if(!updateScheduled) {
            updateScheduled = true;
            wndw.requestAnimationFrame(processUpdates);
        }
    },
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
    setText(target: Node, text: string) {
        target.textContent = text;
    },
    getAttribute(target: HTMLElement, attribute: string) {
        return target.getAttribute(attribute);
    },
    setAttribute(target: HTMLElement, attribute: string, value: string) {
        target.setAttribute(attribute, value);
    },
    createPropertyAssignment(target: HTMLElement) {
        if(target.nodeType === Node.TEXT_NODE)
            return CreateNodeValueAssignment(target);

        return CreateAssignment(target);
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