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
	const objectStore_1 = __webpack_require__(8);
	const elements_1 = __webpack_require__(13);
	var data = [];
	for (var x = 0; x < 10000; x++) {
	    data[x] = {
	        _id: `root_${x}`,
	        name: `item ${x}`,
	        child: {
	            _id: `child_${Math.ceil(Math.random() * 3)}`,
	            name: `child item ${x}`
	        }
	    };
	}
	var count = 0;
	var store = objectStore_1.ObjectStore.Create([], (val) => val._id);
	setTimeout(() => {
	    store.Write(store.Root, () => data);
	}, 5000);
	class Comp extends template_1.Template {
	    constructor() {
	        super("app");
	        this.state = objectStore_1.ObjectStore.Create({ filter: "" });
	    }
	    get VisibleItems() {
	        var s = new Date();
	        var d = data.filter(i => {
	            return i.child.name.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0;
	        });
	        var e = new Date();
	        console.log(`Raw data processed in ${e.getTime() - s.getTime()} milliseconds`);
	        var start = new Date();
	        var ret = store.Root.filter(i => {
	            return i.child.name.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0;
	        });
	        var end = new Date();
	        console.log(`Data processed in ${end.getTime() - start.getTime()} milliseconds`);
	        return ret;
	    }
	    Template() {
	        return [
	            elements_1.input({ props: () => ({ type: "button", value: "click" }), on: () => ({ click: this.onClick.bind(this) }) }),
	            elements_1.input({ props: () => ({ type: "text", value: "" }), on: () => ({ keyup: this.onKeyUp.bind(this) }) }),
	            elements_1.div({ key: i => i._id, data: () => this.VisibleItems }, (item) => [
	                elements_1.div({ text: () => item.name }),
	                elements_1.div({ data: () => item.child }, (child) => [
	                    elements_1.div({ text: () => `Id: ${child._id} Name: ${child.name}` })
	                ])
	            ])
	        ];
	    }
	    onClick() {
	        store.Root[42].child.name = "test";
	    }
	    onKeyUp(e) {
	        if (this.state.Root.filter === e.target.value)
	            return;
	        var start = new Date();
	        this.state.Write(this.state.Root, (val) => { val.filter = e.target.value; });
	        this.UpdateComplete(() => {
	            var end = new Date();
	            console.log(`Update complete in ${end.getTime() - start.getTime()} milliseconds`);
	        });
	    }
	}
	const browser_1 = __webpack_require__(4);
	var container = browser_1.browser.window.document.getElementById("container");
	var comp = new Comp();
	var start = new Date();
	comp.AttachTo(container);
	var end = new Date();
	console.log(`Attached in ${end.getTime() - start.getTime()} milliseconds`);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const bindingConfig_1 = __webpack_require__(2);
	const propertyBinding_1 = __webpack_require__(5);
	const dataBinding_1 = __webpack_require__(10);
	const textBinding_1 = __webpack_require__(11);
	const eventBinding_1 = __webpack_require__(12);
	function TemplateFunction(type, templateDefinition, children) {
	    return {
	        type: type,
	        props: templateDefinition && templateDefinition.props,
	        on: templateDefinition && templateDefinition.on,
	        data: templateDefinition && templateDefinition.data,
	        key: templateDefinition && templateDefinition.key,
	        text: templateDefinition && templateDefinition.text,
	        children: children,
	        rebind: templateDefinition && templateDefinition.rebind
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
	        rebind: componentDefinition && componentDefinition.rebind
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
	        ret.push(new dataBinding_1.default(bindingTarget, def1.data, def1.children, def1.rebind, def1.key));
	    }
	    return ret;
	}
	class Template {
	    constructor(definition) {
	        if (typeof definition === 'string')
	            definition = ComponentFunction(definition, this.constructor);
	        this.templates = this.DefaultTemplates;
	        this.SetTemplates(definition.templates);
	        definition.children = definition.children || this.Template.bind(this);
	        this.bindingDefinition = definition;
	    }
	    get DefaultTemplates() {
	        return {};
	    }
	    get Templates() {
	        return this.templates;
	    }
	    get Root() {
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
	        if (!this.bindingRoot)
	            this.BindRoot();
	        bindingConfig_1.BindingConfig.addChild(bindingParent, this.bindingRoot);
	    }
	    AttachToContainer(container) {
	        if (!this.bindingRoot)
	            this.BindRoot();
	        bindingConfig_1.BindingConfig.addContainerChild(container, this.bindingRoot);
	    }
	    AttachBefore(bindingParent, template) {
	        if (!this.bindingRoot)
	            this.BindRoot();
	        bindingConfig_1.BindingConfig.addChildBefore(bindingParent, template && template.bindingRoot, this.bindingRoot);
	    }
	    AttachAfter(bindingParent, template) {
	        if (!this.bindingRoot)
	            this.BindRoot();
	        bindingConfig_1.BindingConfig.addChildAfter(bindingParent, template && template.bindingRoot, this.bindingRoot);
	    }
	    Detach() {
	        bindingConfig_1.BindingConfig.remove(this.bindingRoot);
	    }
	    Destroy() {
	        this.Detach();
	        this.bindingRoot = null;
	        this.bindings.forEach(b => b.Destroy());
	        this.bindings = [];
	    }
	    Template(c, i) {
	        return [];
	    }
	    BindRoot() {
	        this.bindingRoot = bindingConfig_1.BindingConfig.createBindingTarget(this.bindingDefinition.type);
	        this.bindings = BindTarget(this.bindingRoot, this.bindingDefinition);
	    }
	}
	exports.Template = Template;
	(function (Template) {
	    function ToFunction(type, classType) {
	        return CreateComponentFunction(type, classType);
	    }
	    Template.ToFunction = ToFunction;
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
	const browser_1 = __webpack_require__(4);
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
	exports.browser = {
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
	exports.browser.immediateAnimationFrames = false;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(6);
	class PropertyBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, null);
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
	const objectStoreScope_1 = __webpack_require__(7);
	const bindingConfig_1 = __webpack_require__(2);
	var BindingStatus;
	(function (BindingStatus) {
	    BindingStatus[BindingStatus["Init"] = 0] = "Init";
	    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
	    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
	    BindingStatus[BindingStatus["Destroyed"] = 3] = "Destroyed";
	})(BindingStatus || (BindingStatus = {}));
	class Binding {
	    constructor(boundTo, binding, config) {
	        this.boundTo = boundTo;
	        this.status = BindingStatus.Init;
	        this.setCallback = this.Update.bind(this);
	        this.observableScope = new objectStoreScope_1.ObjectStoreScope(binding);
	        this.observableScope.addListener("set", this.setCallback);
	        this.Init(config);
	        this.Update();
	    }
	    get Value() {
	        return this.observableScope.Value;
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
	    Init(config) { }
	    ;
	}
	exports.Binding = Binding;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectStore_1 = __webpack_require__(8);
	const emitter_1 = __webpack_require__(9);
	class ObjectStoreScope extends emitter_1.Emitter {
	    constructor(valueFunction) {
	        super();
	        this.valueFunction = valueFunction;
	        this.trackedEmitters = new Set();
	        this.setCallback = this.SetCallback.bind(this);
	        this.UpdateValue();
	    }
	    get Value() {
	        if (!this.dirty)
	            return this.value;
	        this.UpdateValue();
	        return this.value;
	    }
	    Destroy() {
	        this.removeAllListeners();
	        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
	        this.trackedEmitters.clear();
	    }
	    UpdateValue() {
	        var newEmitters = objectStore_1.ObjectStore.Watch(() => {
	            this.value = this.valueFunction();
	        });
	        var newSet = new Set(newEmitters);
	        this.trackedEmitters.forEach(emitter => {
	            if (!newSet.has(emitter))
	                emitter.removeListener("set", this.setCallback);
	        });
	        newSet.forEach(emitter => emitter.addListener("set", this.setCallback));
	        this.trackedEmitters = newSet;
	        this.dirty = false;
	    }
	    SetCallback() {
	        this.dirty = true;
	        this.emit("set");
	    }
	}
	exports.ObjectStoreScope = ObjectStoreScope;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(9);
	function IsValue(value) {
	    if (!value)
	        return true;
	    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
	}
	var globalEmitter = new emitter_1.default();
	class ObjectStoreEmitter extends emitter_1.default {
	    constructor(___path) {
	        super();
	        this.___path = ___path;
	    }
	}
	class Value {
	    constructor() { }
	    get Value() {
	        return this.getValue();
	    }
	    set Value(val) {
	        this.setValue(val);
	    }
	    toString() {
	        var val = this.Value;
	        return val && val.toString();
	    }
	    valueOf() {
	        var val = this.Value;
	        return val && val.valueOf();
	    }
	}
	exports.Value = Value;
	class StoreValue extends Value {
	    constructor(store, valuePath) {
	        super();
	        this.store = store;
	        this.valuePath = valuePath;
	    }
	    getValue() {
	        var emitter = this.store.GetEmitter(this.valuePath);
	        globalEmitter.emit("get", emitter);
	        return this.store.GetValue(this.valuePath);
	    }
	    setValue(val) {
	        this.store.SetValue(this.valuePath, val);
	        this.store.GetEmitter(this.valuePath).emit("set");
	    }
	}
	class LoneValue extends Value {
	    constructor(value) {
	        super();
	        this.value = value;
	        this.emitter = new emitter_1.default();
	    }
	    getValue() {
	        globalEmitter.emit("get", this.emitter);
	        return this.value;
	    }
	    setValue(val) {
	        this.value = val;
	        this.emitter.emit("set");
	    }
	}
	class ObjectStore {
	    constructor(idCallback) {
	        this.getIdCallback = idCallback;
	        this.emitterMap = new Map();
	        this.emitterMap.set("root", new ObjectStoreEmitter("root"));
	        this.getterMap = new Map();
	        this.idToPathsMap = new Map();
	    }
	    get Root() {
	        this.EmitGet("root");
	        var ret = this.getterMap.get("root");
	        return ret || this.CreateGetterObject(this.root, "root");
	    }
	    set Root(val) {
	        this.Write(null, () => val);
	    }
	    Get(id) {
	        var paths = this.idToPathsMap.get(id);
	        if (!paths)
	            return null;
	        var path = paths.values().next().value;
	        var value = this.ResolvePropertyPath(path);
	        return this.CreateGetterObject(value, path);
	    }
	    GetEmitter(path) {
	        return this.emitterMap.get(path);
	    }
	    GetValue(path) {
	        var value = this.ResolvePropertyPath(path);
	        if (!IsValue(value))
	            throw `Store path: ${path} does not resolve to a value type`;
	        return value;
	    }
	    SetValue(path, value) {
	        if (!IsValue(value))
	            throw `Can only set value types by path`;
	        this.WriteTo(path, path, value);
	    }
	    Value(valueFunction) {
	        var emitters = ObjectStore.Watch(() => valueFunction());
	        var emitter = emitters[emitters.length - 1];
	        if (emitter && emitter === this.emitterMap.get(emitter.___path))
	            return new StoreValue(this, emitter.___path);
	        throw `Invalid value expression. ${emitter ? 'Found emitter does not belong to this store.' : 'No emitters found.'}`;
	    }
	    Write(readOnly, updateCallback) {
	        if (typeof readOnly === 'string')
	            readOnly = this.Get(readOnly);
	        var path = readOnly ? readOnly.___path : "root";
	        var localValue = this.ResolvePropertyPath(path);
	        var mutableCopy = this.CreateCopy(localValue);
	        var newValue = updateCallback(mutableCopy);
	        this.WriteTo(path, path, typeof newValue !== "undefined" ? newValue : mutableCopy);
	        ;
	    }
	    WriteTo(rootPath, path, value, skipDependents) {
	        var localValue = this.ResolvePropertyPath(path);
	        if (localValue === value)
	            return;
	        this.AssignPropertyPath(value, path);
	        this.ProcessChanges(rootPath, path, value, localValue, skipDependents);
	    }
	    ProcessChanges(rootPath, path, value, oldValue, skipDependents) {
	        this.emitterMap.delete(path);
	        var newId = value && this.getIdCallback && this.getIdCallback(value);
	        var oldId = oldValue && this.getIdCallback && this.getIdCallback(oldValue);
	        if (oldId && oldId !== newId) {
	            var oldIdPaths = this.idToPathsMap.get(oldId);
	            oldIdPaths.delete(path);
	            if (oldIdPaths.size === 0)
	                this.idToPathsMap.delete(oldId);
	        }
	        if (!skipDependents && newId) {
	            var dependentPaths = this.idToPathsMap.get(newId);
	            if (!dependentPaths) {
	                dependentPaths = new Set([path]);
	                this.idToPathsMap.set(newId, dependentPaths);
	            }
	            else if (!dependentPaths.has(path))
	                dependentPaths.add(path);
	            dependentPaths.forEach(p => {
	                if (p === path || p.indexOf(rootPath) === 0)
	                    return;
	                this.WriteTo(rootPath, p, value, true);
	            });
	        }
	        var skipProperties = new Set();
	        if (!IsValue(value)) {
	            for (var key in value) {
	                var childPath = [path, key].join(".");
	                this.ProcessChanges(rootPath, childPath, value[key], oldValue && oldValue[key], skipDependents);
	                skipProperties.add(key);
	            }
	        }
	        this.CleanUp(oldValue, skipProperties, path);
	        this.EmitSet(path);
	    }
	    CleanUp(value, skipProperties, path) {
	        if (!IsValue(value)) {
	            for (var key in value) {
	                if (!(skipProperties && skipProperties.has(key))) {
	                    var childPath = [path, key].join(".");
	                    this.emitterMap.delete(childPath);
	                    this.getterMap.delete(childPath);
	                    this.CleanUp(value[key], null, childPath);
	                }
	            }
	            if (!skipProperties || skipProperties.size === 0) {
	                var id = this.getIdCallback && this.getIdCallback(value);
	                if (id) {
	                    var paths = this.idToPathsMap.get(id);
	                    if (paths) {
	                        paths.delete(path);
	                        if (paths.size === 0)
	                            this.idToPathsMap.delete(id);
	                    }
	                }
	            }
	        }
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
	    CreateGetterObject(source, path) {
	        if (IsValue(source))
	            return source;
	        var ret = null;
	        if (Array.isArray(source)) {
	            ret = new Array(source.length);
	            for (var x = 0; x < source.length; x++)
	                ret[x] = this.CreateGetterObject(source[x], [path, x].join("."));
	        }
	        else {
	            ret = new Object();
	            for (var key in source)
	                this.CreateGetter(ret, path, key);
	        }
	        Object.defineProperty(ret, "___path", {
	            value: path,
	            configurable: false,
	            enumerable: false,
	            writable: false
	        });
	        this.getterMap.set(path, ret);
	        return ret;
	    }
	    CreateGetter(target, parentPath, property) {
	        var path = [parentPath, property].join('.');
	        Object.defineProperty(target, property, {
	            enumerable: true,
	            get: () => {
	                var val = this.ResolvePropertyPath(path);
	                this.EmitGet(path);
	                var ret = this.getterMap.get(path);
	                return ret || this.CreateGetterObject(val, path);
	            },
	        });
	    }
	    CreateCopy(source) {
	        if (IsValue(source))
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
	    EmitSet(path) {
	        var emitter = this.emitterMap.get(path);
	        if (!emitter) {
	            emitter = new ObjectStoreEmitter(path);
	            this.emitterMap.set(path, emitter);
	        }
	        emitter.emit("set");
	    }
	    EmitGet(path) {
	        var emitter = this.emitterMap.get(path);
	        if (!emitter) {
	            emitter = new ObjectStoreEmitter(path);
	            this.emitterMap.set(path, emitter);
	        }
	        globalEmitter.emit("get", emitter);
	    }
	}
	exports.ObjectStore = ObjectStore;
	(function (ObjectStore) {
	    function Create(value, idCallback) {
	        if (IsValue(value))
	            throw "Only arrays and JSON types are supported";
	        var store = new ObjectStore(idCallback);
	        store.Root = value;
	        return store;
	    }
	    ObjectStore.Create = Create;
	    function Watch(callback) {
	        var emitters = new Set();
	        globalEmitter.addListener("get", (emitter) => {
	            if (!emitters.has(emitter))
	                emitters.add(emitter);
	        });
	        callback();
	        globalEmitter.removeAllListeners();
	        return [...emitters];
	    }
	    ObjectStore.Watch = Watch;
	    function Value(val) {
	        if (!IsValue(val))
	            "Parameter is not a valid value type";
	        return new LoneValue(val);
	    }
	    ObjectStore.Value = Value;
	})(ObjectStore = exports.ObjectStore || (exports.ObjectStore = {}));


/***/ }),
/* 9 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class Emitter {
	    constructor() {
	        this.callbackMap = {};
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
	        var events = this.callbackMap[name];
	        events && events.forEach(c => c(...args));
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
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(6);
	const template_1 = __webpack_require__(1);
	const bindingConfig_1 = __webpack_require__(2);
	function CreateTemplate(bindingDef) {
	    var constructor = (bindingDef.class || template_1.Template);
	    var template = new constructor(bindingDef);
	    return template;
	}
	class DataBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction, childrenFunction, rebind, keyFunction) {
	        super(boundTo, bindingFunction, childrenFunction);
	        this.rebind = rebind;
	        this.keyFunction = keyFunction;
	    }
	    Destroy() {
	        super.Destroy();
	        this.DestroyTemplates(this.activeTemplateMap);
	        this.activeTemplateMap = null;
	    }
	    Init(childrenFunction) {
	        this.activeTemplateMap = new Map();
	        this.activeKeys = [];
	        this.childrenFunction = childrenFunction;
	    }
	    Apply() {
	        var value = this.Value;
	        if (!value)
	            value = [];
	        else if (!Array.isArray(value))
	            value = [value];
	        var newTemplateMap = new Map();
	        var newKeys = [];
	        var container = bindingConfig_1.BindingConfig.createContainer();
	        var previousTemplate = null;
	        for (var x = 0; x < value.length; x++) {
	            var newKey = this.keyFunction && this.keyFunction(value[x]) || x;
	            newKeys.push(newKey);
	            var newTemplates = this.activeTemplateMap.get(newKey);
	            if (!newTemplates) {
	                var newDefs = this.childrenFunction(value[x], x);
	                if (!Array.isArray(newDefs))
	                    newDefs = [newDefs];
	                newTemplates = newDefs.map(d => CreateTemplate(d));
	            }
	            newTemplateMap.set(newKey, newTemplates);
	            this.activeTemplateMap.delete(newKey);
	            if (x >= this.activeKeys.length) {
	                newTemplates.forEach(t => {
	                    t.AttachToContainer(container);
	                    previousTemplate = t;
	                });
	            }
	            else if (newKey !== this.activeKeys[x]) {
	                newTemplates.forEach(t => {
	                    t.AttachAfter(this.BoundTo, previousTemplate);
	                    previousTemplate = t;
	                });
	            }
	            else {
	                previousTemplate = newTemplates[newTemplates.length - 1] || previousTemplate;
	            }
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
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(6);
	const bindingConfig_1 = __webpack_require__(2);
	class TextBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, null);
	    }
	    Apply() {
	        bindingConfig_1.BindingConfig.setText(this.BoundTo, this.Value);
	    }
	}
	exports.default = TextBinding;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(6);
	const bindingConfig_1 = __webpack_require__(2);
	class EventBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, null);
	    }
	    Destroy() {
	        super.Destroy();
	        for (var key in this.boundEvents)
	            bindingConfig_1.BindingConfig.removeListener(this.BoundTo, key, this.boundEvents[key]);
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
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const template_1 = __webpack_require__(1);
	function a(templateDefinition, children) {
	    return template_1.TemplateFunction("a", templateDefinition, children);
	}
	exports.a = a;
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


/***/ })
/******/ ]);