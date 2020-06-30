[j-templates](../README.md) › [Globals](../globals.md) › ["index"](../modules/_index_.md) › [NodeRef](_index_.noderef.md)

# Class: NodeRef

## Hierarchy

* **NodeRef**

## Index

### Constructors

* [constructor](_index_.noderef.md#constructor)

### Properties

* [childNodes](_index_.noderef.md#private-childnodes)
* [destroyed](_index_.noderef.md#private-destroyed)
* [injector](_index_.noderef.md#private-injector)
* [node](_index_.noderef.md#private-node)
* [parent](_index_.noderef.md#private-parent)

### Accessors

* [Destroyed](_index_.noderef.md#destroyed)
* [Injector](_index_.noderef.md#injector)
* [Node](_index_.noderef.md#node)

### Methods

* [AddChild](_index_.noderef.md#addchild)
* [AddChildAfter](_index_.noderef.md#addchildafter)
* [Destroy](_index_.noderef.md#destroy)
* [DestroyChildren](_index_.noderef.md#protected-destroychildren)
* [Detach](_index_.noderef.md#detach)
* [DetachChild](_index_.noderef.md#detachchild)
* [Init](_index_.noderef.md#init)

## Constructors

###  constructor

\+ **new NodeRef**(`node`: any, `injector`: Injector‹›): *[NodeRef](_index_.noderef.md)*

*Defined in [Node/nodeRef.ts:21](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L21)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`node` | any | - |
`injector` | Injector‹› | Injector.Current() |

**Returns:** *[NodeRef](_index_.noderef.md)*

## Properties

### `Private` childNodes

• **childNodes**: *Set‹[NodeRef](_index_.noderef.md)›*

*Defined in [Node/nodeRef.ts:7](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L7)*

___

### `Private` destroyed

• **destroyed**: *boolean*

*Defined in [Node/nodeRef.ts:8](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L8)*

___

### `Private` injector

• **injector**: *Injector*

*Defined in [Node/nodeRef.ts:9](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L9)*

___

### `Private` node

• **node**: *any*

*Defined in [Node/nodeRef.ts:5](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L5)*

___

### `Private` parent

• **parent**: *[NodeRef](_index_.noderef.md)*

*Defined in [Node/nodeRef.ts:6](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L6)*

## Accessors

###  Destroyed

• **get Destroyed**(): *boolean*

*Defined in [Node/nodeRef.ts:11](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L11)*

**Returns:** *boolean*

___

###  Injector

• **get Injector**(): *Injector‹›*

*Defined in [Node/nodeRef.ts:19](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L19)*

**Returns:** *Injector‹›*

___

###  Node

• **get Node**(): *any*

*Defined in [Node/nodeRef.ts:15](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L15)*

**Returns:** *any*

## Methods

###  AddChild

▸ **AddChild**(`nodeRef`: [NodeRef](_index_.noderef.md)): *void*

*Defined in [Node/nodeRef.ts:34](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L34)*

**Parameters:**

Name | Type |
------ | ------ |
`nodeRef` | [NodeRef](_index_.noderef.md) |

**Returns:** *void*

___

###  AddChildAfter

▸ **AddChildAfter**(`currentChild`: [NodeRef](_index_.noderef.md), `newChild`: [NodeRef](_index_.noderef.md)): *void*

*Defined in [Node/nodeRef.ts:40](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L40)*

**Parameters:**

Name | Type |
------ | ------ |
`currentChild` | [NodeRef](_index_.noderef.md) |
`newChild` | [NodeRef](_index_.noderef.md) |

**Returns:** *void*

___

###  Destroy

▸ **Destroy**(): *void*

*Defined in [Node/nodeRef.ts:62](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L62)*

**Returns:** *void*

___

### `Protected` DestroyChildren

▸ **DestroyChildren**(): *void*

*Defined in [Node/nodeRef.ts:70](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L70)*

**Returns:** *void*

___

###  Detach

▸ **Detach**(): *void*

*Defined in [Node/nodeRef.ts:57](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L57)*

**Returns:** *void*

___

###  DetachChild

▸ **DetachChild**(`nodeRef`: [NodeRef](_index_.noderef.md)): *void*

*Defined in [Node/nodeRef.ts:49](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L49)*

**Parameters:**

Name | Type |
------ | ------ |
`nodeRef` | [NodeRef](_index_.noderef.md) |

**Returns:** *void*

___

###  Init

▸ **Init**(): *void*

*Defined in [Node/nodeRef.ts:30](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Node/nodeRef.ts#L30)*

**Returns:** *void*
