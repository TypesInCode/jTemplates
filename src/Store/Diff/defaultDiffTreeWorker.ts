import { ObservableDiffTree } from "./observableDiffTree";
import { HostPublisher } from "./hostPublisher";

HostPublisher(new ObservableDiffTree(), self as any);
