import { Component } from "j-templates";
import { div, button } from "j-templates/DOM";
import { FilterType } from "./types";

export interface FilterBarEvents {
  filterChange: { filter: FilterType };
}

interface FilterBarData {
  activeFilter: FilterType;
}

const FILTERS: FilterType[] = ["all", "active", "completed"];

class FilterBar extends Component<FilterBarData, void, FilterBarEvents> {
  Template() {
    return div({ props: { className: "filter-bar" } }, () =>
      FILTERS.map((f) =>
        button({
          props: () => ({
            className: this.Data.activeFilter === f ? "active" : "",
          }),
          on: {
            click: () => this.Fire("filterChange", { filter: f }),
          },
        }, () => f.charAt(0).toUpperCase() + f.slice(1))
      )
    );
  }
}

const filterBar = Component.ToFunction("filter-bar", FilterBar);

export { filterBar };
