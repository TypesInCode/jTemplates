import { NodeConfig } from "../Node/nodeConfig";
import { IDestroyable } from "./utils.types";

namespace StepFunctions {
  export function EaseIn(start: number, duration: number) {
    const elapsed = Date.now() - start;
    const percent = Math.min(elapsed / duration, 1);

    return (
      (1 - percent) * (1 - percent) * (1 - percent) * 0 +
      3 * (1 - percent) * (1 - percent) * percent * 1 +
      3 * (1 - percent) * percent * percent * 1 +
      percent * percent * percent * 1
    );
  }

  export function Linear(start: number, duration: number) {
    const elapsed = Date.now() - start;
    const percent = Math.min(elapsed / duration, 1);

    return percent;
  }
}

/**
 * Supported animation functions.
 */
export enum AnimationType {
  Linear,
  EaseIn,
}

/**
 * Class for handling interpolation for basic animations.
 */
export class Animation implements IDestroyable {
  private type: AnimationType;
  private running: boolean;
  private start: number;
  private end: number;
  private enabled: boolean;
  private animationStart: number = 0;
  private animationDuration: number;
  private animationUpdate: (next: number) => void;
  private animationRun: () => void = null;

  /**
   * Is the animation currently running.
   */
  public get Running() {
    return this.running;
  }

  /**
   * The starting value of the current animation.
   */
  public get Start() {
    return this.start;
  }

  /**
   * The ending value of the current animation.
   */
  public get End() {
    return this.end;
  }

  /**
   * Is this animation enabled.
   */
  public get Enabled() {
    return this.enabled;
  }

  /**
   * @param type Interpolation function
   * @param duration The duration of the Animation
   * @param update Callback invoked during the animation with the next value
   */
  constructor(
    type: AnimationType,
    duration: number,
    update: { (next: number): void },
  ) {
    this.running = false;
    this.start = null;
    this.end = null;
    this.enabled = true;
    this.type = type;
    this.animationDuration = duration;
    this.animationUpdate = NodeConfig.wrapPriorityUpdates(update);
  }

  /**
   * Start an animation. Calls the passed `update` callback for each animation frame
   * with interpolated values based on the passed `AnimationType`.
   *
   * @param start initial animation value
   * @param end ending animation value
   * @returns Promise<void> that resolves once the animation is complete
   */
  public Animate(start: number, end: number): Promise<void> {
    if (!this.enabled) return;

    const diff = end - start;
    if (diff === 0) return;

    this.Cancel();
    this.animationStart = Date.now();
    this.running = true;
    this.start = start;
    this.end = end;
    return new Promise<void>((resolve) => {
      const stepFunc =
        StepFunctions[AnimationType[this.type] as keyof typeof StepFunctions];
      const animationRun = () => {
        if (this.animationRun !== animationRun) return;

        const percent = stepFunc(this.animationStart, this.animationDuration);
        const step = percent * diff;
        const next = this.start + step;
        this.animationUpdate(next);

        if (percent < 1) NodeConfig.scheduleUpdate(this.animationRun);
        else {
          resolve();
        }
      };

      this.animationRun = animationRun;
      NodeConfig.scheduleUpdate(this.animationRun);
    }).then(() => {
      this.Cancel();
    });
  }

  /**
   * Disables the Animation. Cancels the animation if it is running.
   */
  public Disable() {
    this.Cancel();
    this.enabled = false;
  }

  /**
   * Enables the Animation.
   */
  public Enable() {
    this.enabled = true;
  }

  /**
   * Cancels the Animation if it is running by clearing any sheduled timeout events.
   */
  public Cancel() {
    this.running = false;
    this.start = null;
    this.end = null;
    this.animationRun = null;
  }

  /**
   * IDestroyable. Cancels the animation.
   */
  public Destroy() {
    this.Disable();
  }
}
