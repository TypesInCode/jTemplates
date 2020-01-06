import { wndw } from './window';
import { INodeConfig } from '../Node/nodeConfig';
import { List } from '../Utils/list';

var priorityUpdates = new List<{(): void}>();
var pendingUpdates = new List<{(): void}>();
var updateScheduled = false;

function processUpdates() {
    var start = Date.now();
    var callback = priorityUpdates.Pop() || pendingUpdates.Pop();
    callback && callback();
    while(callback && (Date.now() - start) < 66) {
        callback = priorityUpdates.Pop() || pendingUpdates.Pop();
        callback && callback();
    }

    if(pendingUpdates.Size > 0)
        wndw.requestAnimationFrame(processUpdates);
    else
        updateScheduled = false;
}

export var DOMNodeConfig: INodeConfig = {
    createNode: function(type: string, namespace: string): Node {
        if(namespace)
            return wndw.document.createElementNS(namespace, type);

        return wndw.document.createElement(type);
    },
    scheduleUpdate: function(callback: () => void, highPriority = false): void {
        if(highPriority)
            priorityUpdates.Add(callback);
        else
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