"use strict";
(function (ValueType) {
    ValueType[ValueType["Unknown"] = 0] = "Unknown";
    ValueType[ValueType["Value"] = 1] = "Value";
    ValueType[ValueType["Object"] = 2] = "Object";
    ValueType[ValueType["Array"] = 3] = "Array";
})(exports.ValueType || (exports.ValueType = {}));
var ValueType = exports.ValueType;
var JsonObj = {};
var JsonTreeNode = (function () {
    function JsonTreeNode(mirrorNodeType, properties, type, value) {
        this.mirrorNodeType = mirrorNodeType;
        this.mirroredNodes = [];
        this.objectProperties = properties || [];
        this.type = type || ValueType.Unknown;
        this.value = value || null;
    }
    Object.defineProperty(JsonTreeNode.prototype, "Type", {
        get: function () {
            return this.type;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(JsonTreeNode.prototype, "Properties", {
        get: function () {
            return this.objectProperties;
        },
        enumerable: true,
        configurable: true
    });
    JsonTreeNode.prototype.CopyNode = function () {
        return new JsonTreeNode(this.mirrorNodeType, this.objectProperties.slice());
    };
    JsonTreeNode.prototype.AddMirrorNode = function (mirrorNode) {
        this.mirroredNodes.push(mirrorNode);
        this.AddPropertiesTo(this.objectProperties, [mirrorNode]);
        mirrorNode.SetSourceNode(this);
    };
    JsonTreeNode.prototype.RemoveMirroredNode = function (mirrorNode) {
        var ind = this.mirroredNodes.indexOf(mirrorNode);
        if (ind < 0)
            return;
        this.mirroredNodes.splice(ind, 1);
        var value = this.type === ValueType.Value ? this.value :
            this.type === ValueType.Array ? [] : {};
        for (var x = 0; x < this.objectProperties.length; x++) {
            var prop = this.objectProperties[x];
            var childNode = mirrorNode[prop];
            var childTreeNode = childNode.GetSourceNode();
            value[prop] = childTreeNode.RemoveMirroredNode(childNode);
        }
        var cloneNode = new JsonTreeNode(this.mirrorNodeType, this.objectProperties.slice(), this.type, value);
        cloneNode.AddMirrorNode(mirrorNode);
        return cloneNode;
    };
    JsonTreeNode.prototype.GetValue = function () {
        return this.value;
    };
    JsonTreeNode.prototype.GetMirroredValue = function (node) {
        if (this.mirroredNodes.indexOf(node) < 0)
            throw "Can't generate mirror value for unrelated node";
        var value = this.type === ValueType.Value ? this.value :
            this.type === ValueType.Array ? [] : {};
        for (var x = 0; x < this.objectProperties.length; x++) {
            var prop = this.objectProperties[x];
            value[prop] = node[prop];
        }
        return value;
    };
    JsonTreeNode.prototype.GetRawValue = function () {
        var value = this.type === ValueType.Value ? this.value :
            this.type === ValueType.Array ? [] : {};
        for (var x = 0; x < this.objectProperties.length; x++) {
            var prop = this.objectProperties[x];
            value[prop] = this.value[prop].GetRawValue();
        }
        return value;
    };
    JsonTreeNode.prototype.SetValue = function (newValue) {
        if (newValue instanceof this.mirrorNodeType)
            newValue = newValue.GetSourceNode().GetRawValue();
        var startValue = this.value;
        var startProperties = this.objectProperties.slice();
        var newValueType = this.GetValueType(newValue);
        switch (newValueType) {
            case ValueType.Array:
                this.ConvertToArray();
                newValue = newValue;
                var value = this.value;
                if (newValue.length < value.length) {
                    this.objectProperties.splice(newValue.length);
                }
                else {
                    for (var x = this.objectProperties.length; x < newValue.length; x++)
                        this.objectProperties.push(x);
                }
                break;
            case ValueType.Object:
                this.ConvertToObject();
                newValue = newValue;
                var newProperties = [];
                for (var key in newValue) {
                    newProperties.push(key);
                }
                this.objectProperties = newProperties;
                break;
            case ValueType.Value:
                this.ConvertToValue();
                this.value = newValue;
                break;
        }
        this.ReconcileProperties(newValue, startProperties, this.objectProperties);
        if (this.type != ValueType.Value || startValue != this.value)
            for (var x = 0; x < this.mirroredNodes.length; x++) {
                this.mirroredNodes[x].NodeUpdated();
            }
    };
    JsonTreeNode.prototype.Destroy = function () {
        this.ResetToNull();
        for (var x = 0; x < this.mirroredNodes.length; x++) {
            this.mirroredNodes[x].Destroy();
        }
    };
    JsonTreeNode.prototype.ResetToNull = function () {
        var value = this.value;
        for (var x = 0; x < this.objectProperties.length; x++) {
            var prop = this.objectProperties[x];
            value[prop].Destroy();
        }
        this.RemovePropertiesFrom(this.objectProperties, this.mirroredNodes);
        this.objectProperties = [];
        if (this.type === ValueType.Array)
            this.RemoveArrayMixinFromMirrors();
        this.value = null;
        this.type = ValueType.Value;
    };
    JsonTreeNode.prototype.GetValueType = function (value) {
        if (Array.isArray(value))
            return ValueType.Array;
        if (value && typeof value === "object" && value.constructor === JsonObj.constructor)
            return ValueType.Object;
        return ValueType.Value;
    };
    JsonTreeNode.prototype.ConvertToObject = function () {
        if (this.type === ValueType.Object)
            return;
        this.ResetToNull();
        this.type = ValueType.Object;
        this.value = {};
    };
    JsonTreeNode.prototype.ConvertToArray = function () {
        if (this.type == ValueType.Array)
            return;
        this.ResetToNull();
        this.type = ValueType.Array;
        this.value = [];
        this.AddArrayMixinToMirrors();
    };
    JsonTreeNode.prototype.ConvertToValue = function () {
        if (this.type == ValueType.Value)
            return;
        this.ResetToNull();
    };
    JsonTreeNode.prototype.ReconcileProperties = function (newValue, oldProperties, newProperties) {
        var removedProperties = [];
        for (var x = 0; x < oldProperties.length; x++) {
            if (newProperties.indexOf(oldProperties[x]) < 0)
                removedProperties.push(oldProperties[x]);
        }
        for (var x = 0; x < newProperties.length; x++) {
            var prop = newProperties[x];
            if (this.value[prop])
                this.value[prop].SetValue(newValue[prop]);
            else {
                this.value[prop] = new JsonTreeNode(this.mirrorNodeType);
                this.AddPropertiesTo([prop], this.mirroredNodes);
                this.value[prop].SetValue(newValue[prop]);
            }
        }
        this.RemoveProperties(removedProperties);
        this.RemovePropertiesFrom(removedProperties, this.mirroredNodes);
    };
    JsonTreeNode.prototype.RemoveProperties = function (properties) {
        var value = this.value;
        if (this.type === ValueType.Array) {
            var removed = value.splice(this.value.length - properties.length);
            for (var x = 0; x < removed.length; x++)
                removed[x].Destroy();
        }
        else {
            for (var x = 0; x < properties.length; x++) {
                var prop = properties[x];
                value[prop].Destroy();
                delete value[prop];
            }
        }
    };
    JsonTreeNode.prototype.RemovePropertiesFrom = function (properties, mirrors) {
        for (var x = 0; x < mirrors.length; x++) {
            var mirror = mirrors[x];
            for (var y = 0; y < properties.length; y++) {
                var prop = properties[y];
                delete mirror[prop];
            }
        }
    };
    JsonTreeNode.prototype.AddPropertiesTo = function (properties, mirrors) {
        for (var x = 0; x < properties.length; x++) {
            var prop = properties[x];
            var value = this.value[prop];
            for (var y = 0; y < mirrors.length; y++) {
                var mirror = mirrors[y];
                var childMirror = mirror[prop] || new this.mirrorNodeType();
                value.AddMirrorNode(childMirror);
                this.DefineProperty(mirror, prop, childMirror);
            }
        }
    };
    JsonTreeNode.prototype.DefineProperty = function (mirror, property, value) {
        mirror[property] || Object.defineProperty(mirror, property, {
            get: function () { return value; },
            set: function (val) { return value.GetSourceNode().SetValue(val); },
            enumerable: true,
            configurable: true
        });
    };
    JsonTreeNode.prototype.AddArrayMixinToMirrors = function () {
        for (var x = 0; x < this.mirroredNodes.length; x++) {
            this.AddArrayMixin(this.mirroredNodes[x]);
        }
    };
    JsonTreeNode.prototype.AddArrayMixin = function (object) {
        var array = object;
        Object.defineProperty(object, "length", {
            get: function () { return object.valueOf().length; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(object, "reduce", {
            value: function (reduceCallback, initialValue) {
                for (var x = 0; x < array.length; x++) {
                    initialValue = reduceCallback(initialValue, array[x], x, array);
                }
                return initialValue;
            },
            enumerable: false,
            configurable: true
        });
    };
    JsonTreeNode.prototype.RemoveArrayMixinFromMirrors = function () {
        for (var x = 0; x < this.mirroredNodes.length; x++) {
            this.RemoveArrayMixin(this.mirroredNodes[x]);
        }
    };
    JsonTreeNode.prototype.RemoveArrayMixin = function (object) {
        delete object["length"];
        delete object["reduce"];
    };
    return JsonTreeNode;
}());
exports.JsonTreeNode = JsonTreeNode;
var JsonTreeNode;
(function (JsonTreeNode) {
    function Create(value, nodeType) {
        var jsonNode = new JsonTreeNode(nodeType);
        var mirrNode = new nodeType();
        jsonNode.AddMirrorNode(mirrNode);
        jsonNode.SetValue(value);
        return mirrNode;
    }
    JsonTreeNode.Create = Create;
})(JsonTreeNode = exports.JsonTreeNode || (exports.JsonTreeNode = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JsonTreeNode;
//# sourceMappingURL=jsonTreeNode.js.map