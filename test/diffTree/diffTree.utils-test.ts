import { describe, expect, it } from "vitest";
import { ApplyValueToPath, ReadPath, ROUTE_STATE, SplitRouteAndPath, WritePath } from '../../src/Store/Diff/utils/diffTree.utils';
import { Snapshot } from "../../src/Store/Tree/snapshot";

describe("DiffTree Utils", () => {
  const snapshot = Snapshot.Create();

  it("Write routed path to object", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, '/First/Second/value', { test: 1 });

    expect(obj[ROUTE_STATE].First[ROUTE_STATE].Second.value.test).toEqual(1);
  });

  it("Initialize route without a property", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, '/First/Second/', undefined);
    expect(obj[ROUTE_STATE].First[ROUTE_STATE].Second).toEqual({});
  });

  it("Write un-routed path to object", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, "value", { test: 1 });
    WritePath(snapshot, obj, "value.prop", 2);

    expect(obj.value.test).toEqual(1);
    expect(obj.value.prop).toEqual(2);
  });

  it("Write with single slash still resolves to root", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, "/value", { test: 1 });
    expect(obj.value.test).toEqual(1);
  });

  it("Read with single slash still resolves to root", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, "/value", { test: 1 });
    const value = ReadPath(obj, "/value.test");
    expect(value).toEqual(1);
  });

  it("Object.keys does not include routed path", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, '/First/Second/value', { test: 1 });
    WritePath(snapshot, obj, "value", { test: 1 });

    const keys = Object.keys(obj);
    expect(keys.length).toEqual(1);
    expect(keys[0]).toEqual("value");
  });

  it("Read a routed path to route", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, '/First/Second/value', { test: 1 });

    const value = ReadPath(obj, '/First/Second/');
    expect(value).toBeTruthy();
  });

  it("Read empty string returns the root object", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, '/First/Second/value', { test: 1 });

    const value = ReadPath(obj, '');
    expect(value).toEqual(obj);
  });

  it("Read a routed path to value", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, '/First/Second/value', { test: 1 });

    const value = ReadPath(obj, '/First/Second/value.test');
    expect(value).toEqual(1);
  });

  it("Read an un-routed path to value", () => {
    const obj = {} as { [key: string]: any };
    WritePath(snapshot, obj, 'value', { test: 2 });

    const value = ReadPath(obj, 'value.test');
    expect(value).toEqual(2);
  });

  it("Read a missing route path - return undefined", () => {
    const obj = {} as { [key: string]: any };
    const value = ReadPath(obj, '/First/Second/value.test');
    expect(value).toEqual(undefined);
  });

  it("Read a missing un-routed path - return undefined", () => {
    const obj = {} as { [key: string]: any };
    const value = ReadPath(obj, 'value.test');
    expect(value).toEqual(undefined);
  });

  it("Read route and path from route path", () => {
    const [route, path] = SplitRouteAndPath("/First/Second/value");
    expect(route).toEqual('/First/Second/');
    expect(path).toEqual('value');
  });

  it("Write new value to root routed path", () => {
    const obj = {} as { [key: string]: any };
    ApplyValueToPath(snapshot, obj, (data) => data?.id ? `/${data.id}` : undefined, '/First/Second/', 'value', { id: "MY_ID", value: "test" });
    const value = ReadPath(obj, '/First/Second/value.value');
    const value2 = ReadPath(obj, 'MY_ID.value');
    expect(value).toEqual("test");
    expect(value2).toEqual("test");
  });

  it("Write new value to local routed path", () => {
    const obj = {} as { [key: string]: any };
    ApplyValueToPath(snapshot, obj, (data) => data?.id ? `${data.id}` : undefined, '/First/Second/', 'value', { id: "MY_ID", value: "test" });
    const value = ReadPath(obj, '/First/Second/value.value');
    const value2 = ReadPath(obj, '/First/Second/MY_ID.value');
    expect(value).toEqual("test");
    expect(value2).toEqual("test");
  });

  it("Write nested keyed value is copied to routed path", () => {
    const obj = {} as { [key: string]: any };
    ApplyValueToPath(snapshot, obj, (data) => data?.id ? `${data.id}` : undefined, '/First/Second/', 'value', [{ id: "MY_ID", value: "test" }]);
    const value = ReadPath(obj, '/First/Second/MY_ID.value');
    expect(value).toEqual("test");
  })

  it("Write to existing keyed value makes it to the root copy", () => {
    const obj = {} as { [key: string]: any };
    const keyFunc = (data: any) => data?.id ? `/${data.id}` : undefined;
    ApplyValueToPath(snapshot, obj, keyFunc, '/First/Second/', 'object', { id: "MY_ID", value: "test" });
    ApplyValueToPath(snapshot, obj, keyFunc, '/First/Second/', 'object.value', "CHANGED");
    const value = ReadPath(obj, '/First/Second/object.value');
    const value2 = ReadPath(obj, '/MY_ID.value');
    expect(value).toEqual("CHANGED");
    expect(value2).toEqual("CHANGED");
  });

  it("Write alternating values to existing keyed value makes it to the root copy", () => {
    const obj = {} as { [key: string]: any };
    const keyFunc = (data: any) => data?.id ? `/${data.id}` : undefined;
    ApplyValueToPath(snapshot, obj, keyFunc, '/First/Second/', 'object', { id: "MY_ID", value: "test" });
    ApplyValueToPath(snapshot, obj, keyFunc, '/MY_ID', 'value', "CHANGED");
    const value = ReadPath(obj, '/MY_ID.value');
    expect(value).toEqual("CHANGED");
    ApplyValueToPath(snapshot, obj, keyFunc, '/First/Second/', 'object.value', "test");
    const value2 = ReadPath(obj, '/MY_ID.value');
    expect(value2).toEqual("test");
  });

  it("Write to existing keyed value makes it to the local copy", () => {
    const obj = {} as { [key: string]: any };
    const keyFunc = (data: any) => data?.id ? `${data.id}` : undefined;
    ApplyValueToPath(snapshot, obj, keyFunc, '/First/Second/', 'object', { id: "MY_ID", value: "test" });
    ApplyValueToPath(snapshot, obj, keyFunc, '/First/Second/', 'object.value', "CHANGED");
    const value = ReadPath(obj, '/First/Second/object.value');
    const value2 = ReadPath(obj, '/First/Second/MY_ID.value');
    expect(value).toEqual("CHANGED");
    expect(value2).toEqual("CHANGED");
  });
});
