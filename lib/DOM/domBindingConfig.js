"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const window_1 = require("./window");
var pendingUpdates = [];
var updateScheduled = false;
var updateIndex = 0;
var batchSize = 1000;
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
exports.DOMBindingConfig = {
    scheduleUpdate: function (callback) {
        pendingUpdates.push(callback);
        if (!updateScheduled) {
            updateScheduled = true;
            window_1.wndw.requestAnimationFrame(processUpdates);
        }
    },
    updateComplete: function (callback) {
        this.scheduleUpdate(() => {
            setTimeout(callback, 0);
        });
    },
    getNodeById: function (id) {
        return window_1.wndw.document.getElementById(id);
    },
    addListener: function (target, type, callback) {
        target.addEventListener(type, callback);
    },
    removeListener: function (target, type, callback) {
        target.removeEventListener(type, callback);
    },
    createBindingTarget: function (type, namespace) {
        if (namespace)
            return window_1.wndw.document.createElementNS(namespace, type);
        return window_1.wndw.document.createElement(type);
    },
    addChild: function (root, child) {
        root.appendChild(child);
    },
    appendXml: function (root, xml) {
        var template = window_1.wndw.document.createElement("template");
        template.innerHTML = xml;
        root.appendChild(template.content);
    },
    appendXmlAfter: function (root, sibling, xml) {
        var template = window_1.wndw.document.createElement("template");
        template.innerHTML = xml;
        this.addChildAfter(root, sibling, template.content);
    },
    addChildFirst: function (root, child) {
        exports.DOMBindingConfig.addChildBefore(root, root.firstChild, child);
    },
    addChildBefore: function (root, sibling, child) {
        if (!sibling) {
            exports.DOMBindingConfig.addChild(root, child);
            return;
        }
        if (child !== sibling)
            root.insertBefore(child, sibling);
    },
    addChildAfter: function (root, sibling, child) {
        if (!sibling) {
            exports.DOMBindingConfig.addChildFirst(root, child);
            return;
        }
        exports.DOMBindingConfig.addChildBefore(root, sibling.nextSibling, child);
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
    createContainer() {
        return window_1.wndw.document.createDocumentFragment();
    },
    addContainerChild(container, child) {
        container.appendChild(child);
    },
    addChildContainer(root, container) {
        root.appendChild(container);
    },
    getAttribute(target, attribute) {
        return target.getAttribute(attribute);
    },
    setAttribute(target, attribute, value) {
        target.setAttribute(attribute, value);
    },
    setPropertyOverrides: {
        value: (target, value) => {
            if (target.type !== "input")
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
//# sourceMappingURL=domBindingConfig.js.map