---
layout: post
title: "jTemplates Documentation: Animation"
date: 2025-12-07
categories: documentation
---

In jTemplates, animations are handled through the `Animation` class, which provides a simple way to create smooth transitions between values. This class supports different interpolation functions and can be easily integrated with components to create engaging user interfaces.

## Importing Animation

To use animations, import the `Animation` class from the `j-templates/Utils` module:

```typescript
import { Animation, AnimationType } from 'j-templates/Utils';
```

## Creating an Animation

The `Animation` class constructor takes three parameters:

1. `type`: The interpolation function to use (either `AnimationType.Linear` or `AnimationType.EaseIn`)
2. `duration`: The duration of the animation in milliseconds
3. `update`: A callback function that will be invoked during the animation with the next interpolated value

```typescript
const animation = new Animation(
  AnimationType.Linear,
  500, // 500ms duration
  (nextValue) => {
    // Update your component's state or DOM with the next value
    console.log('Current animation value:', nextValue);
  }
);
```

## Using Animation

To start an animation, call the `Animate` method with a start and end value:

```typescript
// Start animating from 0 to 100
animation.Animate(0, 100).then(() => {
  console.log('Animation complete!');
});
```

The `Animate` method returns a `Promise<void>` that resolves when the animation is complete, making it easy to chain animations or perform actions after completion.

## Animation Controls

The `Animation` class provides methods to control the animation:

- `Disable()`: Disables the animation completely
- `Enable()`: Enables the animation
- `Cancel()`: Cancels the animation if it's currently running

## Integration with Components

Animations are often used in components to create smooth transitions for visual changes. Here's an example of how you might use an Animation in a component:

```typescript
import { Component } from 'j-templates';
import { Animation, AnimationType } from 'j-templates/Utils';

class MyComponent extends Component<{ value: number }, void, void> {
  private animation: Animation;
  private currentAnimationValue: number = 0;

  constructor() {
    super(
      { value: 0 },
      null,
      null,
      null
    );
    
    this.animation = new Animation(
      AnimationType.EaseIn,
      1000,
      (nextValue) => {
        this.currentAnimationValue = nextValue;
        // Trigger re-render with new value
        this.VNode.Update();
      }
    );
  }

  public async animateValue(toValue: number) {
    await this.animation.Animate(this.Data.value, toValue);
  }

  public Template() {
    return div(
      { style: `width: ${this.currentAnimationValue}px` },
      () => this.Data.value
    );
  }
}
```

## Animation Types

jTemplates provides two interpolation types:

1. `AnimationType.Linear`: Creates a linear interpolation between values
2. `AnimationType.EaseIn`: Creates a smooth easing effect that starts slowly and accelerates

## Best Practices

- Always handle the Promise returned by `Animate()` if you need to perform actions after the animation completes
- Use `Cancel()` to prevent animations from running when components are destroyed
- Consider using `Disable()` to temporarily pause animations without canceling them
- Make sure to update your component's state or DOM in the update callback to see the animation effect

Animations in jTemplates provide a simple yet powerful way to add smooth transitions to your UI components, enhancing the user experience without requiring complex animation libraries.