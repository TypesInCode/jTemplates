import { describe, it, expect, beforeEach } from "vitest";
import { Component } from "../../src/Node/component";
import { Computed, Inject, State } from "../../src/Utils/decorators";
import { vNode } from "../../src/Node/vNode.types";
import { div } from "../../src/DOM/elements";
import { Injector } from "../../src/Utils/injector";

class DIService {
  getString() {
    return "DI STRING FROM ROOT";
  }
}

class TestService {
  Injector = new Injector();

  @Inject(DIService)
  injectedString!: DIService;

  getNameOfService() {
    return "Test Service! " + this.injectedString.getString();
  }
  
}

class TestComponent extends Component {
  @Inject(TestService)
  service = new TestService();

  public Template(): vNode | vNode[] {
    return div({}, () => this.service.getNameOfService());
  }
}

const testComponent = Component.ToFunction("test-component", TestComponent);

describe("Inject Decorator", () => {
  it("Inject decorator should allow access to current injection context", () => {
    const rootInjector = new Injector();
    rootInjector.Set(DIService, new DIService());
    // attach vnode to JSDOM element and validate behavior
    Component.Attach(document.body, Injector.Scope(rootInjector, testComponent, {}));

    // Verify component rendered
    expect(document.body.innerHTML).toContain("test-component");
    expect(document.body.innerHTML).toContain("DI STRING FROM ROOT");

    // Clean up
    document.body.innerHTML = "";
  });
});
