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
	var observable_1 = __webpack_require__(1);
	var browser_1 = __webpack_require__(5);
	var component_1 = __webpack_require__(6);
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


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var emitter_1 = __webpack_require__(2);
	var observableValue_1 = __webpack_require__(3);
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
/* 2 */
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
	    return Emitter;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Emitter;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var observable_1 = __webpack_require__(1);
	var symbol_1 = __webpack_require__(4);
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
	        var self = this;
	        properties.forEach(function (c, i) {
	            Object.defineProperty(object, c, {
	                get: function () {
	                    return self.value[c];
	                },
	                set: function (val) {
	                    self.value[c].SetValue(val);
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
	        var self = this;
	        Object.defineProperty(object, "length", {
	            get: function () {
	                return self.value.length;
	            },
	            enumerable: false,
	            configurable: true
	        });
	        Object.defineProperty(object, "push", {
	            value: function (newVal) {
	                self.AddPropertiesToParents([self.value.length]);
	                var newObs = new observable_1.default(newVal);
	                var ret = self.value.push(newObs);
	                self.FireEvent("set");
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
	                var startProperties = self.Properties;
	                startIndex = startIndex || 0;
	                count = count || self.value.length - startIndex;
	                if (startIndex + count > self.value.length)
	                    count = self.value.length - startIndex;
	                var tailLength = self.value.length - (startIndex + count);
	                var tail = [];
	                for (var x = 0; x < tailLength; x++)
	                    tail.push(self.value[startIndex + count + x]);
	                var ret = [];
	                for (var x = 0; x < count; x++)
	                    ret.push(self.value[startIndex + x].valueOf());
	                for (var x = 0; x < args.length + tailLength; x++) {
	                    var index = x + startIndex;
	                    var value = x < args.length ? args[x] : tail[x - args.length];
	                    if (index < self.value.length)
	                        self.value[index].SetValue(value);
	                    else
	                        self.value.push(new observable_1.default(value));
	                }
	                self.value.splice(startIndex + args.length + tailLength);
	                self.ReconcileProperties(startProperties);
	                self.FireEvent("set");
	                return ret;
	            },
	            enumerable: false,
	            configurable: true
	        });
	        Object.defineProperty(object, symbol_1.default.iterator, {
	            get: function () {
	                return self.valueOf()[symbol_1.default.iterator];
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
/* 4 */
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
/* 5 */
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
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var componentBase_1 = __webpack_require__(7);
	var Component = (function (_super) {
	    __extends(Component, _super);
	    function Component() {
	        _super.call(this);
	        this.SetTemplate(this.Template);
	    }
	    Object.defineProperty(Component, "Name", {
	        get: function () {
	            return null;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Component.prototype, "Template", {
	        get: function () { },
	        enumerable: true,
	        configurable: true
	    });
	    Component.prototype.SetParentData = function (data) {
	        this.parentData = data;
	    };
	    Component.prototype.BindingParameters = function () {
	        var params = _super.prototype.BindingParameters.call(this);
	        params["$parent"] = this.parentData;
	        return params;
	    };
	    Component.toString = function () {
	        Component.Register(this);
	        return this.Name;
	    };
	    return Component;
	}(componentBase_1.default));
	var Component;
	(function (Component) {
	    var componentMap = {};
	    function Register(constructor) {
	        var name = constructor.Name.toLowerCase();
	        var comp = componentMap[name];
	        if (!comp)
	            componentMap[name] = constructor;
	    }
	    Component.Register = Register;
	    function Get(name) {
	        var comp = componentMap[name.toLowerCase()];
	        return comp;
	    }
	    Component.Get = Get;
	    function Exists(name) {
	        return !!Get(name);
	    }
	    Component.Exists = Exists;
	})(Component || (Component = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Component;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var bindings_1 = __webpack_require__(8);
	var template_1 = __webpack_require__(16);
	var ComponentBase = (function () {
	    function ComponentBase() {
	        this.destroyed = false;
	        this.bound = false;
	    }
	    Object.defineProperty(ComponentBase.prototype, "Attached", {
	        get: function () {
	            return this.template.Attached;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    ComponentBase.prototype.AttachTo = function (element) {
	        if (this.destroyed)
	            throw "Can't attach destroyed component";
	        if (!this.bound) {
	            this.bindings = bindings_1.default.Bind(this.template.DocumentFragment, this.BindingParameters());
	            this.bindings.forEach(function (c) { return c.Update(); });
	            this.bound = true;
	        }
	        this.template.AttachTo(element);
	    };
	    ComponentBase.prototype.Detach = function () {
	        this.template.Detach();
	    };
	    ComponentBase.prototype.Destroy = function () {
	        this.Detach();
	        this.bindings.forEach(function (c) {
	            c.Destroy();
	        });
	        this.destroyed = true;
	    };
	    ComponentBase.prototype.SetChildElements = function (fragments) {
	        if (this.bound)
	            throw "Child elements can't be set after component is bound";
	        this.template.OverwriteChildElements(fragments);
	    };
	    ComponentBase.prototype.SetTemplate = function (template) {
	        this.template = template_1.default.Create(template);
	    };
	    ComponentBase.prototype.BindingParameters = function () {
	        return {
	            $comp: this
	        };
	    };
	    return ComponentBase;
	}());
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ComponentBase;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var browser_1 = __webpack_require__(5);
	var Bindings;
	(function (Bindings) {
	    var pendingUpdates = [];
	    var updateScheduled = false;
	    function BindingMethods() {
	        return [
	            __webpack_require__(9).default.Create,
	            __webpack_require__(12).default.Create,
	            __webpack_require__(13).default.Create,
	            __webpack_require__(13).default.Create,
	            __webpack_require__(15).default.Create,
	            __webpack_require__(18).default.Create
	        ];
	    }
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
	    Bindings.ScheduleUpdate = ScheduleUpdate;
	    function Bind(element, parameters) {
	        var bindingMethods = BindingMethods();
	        var ret = [];
	        var skipChildren = false;
	        if (element.nodeType != element.DOCUMENT_FRAGMENT_NODE) {
	            for (var x = 0; x < bindingMethods.length; x++) {
	                var bindings = bindingMethods[x](element, parameters, ScheduleUpdate);
	                for (var y = 0; y < bindings.length; y++) {
	                    skipChildren = skipChildren || bindings[y].BindsChildren;
	                    ret.push(bindings[y]);
	                }
	            }
	        }
	        for (var z = 0; z < element.childNodes.length && !skipChildren; z++) {
	            var childBindings = Bind(element.childNodes[z], parameters);
	            for (var i = 0; i < childBindings.length; i++)
	                ret.push(childBindings[i]);
	        }
	        return ret;
	    }
	    Bindings.Bind = Bind;
	})(Bindings || (Bindings = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Bindings;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var binding_1 = __webpack_require__(10);
	var TextBinding = (function (_super) {
	    __extends(TextBinding, _super);
	    function TextBinding(element, parameters, scheduleUpdate) {
	        _super.call(this, element, element.textContent, parameters, scheduleUpdate);
	    }
	    TextBinding.prototype.Apply = function () {
	        this.BoundTo.textContent = this.Value;
	    };
	    return TextBinding;
	}(binding_1.default));
	var TextBinding;
	(function (TextBinding) {
	    function Create(element, bindingParameters, scheduleUpdate) {
	        if (element.nodeType == element.TEXT_NODE && binding_1.default.IsExpression(element.textContent))
	            return [new TextBinding(element, bindingParameters, scheduleUpdate)];
	        return [];
	    }
	    TextBinding.Create = Create;
	})(TextBinding || (TextBinding = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = TextBinding;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var observable_1 = __webpack_require__(1);
	var syntax_1 = __webpack_require__(11);
	var Binding = (function () {
	    function Binding(boundTo, expression, parameters, scheduleUpdate) {
	        var _this = this;
	        this.boundTo = boundTo;
	        this.observables = [];
	        this.setCallback = function (obs) { _this.Update(); };
	        this.applyCallback = function () { _this.Apply(); };
	        this.scheduleUpdate = scheduleUpdate;
	        this.parameters = parameters;
	        this.parameterNames = [];
	        this.parameterValues = [];
	        for (var key in parameters) {
	            this.parameterNames.push(key);
	            this.parameterValues.push(parameters[key]);
	        }
	        this.bindingFunction = Binding.ParseExpression(expression, this.parameterNames);
	    }
	    Object.defineProperty(Binding.prototype, "BindsChildren", {
	        get: function () {
	            return false;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Binding.prototype, "Value", {
	        get: function () {
	            return this.value;
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
	    Object.defineProperty(Binding.prototype, "Parameters", {
	        get: function () {
	            return this.parameters;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Binding.prototype.Destroy = function () {
	        var _this = this;
	        this.observables.forEach(function (c) {
	            c.RemoveListener("set", _this.setCallback);
	        });
	        this.value = null;
	    };
	    Binding.prototype.AddListeners = function (observable) {
	        observable.AddListener("set", this.setCallback);
	    };
	    Binding.prototype.RemoveListeners = function (observable) {
	        observable.RemoveListener("set", this.setCallback);
	    };
	    Binding.prototype.ScheduleUpdate = function (updateCallback) {
	        this.scheduleUpdate(updateCallback);
	    };
	    Binding.prototype.ProcessValue = function (value) {
	        return value;
	    };
	    Binding.prototype.Update = function () {
	        var _this = this;
	        var obs = observable_1.default.Watch("get", function () {
	            var bindingResult = _this.bindingFunction.apply(_this, _this.parameterValues);
	            _this.value = _this.ProcessValue(bindingResult);
	        });
	        var curObs = this.observables;
	        for (var x = 0; x < obs.length; x++) {
	            var ind = curObs.indexOf(obs[x]);
	            if (ind < 0) {
	                this.AddListeners(obs[x]);
	            }
	            else
	                curObs.splice(ind, 1);
	        }
	        for (var y = 0; y < curObs.length; y++) {
	            this.RemoveListeners(curObs[y]);
	        }
	        this.observables = obs;
	        this.ScheduleUpdate(this.applyCallback);
	    };
	    return Binding;
	}());
	var Binding;
	(function (Binding) {
	    var spreadArrayRgx = /\[(.*\.\.\..*)\]/;
	    var spreadOpRgx = /\.\.\.([^,]+)/g;
	    function FixSyntax(codeStr) {
	        var retStr = codeStr;
	        if (!syntax_1.default.spread && spreadArrayRgx.test(codeStr)) {
	            retStr = retStr.replace(spreadArrayRgx, function (match, g1) {
	                var retArr = g1.replace(spreadOpRgx, function (match, g1) {
	                    return g1 + ".valueOf()";
	                });
	                return "Array.prototype.concat.call(" + retArr + ")";
	            });
	        }
	        return retStr;
	    }
	    var expRgx = /{{(.+?)}}/;
	    function ParseExpression(expression, parameters) {
	        if (!expression)
	            expression = "null";
	        var parts = expression.split(expRgx);
	        if (parts.length > 1) {
	            parts = expression.split(expRgx).map(function (c, i) {
	                if (i % 2 == 0)
	                    return "\"" + c + "\"";
	                else
	                    return FixSyntax("(" + c + ")");
	            });
	        }
	        else
	            parts[0] = FixSyntax(parts[0]);
	        var merge = parts.join(" + ").replace(/[\n\r]/g, "");
	        var funcStr = "return " + merge + ";";
	        var Func = Function.bind.apply(Function, [null].concat(parameters.concat([funcStr])));
	        return new Func();
	    }
	    Binding.ParseExpression = ParseExpression;
	    function IsExpression(expression) {
	        return expRgx.test(expression);
	    }
	    Binding.IsExpression = IsExpression;
	})(Binding || (Binding = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Binding;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var symbol_1 = __webpack_require__(4);
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = {
	    spread: symbol_1.default.__supported
	};


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var binding_1 = __webpack_require__(10);
	var browser_1 = __webpack_require__(5);
	var component_1 = __webpack_require__(6);
	var ComponentBinding = (function (_super) {
	    __extends(ComponentBinding, _super);
	    function ComponentBinding(element, parameters, scheduleUpdate) {
	        var documentFragment = browser_1.default.createDocumentFragment(element);
	        var childFragments = {};
	        for (var x = 0; x < documentFragment.childNodes.length; x++) {
	            var node = documentFragment.childNodes[x];
	            childFragments[node.nodeName] = browser_1.default.createDocumentFragment(node);
	        }
	        var expression = element.getAttribute("j-parent");
	        _super.call(this, element, expression, parameters, scheduleUpdate);
	        var compType = component_1.default.Get(this.BoundTo.nodeName);
	        this.component = new compType();
	        this.component.SetChildElements(childFragments);
	    }
	    Object.defineProperty(ComponentBinding.prototype, "BindsChildren", {
	        get: function () {
	            return true;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    ComponentBinding.prototype.Apply = function () {
	        this.component.SetParentData(this.Value);
	        if (!this.component.Attached)
	            this.component.AttachTo(this.BoundTo);
	    };
	    return ComponentBinding;
	}(binding_1.default));
	var ComponentBinding;
	(function (ComponentBinding) {
	    var componentRgx = /[^-]+-[^-]+/;
	    function Create(element, bindingParameters, scheduleUpdate) {
	        if (element.nodeType == element.ELEMENT_NODE && componentRgx.test(element.nodeName) && component_1.default.Exists(element.nodeName))
	            return [new ComponentBinding(element, bindingParameters, scheduleUpdate)];
	        return [];
	    }
	    ComponentBinding.Create = Create;
	})(ComponentBinding || (ComponentBinding = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ComponentBinding;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var attributeBinding_1 = __webpack_require__(14);
	var eventRgx = /j-on(.+)/;
	var EventBinding = (function (_super) {
	    __extends(EventBinding, _super);
	    function EventBinding(element, attributeName, parameters, scheduleUpdate) {
	        _super.call(this, element, attributeName, parameters, scheduleUpdate);
	        this.eventName = eventRgx.exec(attributeName)[1];
	    }
	    EventBinding.prototype.Apply = function () {
	        if (this.eventCallback)
	            this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
	        this.eventCallback = this.Value;
	        this.BoundTo.addEventListener(this.eventName, this.eventCallback);
	    };
	    return EventBinding;
	}(attributeBinding_1.default));
	var EventBinding;
	(function (EventBinding) {
	    function Create(element, bindingParameters, scheduleUpdate) {
	        var ret = [];
	        if (element.nodeType == element.ELEMENT_NODE) {
	            for (var x = 0; x < element.attributes.length; x++) {
	                var att = element.attributes[x];
	                if (eventRgx.test(att.name))
	                    ret.push(new EventBinding(element, att.name, bindingParameters, scheduleUpdate));
	            }
	        }
	        return ret;
	    }
	    EventBinding.Create = Create;
	})(EventBinding || (EventBinding = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = EventBinding;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var binding_1 = __webpack_require__(10);
	var AttributeBinding = (function (_super) {
	    __extends(AttributeBinding, _super);
	    function AttributeBinding(element, attributeName, parameters, scheduleUpdate) {
	        _super.call(this, element, element.getAttribute(attributeName), parameters, scheduleUpdate);
	        this.attributeName = attributeName;
	    }
	    AttributeBinding.prototype.Apply = function () {
	        this.BoundTo.setAttribute(this.attributeName, this.Value);
	    };
	    return AttributeBinding;
	}(binding_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = AttributeBinding;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var template_1 = __webpack_require__(16);
	var browser_1 = __webpack_require__(5);
	var observable_1 = __webpack_require__(1);
	var attributeBinding_1 = __webpack_require__(14);
	var componentSimple_1 = __webpack_require__(17);
	var arrayRgx = /j-array/;
	var ArrayBinding = (function (_super) {
	    __extends(ArrayBinding, _super);
	    function ArrayBinding(element, parameters, scheduleUpdate) {
	        _super.call(this, element, "j-array", parameters, scheduleUpdate);
	        this.template = template_1.default.Create(this.BoundTo);
	        this.childComponents = [];
	        this.indexObservables = observable_1.default.Create([]);
	    }
	    Object.defineProperty(ArrayBinding.prototype, "BindsChildren", {
	        get: function () {
	            return true;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    ArrayBinding.prototype.Apply = function () {
	        var currentLength = this.childComponents.length;
	        var newValue = this.Value || [];
	        if (currentLength > newValue.length) {
	            var oldComponents = this.childComponents.splice(newValue.length);
	            oldComponents.forEach(function (c) {
	                c.Destroy();
	            });
	        }
	        else {
	            var frag = browser_1.default.createDocumentFragment();
	            for (var x = currentLength; x < newValue.length; x++) {
	                var params = {};
	                for (var key in this.Parameters)
	                    params[key] = this.Parameters[key];
	                params["$index"] = x;
	                var newComponent = new componentSimple_1.default(this.template, newValue[x], params);
	                newComponent.AttachTo(frag);
	                this.childComponents.push(newComponent);
	            }
	            this.BoundTo.appendChild(frag);
	        }
	    };
	    return ArrayBinding;
	}(attributeBinding_1.default));
	var ArrayBinding;
	(function (ArrayBinding) {
	    function Create(element, bindingParameters, scheduleUpdate) {
	        var ret = [];
	        if (element.nodeType == element.ELEMENT_NODE) {
	            for (var x = 0; x < element.attributes.length; x++) {
	                var att = element.attributes[x];
	                if (arrayRgx.test(att.name))
	                    ret.push(new ArrayBinding(element, bindingParameters, scheduleUpdate));
	            }
	        }
	        return ret;
	    }
	    ArrayBinding.Create = Create;
	})(ArrayBinding || (ArrayBinding = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ArrayBinding;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var browser_1 = __webpack_require__(5);
	var Template = (function () {
	    function Template(documentFragment) {
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
	    Template.prototype.OverwriteChildElements = function (childFragments) {
	        if (this.Attached)
	            throw "Can't set child elements while attached";
	        for (var key in childFragments) {
	            var elements = this.DocumentFragment.querySelectorAll(key);
	            for (var x = 0; x < elements.length; x++) {
	                elements[x].innerHTML = "";
	                elements[x].appendChild(childFragments[key]);
	            }
	        }
	    };
	    return Template;
	}());
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
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var componentBase_1 = __webpack_require__(7);
	var ComponentSimple = (function (_super) {
	    __extends(ComponentSimple, _super);
	    function ComponentSimple(template, data, parameterOverrides) {
	        _super.call(this);
	        this.data = data;
	        this.parameterOverrides = parameterOverrides;
	        this.SetTemplate(template);
	    }
	    Object.defineProperty(ComponentSimple.prototype, "Data", {
	        get: function () {
	            return this.data;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    ComponentSimple.prototype.BindingParameters = function () {
	        var params = _super.prototype.BindingParameters.call(this);
	        for (var key in this.parameterOverrides)
	            params[key] = this.parameterOverrides[key];
	        params["$data"] = this.Data;
	        return params;
	    };
	    return ComponentSimple;
	}(componentBase_1.default));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ComponentSimple;


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var attributeBinding_1 = __webpack_require__(14);
	var propRgx = /j-prop.(.*)/;
	var PropertyBinding = (function (_super) {
	    __extends(PropertyBinding, _super);
	    function PropertyBinding(element, attributeName, parameters, scheduleUpdate) {
	        _super.call(this, element, attributeName, parameters, scheduleUpdate);
	        var matches = propRgx.exec(attributeName);
	        var propPath = matches[1].split(".");
	        this.parentObject = this.BoundTo;
	        var x = 0;
	        for (; x < propPath.length - 1; x++)
	            this.parentObject = this.parentObject[propPath[x]];
	        this.propName = propPath[x];
	    }
	    PropertyBinding.prototype.Apply = function () {
	        var newValue = this.Value;
	        if (newValue != null && typeof newValue == "object") {
	            for (var key in newValue)
	                this.parentObject[this.propName][key] = newValue[key].valueOf();
	        }
	        else
	            this.parentObject[this.propName] = newValue;
	    };
	    return PropertyBinding;
	}(attributeBinding_1.default));
	var PropertyBinding;
	(function (PropertyBinding) {
	    function Create(element, bindingParameters, scheduleUpdate) {
	        var ret = [];
	        if (element.nodeType == element.ELEMENT_NODE) {
	            for (var x = 0; x < element.attributes.length; x++) {
	                var att = element.attributes[x];
	                if (propRgx.test(att.name))
	                    ret.push(new PropertyBinding(element, att.name, bindingParameters, scheduleUpdate));
	            }
	        }
	        return ret;
	    }
	    PropertyBinding.Create = Create;
	})(PropertyBinding || (PropertyBinding = {}));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = PropertyBinding;


/***/ })
/******/ ]);