import { Component } from 'j-templates';
import { table, tr, th, td, select, option, span, div, button, style } from 'j-templates/DOM';
import { State, Scope } from 'j-templates/Utils';

const data = [
    "ABAMPERES",
    "ABBAS",
    "ESPOUSER",
    "ETCHINGS",
    "ETHNOBIOLOGY",
    "FLAGPOLE",
    "INTRONS",
    "LUMBERMAN",
    "MISPRISE",
    "OAKY"   
]

interface IData {
    col1: string;
    col2: string;
    col3: string;
    col4: string;
    col5: string;
    col6: string;
    col7: string;
    col8: string;
    col9: string;
}

const headers = {
  col1: "Col 1",
  col2: "Col 2",
  col3: "Col 3",
  col4: "Col 4",
  col5: "Col 5",
  col6: "Col 6",
  col7: "Col 7",
  col8: "Col 8",
  col9: "Col 9"
} as IData;

function GenerateData() {
    var ret = [];
    for(var x=0; x<1000; x++) {
        ret[x] = {
            col1: data[Math.floor(Math.random() * data.length)],
            col2: data[Math.floor(Math.random() * data.length)],
            col3: data[Math.floor(Math.random() * data.length)],
            col4: data[Math.floor(Math.random() * data.length)],
            col5: data[Math.floor(Math.random() * data.length)],
            col6: data[Math.floor(Math.random() * data.length)],
            col7: data[Math.floor(Math.random() * data.length)],
            col8: data[Math.floor(Math.random() * data.length)],
            col9: data[Math.floor(Math.random() * data.length)],
        }
    }
    return ret as Array<IData>;
}

class RootComponent extends Component {

    @State()
    state: Partial<{ filter: string, sort: string, data: Array<IData>, hidden: Array<string> }> = { 
        filter: null,
      	sort: null,
      	hidden: [],
        data: GenerateData() 
    };
  
  	@Scope()
  	get hiddenColumns() {
      	return new Set(this.state.hidden.slice());
    }

    @Scope()
    get visibleData() {
        if(!this.state.filter || this.state.filter === "null")
            return this.state.data;

        var filter = this.state.filter;
        return this.state.data.filter(d => {
            var match = false;
            Reflect.ownKeys(d).forEach(key =>
                match = match || d[key] === filter
			);

            return match;
        });
    }
  
  	@Scope()
  	get sortedData() {
      	if(!this.state.sort)
          	return this.visibleData;
      
      	var data = this.visibleData.slice();
      	var prop = this.state.sort;
      	data.sort((a, b) => {
          	return a[prop] < b[prop] ? -1 : a[prop] === b[prop] ? 0 : 1;
        });
      
      	return data;
    }
  
  	VisibleColumns() {
      	return () => Reflect.ownKeys(headers).filter((key: string) => !this.hiddenColumns.has(key));
    }

    public Template() {
        return [
          	style({
              props: { type: "text/css" }
            }, () => ".hidden { display: none; }"),
            button({ on: { click: () => this.RefreshData() } }, () => "Refresh data"),
          	div({ data: () => Reflect.ownKeys(headers) }, (key: string) =>
                button({ on: { click: () => this.ToggleColumn(key) } }, () => `${key} `)
            ),
            select({ 
                on: { 
                    change: (e: any) => {
                        this.state = { filter: e.target.value };
                    }
                },
                props: () => ({ value: this.state.filter }),
                data: () => [null, ...data, "Clear"]
            }, (val) => 
                option({ props: { value: val } }, () => val || "None")
            ),
          	span({}, () => ` ${this.visibleData.length}`),
            table({ data: async () => await [null, ...this.sortedData] }, (row: IData) => {
                if(!row)
                    return tr({ 
                      	data: this.VisibleColumns() 
                    }, (key: string) => 
                        th({
                      		on: { click: () => this.SortBy(key) }
                        }, () => headers[key])
					);

                return tr({ 
                  data: this.VisibleColumns()
                }, (key: string) => 
					td({ }, () => row[key])
				);
            })
        ];
    }

    private RefreshData() {
        this.state = { data: GenerateData() };
    }
    
    private ToggleColumn(prop: string) {
      	if(this.hiddenColumns.has(prop)) {
          	var hidden = this.state.hidden.slice();
          	var ind = hidden.indexOf(prop);
          	hidden.splice(ind, 1);
          	this.state = { hidden: hidden };
        }
      	else
          	this.state = { hidden: [...this.state.hidden.slice(), prop] };
    }
  
  	private SortBy(prop: string) {
      	if(this.state.sort === prop)
          	this.state = { sort: null };
      	else
          	this.state = { sort: prop };
    }

}

var rootComponent = Component.ToFunction("root-component", null, RootComponent);
Component.Attach(document.body, rootComponent({}));