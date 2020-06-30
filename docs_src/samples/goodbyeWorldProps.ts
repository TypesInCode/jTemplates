import { Component } from 'j-templates';
import { span, br, style, div } from 'j-templates/DOM';

class HelloGoodbyeWorld extends Component {

    public Template() {
        return [
            style({ attrs: { type: "text/css" } }, () => `
                .red {
                    color: red;
                }

                .blue {
                    color: blue;
                }
            `),
            div({}, () => [
                span({ 
                    attrs: { 
                        class: "blue" 
                    } 
                }, () => "Hello world"),
                br({}),
                span({ 
                    props: { 
                        className: "red", 
                        style: { 
                            fontWeight: "bold" 
                        } 
                    },
                    on: {
                        click: () => alert("Goobye!")
                    }
                }, () => "Goodbye world")
            ])
        ];
    }

}

var helloGoodbyeWorld = Component.ToFunction("hellogoodbye-world", null, HelloGoodbyeWorld);
Component.Attach(document.body, helloGoodbyeWorld({}));
