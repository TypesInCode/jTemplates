import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Component } from "../../src/Node/component";
import { Value } from "../../src/Utils/decorators";
import { vNode } from "../../src/Node/vNode.types";
import { div, fragment } from "../../src/DOM/elements";

type LifecycleEvent = [event: "Bound" | "Connected", name: string, isConnected: boolean];

let log: LifecycleEvent[] = [];

function events(name: string) {
  return log.filter((e) => e[1] === name);
}

function connectedCount(name: string) {
  return events(name).filter((e) => e[0] === "Connected").length;
}

// Records each lifecycle call with whether the component's node was in the document.
class Tracked extends Component<{ name: string }> {
  public get Name() {
    return this.Data.name;
  }

  public get Node() {
    return this.VNode.node as HTMLElement;
  }

  public Bound() {
    super.Bound();
    log.push(["Bound", this.Name, this.Node.isConnected]);
  }

  public Connected() {
    super.Connected();
    log.push(["Connected", this.Name, this.Node.isConnected]);
  }
}

class Leaf extends Tracked {
  public Template(): vNode | vNode[] {
    return div({ props: { className: "leaf" } }, () => this.Name);
  }
}

const leaf = Component.ToFunction("leaf-component", Leaf);

class Root extends Tracked {
  public Template(): vNode | vNode[] {
    return div({}, () => [leaf({ data: () => ({ name: "child" }) })]);
  }
}

const root = Component.ToFunction("root-component", Root);

// A component several elements deep, under another component.
class DeepRoot extends Tracked {
  public Template(): vNode | vNode[] {
    return div({}, () => [
      div({}, () => [
        div({}, () => [leaf({ data: () => ({ name: "middle" }) })]),
      ]),
    ]);
  }
}

const deepRoot = Component.ToFunction("deep-root-component", DeepRoot);

class Middle extends Tracked {
  public Template(): vNode | vNode[] {
    return div({}, () => [leaf({ data: () => ({ name: "grandchild" }) })]);
  }
}

const middle = Component.ToFunction("middle-component", Middle);

// Component → component → component, each one a direct child of the one above.
class Nested extends Tracked {
  public Template(): vNode | vNode[] {
    return middle({ data: () => ({ name: "middle" }) });
  }
}

const nested = Component.ToFunction("nested-component", Nested);

class InFragment extends Tracked {
  public Template(): vNode | vNode[] {
    return div({}, () => [
      fragment({}, () => [leaf({ data: () => ({ name: "in-fragment" }) })]),
    ]);
  }
}

const inFragment = Component.ToFunction("in-fragment-component", InFragment);

// A child that is rendered later, when `show` changes.
class Toggle extends Tracked {
  @Value()
  show = false;

  @Value()
  label = "a";

  public Template(): vNode | vNode[] {
    return div({}, () => [
      div({ props: { className: "label" } }, () => this.label),
      fragment({ data: () => this.show }, () =>
        leaf({ data: () => ({ name: "late" }) }),
      ),
    ]);
  }
}

const toggle = Component.ToFunction("toggle-component", Toggle);

// A component whose own top-level children change, not those of an element inside it.
class Switch extends Tracked {
  @Value()
  on = false;

  public Template(): vNode | vNode[] {
    return this.on
      ? div({ props: { className: "on" } }, () => "on")
      : div({ props: { className: "off" } }, () => "off");
  }
}

const switcher = Component.ToFunction("switch-component", Switch);

describe("Component Connected", () => {
  beforeEach(() => {
    log = [];
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("fires on the attached component once its node is in the document", () => {
    Component.Attach(document.body, leaf({ data: () => ({ name: "root" }) }));

    expect(events("root").filter((e) => e[0] === "Connected")).toEqual([
      ["Connected", "root", true],
    ]);
  });

  it("fires on a child component once its node is in the document", () => {
    Component.Attach(document.body, root({ data: () => ({ name: "root" }) }));

    expect(events("child").filter((e) => e[0] === "Connected")).toEqual([
      ["Connected", "child", true],
    ]);
  });

  it("fires after Bound", () => {
    Component.Attach(document.body, root({ data: () => ({ name: "root" }) }));

    expect(events("child").map((e) => e[0])).toEqual(["Bound", "Connected"]);
    expect(events("root").map((e) => e[0])).toEqual(["Bound", "Connected"]);
  });

  it("fires on a component nested inside several elements", () => {
    Component.Attach(document.body, deepRoot({ data: () => ({ name: "root" }) }));

    expect(connectedCount("middle")).toBe(1);
    expect(events("middle").find((e) => e[0] === "Connected")?.[2]).toBe(true);
  });

  it("fires on every component of a nested component tree", () => {
    Component.Attach(document.body, nested({ data: () => ({ name: "root" }) }));

    expect(connectedCount("root")).toBe(1);
    expect(connectedCount("middle")).toBe(1);
    expect(connectedCount("grandchild")).toBe(1);
    expect(log.filter((e) => e[0] === "Connected").every((e) => e[2])).toBe(true);
  });

  it("fires on a component rendered inside a fragment", () => {
    Component.Attach(document.body, inFragment({ data: () => ({ name: "root" }) }));

    expect(events("in-fragment").filter((e) => e[0] === "Connected")).toEqual([
      ["Connected", "in-fragment", true],
    ]);
  });

  it("fires on a component rendered later by a change", () => {
    const vnode = toggle({ data: () => ({ name: "root" }) });
    Component.Attach(document.body, vnode);
    expect(connectedCount("late")).toBe(0);

    (vnode.component as unknown as Toggle).show = true;

    expect(document.body.querySelector(".leaf")?.textContent).toBe("late");
    expect(events("late").filter((e) => e[0] === "Connected")).toEqual([
      ["Connected", "late", true],
    ]);
  });

  it("fires only once while the component stays in the document", () => {
    const vnode = toggle({ data: () => ({ name: "root" }) });
    Component.Attach(document.body, vnode);
    const component = vnode.component as unknown as Toggle;
    component.show = true;

    component.label = "b";
    component.label = "c";

    expect(document.body.querySelector(".label")?.textContent).toBe("c");
    expect(connectedCount("root")).toBe(1);
    expect(connectedCount("late")).toBe(1);
  });

  it("fires only once when the component's own template output changes", () => {
    const vnode = switcher({ data: () => ({ name: "root" }) });
    Component.Attach(document.body, vnode);
    const component = vnode.component as unknown as Switch;

    component.on = true;
    component.on = false;

    expect(document.body.querySelector(".off")).not.toBeNull();
    expect(connectedCount("root")).toBe(1);
  });

  it("fires again on a new instance when a removed child is rendered again", () => {
    const vnode = toggle({ data: () => ({ name: "root" }) });
    Component.Attach(document.body, vnode);
    const component = vnode.component as unknown as Toggle;

    component.show = true;
    component.show = false;
    expect(document.body.querySelector(".leaf")).toBeNull();
    component.show = true;

    expect(connectedCount("late")).toBe(2);
  });

  it("does not fire while the tree is attached to a detached node", () => {
    const detached = document.createElement("div");
    Component.Attach(detached, root({ data: () => ({ name: "root" }) }));

    expect(detached.querySelector(".leaf")?.textContent).toBe("child");
    expect(connectedCount("root")).toBe(0);
    expect(connectedCount("child")).toBe(0);
  });

  it("keeps rendering as before alongside the new event", () => {
    Component.Attach(document.body, root({ data: () => ({ name: "root" }) }));

    expect(document.body.querySelectorAll("root-component").length).toBe(1);
    expect(document.body.querySelector("root-component leaf-component .leaf")?.textContent).toBe("child");
  });
});
