/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const Web = __webpack_require__(1);
	for (var key in Web)
	    window[key] = Web[key];


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	function __export(m) {
	    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	__export(__webpack_require__(2));
	__export(__webpack_require__(29));
	var Store_1 = __webpack_require__(14);
	exports.ObservableScope = Store_1.ObservableScope;
	exports.Store = Store_1.Store;
	exports.StoreAsync = Store_1.StoreAsync;
	__export(__webpack_require__(31));


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const nodeRef_1 = __webpack_require__(3);
	exports.NodeRef = nodeRef_1.NodeRef;
	const component_1 = __webpack_require__(9);
	exports.Component = component_1.Component;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const nodeConfig_1 = __webpack_require__(4);
	class NodeRef {
	    constructor(node) {
	        this.node = node;
	        this.destroyed = false;
	        this.childNodes = new Set();
	    }
	    get Destroyed() {
	        return this.destroyed;
	    }
	    get Node() {
	        return this.node;
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
	        this.destroyed = true;
	        this.DestroyChildren();
	    }
	    DestroyChildren() {
	        this.childNodes.forEach(node => node.Destroy());
	    }
	}
	exports.NodeRef = NodeRef;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const domNodeConfig_1 = __webpack_require__(5);
	exports.NodeConfig = domNodeConfig_1.DOMNodeConfig;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const window_1 = __webpack_require__(6);
	const list_1 = __webpack_require__(7);
	const utils_1 = __webpack_require__(8);
	var priorityUpdates = new list_1.List();
	var pendingUpdates = new list_1.List();
	var updateScheduled = false;
	function processUpdates() {
	    var start = Date.now();
	    var callback = priorityUpdates.Pop() || pendingUpdates.Pop();
	    callback && callback();
	    while (callback && (Date.now() - start) < 66) {
	        callback = priorityUpdates.Pop() || pendingUpdates.Pop();
	        callback && callback();
	    }
	    if (pendingUpdates.Size > 0)
	        window_1.wndw.requestAnimationFrame(processUpdates);
	    else
	        updateScheduled = false;
	}
	exports.DOMNodeConfig = {
	    createNode: function (type, namespace) {
	        if (namespace)
	            return window_1.wndw.document.createElementNS(namespace, type);
	        return type === "text" ? window_1.wndw.document.createTextNode("") : window_1.wndw.document.createElement(type);
	    },
	    scheduleUpdate: function (callback, highPriority = false) {
	        if (highPriority)
	            priorityUpdates.Add(callback);
	        else
	            pendingUpdates.Add(callback);
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
	        ["value"]: utils_1.SetInputValue
	    }
	};


/***/ }),
/* 6 */
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
/* 7 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class List {
	    constructor() {
	        this.head = null;
	        this.tail = null;
	        this.size = 0;
	    }
	    get Head() {
	        return this.head && this.head.data;
	    }
	    get Tail() {
	        return this.tail && this.tail.data;
	    }
	    get Size() {
	        return this.size;
	    }
	    Clear() {
	        this.head = null;
	        this.tail = null;
	        this.size = 0;
	    }
	    Push(data) {
	        var node = { previous: null, next: null, data: data };
	        if (this.size === 0) {
	            this.head = node;
	            this.tail = node;
	            this.size = 1;
	        }
	        else {
	            node.next = this.head;
	            this.head.previous = node;
	            this.head = node;
	            this.size++;
	        }
	    }
	    Pop() {
	        if (this.size === 0)
	            return null;
	        var node = this.head;
	        this.head = node.next;
	        if (this.head)
	            this.head.previous = null;
	        this.size--;
	        if (this.size === 0)
	            this.tail = null;
	        return node.data;
	    }
	    Add(data) {
	        var node = { previous: null, next: null, data: data };
	        if (this.size === 0) {
	            this.head = node;
	            this.tail = node;
	            this.size = 1;
	        }
	        else {
	            node.previous = this.tail;
	            this.tail.next = node;
	            this.tail = node;
	            this.size++;
	        }
	    }
	    Remove() {
	        if (this.size === 0)
	            return null;
	        var node = this.tail;
	        this.tail = node.previous;
	        if (this.tail)
	            this.tail.next = null;
	        this.size--;
	        if (this.size === 0)
	            this.head = null;
	        return node.data;
	    }
	    ForEach(callback) {
	        var node = this.head;
	        while (node) {
	            callback(node.data);
	            node = node.next;
	        }
	    }
	}
	exports.List = List;


/***/ }),
/* 8 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	function SetInputValue(target, value) {
	    if (target.nodeName !== "INPUT")
	        target.value = value;
	    else {
	        var start = target.selectionStart;
	        var end = target.selectionEnd;
	        target.value = value;
	        target.setSelectionRange(start, end);
	    }
	}
	exports.SetInputValue = SetInputValue;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const observableScope_1 = __webpack_require__(10);
	const nodeRef_1 = __webpack_require__(3);
	const componentNode_1 = __webpack_require__(12);
	const decorators_1 = __webpack_require__(28);
	class Component {
	    constructor(data, templates, nodeRef, injector) {
	        this.nodeRef = nodeRef;
	        this.injector = injector;
	        this.scope = new observableScope_1.ObservableScope(data);
	        this.templates = templates || {};
	    }
	    get Injector() {
	        return this.injector;
	    }
	    get Destroyed() {
	        return this.nodeRef.Destroyed;
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
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(11);
	class ObservableScope {
	    constructor(getFunction) {
	        this.emitter = new emitter_1.Emitter();
	        this.emitters = new Set();
	        this.setCallback = this.SetCallback.bind(this);
	        if (typeof getFunction === 'function') {
	            this.getFunction = getFunction;
	            this.dirty = true;
	        }
	        else {
	            this.value = getFunction;
	            this.dirty = false;
	        }
	    }
	    get Emitter() {
	        return this.emitter;
	    }
	    get Value() {
	        ObservableScope.Register(this.emitter);
	        this.UpdateValue();
	        return this.value;
	    }
	    Scope(callback) {
	        return new ObservableScope(() => callback(this.Value));
	    }
	    Watch(callback) {
	        this.emitter.On("set", () => callback(this));
	    }
	    Destroy() {
	        this.emitters.forEach(e => this.RemoveListenersFrom(e));
	        this.emitters.clear();
	        this.emitter.Clear();
	    }
	    UpdateValue() {
	        if (!this.dirty)
	            return;
	        this.dirty = false;
	        var emitters = ObservableScope.Watch(() => this.value = this.getFunction());
	        this.UpdateEmitters(emitters);
	    }
	    UpdateEmitters(newEmitters) {
	        newEmitters.forEach(e => {
	            this.emitters.delete(e);
	            this.AddListenersTo(e);
	        });
	        this.emitters.forEach(e => this.RemoveListenersFrom(e));
	        this.emitters = newEmitters;
	    }
	    SetCallback() {
	        if (this.dirty)
	            return;
	        this.dirty = true;
	        this.emitter.Emit("set");
	    }
	    AddListenersTo(emitter) {
	        emitter.On("set", this.setCallback);
	    }
	    RemoveListenersFrom(emitter) {
	        emitter.Remove("set", this.setCallback);
	    }
	}
	exports.ObservableScope = ObservableScope;
	(function (ObservableScope) {
	    var currentSet = null;
	    function Watch(action) {
	        var parentSet = currentSet;
	        currentSet = new Set();
	        action();
	        var lastSet = currentSet;
	        currentSet = parentSet;
	        return lastSet;
	    }
	    ObservableScope.Watch = Watch;
	    function Register(emitter) {
	        if (!currentSet)
	            return;
	        currentSet.add(emitter);
	    }
	    ObservableScope.Register = Register;
	})(ObservableScope = exports.ObservableScope || (exports.ObservableScope = {}));


/***/ }),
/* 11 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	class Emitter {
	    constructor() {
	        this.events = new Map();
	    }
	    On(event, callback) {
	        var callbacks = this.events.get(event);
	        if (!callbacks) {
	            callbacks = new Set();
	            this.events.set(event, callbacks);
	        }
	        callbacks.add(callback);
	    }
	    Emit(event) {
	        var callbacks = this.events.get(event);
	        if (callbacks)
	            callbacks.forEach(cb => cb());
	    }
	    Remove(event, callback) {
	        var callbacks = this.events.get(event);
	        if (callbacks)
	            callbacks.delete(callback);
	    }
	    Clear() {
	        this.events.clear();
	    }
	}
	exports.Emitter = Emitter;
	exports.default = Emitter;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const boundNode_1 = __webpack_require__(13);
	const nodeConfig_1 = __webpack_require__(4);
	const injector_1 = __webpack_require__(27);
	const decorators_1 = __webpack_require__(28);
	class ComponentNode extends boundNode_1.BoundNode {
	    constructor(nodeDef, constructor, templates) {
	        super(nodeDef);
	        this.injector = new injector_1.Injector();
	        this.component = new constructor(nodeDef.data || nodeDef.static, templates, this, this.injector);
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
	            injector_1.Injector.Scope(this.injector, () => preNodes = decorators_1.PreReqTemplate.Get(this.component));
	            preNodes.forEach(node => {
	                this.AddChild(node);
	            });
	            decorators_1.PreReq.All(this.component).then(() => {
	                nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	                    if (this.Destroyed)
	                        return;
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
	        injector_1.Injector.Scope(this.injector, () => {
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
	                data: nodeDef.data
	            };
	            var comp = new ComponentNode(def, constructor, templates);
	            comp.Init();
	            return comp;
	        };
	    }
	    ComponentNode.ToFunction = ToFunction;
	})(ComponentNode = exports.ComponentNode || (exports.ComponentNode = {}));


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const nodeConfig_1 = __webpack_require__(4);
	const Store_1 = __webpack_require__(14);
	const nodeRef_1 = __webpack_require__(3);
	function defaultChildren() {
	    return [];
	}
	exports.defaultChildren = defaultChildren;
	class BoundNode extends nodeRef_1.NodeRef {
	    constructor(nodeDef) {
	        super(nodeConfig_1.NodeConfig.createNode(nodeDef.type, nodeDef.namespace));
	        this.setProperties = false;
	        this.setAttributes = false;
	        this.setEvents = false;
	        this.nodeDef = nodeDef;
	        this.immediate = nodeDef.immediate !== undefined ? nodeDef.immediate : BoundNode.Immediate;
	    }
	    get Immediate() {
	        return this.immediate;
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
	        if (this.Destroyed)
	            return;
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
	        if (this.Destroyed)
	            return;
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
	    SetEvents() {
	        if (this.Destroyed)
	            return;
	        for (var key in this.lastEvents)
	            nodeConfig_1.NodeConfig.removeListener(this.Node, key, this.lastEvents[key]);
	        var events = this.eventsScope.Value;
	        for (var key in events)
	            nodeConfig_1.NodeConfig.addListener(this.Node, key, events[key]);
	        this.lastEvents = events;
	    }
	    Init() {
	        super.Init();
	        if (this.nodeDef.props) {
	            this.propertiesScope = new Store_1.ObservableScope(this.nodeDef.props);
	            this.propertiesScope.Watch(this.nodeDef.immediate ? this.SetProperties.bind(this) : this.ScheduleSetProperties.bind(this));
	            this.SetProperties();
	        }
	        if (this.nodeDef.attrs) {
	            this.attributesScope = new Store_1.ObservableScope(this.nodeDef.attrs);
	            this.attributesScope.Watch(this.nodeDef.immediate ? this.SetAttributes.bind(this) : this.ScheduleSetAttributes.bind(this));
	            this.SetAttributes();
	        }
	        if (this.nodeDef.on) {
	            this.eventsScope = new Store_1.ObservableScope(this.nodeDef.on);
	            this.eventsScope.Watch(this.nodeDef.immediate ? this.SetEvents.bind(this) : this.ScheduleSetEvents.bind(this));
	            this.SetEvents();
	        }
	    }
	    Destroy() {
	        super.Destroy();
	        this.attributesScope && this.attributesScope.Destroy();
	        this.propertiesScope && this.propertiesScope.Destroy();
	        this.eventsScope && this.eventsScope.Destroy();
	    }
	    SetPropertiesRecursive(target, lastValue, source, path = "") {
	        if (typeof source !== "object")
	            throw "Property binding must resolve to an object";
	        for (var key in source) {
	            var currentPath = path + key;
	            var val = source[key];
	            if (val && typeof val === 'object') {
	                if (!target[key])
	                    target[key] = {};
	                this.SetPropertiesRecursive(target[key], lastValue && lastValue[key], val, currentPath + ".");
	            }
	            else if (!lastValue || lastValue[key] !== val) {
	                if (nodeConfig_1.NodeConfig.setPropertyOverrides[currentPath])
	                    nodeConfig_1.NodeConfig.setPropertyOverrides[currentPath](target, val);
	                else
	                    target[key] = val;
	            }
	        }
	    }
	}
	exports.BoundNode = BoundNode;
	(function (BoundNode) {
	    BoundNode.Immediate = false;
	    function Create(type, namespace, nodeDef) {
	        var def = {
	            type: type,
	            namespace: namespace,
	            immediate: nodeDef.immediate,
	            props: nodeDef.props,
	            attrs: nodeDef.attrs,
	            on: nodeDef.on
	        };
	        var elem = new BoundNode(def);
	        elem.Init();
	        return elem;
	    }
	    BoundNode.Create = Create;
	})(BoundNode = exports.BoundNode || (exports.BoundNode = {}));


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	var store_1 = __webpack_require__(15);
	exports.Store = store_1.Store;
	var storeAsync_1 = __webpack_require__(20);
	exports.StoreAsync = storeAsync_1.StoreAsync;
	var observableScope_1 = __webpack_require__(10);
	exports.ObservableScope = observableScope_1.ObservableScope;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const observableTree_1 = __webpack_require__(16);
	const StoreWriter_1 = __webpack_require__(19);
	class Store {
	    constructor(init) {
	        this.observableTree = new observableTree_1.ObservableTree();
	        this.storeWriter = new StoreWriter_1.StoreWriter(this.observableTree);
	        this.rootScope = this.observableTree.Scope("ROOT", root => root);
	        if (init)
	            this.Write(init);
	    }
	    get Root() {
	        return this.rootScope;
	    }
	    Action(action) {
	        var node = this.observableTree.GetNode("ROOT");
	        action(node.Proxy, this.storeWriter);
	    }
	    Write(data) {
	        this.Action((root, writer) => writer.Write(root, data));
	    }
	    Merge(data) {
	        this.Action((root, writer) => writer.Merge(root, data));
	    }
	    Destroy() {
	        this.rootScope.Destroy();
	        this.observableTree.Destroy();
	    }
	}
	exports.Store = Store;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const observableNode_1 = __webpack_require__(17);
	const observableProxy_1 = __webpack_require__(18);
	const observableScope_1 = __webpack_require__(10);
	class ObservableTree {
	    constructor(valuePathResolver) {
	        this.valuePathResolver = valuePathResolver;
	        this.rootStateMap = new Map();
	        this.rootNodeMap = new Map();
	    }
	    Write(path, value) {
	        this.WritePath(path, value);
	        this.UpdatePathNode(path);
	    }
	    WriteAll(data) {
	        for (var x = 0; x < data.length; x++)
	            this.WritePath(data[x].path, data[x].value);
	        for (var y = 0; y < data.length; y++)
	            this.UpdatePathNode(data[y].path);
	    }
	    Get(path) {
	        return path.split(".").reduce((pre, curr, index) => {
	            if (index === 0)
	                return this.rootStateMap.get(curr);
	            return pre && pre[curr];
	        }, null);
	    }
	    GetNode(path) {
	        return path.split(".").reduce((pre, curr, index) => {
	            if (index === 0) {
	                var ret = this.rootNodeMap.get(curr);
	                if (!ret) {
	                    ret = new observableNode_1.ObservableNode(this, curr, null, this.valuePathResolver);
	                    this.rootNodeMap.set(curr, ret);
	                }
	                return ret;
	            }
	            return pre.EnsureChild(curr);
	        }, null);
	    }
	    Delete(path) {
	        var node = this.GetNode(path);
	        node.Destroy();
	    }
	    Destroy() {
	        this.rootStateMap.clear();
	        this.rootNodeMap.forEach(node => node.Destroy());
	        this.rootNodeMap.clear();
	    }
	    Scope(path, func) {
	        return new observableScope_1.ObservableScope(() => {
	            var node = this.GetNode(path);
	            return func(node.Proxy);
	        });
	    }
	    WritePath(path, value) {
	        var pathParts = path.split(".");
	        var rootPart = pathParts[0];
	        if (pathParts.length === 1)
	            this.rootStateMap.set(rootPart, value);
	        else {
	            var curValue = this.rootStateMap.get(rootPart);
	            for (var x = 1; x < pathParts.length - 1; x++) {
	                if (!curValue)
	                    throw new Error("Unable to write path: " + path + ". Falsey value found at: " + pathParts.slice(0, x).join("."));
	                curValue = curValue[pathParts[x]];
	            }
	            if (!curValue)
	                throw new Error("Unable to write path: " + path + ". Falsey value found at: " + pathParts.slice(0, x).join("."));
	            curValue[pathParts[x]] = value;
	        }
	    }
	    UpdatePathNode(path) {
	        var node = this.GetNode(path);
	        if (node) {
	            node.Update();
	            if (node.Parent && node.Parent.Type === observableProxy_1.Type.Array)
	                node.Parent.EmitSet();
	        }
	    }
	}
	exports.ObservableTree = ObservableTree;


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const emitter_1 = __webpack_require__(11);
	const observableProxy_1 = __webpack_require__(18);
	const observableScope_1 = __webpack_require__(10);
	class ObservableNode {
	    constructor(tree, key, parent, valuePathResolver) {
	        this.tree = tree;
	        this.key = key;
	        this.parent = parent;
	        this.valuePathResolver = valuePathResolver;
	        this.children = new Map();
	        this.emitter = new emitter_1.Emitter();
	        this.path = undefined;
	        this.value = undefined;
	        this.type = undefined;
	        this.oldType = undefined;
	        this.self = undefined;
	        this.proxy = undefined;
	        this.nodeArray = undefined;
	    }
	    get Path() {
	        if (this.path === undefined)
	            this.path = (this.parent ? this.parent.Path + "." : "") + this.key;
	        return this.path;
	    }
	    get Value() {
	        if (this.value === undefined)
	            this.value = this.tree.Get(this.Path);
	        return this.value;
	    }
	    get Type() {
	        if (this.type === undefined)
	            this.type = observableProxy_1.ObservableProxy.TypeOf(this.Value);
	        return this.type;
	    }
	    get Self() {
	        var resolvedPath;
	        if (this.self === undefined &&
	            this.Type === observableProxy_1.Type.Value &&
	            this.valuePathResolver &&
	            typeof this.Value === 'string' &&
	            (resolvedPath = this.valuePathResolver(this.Value)))
	            this.self = this.tree.GetNode(resolvedPath);
	        else if (this.self === undefined)
	            this.self = this;
	        return this.self;
	    }
	    get Proxy() {
	        observableScope_1.ObservableScope.Register(this.emitter);
	        if (this.oldType !== undefined) {
	            if (this.oldType !== this.Type)
	                this.proxy = undefined;
	            this.oldType = undefined;
	        }
	        if (this.proxy)
	            return this.proxy;
	        if (this.Self !== this)
	            return this.Self.Proxy;
	        if (this.Type === observableProxy_1.Type.Value)
	            return this.Value;
	        this.proxy = observableProxy_1.ObservableProxy.CreateFrom(this, this.Type);
	        return this.proxy;
	    }
	    get NodeArray() {
	        this.UpdateNodeArray(true);
	        return this.nodeArray;
	    }
	    get Parent() {
	        return this.parent;
	    }
	    get Children() {
	        return this.children;
	    }
	    EnsureChild(key) {
	        var child = this.children.get(key);
	        if (!child) {
	            child = new ObservableNode(this.tree, key, this, this.valuePathResolver);
	            this.children.set(key, child);
	        }
	        return child;
	    }
	    Update() {
	        if (this.oldType === undefined)
	            this.oldType = this.Type;
	        this.path = undefined;
	        this.value = undefined;
	        this.type = undefined;
	        this.self = undefined;
	        this.EmitSet();
	        this.children.forEach(node => node.Update());
	    }
	    EmitSet() {
	        this.emitter.Emit("set");
	    }
	    Destroy() {
	        this.parent && this.parent.Children.delete(this.key);
	        this.emitter.Clear();
	        this.children.forEach(c => c.Destroy());
	    }
	    UpdateNodeArray(force) {
	        if (this.Type === observableProxy_1.Type.Array && (this.nodeArray || force)) {
	            var nodeArrayLength = this.nodeArray ? this.nodeArray.length : 0;
	            var array = this.Value;
	            this.nodeArray = this.nodeArray || new Array(array.length);
	            if (array.length > nodeArrayLength) {
	                for (var x = nodeArrayLength; x < array.length; x++)
	                    this.nodeArray[x] = this.EnsureChild(x.toString());
	            }
	            else if (array.length < nodeArrayLength)
	                this.nodeArray.splice(array.length);
	        }
	        else
	            this.nodeArray = null;
	    }
	}
	exports.ObservableNode = ObservableNode;


/***/ }),
/* 18 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	var Type;
	(function (Type) {
	    Type[Type["Value"] = 0] = "Value";
	    Type[Type["Object"] = 1] = "Object";
	    Type[Type["Array"] = 2] = "Array";
	})(Type = exports.Type || (exports.Type = {}));
	var ObservableProxy;
	(function (ObservableProxy) {
	    function TypeOf(value) {
	        if (!value)
	            return Type.Value;
	        if (Array.isArray(value))
	            return Type.Array;
	        else if (typeof value === 'object')
	            return Type.Object;
	        return Type.Value;
	    }
	    ObservableProxy.TypeOf = TypeOf;
	    function CreateFrom(node, type) {
	        switch (type) {
	            case Type.Array:
	                return CreateArrayProxy(node);
	            case Type.Object:
	                return CreateObjectProxy(node);
	            default:
	                throw new Error("Can't create proxy from Value type");
	        }
	    }
	    ObservableProxy.CreateFrom = CreateFrom;
	    function CopyValue(value) {
	        var type = TypeOf(value);
	        if (type === Type.Value)
	            return value;
	        if (value.___storeProxy)
	            return value.toJSON();
	        if (type === Type.Array)
	            return value.map(v => CopyValue(v));
	        else if (type === Type.Object) {
	            var ret = {};
	            for (var key in value)
	                ret[key] = CopyValue(value[key]);
	            return ret;
	        }
	        return null;
	    }
	    ObservableProxy.CopyValue = CopyValue;
	})(ObservableProxy = exports.ObservableProxy || (exports.ObservableProxy = {}));
	function CreateArrayProxy(node) {
	    return new Proxy([], {
	        get: (obj, prop) => {
	            switch (prop) {
	                case '___type':
	                    return Type.Array;
	                case '___storeProxy':
	                    return true;
	                case '___node':
	                    return node;
	                case 'toJSON':
	                    return () => {
	                        return CopyNode(node);
	                    };
	                case 'length':
	                    return node.EnsureChild(prop).Value;
	                default:
	                    if (typeof (prop) !== 'symbol' && !isNaN(parseInt(prop)))
	                        return node.EnsureChild(prop).Proxy;
	                    var ret = obj[prop];
	                    if (typeof ret === 'function') {
	                        return ret.bind(node.NodeArray.map(n => n.Proxy));
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
	                    return Type.Object;
	                case '___storeProxy':
	                    return true;
	                case '___node':
	                    return node;
	                case 'toJSON':
	                    return () => {
	                        return CopyNode(node);
	                    };
	                default:
	                    if (typeof (prop) !== 'symbol')
	                        return node.EnsureChild(prop).Proxy;
	                    return obj[prop];
	            }
	        }
	    });
	}
	function CopyNode(node) {
	    var value = node.Value;
	    var type = ObservableProxy.TypeOf(value);
	    if (type === Type.Value)
	        return value;
	    var ret = null;
	    if (type === Type.Array)
	        ret = value.map((v, i) => CopyNode(node.Self.EnsureChild(i.toString()).Self));
	    else {
	        ret = {};
	        for (var key in value) {
	            var child = node.Self.EnsureChild(key);
	            ret[key] = CopyNode(child.Self);
	        }
	    }
	    return ret;
	}


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const observableProxy_1 = __webpack_require__(18);
	class StoreWriter {
	    constructor(observableTree) {
	        this.observableTree = observableTree;
	    }
	    Write(source, data) {
	        var proxy = source;
	        var rootPath = proxy && proxy.___node.Path || "ROOT";
	        this.observableTree.Write(rootPath, data);
	    }
	    Merge(source, data) {
	        var proxy = source;
	        var rootPath = proxy.___node.Path;
	        if (observableProxy_1.ObservableProxy.TypeOf(data) === observableProxy_1.Type.Value)
	            this.observableTree.Write(rootPath, data);
	        else
	            for (var key in data)
	                this.observableTree.Write(`${rootPath}.${key}`, data[key]);
	    }
	    Push(source, data) {
	        var array = source;
	        var proxy = source;
	        var rootPath = proxy.___node.Path;
	        var length = array.length;
	        this.observableTree.Write(`${rootPath}.${length}`, data);
	    }
	    Splice(source, start, deleteCount, ...items) {
	        var proxy = source;
	        var rootPath = proxy.___node.Path;
	        var array = this.observableTree.Get(rootPath);
	        array = array.map(val => val);
	        array.splice(start, deleteCount, ...items);
	        this.observableTree.Write(rootPath, array);
	    }
	}
	exports.StoreWriter = StoreWriter;


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
	    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const observableTree_1 = __webpack_require__(16);
	const diffAsync_1 = __webpack_require__(21);
	const StoreAsyncWriter_1 = __webpack_require__(26);
	class StoreAsync {
	    constructor(idFunc, init) {
	        this.idFunc = idFunc;
	        this.diffAsync = new diffAsync_1.DiffAsync(this.idFunc);
	        this.observableTree = new observableTree_1.ObservableTree(diffAsync_1.DiffAsync.ReadKeyRef);
	        this.asyncWriter = new StoreAsyncWriter_1.StoreAsyncWriter(this.idFunc, this.diffAsync, this.observableTree);
	        if (init) {
	            var id = this.idFunc(init);
	            this.observableTree.Write(id, init);
	            this.Write(init);
	        }
	    }
	    Scope(id, func) {
	        if (func)
	            return this.observableTree.Scope(id, func);
	        return this.observableTree.Scope(id, (val) => val);
	    }
	    Action(id, action) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var node;
	            if (id)
	                node = this.observableTree.GetNode(id);
	            yield action(node && node.Proxy, this.asyncWriter);
	        });
	    }
	    Write(data) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.Action(null, (val, writer) => __awaiter(this, void 0, void 0, function* () {
	                yield writer.Write(data);
	            }));
	        });
	    }
	    Merge(id, data) {
	        return __awaiter(this, void 0, void 0, function* () {
	            yield this.Action(id, (val, writer) => __awaiter(this, void 0, void 0, function* () {
	                yield writer.Merge(val, data);
	            }));
	        });
	    }
	    Destroy() {
	        this.diffAsync.Destroy();
	        this.observableTree.Destroy();
	    }
	}
	exports.StoreAsync = StoreAsync;


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
	    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	const diffTree_1 = __webpack_require__(22);
	const workerQueue_1 = __webpack_require__(23);
	const diffWorker_1 = __webpack_require__(25);
	const diffCnstr = diffTree_1.DiffTreeScope();
	class DiffAsync {
	    constructor(keyFunc) {
	        this.workerQueue = new workerQueue_1.WorkerQueue(diffWorker_1.DiffWorker.Create());
	        this.workerQueue.Push({ method: "create", arguments: [keyFunc.toString()] });
	    }
	    static GetKeyRef(key) {
	        return diffCnstr.GetKeyRef(key);
	    }
	    static ReadKeyRef(ref) {
	        return diffCnstr.ReadKeyRef(ref);
	    }
	    DiffPath(path, value) {
	        return __awaiter(this, void 0, void 0, function* () {
	            return yield this.workerQueue.Push({ method: "diffpath", arguments: [path, value] });
	        });
	    }
	    DiffBatch(data) {
	        return __awaiter(this, void 0, void 0, function* () {
	            return yield this.workerQueue.Push({ method: "diffbatch", arguments: [data] });
	        });
	    }
	    Destroy() {
	        this.workerQueue.Destroy();
	    }
	}
	exports.DiffAsync = DiffAsync;


/***/ }),
/* 22 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	function DiffTreeScope(worker) {
	    const ctx = this;
	    if (ctx && worker) {
	        let diffTree = null;
	        ctx.onmessage = function (event) {
	            var data = event.data;
	            switch (data.method) {
	                case "create":
	                    var keyFunc = data.arguments[0] ? eval(data.arguments[0]) : undefined;
	                    diffTree = new DiffTree(keyFunc);
	                    ctx.postMessage(null);
	                    break;
	                case "diffpath":
	                    var diff = diffTree.DiffPath(data.arguments[0], data.arguments[1]);
	                    ctx.postMessage(diff);
	                    break;
	                case "diffbatch":
	                    var diff = diffTree.DiffBatch(data.arguments[0]);
	                    ctx.postMessage(diff);
	                    break;
	            }
	        };
	    }
	    const jsonConstructor = {}.constructor;
	    function IsValue(value) {
	        if (!value)
	            return true;
	        return !(Array.isArray(value) || jsonConstructor === value.constructor);
	    }
	    class DiffTree {
	        constructor(keyFunc) {
	            this.keyFunc = keyFunc;
	            this.rootStateMap = new Map();
	        }
	        static GetKeyRef(key) {
	            return `___DiffTreeKeyRef.${key}`;
	        }
	        static ReadKeyRef(ref) {
	            if (!ref)
	                return undefined;
	            var matches = ref.match(/^___DiffTreeKeyRef\.([^.]+$)/);
	            if (!matches)
	                return undefined;
	            return matches[1];
	        }
	        DiffBatch(data) {
	            var resp = null;
	            for (var x = 0; x < data.length; x++) {
	                var r = this.DiffPath(data[x].path, data[x].value);
	                if (!resp)
	                    resp = r;
	                else {
	                    resp.changedPaths = [...resp.changedPaths, ...r.changedPaths];
	                    resp.deletedPaths = [...resp.deletedPaths, ...r.deletedPaths];
	                }
	            }
	            return resp;
	        }
	        DiffPath(path, value) {
	            var breakupMap = this.GetBreakUpMap(path, value);
	            var resp = {
	                changedPaths: [],
	                deletedPaths: []
	            };
	            breakupMap.forEach((value, key) => {
	                var currentValue = key.split(".").reduce((pre, curr, index) => {
	                    if (index === 0)
	                        return this.rootStateMap.get(curr);
	                    return pre && pre[curr];
	                }, null);
	                this.DiffValues(key, value, currentValue, resp);
	            });
	            resp.changedPaths.forEach(val => {
	                var parts = val.path.split(".");
	                if (parts.length === 1)
	                    this.rootStateMap.set(parts[0], val.value);
	                else {
	                    var curr = this.rootStateMap.get(parts[0]);
	                    for (var x = 1; x < parts.length - 1; x++)
	                        curr = curr[parts[x]];
	                    curr[parts[parts.length - 1]] = val.value;
	                }
	            });
	            return resp;
	        }
	        GetBreakUpMap(path, value) {
	            if (!this.keyFunc)
	                return new Map([[path, value]]);
	            return this.BreakUpValue(path, value);
	        }
	        BreakUpValue(path, parent, prop, map) {
	            var value = prop ? parent[prop] : parent;
	            var isValue = IsValue(value);
	            var key = !isValue && this.keyFunc ? this.keyFunc(value) : null;
	            var keyRef = key && DiffTree.GetKeyRef(key);
	            if (!map)
	                map = new Map([[path, key && key !== path ? keyRef : value]]);
	            if (isValue)
	                return map;
	            if (key && key !== path) {
	                if (prop)
	                    parent[prop] = keyRef;
	                map.set(key, value);
	                this.BreakUpValue(key, value, null, map);
	            }
	            else {
	                for (var subProp in value) {
	                    var childPath = [path, subProp].join(".");
	                    this.BreakUpValue(childPath, value, subProp, map);
	                }
	            }
	            return map;
	        }
	        DiffValues(path, newValue, oldValue, resp) {
	            if (!oldValue && newValue) {
	                resp.changedPaths.push({
	                    path: path,
	                    value: newValue
	                });
	                return;
	            }
	            var newIsObject = !IsValue(newValue);
	            var oldIsObject = !IsValue(oldValue);
	            if (!newIsObject && !oldIsObject && newValue !== oldValue) {
	                resp.changedPaths.push({
	                    path: path,
	                    value: newValue
	                });
	                return;
	            }
	            var newKeys;
	            var oldKeys = oldIsObject ? Object.keys(oldValue) : [];
	            if (newIsObject)
	                newKeys = new Set(Object.keys(newValue));
	            else
	                newKeys = new Set();
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
	                    this.DiffValues(childPath, newValue && newValue[key], oldValue[key], resp);
	            }
	            if (pathChanged || newKeys.size > 0)
	                resp.changedPaths.push({
	                    path: path,
	                    value: newValue
	                });
	        }
	    }
	    return DiffTree;
	}
	exports.DiffTreeScope = DiffTreeScope;


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const asyncQueue_1 = __webpack_require__(24);
	class WorkerQueue {
	    constructor(worker) {
	        this.worker = worker;
	        this.asyncQueue = new asyncQueue_1.AsyncQueue();
	    }
	    Push(message) {
	        return new Promise((resolve, reject) => {
	            this.asyncQueue.Add(next => {
	                this.worker.onmessage = (message) => {
	                    resolve(message.data);
	                    next();
	                };
	                this.worker.onerror = (event) => {
	                    reject(event);
	                    next();
	                };
	                this.worker.postMessage(message);
	            });
	            this.asyncQueue.Start();
	        });
	    }
	    Stop() {
	        this.asyncQueue.Stop();
	    }
	    Destroy() {
	        this.asyncQueue.Stop();
	        this.worker.terminate();
	    }
	}
	exports.WorkerQueue = WorkerQueue;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const list_1 = __webpack_require__(7);
	var AsyncQueueState;
	(function (AsyncQueueState) {
	    AsyncQueueState[AsyncQueueState["Idle"] = 0] = "Idle";
	    AsyncQueueState[AsyncQueueState["Running"] = 1] = "Running";
	})(AsyncQueueState || (AsyncQueueState = {}));
	class AsyncQueue {
	    constructor() {
	        this.list = new list_1.List();
	        this.state = AsyncQueueState.Idle;
	    }
	    get Running() {
	        return this.state === AsyncQueueState.Running;
	    }
	    Add(callback) {
	        this.list.Add(callback);
	    }
	    Start(init) {
	        if (this.state === AsyncQueueState.Running)
	            return;
	        this.state = AsyncQueueState.Running;
	        this.data = init;
	        this.Continue();
	    }
	    Stop() {
	        this.state = AsyncQueueState.Idle;
	        this.list.Clear();
	        var data = this.data;
	        this.data = null;
	        return data;
	    }
	    Continue() {
	        if (this.state !== AsyncQueueState.Running)
	            return;
	        var callback = this.list.Pop();
	        if (callback)
	            callback((data) => {
	                this.data = data;
	                this.Continue();
	            }, this.data);
	        else
	            this.Stop();
	    }
	}
	exports.AsyncQueue = AsyncQueue;


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const diffTree_1 = __webpack_require__(22);
	var DiffWorker;
	(function (DiffWorker) {
	    var workerConstructor = null;
	    var workerParameter = null;
	    if (typeof Worker !== 'undefined') {
	        workerConstructor = Worker;
	        workerParameter = URL.createObjectURL(new Blob([`(${diffTree_1.DiffTreeScope}).call(this, true)`]));
	    }
	    function Create() {
	        if (!workerConstructor)
	            throw "Worker is not available";
	        return new workerConstructor(workerParameter);
	    }
	    DiffWorker.Create = Create;
	})(DiffWorker = exports.DiffWorker || (exports.DiffWorker = {}));


/***/ }),
/* 26 */
/***/ (function(module, exports) {

	"use strict";
	var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
	    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	class StoreAsyncWriter {
	    constructor(idFunc, diffAsync, observableTree) {
	        this.idFunc = idFunc;
	        this.diffAsync = diffAsync;
	        this.observableTree = observableTree;
	    }
	    Write(data) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var id = this.idFunc(data);
	            if (!id)
	                throw new Error("data must have an id");
	            var diff = yield this.diffAsync.DiffPath(id, data);
	            this.ApplyChanges(diff);
	        });
	    }
	    Merge(source, data) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var proxy = source;
	            var rootPath = proxy.___node.Path;
	            var keys = Object.keys(data);
	            var message = keys.map(key => ({ path: `${rootPath}.${key}`, value: data[key] }));
	            var diff = yield this.diffAsync.DiffBatch(message);
	            this.ApplyChanges(diff);
	        });
	    }
	    Push(source, data) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var array = source;
	            var proxy = source;
	            var rootPath = proxy.___node.Path;
	            var length = array.length;
	            var diff = yield this.diffAsync.DiffPath(`${rootPath}.${length}`, data);
	            this.ApplyChanges(diff);
	        });
	    }
	    Splice(source, start, deleteCount, ...items) {
	        return __awaiter(this, void 0, void 0, function* () {
	            var proxy = source;
	            var rootPath = proxy.___node.Path;
	            var array = this.observableTree.Get(rootPath);
	            array = array.map(val => val);
	            array.splice(start, deleteCount, ...items);
	            var diff = yield this.diffAsync.DiffPath(rootPath, array);
	            this.ApplyChanges(diff);
	        });
	    }
	    ApplyChanges(diff) {
	        for (var x = 0; x < diff.deletedPaths.length; x++)
	            this.observableTree.Delete(diff.deletedPaths[x]);
	        this.observableTree.WriteAll(diff.changedPaths);
	    }
	}
	exports.StoreAsyncWriter = StoreAsyncWriter;


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
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const store_1 = __webpack_require__(15);
	const observableScope_1 = __webpack_require__(10);
	const Store_1 = __webpack_require__(14);
	const nodeConfig_1 = __webpack_require__(4);
	function State() {
	    return StateDecorator;
	}
	exports.State = State;
	function StateDecorator(target, propertyKey) {
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
	                this[`StoreDecorator_${propertyKey}`] = new store_1.Store(val);
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
	                scope = this[`ScopeDecorator_${propertyKey}`] = new observableScope_1.ObservableScope(descriptor.get.bind(this));
	            return scope.Value;
	        }
	    };
	}
	function Computed() {
	    return ComputedDecorator.bind(null, store_1.Store);
	}
	exports.Computed = Computed;
	function ComputedAsync() {
	    return ComputedDecorator.bind(null, Store_1.StoreAsync);
	}
	exports.ComputedAsync = ComputedAsync;
	function ComputedDecorator(storeConstructor, target, propertyKey, descriptor) {
	    if (!(descriptor && descriptor.get))
	        throw "Computed decorator requires a getter";
	    if (descriptor && descriptor.set)
	        throw "Computed decorator does not support setters";
	    DestroyDecorator(target, `ComputedDecorator_Scope_${propertyKey}`);
	    DestroyDecorator(target, `ComputedDecorator_Store_${propertyKey}`);
	    return {
	        configurable: false,
	        enumerable: true,
	        get: function () {
	            var store = this[`ComputedDecorator_Store_${propertyKey}`];
	            if (!store) {
	                var scope = this[`ComputedDecorator_Scope_${propertyKey}`] = new observableScope_1.ObservableScope(descriptor.get.bind(this));
	                store = this[`ComputedDecorator_Store_${propertyKey}`] = new storeConstructor(scope.Value);
	                scope.Watch(scope => {
	                    if (this[`ComputedDecorator_Update_${propertyKey}`])
	                        return;
	                    this[`ComputedDecorator_Update_${propertyKey}`] = true;
	                    nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	                        this[`ComputedDecorator_Update_${propertyKey}`] = false;
	                        if (!this.Destroyed)
	                            store.Write(scope.Value);
	                    });
	                });
	            }
	            return store.Root.Value;
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
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	function __export(m) {
	    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	__export(__webpack_require__(28));
	__export(__webpack_require__(30));


/***/ }),
/* 30 */
/***/ (function(module, exports) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	var StepFunctions;
	(function (StepFunctions) {
	    function* EaseIn(count) {
	        var diff = 1 / count;
	        for (var t = diff, x = 0; x < count; x++, t += diff)
	            yield (1 - t) * (1 - t) * (1 - t) * 0 + 3 * (1 - t) * (1 - t) * t * 1 + 3 * (1 - t) * t * t * 1 + t * t * t * 1;
	    }
	    StepFunctions.EaseIn = EaseIn;
	    function* Linear(count) {
	        var diff = 1 / count;
	        for (var t = diff, x = 0; x < count; x++, t += diff)
	            yield t;
	    }
	    StepFunctions.Linear = Linear;
	})(StepFunctions || (StepFunctions = {}));
	var AnimationType;
	(function (AnimationType) {
	    AnimationType[AnimationType["Linear"] = 0] = "Linear";
	    AnimationType[AnimationType["EaseIn"] = 1] = "EaseIn";
	})(AnimationType = exports.AnimationType || (exports.AnimationType = {}));
	class Animation {
	    constructor(type, duration, update) {
	        this.running = false;
	        this.start = null;
	        this.end = null;
	        this.enabled = true;
	        this.type = type;
	        this.frameCount = (duration / 1000) * 60;
	        this.frameTimings = new Array(this.frameCount);
	        var frameTime = duration / this.frameCount;
	        for (var x = 0; x < this.frameCount; x++)
	            this.frameTimings[x] = (x + 1) * frameTime;
	        this.update = update;
	        this.animationTimeouts = new Array(this.frameCount);
	    }
	    get Running() {
	        return this.running;
	    }
	    get Start() {
	        return this.start;
	    }
	    get End() {
	        return this.end;
	    }
	    get Enabled() {
	        return this.enabled;
	    }
	    Animate(start, end) {
	        if (!this.enabled)
	            return;
	        var diff = end - start;
	        if (diff === 0)
	            return;
	        this.Cancel();
	        this.running = true;
	        this.start = start;
	        this.end = end;
	        return new Promise(resolve => {
	            var stepFunc = StepFunctions[AnimationType[this.type]];
	            var index = 0;
	            for (var step of stepFunc(this.frameCount)) {
	                var value = (step * diff) + start;
	                this.SetTimeout(index, value, index === (this.frameCount - 1) ? resolve : null);
	                index++;
	            }
	        }).then(() => {
	            this.running = false;
	            this.start = null;
	            this.end = null;
	        });
	    }
	    Disable() {
	        this.Cancel();
	        this.enabled = false;
	    }
	    Enable() {
	        this.enabled = true;
	    }
	    Cancel() {
	        for (var x = 0; x < this.animationTimeouts.length; x++)
	            clearTimeout(this.animationTimeouts[x]);
	        this.running = false;
	        this.start = null;
	        this.end = null;
	    }
	    Destroy() {
	        this.Cancel();
	    }
	    SetTimeout(index, value, resolve) {
	        this.animationTimeouts[index] = setTimeout(() => {
	            this.update(value);
	            resolve && resolve();
	        }, this.frameTimings[index]);
	    }
	}
	exports.Animation = Animation;


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	function __export(m) {
	    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	__export(__webpack_require__(32));
	__export(__webpack_require__(34));
	__export(__webpack_require__(8));


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const elementNode_1 = __webpack_require__(33);
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
	function b(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("b", null, nodeDef, children);
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
	function option(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("option", null, nodeDef, children);
	}
	exports.option = option;
	function h1(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("h1", null, nodeDef, children);
	}
	exports.h1 = h1;
	function h2(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("h2", null, nodeDef, children);
	}
	exports.h2 = h2;
	function h3(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("h3", null, nodeDef, children);
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
	function text(value) {
	    var valueFunc = null;
	    if (typeof value === 'string')
	        valueFunc = () => value;
	    else
	        valueFunc = value;
	    return elementNode_1.ElementNode.Create("text", null, { props: () => ({ nodeValue: valueFunc() }) });
	}
	exports.text = text;


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const boundNode_1 = __webpack_require__(13);
	const observableScope_1 = __webpack_require__(10);
	const nodeConfig_1 = __webpack_require__(4);
	const injector_1 = __webpack_require__(27);
	const list_1 = __webpack_require__(7);
	const asyncQueue_1 = __webpack_require__(24);
	class ElementNode extends boundNode_1.BoundNode {
	    constructor(nodeDef) {
	        super(nodeDef);
	        this.setData = false;
	        this.setData = false;
	        this.nodesMap = new Map();
	        this.childrenFunc = nodeDef.children || boundNode_1.defaultChildren;
	        this.dataScope = new observableScope_1.ObservableScope(nodeDef.data || nodeDef.static || true);
	        this.arrayScope = this.dataScope.Scope(data => {
	            var value = data;
	            if (!value)
	                value = [];
	            else if (!Array.isArray(value))
	                value = [value];
	            return value;
	        });
	        this.asyncQueue = new asyncQueue_1.AsyncQueue();
	        this.injector = injector_1.Injector.Current();
	        this.arrayScope.Watch(() => this.ScheduleSetData());
	    }
	    ScheduleSetData() {
	        if (this.setData)
	            return;
	        this.setData = true;
	        this.asyncQueue.Stop();
	        nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	            this.setData = false;
	            if (this.Destroyed)
	                return;
	            this.SetData();
	        });
	    }
	    SetData() {
	        this.asyncQueue.Stop();
	        var newNodesMap = new Map();
	        this.arrayScope.Value.forEach(value => {
	            var nodeArrayList = this.nodesMap.get(value);
	            var nodes = nodeArrayList && nodeArrayList.Remove();
	            if (nodeArrayList && nodeArrayList.Size === 0)
	                this.nodesMap.delete(value);
	            var newNodeArrayList = newNodesMap.get(value);
	            if (!newNodeArrayList) {
	                newNodeArrayList = new list_1.List();
	                newNodesMap.set(value, newNodeArrayList);
	            }
	            if (nodes)
	                newNodeArrayList.Push(nodes);
	            this.asyncQueue.Add((next, data) => {
	                nodeConfig_1.NodeConfig.scheduleUpdate(() => {
	                    if (this.Destroyed)
	                        return;
	                    if (!nodes) {
	                        nodes = this.CreateNodeArray(value);
	                        newNodeArrayList.Push(nodes);
	                    }
	                    for (var x = 0; x < nodes.length; x++) {
	                        this.AddChildAfter(data.previousNode, nodes[x]);
	                        data.previousNode = nodes[x];
	                    }
	                    next(data);
	                });
	            });
	        });
	        this.nodesMap.forEach(nodeArrayList => nodeArrayList.ForEach(nodes => nodes.forEach(node => {
	            node.Detach();
	            node.Destroy();
	        })));
	        this.nodesMap = newNodesMap;
	        this.asyncQueue.Start({ previousNode: null });
	    }
	    CreateNodeArray(value) {
	        var nodes = null;
	        injector_1.Injector.Scope(this.injector, () => {
	            var parentVal = boundNode_1.BoundNode.Immediate;
	            boundNode_1.BoundNode.Immediate = this.Immediate;
	            var newNodes = this.childrenFunc(value);
	            if (typeof newNodes === "string")
	                newNodes = [boundNode_1.BoundNode.Create("text", null, { props: () => ({ nodeValue: this.childrenFunc(value) }) })];
	            nodes = newNodes;
	            if (!Array.isArray(nodes))
	                nodes = [nodes];
	            boundNode_1.BoundNode.Immediate = parentVal;
	        });
	        return nodes;
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
	        this.asyncQueue.Stop();
	        this.dataScope.Destroy();
	        this.arrayScope.Destroy();
	    }
	}
	exports.ElementNode = ElementNode;
	(function (ElementNode) {
	    function Create(type, namespace, nodeDef, children) {
	        var def = {
	            type: type,
	            namespace: namespace,
	            immediate: nodeDef.immediate,
	            props: nodeDef.props,
	            attrs: nodeDef.attrs,
	            on: nodeDef.on,
	            static: nodeDef.static,
	            data: nodeDef.data,
	            children: children
	        };
	        var elem = new ElementNode(def);
	        elem.Init();
	        return elem;
	    }
	    ElementNode.Create = Create;
	})(ElementNode = exports.ElementNode || (exports.ElementNode = {}));


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";
	Object.defineProperty(exports, "__esModule", { value: true });
	const elementNode_1 = __webpack_require__(33);
	const svgNs = "http://www.w3.org/2000/svg";
	function svg(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("svg", svgNs, nodeDef, children);
	}
	exports.svg = svg;
	function g(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("g", svgNs, nodeDef, children);
	}
	exports.g = g;
	function circle(nodeDef, children) {
	    return elementNode_1.ElementNode.Create("circle", svgNs, nodeDef, children);
	}
	exports.circle = circle;


/***/ })
/******/ ]);
//# sourceMappingURL=jTemplates.js.map