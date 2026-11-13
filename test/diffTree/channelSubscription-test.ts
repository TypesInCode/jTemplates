import { describe, it, expect, vi } from "vitest";
import { ChannelSubscription } from "../../src/Store/Diff/channelClient";
import { ObservableDiffTree } from "../../src/Store/Diff/observableDiffTree";
import { HostPublisher } from "../../src/Store/Diff/hostPublisher";
import { FollowRoutes } from "../../src/Store/Diff/utils/routes";
import type { IChannel, IDiffPost, ISnapshotUpdate } from "../../src/Store/Diff";

/** A tree served on a port, as a worker's HostPublisher serves it; returns the subscriber's end. */
function Serve(tree: ObservableDiffTree): MessagePort {
  const { port1, port2 } = new MessageChannel();
  HostPublisher(tree, port2 as unknown as IChannel);
  port2.start();
  return port1;
}

function Tasks(...ids: number[]) {
  const tree = new ObservableDiffTree();
  for (const id of ids) tree.WritePath(`task_${id}`, { id, done: false });
  tree.WritePath("other", 1);
  tree.Commit();
  return tree;
}

const until = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 2 });

describe("ChannelSubscription", () => {
  it("deletes, with a replaced tree's first state, the roots the old tree had and the new one hasn't", async () => {
    const deliveries: { post: IDiffPost; first: boolean }[] = [];
    const subscription = new ChannelSubscription({ roots: ["task_*"] }, (post: IDiffPost, first) => deliveries.push({ post, first }));
    const old = Tasks(1, 2, 3);
    subscription.Connect(Serve(old));
    await until(() => expect(deliveries).toHaveLength(1));
    // The first connection: the tree's roots, no deletes.
    expect(deliveries[0].first).toBe(true);
    expect(deliveries[0].post.diff.map(r => [r.type, r.path[0]])).toEqual([["write", "task_1"], ["write", "task_2"], ["write", "task_3"]]);

    // Another commit, then the tree is replaced by one without task_3.
    old.WritePath("task_4", { id: 4 });
    old.Commit();
    await until(() => expect(deliveries).toHaveLength(2));
    expect(deliveries[1].first).toBe(false);
    const subscribed = vi.fn();
    subscription.Connect(Serve(Tasks(1, 2)), subscribed);
    await until(() => expect(subscribed).toHaveBeenCalled());
    expect(deliveries).toHaveLength(3);
    expect(deliveries[2].first).toBe(true);
    expect(deliveries[2].post.diff.map(r => [r.type, r.path[0]])).toEqual([
      ["write", "task_1"], ["write", "task_2"], ["delete", "task_3"], ["delete", "task_4"],
    ]);

    // A tree holding none of them: the deletes alone.
    subscription.Connect(Serve(Tasks()));
    await until(() => expect(deliveries).toHaveLength(4));
    expect(deliveries[3].post.diff.map(r => [r.type, r.path[0]])).toEqual([["delete", "task_1"], ["delete", "task_2"]]);
    subscription.Stop();
  });

  it("says the same in the snapshot form, in the update's deleted keys", async () => {
    const updates: ISnapshotUpdate[] = [];
    const subscription = new ChannelSubscription({ roots: ["task_*"], form: "snapshot" }, (update: ISnapshotUpdate) => updates.push(update));
    subscription.Connect(Serve(Tasks(1, 2)));
    await until(() => expect(updates).toHaveLength(1));
    subscription.Connect(Serve(Tasks(2)));
    await until(() => expect(updates).toHaveLength(2));
    expect(Object.keys(updates[1].roots)).toEqual(["task_2"]);
    expect(updates[1].deleted).toEqual(["task_1"]);
    subscription.Stop();
  });

  it("keeps a following tree to the new tree's state: a read of the route holds nothing the old one left", async () => {
    const follower = new ObservableDiffTree(undefined, {
      "/": { projections: { tasks: { reads: ["/src/"], projection: (src: any) => Object.keys(src ?? {}).sort() } } },
      ...FollowRoutes({ src: undefined }),
    });
    const subscription = new ChannelSubscription({ roots: ["task_*"] }, (post: IDiffPost) => {
      follower.ApplyDiff(post.diff, "/src/");
      follower.RunProjections();
      follower.Commit();
    });
    subscription.Connect(Serve(Tasks(1, 2, 3)));
    await until(() => expect(follower.Committed("$projection_tasks")).toEqual(["task_1", "task_2", "task_3"]));
    subscription.Connect(Serve(Tasks(1)));
    await until(() => expect(follower.Committed("$projection_tasks")).toEqual(["task_1"]));
    subscription.Stop();
  });
});
