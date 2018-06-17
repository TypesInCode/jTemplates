import { Observable } from "./Observable/observable";
import { BindingTemplate } from "./DOM/bindingTemplate";
import browser from "./DOM/browser";
import { div } from "./DOM/elementMethods";
import { Component } from ".";
import { ComponentMethod, component } from "./DOM/elements";

class RootComponent extends Component<any> {

  public State = Observable.Create({ name: "Start Name" });

  public static get Name(): string {
      return "RootComponent";
  }

  public get Template() {
      return div({}, 
          childComponent({ text: this.State.name })
      )
  };

}

class ChildComponent extends Component<{ text: string }> {

  State = Observable.Create({ text: "" });
  
  public static get Name(): string {
      return "ChildComponent";
  }

  public get Template() {
      return div({ text: () => this.State.text });
  }

  public SetParentData(data: { text: string }) {
      Observable.GetFrom(this.State.text).Join(data.text);
  }
}

var childComponent: ComponentMethod<{ text: string }> = component.bind(null, ChildComponent);

var fragment = browser.createDocumentFragment();

var root = new RootComponent();
root.AttachTo(fragment);

var elem = fragment.childNodes[0] as HTMLElement;
console.log(elem.innerHTML);
root.State.name = "second name";
console.log(elem.innerHTML);