/**
 * @file data-table.ts
 * @description Generic reusable data table component
 * 
 * This file demonstrates jTemplates advanced template composition:
 * - Generic components with type parameters
 * - Template functions for custom cell rendering
 * - Reactive data binding with calc() function
 * - Complex component composition
 * 
 * @purpose Shows how to create flexible, reusable table components
 * @see Component - Base component class
 * @see calc - Reactive calculation function
 * @see src/Utils/functions.ts - calc implementation
 */

import { calc, Component } from "j-templates";
import { tbody, td, th, thead, tr } from "j-templates/DOM";
import { vNode } from "j-templates/Node/vNode.types";

/**
 * Column definition interface.
 * 
 * Defines the structure for table columns including:
 * - key: Unique identifier for the column
 * - name: Display name for the column header
 * - class: Optional CSS class for styling
 */
export interface Column {
  key: string;
  name: string;
  class?: string;
}

/**
 * Cell template interface for custom cell rendering.
 * 
 * @template D - Data type for row items
 * 
 * @purpose Enables custom rendering logic for table cells
 * @example
 * const cellTemplate = {
 *   cell: (data, column) => {
 *     switch (column.key) {
 *       case 'name': return span({}, () => data.name);
 *       case 'date': return span({}, () => formatDate(data.date));
 *       default: return span({}, () => String(data[column.key]));
 *     }
 *   }
 * };
 */
export interface CellTemplate<D> {
  /**
   * Cell rendering function.
   * 
   * @param {D} data - Row data item
   * @param {Column} column - Column definition
   * @returns {vNode | vNode[]} Virtual nodes to render in the cell
   */
  cell: (data: D, column: Column) => vNode | vNode[];
}

/**
 * Data interface for the table component.
 * 
 * @template D - Data type for row items
 */
export interface Data<D> {
  /** Array of column definitions */
  columns: Column[];
  /** Array of data items to display */
  data: D[];
}

/**
 * DataTable - Generic table component that supports custom cell rendering.
 * 
 * @template D - Type of data items in the table
 * 
 * @purpose Demonstrates generic components and template composition
 * @features
 * - Generic type support for any data type
 * - Custom cell rendering via template functions
 * - Reactive data updates
 * - Flexible column configuration
 * 
 * @jTemplates Generic components:
 * - Type parameters enable type-safe data handling
 * - Template parameters allow custom rendering logic
 * - Component.ToFunction supports complex type signatures
 */
class DataTable<D> extends Component<Data<D>, CellTemplate<D>> {
  /**
   * Component template method.
   * 
   * Creates a table structure with:
   * - thead: Table header with column names
   * - tbody: Table body with data rows and custom cells
   * 
   * @returns {vNode[]} Array of table section virtual nodes
   * 
   * @jTemplates Template features:
   * - thead with data binding to columns
   * - tbody with data binding to data items
   * - tr with data binding to columns for each row
   * - Custom cell rendering via this.Templates.cell
   */
  Template() {
    return [
      // Table header section
      // data: () => this.Data.columns creates reactive binding to columns
      // When columns change, the header is re-rendered
      thead({ data: () => this.Data.columns }, (column) =>
        th({}, () => column.name),
      ),
      // Table body section
      // calc(() => this.Data.data) creates a reactive calculation
      // This ensures proper change detection for array data
      tbody({ data: () => calc(() => this.Data.data) }, (data) =>
        // For each data item, create a table row
        tr({ data: () => this.Data.columns }, (column) =>
          // For each column, create a table cell
          td({ 
            // Dynamic class binding based on column definition
            props: () => ({ className: column.class })
          }, () =>
            // Use the custom cell template for rendering
            this.Templates.cell(data, column),
          ),
        ),
      ),
    ];
  }
}

/**
 * Type definitions for function component conversion.
 * 
 * @jTemplates Complex type system for component functions:
 * - ToFunction converts class to factory function
 * - FactoryFunction represents the returned function type
 * - TableFunction provides type-safe usage interface
 */
type ToFunction<D> = typeof Component.ToFunction<Data<D>, CellTemplate<D>, {}>;
type FactoryFunction<D> = ReturnType<ToFunction<D>>;
interface TableFunction {
  /**
   * Generic function signature that works with any data type D.
   * 
   * @template D - Data type for table rows
   * @param {...Parameters<FactoryFunction<D>>} args - Component configuration
   * @returns {ReturnType<FactoryFunction<D>>} Virtual node representing the table
   */
  <D>(...args: Parameters<FactoryFunction<D>>): ReturnType<FactoryFunction<D>>;
}

/**
 * Convert DataTable class to function component with generic type support.
 * 
 * The "as unknown as TableFunction" cast is needed because TypeScript
 * cannot infer the complex generic function type automatically.
 * 
 * @jTemplates Component.ToFunction with generics:
 * 1. Creates a typed factory function
 * 2. Preserves generic type parameters
 * 3. Enables type-safe usage in parent components
 * 
 * @example
 * // Usage with custom data type:
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 * 
 * const users: User[] = [...]
 * const columns: Column[] = [...]
 * const cellTemplate: CellTemplate<User> = {...}
 * 
 * // Type-safe usage
 * dataTable({ data: () => ({ columns, data: users }) }, cellTemplate);
 * 
 * @see src/Node/component.ts:158 - ToFunction implementation
 */
export const dataTable = Component.ToFunction(
  "table",
  DataTable,
) as unknown as TableFunction;
