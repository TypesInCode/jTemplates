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
	var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const storeAsync_1 = __webpack_require__(1);
	exports.StoreAsync = storeAsync_1.StoreAsync;
	const storeSync_1 = __webpack_require__(19);
	exports.StoreSync = storeSync_1.StoreSync;
	const storeBase_1 = __webpack_require__(2);
	exports.AbstractStore = storeBase_1.AbstractStore;
	exports.StoreBase = storeBase_1.StoreBase;
	const nodeRef_1 = __webpack_require__(21);
	exports.NodeRef = nodeRef_1.NodeRef;
	const component_1 = __webpack_require__(26);
	exports.Component = component_1.Component;
	const decorators_1 = __webpack_require__(29);
	exports.Store = decorators_1.Store;
	exports.Scope = decorators_1.Scope;
	exports.Inject = decorators_1.Inject;
	exports.Destroy = decorators_1.Destroy;
	exports.PreReq = decorators_1.PreReq;
	exports.PreReqTemplate = decorators_1.PreReqTemplate;
	const elements_1 = __webpack_require__(30);
	class Temp {
	    getVal() {
	        return "temp function val";
	    }
	    Destroy() {
	    }
	}
	class Temp2 {
	    notVal() {
	        return "temp";
	    }
	    Destroy() { }
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
	let TestComp = class TestComp extends component_1.Component {
	    constructor() {
	        super(...arguments);
	        this.prereq = { Init: Promise.resolve() };
	        this.state = { test: "start", array: [1, 2, 3, 4] };
	        this.state2 = { temp: "end" };
	        this.fullStore = new storeSync_1.StoreSync({ data: [{ _id: 1, val: 'any' }, { _id: 2, val: 'second' }, { _id: 3, val: 'third' }] });
	        this.temp = new Temp();
	    }
	    get Test() {
	        return `${this.state.test} ${this.state2.temp}`;
	    }
	    get Array() {
	        return this.state.array.map((val) => val * 10);
	    }
	    Template() {
	        return elements_1.div({}, () => [
	            elements_1.div({ text: () => this.Test, on: { click: () => this.state = { test: "changed to this", array: [1, 2, 3, 4, 5] } } }),
	            childComp({}),
	            elements_1.div({ key: (val) => val._id, data: () => this.fullStore.Root.Value.data }, (val) => elements_1.div({ text: () => val.val, on: { click: () => __awaiter(this, void 0, void 0, function* () {
	                        yield this.fullStore.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	                            var ind = reader.Root.data.findIndex(v => v._id === val._id);
	                            writer.Splice(reader.Root.data, ind, 1);
	                        }));
	                    })
	                } }))
	        ]);
	    }
	};
	__decorate([
	    decorators_1.PreReq(),
	    __metadata("design:type", Object)
	], TestComp.prototype, "prereq", void 0);
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
	    decorators_1.Destroy(),
	    __metadata("design:type", Object)
	], TestComp.prototype, "temp", void 0);
	__decorate([
	    decorators_1.Scope(),
	    __metadata("design:type", Object),
	    __metadata("design:paramtypes", [])
	], TestComp.prototype, "Test", null);
	__decorate([
	    decorators_1.Scope(),
	    __metadata("design:type", Object),
	    __metadata("design:paramtypes", [])
	], TestComp.prototype, "Array", null);
	TestComp = __decorate([
	    decorators_1.PreReqTemplate(() => [])
	], TestComp);
	var testComp = component_1.Component.ToFunction("test-comp", null, TestComp);
	var node = testComp({});
	component_1.Component.Attach(document.getElementById("container"), node);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const storeBase_1 = __webpack_require__(2);
	const diffAsync_1 = __webpack_require__(15);
	class StoreAsync extends storeBase_1.StoreBase {
	    constructor(init, idFunction) {
	        super(idFunction, init, new diffAsync_1.DiffAsync());
	    }
	}
	exports.StoreAsync = StoreAsync;


/***/ }),
/* 2 */
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
	const storeManager_1 = __webpack_require__(3);
	const storeReader_1 = __webpack_require__(10);
	const storeWriter_1 = __webpack_require__(11);
	const promiseQueue_1 = __webpack_require__(12);
	const scope_1 = __webpack_require__(14);
	class AbstractStore {
	    ActionSync(action) { }
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
	    Query(queryFunc) {
	        return null;
	    }
	}
	exports.AbstractStore = AbstractStore;
	class StoreBase {
	    constructor(idFunction, init, diff) {
	        this.manager = new storeManager_1.StoreManager(idFunction, diff);
	        this.reader = new storeReader_1.StoreReader(this.manager);
	        this.writer = new storeWriter_1.StoreWriter(this.manager);
	        this.promiseQueue = new promiseQueue_1.PromiseQueue();
	        this.Action(() => __awaiter(this, void 0, void 0, function* () {
	            yield this.manager.WritePath("root", init);
	        }));
	        this.rootScope = new scope_1.Scope(() => {
	            var value = null;
	            this.ActionSync(reader => value = reader.Root);
	            return value || init;
	        });
	    }
	    get Root() {
	        return this.rootScope;
	    }
	    Action(action) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.promiseQueue.Push((resolve) => {
	                resolve(action(this.reader, this.writer));
	            });
	        });
	    }
	    ActionSync(action) {
	        action(this.reader);
	    }
	    Next(action) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.Action(() => __awaiter(this, void 0, void 0, function* () { }));
	            action && action();
	        });
	    }
	    Update(value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.Action((reader, writer) => __awaiter(this, void 0, void 0, function* () {
	                yield writer.Update(reader.Root, value);
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
	    Query(queryFunc) {
	        return new scope_1.Scope(() => {
	            var value = null;
	            this.ActionSync(reader => value = queryFunc(reader));
	            return value;
	        });
	    }
	    Destroy() {
	        this.rootScope.Destroy();
	        this.manager.Destroy();
	    }
	}
	exports.StoreBase = StoreBase;


/***/ }),
/* 3 */
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
	const tree_1 = __webpack_require__(4);
	const treeNode_1 = __webpack_require__(5);
	const treeNodeRefId_1 = __webpack_require__(7);
	const proxy_1 = __webpack_require__(9);
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
	            if (this.ResolvePropertyPath(path) === undefined)
	                this.AssignPropertyPath(null, path);
	            yield this.WritePath(path, value);
	        });
	    }
	    WritePaths(keyValues) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var batch = new Array();
	            for (var x = 0; x < keyValues.length; x++) {
	                var path = keyValues[x][0];
	                var value = keyValues[x][1];
	                var breakUpMap = this.BreakUpValue(path, value);
	                breakUpMap.forEach((value, key) => {
	                    batch.push({
	                        path: key,
	                        newValue: value,
	                        oldValue: this.ResolvePropertyPath(key)
	                    });
	                });
	            }
	            var diff = yield this.diff.DiffBatch(batch);
	            for (var x = 0; x < batch.length; x++)
	                this.AssignPropertyPath(batch[x].newValue, batch[x].path);
	            this.ProcessDiff(diff);
	        });
	    }
	    WritePath(path, value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var breakUpMap = this.BreakUpValue(path, value);
	            var batch = new Array(breakUpMap.size);
	            var index = 0;
	            breakUpMap.forEach((value, key) => {
	                batch[index] = {
	                    path: key,
	                    newValue: value,
	                    oldValue: this.ResolvePropertyPath(key)
	                };
	                index++;
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
	    BreakUpValue(path, parent, key, map) {
	        var value = key ? parent[key] : parent;
	        if (!map) {
	            map = new Map();
	            map.set(path, value);
	        }
	        if (value && value.toJSON && typeof value.toJSON === 'function')
	            value = value.toJSON();
	        if (proxy_1.IProxy.ValueType(value) === proxy_1.IProxyType.Value) {
	            return map;
	        }
	        var id = this.idFunction && this.idFunction(value);
	        var idPath = ["id", id].join(".");
	        if ((id || id === 0) && path !== idPath) {
	            var treeNodeRef = treeNodeRefId_1.TreeNodeRefId.GetString(id);
	            if (key)
	                parent[key] = treeNodeRef;
	            map.set(idPath, value);
	            this.BreakUpValue(idPath, value, null, map);
	        }
	        else {
	            for (var key in value) {
	                var childPath = [path, key].join(".");
	                this.BreakUpValue(childPath, value, key, map);
	            }
	        }
	        return map;
	    }
	    AssignPropertyPath(value, path) {
	        var parts = path.split(".");
	        var prop = parts[parts.length - 1];
	        var parentParts = parts.slice(0, parts.length - 1);
	        var parentObj = this.ResolvePropertyPath(parentParts.join("."));
	        parentObj[prop] = value;
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
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const treeNode_1 = __webpack_require__(5);
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
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(6);
	const treeNodeRefId_1 = __webpack_require__(7);
	const scopeCollector_1 = __webpack_require__(8);
	const proxy_1 = __webpack_require__(9);
	class TreeNode {
	    get Proxy() {
	        scopeCollector_1.ScopeCollector.Register(this.emitter);
	        if (this.Self !== this)
	            return this.Self.Proxy;
	        if (this.proxy !== undefined)
	            return this.proxy;
	        var value = this.Value;
	        var proxyType = proxy_1.IProxy.ValueType(value);
	        if (proxyType === proxy_1.IProxyType.Value)
	            this.proxy = value;
	        else
	            this.proxy = proxy_1.IProxy.Create(this, proxyType);
	        return this.proxy;
	    }
	    get ProxyArray() {
	        this.UpdateProxyArray(this.Value);
	        return this.proxyArray;
	    }
	    get Children() {
	        return this.children;
	    }
	    get Path() {
	        return (this.parentNode ? this.parentNode.Path + "." : "") + this.property;
	    }
	    get Value() {
	        if (this.value === undefined)
	            this.value = this.resolvePath(this.Path);
	        return this.value;
	    }
	    get Self() {
	        var value = this.Value;
	        var id = treeNodeRefId_1.TreeNodeRefId.GetIdFrom(value);
	        if (id !== undefined)
	            return this.tree.GetIdNode(id);
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
	    constructor(tree, parentNode, property, resolvePath) {
	        this.tree = tree;
	        this.proxy = undefined;
	        this.value = undefined;
	        this.parentNode = parentNode;
	        this.Property = property;
	        this.resolvePath = resolvePath;
	        this.children = new Map();
	        this.emitter = new emitter_1.default();
	        this.emitter.addListener("set", () => {
	            this.value = undefined;
	            var value = this.Self.Value;
	            var valueType = proxy_1.IProxy.ValueType(value);
	            if (valueType !== proxy_1.IProxy.Type(this.Proxy) || valueType === proxy_1.IProxyType.Value) {
	                this.proxy = undefined;
	                this.parentNode && this.parentNode.UpdateCachedArray(this.property, this.Proxy);
	            }
	        });
	    }
	    UpdateCachedArray(index, value) {
	        if (this.proxyArray)
	            this.proxyArray[parseInt(index)] = value;
	    }
	    ClearCachedArray() {
	        this.proxyArray = null;
	    }
	    EnsureChild(prop) {
	        if (!this.children)
	            return null;
	        var child = this.children.get(prop);
	        if (!child) {
	            child = new TreeNode(this.tree, this, prop, this.resolvePath);
	            this.children.set(prop, child);
	        }
	        return child;
	    }
	    Destroy() {
	        this.children.forEach(val => val.Destroy());
	        this.emitter.removeAllListeners();
	    }
	    UpdateProxyArray(value) {
	        if (Array.isArray(value)) {
	            var proxyArrayLength = this.proxyArray ? this.proxyArray.length : 0;
	            this.proxyArray = this.proxyArray || new Array(value.length);
	            if (value.length > proxyArrayLength) {
	                for (var x = proxyArrayLength; x < value.length; x++) {
	                    var child = this.EnsureChild(x.toString());
	                    this.proxyArray[x] = child.Proxy;
	                }
	            }
	            else if (value.length < this.proxyArray.length) {
	                this.proxyArray.splice(value.length);
	            }
	        }
	        else
	            this.proxyArray = null;
	    }
	}
	exports.TreeNode = TreeNode;


/***/ }),
/* 6 */
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
/* 7 */
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
/* 8 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	var ScopeCollector;
	(function (ScopeCollector) {
	    var currentSet = null;
	    function Watch(action) {
	        var parentSet = currentSet;
	        currentSet = new Set();
	        action();
	        var lastSet = currentSet;
	        currentSet = parentSet;
	        return lastSet;
	    }
	    ScopeCollector.Watch = Watch;
	    function Register(emitter) {
	        if (!currentSet)
	            return;
	        if (!currentSet.has(emitter))
	            currentSet.add(emitter);
	    }
	    ScopeCollector.Register = Register;
	})(ScopeCollector = exports.ScopeCollector || (exports.ScopeCollector = {}));


/***/ }),
/* 9 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	var IProxyType;
	(function (IProxyType) {
	    IProxyType[IProxyType["Value"] = 0] = "Value";
	    IProxyType[IProxyType["Object"] = 1] = "Object";
	    IProxyType[IProxyType["Array"] = 2] = "Array";
	})(IProxyType = exports.IProxyType || (exports.IProxyType = {}));
	var IProxy;
	(function (IProxy) {
	    function Type(proxy) {
	        return proxy && proxy.___type || IProxyType.Value;
	    }
	    IProxy.Type = Type;
	    function ValueType(value) {
	        if (!value)
	            return IProxyType.Value;
	        if (Array.isArray(value))
	            return IProxyType.Array;
	        else if (typeof value === 'object')
	            return IProxyType.Object;
	        return IProxyType.Value;
	    }
	    IProxy.ValueType = ValueType;
	    function Create(node, type) {
	        var ret = null;
	        switch (type) {
	            case IProxyType.Array:
	                ret = CreateArrayProxy(node);
	                break;
	            case IProxyType.Object:
	                ret = CreateObjectProxy(node);
	                break;
	            default:
	                throw "Can't create IProxy from Value type";
	        }
	        return ret;
	    }
	    IProxy.Create = Create;
	})(IProxy = exports.IProxy || (exports.IProxy = {}));
	function CreateArrayProxy(node) {
	    return new Proxy([], {
	        get: (obj, prop) => {
	            switch (prop) {
	                case '___type':
	                    return IProxyType.Array;
	                case '___storeProxy':
	                    return true;
	                case '___node':
	                    return node;
	                case 'toJSON':
	                    return () => {
	                        return CreateNodeCopy(node.Self);
	                    };
	                case 'length':
	                    return node.Self.EnsureChild(prop).Proxy;
	                default:
	                    if (typeof (prop) !== 'symbol' && !isNaN(parseInt(prop)))
	                        return node.Self.EnsureChild(prop).Proxy;
	                    var ret = obj[prop];
	                    if (typeof ret === 'function') {
	                        return ret.bind(node.ProxyArray);
	                    }
	                    return ret;
	            }
	        }
	    });
	}
	function CreateObjectProxy(node) {
	    return new Proxy({}, {
	        get: (obj, prop) => {
	            switch (prop) {
	                case '___type':
	                    return IProxyType.Object;
	                case '___storeProxy':
	                    return true;
	                case '___node':
	                    return node;
	                case 'toJSON':
	                    return () => {
	                        return CreateNodeCopy(node.Self);
	                    };
	                default:
	                    if (typeof (prop) !== 'symbol')
	                        return node.Self.EnsureChild(prop).Proxy;
	                    return obj[prop];
	            }
	        }
	    });
	}
	function CreateNodeCopy(node) {
	    var value = node.Value;
	    if (IProxy.ValueType(value) === IProxyType.Value)
	        return value;
	    var ret = null;
	    if (Array.isArray(value))
	        ret = value.map((v, i) => CreateNodeCopy(node.Self.EnsureChild(i.toString()).Self));
	    else {
	        ret = {};
	        for (var key in value) {
	            var child = node.Self.EnsureChild(key);
	            ret[key] = CreateNodeCopy(child.Self);
	        }
	    }
	    return ret;
	}


/***/ }),
/* 10 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class StoreReader {
	    constructor(store) {
	        this.store = store;
	        this.watching = false;
	    }
	    get Root() {
	        var node = this.store.GetNode("root");
	        return node.Proxy;
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
	        return this.store.GetIdNode(id).Proxy;
	    }
	    Destroy() {
	        this.watching = false;
	        this.emitterSet.clear();
	    }
	}
	exports.StoreReader = StoreReader;


/***/ }),
/* 11 */
/***/ (function(module, exports) {

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
	class StoreWriter {
	    constructor(store) {
	        this.store = store;
	    }
	    Write(value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.store.Write(value);
	        });
	    }
	    Update(readOnly, value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var path = readOnly && readOnly.___node.Path;
	            if (!path)
	                return;
	            yield this.store.WritePath(path, value);
	        });
	    }
	    Merge(readOnly, value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var path = readOnly && readOnly.___node.Path;
	            if (!path)
	                return;
	            var keys = Object.keys(value);
	            var writes = keys.map(key => [[path, key].join("."), value[key]]);
	            yield this.store.WritePaths(writes);
	        });
	    }
	    Push(readOnly, newValue) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var node = readOnly.___node;
	            var lengthNode = node.EnsureChild('length');
	            var length = lengthNode.Value;
	            var childPath = [node.Path, length].join(".");
	            yield this.store.WritePath(childPath, newValue);
	            this.store.EmitSet(node.Path);
	        });
	    }
	    Splice(readOnly, start, deleteCount, ...items) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var node = readOnly.___node;
	            var array = node.Proxy.toJSON();
	            var ret = array.splice(start, deleteCount, ...items);
	            yield this.Update(node.Proxy, array);
	            return ret;
	        });
	    }
	}
	exports.StoreWriter = StoreWriter;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const deferredPromise_1 = __webpack_require__(13);
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
/* 13 */
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
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(6);
	const scopeCollector_1 = __webpack_require__(8);
	class Scope extends emitter_1.default {
	    constructor(getFunction) {
	        super();
	        if (typeof getFunction === 'function')
	            this.getFunction = getFunction;
	        else
	            this.getFunction = () => getFunction;
	        this.emitters = new Set();
	        this.setCallback = this.SetCallback.bind(this);
	        this.dirty = true;
	    }
	    get Value() {
	        scopeCollector_1.ScopeCollector.Register(this);
	        if (this.dirty) {
	            this.dirty = false;
	            var emitters = scopeCollector_1.ScopeCollector.Watch(() => this.value = this.getFunction());
	            this.UpdateEmitters(emitters);
	        }
	        return this.value;
	    }
	    get HasValue() {
	        return typeof this.value !== 'undefined';
	    }
	    Scope(callback) {
	        return new Scope(() => callback(this.Value));
	    }
	    Watch(callback) {
	        this.addListener("set", () => callback(this.Value));
	        callback(this.Value);
	    }
	    Destroy() {
	        this.emitters.forEach(e => this.RemoveListenersFrom(e));
	        this.emitters.clear();
	        this.removeAllListeners();
	    }
	    UpdateEmitters(newEmitters) {
	        newEmitters.forEach(e => {
	            if (!this.emitters.delete(e))
	                this.AddListenersTo(e);
	        });
	        this.emitters.forEach(e => this.RemoveListenersFrom(e));
	        this.emitters = newEmitters;
	    }
	    SetCallback() {
	        this.dirty = true;
	        this.emit("set");
	    }
	    AddListenersTo(emitter) {
	        emitter.addListener("set", this.setCallback);
	    }
	    RemoveListenersFrom(emitter) {
	        emitter.removeListener("set", this.setCallback);
	    }
	}
	exports.Scope = Scope;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const workerQueue_1 = __webpack_require__(16);
	const storeWorker_1 = __webpack_require__(17);
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
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const promiseQueue_1 = __webpack_require__(12);
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
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(18);
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
/* 18 */
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
	            if (oldValue === undefined)
	                return;
	            var newIsObject = !IsValue(newValue);
	            var oldIsObject = !IsValue(oldValue);
	            if (!newIsObject && !oldIsObject && newValue !== oldValue) {
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
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const storeBase_1 = __webpack_require__(2);
	const diffSync_1 = __webpack_require__(20);
	class StoreSync extends storeBase_1.StoreBase {
	    constructor(init, idFunction) {
	        super(idFunction, init, new diffSync_1.DiffSync());
	    }
	}
	exports.StoreSync = StoreSync;


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const objectDiff_1 = __webpack_require__(18);
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
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const nodeConfig_1 = __webpack_require__(22);
	const injector_1 = __webpack_require__(25);
	class NodeRef {
	    get Node() {
	        return this.node;
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
	        nodeRef.parent = this;
	        this.childNodes.add(nodeRef);
	        nodeConfig_1.NodeConfig.addChild(this.Node, nodeRef.Node);
	    }
	    AddChildAfter(currentChild, newChild) {
	        if (currentChild && !this.childNodes.has(currentChild))
	            throw "currentChild is not valid";
	        newChild.parent = this;
	        this.childNodes.add(newChild);
	        nodeConfig_1.NodeConfig.addChildAfter(this.Node, currentChild && currentChild.Node, newChild.Node);
	    }
	    DetachChild(nodeRef) {
	        if (this.childNodes.has(nodeRef)) {
	            this.childNodes.delete(nodeRef);
	            nodeConfig_1.NodeConfig.removeChild(this.Node, nodeRef.Node);
	            nodeRef.parent = null;
	        }
	    }
	    Init() {
	    }
	    Detach() {
	        if (this.parent)
	            this.parent.DetachChild(this);
	    }
	    Destroy() {
	        this.DestroyChildren();
	    }
	    DestroyChildren() {
	        this.childNodes.forEach(node => node.Destroy());
	    }
	}
	exports.NodeRef = NodeRef;


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const domNodeConfig_1 = __webpack_require__(23);
	exports.NodeConfig = domNodeConfig_1.DOMNodeConfig;


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const window_1 = __webpack_require__(24);
	var pendingUpdates = new Array(5000);
	var updateScheduled = false;
	var updateIndex = 0;
	var updateTotal = 0;
	function processUpdates() {
	    var start = Date.now();
	    while (updateIndex < updateTotal && (Date.now() - start) < 66) {
	        pendingUpdates[updateIndex]();
	        updateIndex++;
	    }
	    if (updateIndex === updateTotal) {
	        updateIndex = 0;
	        updateTotal = 0;
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
	        pendingUpdates[updateTotal] = callback;
	        updateTotal++;
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
	            if (target.nodeName !== "INPUT")
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
/* 24 */
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
/* 25 */
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
	    var scope = null;
	    function Current() {
	        return scope;
	    }
	    Injector.Current = Current;
	    function Scope(injector, action) {
	        var parent = Current();
	        scope = injector;
	        action();
	        scope = parent;
	    }
	    Injector.Scope = Scope;
	})(Injector = exports.Injector || (exports.Injector = {}));


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const scope_1 = __webpack_require__(14);
	const nodeRef_1 = __webpack_require__(21);
	const componentNode_1 = __webpack_require__(27);
	const decorators_1 = __webpack_require__(29);
	class Component {
	    constructor(data, templates, nodeRef, injector) {
	        this.templates = templates;
	        this.nodeRef = nodeRef;
	        this.injector = injector;
	        this.scope = new scope_1.Scope(data);
	    }
	    get Injector() {
	        return this.injector;
	    }
	    get Scope() {
	        return this.scope;
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
	        decorators_1.Destroy.All(this);
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
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const boundNode_1 = __webpack_require__(28);
	const nodeConfig_1 = __webpack_require__(22);
	const injector_1 = __webpack_require__(25);
	const decorators_1 = __webpack_require__(29);
	class ComponentNode extends boundNode_1.BoundNode {
	    constructor(nodeDef, constructor, templates) {
	        super(nodeDef);
	        this.component = new constructor(nodeDef.data || nodeDef.static, templates, this, this.Injector);
	    }
	    SetEvents() {
	        this.componentEvents = this.eventsScope.Value;
	    }
	    Fire(event, data) {
	        var eventCallback = this.componentEvents && this.componentEvents[event];
	        eventCallback && eventCallback(data);
	    }
	    Init() {
	        super.Init();
	        this.SetChildren();
	    }
	    Destroy() {
	        super.Destroy();
	        this.component.Destroy();
	    }
	    SetChildren() {
	        if (decorators_1.PreReq.Has(this.component)) {
	            var preNodes = null;
	            injector_1.Injector.Scope(this.Injector, () => preNodes = decorators_1.PreReqTemplate.Get(this.component));
	            preNodes.forEach(node => {
	                this.AddChild(node);
	            });
	            decorators_1.PreReq.All(this.component).then(() => {
	                nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	                    preNodes.forEach(node => {
	                        node.Detach();
	                        node.Destroy();
	                    });
	                    this.AddTemplate();
	                });
	            });
	        }
	        else
	            this.AddTemplate();
	    }
	    AddTemplate() {
	        var nodes = null;
	        injector_1.Injector.Scope(this.Injector, () => {
	            var parentVal = boundNode_1.BoundNode.Immediate;
	            boundNode_1.BoundNode.Immediate = this.Immediate;
	            nodes = this.component.Template();
	            boundNode_1.BoundNode.Immediate = parentVal;
	        });
	        if (!Array.isArray(nodes))
	            nodes = [nodes];
	        nodes.forEach(node => {
	            this.AddChild(node);
	        });
	        setTimeout(() => this.component.Bound(), 0);
	    }
	}
	exports.ComponentNode = ComponentNode;
	(function (ComponentNode) {
	    function ToFunction(type, namespace, constructor) {
	        return (nodeDef, templates) => {
	            var def = {
	                type: type,
	                namespace: namespace,
	                immediate: nodeDef.immediate,
	                props: nodeDef.props,
	                attrs: nodeDef.attrs,
	                on: nodeDef.on,
	                static: nodeDef.static,
	                data: nodeDef.data,
	            };
	            var comp = new ComponentNode(def, constructor, templates);
	            comp.Init();
	            return comp;
	        };
	    }
	    ComponentNode.ToFunction = ToFunction;
	})(ComponentNode = exports.ComponentNode || (exports.ComponentNode = {}));


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const nodeConfig_1 = __webpack_require__(22);
	const scope_1 = __webpack_require__(14);
	const nodeRef_1 = __webpack_require__(21);
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
	        this.nodeDef = nodeDef;
	        this.immediate = nodeDef.immediate !== undefined ? nodeDef.immediate : BoundNode.Immediate;
	    }
	    get Immediate() {
	        return this.immediate;
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
	    Init() {
	        super.Init();
	        if (this.nodeDef.text) {
	            this.textScope = new scope_1.Scope(this.nodeDef.text);
	            this.textScope.addListener("set", this.nodeDef.immediate ? this.SetText.bind(this) : this.ScheduleSetText.bind(this));
	            this.SetText();
	        }
	        if (this.nodeDef.props) {
	            this.propertiesScope = new scope_1.Scope(this.nodeDef.props);
	            this.propertiesScope.addListener("set", this.nodeDef.immediate ? this.SetProperties.bind(this) : this.ScheduleSetProperties.bind(this));
	            this.SetProperties();
	        }
	        if (this.nodeDef.attrs) {
	            this.attributesScope = new scope_1.Scope(this.nodeDef.attrs);
	            this.attributesScope.addListener("set", this.nodeDef.immediate ? this.SetAttributes.bind(this) : this.ScheduleSetAttributes.bind(this));
	            this.SetAttributes();
	        }
	        if (this.nodeDef.on) {
	            this.eventsScope = new scope_1.Scope(this.nodeDef.on);
	            this.eventsScope.addListener("set", this.nodeDef.immediate ? this.SetEvents.bind(this) : this.ScheduleSetEvents.bind(this));
	            this.SetEvents();
	        }
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
	            if (val && typeof val === 'object') {
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
	(function (BoundNode) {
	    BoundNode.Immediate = false;
	})(BoundNode = exports.BoundNode || (exports.BoundNode = {}));


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const storeSync_1 = __webpack_require__(19);
	const scope_1 = __webpack_require__(14);
	function Store() {
	    return StoreDecorator;
	}
	exports.Store = Store;
	function StoreDecorator(target, propertyKey) {
	    DestroyDecorator(target, `StoreDecorator_${propertyKey}`);
	    return {
	        configurable: false,
	        enumerable: true,
	        get: function () {
	            var store = this[`StoreDecorator_${propertyKey}`];
	            return store ? store.Root.Value : null;
	        },
	        set: function (val) {
	            var store = this[`StoreDecorator_${propertyKey}`];
	            if (!store)
	                this[`StoreDecorator_${propertyKey}`] = new storeSync_1.StoreSync(val);
	            else
	                store.Merge(val);
	        }
	    };
	}
	function Scope() {
	    return ScopeDecorator;
	}
	exports.Scope = Scope;
	function ScopeDecorator(target, propertyKey, descriptor) {
	    if (!(descriptor && descriptor.get))
	        throw "Scope decorator requires a getter";
	    if (descriptor && descriptor.set)
	        throw "Scope decorator does not support setters";
	    DestroyDecorator(target, `ScopeDecorator_${propertyKey}`);
	    return {
	        configurable: false,
	        enumerable: true,
	        get: function () {
	            var scope = this[`ScopeDecorator_${propertyKey}`];
	            if (!scope)
	                scope = this[`ScopeDecorator_${propertyKey}`] = new scope_1.Scope(descriptor.get.bind(this));
	            return scope.Value;
	        }
	    };
	}
	function Inject(type) {
	    return InjectorDecorator.bind(null, type);
	}
	exports.Inject = Inject;
	function InjectorDecorator(type, target, propertyKey, descriptor) {
	    var parentGet = descriptor && descriptor.get;
	    var parentSet = descriptor && descriptor.set;
	    return {
	        configurable: false,
	        enumerable: true,
	        get: function () {
	            parentGet && parentGet.apply(this);
	            return this.Injector.Get(type);
	        },
	        set: function (val) {
	            parentSet && parentSet.apply(this, [val]);
	            this.Injector.Set(type, val);
	        }
	    };
	}
	function Destroy() {
	    return DestroyDecorator;
	}
	exports.Destroy = Destroy;
	(function (Destroy) {
	    function Get(value) {
	        return value && value.DestroyDecorator_Destroys || [];
	    }
	    function All(value) {
	        var arr = Get(value);
	        arr.map(prop => value[prop])
	            .filter(o => !!o)
	            .forEach(o => o.Destroy());
	    }
	    Destroy.All = All;
	})(Destroy = exports.Destroy || (exports.Destroy = {}));
	function DestroyDecorator(target, propertyKey) {
	    var proto = target;
	    proto.DestroyDecorator_Destroys = proto.DestroyDecorator_Destroys || [];
	    proto.DestroyDecorator_Destroys.push(propertyKey);
	}
	function PreReqTemplate(template) {
	    return PreReqTemplateDecorator.bind(null, template);
	}
	exports.PreReqTemplate = PreReqTemplate;
	(function (PreReqTemplate) {
	    function Get(value) {
	        var func = value && value.PreReqTemplateDecorator_Template;
	        var ret = func ? func() : [];
	        if (!Array.isArray(ret))
	            ret = [ret];
	        return ret;
	    }
	    PreReqTemplate.Get = Get;
	})(PreReqTemplate = exports.PreReqTemplate || (exports.PreReqTemplate = {}));
	function PreReqTemplateDecorator(template, target) {
	    var proto = target.prototype;
	    proto.PreReqTemplateDecorator_Template = template;
	}
	function PreReq() {
	    return PreReqDecorator;
	}
	exports.PreReq = PreReq;
	(function (PreReq) {
	    function Get(value) {
	        return value && value.PreReqDecorator_PreReqs || [];
	    }
	    function All(value) {
	        var arr = Get(value).map((prop) => (value[prop] && value[prop].Init) || Promise.resolve());
	        return Promise.all(arr);
	    }
	    PreReq.All = All;
	    function Has(value) {
	        return Get(value).length > 0;
	    }
	    PreReq.Has = Has;
	})(PreReq = exports.PreReq || (exports.PreReq = {}));
	function PreReqDecorator(target, propertyKey) {
	    var proto = target;
	    proto.PreReqDecorator_PreReqs = proto.PreReqDecorator_PreReqs || [];
	    proto.PreReqDecorator_PreReqs.push(propertyKey);
	}


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const elementNode_1 = __webpack_require__(31);
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
	    nodeDef.immediate = true;
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
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const boundNode_1 = __webpack_require__(28);
	const scope_1 = __webpack_require__(14);
	const nodeConfig_1 = __webpack_require__(22);
	const injector_1 = __webpack_require__(25);
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
	            var keyInit = value.map((v, i) => [this.keyFunc && this.keyFunc(v) || i.toString(), v]);
	            return new Map(keyInit);
	        });
	        this.keyDataScope.addListener("set", () => this.ScheduleSetData());
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
	                injector_1.Injector.Scope(this.Injector, () => {
	                    var parentVal = boundNode_1.BoundNode.Immediate;
	                    boundNode_1.BoundNode.Immediate = this.Immediate;
	                    nodes = this.childrenFunc(value, index);
	                    boundNode_1.BoundNode.Immediate = parentVal;
	                });
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
	            value.forEach(v => {
	                v.Detach();
	                v.Destroy();
	            });
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
	    Init() {
	        super.Init();
	        if (this.Immediate) {
	            this.SetData();
	        }
	        else {
	            this.ScheduleSetData();
	        }
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
	            immediate: nodeDef.immediate,
	            text: nodeDef.text,
	            props: nodeDef.props,
	            attrs: nodeDef.attrs,
	            on: nodeDef.on,
	            static: nodeDef.static,
	            data: nodeDef.data,
	            key: nodeDef.key,
	            children: children
	        };
	        var elem = new ElementNode(def);
	        elem.Init();
	        return elem;
	    }
	    ElementNode.Create = Create;
	})(ElementNode = exports.ElementNode || (exports.ElementNode = {}));


/***/ })
/******/ ]);