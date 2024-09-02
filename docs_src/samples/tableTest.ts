import { Component } from 'j-templates';
import { table, tr, th, td, select, option, span, div, button, style } from 'j-templates/DOM';
import { State, Scope, StateAsync, Value } from 'j-templates/Utils';

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

    @StateAsync([])
    data = GenerateData();

    @Value()
    filter: string | null = null;

    @Value()
    sort: string | null = null;

    @Value()
    hidden: string[] = [];
  
  	@Scope()
  	get hiddenColumns() {
      	return new Set<string>(this.hidden);
    }

    @Scope()
    get visibleData() {
        if(!this.filter || this.filter === "null")
            return this.data;

        var filter = this.filter;
        return this.data.filter(d => {
            var match = false;
            Reflect.ownKeys(d).forEach(key =>
                match = match || d[key] === filter
			);

            return match;
        });
    }
  
  	@Scope()
  	get sortedData() {
      	if(!this.sort)
          	return this.visibleData;
      
      	var data = this.visibleData.slice();
      	var prop = this.sort;
      	data.sort((a, b) => {
          	return a[prop] < b[prop] ? -1 : a[prop] === b[prop] ? 0 : 1;
        });
      
      	return data;
    }
  
  	VisibleColumns() {
      	return () => Object.keys(headers).filter((key: string) => !this.hiddenColumns.has(key));
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
                        this.filter = e.target.value ;
                    }
                },
                props: () => ({ value: this.filter }),
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
        this.data = GenerateData();
    }
    
    private ToggleColumn(prop: string) {
        var hidden = this.hidden;
      	if(this.hiddenColumns.has(prop)) {
          	var ind = hidden.indexOf(prop);
          	hidden.splice(ind, 1);
          	this.hidden = hidden;
        }
      	else {
            hidden.push(prop);
          	this.hidden = hidden;
        }
    }
  
  	private SortBy(prop: string) {
      	if(this.sort === prop)
          	this.sort = null;
      	else
          	this.sort = prop;
    }

}

var rootComponent = Component.ToFunction("root-component", null, RootComponent);
Component.Attach(document.body, rootComponent({}));