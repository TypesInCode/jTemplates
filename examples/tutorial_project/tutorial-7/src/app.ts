import { Component } from "j-templates";
import { Inject, Destroy } from "j-templates/Utils";
import { div, h1, h2 } from "j-templates/DOM";
import { dataViewer } from "./components/data-viewer";
import { DataService, RealDataService } from "./services/data-service";
import { LoggerService, RealLoggerService } from "./services/logger-service";
import { Item } from "./models/item";

class App extends Component {
  @Destroy()
  @Inject(DataService)
  dataService = new RealDataService();
  
  @Destroy()
  @Inject(LoggerService)
  logger = new RealLoggerService();
  
  Bound(): void {
    super.Bound();
    this.logger.Log("App initialized");
    
    // Add some sample data
    this.dataService.AddItem({ name: "Item 1", value: 100 });
    this.dataService.AddItem({ name: "Item 2", value: 200 });
    this.dataService.AddItem({ name: "Item 3", value: 300 });
  }
  
  Template() {
    return div({ props: { className: "app" } }, () => [
      h1({ props: { className: "title" } }, () => 
        "Tutorial 7: Dependency Injection"
      ),
      h2({ props: { className: "subtitle" } }, () => 
        "Services injected via @Inject decorator"
      ),
      dataViewer(
        {},
        {
          renderItem: (item: Item) => 
            div({ props: { className: "item-render" } }, () => 
              `${item.name} (Value: ${item.value})`
            )
        }
      )
    ]);
  }
  
  Destroy(): void {
    super.Destroy();
    this.logger.Log("App destroyed");
  }
}

// Attach the app
const app = Component.ToFunction("app", App);
Component.Attach(document.getElementById("app")!, app({}));

console.log("Tutorial 7: Dependency Injection loaded successfully!");
