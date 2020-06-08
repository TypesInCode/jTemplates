import { List, INode } from "./list";

const workTimeMs = 16;
const workList = new List<{(): void}>();

var running = false;
var workEndNode: INode<{(): void}> = null;

export namespace WorkSchedule {

    function DoWorkStep() {
        var startTime = Date.now();
        var callback = workList.Pop();
        while(callback && (Date.now() - startTime) < workTimeMs) {
            var parent = workEndNode;
            workEndNode = workList.HeadNode;
            callback();
            workEndNode = parent;
            callback = workList.Pop();
        }
        if(!callback)
            running = false;
        else {
            callback();
            ProcessWork();
        }
    }

    function ProcessWork() {
        setTimeout(DoWorkStep, 0);
    }

    function StartProcessWork() {
        if(running)
            return;

        running = true;
        ProcessWork();
    }

    function ScheduleWork(workCallback: {(): void}) {
        workList.AddBefore(workEndNode, workCallback);
        StartProcessWork();
    }

    export function Running() {
        return running;
    }

    export function Scope(scopeCallback: {(schedule: {(workCallback: {(): void}): void}): void}) {
        return new Promise(resolve => {
            var parent = workEndNode;
            workEndNode = workList.AddBefore(parent, resolve);
            scopeCallback(ScheduleWork);
            workEndNode = parent;
        });
    }

}