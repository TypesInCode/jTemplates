var jTemplate =
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
	const observable_1 = __webpack_require__(1);
	exports.Observable = observable_1.Observable;
	const observableScope_1 = __webpack_require__(3);
	exports.ObservableScope = observableScope_1.default;
	const component_1 = __webpack_require__(4);
	exports.Component = component_1.default;
	const ElementMethods = __webpack_require__(15);
	exports.ElementMethods = ElementMethods;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const emitter_1 = __webpack_require__(2);
	(function (ValueType) {
	    ValueType[ValueType["Unknown"] = 0] = "Unknown";
	    ValueType[ValueType["Value"] = 1] = "Value";
	    ValueType[ValueType["Object"] = 2] = "Object";
	    ValueType[ValueType["Array"] = 3] = "Array";
	})(exports.ValueType || (exports.ValueType = {}));
	var ValueType = exports.ValueType;
	var JsonObj = {};
	function GetValueType(value) {
	    if (Array.isArray(value))
	        return ValueType.Array;
	    if (value && typeof value === "object" && value.constructor === JsonObj.constructor)
	        return ValueType.Object;
	    return ValueType.Value;
	}
	class ObservableValue {
	    constructor(parent) {
	        this.__observableReference = parent;
	    }
	    get ObservableReference() {
	        return this.__observableReference;
	    }
	    valueOf() {
	        return this.ObservableReference.Value;
	    }
	    toString() {
	        var val = this.ObservableReference.Value;
	        return val && val.toString();
	    }
	}
	exports.ObservableValue = ObservableValue;
	var sharedEmitter = new emitter_1.default();
	class Observable extends emitter_1.default {
	    constructor(value) {
	        super();
	        this._valueType = ValueType.Unknown;
	        this._properties = new Set();
	        this._setCallback = this.SetCallback.bind(this);
	        this._observableValue = new ObservableValue(this);
	        if (value != undefined)
	            this.Value = value;
	    }
	    get Properties() {
	        return this._properties.values();
	    }
	    get Type() {
	        return this._valueType;
	    }
	    get Value() {
	        this.Fire("get");
	        return this._value;
	    }
	    set Value(val) {
	        if (this._joinedObservable) {
	            this._joinedObservable.Value = val;
	            return;
	        }
	        if (val instanceof ObservableValue)
	            val = Observable.Unwrap(val);
	        else if (val instanceof Observable)
	            val = Observable.Unwrap(val.ObservableValue);
	        if (this._value !== val) {
	            this.ReconcileRawValue(val);
	            this.Fire("set");
	        }
	    }
	    get ObservableValue() {
	        return this._observableValue;
	    }
	    Fire(name, ...args) {
	        super.Fire(name, ...args);
	        sharedEmitter.Fire(name, this, ...args);
	    }
	    Join(observable) {
	        if (this._joinedObservable === observable)
	            return;
	        if (this._joinedObservable)
	            this.Unjoin();
	        if (observable instanceof ObservableValue)
	            observable = observable.ObservableReference;
	        else if (!(observable instanceof Observable)) {
	            this.Value = observable;
	            return;
	        }
	        this._joinedObservable = observable;
	        this._joinedObservable.AddListener("set", this._setCallback);
	        this.ReconcileJoinedObservable(observable);
	        this.Fire("set");
	    }
	    Unjoin() {
	        if (!this._joinedObservable)
	            return;
	        for (var prop in this.Properties) {
	            var obsValue = this._value[prop];
	            obsValue.ObservableReference.Unjoin();
	        }
	        this._joinedObservable.RemoveListener("set", this._setCallback);
	        this._joinedObservable = null;
	    }
	    Destroy() {
	        this.ClearAll();
	        this.DeleteProperties([...this.Properties]);
	    }
	    SetCallback(observable) {
	        this.ReconcileJoinedObservable(observable);
	        this.Fire("set");
	    }
	    ConvertToType(newType) {
	        if (this._valueType === newType)
	            return;
	        this.DeleteProperties([...this._properties]);
	        this._properties.clear();
	        this._valueType = newType;
	        switch (this._valueType) {
	            case ValueType.Array:
	                this._value = [];
	                this.AddArrayMixin();
	                break;
	            case ValueType.Object:
	                this._value = {};
	                this.RemoveArrayMixin();
	                break;
	            case ValueType.Value:
	                this.RemoveArrayMixin();
	                break;
	        }
	    }
	    ReconcileJoinedObservable(observable) {
	        this.ConvertToType(observable.Type);
	        var properties = new Set([...observable.Properties]);
	        if (observable.Type === ValueType.Value)
	            this._value = observable.Value;
	        var removedProperties = [...this._properties].filter(c => !properties.has(c));
	        properties.forEach(prop => {
	            var childObservable = Observable.GetFrom(observable.Value[prop]);
	            if (this._properties.has(prop))
	                Observable.GetFrom(this._value[prop]).Join(childObservable);
	            else
	                this._value[prop] = this.DefineProperty(prop, childObservable);
	        });
	        this.DeleteProperties(removedProperties);
	        this._properties = properties;
	    }
	    ReconcileRawValue(value) {
	        var type = GetValueType(value);
	        this.ConvertToType(type);
	        var properties = new Set();
	        if (type === ValueType.Array) {
	            for (var x = 0; x < value.length; x++)
	                properties.add(x);
	        }
	        else if (type === ValueType.Object) {
	            for (var key in value)
	                properties.add(key);
	        }
	        else if (type === ValueType.Value)
	            this._value = value;
	        var removedProperties = [...this._properties].filter(c => !properties.has(c));
	        properties.forEach(prop => {
	            if (this._properties.has(prop))
	                this.ObservableValue[prop] = value[prop];
	            else
	                this._value[prop] = this.DefineProperty(prop, value[prop]);
	        });
	        this.DeleteProperties(removedProperties);
	        this._properties = properties;
	    }
	    DefineProperty(prop, value) {
	        var childObservable = new Observable();
	        childObservable.Join(value);
	        Object.defineProperty(this.ObservableValue, prop, {
	            get: () => childObservable.ObservableValue,
	            set: (val) => childObservable.Value = val,
	            enumerable: true,
	            configurable: true
	        });
	        return childObservable.ObservableValue;
	    }
	    DeleteProperties(properties) {
	        if (this.Type === ValueType.Array) {
	            for (var x = this._value.length - properties.length; x < this._value.length; x++) {
	                this._value[x].ObservableReference.Destroy();
	                delete this.ObservableValue[this._value.length - properties.length + x];
	            }
	            this._value.splice(this._value.length - properties.length);
	        }
	        else {
	            for (var prop in properties) {
	                var obsValue = this._value[prop];
	                obsValue.ObservableReference.Destroy();
	                delete this.ObservableValue[prop];
	                delete this._value[prop];
	            }
	        }
	    }
	    AddArrayMixin() {
	        Object.defineProperty(this.ObservableValue, "length", {
	            get: () => this.Value.length,
	            enumerable: false,
	            configurable: true
	        });
	        Object.defineProperty(this.ObservableValue, "push", {
	            value: (newValue) => {
	                this._value.push(this.DefineProperty(this._value.length, newValue));
	                this._properties.add(this._properties.size);
	                this.Fire("set");
	            },
	            enumerable: false,
	            configurable: true
	        });
	        Object.defineProperty(this.ObservableValue, "join", {
	            value: (separator) => {
	                return this.Value.join(separator);
	            },
	            enumerable: false,
	            configurable: true
	        });
	        Object.defineProperty(this.ObservableValue, "map", {
	            value: (callback) => {
	                return this.Value.map(callback);
	            },
	            enumerable: false,
	            configurable: true
	        });
	    }
	    RemoveArrayMixin() {
	        delete this.ObservableValue["length"];
	        delete this.ObservableValue["push"];
	        delete this.ObservableValue["join"];
	        delete this.ObservableValue["map"];
	    }
	}
	exports.Observable = Observable;
	(function (Observable) {
	    function Unwrap(value) {
	        if (!(value instanceof ObservableValue))
	            return value;
	        var obs = value.ObservableReference;
	        var returnValue = obs.Type === ValueType.Value ? value.valueOf() :
	            obs.Type === ValueType.Array ? [] : {};
	        for (var prop of obs.Properties) {
	            returnValue[prop] = Unwrap(value[prop]);
	        }
	        return returnValue;
	    }
	    Observable.Unwrap = Unwrap;
	    function Create(value) {
	        return (new Observable(value)).ObservableValue;
	    }
	    Observable.Create = Create;
	    function Watch(event, action) {
	        var ret = new Set();
	        var callback = (sender, obs) => {
	            if (!ret.has(obs))
	                ret.add(obs);
	        };
	        sharedEmitter.AddListener(event, callback);
	        action();
	        sharedEmitter.RemoveListener(event, callback);
	        return ret.values();
	    }
	    Observable.Watch = Watch;
	    function GetFrom(value) {
	        if (value instanceof ObservableValue)
	            return value.ObservableReference;
	        return null;
	    }
	    Observable.GetFrom = GetFrom;
	})(Observable = exports.Observable || (exports.Observable = {}));


/***/ }),
/* 2 */
/***/ (function(module, exports) {

	"use strict";
	class Emitter {
	    constructor() {
	        this.callbackMap = {};
	        this.removedEvents = [];
	    }
	    AddListener(name, callback) {
	        var events = this.callbackMap[name] || new Set();
	        if (!events.has(callback))
	            events.add(callback);
	        this.callbackMap[name] = events;
	    }
	    RemoveListener(name, callback) {
	        var events = this.callbackMap[name];
	        events && events.delete(callback);
	    }
	    Fire(name, ...args) {
	        var events = this.callbackMap[name];
	        events && events.forEach(c => c(this, ...args));
	    }
	    Clear(name) {
	        var events = this.callbackMap[name];
	        events && events.clear();
	    }
	    ClearAll() {
	        for (var key in this.callbackMap)
	            this.Clear(key);
	    }
	}
	exports.Emitter = Emitter;
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Emitter;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const emitter_1 = __webpack_require__(2);
	const observable_1 = __webpack_require__(1);
	class ObservableScope extends emitter_1.default {
	    constructor(observableFunction, ...params) {
	        super();
	        this.parameters = params;
	        this.observableFunction = observableFunction;
	        this.childObservables = new Set();
	        this.setCallback = this.SetCallback.bind(this);
	        this.UpdateValue();
	    }
	    get Value() {
	        this.Fire("get", this);
	        if (!this.dirty)
	            return this.value;
	        this.UpdateValue();
	        return this.value;
	    }
	    get Dirty() {
	        return this.dirty;
	    }
	    Destroy() {
	        this.ClearAll();
	        this.childObservables.forEach(c => c.RemoveListener("set", this.setCallback));
	        this.childObservables.clear();
	    }
	    UpdateValue() {
	        var newObservables = observable_1.Observable.Watch("get", () => {
	            this.value = this.observableFunction(...this.parameters);
	            if (this.value instanceof observable_1.ObservableValue)
	                this.value = this.value.valueOf();
	        });
	        var newObsSet = new Set([...newObservables]);
	        this.childObservables.forEach(obs => {
	            if (!newObsSet.has(obs))
	                obs.RemoveListener("set", this.setCallback);
	        });
	        newObsSet.forEach(obs => obs.AddListener("set", this.setCallback));
	        this.childObservables = newObsSet;
	        this.dirty = false;
	    }
	    SetCallback(observable) {
	        this.dirty = true;
	        this.Fire("set");
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ObservableScope;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const bindingTemplate_1 = __webpack_require__(5);
	function CreateFunction(value) {
	    return () => value;
	}
	class Component {
	    constructor() {
	        this.parentTemplates = this.DefaultTemplates;
	    }
	    get BindingTemplate() {
	        if (!this.bindingTemplate) {
	            this.bindingTemplate = new bindingTemplate_1.BindingTemplate(this.Template);
	        }
	        return this.bindingTemplate;
	    }
	    static get Name() {
	        throw "public static property Name must be overidden";
	    }
	    get Template() { }
	    get DefaultTemplates() {
	        return {};
	    }
	    get Templates() {
	        return this.parentTemplates;
	    }
	    get Attached() {
	        return this.BindingTemplate.Attached;
	    }
	    get AttachedTo() {
	        return this.BindingTemplate.AttachedTo;
	    }
	    SetParentData(data) { }
	    SetParentTemplates(parentTemplates) {
	        for (var key in parentTemplates) {
	            if (typeof parentTemplates[key] != 'function')
	                this.parentTemplates[key] = CreateFunction(parentTemplates[key]);
	            else
	                this.parentTemplates[key] = parentTemplates[key];
	        }
	    }
	    AttachTo(element) {
	        this.BindingTemplate.AttachTo(element);
	    }
	    Detach() {
	        this.BindingTemplate.Detach();
	    }
	    Destroy() {
	        this.BindingTemplate.Destroy();
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Component;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const browser_1 = __webpack_require__(6);
	const template_1 = __webpack_require__(7);
	const textBinding_1 = __webpack_require__(8);
	const propertyBinding_1 = __webpack_require__(11);
	const dataBinding_1 = __webpack_require__(12);
	const eventBinding_1 = __webpack_require__(13);
	const componentBinding_1 = __webpack_require__(14);
	var TemplateType;
	(function (TemplateType) {
	    TemplateType[TemplateType["Element"] = 0] = "Element";
	    TemplateType[TemplateType["Text"] = 1] = "Text";
	})(TemplateType || (TemplateType = {}));
	function GetTemplateType(template) {
	    if (typeof template === 'string' || typeof template.valueOf() === 'string')
	        return TemplateType.Text;
	    return TemplateType.Element;
	}
	function AppendText(text, node) {
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
	            var childBindings = ReadElementProperties(node, value, [...parentProperties, key]);
	            for (var x = 0; x < childBindings.length; x++)
	                bindings.push(childBindings[x]);
	        }
	        else {
	            bindings.push(new propertyBinding_1.default(node, [...parentProperties, key], value));
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
	    var text = null;
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
	            case "name":
	                elementName = template.name;
	                break;
	            case "text":
	                text = template.text;
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
	    else if (text) {
	        bindings.push(new textBinding_1.default(elementNode, text));
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
	class BindingTemplate extends template_1.default {
	    constructor(template) {
	        var documentFragment = browser_1.default.createDocumentFragment();
	        var bindings = ReadBindingTemplate(template, documentFragment);
	        super(documentFragment);
	        this.bindings = bindings;
	    }
	    AttachTo(element) {
	        if (this.destroyed)
	            throw "Cannot attach destroyed BindingTemplate";
	        this.Bind();
	        super.AttachTo(element);
	    }
	    Bind() {
	        if (this.bound)
	            return;
	        this.bindings.forEach((c) => {
	            c.Update();
	        });
	        this.bound = true;
	    }
	    Destroy() {
	        this.Detach();
	        this.bindings.forEach((c) => c.Destroy());
	        this.destroyed = true;
	    }
	}
	exports.BindingTemplate = BindingTemplate;


/***/ }),
/* 6 */
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
	            return `<${g1}${g2}></${g1}>`;
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
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const browser_1 = __webpack_require__(6);
	class Template {
	    constructor(documentFragment) {
	        this.documentFragment = documentFragment;
	        this.elements = new Array(this.documentFragment.childNodes.length);
	        for (var x = 0; x < this.documentFragment.childNodes.length; x++) {
	            this.elements.push(this.documentFragment.childNodes[x]);
	        }
	    }
	    get DocumentFragment() {
	        return this.documentFragment;
	    }
	    get Attached() {
	        return !!this.attachedTo;
	    }
	    get AttachedTo() {
	        return this.attachedTo;
	    }
	    AttachTo(element) {
	        if (this.attachedTo)
	            this.Detach();
	        this.attachedTo = element;
	        element.appendChild(this.documentFragment);
	    }
	    Detach() {
	        if (!this.Attached)
	            return;
	        this.attachedTo = null;
	        this.elements.forEach(c => this.documentFragment.appendChild(c));
	    }
	    Clone() {
	        if (this.Attached)
	            throw "Template cannot be cloned while attached";
	        var fragment = this.documentFragment.cloneNode(true);
	        return new Template(fragment);
	    }
	}
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
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const nodeBinding_1 = __webpack_require__(9);
	class TextBinding extends nodeBinding_1.default {
	    constructor(element, binding) {
	        super(element, binding);
	    }
	    Apply() {
	        this.BoundTo.textContent = this.Value;
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = TextBinding;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const binding_1 = __webpack_require__(10);
	const browser_1 = __webpack_require__(6);
	var pendingUpdates = [];
	var updateScheduled = false;
	function ScheduleUpdate(callback) {
	    pendingUpdates.push(callback);
	    if (!updateScheduled) {
	        updateScheduled = true;
	        browser_1.default.requestAnimationFrame(() => {
	            updateScheduled = false;
	            for (var x = 0; x < pendingUpdates.length; x++)
	                pendingUpdates[x]();
	            pendingUpdates = [];
	        });
	    }
	}
	class NodeBinding extends binding_1.default {
	    constructor(boundTo, binding) {
	        super(boundTo, binding, ScheduleUpdate);
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = NodeBinding;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const observableScope_1 = __webpack_require__(3);
	var BindingStatus;
	(function (BindingStatus) {
	    BindingStatus[BindingStatus["Init"] = 0] = "Init";
	    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
	    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
	})(BindingStatus || (BindingStatus = {}));
	class Binding {
	    constructor(boundTo, binding, scheduleUpdate) {
	        this.boundTo = boundTo;
	        this.scheduleUpdate = scheduleUpdate;
	        this.status = BindingStatus.Init;
	        this.setCallback = this.Update.bind(this);
	        if (typeof binding == 'function') {
	            this.hasStaticValue = false;
	            this.observableScope = new observableScope_1.default(binding);
	            this.observableScope.AddListener("set", this.setCallback);
	        }
	        else {
	            this.hasStaticValue = true;
	            this.staticValue = binding;
	        }
	    }
	    get Value() {
	        return this.hasStaticValue ? this.staticValue : this.observableScope.Value;
	    }
	    get BoundTo() {
	        return this.boundTo;
	    }
	    Update() {
	        if (this.status == BindingStatus.Init) {
	            this.status = BindingStatus.Updating;
	            this.Apply();
	            this.status = BindingStatus.Updated;
	        }
	        else if (this.status != BindingStatus.Updating) {
	            this.status = BindingStatus.Updating;
	            this.scheduleUpdate(() => {
	                this.Apply();
	                this.status = BindingStatus.Updated;
	            });
	        }
	    }
	    Destroy() {
	        this.observableScope && this.observableScope.Destroy();
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = Binding;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const nodeBinding_1 = __webpack_require__(9);
	class PropertyBinding extends nodeBinding_1.default {
	    constructor(boundTo, propertyPath, bindingFunction) {
	        super(boundTo, bindingFunction);
	        this.parentObject = this.BoundTo;
	        var x = 0;
	        for (; x < propertyPath.length - 1; x++)
	            this.parentObject = this.parentObject[propertyPath[x]];
	        this.propName = propertyPath[x];
	    }
	    Apply() {
	        this.parentObject[this.propName] = this.Value && this.Value.valueOf();
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = PropertyBinding;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const nodeBinding_1 = __webpack_require__(9);
	const bindingTemplate_1 = __webpack_require__(5);
	const browser_1 = __webpack_require__(6);
	const observable_1 = __webpack_require__(1);
	class DataBinding extends nodeBinding_1.default {
	    constructor(boundTo, binding, children) {
	        super(boundTo, binding);
	        this.childTemplates = [];
	        this.destroyedTemplates = [];
	        if (typeof children != 'function')
	            this.templateFunction = () => children;
	        else
	            this.templateFunction = children;
	    }
	    Update() {
	        var newValue = this.GetValue();
	        if (newValue.length < this.childTemplates.length) {
	            var oldComponents = this.childTemplates.splice(newValue.length);
	            for (var x = 0; x < oldComponents.length; x++) {
	                if (this.destroyedTemplates.indexOf(oldComponents[x]) < 0)
	                    this.destroyedTemplates.push(oldComponents[x]);
	            }
	        }
	        super.Update();
	    }
	    Destroy() {
	        for (var x = 0; x < this.childTemplates.length; x++)
	            this.childTemplates[x].Destroy();
	        super.Destroy();
	    }
	    Apply() {
	        var currentLength = this.childTemplates.length;
	        var newValue = this.GetValue();
	        this.destroyedTemplates.forEach(c => c.Destroy());
	        if (currentLength < newValue.length) {
	            var frag = browser_1.default.createDocumentFragment();
	            for (var x = currentLength; x < newValue.length; x++) {
	                var temp = this.templateFunction(newValue[x], x);
	                var newTemplate = new bindingTemplate_1.BindingTemplate(temp);
	                newTemplate.AttachTo(frag);
	                this.childTemplates.push(newTemplate);
	            }
	            this.BoundTo.appendChild(frag);
	        }
	        this.destroyedTemplates = [];
	    }
	    GetValue() {
	        var newValue = this.Value;
	        if (newValue instanceof observable_1.Observable)
	            newValue = newValue.valueOf();
	        if (!Array.isArray(newValue))
	            newValue = [newValue];
	        return newValue;
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = DataBinding;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const nodeBinding_1 = __webpack_require__(9);
	class EventBinding extends nodeBinding_1.default {
	    constructor(element, eventName, bindingFunction) {
	        super(element, bindingFunction);
	        this.eventName = eventName;
	    }
	    Destroy() {
	        this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
	    }
	    Apply() {
	        if (this.eventCallback)
	            this.BoundTo.removeEventListener(this.eventName, this.eventCallback);
	        this.eventCallback = this.Value;
	        if (this.eventCallback)
	            this.BoundTo.addEventListener(this.eventName, this.eventCallback);
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = EventBinding;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const nodeBinding_1 = __webpack_require__(9);
	function EnsureFunction(value) {
	    if (typeof value == 'function')
	        return value;
	    return () => value;
	}
	class ComponentBinding extends nodeBinding_1.default {
	    constructor(element, binding, compType, parentTemplates) {
	        super(element, binding);
	        this.componentType = compType;
	        this.parentTemplates = {};
	        for (var key in parentTemplates)
	            this.parentTemplates[key] = EnsureFunction(parentTemplates[key]);
	    }
	    Destroy() {
	        this.component.Destroy();
	        super.Destroy();
	    }
	    Apply() {
	        if (!this.component) {
	            this.component = new this.componentType();
	            this.component.SetParentTemplates(this.parentTemplates);
	            this.component.SetParentData(this.Value);
	            this.component.AttachTo(this.BoundTo);
	        }
	        else
	            this.component.SetParentData(this.Value);
	    }
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = ComponentBinding;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	const elements_1 = __webpack_require__(16);
	exports.br = elements_1.element.bind(null, "br");
	exports.div = elements_1.element.bind(null, "div");
	exports.span = elements_1.element.bind(null, "span");
	exports.img = elements_1.element.bind(null, "img");
	exports.video = elements_1.element.bind(null, "video");
	exports.source = elements_1.element.bind(null, "source");
	exports.input = elements_1.element.bind(null, "input");
	exports.option = elements_1.element.bind(null, "option");
	exports.select = elements_1.element.bind(null, "select");


/***/ }),
/* 16 */
/***/ (function(module, exports) {

	"use strict";
	function element(name, properties, children) {
	    properties = properties || {};
	    var elementDefinition = {
	        on: properties.on,
	        data: properties.data,
	        text: properties.text,
	        children: children
	    };
	    delete properties.on;
	    delete properties.data;
	    delete properties.text;
	    elementDefinition[name] = properties;
	    return elementDefinition;
	}
	exports.element = element;
	function component(component, data, templates) {
	    return {
	        name: component.Name,
	        component: component,
	        data: data,
	        templates: templates
	    };
	}
	exports.component = component;


/***/ })
/******/ ]);