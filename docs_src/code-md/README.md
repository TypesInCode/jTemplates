[j-templates](README.md) › [Globals](globals.md)

# j-templates

# j-templates
Type-safe templating for the browser.
## Install
```
npm install --save-dev j-templates
```
## Hello World - [sample](https://typesincode.github.io/jTemplates/pages/helloWorld.html)
```typescript
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class HelloWorld extends Component {

    public Template() {
        return div({}, () => "Hello world");
    }

}

var helloWorld = Component.ToFunction("hello-world", null, HelloWorld);
Component.Attach(document.body, hellowWorld({}));
```
### Resulting HTML
```html
<hello-world>
    <div>Hello world</div>
</hello-world>
```

## [More Examples](https://typesincode.github.io/jTemplates/)
