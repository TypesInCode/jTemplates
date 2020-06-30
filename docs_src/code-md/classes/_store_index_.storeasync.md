[j-templates](../README.md) › [Globals](../globals.md) › ["Store/index"](../modules/_store_index_.md) › [StoreAsync](_store_index_.storeasync.md)

# Class: StoreAsync

## Hierarchy

* **StoreAsync**

## Index

### Constructors

* [constructor](_store_index_.storeasync.md#constructor)

### Properties

* [asyncQueue](_store_index_.storeasync.md#private-asyncqueue)
* [asyncWriter](_store_index_.storeasync.md#private-asyncwriter)
* [diffAsync](_store_index_.storeasync.md#private-diffasync)
* [idFunc](_store_index_.storeasync.md#private-idfunc)
* [observableTree](_store_index_.storeasync.md#private-observabletree)

### Methods

* [Action](_store_index_.storeasync.md#action)
* [Destroy](_store_index_.storeasync.md#destroy)
* [Merge](_store_index_.storeasync.md#merge)
* [Scope](_store_index_.storeasync.md#scope)
* [Write](_store_index_.storeasync.md#write)

## Constructors

###  constructor

\+ **new StoreAsync**(`idFunc`: function, `init?`: any): *[StoreAsync](_store_index_.storeasync.md)*

*Defined in [Store/Store/storeAsync.ts:13](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L13)*

**Parameters:**

▪ **idFunc**: *function*

▸ (`val`: any): *string*

**Parameters:**

Name | Type |
------ | ------ |
`val` | any |

▪`Optional`  **init**: *any*

**Returns:** *[StoreAsync](_store_index_.storeasync.md)*

## Properties

### `Private` asyncQueue

• **asyncQueue**: *AsyncQueue‹void›*

*Defined in [Store/Store/storeAsync.ts:13](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L13)*

___

### `Private` asyncWriter

• **asyncWriter**: *StoreAsyncWriter*

*Defined in [Store/Store/storeAsync.ts:12](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L12)*

___

### `Private` diffAsync

• **diffAsync**: *DiffAsync*

*Defined in [Store/Store/storeAsync.ts:10](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L10)*

___

### `Private` idFunc

• **idFunc**: *function*

*Defined in [Store/Store/storeAsync.ts:9](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L9)*

#### Type declaration:

▸ (`val`: any): *string*

**Parameters:**

Name | Type |
------ | ------ |
`val` | any |

___

### `Private` observableTree

• **observableTree**: *ObservableTree*

*Defined in [Store/Store/storeAsync.ts:11](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L11)*

## Methods

###  Action

▸ **Action**‹**T**›(`id`: string, `action`: function): *Promise‹unknown›*

*Defined in [Store/Store/storeAsync.ts:32](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L32)*

**Type parameters:**

▪ **T**

**Parameters:**

▪ **id**: *string*

▪ **action**: *function*

▸ (`val`: T, `writer`: StoreAsyncWriter): *Promise‹void›*

**Parameters:**

Name | Type |
------ | ------ |
`val` | T |
`writer` | StoreAsyncWriter |

**Returns:** *Promise‹unknown›*

___

###  Destroy

▸ **Destroy**(): *void*

*Defined in [Store/Store/storeAsync.ts:59](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L59)*

**Returns:** *void*

___

###  Merge

▸ **Merge**(`id`: string, `data`: any): *Promise‹void›*

*Defined in [Store/Store/storeAsync.ts:53](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L53)*

**Parameters:**

Name | Type |
------ | ------ |
`id` | string |
`data` | any |

**Returns:** *Promise‹void›*

___

###  Scope

▸ **Scope**‹**T**, **R**›(`id`: string, `func`: function): *[ObservableScope](_store_index_.observablescope.md)‹R›*

*Defined in [Store/Store/storeAsync.ts:28](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L28)*

**Type parameters:**

▪ **T**

▪ **R**

**Parameters:**

▪ **id**: *string*

▪ **func**: *function*

▸ (`val`: T): *R*

**Parameters:**

Name | Type |
------ | ------ |
`val` | T |

**Returns:** *[ObservableScope](_store_index_.observablescope.md)‹R›*

___

###  Write

▸ **Write**(`data`: any): *Promise‹void›*

*Defined in [Store/Store/storeAsync.ts:47](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Store/Store/storeAsync.ts#L47)*

**Parameters:**

Name | Type |
------ | ------ |
`data` | any |

**Returns:** *Promise‹void›*
