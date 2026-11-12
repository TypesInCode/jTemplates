import { describe, it, expect } from "vitest";
import { Computed, State } from "../../src/Utils/decorators";
import { ObservableNode } from "../../src/Store/Tree/observableNode";
import { Opaque } from "../../src/Store/Tree/opaque";

class Holder {
  @State()
  label = "a";

  @Computed()
  get View(): any {
    return { view: new Opaque({ label: this.label, nodes: [{ id: "n1" }] }) };
  }
}

describe("@Computed with an Opaque", () => {
  it("holds an Opaque a getter returns whole, and replaces it when the getter reruns", () => {
    const holder = new Holder();
    const first = holder.View.view;
    expect(ObservableNode.Snapshot(first)).to.eq(undefined);
    expect(first.label).to.eq("a");
    expect(holder.View.view).to.eq(first);

    holder.label = "b";
    const second = holder.View.view;
    expect(second).not.to.eq(first);
    expect(second.label).to.eq("b");
    expect(first.label).to.eq("a");
  });
});
