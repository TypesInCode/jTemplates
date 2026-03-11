import { Component } from "j-templates";
import {
  div,
  button,
  select,
  option,
  input,
  span,
  label,
} from "j-templates/DOM";
import { Value, State, Scope, Watch, Destroy } from "j-templates/Utils";
import { ObservableScope } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils/utils.types";
import { cartItem, CartItemData } from "./cart-item";

// Reactive logger service using ObservableScope
class ReactiveLogger implements IDestroyable {
  // Create reactive scope for logs array
  private logsScope = ObservableScope.Create<string[]>(() => this.logs);
  private logs: string[] = [];

  log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs = [...this.logs, `[${timestamp}] ${message}`];
    // Manually trigger scope update
    ObservableScope.Update(this.logsScope);
    console.log(`[${timestamp}] ${message}`);
  }

  getLogs(): string[] {
    // Read through scope for reactivity
    return ObservableScope.Value(this.logsScope);
  }

  Destroy() {
    ObservableScope.Destroy(this.logsScope);
    this.logs = [];
  }
}

class ShoppingCart extends Component {
  @Value()
  private selectedProduct: string = "laptop";

  @State()
  items: CartItemData[] = [];

  @Value()
  discount: number = 0;

  @Destroy()
  logger: ReactiveLogger = new ReactiveLogger();

  @Watch((comp) => comp.items.length)
  onItemCountChanged(count: number) {
    this.logger.log(`Cart now has ${count} item(s)`);
  }

  @Watch((comp) => comp.discount)
  onDiscountChanged(newDiscount: number) {
    this.logger.log(`Discount changed to ${newDiscount}%`);
  }

  @Scope()
  get subtotal(): number {
    return this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  @Scope()
  get discountAmount(): number {
    return this.subtotal * (this.discount / 100);
  }

  @Scope()
  get total(): number {
    return this.subtotal - this.discountAmount;
  }

  @Scope()
  get itemCount(): number {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  private get availableProducts(): {
    id: string;
    name: string;
    price: number;
  }[] {
    return [
      { id: "laptop", name: "Laptop", price: 999.99 },
      { id: "mouse", name: "Wireless Mouse", price: 29.99 },
      { id: "keyboard", name: "Mechanical Keyboard", price: 149.99 },
      { id: "monitor", name: '27" Monitor', price: 399.99 },
      { id: "headphones", name: "Headphones", price: 199.99 },
    ];
  }

  private addItem() {
    const product = this.availableProducts.find(
      (p) => p.id === this.selectedProduct,
    );
    if (!product) return;

    const existingItem = this.items.find((item) => item.name === product.name);

    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.items.push({
        id: Date.now(),
        name: product.name,
        price: product.price,
        quantity: 1,
      });
    }

    this.logger.log(`Added ${product.name} to cart`);
  }

  private incrementQuantity(itemId: number) {
    const item = this.items.find((item) => item.id === itemId);
    if (item) {
      item.quantity++;
      this.logger.log(`Increased quantity of ${item.name}`);
    }
  }

  private decrementQuantity(itemId: number) {
    const item = this.items.find((item) => item.id === itemId);
    if (item) {
      if (item.quantity > 1) {
        item.quantity--;
        this.logger.log(`Decreased quantity of ${item.name}`);
      } else {
        this.removeItem(itemId);
      }
    }
  }

  private removeItem(itemId: number) {
    const index = this.items.findIndex((item) => item.id === itemId);
    if (index > -1) {
      const itemName = this.items[index].name;
      this.items.splice(index, 1);
      this.logger.log(`Removed ${itemName} from cart`);
    }
  }

  private updateDiscount(value: string) {
    const numValue = parseInt(value, 10);
    this.discount = isNaN(numValue) ? 0 : Math.max(0, Math.min(100, numValue));
  }

  Template() {
    return div({ props: { className: "shopping-cart" } }, () => [
      div({ props: { className: "section" } }, () => [
        div({ props: { className: "add-item-section" } }, () => [
          select(
            {
              props: () => ({ value: this.selectedProduct }),
              on: {
                change: (e: Event) => {
                  const target = e.target as HTMLSelectElement;
                  this.selectedProduct = target.value;
                },
              },
            },
            () =>
              this.availableProducts.map((product) =>
                option({ props: { value: product.id } }, () => product.name),
              ),
          ),
          button(
            {
              on: { click: () => this.addItem() },
            },
            () => "Add to Cart",
          ),
        ]),
        div({ props: { className: "discount-section" } }, () => [
          label({ attrs: { for: "discount" } }, () => "Discount (%): "),
          input({
            attrs: {
              type: "number",
              id: "discount",
              min: "0",
              max: "100",
            },
            props: () => ({
              value: `${this.discount}`,
            }),
            on: {
              input: (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.updateDiscount(target.value);
              },
            },
          }),
        ]),
      ]),
      div({ props: { className: "cart-items" } }, () =>
        this.items.length > 0
          ? div({ data: () => this.items }, (item) =>
              cartItem({
                data: () => item,
                on: {
                  increment: () => this.incrementQuantity(item.id),
                  decrement: () => this.decrementQuantity(item.id),
                  remove: () => this.removeItem(item.id),
                },
              }),
            )
          : div(
              { props: { className: "empty-cart" } },
              () => "Your cart is empty",
            ),
      ),
      div({ props: { className: "cart-summary" } }, () => [
        div({ props: { className: "summary-row" } }, () => [
          span({}, () => "Subtotal:"),
          span({}, () => `$${this.subtotal.toFixed(2)}`),
        ]),
        div({ props: { className: "summary-row discount" } }, () => [
          span({}, () => `Discount (${this.discount}%):`),
          span({}, () => `-$${this.discountAmount.toFixed(2)}`),
        ]),
        div({ props: { className: "summary-row" } }, () => [
          span({}, () => "Total:"),
          span({}, () => `$${this.total.toFixed(2)}`),
        ]),
        div({ props: { className: "summary-row" } }, () => [
          span({}, () => "Items:"),
          span({}, () => `${this.itemCount}`),
        ]),
      ]),
      div({ props: { className: "log-section" } }, () =>
        this.logger.getLogs().length > 0
          ? div({ data: () => this.logger.getLogs() }, (log: string) =>
              div({ props: { className: "log-entry" } }, () => log)
            )
          : div({}, () => "No logs yet"),
      ),
    ]);
  }
}

export const shoppingCart = Component.ToFunction("shopping-cart", ShoppingCart);
