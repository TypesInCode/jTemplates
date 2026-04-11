import { Component } from "j-templates";
import { Value, Inject } from "j-templates/Utils";
import { div, h3, button, input, span, ul, li } from "j-templates/DOM";
import { DataService } from "../services/data-service";
import { LoggerService } from "../services/logger-service";
import { Item } from "../models/item";

interface DataViewerTemplate {
  renderItem: (item: Item) => any;
}

class DataViewer extends Component<{}, DataViewerTemplate, void> {
  @Inject(DataService)
  dataService!: DataService;
  
  @Inject(LoggerService)
  logger!: LoggerService;
  
  @Value()
  newItemName: string = "";
  
  @Value()
  newItemValue: number = 0;
  
  Bound(): void {
    super.Bound();
    this.logger.Log("DataViewer initialized");
  }
  
  private handleAddItem(): void {
    if (this.newItemName.trim()) {
      this.dataService.AddItem({
        name: this.newItemName.trim(),
        value: this.newItemValue
      });
      
      this.logger.Log(`Added item: ${this.newItemName}`);
      
      // Reset form
      this.newItemName = "";
      this.newItemValue = 0;
    }
  }
  
  private handleDeleteItem(id: number): void {
    this.dataService.DeleteItem(id);
    this.logger.Log(`Deleted item: ${id}`);
  }
  
  Template() {
    return div({ props: { className: "data-viewer" } }, () => [
      h3({ props: { className: "title" } }, () => "Data Viewer"),
      
      // Add Item Form
      div({ props: { className: "add-form" } }, () => [
        input({
          props: () => ({
            type: "text",
            placeholder: "Item name",
            value: this.newItemName
          }),
          on: {
            input: (e: Event) => {
              const target = e.target as HTMLInputElement;
              this.newItemName = target.value;
            }
          }
        }),
        input({
          props: () => ({
            type: "number",
            placeholder: "Value",
            value: String(this.newItemValue)
          }),
          on: {
            input: (e: Event) => {
              const target = e.target as HTMLInputElement;
              this.newItemValue = parseInt(target.value) || 0;
            }
          }
        }),
        button({
          props: { className: "btn-add" },
          on: {
            click: () => this.handleAddItem()
          }
        }, () => "Add Item")
      ]),
      
      // Items List - Using framework data iteration
      // Pass array as data prop - framework automatically iterates
      // Call GetData() directly in data prop to register at smallest scope
      div({ props: { className: "items" } }, () => [
        // Access GetData() here for count - registers at this span's scope
        span({ props: { className: "count" } }, () => 
          `Total items: ${this.dataService.GetData().length}`
        ),
        // Framework data iteration - passes single item to children function
        ul({ 
          props: { className: "item-list" },
          data: () => this.dataService.GetData()  // Framework iterates this array
        }, (item: Item) =>  // Framework passes single item here
          li({ props: { className: "item" } }, () => [
            this.Templates.renderItem(item),
            button({
              props: { className: "btn-delete" },
              on: {
                click: () => this.handleDeleteItem(item.id)
              }
            }, () => "Delete")
          ])
        )
      ])
    ]);
  }
  
  Destroy(): void {
    super.Destroy();
    this.logger.Log("DataViewer destroyed");
  }
}

export const dataViewer = Component.ToFunction("data-viewer", DataViewer);
