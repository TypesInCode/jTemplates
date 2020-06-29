import { ThreadAsync, Schedule, Callback, Thread, After } from "../../src/Utils/thread";

import { expect } from "chai";

describe("Thread", () => {
    it("Basic Thread", async () => {
        var fired = false;
        await ThreadAsync(() => {
            Schedule(() => {
                fired = true;
            });
        });
        expect(fired).to.be.true;
    });
    it("Callback", async () => {
        var arr = [false, false, false];
        await ThreadAsync(() => {
            arr.forEach(Callback((val, i) => {
                arr[i] = !val;
            }));
        });

        var allTrue = true;
        for(var x=0; x<arr.length && allTrue; x++)
            allTrue = allTrue && arr[x];

        expect(allTrue).to.be.true;
    });
    it("Two Callback Threads", async () => {
        var arr1 = [false, false, false];
        var prom1 = ThreadAsync(() => {
            arr1.forEach(Callback((val, i) => {
                arr1[i] = !val;
            }));
        });

        var arr2 = [false, false, false];
        var prom2 = ThreadAsync(() => {
            arr2.forEach(Callback((val, i) => {
                arr2[i] = !val;
            }));
        });

        var allFalse1 = true;
        for(var x=0; x<arr1.length && allFalse1; x++)
            allFalse1 = allFalse1 && !arr1[x];

        var allFalse2 = true;
        for(var x=0; x<arr2.length && allFalse2; x++)
            allFalse2 = allFalse2 && !arr2[x];

        await Promise.all([prom1, prom2]);

        var allTrue1 = true;
        for(var x=0; x<arr1.length && allTrue1; x++)
            allTrue1 = allTrue1 && arr1[x];

        var allTrue2 = true;
        for(var x=0; x<arr2.length && allTrue2; x++)
            allTrue2 = allTrue2 && arr2[x];

        expect(allFalse1 && allFalse2 && allTrue1 && allTrue2).to.be.true;
    });
    it("Nested Threads", async () => {
        var first = false;
        var schedule = false;
        var second = false;
        var secondDone = false;

        await ThreadAsync(() => {
            expect(!first && !schedule && !second && !secondDone).to.be.true;
            first = true;
            Schedule(() => {
                expect(first && !schedule && !second && !secondDone).to.be.true;
                schedule = true;
            });
            
            ThreadAsync(() => {
                expect(first && schedule && !second && !secondDone).to.be.true;
                second = true;
            }).then(() => {
                expect(first && schedule && second && !secondDone).to.be.true;
                secondDone = true;
            });
        });

        expect(first && schedule && second && secondDone).to.be.true;
    });
    it("After", async () => {
        var count = 0;
        var countTo = 1000;
        var countEquals = false;
        await ThreadAsync(() => {
            After(() => {
                countEquals = count === countTo;
            });

            for(var x = 0; x < countTo; x++)
                Schedule(() => {
                    count++;
                });
        });

        expect(countEquals).to.be.true;
    });
});