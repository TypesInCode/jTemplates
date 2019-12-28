"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TreeNodeRefId;
(function (TreeNodeRefId) {
    function GetString(id) {
        return "TreeNodeRefId." + id;
    }
    TreeNodeRefId.GetString = GetString;
    function GetIdFrom(str) {
        if (!str || typeof str !== 'string')
            return undefined;
        var matches = str.match(/TreeNodeRefId\.([^.]+$)/);
        if (!matches)
            return undefined;
        return matches[1];
    }
    TreeNodeRefId.GetIdFrom = GetIdFrom;
})(TreeNodeRefId = exports.TreeNodeRefId || (exports.TreeNodeRefId = {}));
