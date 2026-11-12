import { DiffTreePublisher } from "./diffTreePublisher";
import { HostPublisher } from "./hostPublisher";

HostPublisher(new DiffTreePublisher(), self as any);
