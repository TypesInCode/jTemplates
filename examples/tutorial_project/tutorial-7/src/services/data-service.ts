import { ObservableNode } from "j-templates/Store";
import { IDestroyable } from "j-templates/Utils/utils.types";
import { Item } from "../models/item";

// Service contract (abstract class)
export abstract class DataService {
  abstract GetData(): Item[];
  abstract AddItem(item: Omit<Item, "id" | "createdAt">): void;
  abstract DeleteItem(id: number): void;
}

// Concrete implementation
export class RealDataService extends DataService implements IDestroyable {
  private data = ObservableNode.Create({ items: [] as Item[], nextId: 1 });
  
  GetData(): Item[] {
    return this.data.items;
  }
  
  AddItem(item: Omit<Item, "id" | "createdAt">): void {
    const newItem: Item = {
      ...item,
      id: this.data.nextId++,
      createdAt: new Date()
    };
    this.data.items.push(newItem);
  }
  
  DeleteItem(id: number): void {
    const index = this.data.items.findIndex(i => i.id === id);
    if (index >= 0) {
      this.data.items.splice(index, 1);
    }
  }
  
  Destroy(): void {
    this.data.items = [];
    this.data.nextId = 1;
  }
}

// Mock implementation for testing
export class MockDataService extends DataService {
  private mockData: Item[] = [];
  
  GetData(): Item[] {
    return [...this.mockData];
  }
  
  AddItem(item: Omit<Item, "id" | "createdAt">): void {
    const newItem: Item = {
      ...item,
      id: this.mockData.length + 1,
      createdAt: new Date()
    };
    this.mockData.push(newItem);
  }
  
  DeleteItem(id: number): void {
    this.mockData = this.mockData.filter(i => i.id !== id);
  }
  
  Destroy(): void {
    this.mockData = [];
  }
}
