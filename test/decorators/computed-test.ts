import { describe, it, expect, beforeEach } from "vitest";
import { Component } from "../../src/Node/component";
import { Computed, State } from "../../src/Utils/decorators";
import { vNode } from "../../src/Node/vNode.types";
import { div } from "../../src/DOM/elements";

class TestComponent extends Component {
  state = { value: "custom string value" };

  @Computed()
  get State() {
    return this.state;
  }

  public Template(): vNode | vNode[] {
    const value = this.State.value;
    return div({}, () => value);
  }
}

const testComponent = Component.ToFunction("test-component", TestComponent);

class TestComponent2 extends Component {
  @State()
  state = { value: "string value" };

  @Computed()
  get State() {
    return { state: this.state };
  }

  public Template(): vNode | vNode[] {
    return div({}, () => this.State.state.value);
  }
}

const testComponent2 = Component.ToFunction("test-component", TestComponent2);

class TestComponent3 extends Component {
  @State()
  state = [
    { value: "first" },
    { value: "second" }
  ];

  @Computed()
  get State() {
    return this.state.slice().sort((a, b) => a.value < b.value ? -1 : a.value === b.value ? 0 : 1);
  }

  public Template(): vNode | vNode[] {
    return div({ data: () => this.State }, (val) => val.value);
  }
}

const testComponent3 = Component.ToFunction("test-component", TestComponent3);

describe("Computed Decorator", () => {
  it("Should initialize correctly and bind to the DOM", () => {
    // attach vnode to JSDOM element and validate behavior
    Component.Attach(document.body, testComponent({}));

    // Verify component rendered
    expect(document.body.innerHTML).toContain("test-component");
    expect(document.body.innerHTML).toContain("custom string value");

    // Clean up
    document.body.innerHTML = "";
  });

  it("Testing ObservableNode written to @Computed", () => {
    // attach vnode to JSDOM element and validate behavior
    const node = testComponent2({});
    Component.Attach(document.body, node);

    // Verify component rendered
    expect(document.body.innerHTML).toContain("test-component");
    expect(document.body.innerHTML).toContain("string value");

    (node.component as TestComponent2).state.value = "string changed";

    expect(document.body.innerHTML).toContain("string changed");
    // Clean up
    document.body.innerHTML = "";
  });

  it("Testing sorted ObservableNode array writte to @Computed", () => {
    const node = testComponent3({});

    Component.Attach(document.body, node);

    expect(document.body.innerHTML).toContain("first");

    (node.component as TestComponent3).state[0].value = "zounds";

    expect(document.body.innerHTML).toContain("second");
    expect(document.body.innerHTML).toContain("zounds");
    // Clean up
    document.body.innerHTML = "";
  });
});
