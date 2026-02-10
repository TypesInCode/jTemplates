# Animation System

## Overview

The Animation System in j-templates provides smooth value transitions using interpolation. Animations are integrated with the framework's lifecycle management through IDestroyable, ensuring automatic cleanup and preventing memory leaks from interval timers.

## Key Concepts

- **Animation class**: Handles interpolation with configurable timing functions
- **AnimationType enum**: Linear and EaseIn interpolation modes
- **IDestroyable**: Automatic cleanup pattern for animation resources
- **NodeConfig.scheduleUpdate**: Efficient DOM update batching
- **Callback-based updates**: Customizable update callbacks for each frame

## API Reference

### Enum: AnimationType

Supported animation interpolation functions.

| Value | Description |
|-------|-------------|
| `Linear` | Linear interpolation between start and end values |
| `EaseIn` | Ease-in interpolation (starts slow, accelerates) |

### Class: Animation

Class for handling interpolation for basic animations.

**Constructor:**
```typescript
constructor(
  type: AnimationType,
  duration: number,
  update: { (next: number): void }
)
```

**Parameters:**
- `type`: Interpolation function (AnimationType)
- `duration`: Duration of animation in milliseconds
- `update`: Callback invoked during animation with interpolated values

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `Running` | `boolean` | Is the animation currently running |
| `Start` | `number` | The starting value of the current animation |
| `End` | `number` | The ending value of the current animation |
| `Enabled` | `boolean` | Is this animation enabled |

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `Animate()` | `(start: number, end: number): Promise<void>` | Start an animation |
| `Disable()` | `(): void` | Disables the animation, cancels if running |
| `Enable()` | `(): void` | Enables the animation |
| `Cancel()` | `(): void` | Cancels the animation if running |
| `Destroy()` | `(): void` | Stop animation and clean up resources |

## Usage Examples

### Basic Animation with @Destroy

```typescript
class NumberCard extends Component<{ title: string; value: number }> {
  @Destroy()
  animateCardValue = new Animation(AnimationType.Linear, 500, (next) => {
    this.cardValue = Math.floor(next);
  });
  
  @Value()
  cardValue = 0;
  
  @Watch((comp) => comp.Data.value)
  setCardValue(value: number) {
    this.animateCardValue.Animate(this.cardValue, value);
  }
  
  Template() {
    return [
      h1({}, () => this.Data.title),
      div({}, () => `${this.cardValue}`)
    ];
  }
}
```

### Animation with Callback Updates

```typescript
@Destroy()
animateOpacity = new Animation(AnimationType.EaseIn, 300, (next) => {
  element.style.opacity = String(next);
});

// Start animation
animateOpacity.Animate(0, 1).then(() => {
  console.log("Animation complete");
});
```

### IDestroyable Implementation for Timer

```typescript
export class RefreshTimer implements IDestroyable {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  
  constructor(private onRefresh: () => void, private interval: number) {}
  
  start(): void {
    if (this.intervalId === null) {
      this.intervalId = setInterval(this.onRefresh, this.interval);
    }
  }
  
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  Destroy(): void {
    this.stop();
  }
}

// Usage
class App extends Component {
  @Destroy()
  timer = new RefreshTimer(() => this.refreshData(), 500);
}
```

### Multiple Animation Types

```typescript
@Destroy()
animateFade = new Animation(AnimationType.EaseIn, 300, (next) => {
  this.opacity = next;
});

@Destroy()
animateMove = new Animation(AnimationType.Linear, 500, (next) => {
  this.position = next;
});
```

### Async Animation Handling

```typescript
async animateSequence() {
  await this.animateFade.Animate(1, 0);  // Fade out
  this.element.classList.add("hidden");
  await this.animateMove.Animate(0, 100);  // Move
  this.element.classList.remove("hidden");
  await this.animateFade.Animate(0, 1);  // Fade in
}
```

### Disable/Enable Animations

```typescript
// Temporarily disable animation
animateFade.Disable();
// Perform instant changes
this.opacity = 0;
// Re-enable animation
animateFade.Enable();
```

### Cancel Running Animation

```typescript
// Start an animation
animateProgress.Animate(0, 100);

// Later, cancel if needed
if (shouldCancel) {
  animateProgress.Cancel();
}
```

### Animation with Progress Tracking

```typescript
@Destroy()
animateProgress = new Animation(AnimationType.Linear, 1000, (next) => {
  const progress = Math.round(next);
  console.log(`Progress: ${progress}%`);
  this.progressBar.style.width = `${progress}%`;
});

// Get animation state
const start = animateProgress.Start;
const end = animateProgress.End;
const isRunning = animateProgress.Running;
```

## Framework Integration

Animation System integrates with:

- **@Destroy decorator**: Automatic cleanup of animation resources
- **IDestroyable**: Pattern for cleanup-aware classes
- **NodeConfig.scheduleUpdate**: Efficient DOM updates
- **Component Architecture**: Animations work within Component lifecycle

## Best Practices

- **Always use @Destroy**: Mark animation instances with @Destroy to prevent memory leaks
- **Use appropriate duration**: Short animations (200-500ms) for responsiveness
- **Clean up on destroy**: Implement IDestroyable for classes with intervals
- **Consider performance**: Use CSS transitions for simple property animations
- **Handle async properly**: Use Promise return values for sequential animations
- **Cancel when needed**: Use Cancel() to stop running animations
- **Disable for instant changes**: Use Disable() for non-animated updates

## Related Patterns

- **@Destroy decorator**: Automatic cleanup of animation resources
- **IDestroyable**: Pattern for cleanup-aware classes
- **Component Architecture**: Animations work within Component lifecycle

## Framework Source

- `src/Utils/animation.ts` - Animation class implementation
- `src/Node/nodeConfig.ts` - NodeConfig for efficient updates

## References

- [Number Card - Animation Usage](../../examples/real_time_dashboard/src/components/number-card.ts)
- [Refresh Timer - IDestroyable](../../examples/real_time_dashboard/src/services/refreshTimer.ts)
