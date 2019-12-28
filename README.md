# j-templates
Type-safe templating for the browser written in TypeScript.
## Install
```
npm install --save-dev j-templates
```
## Hello World - [sample](./docs/pages/helloWorld.md)
```typescript
import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';

class HelloWorld extends Component {

    public Template() {
        return div({ text: "Hello world" });
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
## State Management
### Store
The library provides two `Store` types: `StoreSync` and `StoreAsync`. The only difference is `StoreAsync` uses a WebWorker to calculate changes to the state of the Store.
```typescript
import { StoreSync } from 'j-templates/Store'

// Creates a store with the passed value as the root
var store = new StoreSync({
    firstProperty: 'first value',
    secondProperty: 'second value',
    array: [] as string[]
});
```
Any values retrieved from a `Store` are read-only. A `Store` provides methods for modifying its root value.
```typescript
// Update overwrites the root of the store
// Returns a Promise that resolves when the update is complete
store.Update({
    firstProperty: 'new first value',
    secondProperty: 'new second value',
    array: ['first array value']
}).then(() => console.log("Update complete"));

// Merge allows for a Partial<> value to be written
// Returns a Promise that resolves when the merge is complete
store.Merge({
    firstProperty: 'merged first value'
}).then(() => console.log("Merge complete"));
```
A `Store` can be passed a callback to compute unique IDs on stored objects. Objects with an ID can be retrieved directly. If a second object with the same ID is saved to the `Store` it will overwrite the first.
```typescript
// Second parameter to Store contructor is a callback to calculate object IDs
var store = new StoreSync({}, (obj: any) => obj._id);

// store.Write allows you to write an object with an ID to the store
// Returns a Promise that resolves when the Write is complete
store.Write({ 
    _id: 'very-unique-id',
    property: 'useful data'
}).then(() => console.log("Write complete"));
```
The above methods are wrappers for the store.Action method. store.Action can be used to perform more complicated updates. Calls to store.Action are queued and executed sequentially so it's important to `await` any `async` methods called within the store.Action callback.
```typescript
// store.Action async callback gets passed StoreReader and StoreWriter objects
// Returns a Promise that resolves when the Action is complete
store.Action(async (reader, writer) => {
    // reader is used to get objects from the Store
    var obj = reader.Get<{ _id: string, property: string }>('very-unique-id');
    // writer is used to modify objects retrieved by the reader
    await writer.Merge(obj, { property: 'changed useful data' });
}).then(() => console.log('Action complete'));
```
The `StoreWriter` object has methods similar to `Store` plus a few extra methods to assist with modifying arrays:
```typescript
store.Action(async (reader, writer) => {
    var obj = reader.Get<{ 
        _id: string, 
        property: string, 
        array: Array<string> 
    }>('very-unique-id');

    await writer.Push(obj.array, 'new array value');
});
```
Call Destroy on a `Store` when finished with it:
```typescript
store.Destroy();
```
### Scope
A `Scope` is used to observe changes made to any `Store`s or `Scope`s referenced during its value callback. A `Store` provides a `Scope` to access its root value:
```typescript
console.log(store.Root.Value.firstProperty);
// outputs: 'merged first value'
```
store.Query creates a `Scope` that can access items from the root or by ID.
```typescript
// store.Query callback gets passed a StoreReader object
var query = store.Query(reader => {
    // reader.Root is not a scope
    var rootValue = reader.Root;
    var idValue = reader.Get<{ _id: string, property: string }>('very-unique-id');
    return `${rootValue.firstProperty} - ${idValue.property}`;
});
```
A new `Scope` can be created from an existing `Scope`:
```typescript
// store.Root.Scope callback gets passed the current value of the scope
var childScope = store.Root.Scope(root => root.firstProperty);
console.log(childScope.Value);
// outputs: 'merged first value'
```
OR a new `Scope` can be created directly:
```typescript
import { Scope } from 'j-templates/Store';

// new Scope callback receives no parameters
var scope = new Scope(() => store.Root.Value.firstProperty);
console.log(scope.Value);
// outputs: 'merged first value'
```
To watch for changes to a `Scope`:
```typescript
scope.Watch((scope) => {
    console.log(scope.Value)
});
```
Call Destroy() on a `Scope` when finished with it:
```typescript
query.Destroy();
childScope.Destroy();
scope.Destroy();
```
## Building Components
```typescript
// 'Component' is the base type required for components. 
// 'NodeRef' is the base type for all types used in template definitions.
import { Component, NodeRef } from 'j-templates';
// div, h1 are template element functions
import { div, h1 } from 'j-templates/DOM';

// Type definition for the data this 'Component' can receive from a 
// parent 'Component'
interface IData {
    title: string;
}

// Type definition for the template definitions this 'Component' accepts 
// from a parent 'Component'
interface ITemplates {
    body: () => NodeRef | NodeRef[];
}

// Type definition for the events this `Component` supports. A `Component` does 
// not support standard DOM events and must define the events that can be 
// listened for by a parent `Component`. The type of the interface property 
// defines the type of the parameter passed when the event fires. Void indicates 
// no parameter is passed to the event.
interface IEvents {
    headerClick: void;
}

// Class definition extending Component. Component accepts three optional 
// generic types defining: Data, Templates, and Events.
class MyComponent extends Component<IData, ITemplates, IEvents> {
    // Store definition
    _store = new StoreSync({ headerToggled: false });
    // Scope definition
    _headerClassScope = this._store.Scope(root => {
        return root.headerToggled ? 'toggled' : 'not-toggled';
    });

    // getter to clean up accessing Scope value
    get HeaderClass() {
        return this._headerClassScope.Value;
    }

    // Component.Template definition function
    public Template() {
        return [
            // h1 element
            h1({
                // dynamic props binding. If a function is not used then a static
                // binding is created.
                // Type maps 1to1 to Partial<HTMLElement> type
                props: () => ({
                    className: this.HeaderClass
                }),
                // static on binding
                // IEvents type
                on: { 
                    click: () => {
                        // this.Fire fires 'Component' events
                        this.Fire("headerClick");
                    }
                },
                // dynamic text binding
                // sets the text of the element
                // this.Data contains data passed from the parent 'Component'
                text: () => this.Data.title 
            }),
            div({ props: { className: "body" } }, () => 
                // Templates passed from a parent component are available through
                // the this.Templates property
                this.Templates.body()
            )
        ]
    }

    // Component.Destroy to clean up Component
    public Destroy() {
        super.Destroy();
        this._headerClassScope.Destroy();
        this._store.Destroy();
    }

}

// Convert Component to function to be referenced in other templates
export var myComponent = Component.ToFunction("my-component", null, MyComponent);
```
### Using Components
```typescript
import { Component } from 'j-templates';
import { input } from 'j-templates/DOM';
import { myComponent } from './myComponent';

class RootComponent extends Component {

    _state = new StoreSync({ inputValue: "" });
    _inputValueScope = this._state.Scope(root => root.inputValue);
    get InputValue() {
        return this._inputValueScope.Value;
    }

    public Template() {
        return [
            input({ props: () => ({ value: this.InputValue }) }),
            myComponent({
                data: () => ({ title: this.InputValue })
            }, {
                body: () =>
                    div({ text: "passed from RootComponent" })
            })
        ]
    }

    public Destroy() {
        super.Destroy();
        this._state.Destroy();
        this._inputValueScope.Destroy();
    }
}

var rootComponent = Component.ToFunction("root-component", null, RootComponent);
Component.Attach(document.body, rootComponent({}));
```