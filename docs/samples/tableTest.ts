import { Component } from 'j-templates';
import { table, tr, th, td, select, option } from 'j-templates/DOM';
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

function GenerateData() {
    var ret = new Array(100);
    for(var x=0; x<100; x++) {
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
    state: Partial<{ filter: string, data: Array<IData> }> = { 
        filter: null,
        data: GenerateData() 
    };

    @Scope()
    get visibleData() {
        if(!this.state.filter)
            return this.state.data;

        var filter = this.state.filter;
        return this.state.data.filter(d => {
            var match = true;
            for(var key in d)
                match = match && d[key] === filter;

            return match;
        });
    }

    public Template() {
        return [
            select({ 
                on: { 
                    change: (e: any) => {
                        this.state = { filter: e.target.value };
                    }
                },
                props: () => ({ value: this.state.filter }),
                data: () => [null, ...data]
            }, (val) => 
                option({ props: { value: val } }, () => val || "None")
            ),
            table({ data: () => [null, ...this.visibleData] }, (row) => {
                if(!row)
                    return tr({}, () => [
                        th({}, () => "Col1"),
                        th({}, () => "Col2"),
                        th({}, () => "Col3"),
                        th({}, () => "Col4"),
                        th({}, () => "Col5"),
                        th({}, () => "Col6"),
                        th({}, () => "Col7"),
                        th({}, () => "Col8"),
                        th({}, () => "Col9")
                    ]);

                return tr({}, () => [
                    td({ data: () => row.col1 }, (val) => val),
                    td({ data: () => row.col2 }, (val) => val),
                    td({ data: () => row.col3 }, (val) => val),
                    td({ data: () => row.col4 }, (val) => val),
                    td({ data: () => row.col5 }, (val) => val),
                    td({ data: () => row.col6 }, (val) => val),
                    td({ data: () => row.col7 }, (val) => val),
                    td({ data: () => row.col8 }, (val) => val),
                    td({ data: () => row.col9 }, (val) => val)
                ]);
            })
        ];
    }

}

var rootComponent = Component.ToFunction("root-component", null, RootComponent);
Component.Attach(document.body, rootComponent({}));