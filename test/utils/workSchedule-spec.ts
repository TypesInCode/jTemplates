/// <reference path="../../node_modules/@types/mocha/index.d.ts" />

import { WorkSchedule } from "../../src/Utils/workSchedule";
import * as chai from "chai";
const expect = chai.expect;

describe("WorkSchedule", () => {
  it("Single Event", async () => {
    var fired = false;
    await WorkSchedule.Scope(schedule => {
        schedule(() => fired = true);
    });

    expect(fired).to.be.true;
    expect(WorkSchedule.Running()).to.be.false;
  });
  it("Nested Events", async () => {
    var fired = false;
    await WorkSchedule.Scope(schedule => {
        schedule(() => {
            WorkSchedule.Scope(schedule => {
                schedule(() => fired = true);
            });
        });
    });

    expect(fired).to.be.true;
    expect(WorkSchedule.Running()).to.be.false;
  });
});