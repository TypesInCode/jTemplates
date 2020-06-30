[j-templates](../README.md) › [Globals](../globals.md) › ["Utils/index"](_utils_index_.md)

# Module: "Utils/index"

## Index

### Namespaces

* [Destroy](_utils_index_.destroy.md)
* [PreReq](_utils_index_.prereq.md)
* [PreReqTemplate](_utils_index_.prereqtemplate.md)

### Enumerations

* [AnimationType](../enums/_utils_index_.animationtype.md)

### Classes

* [Animation](../classes/_utils_index_.animation.md)

### Functions

* [Computed](_utils_index_.md#computed)
* [ComputedAsync](_utils_index_.md#computedasync)
* [Inject](_utils_index_.md#inject)
* [Scope](_utils_index_.md#scope)
* [SharedScope](_utils_index_.md#sharedscope)
* [State](_utils_index_.md#state)

## Functions

###  Computed

▸ **Computed**(): *function*

*Defined in [Utils/decorators.ts:84](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/decorators.ts#L84)*

**Returns:** *function*

▸ ‹**T**, **K**›(`target`: T, `propertyKey`: K, `descriptor`: PropertyDescriptor): *any*

**Type parameters:**

▪ **T**: *[Component](../classes/_index_.component.md)‹any, any, any›*

▪ **K**: *string*

**Parameters:**

Name | Type |
------ | ------ |
`target` | T |
`propertyKey` | K |
`descriptor` | PropertyDescriptor |

___

###  ComputedAsync

▸ **ComputedAsync**(): *function*

*Defined in [Utils/decorators.ts:88](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/decorators.ts#L88)*

**Returns:** *function*

▸ ‹**T**, **K**›(`target`: T, `propertyKey`: K, `descriptor`: PropertyDescriptor): *any*

**Type parameters:**

▪ **T**: *[Component](../classes/_index_.component.md)‹any, any, any›*

▪ **K**: *string*

**Parameters:**

Name | Type |
------ | ------ |
`target` | T |
`propertyKey` | K |
`descriptor` | PropertyDescriptor |

___

###  Inject

▸ **Inject**‹**I**›(`type`: object): *function*

*Defined in [Utils/decorators.ts:121](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/decorators.ts#L121)*

**Type parameters:**

▪ **I**

**Parameters:**

▪ **type**: *object*

Name | Type |
------ | ------ |
`constructor` |  |

**Returns:** *function*

▸ ‹**F**, **T**, **K**›(`target`: T, `propertyKey`: K, `descriptor?`: PropertyDescriptor): *any*

**Type parameters:**

▪ **F**: *I*

▪ **T**: *[Component](../classes/_index_.component.md)‹any, any, any› & Record‹K, F›*

▪ **K**: *string*

**Parameters:**

Name | Type |
------ | ------ |
`target` | T |
`propertyKey` | K |
`descriptor?` | PropertyDescriptor |

___

###  Scope

▸ **Scope**(): *ScopeDecorator*

*Defined in [Utils/decorators.ts:32](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/decorators.ts#L32)*

**Returns:** *ScopeDecorator*

___

###  SharedScope

▸ **SharedScope**(): *SharedScopeDecorator*

*Defined in [Utils/decorators.ts:57](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/decorators.ts#L57)*

**Returns:** *SharedScopeDecorator*

___

###  State

▸ **State**(): *any*

*Defined in [Utils/decorators.ts:8](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/decorators.ts#L8)*

**Returns:** *any*
