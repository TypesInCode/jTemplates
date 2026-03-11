import { Component } from "j-templates";
import { Value } from "j-templates/Utils";
import { div, h1, h2, h3, p, span, button, table, thead, tbody, tr, th, td } from "j-templates/DOM";
import { vNode } from "j-templates/Node/vNode.types";

// ============================================================================
// Data Models
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  active: boolean;
}

const users: User[] = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin", active: true },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "user", active: true },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "guest", active: false },
];

// ============================================================================
// Simple List Component - Using Framework Data Iteration and Events
// ============================================================================

interface SimpleListData {
  items: string[];
}

interface SimpleListEvents {
  select: { index: number; item: string };
}

class SimpleList extends Component<SimpleListData, void, SimpleListEvents> {
  @Value() selectedIndex: number = -1;

  Template() {
    const { items } = this.Data;

    return div({ props: { className: "simple-list" } }, () => [
      p({}, () => `Items: ${items.length}`),
      // Framework data iteration - passes single item to children function
      // No calc() needed - array is already reactive via @State, and items reference doesn't change
      // Note: indexOf() works for primitives but is O(n). For dynamic arrays with identity tracking,
      // consider using calc() when parent scope changes but array reference stays the same.
      div({ data: () => items }, (item: string) => {
        const index = items.indexOf(item);
        return div({
          props: () => ({
            className: this.selectedIndex === index ? "selected list-item" : "list-item"
          }),
          on: {
            click: () => {
              this.selectedIndex = index;
              // Fire component event to parent
              this.Fire("select", { index, item });
            }
          }
        }, () => item);
      })
    ]);
  }
}

const simpleList = Component.ToFunction("simple-list", SimpleList);

// ============================================================================
// Card Component
// ============================================================================

interface CardData {
  title: string;
  content: string;
  footer?: string;
}

class Card extends Component<CardData> {
  Template() {
    const { title, content, footer } = this.Data;

    return div({ props: { className: "card" } }, () => [
      div({ props: { className: "card-header" } }, () => title),
      div({ props: { className: "card-content" } }, () => content),
      footer ? div({ props: { className: "card-footer" } }, () => footer) : div({}, () => "")
    ]);
  }
}

const card = Component.ToFunction("card", Card);

// ============================================================================
// Table Component - Using Framework Data Iteration
// ============================================================================

interface TableData {
  headers: string[];
  rows: string[][];
}

class SimpleTable extends Component<TableData> {
  Template() {
    const { headers, rows } = this.Data;

    return table({ props: { className: "simple-table" } }, [
      thead({}, () =>
        tr({}, () =>
          // Headers are static - use map in children array
          headers.map((header) => th({}, () => header))
        )
      ),
      // Use framework data iteration for rows
      // No calc() needed - rows reference from parent data doesn't change
      tbody({ data: () => rows }, (row: string[]) =>
        tr({}, () =>
          // Cells are static for each row - use map
          row.map((cell) => td({}, () => cell))
        )
      )
    ]);
  }
}

const simpleTable = Component.ToFunction("simple-table", SimpleTable);

// ============================================================================
// Generic List Component with Template Functions
// ============================================================================
// This demonstrates the IMPORTANT pattern of passing templates to components

interface GenericListData<T> {
  items: T[];
  emptyMessage?: string;
}

interface GenericListTemplate<T> {
  item: (data: T, index: number) => vNode;
}

interface GenericListEvents<T> {
  select: { index: number; data: T };
}

class GenericList<T> extends Component<GenericListData<T>, GenericListTemplate<T>, GenericListEvents<T>> {
  @Value() selectedIndex: number = -1;

  Template() {
    const { items, emptyMessage } = this.Data;
    const templates = this.Templates;

    if (!items || items.length === 0) {
      return div({ props: { className: "list-empty" } }, () => emptyMessage || "No items");
    }

    return div({ props: { className: "generic-list" } }, () => [
      p({}, () => `Items: ${items.length}`),
      // No calc() needed - items reference from parent data doesn't change
      div({ data: () => items }, (item: T) => {
        const index = items.indexOf(item);
        return div({
          props: () => ({
            className: this.selectedIndex === index ? "selected list-item" : "list-item"
          }),
          on: {
            click: () => {
              this.selectedIndex = index;
              this.Fire("select", { index, data: item });
            }
          }
        }, () => templates.item(item, index));
      })
    ]);
  }
}

function createGenericList<T>() {
  return Component.ToFunction("generic-list", GenericList<T>);
}

const genericList = createGenericList() as <T>(
  config: Parameters<ReturnType<typeof createGenericList<T>>>[0],
  templates?: GenericListTemplate<T>
) => ReturnType<ReturnType<typeof createGenericList<T>>>;

// ============================================================================
// Main App
// ============================================================================

class App extends Component {
  @Value() selectedUser: User | null = null;
  @Value() showMessage: boolean = true;
  @Value() selectedGenericItem: string | null = null;

  Template() {
    return div({}, () => [
      h1({}, () => "Tutorial 6: Component Composition"),

      // Section 1: Simple List with Component Events
      div({ props: { className: "section" } }, () => [
        h2({}, () => "1. Simple List Component"),
        p({}, () => "A reusable list using framework data iteration and component events."),
        simpleList({
          data: () => ({
            items: ["Item 1", "Item 2", "Item 3"]
          }),
          on: {
            select: (payload: { index: number; item: string }) => {
              console.log("Selected:", payload.index, payload.item);
            }
          }
        })
      ]),

      // Section 2: Generic List with Template Functions
      div({ props: { className: "section" } }, () => [
        h2({}, () => "2. Generic List with Template Functions"),
        p({}, () => "Demonstrates passing custom template functions to a generic component."),
        genericList(
          {
            data: () => ({
              items: ["Apple", "Banana", "Cherry"]
            }),
            on: {
              select: (payload: { index: number; data: string }) => {
                this.selectedGenericItem = payload.data;
              }
            }
          },
          {
            // Parent passes custom template for rendering each item
            item: (fruit: string, index: number) => 
              div({}, () => [
                span({ props: { className: "item-icon" } }, () => "🍎 "),
                span({}, () => `${fruit} #${index + 1}`)
              ])
          }
        ),
          this.selectedGenericItem 
          ? p({ props: { className: "selection-info" } }, () => 
              `Selected: ${this.selectedGenericItem}`
            )
          : div({}, () => "")
      ]),

      // Section 3: Table Component
      div({ props: { className: "section" } }, () => [
        h2({}, () => "3. Table Component"),
        p({}, () => "A reusable table using framework data iteration."),
        simpleTable({
          data: () => ({
            headers: ["Name", "Email", "Role"],
            rows: users.map(u => [u.name, u.email, u.role])
          })
        })
      ]),

      // Section 4: Cards
      div({ props: { className: "section" } }, () => [
        h2({}, () => "4. Card Components"),
        div({ 
          props: () => ({
            style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;"
          })
        }, () => [
          card({
            data: () => ({
              title: "Card 1",
              content: "Simple card with title and content.",
              footer: "Footer text"
            })
          }),
          card({
            data: () => ({
              title: "Card 2",
              content: "Another card without footer."
            })
          }),
          card({
            data: () => ({
              title: "Card 3",
              content: "Third card with different content."
            })
          })
        ])
      ]),

      // Section 5: Event Handling
      div({ props: { className: "section" } }, () => [
        h2({}, () => "5. Event Handling"),
        p({}, () => "Click on a user to see details:"),
        // users is a constant array - no calc() needed
        div({ data: () => users }, (user: User) =>
          div({
            props: () => ({
              className: this.selectedUser?.id === user.id ? "user-selected" : "user-item"
            }),
            on: {
              click: () => {
                this.selectedUser = user;
              }
            }
          }, () => user.name)
        ),
        this.selectedUser 
          ? div({ props: { className: "user-details" } }, () => [
              h3({}, () => this.selectedUser!.name),
              p({}, () => `Email: ${this.selectedUser!.email}`),
              p({}, () => `Role: ${this.selectedUser!.role}`)
            ])
          : p({}, () => "No user selected")
      ]),

      // Section 6: Conditional Rendering
      div({ props: { className: "section" } }, () => [
        h2({}, () => "6. Conditional Rendering"),
        button({
          props: { className: "btn" },
          on: {
            click: () => {
              this.showMessage = !this.showMessage;
            }
          }
        }, () => "Toggle Message"),
        this.showMessage 
          ? div({ props: { className: "message" } }, () => "Message is visible!")
          : div({}, () => "Message is hidden")
      ])
    ]);
  }
}

// Attach the app
const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app")!, app({}));

console.log("Tutorial 6: Component Composition loaded successfully!");
