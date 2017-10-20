"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var observable_1 = require("./Observable/observable");
var browser_1 = require("./DOM/browser");
var component_1 = require("./DOM/Component/component");
var Comp = (function (_super) {
    __extends(Comp, _super);
    function Comp() {
        _super.apply(this, arguments);
        this.state = observable_1.default.Create({
            parentProp1: "parentValue",
            parentProp2: "second value",
            fontColor: "red",
            array: ["first", "second", "third"]
        });
    }
    Object.defineProperty(Comp.prototype, "State", {
        get: function () {
            return this.state;
        },
        set: function (val) {
            this.state.SetValue(val);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Comp.prototype, "Template", {
        get: function () {
            return "\n<div>\n    <style type=\"text/css\">\n        .line-item {\n            color: {{ $comp.State.fontColor }};\n        }\n    </style>\n    {{ $comp.State.parentProp1 }}\n    <" + SubComp + " j-parent=\"{ pValue: $comp.State.parentProp1, color: $comp.State.fontColor, array: $comp.State.array }\">\n        <header>\n            HEADER {{ $parent.pValue }}\n        </header>\n        <content>\n            <div>{{ $parent.color }} <b>{{ $data }}</b></div>\n        </content>\n    </" + SubComp + ">\n</div>";
        },
        enumerable: true,
        configurable: true
    });
    Comp.prototype.GetTemplate = function ($comp) {
        return [
            { component: SubComp, data: function () { return { pValue: $comp.State.parentProp1, color: $comp.State.fontColor, array: $comp.State.array }; } }
        ];
    };
    return Comp;
}(component_1.default));
var SubComp = (function (_super) {
    __extends(SubComp, _super);
    function SubComp() {
        _super.apply(this, arguments);
        this.state = observable_1.default.Create({
            prop1: "Test",
            prop2: "test2",
            color: "green",
            array: []
        });
    }
    Object.defineProperty(SubComp, "Name", {
        get: function () {
            return "Sub-Comp";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SubComp.prototype, "State", {
        get: function () {
            return this.state;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SubComp.prototype, "Template", {
        get: function () {
            return "\n<header />\n<div>Parent pValue is: {{ $parent.pValue }}</div>\n<div j-onclick=\"$comp.OnDivClick\" j-array=\"['default'].concat($state.array.valueOf())\">\n    <div class=\"line-item\">Component name is: {{ $data }} - index is: {{ $index }}</div>\n    <content />\n</div>";
        },
        enumerable: true,
        configurable: true
    });
    SubComp.prototype.GetTemplate = function ($comp, $state, $parent) {
        return [
            { header: {} },
            { div: {}, children: [
                    { div: {}, text: function () { return "Parent pValue is: " + $parent.pValue; } }
                ] },
            { div: { onclick: function () { return $comp.OnDivClick; } }, data: ['default'].concat($state.array.valueOf()), children: function (c, i) {
                    return {
                        div: {}, children: [
                            { div: { class: "line-item" } }
                        ]
                    };
                }
            }
        ];
    };
    SubComp.prototype.SetParentData = function (data) {
        _super.prototype.SetParentData.call(this, data);
        this.State.prop2 = data.pValue;
        this.State.color = data.color;
        this.State.array = data.array;
    };
    SubComp.prototype.BindingParameters = function () {
        var params = _super.prototype.BindingParameters.call(this);
        params["$state"] = this.State;
        return params;
    };
    SubComp.prototype.OnDivClick = function (e) {
        console.log("div has been clicked");
    };
    return SubComp;
}(component_1.default));
browser_1.default.window.Comp = Comp;
browser_1.default.window.SubComp = SubComp;
browser_1.default.window.Observable = observable_1.default;
var divElem = browser_1.default.window.document.createElement("div");
var comp = new Comp();
comp.AttachTo(divElem);
console.log(divElem.outerHTML);
var obsArr = new observable_1.default(["first", "second", "third"]);
var test = ["prefix"].concat(obsArr);
console.log(test.length);
//# sourceMappingURL=index.1.js.map