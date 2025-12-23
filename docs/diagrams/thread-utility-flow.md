# jTemplates Thread Utility - Execution Flow Diagram

```mermaid
graph TD
    A[Start] --> B{In Thread Context?}
    B -->|No| C[Create New Context]
    B -->|Yes| D[Use Existing Context]

    C --> E[Set threadContext = new context]
    D --> F[Reuse current threadContext]

    E --> G[Run Callback]
    F --> G

    G --> H{Callback calls:}
    H --> I[Schedule(cb)]
    H --> J[After(cb)]
    H --> K[Thread(cb)]

    I --> L[Add to workList (async=true, before=true)]
    J --> M[Add to workList (async=false, after=true)]
    K --> N{In Context?}
    N -->|Yes| O[ScheduleCallback]
    N -->|No| P[Synch(callback)]

    L --> Q[ProcessQueue scheduled via queueMicrotask]
    M --> Q
    O --> Q

    Q --> R[ProcessQueue(deadline)]
    R --> S{timeRemaining > 0?}
    S -->|Yes| T[DoWork(context)]
    S -->|No| U[setTimeout(ProcessQueue)]

    T --> V{Has work?}
    V -->|Yes| W[Invoke(callback, async)]
    W --> X[Run user callback]
    X --> Y{Calls Schedule/After?}
    Y --> L
    Y --> M
    Y --> Z[Continue DoWork loop]
    Z --> V
    V -->|No| AA[Context complete]
    AA --> AB{More contexts?}
    AB -->|Yes| R
    AB -->|No| AC[timeoutRunning = false]

    AD[ThreadAsync(callback)] --> AE[Returns Promise]
    AE --> AF[Thread( () => { callback(); Thread(resolve); } )]
    AF --> G

    style A fill:#4CAF50,stroke:#388E3C,color:white
    style AC fill:#FFC107,stroke:#FFA000
    style AD fill:#2196F3,stroke:#1976D2,color:white
```

## Description

This diagram illustrates how the `thread.ts` utility manages synchronous and asynchronous execution in jTemplates.

### Key Components:

- **Thread Context**: Maintains state about current execution (async mode, work list, end node)
    - Created with `CreateContext()`
    - Stored in `threadContext` global
    - Tracks `async` flag and `workEndNode`

- **Schedule()**: Adds work to run asynchronously, even during sync execution
    - Uses `queueMicrotask` for fast scheduling
    - Inserts at head of list (`before=true`)
    - Forces `async=true`

- **After()**: Adds work to run after current callback, typically synchronously
    - Appends after `workEndNode`
    - Preserves sync context unless already async

- **ProcessQueue()**: Runs in microtask/macrotask loop, processes work within time limits (~16ms)
    - Called via `queueMicrotask` initially
    - Falls back to `setTimeout` if work continues
    - Respects `workTimeMs = 16` deadline

- **DoWork()**: Executes callbacks until time runs out or queue is empty
    - Loops while `timeRemaining() > 0`
    - Processes one context at a time
    - Re-schedules incomplete work via `ScheduleWork()`

### Time Management

- Uses `queueMicrotask` for immediate scheduling (high priority)
- Falls back to `setTimeout` if work continues beyond deadline
- Respects 16ms frame budget for smooth 60fps rendering
- `createDeadline()` mimics `IdleDeadline` API from `requestIdleCallback`

### Async Coordination

- `ThreadAsync(callback)` returns a `Promise` resolved after execution
- Internally uses `Thread(() => { callback(); Thread(resolve); })` to ensure proper sequencing
- Enables awaitable background tasks without blocking UI

### Execution Flow Summary

1. A `Thread()` or `Synch()` call starts execution
2. If no context exists, a new one is created
3. Callback runs and may schedule more work via `Schedule()` or `After()`
4. `ProcessQueue()` handles async continuation using microtasks/macrotasks
5. Work is processed in chunks, yielding when time runs out
6. Promises from `ThreadAsync()` resolve once work completes

This system enables efficient, non-blocking updates across the jTemplates framework, particularly useful for:

- Large-scale DOM updates
- State reconciliation
- Batched event processing
- Animation pipelines
- Web components with deferred rendering