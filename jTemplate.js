/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var browser_1 = __webpack_require__(1);
	var observable_1 = __webpack_require__(2);
	exports.Observable = observable_1.default;
	var component_1 = __webpack_require__(6);
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
	                    { header: {}, children: this.Templates.header() },
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


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var glbl = null;
	if (typeof window != "undefined")
	    glbl = window;
	else {
	    glbl = (new (__webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"jsdom\""); e.code = 'MODULE_NOT_FOUND'; throw e; }())).JSDOM)("")).window;
	}
	function ImmediateRequestAnimationFrame(callback) {
	    callback();
	    return 0;
	}
	var immediateAnimationFrames = false;
	var selfClosingTagRgx = /<([^\s]+)([^>]*)\/>/g;
	function CreateDocumentFragment(node) {
	    if (typeof node === "string") {
	        node = node.replace(selfClosingTagRgx, function (substr, g1, g2) {
	            return "<" + g1 + g2 + "></" + g1 + ">";
	        });
	        var parser = new glbl.DOMParser();
	        var doc = parser.parseFromString(node, "text/html");
	        return CreateDocumentFragment(doc.body);
	    }
	    var fragment = glbl.document.createDocumentFragment();
	    while (node && node.childNodes.length > 0)
	        fragment.appendChild(node.childNodes[0]);
	    return fragment;
	}
	var config = {
	    window: glbl,
	    get immediateAnimationFrames() {
	        return immediateAnimationFrames;
	    },
	    set immediateAnimationFrames(val) {
	        immediateAnimationFrames = val;
	        this.requestAnimationFrame = (immediateAnimationFrames ? ImmediateRequestAnimationFrame : glbl.requestAnimationFrame || ImmediateRequestAnimationFrame).bind(glbl);
	    },
	    requestAnimationFrame: null,
	    createDocumentFragment: CreateDocumentFragment
	};
	config.immediateAnimationFrames = false;
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = config;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var emitter_1 = __webpack_require__(3);
	var observableValue_1 = __webpack_require__(4);
	var sharedEmitter = new emitter_1.default();
	var Observable = (function (_super) {
	    __extends(Observable, _super);
	    function Observable(initialValue) {
	        _super.call(this);
	        this.SetValue(initialValue);
	    }
	    Object.defineProperty(Observable.prototype, "IsArray", {
	        get: function () {
	            return Array.isArray(this.observableValue.valueOf());
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Observable.prototype.Fire = function (name) {
	        var args = [];
	        for (var _i = 1; _i < arguments.length; _i++) {
	            args[_i - 1] = arguments[_i];
	        }
	        _super.prototype.Fire.apply(this, [name].concat(args));
	        sharedEmitter.Fire.apply(sharedEmitter, [name].concat(args));
	    };
	    Observable.prototype.SetValue = function (value) {
	        if (value instanceof Observable) {
	            var newValue = value.GetValue();
	            if (newValue !== this.observableValue) {
	                if (this.observableValue)
	                    this.observableValue.RemoveNode(this);
	                this.observableValue = newValue;
	                this.observableValue.AddNode(this);
	            }
	        }
	        else {
	            if (this.observableValue)
	                this.observableValue.Value = value;
	            else {
	                this.observableValue = new observableValue_1.default(value);
	                this.observableValue.AddNode(this);
	            }
	        }
	    };
	    Observable.prototype.GetValue = function () {
	        return this.observableValue;
	    };
	    Observable.prototype.valueOf = function () {
	        this.Fire("get", this);
	        return this.observableValue.valueOf();
	    };
	    Observable.prototype.toString = function () {
	        return this.valueOf().toString();
	    };
	    return Observable;
	}(emitter_1.default));
	var Observable;
	(function (Observable) {
	    function Create(initialValue) {
	        return new Observable(initialValue);
	    }
	    Observable.Create = Create;
	    function Unwrap(node) {
	        return observableValue_1.default.Unwrap(node.GetValue());
	    }
	    Observable.Unwrap = Unwrap;
	    function Watch(event, action) {
	        var ret = [];
	        var callback = function (obs) {
	            var ind = ret.indexOf(obs);
	            if (ind < 0)
	                ret.push(obs);
	        };
	        sharedEmitter.AddListener(event, callback);
	        action();
	        sharedEmitter.RemoveListener(event, callback);
	        return ret;
	    }
	    Observable.Watch = Watch;
	})(Observable || (Observable = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Observable;


/***/ }),
/* 3 */
/***/ (function(module, exports) {

	"use strict";
	var Emitter = (function () {
	    function Emitter() {
	        this.callbackMap = {};
	    }
	    Emitter.prototype.AddListener = function (name, callback) {
	        var events = this.callbackMap[name] || [];
	        var ind = events.indexOf(callback);
	        if (ind >= 0)
	            throw "Event already registered";
	        events.push(callback);
	        this.callbackMap[name] = events;
	    };
	    Emitter.prototype.RemoveListener = function (name, callback) {
	        var events = this.callbackMap[name] || [];
	        var ind = events.indexOf(callback);
	        if (ind >= 0) {
	            events.splice(ind, 1);
	            this.callbackMap[name] = events;
	        }
	    };
	    Emitter.prototype.Fire = function (name) {
	        var args = [];
	        for (var _i = 1; _i < arguments.length; _i++) {
	            args[_i - 1] = arguments[_i];
	        }
	        var events = this.callbackMap[name] || [];
	        events.forEach(function (c) {
	            c.apply(void 0, args);
	        });
	    };
	    Emitter.prototype.Clear = function (name) {
	        this.callbackMap[name] = null;
	    };
	    Emitter.prototype.ClearAll = function () {
	        for (var key in this.callbackMap)
	            this.Clear(key);
	    };
	    return Emitter;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Emitter;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var observable_1 = __webpack_require__(2);
	var symbol_1 = __webpack_require__(5);
	var ObservableValueType;
	(function (ObservableValueType) {
	    ObservableValueType[ObservableValueType["Value"] = 0] = "Value";
	    ObservableValueType[ObservableValueType["Object"] = 1] = "Object";
	    ObservableValueType[ObservableValueType["Array"] = 2] = "Array";
	})(ObservableValueType || (ObservableValueType = {}));
	var ObservableValue = (function () {
	    function ObservableValue(initialValue) {
	        this.objectProperties = [];
	        this.arrayProperties = [];
	        this.parentNodes = [];
	        this.valueType = ObservableValueType.Value;
	        this.Value = initialValue;
	    }
	    Object.defineProperty(ObservableValue.prototype, "Properties", {
	        get: function () {
	            var props = null;
	            switch (this.valueType) {
	                case ObservableValueType.Array:
	                    if (this.arrayProperties.length !== this.value.length) {
	                        this.arrayProperties = [];
	                        for (var x = 0; x < this.value.length; x++)
	                            this.arrayProperties.push(x);
	                    }
	                    props = this.arrayProperties;
	                    break;
	                case ObservableValueType.Object:
	                    props = this.objectProperties;
	                    break;
	                case ObservableValueType.Value:
	                    props = [];
	                    break;
	            }
	            return props;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(ObservableValue.prototype, "ValueType", {
	        get: function () {
	            return this.valueType;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(ObservableValue.prototype, "Value", {
	        get: function () {
	            return this.value;
	        },
	        set: function (val) {
	            var skipEventFiring = false;
	            var startProperties = this.Properties;
	            if (Array.isArray(val)) {
	                this.ConvertToArray();
	                var nextArr = Array.isArray(this.value) ? this.value : new Array();
	                for (var x = 0; x < val.length; x++) {
	                    var newVal = val[x];
	                    var curVal = nextArr[x];
	                    if (curVal)
	                        curVal.SetValue(newVal);
	                    else
	                        nextArr[x] = new observable_1.default(newVal);
	                }
	                if (val.length < nextArr.length)
	                    nextArr.splice(val.length);
	                this.value = nextArr;
	            }
	            else if (val != null && val != undefined && typeof val === "object") {
	                this.ConvertToObject();
	                var nextObject = typeof this.value === "object" ? this.value : {};
	                var props = new Array();
	                for (var key in val) {
	                    var newVal = val[key];
	                    var curVal = nextObject[key];
	                    if (curVal) {
	                        curVal.SetValue(newVal);
	                    }
	                    else {
	                        nextObject[key] = new observable_1.default(newVal);
	                    }
	                    props.push(key);
	                }
	                this.value = nextObject;
	                this.objectProperties = props;
	            }
	            else {
	                this.ConvertToValue();
	                if (this.value === val)
	                    skipEventFiring = true;
	                else
	                    this.value = val;
	            }
	            this.ReconcileProperties(startProperties);
	            if (!skipEventFiring) {
	                this.FireEvent("set");
	            }
	        },
	        enumerable: true,
	        configurable: true
	    });
	    ObservableValue.prototype.valueOf = function () {
	        return this.Value;
	    };
	    ObservableValue.prototype.toString = function () {
	        var val = this.valueOf();
	        return val && val.toString();
	    };
	    ObservableValue.prototype.RemoveNode = function (node) {
	        var ind = this.parentNodes.indexOf(node);
	        if (ind >= 0) {
	            this.parentNodes.splice(ind, 1);
	            this.RemoveProperties(node, this.Properties);
	            if (this.valueType == ObservableValueType.Array)
	                this.RemoveArrayMixin(node);
	        }
	    };
	    ObservableValue.prototype.AddNode = function (node) {
	        var ind = this.parentNodes.indexOf(node);
	        if (ind < 0) {
	            this.parentNodes.push(node);
	            this.AddProperties(node, this.Properties);
	            if (this.valueType == ObservableValueType.Array)
	                this.AddArrayMixin(node);
	            node.Fire("set", node);
	        }
	    };
	    ObservableValue.prototype.FireEvent = function (event) {
	        for (var x = 0; x < this.parentNodes.length; x++)
	            this.parentNodes[x].Fire(event, this.parentNodes[x]);
	    };
	    ObservableValue.prototype.ReconcileProperties = function (actualProperties) {
	        var lostProperties = actualProperties.slice();
	        var newProperties = this.Properties.slice();
	        var addedProperties = new Array();
	        for (var x = 0; x < newProperties.length; x++) {
	            var ind = lostProperties.indexOf(newProperties[x]);
	            if (ind >= 0)
	                lostProperties.splice(ind, 1);
	            else
	                addedProperties.push(newProperties[x]);
	        }
	        this.RemovePropertiesFromParents(lostProperties);
	        this.AddPropertiesToParents(addedProperties);
	    };
	    ObservableValue.prototype.ConvertToArray = function () {
	        if (this.valueType == ObservableValueType.Array)
	            return;
	        if (this.valueType == ObservableValueType.Object) {
	            this.RemovePropertiesFromParents(this.Properties);
	            this.objectProperties = [];
	        }
	        this.AddArrayMixinToParents();
	        this.valueType = ObservableValueType.Array;
	    };
	    ObservableValue.prototype.ConvertToObject = function () {
	        if (this.valueType == ObservableValueType.Object)
	            return;
	        if (this.valueType == ObservableValueType.Array) {
	            this.RemoveArrayMixinFromParents();
	            this.RemovePropertiesFromParents(this.Properties);
	            this.arrayProperties = [];
	        }
	        this.valueType = ObservableValueType.Object;
	    };
	    ObservableValue.prototype.ConvertToValue = function () {
	        if (this.valueType == ObservableValueType.Value)
	            return;
	        if (this.valueType == ObservableValueType.Array) {
	            this.RemoveArrayMixinFromParents();
	            this.RemovePropertiesFromParents(this.Properties);
	            this.arrayProperties = [];
	        }
	        else if (this.valueType == ObservableValueType.Object) {
	            this.RemovePropertiesFromParents(this.Properties);
	            this.objectProperties = [];
	        }
	        this.valueType = ObservableValueType.Value;
	    };
	    ObservableValue.prototype.AddPropertiesToParents = function (properties) {
	        for (var x = 0; x < this.parentNodes.length; x++)
	            this.AddProperties(this.parentNodes[x], properties);
	    };
	    ObservableValue.prototype.AddProperties = function (object, properties) {
	        var _this = this;
	        properties.forEach(function (c, i) {
	            Object.defineProperty(object, c, {
	                get: function () {
	                    return _this.value[c];
	                },
	                set: function (val) {
	                    _this.value[c].SetValue(val);
	                },
	                enumerable: true,
	                configurable: true
	            });
	        });
	    };
	    ObservableValue.prototype.RemovePropertiesFromParents = function (properties) {
	        for (var x = 0; x < this.parentNodes.length; x++)
	            this.RemoveProperties(this.parentNodes[x], properties);
	    };
	    ObservableValue.prototype.RemoveProperties = function (object, properties) {
	        for (var x = 0; x < properties.length; x++) {
	            delete object[properties[x]];
	        }
	    };
	    ObservableValue.prototype.AddArrayMixinToParents = function () {
	        for (var x = 0; x < this.parentNodes.length; x++) {
	            this.AddArrayMixin(this.parentNodes[x]);
	        }
	    };
	    ObservableValue.prototype.AddArrayMixin = function (object) {
	        var _this = this;
	        Object.defineProperty(object, "length", {
	            get: function () { return _this.value.length; },
	            enumerable: false,
	            configurable: true
	        });
	        Object.defineProperty(object, "push", {
	            value: function (newVal) {
	                _this.AddPropertiesToParents([_this.value.length]);
	                var newObs = new observable_1.default(newVal);
	                var ret = _this.value.push(newObs);
	                _this.FireEvent("set");
	                return ret;
	            },
	            enumerable: false,
	            configurable: true
	        });
	        Object.defineProperty(object, "splice", {
	            value: function (startIndex, count) {
	                var args = [];
	                for (var _i = 2; _i < arguments.length; _i++) {
	                    args[_i - 2] = arguments[_i];
	                }
	                var startProperties = _this.Properties;
	                startIndex = startIndex || 0;
	                count = typeof count == 'undefined' ? _this.value.length - startIndex : count;
	                if (startIndex + count > _this.value.length)
	                    count = _this.value.length - startIndex;
	                var tailLength = _this.value.length - (startIndex + count);
	                var tail = [];
	                for (var x = 0; x < tailLength; x++)
	                    tail.push(_this.value[startIndex + count + x].valueOf());
	                var ret = [];
	                for (var x = 0; x < count; x++)
	                    ret.push(_this.value[startIndex + x].valueOf());
	                for (var x = 0; x < args.length + tailLength; x++) {
	                    var index = x + startIndex;
	                    var value = x < args.length ? args[x] : tail[x - args.length];
	                    if (index < _this.value.length)
	                        _this.value[index].SetValue(value);
	                    else
	                        _this.value.push(new observable_1.default(value));
	                }
	                _this.value.splice(startIndex + args.length + tailLength);
	                _this.ReconcileProperties(startProperties);
	                _this.FireEvent("set");
	                return ret;
	            },
	            enumerable: false,
	            configurable: true
	        });
	        Object.defineProperty(object, symbol_1.default.iterator, {
	            get: function () {
	                return _this.valueOf()[symbol_1.default.iterator];
	            },
	            enumerable: false,
	            configurable: true
	        });
	    };
	    ObservableValue.prototype.RemoveArrayMixinFromParents = function () {
	        for (var x = 0; x < this.parentNodes.length; x++) {
	            this.RemoveArrayMixin(this.parentNodes[x]);
	        }
	    };
	    ObservableValue.prototype.RemoveArrayMixin = function (object) {
	        delete object["length"];
	        delete object["push"];
	        delete object["splice"];
	        delete object[symbol_1.default.iterator];
	    };
	    return ObservableValue;
	}());
	var ObservableValue;
	(function (ObservableValue) {
	    function Unwrap(value) {
	        if (value.ValueType == ObservableValueType.Value)
	            return value.Value;
	        var returnValue = value.ValueType == ObservableValueType.Array ? [] : {};
	        var properties = value.Properties;
	        for (var x = 0; x < properties.length; x++) {
	            returnValue[properties[x]] = observable_1.default.Unwrap(value.Value[properties[x]]);
	        }
	        return returnValue;
	    }
	    ObservableValue.Unwrap = Unwrap;
	})(ObservableValue || (ObservableValue = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ObservableValue;


/***/ }),
/* 5 */
/***/ (function(module, exports) {

	"use strict";
	var supported = typeof Symbol != "undefined";
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = {
	    get __supported() {
	        return supported;
	    },
	    get iterator() {
	        if (supported)
	            return Symbol.iterator;
	        return "Symbol.iterator";
	    }
	};


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var bindingTemplate_1 = __webpack_require__(7);
	function CreateFunction(value) {
	    return function () { return value; };
	}
	var Component = (function () {
	    function Component() {
	        this.parentTemplates = this.DefaultTemplates;
	    }
	    Object.defineProperty(Component.prototype, "BindingTemplate", {
	        get: function () {
	            if (!this.bindingTemplate) {
	                this.bindingTemplate = new bindingTemplate_1.BindingTemplate(this.Template);
	                this.bindingTemplate.AddListener("updating", this.Updating.bind(this));
	                this.bindingTemplate.AddListener("updated", this.Updated.bind(this));
	            }
	            return this.bindingTemplate;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Component.prototype, "Template", {
	        get: function () { },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Component.prototype, "DefaultTemplates", {
	        get: function () {
	            return {};
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Component.prototype, "Templates", {
	        get: function () {
	            return this.parentTemplates;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Component.prototype, "Attached", {
	        get: function () {
	            return this.BindingTemplate.Attached;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Component.prototype.SetParentData = function (data) { };
	    Component.prototype.SetParentTemplates = function (parentTemplates) {
	        for (var key in parentTemplates) {
	            if (typeof parentTemplates[key] != 'function')
	                this.parentTemplates[key] = CreateFunction(parentTemplates[key]);
	            else
	                this.parentTemplates[key] = parentTemplates[key];
	        }
	    };
	    Component.prototype.AttachTo = function (element) {
	        this.BindingTemplate.AttachTo(element);
	    };
	    Component.prototype.Detach = function () {
	        this.BindingTemplate.Detach();
	    };
	    Component.prototype.Destroy = function () {
	        this.BindingTemplate.Destroy();
	    };
	    Component.prototype.Updating = function () { };
	    Component.prototype.Updated = function () { };
	    return Component;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Component;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var browser_1 = __webpack_require__(1);
	var template_1 = __webpack_require__(8);
	var textBinding_1 = __webpack_require__(9);
	var propertyBinding_1 = __webpack_require__(13);
	var dataBinding_1 = __webpack_require__(14);
	var eventBinding_1 = __webpack_require__(15);
	var componentBinding_1 = __webpack_require__(16);
	var TemplateType;
	(function (TemplateType) {
	    TemplateType[TemplateType["Element"] = 0] = "Element";
	    TemplateType[TemplateType["Text"] = 1] = "Text";
	})(TemplateType || (TemplateType = {}));
	function GetTemplateType(template) {
	    if (template.text)
	        return TemplateType.Text;
	    return TemplateType.Element;
	}
	function AppendText(template, node) {
	    var text = template.text;
	    var textNode = browser_1.default.window.document.createTextNode("");
	    node.appendChild(textNode);
	    return new textBinding_1.default(textNode, text);
	}
	function ReadElementProperties(node, properties, parentProperties) {
	    parentProperties = parentProperties || [];
	    var bindings = [];
	    for (var key in properties) {
	        var value = properties[key];
	        if (typeof value == 'object') {
	            var childBindings = ReadElementProperties(node, value, parentProperties.concat([key]));
	            for (var x = 0; x < childBindings.length; x++)
	                bindings.push(childBindings[x]);
	        }
	        else {
	            bindings.push(new propertyBinding_1.default(node, parentProperties.concat([key]), value));
	        }
	    }
	    return bindings;
	}
	function AppendElement(template, node) {
	    var data = null;
	    var children = null;
	    var events;
	    var component;
	    var elementName = null;
	    var properties = null;
	    var templates = null;
	    for (var key in template) {
	        switch (key) {
	            case "children":
	                children = template.children;
	                break;
	            case "data":
	                data = template.data;
	                break;
	            case "on":
	                events = template.on;
	                break;
	            case "component":
	                component = template.component;
	                break;
	            case "templates":
	                templates = template.templates;
	                break;
	            default:
	                elementName = key;
	                properties = template[key];
	                break;
	        }
	    }
	    var elementNode = browser_1.default.window.document.createElement(elementName);
	    node.appendChild(elementNode);
	    var bindings = ReadElementProperties(elementNode, properties);
	    for (var key in events)
	        bindings.push(new eventBinding_1.default(elementNode, key, events[key]));
	    if (component) {
	        bindings.push(new componentBinding_1.default(elementNode, data, component, templates));
	    }
	    else if (children) {
	        bindings.push(new dataBinding_1.default(elementNode, data, children));
	    }
	    return bindings;
	}
	function ReadBindingTemplate(template, rootNode, bindings) {
	    if (!template)
	        return [];
	    if (!Array.isArray(template))
	        template = [template];
	    bindings = bindings || [];
	    for (var x = 0; x < template.length; x++) {
	        var tempObj = template[x];
	        var type = GetTemplateType(tempObj);
	        switch (type) {
	            case TemplateType.Text:
	                var textBinding = AppendText(tempObj, rootNode);
	                if (textBinding)
	                    bindings.push(textBinding);
	                break;
	            case TemplateType.Element:
	                var elementBindings = AppendElement(tempObj, rootNode);
	                for (var y = 0; y < elementBindings.length; y++)
	                    bindings.push(elementBindings[y]);
	                break;
	        }
	    }
	    return bindings;
	}
	var BindingTemplate = (function (_super) {
	    __extends(BindingTemplate, _super);
	    function BindingTemplate(template) {
	        var documentFragment = browser_1.default.createDocumentFragment();
	        var bindings = ReadBindingTemplate(template, documentFragment);
	        _super.call(this, documentFragment);
	        this.bindings = bindings;
	        this.updatingBindings = [];
	        this.updatingCallback = this.Updating.bind(this);
	        this.updatedCallback = this.Updated.bind(this);
	    }
	    BindingTemplate.prototype.AttachTo = function (element) {
	        if (this.destroyed)
	            throw "Cannot attach destroyed BindingTemplate";
	        this.Bind();
	        _super.prototype.AttachTo.call(this, element);
	    };
	    BindingTemplate.prototype.Bind = function () {
	        var _this = this;
	        if (this.bound)
	            return;
	        this.bindings.forEach(function (c) {
	            c.AddListener("updating", _this.updatingCallback);
	            c.AddListener("updated", _this.updatedCallback);
	            c.Update();
	        });
	        this.bound = true;
	    };
	    BindingTemplate.prototype.Destroy = function () {
	        this.ClearAll();
	        this.Detach();
	        this.bindings.forEach(function (c) { return c.Destroy(); });
	        this.destroyed = true;
	    };
	    BindingTemplate.prototype.Updating = function (binding) {
	        var index = this.updatingBindings.indexOf(binding);
	        if (index < 0)
	            this.updatingBindings.push(binding);
	        if (this.updatingBindings.length == 1 && index < 0)
	            this.Fire("updating", this);
	    };
	    BindingTemplate.prototype.Updated = function (binding) {
	        var index = this.updatingBindings.indexOf(binding);
	        if (index >= 0)
	            this.updatingBindings.splice(index, 1);
	        if (this.updatingBindings.length == 0)
	            this.Fire("updated", this);
	    };
	    return BindingTemplate;
	}(template_1.default));
	exports.BindingTemplate = BindingTemplate;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var browser_1 = __webpack_require__(1);
	var emitter_1 = __webpack_require__(3);
	var Template = (function (_super) {
	    __extends(Template, _super);
	    function Template(documentFragment) {
	        _super.call(this);
	        this.documentFragment = documentFragment;
	        this.elements = new Array(this.documentFragment.childNodes.length);
	        for (var x = 0; x < this.documentFragment.childNodes.length; x++) {
	            this.elements.push(this.documentFragment.childNodes[x]);
	        }
	    }
	    Object.defineProperty(Template.prototype, "DocumentFragment", {
	        get: function () {
	            return this.documentFragment;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Template.prototype, "Attached", {
	        get: function () {
	            return !!this.attachedTo;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Template.prototype.AttachTo = function (element) {
	        if (this.attachedTo)
	            this.Detach();
	        this.attachedTo = element;
	        element.appendChild(this.documentFragment);
	    };
	    Template.prototype.Detach = function () {
	        var _this = this;
	        if (!this.Attached)
	            return;
	        this.attachedTo = null;
	        this.elements.forEach(function (c) {
	            return _this.documentFragment.appendChild(c);
	        });
	    };
	    Template.prototype.Clone = function () {
	        if (this.Attached)
	            throw "Template cannot be cloned while attached";
	        var fragment = this.documentFragment.cloneNode(true);
	        return new Template(fragment);
	    };
	    return Template;
	}(emitter_1.default));
	var Template;
	(function (Template) {
	    function Create(template) {
	        if (template instanceof Template)
	            return template.Clone();
	        var frag = browser_1.default.createDocumentFragment(template);
	        return new Template(frag);
	    }
	    Template.Create = Create;
	})(Template || (Template = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Template;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var nodeBinding_1 = __webpack_require__(10);
	var TextBinding = (function (_super) {
	    __extends(TextBinding, _super);
	    function TextBinding(element, binding) {
	        _super.call(this, element, binding);
	    }
	    TextBinding.prototype.Apply = function () {
	        this.BoundTo.textContent = this.Value;
	    };
	    return TextBinding;
	}(nodeBinding_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = TextBinding;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var binding_1 = __webpack_require__(11);
	var browser_1 = __webpack_require__(1);
	var pendingUpdates = [];
	var updateScheduled = false;
	function ScheduleUpdate(callback) {
	    var ind = pendingUpdates.indexOf(callback);
	    if (ind < 0) {
	        pendingUpdates.push(callback);
	    }
	    if (!updateScheduled) {
	        updateScheduled = true;
	        browser_1.default.requestAnimationFrame(function () {
	            updateScheduled = false;
	            while (pendingUpdates.length > 0)
	                pendingUpdates.shift()();
	        });
	    }
	}
	var NodeBinding = (function (_super) {
	    __extends(NodeBinding, _super);
	    function NodeBinding(boundTo, binding) {
	        _super.call(this, boundTo, binding, ScheduleUpdate);
	    }
	    return NodeBinding;
	}(binding_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = NodeBinding;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var observableScope_1 = __webpack_require__(12);
	var emitter_1 = __webpack_require__(3);
	var BindingStatus;
	(function (BindingStatus) {
	    BindingStatus[BindingStatus["Init"] = 0] = "Init";
	    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
	    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
	})(BindingStatus || (BindingStatus = {}));
	var Binding = (function (_super) {
	    __extends(Binding, _super);
	    function Binding(boundTo, binding, scheduleUpdate) {
	        _super.call(this);
	        this.boundTo = boundTo;
	        this.scheduleUpdate = scheduleUpdate;
	        this.status = BindingStatus.Init;
	        this.setCallback = this.Update.bind(this);
	        if (typeof binding == 'function')
	            this.observableScope = new observableScope_1.default(binding);
	        else
	            this.observableScope = new observableScope_1.default(function () { return binding; });
	        this.observableScope.AddListener("set", this.setCallback);
	    }
	    Object.defineProperty(Binding.prototype, "Value", {
	        get: function () {
	            return this.observableScope.Value;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Binding.prototype, "BoundTo", {
	        get: function () {
	            return this.boundTo;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Binding.prototype.Update = function () {
	        var _this = this;
	        if (this.status != BindingStatus.Init) {
	            this.Updating();
	            this.scheduleUpdate(function () {
	                _this.Apply();
	                _this.Updated();
	            });
	        }
	        else {
	            this.Apply();
	            this.status = BindingStatus.Updated;
	        }
	    };
	    Binding.prototype.Destroy = function () {
	        this.ClearAll();
	        this.observableScope.Destroy();
	    };
	    Binding.prototype.Updating = function () {
	        if (this.status != BindingStatus.Updating) {
	            this.Fire("updating", this);
	            this.status = BindingStatus.Updating;
	        }
	    };
	    Binding.prototype.Updated = function () {
	        if (this.status != BindingStatus.Updated) {
	            this.Fire("updated", this);
	            this.status = BindingStatus.Updated;
	        }
	    };
	    return Binding;
	}(emitter_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Binding;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var emitter_1 = __webpack_require__(3);
	var observable_1 = __webpack_require__(2);
	var ObservableScope = (function (_super) {
	    __extends(ObservableScope, _super);
	    function ObservableScope(observableFunction) {
	        _super.call(this);
	        this.dirty = true;
	        this.observableFunction = observableFunction;
	        this.childObservables = [];
	        this.setCallback = this.SetCallback.bind(this);
	    }
	    Object.defineProperty(ObservableScope.prototype, "Value", {
	        get: function () {
	            this.Fire("get", this);
	            if (!this.dirty)
	                return this.value;
	            this.UpdateValue();
	            return this.value;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    ObservableScope.prototype.Destroy = function () {
	        var _this = this;
	        this.ClearAll();
	        for (var x = 0; x < this.childObservables.length; x++)
	            this.childObservables.forEach(function (c) { return _this.RemoveListeners(c); });
	    };
	    ObservableScope.prototype.UpdateValue = function () {
	        var _this = this;
	        var newObservables = observable_1.default.Watch("get", function () {
	            _this.value = _this.observableFunction();
	            if (_this.value instanceof observable_1.default)
	                _this.value = _this.value.valueOf();
	        });
	        for (var x = 0; x < newObservables.length; x++) {
	            var ind = this.childObservables.indexOf(newObservables[x]);
	            if (ind < 0)
	                this.AddListeners(newObservables[x]);
	            else
	                this.childObservables.splice(ind, 1);
	        }
	        for (var y = 0; y < this.childObservables.length; y++)
	            this.RemoveListeners(this.childObservables[y]);
	        this.childObservables = newObservables;
	        this.dirty = false;
	    };
	    ObservableScope.prototype.SetCallback = function (observable) {
	        this.dirty = true;
	        this.Fire("set", this);
	    };
	    ObservableScope.prototype.AddListeners = function (observable) {
	        observable.AddListener("set", this.setCallback);
	    };
	    ObservableScope.prototype.RemoveListeners = function (observable) {
	        observable.RemoveListener("set", this.setCallback);
	    };
	    return ObservableScope;
	}(emitter_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ObservableScope;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var nodeBinding_1 = __webpack_require__(10);
	var PropertyBinding = (function (_super) {
	    __extends(PropertyBinding, _super);
	    function PropertyBinding(boundTo, propertyPath, bindingFunction) {
	        _super.call(this, boundTo, bindingFunction);
	        this.parentObject = this.BoundTo;
	        var x = 0;
	        for (; x < propertyPath.length - 1; x++)
	            this.parentObject = this.parentObject[propertyPath[x]];
	        this.propName = propertyPath[x];
	    }
	    PropertyBinding.prototype.Apply = function () {
	        this.parentObject[this.propName] = this.Value;
	    };
	    return PropertyBinding;
	}(nodeBinding_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = PropertyBinding;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var nodeBinding_1 = __webpack_require__(10);
	var bindingTemplate_1 = __webpack_require__(7);
	var browser_1 = __webpack_require__(1);
	var DataBinding = (function (_super) {
	    __extends(DataBinding, _super);
	    function DataBinding(boundTo, binding, children) {
	        _super.call(this, boundTo, binding);
	        this.childTemplates = [];
	        this.updatingTemplates = [];
	        if (typeof children != 'function')
	            this.templateFunction = function () { return children; };
	        else
	            this.templateFunction = children;
	    }
	    DataBinding.prototype.Destroy = function () {
	        for (var x = 0; x < this.childTemplates.length; x++)
	            this.childTemplates[x].Destroy();
	    };
	    DataBinding.prototype.Apply = function () {
	        var currentLength = this.childTemplates.length;
	        var newValue = this.Value;
	        if (!Array.isArray(newValue))
	            newValue = [newValue];
	        if (currentLength > newValue.length) {
	            var oldComponents = this.childTemplates.splice(newValue.length);
	            oldComponents.forEach(function (c) {
	                c.Destroy();
	            });
	        }
	        else if (currentLength < newValue.length) {
	            var frag = browser_1.default.createDocumentFragment();
	            for (var x = currentLength; x < newValue.length; x++) {
	                var temp = this.templateFunction(newValue[x], x);
	                var newTemplate = new bindingTemplate_1.BindingTemplate(temp);
	                newTemplate.AddListener("updating", this.TemplateUpdating.bind(this));
	                newTemplate.AddListener("updated", this.TemplateUpdated.bind(this));
	                newTemplate.AttachTo(frag);
	                this.childTemplates.push(newTemplate);
	            }
	            this.BoundTo.appendChild(frag);
	        }
	    };
	    DataBinding.prototype.Updated = function () {
	        if (this.updatingTemplates.length == 0)
	            _super.prototype.Updated.call(this);
	    };
	    DataBinding.prototype.TemplateUpdating = function (template) {
	        var index = this.updatingTemplates.indexOf(template);
	        if (index < 0)
	            this.updatingTemplates.push(template);
	        this.Updating();
	    };
	    DataBinding.prototype.TemplateUpdated = function (template) {
	        var index = this.updatingTemplates.indexOf(template);
	        if (index >= 0)
	            this.updatingTemplates.splice(index, 1);
	        this.Updated();
	    };
	    return DataBinding;
	}(nodeBinding_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = DataBinding;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var nodeBinding_1 = __webpack_require__(10);
	var EventBinding = (function (_super) {
	    __extends(EventBinding, _super);
	    function EventBinding(element, eventName, bindingFunction) {
	        _super.call(this, element, bindingFunction);
	        this.eventName = eventName;
	    }
	    EventBinding.prototype.Destroy = function () {
	        this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
	    };
	    EventBinding.prototype.Apply = function () {
	        if (this.eventCallback)
	            this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
	        this.eventCallback = this.Value;
	        this.BoundTo.addEventListener(this.eventName, this.eventCallback);
	    };
	    return EventBinding;
	}(nodeBinding_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = EventBinding;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var nodeBinding_1 = __webpack_require__(10);
	var component_1 = __webpack_require__(6);
	function CreateBindingFunction(binding, component) {
	    var bindingFunc = binding;
	    if (typeof bindingFunc != 'function')
	        bindingFunc = function () { return binding; };
	    var componentFunc = component;
	    if (typeof componentFunc != 'function' || componentFunc.prototype instanceof component_1.default)
	        componentFunc = function () { return component; };
	    return function () {
	        var b = bindingFunc();
	        var c = componentFunc();
	        return {
	            value: b && b.valueOf(),
	            component: c && c.valueOf()
	        };
	    };
	}
	function EnsureFunction(value) {
	    if (typeof value == 'function')
	        return value;
	    return function () { return value; };
	}
	var ComponentBinding = (function (_super) {
	    __extends(ComponentBinding, _super);
	    function ComponentBinding(element, binding, compType, parentTemplates) {
	        binding = binding && binding.valueOf();
	        compType = compType && compType.valueOf();
	        var newBinding = CreateBindingFunction(binding, compType);
	        _super.call(this, element, newBinding);
	        this.parentTemplates = {};
	        for (var key in parentTemplates)
	            this.parentTemplates[key] = EnsureFunction(parentTemplates[key]);
	    }
	    ComponentBinding.prototype.Destroy = function () {
	        this.component.Destroy();
	    };
	    ComponentBinding.prototype.Apply = function () {
	        var component = this.Value.component;
	        var value = this.Value.value;
	        if (!component) {
	            this.component.Destroy();
	            return;
	        }
	        if (!this.component || !(this.component instanceof component)) {
	            this.component && this.component.Destroy();
	            this.component = new component();
	            this.component.SetParentTemplates(this.parentTemplates);
	        }
	        this.component.SetParentData(this.Value.value);
	        if (!this.component.Attached)
	            this.component.AttachTo(this.BoundTo);
	    };
	    return ComponentBinding;
	}(nodeBinding_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ComponentBinding;


/***/ })
/******/ ]);