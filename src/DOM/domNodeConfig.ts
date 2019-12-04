import { wndw } from './window';
import { INodeConfig } from '../Node/nodeConfig';

var pendingUpdates: Array<() => void> = [];
var updateScheduled = false;
var updateIndex = 0;

function processUpdates() {
    var start = Date.now();
    while(updateIndex < pendingUpdates.length && (Date.now() - start) < 66) {
        pendingUpdates[updateIndex]();
        updateIndex++;
    }
    
    if(updateIndex === pendingUpdates.length) {
        updateIndex = 0;
        pendingUpdates = [];
        updateScheduled = false;
    }
    else
        wndw.requestAnimationFrame(processUpdates);
}

export var DOMNodeConfig: INodeConfig = {
    createNode: function(type: string, namespace: string): Node {
        if(namespace)
            return wndw.document.createElementNS(namespace, type);

        return wndw.document.createElement(type);
    },
    scheduleUpdate: function(callback: () => void): void {
        pendingUpdates.push(callback);
    
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
        value: (target: HTMLInputElement, value: string) => {
            if(target.nodeName !== "INPUT")
                target.value = value;
            else {
                var start = target.selectionStart;
                var end = target.selectionEnd;
                target.value = value;
                target.setSelectionRange(start, end);
            }
        }
    }
}