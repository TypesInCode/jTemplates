[j-templates](../README.md) › [Globals](../globals.md) › ["Store/index"](../modules/_store_index_.md) › [Store](_store_index_.store.md)

# Class: Store ‹**T**›

## Type parameters

▪ **T**

## Hierarchy

* **Store**

## Index

### Constructors

* [constructor](_store_index_.store.md#constructor)

### Properties

* [observableTree](_store_index_.store.md#private-observabletree)
* [rootScope](_store_index_.store.md#private-rootscope)
* [storeWriter](_store_index_.store.md#private-storewriter)

### Accessors

* [Root](_store_index_.store.md#root)

### Methods

* [Action](_store_index_.store.md#action)
* [Destroy](_store_index_.store.md#destroy)
* [Merge](_store_index_.store.md#merge)
* [Write](_store_index_.store.md#write)

## Constructors

###  constructor

\+ **new Store**(`init?`: T): *[Store](_store_index_.store.md)*

*Defined in [Store/Store/store.ts:12](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L12)*

**Parameters:**

Name | Type |
------ | ------ |
`init?` | T |

**Returns:** *[Store](_store_index_.store.md)*

## Properties

### `Private` observableTree

• **observableTree**: *ObservableTree‹›* = new ObservableTree()

*Defined in [Store/Store/store.ts:6](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L6)*

___

### `Private` rootScope

• **rootScope**: *[ObservableScope](_store_index_.observablescope.md)‹T›* = this.observableTree.Scope<T, T>("ROOT", root => root)

*Defined in [Store/Store/store.ts:8](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L8)*

___

### `Private` storeWriter

• **storeWriter**: *StoreWriter‹›* = new StoreWriter(this.observableTree)

*Defined in [Store/Store/store.ts:7](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L7)*

## Accessors

###  Root

• **get Root**(): *[ObservableScope](_store_index_.observablescope.md)‹T›*

*Defined in [Store/Store/store.ts:10](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L10)*

**Returns:** *[ObservableScope](_store_index_.observablescope.md)‹T›*

## Methods

###  Action

▸ **Action**(`action`: function): *void*

*Defined in [Store/Store/store.ts:20](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L20)*

**Parameters:**

▪ **action**: *function*

▸ (`root`: T, `writer`: StoreWriter): *void*

**Parameters:**

Name | Type |
------ | ------ |
`root` | T |
`writer` | StoreWriter |

**Returns:** *void*

___

###  Destroy

▸ **Destroy**(): *void*

*Defined in [Store/Store/store.ts:43](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L43)*

**Returns:** *void*

___

###  Merge

▸ **Merge**(`data`: Partial‹T›): *void*

*Defined in [Store/Store/store.ts:32](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L32)*

**Parameters:**

Name | Type |
------ | ------ |
`data` | Partial‹T› |

**Returns:** *void*

___

###  Write

▸ **Write**(`data`: T): *void*

*Defined in [Store/Store/store.ts:25](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/store.ts#L25)*

**Parameters:**

Name | Type |
------ | ------ |
`data` | T |

**Returns:** *void*
