import { describe, it, expect, beforeEach } from "vitest";
import { Component } from "../../src/Node/component";
import { Computed } from "../../src/Utils/decorators";
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

describe("Computed Decorator", () => {
  it("Should initialize correctly and bind to the DOM", async () => {
    // attach vnode to JSDOM element and validate behavior
    Component.Attach(document.body, testComponent({}));

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify component rendered
    expect(document.body.innerHTML).toContain("test-component");
    expect(document.body.innerHTML).toContain("custom string value");

    // Clean up
    document.body.innerHTML = "";
  });
});
