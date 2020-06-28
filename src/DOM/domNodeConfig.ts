import { wndw } from './window';
import { INodeConfig } from '../Node/nodeConfig';
import { List } from '../Utils/list';
import { SetInputValue } from './utils';
import { Thread } from '../Utils/thread';

var pendingUpdates = new List<{(): void}>();
var updateScheduled = false;

function processUpdates() {
    var callback: {(): void};
    while((callback = pendingUpdates.Pop()))
        Thread(callback, true);

    updateScheduled = false;
}

const htmlNs = "http://www.w3.org/1999/xhtml";
export var DOMNodeConfig: INodeConfig = {
    createNode: function(type: string, namespace: string): Node {
        return type !== "text" ? wndw.document.createElementNS(namespace || htmlNs, type) : wndw.document.createTextNode("");
    },
    scheduleUpdate: function(callback: () => void): void {
        pendingUpdates.Add(callback);
    
        if(!updateScheduled) {
            updateScheduled = true;
            wndw.requestAnimationFrame(processUpdates);
        }
    },
    addListener: function(target: Node, type: string, callback: {():void}) {
        target.addEventListener(type, callback);
    },
    removeListener: function(target: Node, type: string, callback: {():void}) {
        target.removeEventListener(type, callback);
    },
    addChild: function(root: Node, child: Node) {
        root.appendChild(child);
    },
    addChildFirst: function(root: Node, child: Node) {
        DOMNodeConfig.addChildBefore(root, root.firstChild, child);
    },
    addChildBefore: function(root: Node, sibling: Node, child: Node) {
        if(!sibling) {
            DOMNodeConfig.addChild(root, child);
            return;
        }

        if(child !== sibling)
            root.insertBefore(child, sibling);
    },
    addChildAfter: function(root: Node, sibling: Node, child: Node) {
        if(!sibling) {
            DOMNodeConfig.addChildFirst(root, child);
            return;
        }

        DOMNodeConfig.addChildBefore(root, sibling.nextSibling, child);
    },
    removeChild: function(root: Node, child: Node) {
        root.removeChild(child);
    },
    remove: function(target: Node) {
        target && target.parentNode && target.parentNode.removeChild(target);
    },
    setText: function(target: Node, text: string) {
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
    setPropertyOverrides: {
        ["value"]: SetInputValue
    }
}