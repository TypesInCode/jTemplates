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

## Documentation

Comprehensive documentation for j-templates framework patterns is available in the `docs/` directory:

- **[Framework Patterns](docs/patterns/index.md)** - Complete guide to all core patterns
  - [Component Architecture](docs/patterns/01-component-architecture.md)
  - [Reactive State Management](docs/patterns/02-reactive-state-management.md)
  - [Decorators](docs/patterns/03-decorators.md)
  - [Dependency Injection](docs/patterns/04-dependency-injection.md)
  - [Component Composition](docs/patterns/05-component-composition.md)
  - [Animation System](docs/patterns/06-animation-system.md)
  - [Template System](docs/patterns/07-template-system.md)
  - [Data Modeling](docs/patterns/08-data-modeling.md)

See the Real-Time Dashboard example for practical demonstrations of all patterns:

```bash
cd examples/real_time_dashboard
npm install
npm run dev
```
