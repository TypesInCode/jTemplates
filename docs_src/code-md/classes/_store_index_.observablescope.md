[j-templates](../README.md) › [Globals](../globals.md) › ["Store/index"](../modules/_store_index_.md) › [ObservableScope](_store_index_.observablescope.md)

# Class: ObservableScope ‹**T**›

## Type parameters

▪ **T**

## Hierarchy

* **ObservableScope**

## Index

### Constructors

* [constructor](_store_index_.observablescope.md#constructor)

### Properties

* [dirty](_store_index_.observablescope.md#protected-dirty)
* [emitter](_store_index_.observablescope.md#protected-emitter)
* [emitters](_store_index_.observablescope.md#private-emitters)
* [getFunction](_store_index_.observablescope.md#protected-getfunction)
* [setCallback](_store_index_.observablescope.md#private-setcallback)
* [value](_store_index_.observablescope.md#protected-value)
* [watchMap](_store_index_.observablescope.md#private-watchmap)
* [currentSet](_store_index_.observablescope.md#static-currentset)

### Accessors

* [Emitter](_store_index_.observablescope.md#emitter)
* [Value](_store_index_.observablescope.md#value)

### Methods

* [AddListenersTo](_store_index_.observablescope.md#private-addlistenersto)
* [Destroy](_store_index_.observablescope.md#destroy)
* [RemoveListenersFrom](_store_index_.observablescope.md#private-removelistenersfrom)
* [Scope](_store_index_.observablescope.md#scope)
* [SetCallback](_store_index_.observablescope.md#protected-setcallback)
* [Unwatch](_store_index_.observablescope.md#unwatch)
* [UpdateEmitters](_store_index_.observablescope.md#protected-updateemitters)
* [UpdateValue](_store_index_.observablescope.md#protected-updatevalue)
* [Watch](_store_index_.observablescope.md#watch)
* [Register](_store_index_.observablescope.md#static-register)
* [Watch](_store_index_.observablescope.md#static-watch)

## Constructors

###  constructor

\+ **new ObservableScope**(`getFunction`: function | T): *[ObservableScope](_store_index_.observablescope.md)*

*Defined in [Store/Tree/observableScope.ts:22](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L22)*

**Parameters:**

Name | Type |
------ | ------ |
`getFunction` | function &#124; T |

**Returns:** *[ObservableScope](_store_index_.observablescope.md)*

## Properties

### `Protected` dirty

• **dirty**: *boolean*

*Defined in [Store/Tree/observableScope.ts:7](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L7)*

___

### `Protected` emitter

• **emitter**: *Emitter*

*Defined in [Store/Tree/observableScope.ts:8](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L8)*

___

### `Private` emitters

• **emitters**: *Set‹Emitter›*

*Defined in [Store/Tree/observableScope.ts:10](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L10)*

___

### `Protected` getFunction

• **getFunction**: *function*

*Defined in [Store/Tree/observableScope.ts:5](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L5)*

#### Type declaration:

▸ (): *T*

___

### `Private` setCallback

• **setCallback**: *function*

*Defined in [Store/Tree/observableScope.ts:11](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L11)*

#### Type declaration:

▸ (): *void*

___

### `Protected` value

• **value**: *T*

*Defined in [Store/Tree/observableScope.ts:6](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L6)*

___

### `Private` watchMap

• **watchMap**: *Map‹function, function›*

*Defined in [Store/Tree/observableScope.ts:12](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L12)*

___

### `Static` currentSet

▪ **currentSet**: *Set‹Emitter›* = null

*Defined in [Store/Tree/observableScope.ts:113](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L113)*

## Accessors

###  Emitter

• **get Emitter**(): *Emitter‹›*

*Defined in [Store/Tree/observableScope.ts:14](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L14)*

**Returns:** *Emitter‹›*

___

###  Value

• **get Value**(): *T*

*Defined in [Store/Tree/observableScope.ts:18](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L18)*

**Returns:** *T*

## Methods

### `Private` AddListenersTo

▸ **AddListenersTo**(`emitter`: Emitter): *void*

*Defined in [Store/Tree/observableScope.ts:103](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L103)*

**Parameters:**

Name | Type |
------ | ------ |
`emitter` | Emitter |

**Returns:** *void*

___

###  Destroy

▸ **Destroy**(): *void*

*Defined in [Store/Tree/observableScope.ts:57](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L57)*

**Returns:** *void*

___

### `Private` RemoveListenersFrom

▸ **RemoveListenersFrom**(`emitter`: Emitter): *void*

*Defined in [Store/Tree/observableScope.ts:107](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L107)*

**Parameters:**

Name | Type |
------ | ------ |
`emitter` | Emitter |

**Returns:** *void*

___

###  Scope

▸ **Scope**‹**O**›(`callback`: function): *[ObservableScope](_store_index_.observablescope.md)‹O›*

*Defined in [Store/Tree/observableScope.ts:39](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L39)*

**Type parameters:**

▪ **O**

**Parameters:**

▪ **callback**: *function*

▸ (`parent`: T): *O*

**Parameters:**

Name | Type |
------ | ------ |
`parent` | T |

**Returns:** *[ObservableScope](_store_index_.observablescope.md)‹O›*

___

### `Protected` SetCallback

▸ **SetCallback**(): *void*

*Defined in [Store/Tree/observableScope.ts:95](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L95)*

**Returns:** *void*

___

###  Unwatch

▸ **Unwatch**(`callback`: function): *void*

*Defined in [Store/Tree/observableScope.ts:50](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L50)*

**Parameters:**

▪ **callback**: *function*

▸ (`scope`: [ObservableScope](_store_index_.observablescope.md)‹T›): *void*

**Parameters:**

Name | Type |
------ | ------ |
`scope` | [ObservableScope](_store_index_.observablescope.md)‹T› |

**Returns:** *void*

___

### `Protected` UpdateEmitters

▸ **UpdateEmitters**(`newEmitters`: Set‹Emitter›): *void*

*Defined in [Store/Tree/observableScope.ts:78](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L78)*

**Parameters:**

Name | Type |
------ | ------ |
`newEmitters` | Set‹Emitter› |

**Returns:** *void*

___

### `Protected` UpdateValue

▸ **UpdateValue**(): *void*

*Defined in [Store/Tree/observableScope.ts:64](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L64)*

**Returns:** *void*

___

###  Watch

▸ **Watch**(`callback`: function): *void*

*Defined in [Store/Tree/observableScope.ts:43](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L43)*

**Parameters:**

▪ **callback**: *function*

▸ (`scope`: [ObservableScope](_store_index_.observablescope.md)‹T›): *void*

**Parameters:**

Name | Type |
------ | ------ |
`scope` | [ObservableScope](_store_index_.observablescope.md)‹T› |

**Returns:** *void*

___

### `Static` Register

▸ **Register**(`emitter`: Emitter): *void*

*Defined in [Store/Tree/observableScope.ts:124](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L124)*

**Parameters:**

Name | Type |
------ | ------ |
`emitter` | Emitter |

**Returns:** *void*

___

### `Static` Watch

▸ **Watch**(`action`: function): *Set‹Emitter‹››*

*Defined in [Store/Tree/observableScope.ts:115](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Tree/observableScope.ts#L115)*

**Parameters:**

▪ **action**: *function*

▸ (): *void*

**Returns:** *Set‹Emitter‹››*
