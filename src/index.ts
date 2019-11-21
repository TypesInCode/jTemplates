import { Scope } from "./Store/scope/scope";
import { StoreAsync } from "./Store/storeAsync";
import { StoreSync } from "./Store/storeSync";
import { AbstractStore, Store } from "./Store/store/store";
import { NodeRef } from "./Node/nodeRef";
import { Component } from "./Node/component";

export { Component, NodeRef, AbstractStore, Store, StoreSync, StoreAsync, Scope };

/* import { div, input, li, span, ul } from "./DOM/elements";

var arr = [];
for(var x=0; x<1000; x++)
    arr[x] = "value " + x;


class TestComp extends Component<{ val: string}, { body: NodeRef }, { click: string }> {

    public Template() {
        return div({}, () => [
            div({ text: "testComp " + this.Scope.Value.val, on: { click: () => this.Fire("click", `clicked on ${this.Scope.Value.val}`)} }),
            this.Templates.body
        ]);
    }

}

var testComp = Component.ToFunction<{val: string}, {body: NodeRef}, { click: string}>("test-comp", null, TestComp);

var rootNode = div({ props: { id: "test" }, static: arr }, (value, i) => [
    div({ text: "child node " + value }),
    input({ props: { type: "checkbox" } }),
    testComp({ static: { val: "child " + value }, on: { click: (event) => console.debug(event.detail) } }, {
        body: div({ text: " " + i })
    })
]);

var node = new NodeRef(document.getElementById("container"));
node.AddChild(rootNode); */


// import { div, span, ul, li, input, b, a, br, img, video, source, option, select, h1, h2, h3, table, th, tr, td } from "./DOM/elements";

/* class TestTemplate extends Template<any, any> {
    private store = new StoreSync({ name: "TemplateName", data: [{ val: "first val" }, { val: "second value" }] });

    constructor() {
        super("test-template");
    }

    protected Template() {
        return [
            div({ text: () => this.store.Root.Value.name }),
            div({ data: () => this.store.Root.Value.data }, (data) => 
                div({ text: () => data.val })
            )
        ]
    }
}

var list = new TestTemplate();
list.AttachTo(document.getElementById("container")); */

// var todoServerArray = [] as Array<{ id: number, task: string, completed: boolean, assignee: string, deleted: boolean }>;

/* interface ToDo { id: number, task: string, completed: boolean, assignee: Assignee, deleted: boolean }
interface Assignee { id: number, name: string }

class TodoStore extends StoreAsync<{ loading: boolean, todos: Array<ToDo>, assignees: Array<Assignee> }> {
    private nextId = 100;
    // private todos = new StoreAsync((val) => val.id, { loading: false, todos: [] as Array<ToDo>, assignees: [] as Array<Assignee> }); //Store.Create({ loading: false, todos: [] as Array<ToDo>, assignees: [] as Array<Assignee> }, (val) => val.id);

    private todoQuery = this.Query("todos", [], async (reader, writer) => {

        return reader.Root.todos;
    });

    private assigneeQuery = this.Query("assignees", [], async reader => {
        return reader.Root.assignees;
    });

    private loadingQuery = this.Query("loading", false, async (reader) => {
        return reader.Root.loading;
    });

    private completedScope = this.todoQuery.Scope(root => {
        // return 10;
        return root.filter(t => t.completed).length;
    });

    private reportScope = this.todoQuery.Scope(root => {
        // return "static";

        if(!root || root.length === 0)
            return "<none>";

        var nextTask = root.find((val) => !val.completed);
        return `Next todo: ${nextTask ? nextTask.task : 'none'}. Progress: ${this.CompletedCount}/${root.length}`;
    });

    private smallReportScope = this.reportScope.Scope(report => {
        return report.replace(/[a-z]{3}[\s:]/gi, " ");
    });

    public get Assignees() {
        return this.assigneeQuery.Value;
    }

    public get ToDos() {
        return this.todoQuery.Value;
    }

    public get Report() {
        return this.reportScope.Value;
    }

    public get SmallReport() {
        return this.smallReportScope.Value;
    }

    public get CompletedCount() {
        return this.completedScope.Value;
    }

    public get Loading() {
        return this.loadingQuery.Value;
    }

    constructor() {
        super({ loading: false, todos: [] as Array<ToDo>, assignees: [] as Array<Assignee> }, (val: any) => val.id);
    }

    addTodo(val: string) {
        var nextTodo = {
            id: this.nextId++,
            task: val,
            completed: false,
            deleted: false,
            assignee: null as any
        };
        this.Action(async (reader, writer) => {
            await writer.Push(reader.Root.todos, nextTodo);
        });
    }

    removeTodo(todo: { id: number }) {
        this.Action(async (reader, writer) => {
            var index = reader.Root.todos.findIndex(t => t.id === todo.id);
            writer.Splice(reader.Root.todos, index, 1);
        });
    }

    replaceTodos() {
        this.Action(async (reader, writer) => {
            var newTodos = [];
            for(var x=0; x<10000; x++) {
                newTodos.push({
                    id: this.nextId++,
                    task: `New todo ${this.nextId}`,
                    completed: (Math.random() >= .5),
                    deleted: false,
                    assignee: null
                });
            }
            await writer.Update(reader.Root.todos, newTodos);
        });
    }

    addAssignee(name: string) {
        var nextAssignee = {
            id: 100000 + this.nextId++,
            name: name
        };
        this.Action(async (reader, writer) => {
            await writer.Push(reader.Root.assignees, nextAssignee);
        });
    }

    setAssignee(todoId: number, assigneeId: number) {
        this.Action(async (reader, writer) => {
            var todo = reader.Get<ToDo>(todoId.toString());
            var assignee = reader.Get<Assignee>(assigneeId.toString());
            await writer.Update(todo, (todo) => { todo.assignee = assignee });
        });
    }

    resetIds() {
        this.nextId = 100;
    }
}

var t = new TodoStore();
t.addTodo("val 1");
t.addTodo("val 2");
t.addAssignee("Bart Simpson");
t.addAssignee("Homer Simpson");

interface ITemplates {
    remove(data: ToDo): NodeRef[];
    append(): NodeRef[];
}

class TodoView extends Component<ToDo[], ITemplates> {

    Template() {
        return ul({ key: (todo) => todo.id, data: () => this.Data }, (todo) => 
            li({ on: () => ({ dblclick: () => this.onRename(todo) }) }, () => [
                input({ 
                    props: () => ({ type: 'checkbox', checked: todo.completed }), 
                    on: { change: () => this.onToggleCompleted(todo) }
                }),
                span({ 
                    text: () => `${todo.task} ${(todo.assignee && todo.assignee.name) || ''}`, 
                    props: { 
                        style: { color: "red" } 
                    } 
                }),
                span({}, () => this.Templates.remove(todo)),
                input({ 
                    props: () => ({ type: "input", value: todo.assignee && todo.assignee.id || '' }),
                    on: { keyup: this.onAssigneeIdChange.bind(this, todo) }
                }),
                span({}, () => this.Templates.append())
            ])
        )
    }

    onToggleCompleted(todo: ToDo) {
        var store = this.Injector.Get(AbstractStore);
        store.Action(async (reader, writer) => {
            await writer.Update(todo, (todo) => { todo.completed = !todo.completed });
        })
        // store.Update(todo, (todo) => { todo.completed = !todo.completed });
    }

    onRename(todo: ToDo) {
        var store = this.Injector.Get(AbstractStore);
        store.Action(async (reader, writer) => {
            writer.Update(todo, (todo) => todo.task = prompt('Task name', todo.task) || todo.task);
        });
        // store.Update(todo, (todo) => todo.task = prompt('Task name', todo.task) || todo.task);
        // todo.task = prompt('Task name', todo.task) || todo.task;
    }

    onAssigneeIdChange(todo: ToDo, event: Event) {
        var value = (event.target as HTMLInputElement).value;
        var id = parseInt(value);
        if(!isNaN(id)) {
            var store = this.Injector.Get(TodoStore);
            store.setAssignee(todo.id, id);
        }
    }

}

var todoView = Component.ToFunction("todo-view", null, TodoView); // Template.ToFunction("ul", TodoView);

class TodoList extends Component {

    public Init() {
        this.Injector.Set(AbstractStore, t);
    }

    Template() {
        return div({ props: { style: { color: "red" } } }, () => [
            div({ text: () => t.Report }),
            div({ text: () => t.SmallReport }),
            todoView({ data: () => t.ToDos }, {
                remove: (data) => [
                    input({ 
                        props: { type: "button", value: "delete" }, 
                        on: { click: this.onRemoveTodo.bind(this, data) } 
                    })
                ],
                append: () => [
                    span({ text: "appended" }),
                    span({ text: "next" })
                ]
            }),
            div({ text: () => t.Loading ? 'Loading...' : '' }),
            input({ 
                props: { type: "button", value: "New Todo" }, 
                on: { click: this.onNewTodo.bind(this) } 
            }),
            input({ 
                props: { type: "button", value: "Replace Todos" }, 
                on: { click: this.onReplaceTodos.bind(this) } 
            }),
            input({
                props: { type: "button", value: "Reset IDs"},
                on: { click: this.onResetIds.bind(this) }
            }),
            div({ key: (val) => val.id, data: () => t.Assignees }, (assignee) => 
                div({ 
                    text: () => `${assignee.id} - ${assignee.name}`,
                    on: { dblclick: this.onAssigneeDblClick.bind(this, assignee) }
                })
            )
        ]);
    }

    onNewTodo() {
        t.addTodo(prompt("Enter a new todo:"));
    }

    onRemoveTodo(data: any) {
        t.removeTodo(data);
    }

    onReplaceTodos() {
        t.replaceTodos();
    }

    onResetIds() {
        t.resetIds();
    }

    onAssigneeDblClick(assignee: Assignee) {
        var store = this.Injector.Get(AbstractStore);
        store.Action(async (reader, writer) => {
            await writer.Update(assignee, (ass) => { ass.name = prompt("New Name", assignee.name) || assignee.name });
        });
        // store.Update(assignee, (ass) => { ass.name = prompt("New Name", assignee.name) || assignee.name });
        // assignee.name = prompt("New Name", assignee.name) || assignee.name;
    }
}

Component.Render(document.getElementById("container"), "todo-list", null, TodoList);
/* var list = new TodoList();
list.AttachTo(document.getElementById("container")); */