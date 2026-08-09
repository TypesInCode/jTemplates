import { Component } from "j-templates";
import { div, button } from "j-templates/DOM";
import { FilterType } from "./types";
import "./filter-bar.scss";

export interface FilterBarData {
  activeFilter: FilterType;
}

export interface FilterBarEvents {
  filterChange: { filter: FilterType };
}

const FILTERS: FilterType[] = ["all", "active", "completed"];

class FilterBar extends Component<FilterBarData, void, FilterBarEvents> {
  private setFilter(filter: FilterType): void {
    if (filter !== this.Data.activeFilter) {
      this.Fire("filterChange", { filter });
    }
  }

  Template() {
    return div({ props: { className: "filter-bar" } }, () => [
      div({
        props: { className: "filter-bar__segmented" },
        data: () => FILTERS,
      }, (f: FilterType) =>
        button({
          props: () => ({
            className:
              this.Data.activeFilter === f
                ? "filter-bar__btn active"
                : "filter-bar__btn",
          }),
          on: { click: () => this.setFilter(f) },
        }, () => f.charAt(0).toUpperCase() + f.slice(1)),
      ),
    ]);
  }
}

const filterBar = Component.ToFunction("filter-bar", FilterBar);
export { filterBar };
