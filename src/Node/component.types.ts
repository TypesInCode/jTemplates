export type ComponentEvents<E = void> = E extends void ? void : {
    [P in keyof E]?: {(data: E[P]): void};
}