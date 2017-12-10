"use strict";
var observable_1 = require("./observable");
var symbol_1 = require("../Utils/symbol");
(function (ObservableValueType) {
    ObservableValueType[ObservableValueType["Value"] = 0] = "Value";
    ObservableValueType[ObservableValueType["Object"] = 1] = "Object";
    ObservableValueType[ObservableValueType["Array"] = 2] = "Array";
})(exports.ObservableValueType || (exports.ObservableValueType = {}));
var ObservableValueType = exports.ObservableValueType;
var jsonObj = {};
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
                if (val.length === nextArr.length)
                    skipEventFiring = true;
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
            else if (val && typeof val === "object" && val.constructor === jsonObj.constructor) {
                this.ConvertToObject();
                var nextObject = this.value && typeof this.value === "object" ? this.value : {};
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
        }
    };
    ObservableValue.prototype.Join = function (obsVal) {
        var value = obsVal.valueOf();
        for (var x = 0; x < this.Properties.length; x++) {
            var prop = this.Properties[x];
            if (value && value[prop])
                this.value[prop].Join(value[prop]);
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
        var _this = this;
        properties.forEach(function (c, i) {
            Object.defineProperty(object, c, {
                get: function () {
                    return _this.value[c];
                },
                set: function (val) {
                    _this.value[c].SetValue(val);
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
        var _this = this;
        Object.defineProperty(object, "length", {
            get: function () { return _this.value.length; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "push", {
            value: function (newVal) {
                _this.AddPropertiesToParents([_this.value.length]);
                var newObs = new observable_1.default(newVal);
                var ret = _this.value.push(newObs);
                _this.FireEvent("set");
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
                var startProperties = _this.Properties;
                startIndex = startIndex || 0;
                count = typeof count == 'undefined' ? _this.value.length - startIndex : count;
                if (startIndex + count > _this.value.length)
                    count = _this.value.length - startIndex;
                var tailLength = _this.value.length - (startIndex + count);
                var tail = [];
                for (var x = 0; x < tailLength; x++)
                    tail.push(_this.value[startIndex + count + x].valueOf());
                var ret = [];
                for (var x = 0; x < count; x++)
                    ret.push(_this.value[startIndex + x].valueOf());
                for (var x = 0; x < args.length + tailLength; x++) {
                    var index = x + startIndex;
                    var value = x < args.length ? args[x] : tail[x - args.length];
                    if (index < _this.value.length)
                        _this.value[index].SetValue(value);
                    else
                        _this.value.push(new observable_1.default(value));
                }
                _this.value.splice(startIndex + args.length + tailLength);
                _this.ReconcileProperties(startProperties);
                _this.FireEvent("set");
                return ret;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "sort", {
            value: function (sortCallback) {
                var array = ObservableValue.Unwrap(_this);
                array.sort(sortCallback);
                _this.Value = array;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, symbol_1.default.iterator, {
            get: function () {
                return _this.valueOf()[symbol_1.default.iterator];
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
        delete object["sort"];
        delete object[symbol_1.default.iterator];
    };
    return ObservableValue;
}());
exports.ObservableValue = ObservableValue;
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
})(ObservableValue = exports.ObservableValue || (exports.ObservableValue = {}));
//# sourceMappingURL=observableValue.js.map