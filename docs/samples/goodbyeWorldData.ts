import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class HelloGoodbyeWorld extends Component {

    public Template() {
        return [
            div({ data: () => ["Hello world", "Goodbye world"] }, (message) => 
                div({ data: () => message }, (msg) => msg)
            ),
            div({ data: () => false }, () => 
                div({}, () => "Not rendered")
            )
        ];
    }

}

var helloGoodbyeWorld = Component.ToFunction("hellogoodbye-world", null, HelloGoodbyeWorld);
Component.Attach(document.body, helloGoodbyeWorld({}));
