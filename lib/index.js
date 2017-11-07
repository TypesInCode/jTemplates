"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var browser_1 = require("./DOM/browser");
var observable_1 = require("./Observable/observable");
exports.Observable = observable_1.default;
var component_1 = require("./DOM/Component/component");
exports.Component = component_1.default;
var date = null;
var MyComp = (function (_super) {
    __extends(MyComp, _super);
    function MyComp() {
        _super.apply(this, arguments);
        this.state = observable_1.default.Create({
            Prop1: "test",
            Prop2: "blue",
            Class: "garbage-man",
            Font: "verdana",
            Arr: ["obs1", "obs2"],
            Component: SubComp
        });
    }
    Object.defineProperty(MyComp.prototype, "State", {
        get: function () {
            return this.state;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MyComp.prototype, "Template", {
        get: function () {
            var _this = this;
            return [
                { style: { type: "text/css" }, children: function () {
                        return { text: function () { return (".garbage-man { color: " + _this.State.Prop2 + "; }"); } };
                    } },
                { div: { className: function () { return _this.State.Class; }, style: { fontFamily: function () { return _this.State.Font; } } }, data: function () { return _this.State.Arr; },
                    on: { click: function () { return function (e) { return alert("click"); }; } }, children: function (c, i) {
                        return {
                            div: {}, children: [
                                { text: function () { return ("value is: " + c + ", index is " + i); } },
                                { div: {}, component: function () { return _this.state.Component; }, data: c }
                            ] };
                    }
                },
                { div: {}, component: function () { return _this.state.Component; }, data: function () { return _this.state.Prop1; }, templates: {
                        header: { div: {}, children: { text: function () { return ("header of MyComp " + _this.State.Class); } } }
                    } }
            ];
        },
        enumerable: true,
        configurable: true
    });
    MyComp.prototype.Updating = function () {
        date = new Date();
        console.log("updating");
    };
    MyComp.prototype.Updated = function () {
        var date2 = new Date();
        console.log("updated " + (date2.getTime() - date.getTime()));
    };
    return MyComp;
}(component_1.default));
var SubComp = (function (_super) {
    __extends(SubComp, _super);
    function SubComp() {
        _super.apply(this, arguments);
        this.state = observable_1.default.Create({
            Name: "NAME"
        });
    }
    Object.defineProperty(SubComp.prototype, "DefaultTemplates", {
        get: function () {
            return {
                header: function () { return null; }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SubComp.prototype, "Template", {
        get: function () {
            var _this = this;
            return {
                div: {}, children: [
                    { text: "SubComp Header" },
                    { header: {}, children: this.Templates["header"]() },
                    { text: function () { return ("Subcomp name: " + _this.state.Name); } }
                ]
            };
        },
        enumerable: true,
        configurable: true
    });
    SubComp.prototype.SetParentData = function (data) {
        this.state.Name = data;
    };
    return SubComp;
}(component_1.default));
var SubComp2 = (function (_super) {
    __extends(SubComp2, _super);
    function SubComp2() {
        _super.apply(this, arguments);
        this.state = observable_1.default.Create({
            Name: "NAME"
        });
    }
    Object.defineProperty(SubComp2.prototype, "DefaultTemplates", {
        get: function () {
            return {
                header: function () { return null; }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SubComp2.prototype, "Template", {
        get: function () {
            var _this = this;
            return {
                div: {}, children: [
                    { text: "SubComp2 Header" },
                    { header: {} },
                    { text: function () { return ("Subcomp2 name: " + _this.state.Name); } }
                ]
            };
        },
        enumerable: true,
        configurable: true
    });
    SubComp2.prototype.SetParentData = function (data) {
        this.state.Name = data;
    };
    return SubComp2;
}(component_1.default));
browser_1.default.window.MyComp = MyComp;
browser_1.default.window.SubComp = SubComp;
browser_1.default.window.SubComp2 = SubComp2;
//# sourceMappingURL=index.js.map