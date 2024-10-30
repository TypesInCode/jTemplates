# j-templates
Type-safe templating for the browser.
## Install
```
npm install --save-dev j-templates
```

Framework for building reactive browser applications:
* TypeScript only - no extra transpile or compile steps
* Bundler agnostic - bundle using your preferred library
* Low dependencies - hello world only requires this + a bundler to get started

## Hello World
```typescript
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class HelloWorld extends Component {

    public Template() {
        return div({}, () => "Hello world");
    }

}

var helloWorld = Component.ToFunction("hello-world", HelloWorld);
Component.Attach(document.body, helloWorld({}));
```
### Resulting HTML
```html
<hello-world>
    <div>Hello world</div>
</hello-world>
```

[More Examples](https://typesincode.github.io/jTemplates/)
