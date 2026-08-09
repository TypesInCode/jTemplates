1. The StoreSync is created lazily on first read. After that updates are pull from the source on emit.
2. This ID is limited to the current scope. Not global. This applies to all three helper functions.
3. Yes.
4. Yes.
5. This is the intended behavior. If a placeholder is needed then it is up to the developer to implement.
6. This framework is unique in that components do not really own the host element. It is available through
   this.VNode.node but there isn't framework support for interacting with it. DOM listeners would be attached
   to a root element defined in Template().
7. Yes.
8. Yes, values are associated with tokens at the Component level. The framework doesn't have a thing that lives
   above a component (like an Angular module) so generally DI is configured in the root component. More
   complicated scenarios can have DI settings happening at lower levels also.

