"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const browser_1 = require("./browser");
var pendingUpdates = [];
var updateScheduled = false;
exports.DOMBindingConfig = {
    scheduleUpdate: function (callback) {
        pendingUpdates.push(callback);
        if (!updateScheduled) {
            updateScheduled = true;
            browser_1.browser.requestAnimationFrame(() => {
                updateScheduled = false;
                for (var x = 0; x < pendingUpdates.length; x++)
                    pendingUpdates[x]();
                pendingUpdates = [];
            });
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
    removeChild: function (root, child) {
        root.removeChild(child);
    },
    setText: function (target, text) {
        target.textContent = text;
    }
};
//# sourceMappingURL=domBindingConfig.js.map