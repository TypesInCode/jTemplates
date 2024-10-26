export interface IDestroyable {
    Destroy(): void;
}

type NonFunctionKeys<T> = {
    [P in keyof T]: T[P] extends Function ? never : P;
}[keyof T];

export declare type RecursivePartial<T> = {
    [P in keyof Pick<T, NonFunctionKeys<T>>]?: T[P] extends Function ? never : T[P] extends object ? RecursivePartial<T[P]> : T[P];
};