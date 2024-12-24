/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
import * as chai from "chai";
// import { AVL } from "../../src/Utils/avlTree";
import { AVL } from '../../src/Utils/avlTree';
import { DistinctArray } from "../../src/Utils/distinctArray";
const expect = chai.expect;

describe("Avl Tree", () => {
  it("Basic Tree with 3 nodes", () => {
    const tree = AVL.Create((a: number, b: number) => a - b);

    AVL.Insert(tree, 1);
    AVL.Insert(tree, 2);
    AVL.Insert(tree, 3);
    AVL.Insert(tree, 2);

    expect(tree.size).to.eq(3);
    expect(tree.root[1]).to.eq(0);
    expect(tree.root?.[3][1]).to.eq(0);
    expect(tree.root?.[4][1]).to.eq(0);
  });

  /* it("Basic Tree with 3 nodes - REVERSE", () => {
    const tree = AVL.Create((a: number, b: number) => a - b);

    AVL.Insert(tree, 3);
    AVL.Insert(tree, 2);
    AVL.Insert(tree, 1);

    expect(tree.root?.balance).to.eq(0);
    expect(tree.root?.left?.balance).to.eq(0);
    expect(tree.root?.right?.balance).to.eq(0);
  });

  it("Basic Tree with 3 unsorted nodes", () => {
    const tree = AVL.Create((a: number, b: number) => a - b);

    AVL.Insert(tree, 1);
    AVL.Insert(tree, 3);
    AVL.Insert(tree, 2);

    expect(tree.root?.balance).to.eq(0);
    expect(tree.root?.left?.balance).to.eq(0);
    expect(tree.root?.right?.balance).to.eq(0);
  });

  it("Basic Tree with 3 unsorted nodes - REVERSE", () => {
    const tree = AVL.Create((a: number, b: number) => a - b);

    AVL.Insert(tree, 3);
    AVL.Insert(tree, 1);
    AVL.Insert(tree, 2);

    expect(tree.root?.balance).to.eq(0);
    expect(tree.root?.left?.balance).to.eq(0);
    expect(tree.root?.right?.balance).to.eq(0);
  });

  it("Regular Tree", () => {
    const tree = AVL.Create((a: number, b: number) => a - b);

    AVL.Insert(tree, 3);
    AVL.Insert(tree, 1);
    AVL.Insert(tree, 2);

    AVL.Insert(tree, 5);
    AVL.Insert(tree, 6);
    AVL.Insert(tree, 4);

    AVL.Insert(tree, 0);
    AVL.Insert(tree, 6);

    expect(tree.root?.balance).to.eq(0);
    expect(tree.root?.left?.balance).to.eq(0);
    expect(tree.root?.right?.balance).to.eq(0);
    expect(tree.size).to.eq(7);
  });

  it("Tree to Array", () => {
    const tree = AVL.Create((a: number, b: number) => a - b);

    AVL.Insert(tree, 3);
    AVL.Insert(tree, 1);
    AVL.Insert(tree, 2);

    AVL.Insert(tree, 5);
    AVL.Insert(tree, 6);
    AVL.Insert(tree, 4);

    AVL.Insert(tree, 0);
    AVL.Insert(tree, 6);

    const arr = AVL.ToArray(tree);
    expect(arr.length).to.eq(7);
  }); */

  it('Compare Large AVL to Distinct Array', () => {
    const startData: number[] = [];
    for(let x=0; x<10000; x++)
      startData.push(Math.floor(Math.random() * 100000000));

    const avlStart = performance.now();
    const avl = AVL.Create<number>((a, b) => a - b);
    for(let x=0; x<startData.length; x++)
      AVL.Insert(avl, startData[x]);

    const avlArr = AVL.ToArray(avl);
    const avlEnd = performance.now();

    /* const avlv2Start = performance.now();
    const avlv2 = AVLV2.Create<number>((a, b) => a - b);
    for(let x=0; x<startData.length; x++)
      AVLV2.Insert(avlv2, startData[x]);

    const avlv2Arr = AVLV2.ToArray(avlv2);
    const avlv2End = performance.now(); */

    const arrStart = performance.now();
    const arr: number[] = [];
    const set = new Set<number>();
    for(let x=0; x<startData.length; x++)
      if(!set.has(startData[x])) {
        set.add(startData[x]);
        arr.push(startData[x]);
      }

    arr.sort((a, b) => a-b);

    const arrEnd = performance.now();

    const distArrayStart = performance.now();
    const distArray = DistinctArray.Create<number>(value => value);
    for(let x=0; x<startData.length; x++)
      DistinctArray.Push(distArray, startData[x]);

    const dist = DistinctArray.Get(distArray);
    dist.sort((a, b) => a-b);
    const distArrayEnd = performance.now();

    const avlTime = avlEnd - avlStart;
    // const avlv2Time = avlv2End - avlv2Start;
    const arrTime = arrEnd - arrStart;
    const distArrayTime = distArrayEnd - distArrayStart;

    console.log("avlTime", avlTime, "arrTime", arrTime, "distArray", distArrayTime);

    expect(avlArr.length).to.eq(arr.length);
    // expect(avlv2Arr.length).to.eq(arr.length);
    expect(arr.length).to.eq(dist.length);
    expect(avlTime).to.be.lessThan(arrTime);
  });
});
