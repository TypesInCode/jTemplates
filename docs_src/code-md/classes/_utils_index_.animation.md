[j-templates](../README.md) › [Globals](../globals.md) › ["Utils/index"](../modules/_utils_index_.md) › [Animation](_utils_index_.animation.md)

# Class: Animation

Provides the ability to interpolate and schedule events over a given range. Intended
to help animate parts of a page not accessible through CSS such as the scroll bar.

```ts
var animation = new Animation(AnimationType.EaseIn, 500, (next) => {
 this.state = { scrollTop: next };
});
animation.Animate(0, 100);
```

## Hierarchy

* **Animation**

## Index

### Constructors

* [constructor](_utils_index_.animation.md#constructor)

### Properties

* [animationTimeouts](_utils_index_.animation.md#private-animationtimeouts)
* [enabled](_utils_index_.animation.md#private-enabled)
* [end](_utils_index_.animation.md#private-end)
* [frameCount](_utils_index_.animation.md#private-framecount)
* [frameTimings](_utils_index_.animation.md#private-frametimings)
* [running](_utils_index_.animation.md#private-running)
* [start](_utils_index_.animation.md#private-start)
* [type](_utils_index_.animation.md#private-type)
* [update](_utils_index_.animation.md#private-update)

### Accessors

* [Enabled](_utils_index_.animation.md#enabled)
* [End](_utils_index_.animation.md#end)
* [Running](_utils_index_.animation.md#running)
* [Start](_utils_index_.animation.md#start)

### Methods

* [Animate](_utils_index_.animation.md#animate)
* [Cancel](_utils_index_.animation.md#cancel)
* [Destroy](_utils_index_.animation.md#destroy)
* [Disable](_utils_index_.animation.md#disable)
* [Enable](_utils_index_.animation.md#enable)
* [SetTimeout](_utils_index_.animation.md#private-settimeout)

## Constructors

###  constructor

\+ **new Animation**(`type`: [AnimationType](../enums/_utils_index_.animationtype.md), `duration`: number, `update`: function): *[Animation](_utils_index_.animation.md)*

*Defined in [Utils/animation.ts:82](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L82)*

**Parameters:**

▪ **type**: *[AnimationType](../enums/_utils_index_.animationtype.md)*

Interpolation function to use

▪ **duration**: *number*

Time in MS to schedule animation events over

▪ **update**: *function*

Callback used to emit the next value for the animation

▸ (`next`: number): *void*

**Parameters:**

Name | Type |
------ | ------ |
`next` | number |

**Returns:** *[Animation](_utils_index_.animation.md)*

## Properties

### `Private` animationTimeouts

• **animationTimeouts**: *Array‹any›*

*Defined in [Utils/animation.ts:50](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L50)*

___

### `Private` enabled

• **enabled**: *boolean*

*Defined in [Utils/animation.ts:54](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L54)*

___

### `Private` end

• **end**: *number*

*Defined in [Utils/animation.ts:53](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L53)*

___

### `Private` frameCount

• **frameCount**: *number*

*Defined in [Utils/animation.ts:47](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L47)*

___

### `Private` frameTimings

• **frameTimings**: *Array‹number›*

*Defined in [Utils/animation.ts:48](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L48)*

___

### `Private` running

• **running**: *boolean*

*Defined in [Utils/animation.ts:51](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L51)*

___

### `Private` start

• **start**: *number*

*Defined in [Utils/animation.ts:52](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L52)*

___

### `Private` type

• **type**: *[AnimationType](../enums/_utils_index_.animationtype.md)*

*Defined in [Utils/animation.ts:46](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L46)*

___

### `Private` update

• **update**: *function*

*Defined in [Utils/animation.ts:49](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L49)*

#### Type declaration:

▸ (`next`: number): *void*

**Parameters:**

Name | Type |
------ | ------ |
`next` | number |

## Accessors

###  Enabled

• **get Enabled**(): *boolean*

*Defined in [Utils/animation.ts:80](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L80)*

Whether or not the animation with run when Animate is called.

**Returns:** *boolean*

___

###  End

• **get End**(): *number*

*Defined in [Utils/animation.ts:73](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L73)*

The end of the range of the current animation.

**Returns:** *number*

___

###  Running

• **get Running**(): *boolean*

*Defined in [Utils/animation.ts:59](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L59)*

If an animation is currently running.

**Returns:** *boolean*

___

###  Start

• **get Start**(): *number*

*Defined in [Utils/animation.ts:66](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L66)*

The start of the range of the current animation.

**Returns:** *number*

## Methods

###  Animate

▸ **Animate**(`start`: number, `end`: number): *Promise‹void›*

*Defined in [Utils/animation.ts:114](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L114)*

Start a new animation. If an animation is running it is cancelled.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`start` | number | Beginning of the range to interpolate over |
`end` | number | End of the range to interpolate over  |

**Returns:** *Promise‹void›*

___

###  Cancel

▸ **Cancel**(): *void*

*Defined in [Utils/animation.ts:159](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L159)*

Cancel the current animation.

**Returns:** *void*

___

###  Destroy

▸ **Destroy**(): *void*

*Defined in [Utils/animation.ts:171](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L171)*

Destroy method cancels a running animation

**Returns:** *void*

___

###  Disable

▸ **Disable**(): *void*

*Defined in [Utils/animation.ts:144](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L144)*

Cancel a running animation and prevent new animations from starting

**Returns:** *void*

___

###  Enable

▸ **Enable**(): *void*

*Defined in [Utils/animation.ts:152](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L152)*

Allow new animations to start.

**Returns:** *void*

___

### `Private` SetTimeout

▸ **SetTimeout**(`index`: number, `value`: number, `resolve`: function): *void*

*Defined in [Utils/animation.ts:175](https://github.com/TypesInCode/jTemplates/blob/2f3395e/src/Utils/animation.ts#L175)*

**Parameters:**

▪ **index**: *number*

▪ **value**: *number*

▪ **resolve**: *function*

▸ (): *void*

**Returns:** *void*
