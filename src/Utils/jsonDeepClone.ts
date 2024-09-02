import { JsonType } from "./jsonType";


export function JsonDeepClone<T>(value: T): T {
  const type = JsonType(value);
  switch (type) {
    case "array":
      return (value as unknown as unknown[]).map(JsonDeepClone) as unknown as T;
    case "object": {
      const ret = {} as T;
      const keys = Object.keys(value as unknown as object) as (keyof T)[];
      for (let x = 0; x < keys.length; x++)
        ret[keys[x]] = JsonDeepClone(value[keys[x]]);

      return ret;
    }
    default:
      return value;
  }
}
