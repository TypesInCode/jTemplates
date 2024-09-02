import { JsonType } from "./jsonType";

export function JsonMerge(source: unknown, patch: unknown) {
    if(patch === undefined)
        return source;

    const sourceType = JsonType(source);
    const patchType = JsonType(patch);
  
    if(sourceType !== patchType)
      return patch;
  
    switch(sourceType) {
      case "array": {
        const typedSource = source as unknown[];
        const typedPatch = patch as unknown[];
        return typedSource.map(function(source, index): unknown {
            return JsonMerge(source, typedPatch[index]);
        });
      }
      case "object": {
        const typedSource = source as {[prop: string]: unknown};
        const typedPatch = patch as {[prop: string]: unknown};
        const sourceKeys = Object.keys(typedSource);
        const result = {} as {[prop: string]: unknown};
        for(let x=0; x<sourceKeys.length; x++)
            result[sourceKeys[x]] = JsonMerge(typedSource[sourceKeys[x]], typedPatch[sourceKeys[x]]);
        
        return result;
      }
      default:
        return patch;
    }
  }