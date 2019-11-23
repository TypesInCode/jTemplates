"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const window_1 = require("./window");
var pendingUpdates = [];
var updateScheduled = false;
var updateIndex = 0;
function processUpdates() {
    var start = Date.now();
    while (updateIndex < pendingUpdates.length && (Date.now() - start) < 66) {
        pendingUpdates[updateIndex]();
        updateIndex++;
    }
    if (updateIndex === pendingUpdates.length) {
        updateIndex = 0;
        pendingUpdates = [];
        updateScheduled = false;
    }
    else
        window_1.wndw.requestAnimationFrame(processUpdates);
}
exports.DOMNodeConfig = {
    createNode: function (type, namespace) {
        if (namespace)
            return window_1.wndw.document.createElementNS(namespace, type);
        return window_1.wndw.document.createElement(type);
    },
    scheduleUpdate: function (callback) {
        pendingUpdates.push(callback);
        if (!updateScheduled) {
            updateScheduled = true;
            window_1.wndw.requestAnimationFrame(processUpdates);
        }
    },
    addListener: function (target, type, callback) {
        target.addEventListener(type, callback);
    },
    removeListener: function (target, type, callback) {
        target.removeEventListener(type, callback);
    },
    addChild: function (root, child) {
        root.appendChild(child);
    },
    addChildFirst: function (root, child) {
        exports.DOMNodeConfig.addChildBefore(root, root.firstChild, child);
    },
    addChildBefore: function (root, sibling, child) {
        if (!sibling) {
            exports.DOMNodeConfig.addChild(root, child);
            return;
        }
        if (child !== sibling)
            root.insertBefore(child, sibling);
    },
    addChildAfter: function (root, sibling, child) {
        if (!sibling) {
            exports.DOMNodeConfig.addChildFirst(root, child);
            return;
        }
        exports.DOMNodeConfig.addChildBefore(root, sibling.nextSibling, child);
    },
    removeChild: function (root, child) {
        root.removeChild(child);
    },
    remove: function (target) {
        target && target.parentNode && target.parentNode.removeChild(target);
    },
    setText: function (target, text) {
        target.textContent = text;
    },
    getAttribute(target, attribute) {
        return target.getAttribute(attribute);
    },
    setAttribute(target, attribute, value) {
        target.setAttribute(attribute, value);
    },
    fireEvent(target, event, data) {
        var cEvent = new CustomEvent(event, data);
        target.dispatchEvent(cEvent);
    },
    setPropertyOverrides: {
        value: (target, value) => {
            if (target.nodeName !== "INPUT")
                target.value = value;
            else {
                var start = target.selectionStart;
                var end = target.selectionEnd;
                target.value = value;
                target.setSelectionRange(start, end);
            }
        }
    }
};
//# sourceMappingURL=domNodeConfig.js.map