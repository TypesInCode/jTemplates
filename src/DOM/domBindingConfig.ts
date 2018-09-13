import { IBindingConfig } from '../Binding/bindingConfig.types';
import { browser } from './browser';

var pendingUpdates: Array<() => void> = [];
var updateScheduled = false;
var updateIndex = 0;
var batchSize = 100;

function processUpdates() {
    var batchEnd = batchSize + updateIndex;
    for(var x=updateIndex; x<batchEnd && x<pendingUpdates.length; x++, updateIndex++)
        pendingUpdates[x]();

    if(updateIndex == pendingUpdates.length) {
        updateIndex = 0;
        pendingUpdates = [];
        updateScheduled = false;
    }
    else {
        browser.requestAnimationFrame(processUpdates);
    }
}

export var DOMBindingConfig: IBindingConfig = {
    scheduleUpdate: function(callback: () => void): void {
        pendingUpdates.push(callback);
    
        if(!updateScheduled) {
            updateScheduled = true;
            browser.requestAnimationFrame(processUpdates);
        }
    },
    addListener: function(target: Node, type: string, callback: {():void}) {
        target.addEventListener(type, callback);
    },
    removeListener: function(target: Node, type: string, callback: {():void}) {
        target.removeEventListener(type, callback);
    },
    createBindingTarget: function(type: string): Node {
        return browser.window.document.createElement(type);
    },
    addChild: function(root: Node, child: Node) {
        root.appendChild(child);
    },
    removeChild: function(root: Node, child: Node) {
        root.removeChild(child);
    },
    setText: function(target: Node, text: string) {
        target.textContent = text;
    }
}