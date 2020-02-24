export namespace TreeNodeRefId {
    export function GetString(id: string) {
        return "TreeNodeRefId." + id;
    }

    export function GetIdFrom(str: string) {
        if(!str || typeof str !== 'string')
            return undefined;
        
        var matches = str.match(/^TreeNodeRefId\.([^.]+$)/);
        if(!matches)
            return undefined;

        return matches[1];
    }
}