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
    private start: number;
    private end: number;
    private enabled: boolean;

    public get Running() {
        return this.running;
    }

    public get Start() {
        return this.start;
    }

    public get End() {
        return this.end;
    }

    public get Enabled() {
        return this.enabled;
    }

    constructor(type: AnimationType, duration: number, update: {(next: number): void}) {
        this.running = false;
        this.start = null;
        this.end = null;
        this.enabled = true;
        this.type = type;

        this.frameCount = Math.ceil((duration/1000) * 60);
        this.frameTimings = []; // new Array(this.frameCount);

        var frameTime = duration / this.frameCount;
        for(var x=0; x<this.frameCount; x++)
            this.frameTimings[x] = (x + 1)*frameTime;
        
        this.update = update;
        this.animationTimeouts = []; // new Array(this.frameCount);
    }

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
        return new Promise(resolve => {
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

    public Disable() {
        this.Cancel();
        this.enabled = false;
    }

    public Enable() {
        this.enabled = true;
    }

    public Cancel() {
        for(var x=0; x<this.animationTimeouts.length; x++)
            clearTimeout(this.animationTimeouts[x]);

        this.running = false;
        this.start = null;
        this.end = null;
    }

    public Destroy() {
        this.Cancel();
    }

    private SetTimeout(index: number, value: number, resolve: {(): void}) {
        this.animationTimeouts[index] = setTimeout(() => {
            this.update(value);
            resolve && resolve();
        }, this.frameTimings[index])
    }

}