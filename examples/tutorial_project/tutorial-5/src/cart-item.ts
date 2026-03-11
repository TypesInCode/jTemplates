import { Component } from "j-templates";
import { div, button, span } from "j-templates/DOM";
import { State } from "j-templates/Utils";

export interface CartItemData {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CartItemEvents {
  increment: void;
  decrement: void;
  remove: void;
}

class CartItem extends Component<CartItemData, {}, CartItemEvents> {
  @State()
  private isHovered: boolean = false;

  Template() {
    return div(
      {
        props: () => ({
          className: "cart-item",
        }),
      },
      () => [
        div({ props: { className: "item-name" } }, () => this.Data.name),
        div({ props: { className: "item-controls" } }, () => [
          button(
            {
              on: {
                click: (e: MouseEvent) => {
                  e.preventDefault();
                  this.Fire("decrement");
                },
              },
            },
            () => "-",
          ),
          div(
            { props: { className: "item-quantity" } },
            () => `${this.Data.quantity}`,
          ),
          button(
            {
              on: {
                click: (e: MouseEvent) => {
                  e.preventDefault();
                  this.Fire("increment");
                },
              },
            },
            () => "+",
          ),
          button(
            {
              props: { className: "remove-btn" },
              on: {
                click: (e: MouseEvent) => {
                  e.preventDefault();
                  this.Fire("remove");
                },
              },
            },
            () => "×",
          ),
        ]),
        div(
          { props: { className: "item-price" } },
          () => `$${(this.Data.price * this.Data.quantity).toFixed(2)}`,
        ),
      ],
    );
  }
}

export const cartItem = Component.ToFunction("cart-item", CartItem);
