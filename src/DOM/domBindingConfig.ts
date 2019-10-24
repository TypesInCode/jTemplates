import { IBindingConfig } from '../Template/Binding/bindingConfig.types';
import { wndw } from './window';

var pendingUpdates: Array<() => void> = [];
var updateScheduled = false;
var updateIndex = 0;
var batchSize = 1000;

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

    /* var batchEnd = batchSize + updateIndex;
    for(var x=updateIndex; x<batchEnd && x<pendingUpdates.length; x++, updateIndex++)
        pendingUpdates[x]();

    if(updateIndex == pendingUpdates.length) {
        updateIndex = 0;
        pendingUpdates = [];
        updateScheduled = false;
    }
    else {
        wndw.requestAnimationFrame(processUpdates);
    } */
}

export var DOMBindingConfig: IBindingConfig = {
    scheduleUpdate: function(callback: () => void): void {
        pendingUpdates.push(callback);
    
        if(!updateScheduled) {
            updateScheduled = true;
            wndw.requestAnimationFrame(processUpdates);
        }
    },
    updateComplete: function(callback: () => void): void {
        this.scheduleUpdate(() => {
            setTimeout(callback, 0);
        });
    },
    addListener: function(target: Node, type: string, callback: {():void}) {
        target.addEventListener(type, callback);
    },
    removeListener: function(target: Node, type: string, callback: {():void}) {
        target.removeEventListener(type, callback);
    },
    createBindingTarget: function(type: string, namespace: string): Node {
        if(namespace)
            return wndw.document.createElementNS(namespace, type);

        return wndw.document.createElement(type);
    },
    addChild: function(root: Node, child: Node) {
        root.appendChild(child);
    },
    addChildFirst: function(root: Node, child: Node) {
        DOMBindingConfig.addChildBefore(root, root.firstChild, child);
    },
    addChildBefore: function(root: Node, sibling: Node, child: Node) {
        if(!sibling) {
            DOMBindingConfig.addChild(root, child);
            return;
        }

        if(child !== sibling)
            root.insertBefore(child, sibling);
    },
    addChildAfter: function(root: Node, sibling: Node, child: Node) {
        if(!sibling) {
            DOMBindingConfig.addChildFirst(root, child);
            return;
        }

        DOMBindingConfig.addChildBefore(root, sibling.nextSibling, child);
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
    createContainer(): DocumentFragment {
        return wndw.document.createDocumentFragment();
    },
    addContainerChild(container: DocumentFragment, child: Node) {
        container.appendChild(child);
    },
    addChildContainer(root: Node, container: DocumentFragment) {
        root.appendChild(container);
    },
    getAttribute(target: HTMLElement, attribute: string) {
        return target.getAttribute(attribute);
    },
    setAttribute(target: HTMLElement, attribute: string, value: string) {
        target.setAttribute(attribute, value);
    },

    setPropertyOverrides: {
        value: (target: HTMLInputElement, value: string) => {
            if(target.type !== "input")
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