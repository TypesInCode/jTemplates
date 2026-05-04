import { Component } from "j-templates";
import { div, button } from "j-templates/DOM";
import { Value } from "j-templates/Utils";

interface ViewTabsData {
  activeTab: string;
}

interface ViewTabsEvents {
  tabChanged: { tab: string };
}

class ViewTabs extends Component<ViewTabsData, void, ViewTabsEvents> {
 private tabs = [
    { id: "board", label: "Board" },
    { id: "list", label: "List" },
  ];

  Template() {
    return div({ props: { className: "view-tabs" } }, () =>
      div({
        props: { className: "tab-bar" },
        data: () => this.tabs,
      }, (tab) =>
        button({
          props: () => ({
            className: this.Data.activeTab === tab.id ? "tab active" : "tab",
          }),
          on: {
            click: () => this.Fire("tabChanged", { tab: tab.id }),
          },
        }, () => tab.label)
      )
    );
  }
}

export const viewTabs = Component.ToFunction("view-tabs", ViewTabs);
