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
	const objectStore_1 = __webpack_require__(13);
	exports.Store = objectStore_1.Store;
	const objectStoreScope_1 = __webpack_require__(7);
	exports.Scope = objectStoreScope_1.Scope;
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
	const objectStoreAsync_1 = __webpack_require__(15);
	class DataTable extends template_1.Component {
	    get DefaultTemplates() {
	        return {
	            cell: (scope) => elements_1.span({ text: () => {
	                    var data = scope;
	                    return `${data.data[scope.column.id]}`;
	                } })
	        };
	    }
	    Template(scope) {
	        return [
	            elements_1.table({ key: d => d, data: () => [{ id: "header" }, ...scope.Value.data] }, (data, index) => {
	                if (index === 0)
	                    return elements_1.tr({ key: c => c.id, data: () => scope.Value.columns }, (scope) => [
	                        elements_1.th({ text: () => scope.name })
	                    ]);
	                return elements_1.tr({ key: c => c.id, data: () => scope.Value.columns }, (column, index) => [
	                    elements_1.td({ data: () => ({ column: column, data: data }) }, (scope) => this.Templates.cell(scope, index))
	                ]);
	            })
	        ];
	    }
	}
	var dataTable = template_1.Template.ToFunction("datatable", DataTable);
	class Root extends template_1.Template {
	    constructor() {
	        super("app");
	        this.state = objectStoreAsync_1.StoreAsync.Create({ filter: "" });
	        this.columns = objectStoreAsync_1.StoreAsync.Create([
	            {
	                id: "id",
	                name: "Id",
	                visible: true,
	                sort: 0
	            },
	            {
	                id: "name",
	                name: "Name",
	                visible: true,
	                sort: 1
	            },
	            {
	                id: "title",
	                name: "Title",
	                visible: true,
	                sort: 2
	            }
	        ]);
	        this.data = objectStoreAsync_1.StoreAsync.Create([
	            {
	                id: 1,
	                name: "Bart",
	                title: "Title 1"
	            },
	            {
	                id: 2,
	                name: "Craig",
	                title: "Title 2"
	            }
	        ]);
	        this.dataScope = this.data.Scope((root) => root.filter(d => d.name.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0 ||
	            d.title.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0));
	        this.columnsScope = this.columns.Scope((root) => root.filter(c => c.visible)).Scope((val) => {
	            val.sort((a, b) => a.sort - b.sort);
	            return val;
	        });
	    }
	    Template() {
	        return [
	            elements_1.input({ props: { type: 'text' }, on: { keyup: (e) => this.state.Root.filter = e.target.value } }),
	            dataTable({ data: () => ({ columns: this.columnsScope.Value, data: this.dataScope.Value }) }),
	            elements_1.input({ props: { type: 'button', value: 'add' }, on: { click: () => {
	                        this.data.Write(this.data.Root, (val) => {
	                            val.push({
	                                id: this.data.Root.length + 1,
	                                name: `garbage ${this.data.Root.length + 1}`,
	                                title: `title ${this.data.Root.length + 1}`
	                            });
	                        });
	                    } } }),
	            elements_1.ul({ data: this.columns.Root }, (column) => [
	                elements_1.li({}, () => [
	                    elements_1.input({ props: () => ({ type: "checkbox", checked: column.visible }), on: {
	                            change: () => column.visible = !column.visible
	                        } }),
	                    elements_1.span({ text: () => column.name }),
	                    elements_1.input({ props: { type: "text", value: column.sort }, on: { keyup: (e) => {
	                                var sort = parseInt(e.target.value);
	                                if (!isNaN(sort))
	                                    column.sort = sort;
	                            } } })
	                ])
	            ])
	        ];
	    }
	}
	var list = new Root();
	list.AttachTo(document.getElementById("container"));


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
	const objectStoreScope_1 = __webpack_require__(7);
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
	    constructor(definition) {
	        if (typeof definition === 'string')
	            definition = ComponentFunction(definition, this.constructor);
	        this.templates = this.DefaultTemplates;
	        this.SetTemplates(definition.templates);
	        definition.children = definition.children || this.Template.bind(this);
	        this.definition = definition;
	    }
	    get DefaultTemplates() {
	        return {};
	    }
	    get Templates() {
	        return this.templates;
	    }
	    get Root() {
	        if (!this.bindingRoot) {
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
	    }
	    Template(c, i) {
	        return [];
	    }
	}
	exports.Template = Template;
	class Component extends Template {
	    constructor(definition) {
	        if (typeof definition === 'string')
	            super(definition);
	        else if (typeof definition.data === 'function') {
	            definition.data = new objectStoreScope_1.Scope(definition.data);
	            super(definition);
	        }
	        else {
	            var data = definition.data;
	            definition.data = new objectStoreScope_1.Scope(() => data);
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
	        if (typeof binding === 'function') {
	            this.observableScope = new objectStoreScope_1.Scope(binding);
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
	    Init(config) { }
	    ;
	}
	exports.Binding = Binding;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(8);
	const globalEmitter_1 = __webpack_require__(9);
	class Scope extends emitter_1.Emitter {
	    constructor(getFunction, setFunction) {
	        super();
	        this.getFunction = getFunction;
	        this.setFunction = setFunction;
	        this.trackedEmitters = new Set();
	        this.setCallback = this.SetCallback.bind(this);
	        this.dirty = true;
	    }
	    get Value() {
	        globalEmitter_1.globalEmitter.Register(this);
	        if (!this.dirty)
	            return this.value;
	        this.UpdateValue();
	        return this.value;
	    }
	    set Value(val) {
	        this.setFunction && this.setFunction(val);
	    }
	    Scope(getFunction, setFunction) {
	        return new Scope(() => getFunction(this.Value), (val) => setFunction(this.Value, val));
	    }
	    Destroy() {
	        this.removeAllListeners();
	        this.trackedEmitters.forEach(c => c.removeListener("set", this.setCallback));
	        this.trackedEmitters.clear();
	    }
	    UpdateValue() {
	        var newEmitters = globalEmitter_1.globalEmitter.Watch(() => {
	            try {
	                this.value = this.getFunction();
	            }
	            catch (err) {
	                console.error(err);
	            }
	        });
	        this.trackedEmitters.forEach(emitter => {
	            if (!newEmitters.has(emitter))
	                emitter.removeListener("set", this.setCallback);
	        });
	        newEmitters.forEach(emitter => emitter.addListener("set", this.setCallback));
	        this.trackedEmitters = newEmitters;
	        this.dirty = false;
	    }
	    SetCallback() {
	        this.dirty = true;
	        this.emit("set");
	    }
	}
	exports.Scope = Scope;


/***/ }),
/* 8 */
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
/* 9 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class GlobalEmitter {
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
	exports.globalEmitter = new GlobalEmitter();


/***/ }),
/* 10 */
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
	        var bindingWrapper = null;
	        if (typeof bindingFunction === 'function')
	            bindingWrapper = () => {
	                var value = bindingFunction();
	                value = ConvertToArray(value);
	                return value.map((curr, index) => {
	                    return {
	                        value: curr,
	                        key: keyFunction && keyFunction(curr) || index
	                    };
	                });
	            };
	        else {
	            bindingWrapper = ConvertToArray(bindingFunction).map((curr, index) => {
	                return {
	                    value: curr,
	                    key: keyFunction && keyFunction(curr) || index
	                };
	            });
	        }
	        super(boundTo, bindingWrapper, { children: childrenFunction, key: keyFunction });
	    }
	    Destroy() {
	        super.Destroy();
	        this.DestroyTemplates(this.activeTemplateMap);
	        this.activeTemplateMap = null;
	    }
	    Init(config) {
	        this.activeTemplateMap = new Map();
	        this.activeKeys = [];
	        this.childrenFunction = config.children;
	        this.keyFunction = config.key;
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
	const emitter_1 = __webpack_require__(8);
	const globalEmitter_1 = __webpack_require__(9);
	const objectStoreScope_1 = __webpack_require__(7);
	function IsValue(value) {
	    if (!value)
	        return true;
	    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
	}
	class Store {
	    constructor(idCallback) {
	        this.getIdCallback = idCallback;
	        this.emitterMap = new Map();
	        this.emitterMap.set("root", new emitter_1.default());
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
	    Scope(valueFunction, setFunction) {
	        return new objectStoreScope_1.Scope(() => valueFunction(this.Root), (next) => setFunction(this.Root, next));
	    }
	    Get(id) {
	        var paths = this.idToPathsMap.get(id);
	        if (!paths)
	            return null;
	        var path = paths.values().next().value;
	        this.EmitGet(path);
	        var ret = this.getterMap.get(path);
	        return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
	    }
	    Write(readOnly, updateCallback) {
	        if (typeof readOnly === 'string') {
	            readOnly = this.Get(readOnly);
	            if (!readOnly)
	                return;
	        }
	        var path = readOnly ? readOnly.___path : "root";
	        var localValue = this.ResolvePropertyPath(path);
	        var newValue = null;
	        var mutableCopy = null;
	        if (typeof updateCallback === 'function') {
	            mutableCopy = this.CreateCopy(localValue);
	            newValue = updateCallback(mutableCopy);
	        }
	        else
	            newValue = updateCallback;
	        this.WriteTo(path, typeof newValue !== "undefined" ? newValue : mutableCopy);
	    }
	    Push(readOnly, newValue) {
	        var path = readOnly.___path;
	        var localValue = this.ResolvePropertyPath(path);
	        var oldLength = localValue.length;
	        var childPath = [path, oldLength].join(".");
	        localValue.push(null);
	        this.WriteTo(childPath, newValue);
	        var getterValue = this.getterMap.get(path);
	        getterValue.push(this.CreateGetterObject(newValue, childPath));
	        this.EmitSet(path);
	    }
	    WriteTo(path, value, skipDependents) {
	        var localValue = this.ResolvePropertyPath(path);
	        if (localValue === value)
	            return;
	        this.AssignPropertyPath(value, path);
	        this.ProcessChanges(path, path, value, localValue, skipDependents);
	    }
	    ProcessChanges(rootPath, path, value, oldValue, skipDependents) {
	        this.getterMap.delete(path);
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
	                this.WriteTo(p, value, true);
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
	            ret = Object.create(null);
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
	                this.EmitGet(path);
	                var ret = this.getterMap.get(path);
	                return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
	            },
	            set: (val) => {
	                this.WriteTo(path, val);
	            }
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
	            emitter = new emitter_1.default();
	            this.emitterMap.set(path, emitter);
	        }
	        emitter.emit("set");
	    }
	    EmitGet(path) {
	        var emitter = this.emitterMap.get(path);
	        if (!emitter) {
	            emitter = new emitter_1.default();
	            this.emitterMap.set(path, emitter);
	        }
	        globalEmitter_1.globalEmitter.Register(emitter);
	    }
	}
	exports.Store = Store;
	(function (Store) {
	    function Create(value, idCallback) {
	        if (IsValue(value))
	            throw "Only arrays and JSON types are supported";
	        var store = new Store(idCallback);
	        store.Root = value;
	        return store;
	    }
	    Store.Create = Create;
	})(Store = exports.Store || (exports.Store = {}));


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
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(8);
	const globalEmitter_1 = __webpack_require__(9);
	const objectStoreScope_1 = __webpack_require__(7);
	const objectStoreWorker_1 = __webpack_require__(16);
	function IsValue(value) {
	    if (!value)
	        return true;
	    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
	}
	class StoreAsync {
	    constructor(idCallback) {
	        this.getIdCallback = idCallback;
	        this.emitterMap = new Map();
	        this.emitterMap.set("root", new emitter_1.default());
	        this.getterMap = new Map();
	        this.idToPathsMap = new Map();
	        this.worker = objectStoreWorker_1.ObjectStoreWorker.Create();
	        this.worker.onmessage = (event) => {
	            var data = event.data;
	            if (!data.wasNull) {
	                data.changedPaths.forEach(p => this.getterMap.delete(p));
	                data.changedPaths.forEach(p => this.EmitSet(p));
	            }
	            data.deletedPaths.forEach(p => {
	                this.getterMap.delete(p);
	                this.emitterMap.delete(p);
	            });
	            data.processedIds.forEach(idObj => {
	                var oldId = idObj.oldId;
	                var newId = idObj.newId;
	                var path = idObj.path;
	                if (oldId && oldId !== newId) {
	                    var oldIdPaths = this.idToPathsMap.get(oldId);
	                    oldIdPaths.delete(idObj.path);
	                    if (oldIdPaths.size === 0)
	                        this.idToPathsMap.delete(idObj.oldId);
	                }
	                if (!data.skipDependents && newId) {
	                    var value = this.ResolvePropertyPath(idObj.path);
	                    var dependentPaths = this.idToPathsMap.get(newId);
	                    if (!dependentPaths) {
	                        dependentPaths = new Set([path]);
	                        this.idToPathsMap.set(newId, dependentPaths);
	                    }
	                    else if (!dependentPaths.has(path))
	                        dependentPaths.add(path);
	                    dependentPaths.forEach(p => {
	                        if (p === path || p.indexOf(data.rootPath) === 0)
	                            return;
	                        this.WriteTo(p, value, true);
	                    });
	                }
	            });
	        };
	    }
	    get Root() {
	        this.EmitGet("root");
	        var ret = this.getterMap.get("root");
	        return ret || this.CreateGetterObject(this.root, "root");
	    }
	    set Root(val) {
	        this.Write(null, () => val);
	    }
	    Scope(valueFunction, setFunction) {
	        return new objectStoreScope_1.Scope(() => valueFunction(this.Root), (next) => setFunction(this.Root, next));
	    }
	    Get(id) {
	        var paths = this.idToPathsMap.get(id);
	        if (!paths)
	            return null;
	        var path = paths.values().next().value;
	        this.EmitGet(path);
	        var ret = this.getterMap.get(path);
	        return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
	    }
	    Write(readOnly, updateCallback) {
	        if (typeof readOnly === 'string') {
	            readOnly = this.Get(readOnly);
	            if (!readOnly)
	                return;
	        }
	        var path = readOnly ? readOnly.___path : "root";
	        var localValue = this.ResolvePropertyPath(path);
	        var newValue = null;
	        var mutableCopy = null;
	        if (typeof updateCallback === 'function') {
	            mutableCopy = this.CreateCopy(localValue);
	            newValue = updateCallback(mutableCopy);
	        }
	        else
	            newValue = updateCallback;
	        this.WriteTo(path, typeof newValue !== "undefined" ? newValue : mutableCopy);
	    }
	    Push(readOnly, newValue) {
	        var path = readOnly.___path;
	        var localValue = this.ResolvePropertyPath(path);
	        var oldLength = localValue.length;
	        var childPath = [path, oldLength].join(".");
	        localValue.push(null);
	        this.AssignPropertyPath(newValue, childPath);
	        var getterValue = this.getterMap.get(path);
	        getterValue.push(this.CreateGetterObject(newValue, childPath));
	        this.EmitSet(path);
	    }
	    WriteTo(path, value, skipDependents) {
	        var localValue = this.ResolvePropertyPath(path);
	        if (localValue === value)
	            return;
	        this.AssignPropertyPath(value, path);
	        this.worker.postMessage({
	            newValue: value,
	            oldValue: localValue,
	            path: path,
	            idFunction: this.getIdCallback && this.getIdCallback.toString(),
	            skipDependents: !!skipDependents
	        });
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
	            ret = Object.create(null);
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
	                this.EmitGet(path);
	                var ret = this.getterMap.get(path);
	                return ret || this.CreateGetterObject(this.ResolvePropertyPath(path), path);
	            },
	            set: (val) => {
	                this.WriteTo(path, val);
	            }
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
	            emitter = new emitter_1.default();
	            this.emitterMap.set(path, emitter);
	        }
	        emitter.emit("set");
	    }
	    EmitGet(path) {
	        var emitter = this.emitterMap.get(path);
	        if (!emitter) {
	            emitter = new emitter_1.default();
	            this.emitterMap.set(path, emitter);
	        }
	        globalEmitter_1.globalEmitter.Register(emitter);
	    }
	}
	exports.StoreAsync = StoreAsync;
	(function (StoreAsync) {
	    function Create(value, idCallback) {
	        if (IsValue(value))
	            throw "Only arrays and JSON types are supported";
	        var store = new StoreAsync(idCallback);
	        store.Root = value;
	        return store;
	    }
	    StoreAsync.Create = Create;
	})(StoreAsync = exports.StoreAsync || (exports.StoreAsync = {}));


/***/ }),
/* 16 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	function WorkerScope() {
	    const ctx = self;
	    ctx.addEventListener("message", (event) => {
	        var data = event.data;
	        var resp = {
	            wasNull: !data.oldValue && data.oldValue !== 0,
	            changedPaths: [],
	            deletedPaths: [],
	            processedIds: [],
	            skipDependents: data.skipDependents,
	            rootPath: data.path
	        };
	        ProcessChanges(data.path, data.newValue, data.oldValue, data.idFunction, resp);
	        ctx.postMessage(resp);
	    });
	    function IsValue(value) {
	        if (!value)
	            return true;
	        return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
	    }
	    function ProcessChanges(path, value, oldValue, idFunction, response) {
	        var localIdFunction = null;
	        if (typeof idFunction === 'string')
	            localIdFunction = eval(idFunction);
	        else if (idFunction)
	            localIdFunction = idFunction;
	        response.changedPaths.push(path);
	        var newId = value && localIdFunction && localIdFunction(value);
	        var oldId = oldValue && localIdFunction && localIdFunction(oldValue);
	        if (oldId && oldId !== newId) {
	            response.processedIds.push({
	                newId: newId,
	                oldId: oldId,
	                path: path
	            });
	        }
	        var skipProperties = new Set();
	        if (!IsValue(value)) {
	            for (var key in value) {
	                var childPath = [path, key].join(".");
	                ProcessChanges(childPath, value[key], oldValue && oldValue[key], localIdFunction, response);
	                skipProperties.add(key);
	            }
	        }
	        CleanUp(oldValue, skipProperties, path, response);
	    }
	    function CleanUp(value, skipProperties, path, response) {
	        if (!IsValue(value)) {
	            for (var key in value) {
	                if (!(skipProperties && skipProperties.has(key))) {
	                    var childPath = [path, key].join(".");
	                    response.deletedPaths.push(childPath);
	                    this.CleanUp(value[key], null, childPath);
	                }
	            }
	            if (!skipProperties || skipProperties.size === 0) {
	                var id = this.getIdCallback && this.getIdCallback(value);
	                if (id) {
	                    response.processedIds.push({
	                        newId: null,
	                        oldId: id,
	                        path: path
	                    });
	                }
	            }
	        }
	    }
	}
	var workerString = URL.createObjectURL(new Blob([`(${WorkerScope})()`]));
	var ObjectStoreWorker;
	(function (ObjectStoreWorker) {
	    function Create() {
	        return new Worker(workerString);
	    }
	    ObjectStoreWorker.Create = Create;
	})(ObjectStoreWorker = exports.ObjectStoreWorker || (exports.ObjectStoreWorker = {}));


/***/ })
/******/ ]);