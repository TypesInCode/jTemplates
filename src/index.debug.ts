import { WorkSchedule } from "./Utils/workSchedule";


var fired = false;
WorkSchedule.Scope(schedule => {
    var startTime = Date.now();
    schedule(() => {
        console.log("Firing 1");
        WorkSchedule.Scope(schedule => {
            schedule(() => {
                fired = true;
                console.log("Firing NESTED 1");
            });
        });
    });

    schedule(() => {
        console.log("Firing 2");
        WorkSchedule.Scope(schedule => {
            schedule(() => {
                fired = true;
                console.log("Firing NESTED 2");
            })
        });

        schedule(() => {
            console.log("Firing 2 SECOND");
        })
    });

    schedule(() => console.log("END TOP LEVEL " + (Date.now() - startTime) + "ms"));
}).then(() => {
    console.log("TOP LEVEL RESOLVED");
});