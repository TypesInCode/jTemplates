import { Template, BindingDefinition, Component } from "./template";
import { div, span, ul, li, input, b, a, br, img, video, source, option, select, h1, h2, h3, table, th, tr, td } from "./DOM/elements";
import { StoreAsync } from "./Store/async/storeAsync";
import { Store } from "./Store/sync/store";
import { Scope } from "./Store/scope";
import { StoreAsyncWriter } from "./Store/async/storeAsyncWriter";
import { StoreAsyncReader } from "./Store/async/storeAsyncReader";
import { StoreAsyncQuery } from "./Store/async/storeAsyncQuery";
import { StoreWriter } from "./Store/sync/storeWriter";
import { StoreReader } from "./Store/sync/storeReader";
import { StoreQuery } from "./Store/sync/storeQuery";
// import { ObjectStoreScope } from "./ObjectStore/objectStoreScope";

export { Template, StoreAsync, StoreAsyncWriter, StoreAsyncReader, StoreAsyncQuery, Store, StoreWriter, StoreReader, StoreQuery, Scope, div, span, ul, li, input, b, a, br, img, video, source, option, select, h1, h2, h3, table, th, tr, td };

/* class Root extends Component<any, any> {

    Template() {
        return div({ text: "text" });
    }

}

var root = new Root("root");
root.AttachTo(document.getElementById("container")); */

/* function SyncTest() {
    var start = new Date();
    var store = Store.Create([{ id: "first", value: "this and that" }], (val) => val.id);
    var scope = store.Scope(root => root && root.length);

    store.Write(store.Root, (val) => {
        for(var x=0; x<10000; x++)
            val.push({
                id: "id_" + x,
                value: "value_" + x
            });
    });

    console.log(scope.Value);
    var end = new Date();
    console.log("on SYNC write complete");
    console.log(end.getTime() - start.getTime() + " milliseconds");
}

async function AsyncTest() {
    var start = new Date();
    var store = await StoreAsync.Create([{ id: "first", value: "this and that" }], (val) => val.id);
    var scope = store.Scope(root => root && root.length);

    await store.Write(store.Root, (val) => {
        for(var x=0; x<10000; x++)
            val.push({
                id: "id_" + x,
                value: "value_" + x
            });
    })
    console.log(scope.Value);
    await store.WriteComplete();
    var end = new Date();
    console.log("on ASYNC write complete");
    console.log(end.getTime() - start.getTime() + " milliseconds");
}

SyncTest();
console.log("between tests");
AsyncTest(); */

/* store.Write(store.Root, () => null).then(() => {
    var s = store;
    console.log("all done");
});

store.OnWriteComplete().then(() => {
    var end = new Date();
    console.log("on ASYNC write complete");
    console.log(end.getTime() - start.getTime() + " milliseconds");
}); */

/* interface IColumn {
    name: string;
    id: string;
    visible: boolean;
    sort: number;
}

interface ITableData {
    columns: Array<IColumn>;
    data: Array<any>;
}

interface ICellData {
    column: IColumn;
    data: any;
}

interface ITableCell {
    cell: (cell: Scope<ICellData>, index: number) => BindingDefinition<any, any>;
}

class DataTable extends Component<ITableData, ITableCell> {
    get DefaultTemplates() {
        return {
            cell: (scope: ICellData) => span({ text: () => {
                var data = scope;
                return `${data.data[scope.column.id]}`;
             } })
        };
    }

    Template(scope: Scope<ITableData>) {
        return [
            table({ key: d => d, data: () => [{ id: "header" }, ...scope.Value.data] }, (data: any, index: number) => {
                if(index === 0)
                    return tr({ key: c => c.id, data: () => scope.Value.columns }, (scope) => [
                        th({ text: () => scope.name })
                    ]);
                
                return tr({ key: c => c.id, data: () => scope.Value.columns }, (column, index) => [
                    td({ data: () => ({ column: column, data: data }) }, (scope) => this.Templates.cell(scope, index))
                ])
            })
        ];
    }
}

var dataTable = Template.ToFunction("datatable", DataTable);

class Root extends Template<any, any> {

    state = StoreAsync.Create({ filter: "" });

    columns = StoreAsync.Create([
        {
            id: "id",
            name: "Id",
            visible: true,
            sort: 0
        },
        {
            id: "name",
            name: "Name",
            visible: true,
            sort: 1
        },
        {
            id: "title",
            name: "Title",
            visible: true,
            sort: 2
        }
    ]);

    data = StoreAsync.Create([
        {
            id: 1,
            name: "Bart",
            title: "Title 1"
        },
        {
            id: 2,
            name: "Craig",
            title: "Title 2"
        }
    ]);

    dataScope = this.data.Scope((root) => root.filter(d => 
        d.name.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0 ||
        d.title.toLowerCase().indexOf(this.state.Root.filter.toLowerCase()) >= 0
    ));

    columnsScope = this.columns.Scope((root) => 
        root.filter(c => c.visible)
    ).Scope((val) => {
        val.sort((a, b) => a.sort - b.sort);
        return val;
    });

    constructor() {
        super("app");
    }

    Template() {
        return [
            input({ props: { type: 'text' }, on: { keyup: (e: any) => this.state.Root.filter = e.target.value } }),
            dataTable({ data: () => ({ columns: this.columnsScope.Value, data: this.dataScope.Value }) }),
            input({ props: { type: 'button', value: 'add' }, on: { click: () => {
                this.data.Write(this.data.Root, (val) => {
                    val.push({
                        id: this.data.Root.length + 1,
                        name: `garbage ${this.data.Root.length + 1}`,
                        title: `title ${this.data.Root.length + 1}`
                    });
                });
            } } }),
            ul({ data: this.columns.Root }, (column) => [
                li({}, () => [
                    input({ props: () => ({ type: "checkbox", checked: column.visible }), on: { 
                        change: () => column.visible = !column.visible
                    } }),
                    span({ text: () => column.name }),
                    input({ props: { type: "text", value: column.sort }, on: { keyup: (e: any) => {
                        var sort = parseInt(e.target.value);
                        if(!isNaN(sort))
                            column.sort = sort;
                    } } })
                ])
            ])
        ];
    }
}
var list = new Root();
list.AttachTo(document.getElementById("container"));

/* var store = ObjectStore.Create(["first", "third", "second"]);
var scope1 = new ObjectStoreScope(() => {
    console.log("updating scope 1");
    return store.Root.slice().sort();
});
scope1.addListener("set", () => console.log("Scope1 set"));

var scope2 = new ObjectStoreScope(() => {
    console.log("updating scope 2");
    return scope1.Value[scope1.Value.length - 1];
});
scope2.addListener("set", () => console.log("Scope2 set"));

console.log(scope2.Value);

store.Push(store.Root, "zzzz");

console.log(scope2.Value); */


/* class Store {
    todos = ObjectStore.Create([] as Array<{ task: string, completed: boolean, assignee: string }>);

    constructor() {
        var scope = new ObjectStoreScope(() => this.report);
        scope.addListener("set", () => console.log(scope.Value));
    }

    get report() {
        if(this.todos.Root.length === 0)
            return "<none>";

        return `Next todo: ${this.todos.Root[0].task}. Progress: ${this.completedCount}/${this.todos.Root.length}`;
    }

    get completedCount() {
        return this.todos.Root.filter(t => t.completed).length;
    }

    addTodo(val: string) {
        this.todos.Push(this.todos.Root, {
            task: val,
            completed: false,
            assignee: null
        });
    }
}

var t = new Store();
t.addTodo("val 1");
t.addTodo("val 2");
t.todos.Root[0].completed = true;
t.todos.Root[1].task = "changed val 2";
t.todos.Root[0].task = "changed val 1";

class TodoView extends Template<{ task: string, completed: boolean, assignee: string }, any> {

    Template(todo: { task: string, completed: boolean, assignee: string }) {
        return li({ on: () => ({ dblclick: this.onRename.bind(this, todo) }) }, () => [
            input({ 
                props: () => ({ type: 'checkbox', checked: todo.completed }), 
                on: () => ({ change: this.onToggleCompleted.bind(this, todo) }) 
            }),
            span({ text: () => `${todo.task} ${todo.assignee || ''}` }),
        ]);
    }

    onToggleCompleted(todo: { task: string, completed: boolean, assignee: string }) {
        todo.completed = !todo.completed;
    }

    onRename(todo: { task: string, completed: boolean, assignee: string }) {
        todo.task = prompt('Task name', todo.task) || todo.task;
    }

}

var todoView = Template.ToFunction("ul", TodoView);

class TodoList extends Template<any, any> {

    constructor() {
        super("todo-list");
    }

    Template() {
        return div({}, () => [
            span({ text: () => t.report }),
            todoView({ data: () => t.todos.Root }),
            input({ props: () => ({ type: "button", value: "New Todo" }), on: () => ({ click: this.onNewTodo.bind(this) }) })
        ]);
    }

    onNewTodo() {
        t.addTodo(prompt("Enter a new todo:"));
    }

}

var list = new TodoList();
list.AttachTo(document.getElementById("container")); */

