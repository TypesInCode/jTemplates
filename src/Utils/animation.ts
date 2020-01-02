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

export enum AnimationType {
    Linear,
    EaseIn
}

export class Animation {
    private type: AnimationType;
    private frameCount: number;
    private frameTimings: Array<number>;
    private update: {(next: number): void};
    private animationTimeouts: Array<any>;
    private running: boolean;

    public get Running() {
        return this.running;
    }

    constructor(type: AnimationType, duration: number, update: {(next: number): void}) {
        this.running = false;
        this.type = type;

        this.frameCount = (duration/1000) * 60;
        this.frameTimings = new Array(this.frameCount);

        var frameTime = duration / this.frameCount;
        for(var x=0; x<this.frameCount; x++)
            this.frameTimings[x] = (x + 1)*frameTime;
        
        this.update = update;
        this.animationTimeouts = new Array(this.frameCount);
    }

    public Animate(start: number, end: number): Promise<void> {
        this.Cancel();

        this.running = true;
        var diff = end - start;
        return new Promise(resolve => {
            var stepFunc = (StepFunctions as any)[AnimationType[this.type]] as {(count: number): Generator<number>};
            var index = 0;
            for(var step of stepFunc(this.frameCount)) {
                var value = (step * diff) + start;
                this.SetTimeout(index, this.frameTimings[index], value, index === (this.frameCount - 1) ? resolve : null);
                index++;
            }
        }).then(() => {
            this.running = false;
        });
    }

    public Cancel() {
        for(var x=0; x<this.animationTimeouts.length; x++)
            clearTimeout(this.animationTimeouts[x]);

        this.running = false;
    }

    private SetTimeout(index: number, delay: number, value: number, resolve: {(): void}) {
        this.animationTimeouts[index] = setTimeout(() => {
            this.update(value);
            resolve && resolve();
        }, delay)
    }

}