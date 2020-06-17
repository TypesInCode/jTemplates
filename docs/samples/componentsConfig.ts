import { Component, NodeRef } from 'j-templates';
import { span, div } from 'j-templates/DOM';

interface IData {
    text: string
}

interface ITemplates {
    header: {(): NodeRef | NodeRef[] }
}

interface IEvents {
    customClick: number
}

class ChildComponent extends Component<IData, ITemplates, IEvents>  {

    public Template() {
        return [
            div({}, () => this.Templates.header()),
            div({
                on: { click: () => this.Fire("customClick", Date.now()) }
            }, () => this.Data.text)
        ]
    }

}

var childComponent = Component.ToFunction("child-component", null, ChildComponent);

class RootComponent extends Component {

    public Template() {
        return childComponent({
            data: () => ({ text: "From Parent" }),
            on: {
                customClick: (data) => alert("customClick " + data)
            }
        }, {
            header: () =>
                div({}, () => "Root Component Header")
        });
    }

}

var rootComponent = Component.ToFunction("root-component", null, RootComponent);
Component.Attach(document.body, rootComponent({}));