import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class HelloGoodbyeWorld extends Component {

    public Template() {
        return [
            div({ data: () => ["Hello world", "Goodbye world"] /* string[] */ }, (message /* string */) => 
                div({ data: () => message /* string */ }, (msg /* string */ ) => msg)
            ),
            div({ data: () => false }, () => 
                div({}, () => "Not rendered")
            )
        ];
    }

}

var helloGoodbyeWorld = Component.ToFunction("hellogoodbye-world", null, HelloGoodbyeWorld);
Component.Attach(document.body, helloGoodbyeWorld({}));
