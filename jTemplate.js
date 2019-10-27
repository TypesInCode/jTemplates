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
	const scope_1 = __webpack_require__(4);
	exports.Scope = scope_1.Scope;
	const storeAsync_1 = __webpack_require__(17);
	exports.StoreAsync = storeAsync_1.StoreAsync;
	const storeSync_1 = __webpack_require__(33);
	exports.StoreSync = storeSync_1.StoreSync;
	const store_1 = __webpack_require__(18);
	exports.Store = store_1.Store;
	exports.AbstractStore = store_1.AbstractStore;
	const storeReader_1 = __webpack_require__(24);
	exports.StoreReader = storeReader_1.StoreReader;
	const storeWriter_1 = __webpack_require__(25);
	exports.StoreWriter = storeWriter_1.StoreWriter;
	const elements_1 = __webpack_require__(35);
	class TodoStore extends storeAsync_1.StoreAsync {
	    constructor() {
	        super({ loading: false, todos: [], assignees: [] }, (val) => val.id);
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
	            for (var x = 0; x < 500; x++) {
	                newTodos.push({
	                    id: this.nextId++,
	                    task: `New todo ${this.nextId}`,
	                    completed: (Math.random() >= .5),
	                    deleted: false,
	                    assignee: null
	                });
	            }
	            yield writer.Update(reader.Root.todos, newTodos);
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
	            yield writer.Update(todo, (todo) => { todo.assignee = assignee; });
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
	            remove: (data, index) => elements_1.span({ text: "" }),
	            append: []
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
	            elements_1.span({}, this.Templates.remove(todo, index)),
	            elements_1.input({
	                props: () => ({ type: "input", value: todo.assignee && todo.assignee.id || '' }),
	                on: { keyup: this.onAssigneeIdChange.bind(this, todo) }
	            }),
	            elements_1.span({}, this.Templates.append)
	        ]);
	    }
	    onToggleCompleted(todo) {
	        var store = this.Injector.Get(store_1.AbstractStore);
	        store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            yield writer.Update(todo, (todo) => { todo.completed = !todo.completed; });
	        }));
	    }
	    onRename(todo) {
	        var store = this.Injector.Get(store_1.AbstractStore);
	        store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            writer.Update(todo, (todo) => todo.task = prompt('Task name', todo.task) || todo.task);
	        }));
	    }
	    onAssigneeIdChange(todo, event) {
	        var value = event.target.value;
	        var id = parseInt(value);
	        if (!isNaN(id)) {
	            var store = this.Injector.Get(TodoStore);
	            store.setAssignee(todo.id, id);
	        }
	    }
	}
	var todoView = template_1.Template.ToFunction("ul", TodoView);
	class TodoList extends template_1.Template {
	    constructor() {
	        super("todo-list");
	        this.Injector.Set(store_1.AbstractStore, t);
	    }
	    Template() {
	        return elements_1.div({ props: { style: { color: "red" } } }, [
	            elements_1.div({ text: () => t.Report }),
	            elements_1.div({ text: () => t.SmallReport }),
	            todoView({ key: (val) => val.id, data: () => t.ToDos }, {
	                remove: (data) => elements_1.input({
	                    props: { type: "button", value: "delete" },
	                    on: { click: this.onRemoveTodo.bind(this, data) }
	                }),
	                append: [
	                    elements_1.span({ text: "appended" }),
	                    elements_1.span({ text: "next" })
	                ]
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
	        var store = this.Injector.Get(store_1.AbstractStore);
	        store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            yield writer.Update(assignee, (ass) => { ass.name = prompt("New Name", assignee.name) || assignee.name; });
	        }));
	    }
	}
	var list = new TodoList();
	list.AttachTo(document.getElementById("container"));


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const propertyBinding_1 = __webpack_require__(2);
	const dataBinding_1 = __webpack_require__(12);
	const textBinding_1 = __webpack_require__(13);
	const eventBinding_1 = __webpack_require__(14);
	const scope_1 = __webpack_require__(4);
	const injector_1 = __webpack_require__(11);
	const attributeBinding_1 = __webpack_require__(15);
	const nodeRef_1 = __webpack_require__(16);
	function TemplateFunction(type, namespace, templateDefinition, children) {
	    return {
	        type: type,
	        namespace: namespace,
	        props: templateDefinition && templateDefinition.props,
	        attrs: templateDefinition && templateDefinition.attrs,
	        on: templateDefinition && templateDefinition.on,
	        static: templateDefinition && templateDefinition.static,
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
	        namespace: null,
	        class: classType,
	        props: componentDefinition && componentDefinition.props,
	        attrs: componentDefinition && componentDefinition.attrs,
	        on: componentDefinition && componentDefinition.on,
	        static: componentDefinition && componentDefinition.static,
	        data: componentDefinition && componentDefinition.data,
	        key: componentDefinition && componentDefinition.key,
	        templates: templates,
	    };
	}
	function CreateComponentFunction(type, classType) {
	    return ComponentFunction.bind(null, type, classType);
	}
	function BindTarget(bindingTarget, bindingDef) {
	    var ret = [];
	    var def1 = bindingDef;
	    if (def1.props)
	        ret.push(new propertyBinding_1.default(bindingTarget, def1.props));
	    if (def1.attrs)
	        ret.push(new attributeBinding_1.default(bindingTarget, def1.attrs));
	    if (def1.on)
	        ret.push(new eventBinding_1.default(bindingTarget, def1.on));
	    if (def1.text)
	        ret.push(new textBinding_1.default(bindingTarget, def1.text));
	    return ret;
	}
	function DataBindTarget(bindingTarget, bindingDef) {
	    if (bindingDef.children)
	        return new dataBinding_1.default(bindingTarget, bindingDef.data || bindingDef.static || true, bindingDef.children, bindingDef.key);
	    return null;
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
	        this.bindingRoot = new nodeRef_1.NodeRef(this.definition.type, this.definition.namespace);
	        this.dataBound = false;
	        this.injector = new injector_1.Injector();
	        this.Init();
	    }
	    get Root() {
	        if (!this.dataBound) {
	            injector_1.Injector.Scope(this.injector, () => this.dataBinding = DataBindTarget(this.bindingRoot, this.definition));
	            this.dataBound = true;
	        }
	        return this.bindingRoot;
	    }
	    get DefaultTemplates() {
	        return {};
	    }
	    get Templates() {
	        return this.templates;
	    }
	    get Injector() {
	        return this.injector;
	    }
	    SetTemplates(templates) {
	        if (!templates)
	            return;
	        for (var key in templates) {
	            this.templates[key] = templates[key];
	        }
	    }
	    BindTemplate() {
	        injector_1.Injector.Scope(this.injector, () => this.bindings = BindTarget(this.Root, this.definition));
	    }
	    AttachTo(parent) {
	        if (!(parent instanceof nodeRef_1.NodeRef))
	            parent = new nodeRef_1.NodeRef(parent);
	        parent.AddChild(this.Root);
	    }
	    AttachAfter(rootParent, template) {
	        rootParent.AddChildAfter(template && template.Root, this.Root);
	    }
	    Detach() {
	        this.Root.Detach();
	    }
	    Destroy() {
	        this.Detach();
	        this.bindingRoot = null;
	        this.dataBinding && this.dataBinding.Destroy();
	        this.dataBinding = null;
	        this.bindings && this.bindings.forEach(b => b.Destroy());
	        this.bindings = null;
	    }
	    Template(c, i) {
	        return [];
	    }
	    Init() {
	    }
	    Bound() {
	    }
	}
	exports.Template = Template;
	class Component extends Template {
	    constructor(definition, deferBinding = false) {
	        if (typeof definition === 'string')
	            super(definition, deferBinding);
	        else {
	            if (definition.data) {
	                definition.data = new scope_1.Scope(definition.data);
	                super(definition, deferBinding);
	            }
	            else {
	                var data = definition.static;
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
	    function Create(def, deferBinding) {
	        var localDef = {};
	        for (var key in def)
	            localDef[key] = def[key];
	        var constructor = (localDef.class || Template);
	        var template = new constructor(localDef, deferBinding);
	        return template;
	    }
	    Template.Create = Create;
	})(Template = exports.Template || (exports.Template = {}));


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(3);
	class PropertyBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, {});
	    }
	    Apply() {
	        this.BoundTo.SetProperties(this.Value);
	    }
	}
	exports.default = PropertyBinding;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scope_1 = __webpack_require__(4);
	const bindingConfig_1 = __webpack_require__(8);
	const injector_1 = __webpack_require__(11);
	var BindingStatus;
	(function (BindingStatus) {
	    BindingStatus[BindingStatus["Init"] = 0] = "Init";
	    BindingStatus[BindingStatus["Updating"] = 1] = "Updating";
	    BindingStatus[BindingStatus["Updated"] = 2] = "Updated";
	    BindingStatus[BindingStatus["Destroyed"] = 3] = "Destroyed";
	})(BindingStatus || (BindingStatus = {}));
	class Binding {
	    constructor(boundTo, binding, config) {
	        this.injector = injector_1.Injector.Current();
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
	    get Injector() {
	        return this.injector;
	    }
	    get BoundTo() {
	        return this.boundTo;
	    }
	    get IsStatic() {
	        return this.isStatic;
	    }
	    get SynchInit() {
	        return false;
	    }
	    Update() {
	        if (this.status === BindingStatus.Destroyed)
	            return;
	        if (this.SynchInit && this.status === BindingStatus.Init) {
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
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scopeBase_1 = __webpack_require__(5);
	const scopeCollector_1 = __webpack_require__(7);
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
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(6);
	const scopeCollector_1 = __webpack_require__(7);
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
	        return !this.HasValue ? this.defaultValue : this.value;
	    }
	    get HasValue() {
	        return typeof this.value !== 'undefined';
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
/* 6 */
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
/* 7 */
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
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const domBindingConfig_1 = __webpack_require__(9);
	exports.BindingConfig = domBindingConfig_1.DOMBindingConfig;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const window_1 = __webpack_require__(10);
	var pendingUpdates = [];
	var updateScheduled = false;
	var updateIndex = 0;
	var batchSize = 1000;
	function processUpdates() {
	    var start = Date.now();
	    while (updateIndex < pendingUpdates.length && (Date.now() - start) < 66) {
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
	    getNodeById: function (id) {
	        return window_1.wndw.document.getElementById(id);
	    },
	    addListener: function (target, type, callback) {
	        target.addEventListener(type, callback);
	    },
	    removeListener: function (target, type, callback) {
	        target.removeEventListener(type, callback);
	    },
	    createBindingTarget: function (type, namespace) {
	        if (namespace)
	            return window_1.wndw.document.createElementNS(namespace, type);
	        return window_1.wndw.document.createElement(type);
	    },
	    addChild: function (root, child) {
	        root.appendChild(child);
	    },
	    appendXml: function (root, xml) {
	        var template = window_1.wndw.document.createElement("template");
	        template.innerHTML = xml;
	        root.appendChild(template.content);
	    },
	    appendXmlAfter: function (root, sibling, xml) {
	        var template = window_1.wndw.document.createElement("template");
	        template.innerHTML = xml;
	        this.addChildAfter(root, sibling, template.content);
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
	    },
	    getAttribute(target, attribute) {
	        return target.getAttribute(attribute);
	    },
	    setAttribute(target, attribute, value) {
	        target.setAttribute(attribute, value);
	    },
	    setPropertyOverrides: {
	        value: (target, value) => {
	            if (target.type !== "input")
	                target.value = value;
	            else {
	                var start = target.selectionStart;
	                var end = target.selectionEnd;
	                target.value = value;
	                target.setSelectionRange(start, end);
	            }
	        }
	    }
	};


/***/ }),
/* 10 */
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
/* 11 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class Injector {
	    constructor() {
	        this.parent = Injector.Current();
	        this.typeMap = new Map();
	    }
	    Get(type) {
	        if (this.typeMap.size === 0)
	            return this.parent && this.parent.Get(type);
	        var ret = this.typeMap.get(type);
	        if (!ret) {
	            this.typeMap.forEach((value, key) => {
	                if (value instanceof type)
	                    ret = value;
	            });
	        }
	        if (!ret)
	            ret = this.parent && this.parent.Get(type);
	        return ret;
	    }
	    Set(type, instance) {
	        this.typeMap.set(type, instance);
	    }
	}
	exports.Injector = Injector;
	(function (Injector) {
	    var currentScopes = new Array();
	    function Current() {
	        return currentScopes[currentScopes.length - 1];
	    }
	    Injector.Current = Current;
	    function Scope(injector, action) {
	        currentScopes.push(injector);
	        action();
	        currentScopes.pop();
	    }
	    Injector.Scope = Scope;
	})(Injector = exports.Injector || (exports.Injector = {}));


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(3);
	const template_1 = __webpack_require__(1);
	const injector_1 = __webpack_require__(11);
	function ConvertToArray(val) {
	    if (!val)
	        return [];
	    if (!Array.isArray(val))
	        return [val];
	    return val;
	}
	class DataBinding extends binding_1.Binding {
	    get SynchInit() {
	        return true;
	    }
	    constructor(boundTo, bindingFunction, childrenFunction, keyFunction) {
	        super(boundTo, bindingFunction, { children: childrenFunction, key: keyFunction });
	    }
	    Destroy() {
	        super.Destroy();
	        this.DestroyTemplates(this.activeTemplateMap);
	        this.activeTemplateMap = null;
	    }
	    OverrideBinding(bindingFunction, config) {
	        var binding = null;
	        if (typeof bindingFunction === 'function') {
	            binding = () => {
	                var value = bindingFunction();
	                var array = ConvertToArray(value);
	                var ret = array.map((val, index) => ({
	                    value: val,
	                    key: config.key && config.key(val)
	                }));
	                return ret;
	            };
	        }
	        else if (config.key) {
	            binding = () => ConvertToArray(bindingFunction).map((curr, index) => {
	                return {
	                    value: curr,
	                    key: config.key && config.key(curr)
	                };
	            });
	        }
	        else {
	            binding = ConvertToArray(bindingFunction).map((curr, index) => {
	                return {
	                    value: curr,
	                    key: config.key && config.key(curr)
	                };
	            });
	        }
	        return binding;
	    }
	    Init(config) {
	        this.activeTemplateMap = new Map();
	        this.keyFunction = config.key;
	        var children = config.children;
	        if (typeof children !== 'function')
	            children = () => config.children;
	        this.childrenFunction = children;
	    }
	    Apply() {
	        var value = this.Value;
	        var newTemplateMap = new Map();
	        var currentRowCount = this.activeTemplateMap.size;
	        for (var x = 0; x < value.length; x++) {
	            var newKey = value[x].key || x;
	            newTemplateMap.set(newKey, this.activeTemplateMap.get(newKey));
	            this.activeTemplateMap.delete(newKey);
	        }
	        this.DestroyTemplates(this.activeTemplateMap);
	        var previousTemplate = null;
	        var index = 0;
	        var newNodeRefs = [];
	        var newTemplates = [];
	        newTemplateMap.forEach((templates, key) => {
	            if (!templates) {
	                var newDefs = this.childrenFunction(value[index].value, index);
	                if (!Array.isArray(newDefs))
	                    newDefs = [newDefs];
	                injector_1.Injector.Scope(this.Injector, () => {
	                    templates = newDefs.map(d => template_1.Template.Create(d, !this.IsStatic));
	                });
	                newTemplateMap.set(key, templates);
	            }
	            if (index < (currentRowCount - this.activeTemplateMap.size)) {
	                templates.forEach(t => {
	                    t.AttachAfter(this.BoundTo, previousTemplate);
	                    previousTemplate = t;
	                });
	            }
	            else
	                templates.forEach(t => {
	                    newTemplates.push(t);
	                    newNodeRefs.push(t.Root);
	                });
	            index++;
	        });
	        this.activeTemplateMap = newTemplateMap;
	        this.BoundTo.AddChildren(newNodeRefs);
	        for (var x = 0; x < newTemplates.length; x++)
	            newTemplates[x].BindTemplate();
	    }
	    DestroyTemplates(templateMap) {
	        templateMap.forEach(templates => templates.forEach(t => t.Destroy()));
	    }
	}
	exports.default = DataBinding;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(3);
	class TextBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, "");
	    }
	    Apply() {
	        this.BoundTo.SetText(this.Value);
	    }
	}
	exports.default = TextBinding;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(3);
	class EventBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, {});
	    }
	    Apply() {
	        this.BoundTo.SetEvents(this.Value);
	    }
	}
	exports.default = EventBinding;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const binding_1 = __webpack_require__(3);
	class AttributeBinding extends binding_1.Binding {
	    constructor(boundTo, bindingFunction) {
	        super(boundTo, bindingFunction, {});
	    }
	    Apply() {
	        this.BoundTo.SetAttributes(this.Value);
	    }
	}
	exports.default = AttributeBinding;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const bindingConfig_1 = __webpack_require__(8);
	var nodeRefId = 1;
	class NodeRef {
	    constructor(type, namespace) {
	        this.namespace = namespace;
	        this.childNodeRefs = new Map();
	        this.attached = false;
	        this.attachedCallbacks = [];
	        this.nodeRefId = `NodeRef.${nodeRefId++}`;
	        if (typeof type === 'string')
	            this.type = type;
	        else {
	            this.node = type;
	            this.attached = true;
	        }
	    }
	    get Node() {
	        if (!this.attached)
	            return null;
	        if (!this.node)
	            this.node = bindingConfig_1.BindingConfig.getNodeById(this.nodeRefId);
	        return this.node;
	    }
	    get Id() {
	        return this.nodeRefId;
	    }
	    set Parent(val) {
	        if (this.parent && this.parent !== val)
	            this.Detach();
	        this.parent = val;
	    }
	    AddChild(nodeRef) {
	        nodeRef.Parent = this;
	        this.childNodeRefs.set(nodeRef.Id, nodeRef);
	        if (this.Node) {
	            if (nodeRef.Node)
	                bindingConfig_1.BindingConfig.addChild(this.Node, nodeRef.Node);
	            else
	                bindingConfig_1.BindingConfig.appendXml(this.Node, nodeRef.ToXml());
	            nodeRef.Attached();
	        }
	    }
	    AddChildAfter(currentChild, newChild) {
	        if (currentChild && !this.childNodeRefs.has(currentChild.Id))
	            throw "currentChild is not valid";
	        newChild.Parent = this;
	        this.childNodeRefs.set(newChild.Id, newChild);
	        if (this.Node) {
	            if (newChild.Node)
	                bindingConfig_1.BindingConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
	            else
	                bindingConfig_1.BindingConfig.appendXmlAfter(this.Node, currentChild && currentChild.Node, newChild.ToXml());
	            newChild.Attached();
	        }
	    }
	    AddChildren(nodeRefs) {
	        if (nodeRefs.length === 0)
	            return;
	        var xml = "";
	        for (var x = 0; x < nodeRefs.length; x++) {
	            var ref = nodeRefs[x];
	            ref.Parent = this;
	            this.childNodeRefs.set(ref.Id, ref);
	            if (this.Node) {
	                if (ref.Node)
	                    bindingConfig_1.BindingConfig.addChild(this.Node, ref.Node);
	                else
	                    xml += ref.ToXml();
	            }
	        }
	        if (this.Node) {
	            bindingConfig_1.BindingConfig.appendXml(this.Node, xml);
	            for (var x = 0; x < nodeRefs.length; x++)
	                nodeRefs[x].Attached();
	        }
	    }
	    SetText(text) {
	        this.OnAttached(() => bindingConfig_1.BindingConfig.setText(this.Node, text));
	    }
	    SetProperties(properties) {
	        this.OnAttached(() => {
	            this.SetPropertiesRecursive(this.Node, this.lastProperties, properties);
	            this.lastProperties = properties;
	        });
	    }
	    SetAttributes(attributes) {
	        this.OnAttached(() => {
	            for (var key in attributes) {
	                var val = bindingConfig_1.BindingConfig.getAttribute(this.Node, key);
	                if (val !== attributes[key])
	                    bindingConfig_1.BindingConfig.setAttribute(this.Node, key, attributes[key]);
	            }
	        });
	    }
	    SetEvents(events) {
	        this.OnAttached(() => {
	            for (var key in this.lastEvents)
	                bindingConfig_1.BindingConfig.removeListener(this.Node, key, this.lastEvents[key]);
	            for (var key in events)
	                bindingConfig_1.BindingConfig.addListener(this.Node, key, events[key]);
	            this.lastEvents = events;
	        });
	    }
	    DetachChild(nodeRef) {
	        this.childNodeRefs.delete(nodeRef.Id);
	        if (this.Node && nodeRef.Node)
	            bindingConfig_1.BindingConfig.removeChild(this.Node, nodeRef.Node);
	    }
	    Detach() {
	        if (this.parent)
	            this.parent.DetachChild(this);
	        if (this.Node)
	            bindingConfig_1.BindingConfig.remove(this.Node);
	    }
	    ToXml() {
	        var xml = `<${this.type} id='${this.Id}'${this.namespace ? ` xmlns='${this.namespace}'` : ''}>`;
	        this.childNodeRefs.forEach((value) => {
	            xml += value.ToXml();
	        });
	        xml += `</${this.type}>`;
	        return xml;
	    }
	    Attached() {
	        if (this.attached)
	            return;
	        this.attached = true;
	        this.attachedCallbacks.forEach((cb) => cb());
	        this.attachedCallbacks = [];
	        this.childNodeRefs.forEach((nodeRef) => nodeRef.Attached());
	        this.attached = true;
	    }
	    OnAttached(callback) {
	        if (this.attached) {
	            callback();
	            return;
	        }
	        this.attachedCallbacks.push(callback);
	    }
	    SetPropertiesRecursive(target, lastValue, source) {
	        if (typeof source !== "object")
	            throw "Property binding must resolve to an object";
	        for (var key in source) {
	            var val = source[key];
	            if (typeof val === 'object') {
	                if (!target[key])
	                    target[key] = {};
	                this.SetPropertiesRecursive(target[key], lastValue && lastValue[key], val);
	            }
	            else if (!lastValue || lastValue[key] !== val) {
	                if (bindingConfig_1.BindingConfig.setPropertyOverrides[key])
	                    bindingConfig_1.BindingConfig.setPropertyOverrides[key](target, val);
	                else
	                    target[key] = val;
	            }
	        }
	    }
	}
	exports.NodeRef = NodeRef;


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const store_1 = __webpack_require__(18);
	const diffAsync_1 = __webpack_require__(29);
	class StoreAsync extends store_1.Store {
	    constructor(init, idFunction) {
	        super(idFunction, init, new diffAsync_1.DiffAsync());
	    }
	}
	exports.StoreAsync = StoreAsync;


/***/ }),
/* 18 */
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
	const storeManager_1 = __webpack_require__(19);
	const storeReader_1 = __webpack_require__(24);
	const storeWriter_1 = __webpack_require__(25);
	const promiseQueue_1 = __webpack_require__(26);
	const storeQuery_1 = __webpack_require__(28);
	class AbstractStore {
	    Action(action) {
	        return __awaiter(this, void 0, void 0, function* () { });
	    }
	    Update(updateCallback) {
	        return __awaiter(this, void 0, void 0, function* () { });
	    }
	    Merge(value) {
	        return __awaiter(this, void 0, void 0, function* () { });
	    }
	    Write(value) {
	        return __awaiter(this, void 0, void 0, function* () { });
	    }
	    Get(id) {
	        return __awaiter(this, void 0, void 0, function* () { });
	    }
	    Query(id, defaultValue, queryFunc) {
	        return null;
	    }
	}
	exports.AbstractStore = AbstractStore;
	class Store extends AbstractStore {
	    constructor(idFunction, init, diff) {
	        super();
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
	        return this.Query("root", this.init, (reader) => __awaiter(this, void 0, void 0, function* () { return reader.Root; }));
	    }
	    Action(action) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.promiseQueue.Push((resolve) => {
	                resolve(action(this.reader, this.writer));
	            });
	        });
	    }
	    Next(action) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.Action(() => __awaiter(this, void 0, void 0, function* () { }));
	            action && action();
	        });
	    }
	    Update(updateOrCallback) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	                yield writer.Update(reader.Root, updateOrCallback);
	            }));
	        });
	    }
	    Merge(value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	                yield writer.Merge(reader.Root, value);
	            }));
	        });
	    }
	    Get(id) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var ret = null;
	            yield this.Action((reader) => __awaiter(this, void 0, void 0, function* () {
	                if (id)
	                    ret = reader.Get(id);
	                else
	                    ret = reader.Root;
	            }));
	            return ret;
	        });
	    }
	    Write(value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	                yield writer.Write(value);
	            }));
	        });
	    }
	    Query(id, defaultValue, queryFunc) {
	        if (this.queryCache.has(id))
	            return this.queryCache.get(id);
	        var query = new storeQuery_1.StoreQuery(this, defaultValue, queryFunc);
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
/* 19 */
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
	const tree_1 = __webpack_require__(20);
	const treeNode_1 = __webpack_require__(21);
	const utils_1 = __webpack_require__(23);
	const treeNodeRefId_1 = __webpack_require__(22);
	class StoreManager {
	    constructor(idFunction, diff) {
	        this.idFunction = idFunction;
	        this.data = { root: null, id: {} };
	        this.tree = new tree_1.Tree((path) => this.ResolvePropertyPath(path));
	        this.diff = diff;
	    }
	    GetNode(path) {
	        return this.tree.GetNode(path);
	    }
	    GetIdNode(id) {
	        return this.tree.GetIdNode(id);
	    }
	    ResolvePropertyPath(path) {
	        if (!path)
	            return this.data;
	        var value = path.split(".").reduce((pre, curr) => {
	            return pre && pre[curr];
	        }, this.data);
	        return value;
	    }
	    Write(value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var id = this.idFunction(value);
	            if (!id)
	                throw "Written value must have an id";
	            var path = ["id", id].join(".");
	            yield this.WritePath(path, value);
	        });
	    }
	    WritePath(path, updateCallback) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var value = this.ResolveUpdateCallback(path, updateCallback);
	            var breakUpMap = new Map();
	            var brokenValue = this.BreakUpValue(path, value, breakUpMap);
	            var batch = [{ path: path, newValue: brokenValue, oldValue: this.ResolvePropertyPath(path) }];
	            breakUpMap.forEach((value, key) => {
	                batch.push({
	                    path: key,
	                    newValue: value,
	                    oldValue: this.ResolvePropertyPath(key)
	                });
	            });
	            var diff = yield this.diff.DiffBatch(batch);
	            for (var x = 0; x < batch.length; x++)
	                this.AssignPropertyPath(batch[x].newValue, batch[x].path);
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
	        this.diff.Destroy();
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
	        var parentObj = this.ResolvePropertyPath(parentParts.join("."));
	        parentObj[prop] = value;
	    }
	    ResolveUpdateCallback(path, updateCallback) {
	        if (typeof updateCallback === 'function') {
	            var node = this.tree.GetNode(path);
	            var localValue = utils_1.CreateCopy(this.ResolvePropertyPath(node.Self.Path));
	            updateCallback(localValue);
	            return localValue;
	        }
	        return updateCallback;
	    }
	    ProcessDiff(data) {
	        var emit = new Set();
	        data.changedPaths.forEach(p => {
	            var match = p.match(/(.+)\.[^.]+$/);
	            var parent = match && match[1];
	            if (parent && !emit.has(parent) && Array.isArray(this.ResolvePropertyPath(parent)))
	                emit.add(parent);
	            this.EmitSet(p);
	        });
	        emit.forEach(path => this.EmitSet(path));
	        data.deletedPaths.forEach(p => {
	            var node = this.GetNode(p);
	            node && node.Destroy();
	        });
	    }
	}
	exports.StoreManager = StoreManager;


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const treeNode_1 = __webpack_require__(21);
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
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(6);
	const treeNodeRefId_1 = __webpack_require__(22);
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
	        return this.resolvePath(this.Path);
	    }
	    get Self() {
	        if (this.destroyed)
	            return this;
	        var value = this.Value;
	        var id = treeNodeRefId_1.TreeNodeRefId.GetIdFrom(value);
	        if (id !== undefined) {
	            return this.tree.GetIdNode(id);
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
	        if (this.property === val)
	            return;
	        if (this.parentNode) {
	            this.parentNode.Children.delete(this.property);
	            this.parentNode.Children.set(val, this);
	        }
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
	        this.Property = property;
	        this.resolvePath = resolvePath;
	        this.destroyed = false;
	        this.children = new Map();
	        this.emitter = new emitter_1.default();
	        this.emitter.addListener("set", () => {
	            this.nodeCache = null;
	        });
	    }
	    OverwriteChildren(children) {
	        this.children = new Map(children);
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
/* 22 */
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
	function CreateProxy(node, reader) {
	    reader && reader.Register(node.Emitter);
	    var self = node.Self;
	    if (node !== self)
	        reader && reader.Register(node.Self.Emitter);
	    var value = self.Value;
	    if (IsValue(value))
	        return value;
	    return CreateProxyObject(node, reader, value);
	}
	exports.CreateProxy = CreateProxy;
	function CreateProxyObject(node, reader, value) {
	    var ret = null;
	    var clearTimeout = null;
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
	                        return CreateNodeCopy(node.Self);
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
	                        var copy = CreateNodeCopy(node.Self);
	                        for (var key in obj)
	                            copy[key] = obj[key];
	                        return copy;
	                    };
	                if (typeof prop !== 'symbol') {
	                    if (typeof obj[prop] !== 'undefined')
	                        return obj[prop];
	                    var childNode = node.Self.EnsureChild(prop);
	                    if (!childNode)
	                        return null;
	                    return CreateProxy(childNode, reader);
	                }
	                return obj[prop];
	            },
	            set: (obj, prop, value) => {
	                obj[prop] = value;
	                clearTimeout = clearTimeout || setTimeout(() => {
	                    for (var key in obj)
	                        delete obj[key];
	                    clearTimeout = null;
	                }, 0);
	                return true;
	            }
	        });
	    }
	    return ret;
	}
	function CreateProxyArray(node, reader) {
	    if (node.NodeCache)
	        return node.NodeCache;
	    var localArray = node.Value;
	    var proxyArray = new Array(localArray.length);
	    for (var x = 0; x < proxyArray.length; x++) {
	        var childNode = node.EnsureChild(x.toString());
	        proxyArray[x] = CreateProxy(childNode, reader);
	    }
	    node.NodeCache = proxyArray;
	    return proxyArray;
	}
	exports.CreateProxyArray = CreateProxyArray;
	function CreateNodeCopy(node) {
	    var value = node.Value;
	    if (IsValue(value))
	        return value;
	    var ret = null;
	    if (Array.isArray(value))
	        ret = [];
	    else
	        ret = {};
	    for (var key in value) {
	        var child = node.Self.EnsureChild(key);
	        ret[key] = CreateNodeCopy(child);
	    }
	    return ret;
	}
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
	    else {
	        ret = {};
	        for (var key in source)
	            ret[key] = this.CreateCopy(source[key]);
	    }
	    return ret;
	}
	exports.CreateCopy = CreateCopy;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const utils_1 = __webpack_require__(23);
	const scopeCollector_1 = __webpack_require__(7);
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
/* 25 */
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
	class StoreWriter {
	    constructor(store) {
	        this.store = store;
	    }
	    Write(value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.store.Write(value);
	        });
	    }
	    Update(readOnly, updateCallback) {
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
	    Merge(readOnly, value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var path = null;
	            if (typeof readOnly === 'string') {
	                var node = this.store.GetIdNode(readOnly);
	                path = node && node.Path;
	            }
	            var path = path || readOnly && readOnly.___node.Path;
	            if (!path)
	                return;
	            for (var key in value) {
	                var childPath = [path, key].join(".");
	                yield this.store.WritePath(childPath, value[key]);
	            }
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
	    Pop(readOnly) {
	        var node = readOnly.___node;
	        var localValue = this.store.ResolvePropertyPath(node.Path);
	        var ret = localValue.pop();
	        this.store.EmitSet(node.Path);
	        return ret;
	    }
	    Splice(readOnly, start, deleteCount, ...items) {
	        var args = Array.from(arguments).slice(1);
	        var arrayNode = readOnly.___node;
	        var localValue = this.store.ResolvePropertyPath(arrayNode.Path);
	        var proxyArray = utils_1.CreateProxyArray(arrayNode, null);
	        var removedProxies = proxyArray.splice.apply(proxyArray, args);
	        for (var x = 0; x < removedProxies.length; x++) {
	            let node = removedProxies[x] && removedProxies[x].___node;
	            if (node)
	                node.Destroy();
	        }
	        for (var x = start + items.length; x < proxyArray.length; x++) {
	            let node = proxyArray[x] && proxyArray[x].___node;
	            if (node) {
	                node.Property = x.toString();
	            }
	        }
	        var ret = localValue.splice.apply(localValue, args);
	        this.store.EmitSet(arrayNode);
	        return ret;
	    }
	}
	exports.StoreWriter = StoreWriter;


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const deferredPromise_1 = __webpack_require__(27);
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
/* 27 */
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
/* 28 */
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
	const scopeBase_1 = __webpack_require__(5);
	const scope_1 = __webpack_require__(4);
	class StoreQuery extends scopeBase_1.ScopeBase {
	    constructor(store, defaultValue, getFunction) {
	        super(getFunction, defaultValue);
	        this.store = store;
	    }
	    get Promise() {
	        return new Promise((resolve, reject) => {
	            if (this.HasValue)
	                resolve(this.Value);
	            else {
	                var listener = () => {
	                    resolve(this.Value);
	                    this.removeListener("set", listener);
	                };
	                this.addListener("set", listener);
	                this.UpdateValueBase();
	            }
	        });
	    }
	    Scope(callback) {
	        return new scope_1.Scope(() => callback(this.Value));
	    }
	    Destroy() {
	        super.Destroy();
	    }
	    UpdateValue(callback) {
	        var value = null;
	        var emitters = null;
	        this.store.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	            reader.Watching = true;
	            value = yield this.GetFunction(reader, writer);
	            reader.Watching = false;
	            emitters = reader.Emitters;
	        })).then(() => callback(emitters, value));
	    }
	}
	exports.StoreQuery = StoreQuery;


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const workerQueue_1 = __webpack_require__(30);
	const storeWorker_1 = __webpack_require__(31);
	class DiffAsync {
	    constructor() {
	        this.workerQueue = new workerQueue_1.WorkerQueue(storeWorker_1.StoreWorker.Create());
	        this.workerQueue.Push(() => ({ method: "create", arguments: [] }));
	    }
	    DiffBatch(batch) {
	        return this.workerQueue.Push(() => ({
	            method: "diffbatch",
	            arguments: [batch]
	        }));
	    }
	    Destroy() {
	        this.workerQueue.Destroy();
	    }
	}
	exports.DiffAsync = DiffAsync;


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const promiseQueue_1 = __webpack_require__(26);
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
	    Destroy() {
	        this.worker.terminate();
	    }
	}
	exports.WorkerQueue = WorkerQueue;


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(32);
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
/* 32 */
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
	                case "diffbatch":
	                    return tracker.DiffBatch.apply(tracker, data.arguments);
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
	        DiffBatch(batch) {
	            var resp = {
	                changedPaths: [],
	                deletedPaths: []
	            };
	            for (var x = 0; x < batch.length; x++) {
	                var diffResp = this.Diff(batch[x].path, batch[x].newValue, batch[x].oldValue);
	                resp.changedPaths.push(...diffResp.changedPaths);
	                resp.deletedPaths.push(...diffResp.deletedPaths);
	            }
	            return resp;
	        }
	        Diff(path, newValue, oldValue) {
	            var resp = {
	                changedPaths: [],
	                deletedPaths: [],
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
	            if (newIsObject)
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
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const store_1 = __webpack_require__(18);
	const diffSync_1 = __webpack_require__(34);
	class StoreSync extends store_1.Store {
	    constructor(init, idFunction) {
	        super(idFunction, init, new diffSync_1.DiffSync());
	    }
	}
	exports.StoreSync = StoreSync;


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(32);
	class DiffSync {
	    constructor() {
	        this.diff = objectDiff_1.ObjectDiff();
	        this.diff({
	            method: "create",
	            arguments: []
	        });
	    }
	    DiffBatch(batch) {
	        return Promise.resolve(this.diff({
	            method: "diffbatch",
	            arguments: [batch]
	        }));
	    }
	    Destroy() { }
	}
	exports.DiffSync = DiffSync;


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const template_1 = __webpack_require__(1);
	function a(templateDefinition, children) {
	    return template_1.TemplateFunction("a", null, templateDefinition, children);
	}
	exports.a = a;
	function ul(templateDefinition, children) {
	    return template_1.TemplateFunction("ul", null, templateDefinition, children);
	}
	exports.ul = ul;
	function li(templateDefinition, children) {
	    return template_1.TemplateFunction("li", null, templateDefinition, children);
	}
	exports.li = li;
	function br(templateDefinition, children) {
	    return template_1.TemplateFunction("br", null, templateDefinition, children);
	}
	exports.br = br;
	function b(templateDefinition, children) {
	    return template_1.TemplateFunction("b", null, templateDefinition, children);
	}
	exports.b = b;
	function div(templateDefinition, children) {
	    return template_1.TemplateFunction("div", null, templateDefinition, children);
	}
	exports.div = div;
	function span(templateDefinition, children) {
	    return template_1.TemplateFunction("span", null, templateDefinition, children);
	}
	exports.span = span;
	function img(templateDefinition, children) {
	    return template_1.TemplateFunction("img", null, templateDefinition, children);
	}
	exports.img = img;
	function video(templateDefinition, children) {
	    return template_1.TemplateFunction("video", null, templateDefinition, children);
	}
	exports.video = video;
	function source(templateDefinition, children) {
	    return template_1.TemplateFunction("source", null, templateDefinition, children);
	}
	exports.source = source;
	function input(templateDefinition, children) {
	    return template_1.TemplateFunction("input", null, templateDefinition, children);
	}
	exports.input = input;
	function option(templateDefinition, children) {
	    return template_1.TemplateFunction("option", null, templateDefinition, children);
	}
	exports.option = option;
	function select(templateDefinition, children) {
	    return template_1.TemplateFunction("select", null, templateDefinition, children);
	}
	exports.select = select;
	function h1(templateDefinition, children) {
	    return template_1.TemplateFunction("h1", null, templateDefinition, children);
	}
	exports.h1 = h1;
	function h2(templateDefinition, children) {
	    return template_1.TemplateFunction("h2", null, templateDefinition, children);
	}
	exports.h2 = h2;
	function h3(templateDefinition, children) {
	    return template_1.TemplateFunction("h3", null, templateDefinition, children);
	}
	exports.h3 = h3;
	function table(templateDefinition, children) {
	    return template_1.TemplateFunction("table", null, templateDefinition, children);
	}
	exports.table = table;
	function th(templateDefinition, children) {
	    return template_1.TemplateFunction("th", null, templateDefinition, children);
	}
	exports.th = th;
	function tr(templateDefinition, children) {
	    return template_1.TemplateFunction("tr", null, templateDefinition, children);
	}
	exports.tr = tr;
	function td(templateDefinition, children) {
	    return template_1.TemplateFunction("td", null, templateDefinition, children);
	}
	exports.td = td;
	function p(templateDefinition, children) {
	    return template_1.TemplateFunction("p", null, templateDefinition, children);
	}
	exports.p = p;
	function style(templateDefinition, children) {
	    return template_1.TemplateFunction("style", null, templateDefinition, children);
	}
	exports.style = style;


/***/ })
/******/ ]);