"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const browser_1 = require("./browser");
var pendingUpdates = [];
var updateScheduled = false;
var updateIndex = 0;
var batchSize = 3000;
function processUpdates() {
    var batchEnd = batchSize + updateIndex;
    for (var x = updateIndex; x < batchEnd && x < pendingUpdates.length; x++, updateIndex++)
        pendingUpdates[x]();
    if (updateIndex == pendingUpdates.length) {
        updateIndex = 0;
        pendingUpdates = [];
        updateScheduled = false;
    }
    else {
        browser_1.browser.requestAnimationFrame(processUpdates);
    }
}
exports.DOMBindingConfig = {
    scheduleUpdate: function (callback) {
        pendingUpdates.push(callback);
        if (!updateScheduled) {
            updateScheduled = true;
            browser_1.browser.requestAnimationFrame(processUpdates);
        }
    },
    updateComplete: function (callback) {
        if (pendingUpdates.length === 0) {
            callback();
            return;
        }
        pendingUpdates.push(callback);
        if (!updateScheduled) {
            updateScheduled = true;
            browser_1.browser.requestAnimationFrame(processUpdates);
        }
    },
    addListener: function (target, type, callback) {
        target.addEventListener(type, callback);
    },
    removeListener: function (target, type, callback) {
        target.removeEventListener(type, callback);
    },
    createBindingTarget: function (type) {
        return browser_1.browser.window.document.createElement(type);
    },
    addChild: function (root, child) {
        root.appendChild(child);
    },
    addChildFirst: function (root, child) {
        exports.DOMBindingConfig.addChildBefore(root, root.firstChild, child);
    },
    addChildBefore: function (root, sibling, child) {
        if (!sibling) {
            exports.DOMBindingConfig.addChild(root, child);
            return;
        }
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
        return browser_1.browser.createDocumentFragment();
    },
    addContainerChild(container, child) {
        container.appendChild(child);
    },
    addChildContainer(root, container) {
        root.appendChild(container);
    }
};
//# sourceMappingURL=domBindingConfig.js.map