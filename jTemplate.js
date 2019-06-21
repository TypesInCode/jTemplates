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
	var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const template_1 = __webpack_require__(1);
	exports.Template = template_1.Template;
	exports.Component = template_1.Component;
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
	const scope_1 = __webpack_require__(7);
	exports.Scope = scope_1.Scope;
	const storeAsync_1 = __webpack_require__(15);
	exports.StoreAsync = storeAsync_1.StoreAsync;
	const storeSync_1 = __webpack_require__(31);
	exports.StoreSync = storeSync_1.StoreSync;
	const store_1 = __webpack_require__(16);
	exports.Store = store_1.Store;
	class TodoStore extends storeAsync_1.StoreAsync {
	    constructor() {
	        super((val) => val.id, { loading: false, todos: [], assignees: [] });
	        this.nextId = 100;
	        this.todoQuery = this.Query("todos", [], (reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            return reader.Root.todos;
	        }));
	        this.assigneeQuery = this.Query("assignees", [], (reader) => __awaiter(this, void 0, void 0, function* () {
	            return reader.Root.assignees;
	        }));
	        this.loadingQuery = this.Query("loading", false, (reader) => __awaiter(this, void 0, void 0, function* () {
	            return reader.Root.loading;
	        }));
	        this.completedScope = this.todoQuery.Scope(root => {
	            return root.filter(t => t.completed).length;
	        });
	        this.reportScope = this.todoQuery.Scope(root => {
	            if (!root || root.length === 0)
	                return "<none>";
	            var nextTask = root.find((val) => !val.completed);
	            return `Next todo: ${nextTask ? nextTask.task : 'none'}. Progress: ${this.CompletedCount}/${root.length}`;
	        });
	        this.smallReportScope = this.reportScope.Scope(report => {
	            return report.replace(/[a-z]{3}[\s:]/gi, " ");
	        });
	    }
	    get Assignees() {
	        return this.assigneeQuery.Value;
	    }
	    get ToDos() {
	        return this.todoQuery.Value;
	    }
	    get Report() {
	        return this.reportScope.Value;
	    }
	    get SmallReport() {
	        return this.smallReportScope.Value;
	    }
	    get CompletedCount() {
	        return this.completedScope.Value;
	    }
	    get Loading() {
	        return this.loadingQuery.Value;
	    }
	    addTodo(val) {
	        var nextTodo = {
	            id: this.nextId++,
	            task: val,
	            completed: false,
	            deleted: false,
	            assignee: null
	        };
	        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            yield writer.Push(reader.Root.todos, nextTodo);
	        }));
	    }
	    removeTodo(todo) {
	        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            var index = reader.Root.todos.findIndex(t => t.id === todo.id);
	            writer.Splice(reader.Root.todos, index, 1);
	        }));
	    }
	    replaceTodos() {
	        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            var newTodos = [];
	            for (var x = 0; x < 10000; x++) {
	                newTodos.push({
	                    id: this.nextId++,
	                    task: `New todo ${this.nextId}`,
	                    completed: (Math.random() >= .5),
	                    deleted: false,
	                    assignee: null
	                });
	            }
	            yield writer.Write(reader.Root.todos, newTodos);
	        }));
	    }
	    addAssignee(name) {
	        var nextAssignee = {
	            id: 100000 + this.nextId++,
	            name: name
	        };
	        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            yield writer.Push(reader.Root.assignees, nextAssignee);
	        }));
	    }
	    setAssignee(todoId, assigneeId) {
	        this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            var todo = reader.Get(todoId.toString());
	            var assignee = reader.Get(assigneeId.toString());
	            yield writer.Write(todo, (todo) => { todo.assignee = assignee; });
	        }));
	    }
	    resetIds() {
	        this.nextId = 100;
	    }
	}
	var t = new TodoStore();
	t.addTodo("val 1");
	t.addTodo("val 2");
	t.addAssignee("Bart Simpson");
	t.addAssignee("Homer Simpson");
	class TodoView extends template_1.Template {
	    get DefaultTemplates() {
	        return {
	            remove: (data, index) => elements_1.span({ text: "" })
	        };
	    }
	    Template(todo, index) {
	        return elements_1.li({ on: () => ({ dblclick: this.onRename.bind(this, todo) }) }, () => [
	            elements_1.input({
	                props: () => ({ type: 'checkbox', checked: todo.completed }),
	                on: { change: this.onToggleCompleted.bind(this, todo) }
	            }),
	            elements_1.span({
	                text: () => `${todo.task} ${(todo.assignee && todo.assignee.name) || ''}`,
	                props: {
	                    style: { color: "red" }
	                }
	            }),
	            elements_1.span({}, () => this.Templates.remove(todo, index)),
	            elements_1.input({
	                props: () => ({ type: "input", value: todo.assignee && todo.assignee.id || '' }),
	                on: { keyup: this.onAssigneeIdChange.bind(this, todo) }
	            })
	        ]);
	    }
	    onToggleCompleted(todo) {
	        t.Write(todo, (todo) => { todo.completed = !todo.completed; });
	    }
	    onRename(todo) {
	        todo.task = prompt('Task name', todo.task) || todo.task;
	    }
	    onAssigneeIdChange(todo, event) {
	        var value = event.target.value;
	        var id = parseInt(value);
	        if (!isNaN(id))
	            t.setAssignee(todo.id, id);
	    }
	}
	var todoView = template_1.Template.ToFunction("ul", TodoView);
	class TodoList extends template_1.Template {
	    constructor() {
	        super("todo-list");
	    }
	    Template() {
	        return elements_1.div({ props: { style: { color: "red" } } }, () => [
	            elements_1.div({ text: () => t.Report }),
	            elements_1.div({ text: () => t.SmallReport }),
	            todoView({ key: val => val.id, data: () => t.ToDos }, {
	                remove: (data) => elements_1.input({
	                    props: { type: "button", value: "delete" },
	                    on: { click: this.onRemoveTodo.bind(this, data) }
	                })
	            }),
	            elements_1.div({ text: () => t.Loading ? 'Loading...' : '' }),
	            elements_1.input({
	                props: { type: "button", value: "New Todo" },
	                on: { click: this.onNewTodo.bind(this) }
	            }),
	            elements_1.input({
	                props: { type: "button", value: "Replace Todos" },
	                on: { click: this.onReplaceTodos.bind(this) }
	            }),
	            elements_1.input({
	                props: { type: "button", value: "Reset IDs" },
	                on: { click: this.onResetIds.bind(this) }
	            }),
	            elements_1.div({ key: (val) => val.id, data: () => t.Assignees }, (assignee) => elements_1.div({
	                text: () => `${assignee.id} - ${assignee.name}`,
	                on: { dblclick: this.onAssigneeDblClick.bind(this, assignee) }
	            }))
	        ]);
	    }
	    onNewTodo() {
	        t.addTodo(prompt("Enter a new todo:"));
	    }
	    onRemoveTodo(data) {
	        t.removeTodo(data);
	    }
	    onReplaceTodos() {
	        t.replaceTodos();
	    }
	    onResetIds() {
	        t.resetIds();
	    }
	    onAssigneeDblClick(assignee) {
	        t.Write(assignee, (ass) => { ass.name = prompt("New Name", assignee.name) || assignee.name; });
	    }
	}
	var list = new TodoList();
	list.AttachTo(document.getElementById("container"));


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
	        def1.data = def1.data || true;
	        ret.push(new dataBinding_1.default(bindingTarget, def1.data, def1.children, def1.key));
	    }
	    return ret;
	}
	class Template {
	    constructor(definition, deferBinding = false) {
	        this.deferBinding = deferBinding;
	        if (typeof definition === 'string')
	            definition = ComponentFunction(definition, this.constructor);
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
	            if (!this.deferBinding)
	                this.bindings = BindTarget(this.bindingRoot, this.definition);
	            else
	                bindingConfig_1.BindingConfig.scheduleUpdate(() => {
	                    if (!this.destroyed)
	                        this.bindings = BindTarget(this.bindingRoot, this.definition);
	                });
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
	    Destroy(parentDestroyed = false) {
	        if (!parentDestroyed)
	            this.Detach();
	        this.bindingRoot = null;
	        this.bindings.forEach(b => b.Destroy(true));
	        this.bindings = [];
	        this.destroyed = true;
	    }
	    Template(c, i) {
	        return [];
	    }
	}
	exports.Template = Template;
	class Component extends Template {
	    constructor(definition, deferBinding = false) {
	        if (typeof definition === 'string')
	            super(definition, deferBinding);
	        else {
	            if (typeof definition.data === 'function') {
	                definition.data = new scope_1.Scope(definition.data);
	                super(definition, deferBinding);
	            }
	            else {
	                var data = definition.data;
	                definition.data = new scope_1.Scope(() => data);
	                super(definition, deferBinding);
	            }
	        }
	    }
	}
	exports.Component = Component;
	(function (Template) {
	    function ToFunction(type, classType) {
	        return CreateComponentFunction(type, classType);
	    }
	    Template.ToFunction = ToFunction;
	    function Create(bindingDef, deferBinding) {
	        var constructor = (bindingDef.class || Template);
	        var template = new constructor(bindingDef, deferBinding);
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
	var batchSize = 1000;
	function processUpdates() {
	    var start = new Date();
	    while (updateIndex < pendingUpdates.length && ((new Date()).getTime() - start.getTime()) < 66) {
	        pendingUpdates[updateIndex]();
	        updateIndex++;
	    }
	    if (updateIndex === pendingUpdates.length) {
	        updateIndex = 0;
	        pendingUpdates = [];
	        updateScheduled = false;
	    }
	    else
	        window_1.wndw.requestAnimationFrame(processUpdates);
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
	        if (child !== sibling)
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
	        super(boundTo, bindingFunction, {});
	    }
	    Apply() {
	        this.ApplyRecursive(this.BoundTo, this.lastValue, this.Value);
	        this.lastValue = this.Value;
	    }
	    ApplyRecursive(target, lastValue, source) {
	        if (typeof source !== "object")
	            throw "Property binding must resolve to an object";
	        for (var key in source) {
	            var val = source[key];
	            if (typeof val === 'object') {
	                this.ApplyRecursive(target[key] || {}, lastValue && lastValue[key], val);
	            }
	            else if (!lastValue || lastValue[key] !== val)
	                target[key] = val;
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
	    constructor(boundTo, binding, config) {
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
	    get IsStatic() {
	        return this.isStatic;
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
	    Destroy(parentDestroyed = false) {
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
	        super(boundTo, bindingFunction, { children: childrenFunction, key: keyFunction });
	    }
	    Destroy(parentDestroyed = false) {
	        super.Destroy(parentDestroyed);
	        this.DestroyTemplates(this.activeTemplateMap, parentDestroyed);
	        this.activeTemplateMap = null;
	    }
	    OverrideBinding(bindingFunction, config) {
	        var localBinding = null;
	        if (typeof bindingFunction === 'function') {
	            localBinding = () => {
	                var value = bindingFunction();
	                var array = ConvertToArray(value);
	                var ret = new Array(array.length);
	                for (var x = 0; x < ret.length; x++)
	                    ret[x] = { value: array[x], key: config.key && config.key(array[x]) };
	                return ret;
	            };
	        }
	        else {
	            localBinding = ConvertToArray(bindingFunction).map((curr, index) => {
	                return {
	                    value: curr,
	                    key: config.key && config.key(curr)
	                };
	            });
	        }
	        return localBinding;
	    }
	    Init(config) {
	        this.activeTemplateMap = new Map();
	        this.keyFunction = config.key;
	        this.childrenFunction = config.children;
	    }
	    Apply() {
	        var value = this.Value;
	        var newTemplateMap = new Map();
	        var currentRowCount = this.activeTemplateMap.size;
	        var container = bindingConfig_1.BindingConfig.createContainer();
	        for (var x = 0; x < value.length; x++) {
	            var newKey = value[x].key || x;
	            newTemplateMap.set(newKey, this.activeTemplateMap.get(newKey));
	            this.activeTemplateMap.delete(newKey);
	        }
	        this.DestroyTemplates(this.activeTemplateMap);
	        var previousTemplate = null;
	        var index = 0;
	        newTemplateMap.forEach((templates, key) => {
	            if (!templates) {
	                var newDefs = this.childrenFunction(value[index].value, index);
	                if (!Array.isArray(newDefs))
	                    newDefs = [newDefs];
	                templates = newDefs.map(d => template_1.Template.Create(d, !this.IsStatic));
	                newTemplateMap.set(key, templates);
	            }
	            if (index >= currentRowCount) {
	                templates.forEach(t => {
	                    t.AttachToContainer(container);
	                    previousTemplate = t;
	                });
	            }
	            else {
	                templates.forEach(t => {
	                    t.AttachAfter(this.BoundTo, previousTemplate);
	                    previousTemplate = t;
	                });
	            }
	            index++;
	        });
	        this.activeTemplateMap = newTemplateMap;
	        bindingConfig_1.BindingConfig.addChildContainer(this.BoundTo, container);
	    }
	    DestroyTemplates(templateMap, parentDestroyed = false) {
	        templateMap.forEach(templates => templates.forEach(t => t.Destroy(parentDestroyed)));
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
	        super(boundTo, bindingFunction, "");
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
	        super(boundTo, bindingFunction, {});
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
	Object.defineProperty(exports, "__esModule", { value: true });
	const store_1 = __webpack_require__(16);
	const diffAsync_1 = __webpack_require__(27);
	class StoreAsync extends store_1.Store {
	    constructor(idFunction, init) {
	        super(idFunction, init, new diffAsync_1.DiffAsync());
	    }
	}
	exports.StoreAsync = StoreAsync;


/***/ }),
/* 16 */
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
	const storeManager_1 = __webpack_require__(17);
	const storeReader_1 = __webpack_require__(22);
	const storeWriter_1 = __webpack_require__(23);
	const promiseQueue_1 = __webpack_require__(24);
	const storeQuery_1 = __webpack_require__(26);
	class Store {
	    constructor(idFunction, init, diff) {
	        this.manager = new storeManager_1.StoreManager(idFunction, diff);
	        this.reader = new storeReader_1.StoreReader(this.manager);
	        this.writer = new storeWriter_1.StoreWriter(this.manager);
	        this.promiseQueue = new promiseQueue_1.PromiseQueue();
	        this.queryCache = new Map();
	        this.init = init;
	        this.Action(() => __awaiter(this, void 0, void 0, function* () {
	            yield this.manager.WritePath("root", init);
	        }));
	    }
	    get Root() {
	        return this.Query("root", this.init, (reader) => Promise.resolve(reader.Root));
	    }
	    Action(action) {
	        return this.promiseQueue.Push((resolve) => {
	            resolve(action(this.reader, this.writer));
	        });
	    }
	    Write(readOnly, updateCallback) {
	        return this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            yield writer.Write(readOnly, updateCallback);
	        }));
	    }
	    Query(id, defaultValue, queryFunc) {
	        if (this.queryCache.has(id))
	            return this.queryCache.get(id);
	        var query = new storeQuery_1.StoreQuery(this.manager, defaultValue, (reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            return yield this.promiseQueue.Push(resolve => {
	                resolve(queryFunc(reader, writer));
	            });
	        }));
	        var destroy = () => {
	            this.queryCache.delete(id);
	            query.removeListener("destroy", destroy);
	        };
	        query.addListener("destroy", destroy);
	        this.queryCache.set(id, query);
	        return query;
	    }
	    Destroy() {
	        this.queryCache.forEach(q => q.Destroy());
	        this.queryCache.clear();
	        this.manager.Destroy();
	    }
	}
	exports.Store = Store;


/***/ }),
/* 17 */
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
	const tree_1 = __webpack_require__(18);
	const treeNode_1 = __webpack_require__(19);
	const utils_1 = __webpack_require__(21);
	const treeNodeRefId_1 = __webpack_require__(20);
	class StoreManager {
	    constructor(idFunction, diff) {
	        this.idFunction = idFunction;
	        this.data = { root: null, id: {} };
	        this.tree = new tree_1.Tree((path) => this.ResolvePropertyPath(path));
	        this.diff = diff;
	    }
	    Diff(path, newValue) {
	        return this.diff.Diff(path, newValue, () => this.ResolvePropertyPathInternal(path, true));
	    }
	    GetNode(path) {
	        return this.tree.GetNode(path);
	    }
	    GetIdNode(id) {
	        return this.tree.GetIdNode(id);
	    }
	    ResolvePropertyPath(path) {
	        return this.ResolvePropertyPathInternal(path, false);
	    }
	    WritePath(path, updateCallback) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var value = this.ResolveUpdateCallback(path, updateCallback);
	            var breakUpMap = new Map();
	            var brokenValue = this.BreakUpValue(path, value, breakUpMap);
	            var diff = yield this.Diff(path, brokenValue);
	            this.AssignPropertyPath(brokenValue, path);
	            var promises = [];
	            breakUpMap.forEach((breakValue, breakPath) => {
	                promises.push(new Promise((resolve, reject) => {
	                    this.Diff(breakPath, breakValue).then((val) => {
	                        this.AssignPropertyPath(breakValue, breakPath);
	                        diff.changedPaths.push(...val.changedPaths);
	                        diff.deletedPaths.push(...val.deletedPaths);
	                        resolve();
	                    });
	                }));
	            });
	            yield Promise.all(promises);
	            this.ProcessDiff(diff);
	        });
	    }
	    EmitSet(pathNode) {
	        var node = null;
	        if (pathNode instanceof treeNode_1.TreeNode)
	            node = pathNode;
	        else
	            node = this.GetNode(pathNode);
	        node && node.Emitter.emit("set");
	    }
	    Destroy() {
	        this.data.root = null;
	        this.tree.Destroy();
	    }
	    BreakUpValue(path, value, map) {
	        if (value && value.toJSON && typeof value.toJSON === 'function')
	            value = value.toJSON();
	        if (utils_1.IsValue(value)) {
	            return value;
	        }
	        var id = this.idFunction && this.idFunction(value);
	        var idPath = ["id", id].join(".");
	        if ((id || id === 0) && path !== idPath && !map.has(idPath)) {
	            map.set(idPath, value);
	            this.BreakUpValue(idPath, value, map);
	            return treeNodeRefId_1.TreeNodeRefId.GetString(id);
	        }
	        for (var key in value) {
	            var childPath = [path, key].join(".");
	            value[key] = this.BreakUpValue(childPath, value[key], map);
	        }
	        return value;
	    }
	    AssignPropertyPath(value, path) {
	        var parts = path.split(".");
	        var prop = parts[parts.length - 1];
	        var parentParts = parts.slice(0, parts.length - 1);
	        var parentObj = this.ResolvePropertyPathInternal(parentParts.join("."), true);
	        parentObj[prop] = value;
	    }
	    ResolvePropertyPathInternal(path, skipCopy) {
	        if (!path)
	            return this.data;
	        var value = path.split(".").reduce((pre, curr) => {
	            return pre && pre[curr];
	        }, this.data);
	        return skipCopy ? value : utils_1.CreateCopy(value);
	    }
	    ResolveUpdateCallback(path, updateCallback) {
	        if (updateCallback && updateCallback.___storeProxy)
	            return updateCallback.toJSON();
	        if (typeof updateCallback === 'function') {
	            var node = this.tree.GetNode(path);
	            var localValue = node.Value;
	            var ret = updateCallback(localValue);
	            return typeof ret === 'undefined' ? localValue : ret;
	        }
	        return updateCallback;
	    }
	    ProcessDiff(data) {
	        data.changedPaths.forEach(p => {
	            this.EmitSet(p);
	        });
	        data.deletedPaths.forEach(p => {
	            var node = this.GetNode(p);
	            node && node.Destroy();
	        });
	        data.pathDependencies.forEach(dep => {
	            var value = this.ResolvePropertyPathInternal(dep.path, false);
	            dep.targets.forEach(target => {
	                this.WritePath(target, value);
	            });
	        });
	    }
	}
	exports.StoreManager = StoreManager;


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const treeNode_1 = __webpack_require__(19);
	class Tree {
	    constructor(resolvePath) {
	        this.root = new treeNode_1.TreeNode(this, null, "root", resolvePath);
	        this.id = new treeNode_1.TreeNode(this, null, "id", resolvePath);
	    }
	    GetNode(path, ensure) {
	        if (!path)
	            return null;
	        return path.split(".").reduce((pre, curr, index) => {
	            if (index === 0)
	                return curr === "id" ? this.id : this.root;
	            return pre && (ensure ? pre.EnsureChild(curr) : pre.Children.get(curr));
	        }, null);
	    }
	    GetIdNode(id) {
	        return this.GetNode(`id.${id}`, true);
	    }
	    Destroy() {
	        this.root.Destroy();
	        this.id.Destroy();
	    }
	}
	exports.Tree = Tree;


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(9);
	const treeNodeRefId_1 = __webpack_require__(20);
	class TreeNode {
	    get NodeCache() {
	        return this.nodeCache;
	    }
	    set NodeCache(val) {
	        this.nodeCache = val;
	    }
	    get Destroyed() {
	        return this.destroyed;
	    }
	    get Parent() {
	        return this.parentNode;
	    }
	    get Children() {
	        return this.children;
	    }
	    get Path() {
	        return (this.parentNode ? this.parentNode.Path + "." : "") + this.property;
	    }
	    get Value() {
	        if (this.destroyed)
	            return undefined;
	        var value = this.resolvePath(this.Path);
	        var refNode = null;
	        var id = treeNodeRefId_1.TreeNodeRefId.GetIdFrom(value);
	        if (id !== undefined)
	            refNode = this.tree.GetIdNode(id);
	        return refNode ? refNode.Value : value;
	    }
	    get Self() {
	        if (this.destroyed)
	            return this;
	        if (this.self)
	            return this.self;
	        var value = this.resolvePath(this.Path);
	        var id = treeNodeRefId_1.TreeNodeRefId.GetIdFrom(value);
	        if (id !== undefined) {
	            this.self = this.tree.GetIdNode(id);
	            return this.self;
	        }
	        return this;
	    }
	    get Emitter() {
	        return this.emitter;
	    }
	    get Property() {
	        return this.property;
	    }
	    set Property(val) {
	        this.property = val;
	    }
	    get ParentKey() {
	        return this.parentKey;
	    }
	    set ParentKey(val) {
	        this.parentKey = val;
	    }
	    constructor(tree, parentNode, property, resolvePath) {
	        this.tree = tree;
	        this.parentNode = parentNode;
	        this.property = property;
	        this.resolvePath = resolvePath;
	        this.destroyed = false;
	        this.children = new Map();
	        this.emitter = new emitter_1.default();
	        this.emitter.addListener("set", () => {
	            this.nodeCache = null;
	            this.self = null;
	        });
	        this.UpdateParentKey();
	    }
	    OverwriteChildren(children) {
	        this.children = new Map(children);
	    }
	    UpdateParentKey() {
	        if (this.parentKey === this.property || !this.parentNode)
	            return;
	        this.parentKey && this.parentNode.Children.delete(this.parentKey);
	        this.parentNode.Children.set(this.property, this);
	        ;
	        this.parentKey = this.property;
	    }
	    EnsureChild(prop) {
	        if (this.destroyed)
	            return null;
	        var child = this.Children.get(prop);
	        if (!child) {
	            child = new TreeNode(this.tree, this, prop, this.resolvePath);
	            this.Children.set(prop, child);
	        }
	        return child;
	    }
	    Destroy() {
	        if (this.destroyed)
	            return;
	        this.parentNode && this.parentNode.Children.delete(this.property);
	        this.parentNode = null;
	        this.children.forEach(val => val.Destroy());
	        this.destroyed = true;
	        this.emitter.emit("destroy", this.emitter);
	        this.emitter.removeAllListeners();
	    }
	}
	exports.TreeNode = TreeNode;


/***/ }),
/* 20 */
/***/ (function(module, exports) {

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


/***/ }),
/* 21 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	function IsValue(value) {
	    if (!value)
	        return true;
	    return !(Array.isArray(value) || (typeof value === 'object' && {}.constructor === value.constructor));
	}
	exports.IsValue = IsValue;
	function CreateProxy(node, reader) {
	    var value = node && node.Value;
	    reader && reader.Register(node.Emitter);
	    if (node !== node.Self)
	        reader && reader.Register(node.Self.Emitter);
	    if (IsValue(value))
	        return value;
	    return CreateProxyObject(node, reader, value);
	}
	exports.CreateProxy = CreateProxy;
	function CreateProxyObject(node, reader, value) {
	    var ret = null;
	    if (Array.isArray(value)) {
	        ret = new Proxy([], {
	            get: (obj, prop) => {
	                if (node.Destroyed)
	                    return undefined;
	                if (prop === '___storeProxy')
	                    return true;
	                if (prop === "___node")
	                    return node;
	                if (prop === 'toJSON')
	                    return () => {
	                        return node.Self.Value;
	                    };
	                var isInt = typeof (prop) !== 'symbol' && !isNaN(parseInt(prop));
	                if (isInt || prop === 'length') {
	                    var childNode = node.Self.EnsureChild(prop);
	                    if (!childNode)
	                        return null;
	                    if (isInt || prop === 'length')
	                        return CreateProxy(childNode, reader);
	                }
	                var ret = obj[prop];
	                if (typeof ret === 'function') {
	                    var cachedArray = CreateProxyArray(node.Self, reader);
	                    return ret.bind(cachedArray);
	                }
	                return ret;
	            }
	        });
	    }
	    else {
	        ret = new Proxy({}, {
	            get: (obj, prop) => {
	                if (node.Destroyed)
	                    return undefined;
	                if (prop === '___storeProxy')
	                    return true;
	                if (prop === '___node')
	                    return node;
	                if (prop === 'toJSON')
	                    return () => {
	                        return node.Self.Value;
	                    };
	                if (typeof prop !== 'symbol') {
	                    var childNode = node.Self.EnsureChild(prop);
	                    if (!childNode)
	                        return null;
	                    return CreateProxy(childNode, reader);
	                }
	                return obj[prop];
	            }
	        });
	    }
	    return ret;
	}
	function CreateProxyArray(node, reader) {
	    var localArray = node.Value;
	    if (node.NodeCache) {
	        var cache = node.NodeCache;
	        if (cache && Array.isArray(cache) && cache.length === localArray.length)
	            return cache;
	    }
	    var proxyArray = new Array(localArray.length);
	    for (var x = 0; x < proxyArray.length; x++) {
	        var childNode = node.EnsureChild(x.toString());
	        proxyArray[x] = CreateProxy(childNode, reader);
	    }
	    node.NodeCache = proxyArray;
	    return proxyArray;
	}
	exports.CreateProxyArray = CreateProxyArray;
	function CreateCopy(source) {
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
	exports.CreateCopy = CreateCopy;


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const utils_1 = __webpack_require__(21);
	const scopeCollector_1 = __webpack_require__(10);
	class StoreReader {
	    constructor(store) {
	        this.store = store;
	        this.watching = false;
	    }
	    get Root() {
	        var node = this.store.GetNode("root");
	        node && this.Register(node.Emitter);
	        return utils_1.CreateProxy(node, this);
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
	        var node = this.store.GetIdNode(id);
	        node && this.Register(node.Emitter);
	        return node && utils_1.CreateProxy(node, this);
	    }
	    Register(emitter) {
	        if (this.watching && !this.emitterSet.has(emitter))
	            this.emitterSet.add(emitter);
	        scopeCollector_1.scopeCollector.Register(emitter);
	    }
	    Destroy() {
	        this.watching = false;
	        this.emitterSet.clear();
	    }
	}
	exports.StoreReader = StoreReader;


/***/ }),
/* 23 */
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
	const utils_1 = __webpack_require__(21);
	class StoreWriter {
	    constructor(store) {
	        this.store = store;
	    }
	    Write(readOnly, updateCallback) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var path = null;
	            if (typeof readOnly === 'string') {
	                var node = this.store.GetIdNode(readOnly);
	                path = node && node.Path;
	            }
	            var path = path || readOnly && readOnly.___node.Path;
	            if (!path)
	                return;
	            yield this.store.WritePath(path, updateCallback);
	        });
	    }
	    Push(readOnly, newValue) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var node = readOnly.___node;
	            var lengthPath = [node.Path, 'length'].join(".");
	            var length = this.store.ResolvePropertyPath(lengthPath);
	            var childPath = [node.Path, length].join(".");
	            yield this.store.WritePath(childPath, newValue);
	            this.store.EmitSet(node.Path);
	        });
	    }
	    Unshift(readOnly, newValue) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var path = readOnly.___node.Path;
	            var localValue = this.store.ResolvePropertyPath(path);
	            var childPath = [path, 0].join(".");
	            localValue.unshift(null);
	            yield this.store.WritePath(childPath, newValue);
	            this.store.EmitSet(path);
	        });
	    }
	    Splice(readOnly, start, deleteCount, ...items) {
	        var args = Array.from(arguments).slice(1);
	        var node = readOnly.___node;
	        var localValue = node.Value;
	        var proxyArray = utils_1.CreateProxyArray(node, null);
	        var removedProxies = proxyArray.splice.apply(proxyArray, args);
	        for (var x = 0; x < removedProxies.length; x++)
	            removedProxies[x].___node.Destroy();
	        for (var x = start + items.length; x < proxyArray.length; x++) {
	            proxyArray[x].___node.Property = x.toString();
	            proxyArray[x].___node.UpdateParentKey();
	        }
	        var ret = localValue.splice.apply(localValue, args);
	        this.store.AssignPropertyPath(localValue, node.Path);
	        this.store.EmitSet(node);
	        return ret;
	    }
	}
	exports.StoreWriter = StoreWriter;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const deferredPromise_1 = __webpack_require__(25);
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
/* 25 */
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
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scopeBase_1 = __webpack_require__(8);
	const storeReader_1 = __webpack_require__(22);
	const storeWriter_1 = __webpack_require__(23);
	const scope_1 = __webpack_require__(7);
	class StoreQuery extends scopeBase_1.ScopeBase {
	    constructor(store, defaultValue, getFunction) {
	        super(getFunction, defaultValue);
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
	        this.GetFunction(this.reader, this.writer).then(value => {
	            this.reader.Watching = false;
	            callback(this.reader.Emitters, value);
	        });
	    }
	}
	exports.StoreQuery = StoreQuery;


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const workerQueue_1 = __webpack_require__(28);
	const storeWorker_1 = __webpack_require__(29);
	class DiffAsync {
	    constructor() {
	        this.workerQueue = new workerQueue_1.WorkerQueue(storeWorker_1.StoreWorker.Create());
	        this.workerQueue.Push(() => ({ method: "create", arguments: [] }));
	    }
	    Diff(path, newValue, resolveOldValue) {
	        return this.workerQueue.Push(() => ({
	            method: "diff",
	            arguments: [path, newValue, resolveOldValue()]
	        }));
	    }
	}
	exports.DiffAsync = DiffAsync;


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const promiseQueue_1 = __webpack_require__(24);
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
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(30);
	var StoreWorker;
	(function (StoreWorker) {
	    var workerConstructor = null;
	    var workerParameter = null;
	    if (typeof Worker !== 'undefined') {
	        workerConstructor = Worker;
	        workerParameter = URL.createObjectURL(new Blob([`(${objectDiff_1.ObjectDiffScope})(false)`]));
	    }
	    else {
	        throw "Worker is not available";
	    }
	    function Create() {
	        return new workerConstructor(workerParameter);
	    }
	    StoreWorker.Create = Create;
	})(StoreWorker = exports.StoreWorker || (exports.StoreWorker = {}));


/***/ }),
/* 30 */
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
	                    tracker = Create();
	                    break;
	                case "diff":
	                    return tracker.Diff.apply(tracker, data.arguments);
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
	    function Create() {
	        return new ObjectDiffTracker();
	    }
	    class ObjectDiffTracker {
	        constructor() {
	            this.idToPathsMap = new Map();
	        }
	        GetPath(id) {
	            var paths = this.idToPathsMap.get(id);
	            if (paths)
	                return paths.values().next().value;
	            return null;
	        }
	        Diff(path, newValue, oldValue) {
	            var resp = {
	                changedPaths: [],
	                deletedPaths: [],
	                pathDependencies: []
	            };
	            this.DiffValues(path, path, newValue, oldValue, resp);
	            resp.changedPaths = resp.changedPaths.reverse();
	            return resp;
	        }
	        DiffValues(rootPath, path, newValue, oldValue, resp) {
	            var newIsObject = !IsValue(newValue);
	            var oldIsObject = !IsValue(oldValue);
	            if (!newIsObject && !oldIsObject) {
	                if (oldValue !== undefined && newValue !== oldValue)
	                    resp.changedPaths.push(path);
	                return;
	            }
	            var newKeys = new Set();
	            var oldKeys = oldIsObject ? Object.keys(oldValue) : [];
	            if (oldKeys.length > 0 && newIsObject)
	                newKeys = new Set(Object.keys(newValue));
	            var pathChanged = false;
	            for (var x = 0; x < oldKeys.length; x++) {
	                var key = oldKeys[x];
	                var childPath = [path, key].join(".");
	                var deletedKey = !newKeys.has(key);
	                if (!deletedKey)
	                    newKeys.delete(key);
	                pathChanged = pathChanged || deletedKey;
	                if (deletedKey)
	                    resp.deletedPaths.push(childPath);
	                else
	                    this.DiffValues(rootPath, childPath, newValue && newValue[key], oldValue[key], resp);
	            }
	            if (oldValue !== undefined && pathChanged || newKeys.size > 0)
	                resp.changedPaths.push(path);
	        }
	    }
	    return CreateScope;
	}
	exports.ObjectDiffScope = ObjectDiffScope;
	exports.ObjectDiff = ObjectDiffScope(true);


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const store_1 = __webpack_require__(16);
	const diffSync_1 = __webpack_require__(32);
	class StoreSync extends store_1.Store {
	    constructor(idFunction, init) {
	        super(idFunction, init, new diffSync_1.DiffSync());
	    }
	}
	exports.StoreSync = StoreSync;


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(30);
	class DiffSync {
	    constructor() {
	        this.diff = objectDiff_1.ObjectDiff();
	        this.diff({
	            method: "create",
	            arguments: []
	        });
	    }
	    Diff(path, newValue, resolveOldValue) {
	        return Promise.resolve(this.diff({
	            method: "diff",
	            arguments: [path, newValue, resolveOldValue()]
	        }));
	    }
	}
	exports.DiffSync = DiffSync;


/***/ })
/******/ ]);