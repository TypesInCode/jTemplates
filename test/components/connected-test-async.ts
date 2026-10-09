import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Component } from "../../src/Node/component";
import { Value } from "../../src/Utils/decorators";
import { vNode } from "../../src/Node/vNode.types";
import { div, fragment } from "../../src/DOM/elements";

type LifecycleEvent = [event: "Bound" | "Connected", name: string, isConnected: boolean];

let log: LifecycleEvent[] = [];

function connected(name: string) {
  return log.filter((e) => e[1] === name && e[0] === "Connected");
}

class Tracked extends Component<{ name: string }> {
  public get Name() {
    return this.Data.name;
  }

  public Bound() {
    super.Bound();
    log.push(["Bound", this.Name, (this.VNode.node as HTMLElement).isConnected]);
  }

  public Connected() {
    super.Connected();
    log.push(["Connected", this.Name, (this.VNode.node as HTMLElement).isConnected]);
  }
}

class Leaf extends Tracked {
  public Template(): vNode | vNode[] {
    return div({ props: { className: "leaf" } }, () => this.Name);
  }
}

const leaf = Component.ToFunction("leaf-component", Leaf);

class Toggle extends Tracked {
  @Value()
  show = false;

  public Template(): vNode | vNode[] {
    return div({}, () => [
      leaf({ data: () => ({ name: "child" }) }),
      fragment({ data: () => this.show }, () =>
        leaf({ data: () => ({ name: "late" }) }),
      ),
    ]);
  }
}

const toggle = Component.ToFunction("toggle-component", Toggle);

describe("Component Connected (async scheduling)", () => {
  beforeEach(() => {
    log = [];
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("fires on each component after Bound, with its node in the document", async () => {
    Component.Attach(document.body, toggle({ data: () => ({ name: "root" }) }));
    await vi.waitFor(() => expect(connected("child").length).toBe(1));

    for (const name of ["root", "child"]) {
      const mine = log.filter((e) => e[1] === name);
      expect(mine.map((e) => e[0])).toEqual(["Bound", "Connected"]);
      expect(mine[1][2]).toBe(true);
    }
  });

  it("fires on a component rendered later by a change, once it is in the document", async () => {
    const vnode = toggle({ data: () => ({ name: "root" }) });
    Component.Attach(document.body, vnode);
    await vi.waitFor(() => expect(connected("child").length).toBe(1));
    expect(connected("late")).toEqual([]);

    (vnode.component as unknown as Toggle).show = true;

    await vi.waitFor(() => expect(connected("late").length).toBe(1));
    expect(document.body.querySelectorAll(".leaf").length).toBe(2);
    expect(connected("late")).toEqual([["Connected", "late", true]]);
  });
});
