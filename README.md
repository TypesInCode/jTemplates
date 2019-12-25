# j-templates
Type-safe templating for the browser written in TypeScript.
## Install
```
npm install --save-dev j-templates
```
## Hello World
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
    secondProperty: 'second value'
});
```
Any values retrieved from a `Store` are read-only. A `Store` provides methods for modifying its root value.
```typescript
// Update overwrites the root of the store
// Returns a promise that resolves when the update is complete
store.Update({
    firstProperty: 'new first value',
    secondProperty: 'new second value'
}).then(() => console.log("Update complete"));

// Merge allows for a Partial<> value to be written
// Returns a promise that resolves when the merge is complete
store.Merge({
    firstProperty: 'merged first value'
}).then(() => console.log("Merge complete"));
```
A `Store` can be passed a callback to compute unique IDs on stored objects. Objects with an ID can be retrieved directly. If a second object with the same ID is saved to the `Store` it will overwrite the first.
```typescript
// Second parameter to Store contructor is a callback to calculate object IDs
var store = new StoreSync({}, (obj: any) => obj._id);
store.Write({ 
    _id: 'very-unique-id',
    property: 'useful data'
}).then(() => {
    var obj = store.Get<{ _id: string, property: string }>('very-unique-id');
    console.log(obj.property);
    // outputs: 'useful data'
});
```
### Scope
A `Scope` is used to observe changes made to any `Store`s or `Scope`s referenced during its value callback.  A `Store` provides a `Scope` to access its root value:
```typescript
console.log(store.Root.Value.firstProperty);
// outputs: 'merged first value'
```
A new `Scope` can be created from an existing `Scope`:
```typescript
var childScope = store.Root.Scope(root => root.firstProperty);
console.log(childScope.Value);
// outputs: 'merged first value'
```
OR a new `Scope` can be created directly:
```typescript
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

