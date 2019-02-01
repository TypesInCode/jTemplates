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
	Object.defineProperty(exports, "__esModule", { value: true });
	const template_1 = __webpack_require__(1);
	exports.Template = template_1.Template;
	const elements_1 = __webpack_require__(14);
	exports.div = elements_1.div;
	exports.span = elements_1.span;
	exports.ul = elements_1.ul;
	exports.li = elements_1.li;
	exports.input = elements_1.input;
	exports.b = elements_1.b;
	exports.a = elements_1.a;
	exports.br = elements_1.br;
	exports.img = elements_1.img;
	exports.video = elements_1.video;
	exports.source = elements_1.source;
	exports.option = elements_1.option;
	exports.select = elements_1.select;
	exports.h1 = elements_1.h1;
	exports.h2 = elements_1.h2;
	exports.h3 = elements_1.h3;
	exports.table = elements_1.table;
	exports.th = elements_1.th;
	exports.tr = elements_1.tr;
	exports.td = elements_1.td;
	const storeAsync_1 = __webpack_require__(15);
	exports.StoreAsync = storeAsync_1.StoreAsync;
	const store_1 = __webpack_require__(26);
	exports.Store = store_1.Store;
	const scope_1 = __webpack_require__(7);
	exports.Scope = scope_1.Scope;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const bindingConfig_1 = __webpack_require__(2);
	const propertyBinding_1 = __webpack_require__(5);
	const dataBinding_1 = __webpack_require__(11);
	const textBinding_1 = __webpack_require__(12);
	const eventBinding_1 = __webpack_require__(13);
	const scope_1 = __webpack_require__(7);
	function TemplateFunction(type, templateDefinition, children) {
	    return {
	        type: type,
	        props: templateDefinition && templateDefinition.props,
	        on: templateDefinition && templateDefinition.on,
	        data: templateDefinition && templateDefinition.data,
	        key: templateDefinition && templateDefinition.key,
	        text: templateDefinition && templateDefinition.text,
	        children: children,
	    };
	}
	exports.TemplateFunction = TemplateFunction;
	function ComponentFunction(type, classType, componentDefinition, templates) {
	    return {
	        type: type,
	        class: classType,
	        props: componentDefinition && componentDefinition.props,
	        on: componentDefinition && componentDefinition.on,
	        data: componentDefinition && componentDefinition.data,
	        key: componentDefinition && componentDefinition.key,
	        templates: templates,
	    };
	}
	function CreateComponentFunction(type, classType) {
	    return ComponentFunction.bind(null, type, classType);
	}
	function DefaultDataCallback() { return true; }
	function BindTarget(bindingTarget, bindingDef) {
	    var ret = [];
	    var def1 = bindingDef;
	    if (def1.props)
	        ret.push(new propertyBinding_1.default(bindingTarget, def1.props));
	    if (def1.on)
	        ret.push(new eventBinding_1.default(bindingTarget, def1.on));
	    if (def1.text)
	        ret.push(new textBinding_1.default(bindingTarget, def1.text));
	    else if (def1.children) {
	        def1.data = def1.data || DefaultDataCallback;
	        ret.push(new dataBinding_1.default(bindingTarget, def1.data, def1.children, def1.key));
	    }
	    return ret;
	}
	class Template {
	    constructor(definition, dataOverride) {
	        if (typeof definition === 'string')
	            definition = ComponentFunction(definition, this.constructor);
	        definition.data = dataOverride || definition.data;
	        this.templates = this.DefaultTemplates;
	        this.SetTemplates(definition.templates);
	        definition.children = definition.children || this.Template.bind(this);
	        this.definition = definition;
	        this.destroyed = false;
	    }
	    get DefaultTemplates() {
	        return {};
	    }
	    get Templates() {
	        return this.templates;
	    }
	    get Root() {
	        if (!this.bindingRoot && !this.destroyed) {
	            this.bindingRoot = bindingConfig_1.BindingConfig.createBindingTarget(this.definition.type);
	            this.bindings = BindTarget(this.bindingRoot, this.definition);
	        }
	        return this.bindingRoot;
	    }
	    SetTemplates(templates) {
	        if (!templates)
	            return;
	        for (var key in templates) {
	            this.templates[key] = templates[key];
	        }
	    }
	    UpdateComplete(callback) {
	        bindingConfig_1.BindingConfig.updateComplete(callback);
	    }
	    AttachTo(bindingParent) {
	        bindingConfig_1.BindingConfig.addChild(bindingParent, this.Root);
	    }
	    AttachToContainer(container) {
	        bindingConfig_1.BindingConfig.addContainerChild(container, this.Root);
	    }
	    AttachBefore(bindingParent, template) {
	        bindingConfig_1.BindingConfig.addChildBefore(bindingParent, template && template.Root, this.Root);
	    }
	    AttachAfter(bindingParent, template) {
	        bindingConfig_1.BindingConfig.addChildAfter(bindingParent, template && template.Root, this.Root);
	    }
	    Detach() {
	        bindingConfig_1.BindingConfig.remove(this.Root);
	    }
	    Destroy() {
	        this.Detach();
	        this.bindingRoot = null;
	        this.bindings.forEach(b => b.Destroy());
	        this.bindings = [];
	        this.destroyed = true;
	    }
	    Template(c, i) {
	        return [];
	    }
	}
	exports.Template = Template;
	class Component extends Template {
	    constructor(definition) {
	        if (typeof definition === 'string')
	            super(definition, true);
	        else if (typeof definition.data === 'function') {
	            definition.data = new scope_1.Scope(definition.data);
	            super(definition);
	        }
	        else {
	            var data = definition.data;
	            definition.data = new scope_1.Scope(() => data);
	            super(definition);
	        }
	    }
	}
	exports.Component = Component;
	(function (Template) {
	    function ToFunction(type, classType) {
	        return CreateComponentFunction(type, classType);
	    }
	    Template.ToFunction = ToFunction;
	    function Create(bindingDef) {
	        var constructor = (bindingDef.class || Template);
	        var template = new constructor(bindingDef);
	        return template;
	    }
	    Template.Create = Create;
	})(Template = exports.Template || (exports.Template = {}));


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const domBindingConfig_1 = __webpack_require__(3);
	exports.BindingConfig = domBindingConfig_1.DOMBindingConfig;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const window_1 = __webpack_require__(4);
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
	        window_1.wndw.requestAnimationFrame(processUpdates);
	    }
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
	    addListener: function (target, type, callback) {
	        target.addEventListener(type, callback);
	    },
	    removeListener: function (target, type, callback) {
	        target.removeEventListener(type, callback);
	    },
	    createBindingTarget: function (type) {
	        return window_1.wndw.document.createElement(type);
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
	        return window_1.wndw.document.createDocumentFragment();
	    },
	    addContainerChild(container, child) {
	        container.appendChild(child);
	    },
	    addChildContainer(root, container) {
	        root.appendChild(container);
	    }
	};


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	var glbl = null;
	if (typeof window != "undefined")
	    glbl = window;
	else {
	    glbl = (new (__webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"jsdom\""); e.code = 'MODULE_NOT_FOUND'; throw e; }())).JSDOM)("")).window;
	}
	exports.wndw = glbl;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(6);
	class PropertyBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, {}, null);
	    }
	    Apply() {
	        this.lastValue = this.lastValue || {};
	        this.ApplyRecursive(this.BoundTo, this.lastValue, this.Value);
	        this.lastValue = this.Value;
	    }
	    ApplyRecursive(target, lastValue, source) {
	        if (typeof source !== "object")
	            throw "Property binding must resolve to an object";
	        for (var key in source) {
	            var val = source[key];
	            if (target[key] && val !== null && typeof val === 'object' && val.constructor === {}.constructor) {
	                lastValue[key] = lastValue[key] || {};
	                this.ApplyRecursive(target[key], lastValue[key], val);
	            }
	            else {
	                val = val && val.valueOf();
	                if (lastValue[key] !== val)
	                    target[key] = val;
	            }
	        }
	    }
	}
	exports.default = PropertyBinding;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scope_1 = __webpack_require__(7);
	const bindingConfig_1 = __webpack_require__(2);
	var BindingStatus;
	(function (BindingStatus) {
	    BindingStatus[BindingStatus["Init"] = 0] = "Init";
	    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
	    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
	    BindingStatus[BindingStatus["Destroyed"] = 3] = "Destroyed";
	})(BindingStatus || (BindingStatus = {}));
	class Binding {
	    constructor(boundTo, binding, defaultValue, config) {
	        this.boundTo = boundTo;
	        this.status = BindingStatus.Init;
	        this.setCallback = this.Update.bind(this);
	        binding = this.OverrideBinding(binding, config);
	        if (typeof binding === 'function') {
	            this.observableScope = new scope_1.Scope(binding);
	            this.observableScope.addListener("set", this.setCallback);
	        }
	        else {
	            this.isStatic = true;
	            this.staticValue = binding;
	        }
	        this.Init(config);
	        this.Update();
	    }
	    get Value() {
	        return this.isStatic ?
	            this.staticValue :
	            this.observableScope.Value;
	    }
	    get BoundTo() {
	        return this.boundTo;
	    }
	    Update() {
	        if (this.status === BindingStatus.Destroyed)
	            return;
	        if (this.status === BindingStatus.Init) {
	            this.status = BindingStatus.Updating;
	            this.Apply();
	            this.status = BindingStatus.Updated;
	        }
	        else if (this.status !== BindingStatus.Updating) {
	            this.status = BindingStatus.Updating;
	            bindingConfig_1.BindingConfig.scheduleUpdate(() => {
	                if (this.status === BindingStatus.Destroyed)
	                    return;
	                this.Apply();
	                this.status = BindingStatus.Updated;
	            });
	        }
	    }
	    Destroy() {
	        this.observableScope && this.observableScope.Destroy();
	        this.status = BindingStatus.Destroyed;
	    }
	    OverrideBinding(binding, config) {
	        return binding;
	    }
	    Init(config) { }
	    ;
	}
	exports.Binding = Binding;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scopeBase_1 = __webpack_require__(8);
	const scopeCollector_1 = __webpack_require__(10);
	class Scope extends scopeBase_1.ScopeBase {
	    constructor(getFunction) {
	        super(getFunction, null);
	    }
	    Scope(callback) {
	        return new Scope(() => callback(this.Value));
	    }
	    UpdateValue(callback) {
	        var value = null;
	        var emitters = scopeCollector_1.scopeCollector.Watch(() => {
	            value = this.GetFunction();
	        });
	        callback(emitters, value);
	    }
	}
	exports.Scope = Scope;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(9);
	const scopeCollector_1 = __webpack_require__(10);
	class ScopeBase extends emitter_1.default {
	    constructor(getFunction, defaultValue) {
	        super();
	        this.getFunction = getFunction;
	        this.emitters = new Set();
	        this.setCallback = this.SetCallback.bind(this);
	        this.destroyCallback = this.DestroyCallback.bind(this);
	        this.defaultValue = defaultValue;
	        this.dirty = true;
	        this.isAsync = false;
	    }
	    get Value() {
	        scopeCollector_1.scopeCollector.Register(this);
	        if (this.dirty)
	            this.UpdateValueBase();
	        return typeof this.value === 'undefined' ? this.defaultValue : this.value;
	    }
	    get GetFunction() {
	        return this.getFunction;
	    }
	    AsPromise() {
	        return new Promise((resolve) => {
	            var temp = this.Value;
	            if (!this.isAsync || this.defaultValue !== temp) {
	                resolve(temp);
	                return;
	            }
	            var setCallback = () => {
	                resolve(this.Value);
	                this.removeListener("set", setCallback);
	            };
	            this.addListener("set", setCallback);
	        });
	    }
	    Destroy() {
	        this.emitters.forEach(e => {
	            e.removeListener("set", this.setCallback);
	            e.removeListener("destroy", this.destroyCallback);
	        });
	        this.emitters.clear();
	        this.emit("destroy", this);
	        this.removeAllListeners();
	    }
	    UpdateValueBase() {
	        this.dirty = false;
	        var callbackFired = false;
	        this.UpdateValue((emitters, value) => {
	            callbackFired = true;
	            this.UpdateEmitters(emitters);
	            this.value = value;
	            if (this.isAsync)
	                this.emit("set");
	        });
	        this.isAsync = !callbackFired;
	    }
	    UpdateEmitters(newEmitters) {
	        this.emitters.forEach(e => {
	            if (!newEmitters.has(e)) {
	                this.RemoveListenersFrom(e);
	            }
	        });
	        newEmitters.forEach(e => {
	            this.AddListenersTo(e);
	        });
	        this.emitters = newEmitters;
	    }
	    SetCallback() {
	        if (!this.isAsync) {
	            this.dirty = true;
	            this.emit("set");
	        }
	        else
	            this.UpdateValueBase();
	    }
	    DestroyCallback(emitter) {
	        this.RemoveListenersFrom(emitter);
	        this.emitters.delete(emitter);
	        if (this.emitters.size === 0)
	            this.Destroy();
	    }
	    AddListenersTo(emitter) {
	        emitter.addListener("set", this.setCallback);
	        emitter.addListener("destroy", this.destroyCallback);
	    }
	    RemoveListenersFrom(emitter) {
	        emitter.removeListener("set", this.setCallback);
	        emitter.removeListener("destroy", this.destroyCallback);
	    }
	}
	exports.ScopeBase = ScopeBase;


/***/ }),
/* 9 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class Emitter {
	    constructor() {
	        this.callbackMap = {};
	        this.emitting = false;
	    }
	    addListener(name, callback) {
	        var events = this.callbackMap[name] || new Set();
	        if (!events.has(callback))
	            events.add(callback);
	        this.callbackMap[name] = events;
	    }
	    removeListener(name, callback) {
	        var events = this.callbackMap[name];
	        events && events.delete(callback);
	    }
	    emit(name, ...args) {
	        if (this.emitting)
	            return;
	        this.emitting = true;
	        var events = this.callbackMap[name];
	        events && events.forEach(c => c(...args));
	        this.emitting = false;
	    }
	    clear(name) {
	        var events = this.callbackMap[name];
	        events && events.clear();
	    }
	    removeAllListeners() {
	        for (var key in this.callbackMap)
	            this.clear(key);
	    }
	}
	exports.Emitter = Emitter;
	exports.default = Emitter;


/***/ }),
/* 10 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class ScopeCollector {
	    constructor() {
	        this.emitterStack = [];
	    }
	    Watch(callback) {
	        this.emitterStack.push(new Set());
	        callback();
	        return this.emitterStack.pop();
	    }
	    Register(emitter) {
	        if (this.emitterStack.length === 0)
	            return;
	        var set = this.emitterStack[this.emitterStack.length - 1];
	        if (!set.has(emitter))
	            set.add(emitter);
	    }
	}
	exports.scopeCollector = new ScopeCollector();


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(6);
	const template_1 = __webpack_require__(1);
	const bindingConfig_1 = __webpack_require__(2);
	function ConvertToArray(val) {
	    if (!val)
	        return [];
	    if (!Array.isArray(val))
	        return [val];
	    return val;
	}
	class DataBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction, childrenFunction, keyFunction) {
	        super(boundTo, bindingFunction, [], { children: childrenFunction, key: keyFunction });
	    }
	    Destroy() {
	        super.Destroy();
	        this.DestroyTemplates(this.activeTemplateMap);
	        this.activeTemplateMap = null;
	    }
	    OverrideBinding(bindingFunction, config) {
	        var localBinding = null;
	        if (typeof bindingFunction === 'function') {
	            localBinding = () => {
	                var value = bindingFunction();
	                var array = ConvertToArray(value);
	                return array.map((curr, index) => {
	                    return {
	                        value: curr,
	                        key: config.key && config.key(curr) || index
	                    };
	                });
	            };
	        }
	        else
	            localBinding = () => {
	                var array = ConvertToArray(bindingFunction);
	                return array.map((curr, index) => {
	                    return {
	                        value: curr,
	                        key: config.key && config.key(curr) || index
	                    };
	                });
	            };
	        return localBinding;
	    }
	    Init(config) {
	        this.activeTemplateMap = new Map();
	        this.activeKeys = [];
	        this.childrenFunction = config.children;
	    }
	    Apply() {
	        var value = this.Value;
	        var newTemplateMap = new Map();
	        var newKeys = [];
	        var container = bindingConfig_1.BindingConfig.createContainer();
	        var previousTemplate = null;
	        for (var x = 0; x < value.length; x++) {
	            var newKey = value[x].key;
	            newKeys.push(newKey);
	            var newTemplates = this.activeTemplateMap.get(newKey);
	            if (!newTemplates) {
	                var newDefs = this.childrenFunction(value[x].value, x);
	                if (!Array.isArray(newDefs))
	                    newDefs = [newDefs];
	                newTemplates = newDefs.map(d => template_1.Template.Create(d));
	            }
	            newTemplateMap.set(newKey, newTemplates);
	            this.activeTemplateMap.delete(newKey);
	            if (x >= this.activeKeys.length)
	                newTemplates.forEach(t => {
	                    t.AttachToContainer(container);
	                    previousTemplate = t;
	                });
	            else if (newKey !== this.activeKeys[x])
	                newTemplates.forEach(t => {
	                    t.AttachAfter(this.BoundTo, previousTemplate);
	                    previousTemplate = t;
	                });
	            else
	                previousTemplate = newTemplates[newTemplates.length - 1] || previousTemplate;
	        }
	        this.DestroyTemplates(this.activeTemplateMap);
	        this.activeTemplateMap = newTemplateMap;
	        this.activeKeys = newKeys;
	        bindingConfig_1.BindingConfig.addChildContainer(this.BoundTo, container);
	    }
	    DestroyTemplates(templateMap) {
	        templateMap.forEach(templates => templates.forEach(t => t.Destroy()));
	    }
	}
	exports.default = DataBinding;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(6);
	const bindingConfig_1 = __webpack_require__(2);
	class TextBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, "", null);
	    }
	    Apply() {
	        bindingConfig_1.BindingConfig.setText(this.BoundTo, this.Value);
	    }
	}
	exports.default = TextBinding;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(6);
	const bindingConfig_1 = __webpack_require__(2);
	class EventBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, {}, null);
	    }
	    Apply() {
	        for (var key in this.boundEvents)
	            bindingConfig_1.BindingConfig.removeListener(this.BoundTo, key, this.boundEvents[key]);
	        this.boundEvents = {};
	        var value = this.Value;
	        for (var key in value) {
	            this.boundEvents[key] = value[key];
	            bindingConfig_1.BindingConfig.addListener(this.BoundTo, key, value[key]);
	        }
	    }
	}
	exports.default = EventBinding;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const template_1 = __webpack_require__(1);
	function a(templateDefinition, children) {
	    return template_1.TemplateFunction("a", templateDefinition, children);
	}
	exports.a = a;
	function ul(templateDefinition, children) {
	    return template_1.TemplateFunction("ul", templateDefinition, children);
	}
	exports.ul = ul;
	function li(templateDefinition, children) {
	    return template_1.TemplateFunction("li", templateDefinition, children);
	}
	exports.li = li;
	function br(templateDefinition, children) {
	    return template_1.TemplateFunction("br", templateDefinition, children);
	}
	exports.br = br;
	function b(templateDefinition, children) {
	    return template_1.TemplateFunction("b", templateDefinition, children);
	}
	exports.b = b;
	function div(templateDefinition, children) {
	    return template_1.TemplateFunction("div", templateDefinition, children);
	}
	exports.div = div;
	function span(templateDefinition, children) {
	    return template_1.TemplateFunction("span", templateDefinition, children);
	}
	exports.span = span;
	function img(templateDefinition, children) {
	    return template_1.TemplateFunction("img", templateDefinition, children);
	}
	exports.img = img;
	function video(templateDefinition, children) {
	    return template_1.TemplateFunction("video", templateDefinition, children);
	}
	exports.video = video;
	function source(templateDefinition, children) {
	    return template_1.TemplateFunction("source", templateDefinition, children);
	}
	exports.source = source;
	function input(templateDefinition, children) {
	    return template_1.TemplateFunction("input", templateDefinition, children);
	}
	exports.input = input;
	function option(templateDefinition, children) {
	    return template_1.TemplateFunction("option", templateDefinition, children);
	}
	exports.option = option;
	function select(templateDefinition, children) {
	    return template_1.TemplateFunction("select", templateDefinition, children);
	}
	exports.select = select;
	function h1(templateDefinition, children) {
	    return template_1.TemplateFunction("h1", templateDefinition, children);
	}
	exports.h1 = h1;
	function h2(templateDefinition, children) {
	    return template_1.TemplateFunction("h2", templateDefinition, children);
	}
	exports.h2 = h2;
	function h3(templateDefinition, children) {
	    return template_1.TemplateFunction("h3", templateDefinition, children);
	}
	exports.h3 = h3;
	function table(templateDefinition, children) {
	    return template_1.TemplateFunction("table", templateDefinition, children);
	}
	exports.table = table;
	function th(templateDefinition, children) {
	    return template_1.TemplateFunction("th", templateDefinition, children);
	}
	exports.th = th;
	function tr(templateDefinition, children) {
	    return template_1.TemplateFunction("tr", templateDefinition, children);
	}
	exports.tr = tr;
	function td(templateDefinition, children) {
	    return template_1.TemplateFunction("td", templateDefinition, children);
	}
	exports.td = td;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const storeAsyncManager_1 = __webpack_require__(16);
	const storeAsyncReader_1 = __webpack_require__(22);
	const storeAsyncWriter_1 = __webpack_require__(24);
	const storeAsyncQuery_1 = __webpack_require__(25);
	const promiseQueue_1 = __webpack_require__(18);
	class StoreAsync {
	    constructor(idFunction) {
	        this.manager = new storeAsyncManager_1.StoreAsyncManager(idFunction);
	        this.reader = new storeAsyncReader_1.StoreAsyncReader(this.manager);
	        this.writer = new storeAsyncWriter_1.StoreAsyncWriter(this.manager);
	        this.promiseQueue = new promiseQueue_1.PromiseQueue();
	        this.queryCache = new Map();
	    }
	    get OnComplete() {
	        return this.promiseQueue.OnComplete.then(() => {
	            return this;
	        });
	    }
	    Action(action) {
	        return this.promiseQueue.Push(resolve => resolve(action(this.reader, this.writer)));
	    }
	    Query(id, defaultValue, queryFunc) {
	        if (this.queryCache.has(id))
	            return this.queryCache.get(id);
	        var query = new storeAsyncQuery_1.StoreAsyncQuery(this.manager, defaultValue, (reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            return yield this.promiseQueue.Push(resolve => {
	                resolve(queryFunc(reader, writer));
	            });
	        }));
	        var destroy = () => {
	            this.queryCache.delete(id);
	            query.removeListener("destroy", destroy);
	        };
	        query.addListener("destroy", destroy);
	        return query;
	    }
	    Destroy() {
	        this.promiseQueue.Stop();
	        this.queryCache.forEach(q => q.Destroy());
	        this.queryCache.clear();
	        this.manager.Destroy();
	    }
	}
	exports.StoreAsync = StoreAsync;
	(function (StoreAsync) {
	    function Create(init, idFunction) {
	        var store = new StoreAsync(idFunction);
	        store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            yield writer.WritePath("root", init);
	        }));
	        return store;
	    }
	    StoreAsync.Create = Create;
	})(StoreAsync = exports.StoreAsync || (exports.StoreAsync = {}));


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(9);
	const workerQueue_1 = __webpack_require__(17);
	const storeWorker_1 = __webpack_require__(20);
	class StoreAsyncManager {
	    constructor(idFunction) {
	        this.emitterMap = new Map();
	        this.worker = storeWorker_1.StoreWorker.Create();
	        this.workerQueue = new workerQueue_1.WorkerQueue(this.worker);
	        this.workerQueue.Push(() => ({ method: "create", arguments: [idFunction && idFunction.toString()] }));
	    }
	    Diff(path, newValue, skipDependents) {
	        return this.workerQueue.Push(() => {
	            var oldValue = this.ResolvePropertyPath(path);
	            return {
	                method: "diff",
	                arguments: [path, newValue, oldValue, skipDependents]
	            };
	        });
	    }
	    GetPathById(id) {
	        return this.workerQueue.Push(() => ({
	            method: "getpath",
	            arguments: [id]
	        }));
	    }
	    EnsureEmitter(path) {
	        var emitter = this.emitterMap.get(path);
	        if (!emitter) {
	            emitter = new emitter_1.Emitter();
	            this.emitterMap.set(path, emitter);
	        }
	        return emitter;
	    }
	    AssignPropertyPath(value, path) {
	        var parts = path.split(".");
	        var prop = parts[parts.length - 1];
	        var parentParts = parts.slice(0, parts.length - 1);
	        var parentObj = this.ResolvePropertyPath(parentParts.join("."));
	        parentObj[prop] = value;
	    }
	    ResolvePropertyPath(path) {
	        if (!path)
	            return this;
	        return path.split(".").reduce((pre, curr) => {
	            return pre && pre[curr];
	        }, this);
	    }
	    DeleteEmitter(path) {
	        var emitter = this.emitterMap.get(path);
	        if (emitter) {
	            this.emitterMap.delete(path);
	            emitter.emit("destroy", emitter);
	        }
	    }
	    Destroy() {
	        this.root = null;
	        this.emitterMap.forEach(value => value.removeAllListeners());
	        this.emitterMap.clear();
	        this.workerQueue.Stop();
	    }
	}
	exports.StoreAsyncManager = StoreAsyncManager;


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const promiseQueue_1 = __webpack_require__(18);
	class WorkerQueue {
	    constructor(worker) {
	        this.worker = worker;
	        this.promiseQueue = new promiseQueue_1.PromiseQueue();
	    }
	    Push(getMessage) {
	        return this.promiseQueue.Push((resolve, reject) => {
	            this.worker.onmessage = (message) => {
	                resolve(message.data);
	            };
	            this.worker.onerror = (event) => {
	                console.log("Error in worker");
	                console.log(event);
	                reject();
	            };
	            this.worker.postMessage(getMessage());
	        });
	    }
	    Stop() {
	        this.promiseQueue.Stop();
	    }
	}
	exports.WorkerQueue = WorkerQueue;


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const deferredPromise_1 = __webpack_require__(19);
	class PromiseQueue {
	    constructor() {
	        this.running = false;
	        this.queue = [];
	    }
	    get OnComplete() {
	        if (!this.running)
	            return Promise.resolve();
	        if (!this.onComplete)
	            this.onComplete = new deferredPromise_1.DeferredPromise(resolve => {
	                resolve();
	            });
	        return this.onComplete;
	    }
	    Push(executor) {
	        var p = new deferredPromise_1.DeferredPromise(executor);
	        this.queue.push(p);
	        this.Execute();
	        return p;
	    }
	    Stop() {
	        this.queue = [];
	    }
	    Execute() {
	        if (this.running)
	            return;
	        this.running = true;
	        this.ExecuteRecursive();
	    }
	    ExecuteRecursive(queueIndex) {
	        queueIndex = queueIndex || 0;
	        if (queueIndex >= this.queue.length) {
	            this.running = false;
	            this.queue = [];
	            this.onComplete && this.onComplete.Invoke();
	            this.onComplete = null;
	            return;
	        }
	        this.queue[queueIndex].Invoke();
	        this.queue[queueIndex].then(() => this.ExecuteRecursive(++queueIndex));
	    }
	}
	exports.PromiseQueue = PromiseQueue;


/***/ }),
/* 19 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class DeferredPromise {
	    constructor(executor) {
	        this.promise = new Promise(r => {
	            this.resolve = r;
	        });
	        this.executor = executor;
	    }
	    Invoke() {
	        this.resolve(new Promise(this.executor));
	    }
	    then(onfulfilled, onrejected) {
	        return this.promise.then(onfulfilled, onrejected);
	    }
	    catch(onrejected) {
	        return this.promise.catch(onrejected);
	    }
	}
	exports.DeferredPromise = DeferredPromise;


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(21);
	var StoreWorker;
	(function (StoreWorker) {
	    var workerConstructor = null;
	    var workerParameter = null;
	    if (typeof Worker !== 'undefined') {
	        workerConstructor = Worker;
	        workerParameter = URL.createObjectURL(new Blob([`(${objectDiff_1.ObjectDiffScope})(false)`]));
	    }
	    else {
	        workerConstructor = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"webworker-threads\""); e.code = 'MODULE_NOT_FOUND'; throw e; }())).Worker;
	        workerParameter = objectDiff_1.ObjectDiffScope;
	    }
	    function Create() {
	        return new workerConstructor(workerParameter);
	    }
	    StoreWorker.Create = Create;
	})(StoreWorker = exports.StoreWorker || (exports.StoreWorker = {}));


/***/ }),
/* 21 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	function ObjectDiffScope(notWorker) {
	    const ctx = this;
	    if (ctx && !notWorker) {
	        let diff = CreateScope();
	        ctx.onmessage = function (event) {
	            var resp = diff(event.data);
	            ctx.postMessage(resp);
	        };
	    }
	    function CreateScope() {
	        var tracker = null;
	        function Call(data) {
	            switch (data.method) {
	                case "create":
	                    tracker = Create(data.arguments[0]);
	                    break;
	                case "diff":
	                    return tracker.Diff.apply(tracker, data.arguments);
	                case "getpath":
	                    return tracker.GetPath.apply(tracker, data.arguments);
	                default:
	                    throw `${data.method} is not supported`;
	            }
	        }
	        return Call;
	    }
	    function IsValue(value) {
	        if (!value)
	            return true;
	        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
	    }
	    function Create(idFunction) {
	        var localIdFunction = null;
	        if (typeof idFunction === 'string')
	            localIdFunction = eval(idFunction);
	        else if (idFunction)
	            localIdFunction = idFunction;
	        return new ObjectDiffTracker(localIdFunction);
	    }
	    class ObjectDiffTracker {
	        constructor(idFunction) {
	            this.idFunction = idFunction;
	            this.idToPathsMap = new Map();
	        }
	        GetPath(id) {
	            var paths = this.idToPathsMap.get(id);
	            if (paths)
	                return paths.values().next().value;
	            return null;
	        }
	        Diff(path, newValue, oldValue, skipDepentsProcessing) {
	            var resp = {
	                changedPaths: [],
	                deletedPaths: [],
	                pathDependencies: []
	            };
	            this.DiffValues(path, path, newValue, oldValue, skipDepentsProcessing, resp);
	            resp.changedPaths = resp.changedPaths.reverse();
	            return resp;
	        }
	        DiffValues(rootPath, path, newValue, oldValue, skipDependentsProcessing, resp) {
	            var newIsObject = !IsValue(newValue);
	            var oldIsObject = !IsValue(oldValue);
	            if (!newIsObject && !oldIsObject) {
	                if (newValue !== oldValue)
	                    resp.changedPaths.push(path);
	                return;
	            }
	            var newId = newIsObject && newValue && this.idFunction && this.idFunction(newValue);
	            var oldId = oldIsObject && oldValue && this.idFunction && this.idFunction(oldValue);
	            if (oldId && oldId !== newId) {
	                this.RemoveIdPath(oldId, path);
	            }
	            if (newId) {
	                var dependentPaths = this.AddIdPath(newId, path);
	                if (!skipDependentsProcessing) {
	                    var dependency = { path: path, targets: [] };
	                    dependentPaths.forEach(p => {
	                        if (p === path || p.indexOf(rootPath) === 0)
	                            return;
	                        dependency.targets.push(p);
	                    });
	                    if (dependency.targets.length > 0)
	                        resp.pathDependencies.push(dependency);
	                }
	            }
	            var newKeys = newIsObject ? new Set(Object.keys(newValue)) : new Set();
	            var oldKeys = oldIsObject ? Object.keys(oldValue) : [];
	            var pathChanged = false;
	            for (var x = 0; x < oldKeys.length; x++) {
	                var key = oldKeys[x];
	                var childPath = [path, key].join(".");
	                var deletedKey = !newKeys.has(key);
	                if (!deletedKey)
	                    newKeys.delete(key);
	                pathChanged = pathChanged || deletedKey;
	                if (deletedKey)
	                    this.DeletePaths(childPath, oldValue[key], resp);
	                else
	                    this.DiffValues(rootPath, childPath, newValue && newValue[key], oldValue[key], skipDependentsProcessing, resp);
	            }
	            newKeys.forEach(key => this.FindNewIds([path, key].join("."), newValue[key]));
	            if (pathChanged || newKeys.size > 0)
	                resp.changedPaths.push(path);
	        }
	        RemoveIdPath(id, path) {
	            var oldIdPaths = this.idToPathsMap.get(id);
	            if (oldIdPaths) {
	                oldIdPaths.delete(path);
	                if (oldIdPaths.size === 0)
	                    this.idToPathsMap.delete(id);
	            }
	        }
	        AddIdPath(id, path) {
	            var dependentPaths = this.idToPathsMap.get(id);
	            if (!dependentPaths) {
	                dependentPaths = new Set([path]);
	                this.idToPathsMap.set(id, dependentPaths);
	            }
	            else if (!dependentPaths.has(path))
	                dependentPaths.add(path);
	            return dependentPaths;
	        }
	        FindNewIds(path, value) {
	            if (IsValue(value))
	                return;
	            var id = value && this.idFunction && this.idFunction(value);
	            if (id)
	                this.AddIdPath(id, path);
	            for (var key in value)
	                this.FindNewIds([path, key].join("."), value[key]);
	        }
	        DeletePaths(path, value, resp) {
	            resp.deletedPaths.push(path);
	            var id = value && this.idFunction && this.idFunction(value);
	            if (id)
	                this.RemoveIdPath(id, path);
	            if (IsValue(value))
	                return;
	            for (var key in value)
	                this.DeletePaths([path, key].join("."), value[key], resp);
	        }
	    }
	    return CreateScope;
	}
	exports.ObjectDiffScope = ObjectDiffScope;
	exports.ObjectDiff = ObjectDiffScope(true);


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const utils_1 = __webpack_require__(23);
	const scopeCollector_1 = __webpack_require__(10);
	const storeAsyncWriter_1 = __webpack_require__(24);
	class StoreAsyncReader {
	    constructor(store) {
	        this.store = store;
	        this.watching = false;
	        this.writer = new storeAsyncWriter_1.StoreAsyncWriter(store);
	    }
	    get Root() {
	        var root = this.store.ResolvePropertyPath("root");
	        this.RegisterEmitter("root");
	        return this.CreateGetterObject(root, "root");
	    }
	    get Emitters() {
	        return this.emitterSet;
	    }
	    get Watching() {
	        return this.watching;
	    }
	    set Watching(val) {
	        this.emitterSet = val ? new Set() : this.emitterSet;
	        this.watching = val;
	    }
	    Get(id) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var path = yield this.store.GetPathById(id);
	            if (!path)
	                return undefined;
	            this.RegisterEmitter(path);
	            return this.CreateGetterObject(this.store.ResolvePropertyPath(path), path);
	        });
	    }
	    Destroy() {
	        this.destroyed = true;
	        this.watching = false;
	        this.emitterSet.clear();
	    }
	    GetArray(path) {
	        var localArray = this.store.ResolvePropertyPath(path);
	        var cachedArray = new Array(localArray.length);
	        for (var x = 0; x < cachedArray.length; x++)
	            cachedArray[x] = this.CreateGetterObject(localArray[x], [path, x].join("."));
	        return cachedArray;
	    }
	    CreateGetterObject(source, path) {
	        if (utils_1.IsValue(source) || source.___storeProxy) {
	            this.RegisterEmitter(path);
	            return source;
	        }
	        var ret = null;
	        if (Array.isArray(source)) {
	            ret = new Proxy([], {
	                get: (obj, prop) => {
	                    if (prop === '___storeProxy')
	                        return true;
	                    if (prop === '___path')
	                        return path;
	                    if (prop === 'toJSON')
	                        return () => {
	                            return this.store.ResolvePropertyPath(path);
	                        };
	                    if (typeof prop !== 'symbol') {
	                        var isInt = !isNaN(parseInt(prop));
	                        var childPath = [path, prop].join(".");
	                        if (isInt)
	                            this.RegisterEmitter(childPath);
	                        if (isInt || prop === 'length')
	                            return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
	                    }
	                    var ret = obj[prop];
	                    if (typeof ret === 'function') {
	                        var cachedArray = this.GetArray(path);
	                        return ret.bind(cachedArray);
	                    }
	                    return ret;
	                },
	                set: (obj, prop, value) => {
	                    var isInt = !isNaN(parseInt(prop));
	                    var childPath = [path, prop].join(".");
	                    if (isInt) {
	                        this.writer.WritePath(childPath, value);
	                    }
	                    else {
	                        obj[prop] = value;
	                    }
	                    return true;
	                }
	            });
	        }
	        else {
	            ret = new Proxy({}, {
	                get: (obj, prop) => {
	                    if (prop === '___storeProxy')
	                        return true;
	                    if (prop === '___path')
	                        return path;
	                    if (prop === 'toJSON')
	                        return () => {
	                            return this.store.ResolvePropertyPath(path);
	                        };
	                    if (typeof prop !== 'symbol') {
	                        var childPath = [path, prop].join(".");
	                        this.RegisterEmitter(childPath);
	                        return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
	                    }
	                    return obj[prop];
	                },
	                set: (obj, prop, value) => {
	                    var childPath = [path, prop].join(".");
	                    this.writer.WritePath(childPath, value);
	                    return true;
	                }
	            });
	        }
	        return ret;
	    }
	    RegisterEmitter(path) {
	        if (this.destroyed)
	            return;
	        var emitter = this.store.EnsureEmitter(path);
	        if (this.watching && !this.emitterSet.has(emitter))
	            this.emitterSet.add(emitter);
	        scopeCollector_1.scopeCollector.Register(emitter);
	    }
	}
	exports.StoreAsyncReader = StoreAsyncReader;


/***/ }),
/* 23 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	function IsValue(value) {
	    if (!value)
	        return true;
	    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
	}
	exports.IsValue = IsValue;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const utils_1 = __webpack_require__(23);
	class StoreAsyncWriter {
	    constructor(store) {
	        this.store = store;
	    }
	    Write(readOnly, updateCallback) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var path = null;
	            if (typeof readOnly === 'string')
	                path = this.store.GetPathById(readOnly);
	            var path = path || readOnly && readOnly.___path;
	            if (!path)
	                return;
	            yield this.WriteTo(path, updateCallback);
	        });
	    }
	    WritePath(path, value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.WriteTo(path, value);
	        });
	    }
	    Push(readOnly, newValue) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var path = readOnly.___path;
	            var localValue = this.store.ResolvePropertyPath(path);
	            var childPath = [path, localValue.length].join(".");
	            localValue.push(null);
	            yield this.WriteTo(childPath, newValue);
	            this.EmitSet(path);
	        });
	    }
	    WriteTo(path, updateCallback, skipDependents) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var value = this.ResolveUpdateCallback(path, updateCallback);
	            var diff = yield this.store.Diff(path, value, !!skipDependents);
	            this.store.AssignPropertyPath(value, path);
	            this.ProcessDiff(diff);
	        });
	    }
	    ResolveUpdateCallback(path, updateCallback) {
	        if (typeof updateCallback === 'function') {
	            var localValue = this.store.ResolvePropertyPath(path);
	            var mutableCopy = this.CreateCopy(localValue);
	            var ret = updateCallback(mutableCopy);
	            return typeof ret === 'undefined' ? mutableCopy : ret;
	        }
	        return updateCallback;
	    }
	    CreateCopy(source) {
	        if (utils_1.IsValue(source))
	            return source;
	        var ret = null;
	        if (Array.isArray(source)) {
	            ret = new Array(source.length);
	            for (var x = 0; x < source.length; x++)
	                ret[x] = this.CreateCopy(source[x]);
	            return ret;
	        }
	        ret = {};
	        for (var key in source)
	            ret[key] = this.CreateCopy(source[key]);
	        return ret;
	    }
	    ProcessDiff(data) {
	        data.changedPaths.forEach(p => {
	            this.EmitSet(p);
	        });
	        data.deletedPaths.forEach(p => {
	            this.store.DeleteEmitter(p);
	        });
	        data.pathDependencies.forEach(dep => {
	            var value = this.store.ResolvePropertyPath(dep.path);
	            dep.targets.forEach(target => {
	                this.WriteTo(target, value, true);
	            });
	        });
	    }
	    EmitSet(path) {
	        var emitter = this.store.EnsureEmitter(path);
	        emitter.emit("set");
	    }
	}
	exports.StoreAsyncWriter = StoreAsyncWriter;


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scopeBase_1 = __webpack_require__(8);
	const storeAsyncReader_1 = __webpack_require__(22);
	const storeAsyncWriter_1 = __webpack_require__(24);
	const scope_1 = __webpack_require__(7);
	class StoreAsyncQuery extends scopeBase_1.ScopeBase {
	    constructor(store, defaultValue, getFunction) {
	        super(getFunction, defaultValue);
	        this.reader = new storeAsyncReader_1.StoreAsyncReader(store);
	        this.writer = new storeAsyncWriter_1.StoreAsyncWriter(store);
	    }
	    Scope(callback) {
	        return new scope_1.Scope(() => callback(this.Value));
	    }
	    Destroy() {
	        super.Destroy();
	        this.reader.Destroy();
	    }
	    UpdateValue(callback) {
	        this.reader.Watching = true;
	        this.GetFunction(this.reader, this.writer).then(value => {
	            this.reader.Watching = false;
	            callback(this.reader.Emitters, value);
	        });
	    }
	}
	exports.StoreAsyncQuery = StoreAsyncQuery;


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const storeManager_1 = __webpack_require__(27);
	const storeReader_1 = __webpack_require__(28);
	const storeWriter_1 = __webpack_require__(29);
	const storeQuery_1 = __webpack_require__(30);
	class Store {
	    constructor(idFunction) {
	        this.manager = new storeManager_1.StoreManager(idFunction);
	        this.reader = new storeReader_1.StoreReader(this.manager);
	        this.writer = new storeWriter_1.StoreWriter(this.manager);
	        this.queryCache = new Map();
	    }
	    get Root() {
	        return this.reader.Root;
	    }
	    Action(action) {
	        action(this.reader, this.writer);
	    }
	    Query(id, queryFunc) {
	        if (this.queryCache.has(id))
	            return this.queryCache.get(id);
	        var query = new storeQuery_1.StoreQuery(this.manager, queryFunc);
	        query.addListener("destroy", () => {
	            this.queryCache.delete(id);
	        });
	        return query;
	    }
	    Destroy() {
	        this.queryCache.forEach(q => q.Destroy());
	        this.queryCache.clear();
	        this.manager.Destroy();
	    }
	}
	exports.Store = Store;
	(function (Store) {
	    function Create(init, idFunction) {
	        var store = new Store(idFunction);
	        store.Action((reader, writer) => {
	            writer.WritePath("root", init);
	        });
	        return store;
	    }
	    Store.Create = Create;
	})(Store = exports.Store || (exports.Store = {}));


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(9);
	const objectDiff_1 = __webpack_require__(21);
	class StoreManager {
	    constructor(idFunction) {
	        this.emitterMap = new Map();
	        this.diff = objectDiff_1.ObjectDiff();
	        this.diff({
	            method: "create",
	            arguments: [idFunction]
	        });
	    }
	    Diff(path, newValue, skipDependents) {
	        var oldValue = this.ResolvePropertyPath(path);
	        return this.diff({
	            method: "diff",
	            arguments: [path, newValue, oldValue, skipDependents]
	        });
	    }
	    GetPathById(id) {
	        var path = this.diff({
	            method: "getpath",
	            arguments: [id]
	        });
	        if (!path)
	            return;
	        return path;
	    }
	    EnsureEmitter(path) {
	        var emitter = this.emitterMap.get(path);
	        if (!emitter) {
	            emitter = new emitter_1.Emitter();
	            this.emitterMap.set(path, emitter);
	        }
	        return emitter;
	    }
	    AssignPropertyPath(value, path) {
	        var parts = path.split(".");
	        var prop = parts[parts.length - 1];
	        var parentParts = parts.slice(0, parts.length - 1);
	        var parentObj = this.ResolvePropertyPath(parentParts.join("."));
	        parentObj[prop] = value;
	    }
	    ResolvePropertyPath(path) {
	        if (!path)
	            return this;
	        return path.split(".").reduce((pre, curr) => {
	            return pre && pre[curr];
	        }, this);
	    }
	    DeleteEmitter(path) {
	        var emitter = this.emitterMap.get(path);
	        if (emitter) {
	            this.emitterMap.delete(path);
	            emitter.emit("destroy", emitter);
	        }
	    }
	    Destroy() {
	        this.root = null;
	        this.emitterMap.forEach(value => value.removeAllListeners());
	        this.emitterMap.clear();
	    }
	}
	exports.StoreManager = StoreManager;


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const utils_1 = __webpack_require__(23);
	const scopeCollector_1 = __webpack_require__(10);
	const storeWriter_1 = __webpack_require__(29);
	class StoreReader {
	    constructor(store) {
	        this.store = store;
	        this.watching = false;
	        this.writer = new storeWriter_1.StoreWriter(store);
	    }
	    get Root() {
	        var root = this.store.ResolvePropertyPath("root");
	        this.RegisterEmitter("root");
	        return this.CreateGetterObject(root, "root");
	    }
	    get Emitters() {
	        return this.emitterSet;
	    }
	    get Watching() {
	        return this.watching;
	    }
	    set Watching(val) {
	        this.emitterSet = val ? new Set() : this.emitterSet;
	        this.watching = val;
	    }
	    Get(id) {
	        var path = this.store.GetPathById(id);
	        if (!path)
	            return undefined;
	        this.RegisterEmitter(path);
	        return this.CreateGetterObject(this.store.ResolvePropertyPath(path), path);
	    }
	    Destroy() {
	        this.destroyed = true;
	        this.watching = false;
	        this.emitterSet.clear();
	    }
	    GetArray(path) {
	        var localArray = this.store.ResolvePropertyPath(path);
	        var cachedArray = new Array(localArray.length);
	        for (var x = 0; x < cachedArray.length; x++)
	            cachedArray[x] = this.CreateGetterObject(localArray[x], [path, x].join("."));
	        return cachedArray;
	    }
	    CreateGetterObject(source, path) {
	        if (utils_1.IsValue(source) || source.___storeProxy) {
	            this.RegisterEmitter(path);
	            return source;
	        }
	        var ret = null;
	        if (Array.isArray(source)) {
	            ret = new Proxy([], {
	                get: (obj, prop) => {
	                    if (prop === '___storeProxy')
	                        return true;
	                    if (prop === '___path')
	                        return path;
	                    if (prop === 'toJSON')
	                        return () => {
	                            return this.store.ResolvePropertyPath(path);
	                        };
	                    if (typeof prop !== 'symbol') {
	                        var isInt = !isNaN(parseInt(prop));
	                        var childPath = [path, prop].join(".");
	                        if (isInt)
	                            this.RegisterEmitter(childPath);
	                        if (isInt || prop === 'length')
	                            return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
	                    }
	                    var ret = obj[prop];
	                    if (typeof ret === 'function') {
	                        var cachedArray = this.GetArray(path);
	                        return ret.bind(cachedArray);
	                    }
	                    return ret;
	                },
	                set: (obj, prop, value) => {
	                    var isInt = !isNaN(parseInt(prop));
	                    var childPath = [path, prop].join(".");
	                    if (isInt) {
	                        this.writer.WritePath(childPath, value);
	                    }
	                    else {
	                        obj[prop] = value;
	                    }
	                    return true;
	                }
	            });
	        }
	        else {
	            ret = new Proxy({}, {
	                get: (obj, prop) => {
	                    if (prop === '___storeProxy')
	                        return true;
	                    if (prop === '___path')
	                        return path;
	                    if (prop === 'toJSON')
	                        return () => {
	                            return this.store.ResolvePropertyPath(path);
	                        };
	                    if (typeof prop !== 'symbol') {
	                        var childPath = [path, prop].join(".");
	                        this.RegisterEmitter(childPath);
	                        return this.CreateGetterObject(this.store.ResolvePropertyPath(childPath), childPath);
	                    }
	                    return obj[prop];
	                },
	                set: (obj, prop, value) => {
	                    var childPath = [path, prop].join(".");
	                    this.writer.WritePath(childPath, value);
	                    return true;
	                }
	            });
	        }
	        return ret;
	    }
	    RegisterEmitter(path) {
	        if (this.destroyed)
	            return;
	        var emitter = this.store.EnsureEmitter(path);
	        if (this.watching && !this.emitterSet.has(emitter))
	            this.emitterSet.add(emitter);
	        scopeCollector_1.scopeCollector.Register(emitter);
	    }
	}
	exports.StoreReader = StoreReader;


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const utils_1 = __webpack_require__(23);
	class StoreWriter {
	    constructor(store) {
	        this.store = store;
	    }
	    Write(readOnly, updateCallback) {
	        var path = null;
	        if (typeof readOnly === 'string')
	            path = this.store.GetPathById(readOnly);
	        var path = path || readOnly && readOnly.___path;
	        if (!path)
	            return;
	        this.WriteTo(path, updateCallback);
	    }
	    WritePath(path, value) {
	        this.WriteTo(path, value);
	    }
	    Push(readOnly, newValue) {
	        var path = readOnly.___path;
	        var localValue = this.store.ResolvePropertyPath(path);
	        var childPath = [path, localValue.length].join(".");
	        localValue.push(null);
	        this.WriteTo(childPath, newValue);
	        this.EmitSet(path);
	    }
	    WriteTo(path, updateCallback, skipDependents) {
	        var value = this.ResolveUpdateCallback(path, updateCallback);
	        var diff = this.store.Diff(path, value, !!skipDependents);
	        this.store.AssignPropertyPath(value, path);
	        this.ProcessDiff(diff);
	    }
	    ResolveUpdateCallback(path, updateCallback) {
	        if (typeof updateCallback === 'function') {
	            var localValue = this.store.ResolvePropertyPath(path);
	            var mutableCopy = this.CreateCopy(localValue);
	            var ret = updateCallback(mutableCopy);
	            return typeof ret === 'undefined' ? mutableCopy : ret;
	        }
	        return updateCallback;
	    }
	    CreateCopy(source) {
	        if (utils_1.IsValue(source))
	            return source;
	        var ret = null;
	        if (Array.isArray(source)) {
	            ret = new Array(source.length);
	            for (var x = 0; x < source.length; x++)
	                ret[x] = this.CreateCopy(source[x]);
	            return ret;
	        }
	        ret = {};
	        for (var key in source)
	            ret[key] = this.CreateCopy(source[key]);
	        return ret;
	    }
	    ProcessDiff(data) {
	        data.changedPaths.forEach(p => {
	            this.EmitSet(p);
	        });
	        data.deletedPaths.forEach(p => {
	            this.store.DeleteEmitter(p);
	        });
	        data.pathDependencies.forEach(dep => {
	            var value = this.store.ResolvePropertyPath(dep.path);
	            dep.targets.forEach(target => {
	                this.WriteTo(target, value, true);
	            });
	        });
	    }
	    EmitSet(path) {
	        var emitter = this.store.EnsureEmitter(path);
	        emitter.emit("set");
	    }
	}
	exports.StoreWriter = StoreWriter;


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scopeBase_1 = __webpack_require__(8);
	const storeReader_1 = __webpack_require__(28);
	const scope_1 = __webpack_require__(7);
	const storeWriter_1 = __webpack_require__(29);
	class StoreQuery extends scopeBase_1.ScopeBase {
	    constructor(store, getFunction) {
	        super(getFunction, null);
	        this.reader = new storeReader_1.StoreReader(store);
	        this.writer = new storeWriter_1.StoreWriter(store);
	    }
	    Scope(callback) {
	        return new scope_1.Scope(() => callback(this.Value));
	    }
	    Destroy() {
	        super.Destroy();
	        this.reader.Destroy();
	    }
	    UpdateValue(callback) {
	        this.reader.Watching = true;
	        var value = this.GetFunction(this.reader, this.writer);
	        this.reader.Watching = false;
	        callback(this.reader.Emitters, value);
	    }
	}
	exports.StoreQuery = StoreQuery;


/***/ })
/******/ ]);