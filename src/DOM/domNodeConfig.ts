import { wndw } from './window';
import { INodeConfig } from '../Node/nodeConfig';
import { List } from '../Utils/list';
import { SetProperties } from './utils';
import { Synch } from '../Utils/thread';

var pendingUpdates = List.Create<{(): void}>();
var updateScheduled = false;

function processUpdates() {
    var callback: {(): void};
    while((callback = List.Pop(pendingUpdates)))
        Synch(callback);
    
    updateScheduled = false;
}

const htmlNs = "http://www.w3.org/1999/xhtml";
export var DOMNodeConfig: INodeConfig = {
    createNode(type: string, namespace: string): Node {
        return type !== "text" ? wndw.document.createElementNS(namespace || htmlNs, type) : wndw.document.createTextNode("");
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
    fireEvent(target: HTMLElement, event: string, data: any) {
        var cEvent = new CustomEvent(event, data);
        target.dispatchEvent(cEvent);
    },
    setProperties: SetProperties
}