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
	var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
	    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	    return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
	var __metadata = (this && this.__metadata) || function (k, v) {
	    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const scope_1 = __webpack_require__(1);
	exports.Scope = scope_1.Scope;
	const storeAsync_1 = __webpack_require__(5);
	exports.StoreAsync = storeAsync_1.StoreAsync;
	const storeSync_1 = __webpack_require__(21);
	exports.StoreSync = storeSync_1.StoreSync;
	const store_1 = __webpack_require__(6);
	exports.AbstractStore = store_1.AbstractStore;
	exports.Store = store_1.Store;
	const nodeRef_1 = __webpack_require__(23);
	exports.NodeRef = nodeRef_1.NodeRef;
	const component_1 = __webpack_require__(28);
	exports.Component = component_1.Component;
	const elements_1 = __webpack_require__(31);
	const decorators_1 = __webpack_require__(33);
	class Temp {
	    getVal() {
	        return "temp function val";
	    }
	}
	class ChildComp extends component_1.Component {
	    Template() {
	        return elements_1.div({ text: () => this.temp.getVal() });
	    }
	}
	__decorate([
	    decorators_1.Inject(Temp),
	    __metadata("design:type", Temp)
	], ChildComp.prototype, "temp", void 0);
	var childComp = component_1.Component.ToFunction("child-comp", null, ChildComp);
	class TestComp extends component_1.Component {
	    constructor() {
	        super(...arguments);
	        this.state = { test: "start" };
	        this.state2 = { temp: "end" };
	        this.temp = new Temp();
	    }
	    get Test() {
	        return `${this.state.test} ${this.state2.temp}`;
	    }
	    Template() {
	        return elements_1.div({}, () => [
	            elements_1.div({ text: () => this.Test, on: { click: () => this.state = { test: "changed to this" } } }),
	            childComp({})
	        ]);
	    }
	}
	__decorate([
	    decorators_1.Store(),
	    __metadata("design:type", Object)
	], TestComp.prototype, "state", void 0);
	__decorate([
	    decorators_1.Store(),
	    __metadata("design:type", Object)
	], TestComp.prototype, "state2", void 0);
	__decorate([
	    decorators_1.Inject(Temp),
	    __metadata("design:type", Object)
	], TestComp.prototype, "temp", void 0);
	__decorate([
	    decorators_1.Scope(),
	    __metadata("design:type", Object),
	    __metadata("design:paramtypes", [])
	], TestComp.prototype, "Test", null);
	var testComp = component_1.Component.ToFunction("test-comp", null, TestComp);
	component_1.Component.Attach(document.getElementById("container"), testComp({}));


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scopeBase_1 = __webpack_require__(2);
	const scopeCollector_1 = __webpack_require__(4);
	class Scope extends scopeBase_1.ScopeBase {
	    constructor(getFunction) {
	        if (typeof getFunction !== 'function')
	            super(getFunction);
	        else {
	            super(null);
	            this.getFunction = getFunction;
	        }
	    }
	    Scope(callback) {
	        return new Scope(() => callback(this.Value));
	    }
	    UpdateValue(callback) {
	        var value = undefined;
	        var emitters = scopeCollector_1.scopeCollector.Watch(() => {
	            if (this.getFunction)
	                value = this.getFunction();
	        });
	        callback(emitters, value);
	    }
	}
	exports.Scope = Scope;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(3);
	const scopeCollector_1 = __webpack_require__(4);
	class ScopeBase extends emitter_1.default {
	    constructor(defaultValue = null) {
	        super();
	        this.defaultValue = defaultValue;
	        this.emitters = new Set();
	        this.setCallback = this.SetCallback.bind(this);
	        this.destroyCallback = this.DestroyCallback.bind(this);
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
/* 3 */
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
/* 4 */
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
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const store_1 = __webpack_require__(6);
	const diffAsync_1 = __webpack_require__(17);
	class StoreAsync extends store_1.Store {
	    constructor(init, idFunction) {
	        super(idFunction, init, new diffAsync_1.DiffAsync());
	    }
	}
	exports.StoreAsync = StoreAsync;


/***/ }),
/* 6 */
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
	const storeManager_1 = __webpack_require__(7);
	const storeReader_1 = __webpack_require__(12);
	const storeWriter_1 = __webpack_require__(13);
	const promiseQueue_1 = __webpack_require__(14);
	const storeQuery_1 = __webpack_require__(16);
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
/* 7 */
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
	const tree_1 = __webpack_require__(8);
	const treeNode_1 = __webpack_require__(9);
	const utils_1 = __webpack_require__(11);
	const treeNodeRefId_1 = __webpack_require__(10);
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
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const treeNode_1 = __webpack_require__(9);
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
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(3);
	const treeNodeRefId_1 = __webpack_require__(10);
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
/* 10 */
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
/* 11 */
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
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const utils_1 = __webpack_require__(11);
	const scopeCollector_1 = __webpack_require__(4);
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
/* 13 */
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
	const utils_1 = __webpack_require__(11);
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
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const deferredPromise_1 = __webpack_require__(15);
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
/* 15 */
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
	const scopeBase_1 = __webpack_require__(2);
	const scope_1 = __webpack_require__(1);
	class StoreQuery extends scopeBase_1.ScopeBase {
	    constructor(store, defaultValue, getFunction) {
	        super(defaultValue);
	        this.store = store;
	        this.getFunction = getFunction;
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
	            value = yield this.getFunction(reader, writer);
	            reader.Watching = false;
	            emitters = reader.Emitters;
	        })).then(() => callback(emitters, value));
	    }
	}
	exports.StoreQuery = StoreQuery;


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const workerQueue_1 = __webpack_require__(18);
	const storeWorker_1 = __webpack_require__(19);
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
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const promiseQueue_1 = __webpack_require__(14);
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
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(20);
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
/* 20 */
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
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const store_1 = __webpack_require__(6);
	const diffSync_1 = __webpack_require__(22);
	class StoreSync extends store_1.Store {
	    constructor(init, idFunction) {
	        super(idFunction, init, new diffSync_1.DiffSync());
	    }
	}
	exports.StoreSync = StoreSync;


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(20);
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
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const nodeConfig_1 = __webpack_require__(24);
	const injector_1 = __webpack_require__(27);
	class NodeRef {
	    get Node() {
	        return this.node;
	    }
	    get ChildNodes() {
	        return this.childNodes;
	    }
	    set Parent(val) {
	        if (this.parent && this.parent !== val)
	            this.Detach();
	        this.parent = val;
	        this.parent && this.parent.ChildNodes.add(this);
	    }
	    get Injector() {
	        return this.injector;
	    }
	    constructor(node) {
	        this.node = node;
	        this.childNodes = new Set();
	        this.injector = new injector_1.Injector();
	    }
	    AddChild(nodeRef) {
	        nodeRef.Parent = this;
	        this.childNodes.add(nodeRef);
	        nodeConfig_1.NodeConfig.addChild(this.Node, nodeRef.Node);
	    }
	    AddChildAfter(currentChild, newChild) {
	        if (currentChild && !this.childNodes.has(currentChild))
	            throw "currentChild is not valid";
	        newChild.Parent = this;
	        nodeConfig_1.NodeConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
	    }
	    DetachChild(nodeRef) {
	        this.childNodes.delete(nodeRef);
	        nodeConfig_1.NodeConfig.removeChild(this.Node, nodeRef.Node);
	    }
	    Detach() {
	        if (this.parent)
	            this.parent.DetachChild(this);
	        nodeConfig_1.NodeConfig.remove(this.Node);
	    }
	    Destroy() {
	        this.Detach();
	        this.ClearChildren();
	    }
	    ClearChildren() {
	        this.childNodes.forEach(node => node.Destroy());
	        this.childNodes.clear();
	    }
	}
	exports.NodeRef = NodeRef;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const domNodeConfig_1 = __webpack_require__(25);
	exports.NodeConfig = domNodeConfig_1.DOMNodeConfig;


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const window_1 = __webpack_require__(26);
	var pendingUpdates = [];
	var updateScheduled = false;
	var updateIndex = 0;
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
	exports.DOMNodeConfig = {
	    createNode: function (type, namespace) {
	        if (namespace)
	            return window_1.wndw.document.createElementNS(namespace, type);
	        return window_1.wndw.document.createElement(type);
	    },
	    scheduleUpdate: function (callback) {
	        pendingUpdates.push(callback);
	        if (!updateScheduled) {
	            updateScheduled = true;
	            window_1.wndw.requestAnimationFrame(processUpdates);
	        }
	    },
	    addListener: function (target, type, callback) {
	        target.addEventListener(type, callback);
	    },
	    removeListener: function (target, type, callback) {
	        target.removeEventListener(type, callback);
	    },
	    addChild: function (root, child) {
	        root.appendChild(child);
	    },
	    addChildFirst: function (root, child) {
	        exports.DOMNodeConfig.addChildBefore(root, root.firstChild, child);
	    },
	    addChildBefore: function (root, sibling, child) {
	        if (!sibling) {
	            exports.DOMNodeConfig.addChild(root, child);
	            return;
	        }
	        if (child !== sibling)
	            root.insertBefore(child, sibling);
	    },
	    addChildAfter: function (root, sibling, child) {
	        if (!sibling) {
	            exports.DOMNodeConfig.addChildFirst(root, child);
	            return;
	        }
	        exports.DOMNodeConfig.addChildBefore(root, sibling.nextSibling, child);
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
	    getAttribute(target, attribute) {
	        return target.getAttribute(attribute);
	    },
	    setAttribute(target, attribute, value) {
	        target.setAttribute(attribute, value);
	    },
	    fireEvent(target, event, data) {
	        var cEvent = new CustomEvent(event, data);
	        target.dispatchEvent(cEvent);
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
/* 26 */
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
/* 27 */
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
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scope_1 = __webpack_require__(1);
	const nodeRef_1 = __webpack_require__(23);
	const componentNode_1 = __webpack_require__(29);
	class Component {
	    constructor(data, templates, nodeRef, injector) {
	        this.templates = templates;
	        this.nodeRef = nodeRef;
	        this.injector = injector;
	        this.scope = new scope_1.Scope(data);
	        this.destroyables = [this.scope];
	        this.Init();
	    }
	    get Injector() {
	        return this.injector;
	    }
	    get Destroyables() {
	        return this.destroyables;
	    }
	    get Data() {
	        return this.scope.Value;
	    }
	    get NodeRef() {
	        return this.nodeRef;
	    }
	    get Templates() {
	        return this.templates;
	    }
	    Template() {
	        return [];
	    }
	    Bound() {
	    }
	    Fire(event, data) {
	        this.NodeRef.Fire(event, data);
	    }
	    Destroy() {
	        this.Destroyables.forEach(d => d.Destroy());
	    }
	    Init() {
	    }
	}
	exports.Component = Component;
	(function (Component) {
	    function ToFunction(type, namespace, constructor) {
	        return componentNode_1.ComponentNode.ToFunction(type, namespace, constructor);
	    }
	    Component.ToFunction = ToFunction;
	    function Attach(node, nodeRef) {
	        var rootRef = new nodeRef_1.NodeRef(node);
	        rootRef.AddChild(nodeRef);
	    }
	    Component.Attach = Attach;
	})(Component = exports.Component || (exports.Component = {}));


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const boundNode_1 = __webpack_require__(30);
	const nodeConfig_1 = __webpack_require__(24);
	const injector_1 = __webpack_require__(27);
	class ComponentNode extends boundNode_1.BoundNode {
	    constructor(nodeDef, constructor, templates) {
	        super(nodeDef);
	        this.setChildren = false;
	        this.component = new constructor(nodeDef.data || nodeDef.static, templates, this, this.Injector);
	        this.SetChildren();
	    }
	    SetEvents() {
	        this.componentEvents = this.eventsScope.Value;
	    }
	    Fire(event, data) {
	        var eventCallback = this.componentEvents && this.componentEvents[event];
	        eventCallback && eventCallback(data);
	    }
	    ScheduleSetChildren() {
	        if (this.setChildren)
	            return;
	        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	            this.SetChildren();
	            this.setChildren = false;
	        });
	    }
	    SetChildren() {
	        this.ClearChildren();
	        var nodes = null;
	        injector_1.Injector.Scope(this.Injector, () => nodes = this.component.Template());
	        if (!Array.isArray(nodes))
	            nodes = [nodes];
	        nodes.forEach(node => this.AddChild(node));
	        setTimeout(() => this.component.Bound(), 0);
	    }
	    Destroy() {
	        super.Destroy();
	        this.component.Destroy();
	    }
	}
	exports.ComponentNode = ComponentNode;
	(function (ComponentNode) {
	    function ToFunction(type, namespace, constructor) {
	        return (nodeDef, templates) => {
	            var def = {
	                type: type,
	                namespace: namespace,
	                props: nodeDef.props,
	                attrs: nodeDef.attrs,
	                on: nodeDef.on,
	                static: nodeDef.static,
	                data: nodeDef.data,
	            };
	            return new ComponentNode(def, constructor, templates);
	        };
	    }
	    ComponentNode.ToFunction = ToFunction;
	})(ComponentNode = exports.ComponentNode || (exports.ComponentNode = {}));


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const nodeConfig_1 = __webpack_require__(24);
	const scope_1 = __webpack_require__(1);
	const nodeRef_1 = __webpack_require__(23);
	function defaultChildren() {
	    return [];
	}
	exports.defaultChildren = defaultChildren;
	class BoundNode extends nodeRef_1.NodeRef {
	    constructor(nodeDef) {
	        super(nodeConfig_1.NodeConfig.createNode(nodeDef.type, nodeDef.namespace));
	        this.setText = false;
	        this.setProperties = false;
	        this.setAttributes = false;
	        this.setEvents = false;
	        if (nodeDef.text) {
	            this.textScope = new scope_1.Scope(nodeDef.text);
	            this.textScope.addListener("set", this.ScheduleSetText.bind(this));
	            this.SetText();
	        }
	        if (nodeDef.props) {
	            this.propertiesScope = new scope_1.Scope(nodeDef.props);
	            this.propertiesScope.addListener("set", this.ScheduleSetProperties.bind(this));
	            this.SetProperties();
	        }
	        if (nodeDef.attrs) {
	            this.attributesScope = new scope_1.Scope(nodeDef.attrs);
	            this.attributesScope.addListener("set", this.ScheduleSetAttributes.bind(this));
	            this.SetAttributes();
	        }
	        if (nodeDef.on) {
	            this.eventsScope = new scope_1.Scope(nodeDef.on);
	            this.eventsScope.addListener("set", this.ScheduleSetEvents.bind(this));
	            this.SetEvents();
	        }
	    }
	    ScheduleSetText() {
	        if (this.setText)
	            return;
	        this.setText = true;
	        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	            this.SetText();
	            this.setText = false;
	        });
	    }
	    SetText() {
	        nodeConfig_1.NodeConfig.setText(this.Node, this.textScope.Value);
	    }
	    ScheduleSetProperties() {
	        if (this.setProperties)
	            return;
	        this.setProperties = true;
	        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	            this.SetProperties();
	            this.setProperties = false;
	        });
	    }
	    SetProperties() {
	        var properties = this.propertiesScope.Value;
	        this.SetPropertiesRecursive(this.Node, this.lastProperties, properties);
	        this.lastProperties = properties;
	    }
	    ScheduleSetAttributes() {
	        if (this.setAttributes)
	            return;
	        this.setAttributes = true;
	        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	            this.SetAttributes();
	            this.setAttributes = false;
	        });
	    }
	    SetAttributes() {
	        var attributes = this.attributesScope.Value;
	        for (var key in attributes) {
	            var val = nodeConfig_1.NodeConfig.getAttribute(this.Node, key);
	            if (val !== attributes[key])
	                nodeConfig_1.NodeConfig.setAttribute(this.Node, key, attributes[key]);
	        }
	    }
	    ScheduleSetEvents() {
	        if (this.setEvents)
	            return;
	        this.setEvents = true;
	        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	            this.SetEvents();
	            this.setEvents = false;
	        });
	    }
	    Destroy() {
	        super.Destroy();
	        this.attributesScope && this.attributesScope.Destroy();
	        this.propertiesScope && this.propertiesScope.Destroy();
	        this.textScope && this.textScope.Destroy();
	        this.eventsScope && this.eventsScope.Destroy();
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
	                if (nodeConfig_1.NodeConfig.setPropertyOverrides[key])
	                    nodeConfig_1.NodeConfig.setPropertyOverrides[key](target, val);
	                else
	                    target[key] = val;
	            }
	        }
	    }
	}
	exports.BoundNode = BoundNode;


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const elementNode_1 = __webpack_require__(32);
	function div(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("div", null, nodeDef, children);
	}
	exports.div = div;
	function a(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("a", null, nodeDef, children);
	}
	exports.a = a;
	function ul(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("ul", null, nodeDef, children);
	}
	exports.ul = ul;
	function li(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("li", null, nodeDef, children);
	}
	exports.li = li;
	function br(nodeDef) {
	    return elementNode_1.ElementNode.Create("br", null, nodeDef, null);
	}
	exports.br = br;
	function b(nodeDef) {
	    return elementNode_1.ElementNode.Create("b", null, nodeDef);
	}
	exports.b = b;
	function span(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("span", null, nodeDef, children);
	}
	exports.span = span;
	function img(nodeDef) {
	    return elementNode_1.ElementNode.Create("img", null, nodeDef, null);
	}
	exports.img = img;
	function video(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("video", null, nodeDef, children);
	}
	exports.video = video;
	function source(nodeDef) {
	    return elementNode_1.ElementNode.Create("source", null, nodeDef, null);
	}
	exports.source = source;
	function input(nodeDef) {
	    return elementNode_1.ElementNode.Create("input", null, nodeDef, null);
	}
	exports.input = input;
	function select(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("select", null, nodeDef, children);
	}
	exports.select = select;
	function option(nodeDef) {
	    return elementNode_1.ElementNode.Create("div", null, nodeDef, null);
	}
	exports.option = option;
	function h1(nodeDef) {
	    return elementNode_1.ElementNode.Create("h1", null, nodeDef, null);
	}
	exports.h1 = h1;
	function h2(nodeDef) {
	    return elementNode_1.ElementNode.Create("h2", null, nodeDef, null);
	}
	exports.h2 = h2;
	function h3(nodeDef) {
	    return elementNode_1.ElementNode.Create("h3", null, nodeDef, null);
	}
	exports.h3 = h3;
	function p(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("p", null, nodeDef, children);
	}
	exports.p = p;
	function style(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("style", null, nodeDef, children);
	}
	exports.style = style;
	function button(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("button", null, nodeDef, children);
	}
	exports.button = button;


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const boundNode_1 = __webpack_require__(30);
	const scope_1 = __webpack_require__(1);
	const nodeConfig_1 = __webpack_require__(24);
	const injector_1 = __webpack_require__(27);
	class ElementNode extends boundNode_1.BoundNode {
	    constructor(nodeDef) {
	        super(nodeDef);
	        this.setData = false;
	        this.nodeRefMap = new Map();
	        this.childrenFunc = nodeDef.children || boundNode_1.defaultChildren;
	        this.keyFunc = nodeDef.key;
	        this.dataScope = new scope_1.Scope(nodeDef.data || nodeDef.static || true);
	        this.keyDataScope = this.dataScope.Scope(data => {
	            var value = data;
	            if (!value)
	                value = [];
	            else if (!Array.isArray(value))
	                value = [value];
	            return new Map(value.map((v, i) => [this.keyFunc && this.keyFunc(v) || i.toString(), v]));
	        });
	        this.keyDataScope.addListener("set", () => this.ScheduleSetData());
	        this.ScheduleSetData();
	    }
	    ScheduleSetData() {
	        if (this.setData)
	            return;
	        this.setData = true;
	        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	            this.SetData();
	            this.setData = false;
	        });
	    }
	    SetData() {
	        var newNodeRefMap = new Map();
	        var previousNode = null;
	        var index = 0;
	        this.keyDataScope.Value.forEach((value, key) => {
	            var nodes = this.nodeRefMap.get(key);
	            if (!nodes) {
	                injector_1.Injector.Scope(this.Injector, () => nodes = this.childrenFunc(value, index));
	                if (!Array.isArray(nodes))
	                    nodes = [nodes];
	            }
	            for (var x = 0; x < nodes.length; x++) {
	                this.AddChildAfter(previousNode, nodes[x]);
	                previousNode = nodes[x];
	            }
	            newNodeRefMap.set(key, nodes);
	            this.nodeRefMap.delete(key);
	            index++;
	        });
	        this.nodeRefMap.forEach(value => {
	            value.forEach(v => v.Destroy());
	        });
	        this.nodeRefMap = newNodeRefMap;
	    }
	    SetEvents() {
	        for (var key in this.lastEvents)
	            nodeConfig_1.NodeConfig.removeListener(this.Node, key, this.lastEvents[key]);
	        var events = this.eventsScope.Value;
	        for (var key in events)
	            nodeConfig_1.NodeConfig.addListener(this.Node, key, events[key]);
	        this.lastEvents = events;
	    }
	    Destroy() {
	        super.Destroy();
	        this.keyDataScope.Destroy();
	        this.dataScope.Destroy();
	    }
	}
	exports.ElementNode = ElementNode;
	(function (ElementNode) {
	    function Create(type, namespace, nodeDef, children) {
	        var def = {
	            type: type,
	            namespace: namespace,
	            text: nodeDef.text,
	            props: nodeDef.props,
	            attrs: nodeDef.attrs,
	            on: nodeDef.on,
	            static: nodeDef.static,
	            data: nodeDef.data,
	            key: nodeDef.key,
	            children: children
	        };
	        return new ElementNode(def);
	    }
	    ElementNode.Create = Create;
	})(ElementNode = exports.ElementNode || (exports.ElementNode = {}));


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const storeSync_1 = __webpack_require__(21);
	const scope_1 = __webpack_require__(1);
	function Store() {
	    return function (target, propertyKey, descriptor) {
	        return {
	            configurable: false,
	            enumerable: true,
	            get: function () {
	                var store = this[`_${propertyKey}`];
	                if (store)
	                    return store.Root.Value;
	                return null;
	            },
	            set: function (val) {
	                var store = this[`_${propertyKey}`];
	                if (!store) {
	                    store = this[`_${propertyKey}`] = new storeSync_1.StoreSync(val);
	                    this.Destroyables.push(store);
	                }
	                else
	                    store.Merge(val);
	            }
	        };
	    };
	}
	exports.Store = Store;
	function Scope() {
	    return function (target, propertyKey, descriptor) {
	        return {
	            configurable: false,
	            enumerable: false,
	            get: function () {
	                var scope = this[`_${propertyKey}`];
	                if (!scope) {
	                    scope = this[`_${propertyKey}`] = new scope_1.Scope(descriptor.get.bind(this));
	                    this.Destroyables.push(scope);
	                }
	                return scope.Value;
	            }
	        };
	    };
	}
	exports.Scope = Scope;
	function Inject(type) {
	    return function (target, propertyKey) {
	        return {
	            configurable: false,
	            enumerable: true,
	            get: function () {
	                return this.Injector.Get(type);
	            },
	            set: function (val) {
	                this.Injector.Set(type, val);
	            }
	        };
	    };
	}
	exports.Inject = Inject;


/***/ })
/******/ ]);