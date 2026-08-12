import { describe, it, expect, beforeEach } from "vitest";
import { Component } from "../../src/Node/component";
import { Computed, State, Value } from "../../src/Utils/decorators";
import { vNode } from "../../src/Node/vNode.types";
import { div, fragment, text } from "../../src/DOM/elements";

class ConditionalComponent extends Component {
  @Value()
  show: "login" | "admin" = "login";

  childrenRenderCount = 0;

  public Template(): vNode | vNode[] {
    return div({}, () => [
      // Isolated scope with no wrapper DOM node — the ternary is its own
      // reactive scope, so toggling showAdmin only re-renders this subtree.
      fragment({ data: () => this.show }, (show) => {
        this.childrenRenderCount++;
        switch (show) {
          case "admin":
            return div({ props: { className: "admin" } }, () => "ADMIN PANEL");
          case "login":
            return div({ props: { className: "login" } }, () => "LOGIN PROMPT");
        }
      }),
    ]);
  }
}

class NestedFragmentComponent extends Component {
  @Value()
  showExtra = false;

  public Template(): vNode | vNode[] {
    return div({}, () => [
      fragment({}, () => [
        div({}, () => "OUTER"),
        // Fragment nested inside a fragment — must reconcile into the real ancestor.
        fragment({}, () =>
          this.showExtra ? div({}, () => "EXTRA") : div({}, () => "BASE"),
        ),
      ]),
    ]);
  }
}

class FalsyDataComponent extends Component {
  @Value()
  show = false;

  public Template(): vNode | vNode[] {
    return div({}, () => [
      div({}, () => "HEADER"),
      // Falsy data hides the fragment's content entirely — no wrapper node.
      fragment({ data: () => this.show }, () => "SECRET PANEL"),
    ]);
  }
}

const falsyDataComponent = Component.ToFunction("falsy-data-component", FalsyDataComponent);

const nestedFragmentComponent = Component.ToFunction("nested-fragment-component", NestedFragmentComponent);

const conditionalComponent = Component.ToFunction("conditional-component", ConditionalComponent);

class TestComponent extends Component {
  @State()
  data = [1];

  @Value()
  dynamicValue = "FRAGMENT";

  rootRenderCount = 0;
  childRenderCount = 0;

  public Template(): vNode | vNode[] {
    return div({}, () => [
      div({}, () => `Root render count: ${++this.rootRenderCount}`),
      fragment({ data: () => this.data }, (int) => {
        const value = this.dynamicValue;
        return [
          div({}, () => `${int} + Child render count: ${++this.childRenderCount}`),
          text(() => `THIS IS THE BODY OF THE ${value}`)
        ];
      })
    ]);
  }
}

const testComponent = Component.ToFunction("test-component", TestComponent);

describe("Component Tests", () => {
  it("Component with Fragment", () => {
    // attach vnode to JSDOM element and validate behavior
    Component.Attach(document.body, testComponent({}));

    // Verify component rendered
    expect(document.body.innerHTML).toContain("THIS IS THE BODY OF THE FRAGMENT");

    // Clean up
    document.body.innerHTML = "";
  });

  it("Component with Fragment - Value changed", () => {
    const vnode = testComponent({});
    // attach vnode to JSDOM element and validate behavior
    Component.Attach(document.body, vnode);

    // Verify component rendered
    expect(document.body.innerHTML).toContain("THIS IS THE BODY OF THE FRAGMENT");

    (vnode.component as TestComponent).dynamicValue = "UPDATE";

    console.log(document.body.innerHTML);
    expect(document.body.innerHTML).toContain("THIS IS THE BODY OF THE UPDATE");

    (vnode.component as TestComponent).data.push(2);

    console.log(document.body.innerHTML);
    expect(document.body.innerHTML).toContain("THIS IS THE BODY OF THE UPDATE");
    // Clean up
    document.body.innerHTML = "";
  });

  it("Fragment - nested fragment reconciles into real ancestor", () => {
    const vnode = nestedFragmentComponent({});
    Component.Attach(document.body, vnode);

    expect(document.body.innerHTML).toContain("OUTER");
    expect(document.body.innerHTML).toContain("BASE");
    expect(document.body.innerHTML).not.toContain("EXTRA");

    (vnode.component as NestedFragmentComponent).showExtra = true;

    expect(document.body.innerHTML).toContain("EXTRA");
    expect(document.body.innerHTML).not.toContain("BASE");

    // Clean up
    document.body.innerHTML = "";
  });

  it("Fragment - falsy data hides content without a wrapper node", () => {
    const vnode = falsyDataComponent({});
    Component.Attach(document.body, vnode);

    // Falsy data -> fragment renders nothing, but siblings stay.
    expect(document.body.innerHTML).toContain("HEADER");
    expect(document.body.innerHTML).not.toContain("SECRET PANEL");

    (vnode.component as FalsyDataComponent).show = true;

    expect(document.body.innerHTML).toContain("SECRET PANEL");

    (vnode.component as FalsyDataComponent).show = false;

    expect(document.body.innerHTML).not.toContain("SECRET PANEL");
    expect(document.body.innerHTML).toContain("HEADER");

    // Clean up
    document.body.innerHTML = "";
  });

  it("Fragment - isolated scope, no wrapper node, ternary toggles", () => {
    const vnode = conditionalComponent({});
    Component.Attach(document.body, vnode);

    // Renders the false branch with no extra wrapper element.
    expect(document.body.innerHTML).toContain("LOGIN PROMPT");
    expect(document.body.innerHTML).not.toContain("ADMIN PANEL");

    (vnode.component as ConditionalComponent).show = "admin";

    expect(document.body.innerHTML).toContain("ADMIN PANEL");
    expect(document.body.innerHTML).not.toContain("LOGIN PROMPT");

    // Clean up
    document.body.innerHTML = "";
  });

  it("Fragment - data identity keying: same value emits but no DOM change", () => {
    const vnode = conditionalComponent({});
    Component.Attach(document.body, vnode);

    expect(document.body.innerHTML).toContain("LOGIN PROMPT");
    const initialCount = (vnode.component as ConditionalComponent).childrenRenderCount;

    // @Value() setter emits unconditionally, but the data identity is unchanged,
    // so MappedScope reuses the existing scope and the children are not re-created.
    (vnode.component as ConditionalComponent).show = "login";

    expect((vnode.component as ConditionalComponent).childrenRenderCount).toBe(initialCount);
    expect(document.body.innerHTML).toContain("LOGIN PROMPT");

    // Clean up
    document.body.innerHTML = "";
  });
});
