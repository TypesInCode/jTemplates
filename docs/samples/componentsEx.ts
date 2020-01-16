import { Component } from 'j-templates';
import { span } from 'j-templates/DOM';

class ChildComponent extends Component {

    public Template() {
        return span({}, () => "Child Component");
    }

}

var childComponent = Component.ToFunction("child-component", null, ChildComponent);

class RootComponent extends Component {

    public Template() {
        return childComponent({});
    }

}

var rootComponent = Component.ToFunction("root-component", null, RootComponent);
Component.Attach(document.body, rootComponent({}));