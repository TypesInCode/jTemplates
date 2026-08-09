1. ComponentEvents are intentionally different from DOM events. Standard DOM events cannot be subscribed
   to through a components `on` property. This is intentional to push design towards components explicitly
   declaring the events they support.
2. data: internally creates a scope. Scopes have native support for async functions (which return Promise<T>).
   When a scope function is async it automatically handles the promise and returns the resolved value.
3. @Computed is synchronous and so there's no need for an initial value because it can be computed immediately
   using the getter. Since ComputedAsync has an asynchronous calculation the default value is returned while
   the first value is being calculated.
4. Watch context is any function scope used to define an ObservableScope. For the framework this covers:
   - Any function used in an element/component definition including the children function.
   - The Template() function in a Component definition
   - The getter associated with an @Scope or @Computed(Async) decorator

   An @Watch() callback is not part of an ObservableScope definition. etc.
5. The ID allows for reuse in the current evaluation and across subsequent evaluations. If multiple gate()
   calls are used in a single ObservableScope definition they need an ID to differentiate them. If no ID
   is provided then the second call would just resolve to the first defined scope internally.
6. The second mapped (taking an array) doesn't exist and should be removed. This function has been changed
   since this document was written so the source code should be reviewed and more complete documentation should
   be written.
7. The issue underlying that comment is @Scope will pass through an existing reactive object so changes to the
   source data will still fire down-stream dependencies.
   Example:
   @Scope()
   get Value() {
     return this.some_reactive_object; 
   }

   @Scope() {
     this.Value.child_property; // This works if `this.some_reactive_object.child_property = 'new value'`
   }

   @Computed won't work because the value is copied and becomes a new reactive object. This copy only fires when
   source dependencies change. In the previous example `this.Value.child_property` is distinct from the source
   object it came from so changes to the source object will not also fire on the copy.

   This is a known limitation of the framework that I'm thinking through how to resolve effectively.

8. After the worker round-trip.
9. Yes. Null is a valid value for @State. The ObservableNode is created on first assignment.
10. The @Inject decorator does not actively inject. It replaces the property with a getter that lazily evaluates
    the provided token against the current injection hierarchy. It also defines a setter that assigns a value at
    the current tier in the hierarchy. The initializer is for setting a value for the current token. The getter
    tries to resolve a value for the token by looking up the hierarchy starting at the current level.
11. Yes. Some HTML attributes are not represented as object properties on the DOM so attrs is required to set
    those values.
12. This is more a question about the purpose of Web Components which are a standard browser feature. Nothing
    in the framework prevents a component from being Attached AND Registered.
13. The framework does not provide a lot of error handling. If a pending value is needed then a developer would
    need to wire that up themselves as a intermediary @Scope. Async ObservableScopes evaluate to `null` while
    the initial Promise is pending.
14. An emit from an ObservableScope does not also reevaluate the ObservableScope's value. That only occurs on the
    next read of the scope. Greedy scopes are used in cases where the new value must be known (i.e. to compare
    against the prior value). The reactive pattern generally relies on consumers to batch reads intelligently.
15. this.Data is just a read of an ObservableScope created from the function provided to the data: property.
    Any scopes that read (and thus subscribe) to this.Data will update when this.Data updates.
16. I'm not sure what the use case is for this question.
