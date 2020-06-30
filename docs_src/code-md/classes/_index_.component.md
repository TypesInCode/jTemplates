[j-templates](../README.md) › [Globals](../globals.md) › ["index"](../modules/_index_.md) › [Component](_index_.component.md)

# Class: Component ‹**D, T, E**›

Class used to define a component. Override the [Component.Template](_index_.component.md#template) method.

## Type parameters

▪ **D**

Parent data type. Available through [Component.Data](_index_.component.md#protected-data).

▪ **T**: *ComponentTemplates | void*

Template data type. Available through [Component.Templates](_index_.component.md#protected-templates).

▪ **E**

Events data type. Fire an event using [Component.Fire](_index_.component.md#fire).

## Hierarchy

* **Component**

## Index

### Constructors

* [constructor](_index_.component.md#constructor)

### Properties

* [injector](_index_.component.md#private-injector)
* [nodeRef](_index_.component.md#private-noderef)
* [scope](_index_.component.md#private-scope)
* [templates](_index_.component.md#private-templates)

### Accessors

* [Data](_index_.component.md#protected-data)
* [Destroyed](_index_.component.md#destroyed)
* [Injector](_index_.component.md#injector)
* [NodeRef](_index_.component.md#protected-noderef)
* [Scope](_index_.component.md#protected-scope)
* [Templates](_index_.component.md#protected-templates)

### Methods

* [Bound](_index_.component.md#bound)
* [Destroy](_index_.component.md#destroy)
* [Fire](_index_.component.md#fire)
* [Template](_index_.component.md#template)
* [Attach](_index_.component.md#static-attach)
* [ToFunction](_index_.component.md#static-tofunction)

## Constructors

###  constructor

\+ **new Component**(`data`: function | D, `templates`: T, `nodeRef`: ComponentNode‹D, T, E›, `injector`: Injector): *[Component](_index_.component.md)*

*Defined in [Node/component.ts:41](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L41)*

**Parameters:**

Name | Type |
------ | ------ |
`data` | function &#124; D |
`templates` | T |
`nodeRef` | ComponentNode‹D, T, E› |
`injector` | Injector |

**Returns:** *[Component](_index_.component.md)*

## Properties

### `Private` injector

• **injector**: *Injector*

*Defined in [Node/component.ts:43](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L43)*

___

### `Private` nodeRef

• **nodeRef**: *ComponentNode‹D, T, E›*

*Defined in [Node/component.ts:43](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L43)*

___

### `Private` scope

• **scope**: *ObservableScopeAsync‹D›*

*Defined in [Node/component.ts:16](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L16)*

___

### `Private` templates

• **templates**: *T*

*Defined in [Node/component.ts:17](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L17)*

## Accessors

### `Protected` Data

• **get Data**(): *D*

*Defined in [Node/component.ts:31](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L31)*

**Returns:** *D*

___

###  Destroyed

• **get Destroyed**(): *boolean*

*Defined in [Node/component.ts:23](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L23)*

**Returns:** *boolean*

___

###  Injector

• **get Injector**(): *Injector‹›*

*Defined in [Node/component.ts:19](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L19)*

**Returns:** *Injector‹›*

___

### `Protected` NodeRef

• **get NodeRef**(): *ComponentNode‹D, T, E›*

*Defined in [Node/component.ts:35](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L35)*

**Returns:** *ComponentNode‹D, T, E›*

___

### `Protected` Scope

• **get Scope**(): *ObservableScopeAsync‹D›*

*Defined in [Node/component.ts:27](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L27)*

**Returns:** *ObservableScopeAsync‹D›*

___

### `Protected` Templates

• **get Templates**(): *T*

*Defined in [Node/component.ts:39](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L39)*

**Returns:** *T*

## Methods

###  Bound

▸ **Bound**(): *void*

*Defined in [Node/component.ts:55](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L55)*

**Returns:** *void*

___

###  Destroy

▸ **Destroy**(): *void*

*Defined in [Node/component.ts:63](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L63)*

**Returns:** *void*

___

###  Fire

▸ **Fire**‹**P**›(`event`: P, `data?`: E[P]): *void*

*Defined in [Node/component.ts:59](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L59)*

**Type parameters:**

▪ **P**: *keyof E*

**Parameters:**

Name | Type |
------ | ------ |
`event` | P |
`data?` | E[P] |

**Returns:** *void*

___

###  Template

▸ **Template**(): *[NodeRef](_index_.noderef.md) | [NodeRef](_index_.noderef.md)[]*

*Defined in [Node/component.ts:51](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L51)*

Method defines the [NodeRef](_index_.component.md#protected-noderef) template for this [Component](_index_.component.md).

**Returns:** *[NodeRef](_index_.noderef.md) | [NodeRef](_index_.noderef.md)[]*

___

### `Static` Attach

▸ **Attach**(`node`: Node, `nodeRef`: [NodeRef](_index_.noderef.md)): *void*

*Defined in [Node/component.ts:74](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L74)*

**Parameters:**

Name | Type |
------ | ------ |
`node` | Node |
`nodeRef` | [NodeRef](_index_.noderef.md) |

**Returns:** *void*

___

### `Static` ToFunction

▸ **ToFunction**‹**D**, **T**, **E**›(`type`: any, `namespace`: any, `constructor`: ComponentConstructor‹D, T, E›): *function*

*Defined in [Node/component.ts:70](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/component.ts#L70)*

**Type parameters:**

▪ **D**

▪ **T**: *ComponentTemplates | void*

▪ **E**

**Parameters:**

Name | Type |
------ | ------ |
`type` | any |
`namespace` | any |
`constructor` | ComponentConstructor‹D, T, E› |

**Returns:** *function*

▸ (`nodeDef`: ComponentNodeFunctionParam‹D, E›, `templates?`: T): *[NodeRef](_index_.noderef.md)*

**Parameters:**

Name | Type |
------ | ------ |
`nodeDef` | ComponentNodeFunctionParam‹D, E› |
`templates?` | T |
