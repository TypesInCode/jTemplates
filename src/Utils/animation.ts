import { IDestroyable } from "./utils.types";

namespace StepFunctions {
    export function* EaseIn(count: number) {
        var diff = 1 / count;
        for(var t = diff, x = 0; x < count; x++, t += diff)
            yield (1-t)*(1-t)*(1-t)*0 + 3*(1-t)*(1-t)*t*1 + 3*(1-t)*t*t*1 + t*t*t*1;
    }

    export function* Linear(count: number) {
        var diff = 1 / count;
        for(var t = diff, x = 0; x < count; x++, t += diff)
            yield t;
    }
}

/**
 * Supported animation functions.
 */
export enum AnimationType {
    Linear,
    EaseIn
}

/**
 * Class for handling interpolation for basic animations.
 */
export class Animation implements IDestroyable {
    private type: AnimationType;
    private frameCount: number;
    private frameTimings: Array<number>;
    private update: {(next: number): void};
    private animationTimeouts: Array<any>;
    private running: boolean;
    private start: number;
    private end: number;
    private enabled: boolean;

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
    constructor(type: AnimationType, duration: number, update: {(next: number): void}) {
        this.running = false;
        this.start = null;
        this.end = null;
        this.enabled = true;
        this.type = type;

        this.frameCount = Math.ceil((duration/1000) * 60);
        this.frameTimings = [];

        var frameTime = duration / this.frameCount;
        for(var x=0; x<this.frameCount; x++)
            this.frameTimings[x] = (x + 1)*frameTime;
        
        this.update = update;
        this.animationTimeouts = [];
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
        if(!this.enabled)
            return;
        
        var diff = end - start;
        if(diff === 0)
            return;

        this.Cancel();
        this.running = true;
        this.start = start;
        this.end = end;
        return new Promise<void>(resolve => {
            var stepFunc = (StepFunctions as any)[AnimationType[this.type]] as {(count: number): Generator<number>};
            var index = 0;
            for(var step of stepFunc(this.frameCount)) {
                var value = (step * diff) + start;
                this.SetTimeout(index, value, index === (this.frameCount - 1) ? resolve : null);
                index++;
            }
        }).then(() => {
            this.running = false;
            this.start = null;
            this.end = null;
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
        for(var x=0; x<this.animationTimeouts.length; x++)
            clearTimeout(this.animationTimeouts[x]);

        this.running = false;
        this.start = null;
        this.end = null;
    }

    /**
     * IDestroyable. Cancels the animation.
     */
    public Destroy() {
        this.Cancel();
    }

    /**
     * Sets an animation timeout for the provided index.
     * 
     * @param index Index of the animation being set
     * @param value Value to pass to the update callback
     * @param resolve Optional resolve callback to signal the end of the animation
     */
    private SetTimeout(index: number, value: number, resolve?: {(): void}) {
        this.animationTimeouts[index] = setTimeout(() => {
            this.update(value);
            resolve && resolve();
        }, this.frameTimings[index])
    }

}