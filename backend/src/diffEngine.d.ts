export interface LineItem {
    id: string;
    description: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
}
export interface DiffResult {
    added: LineItem[];
    removed: LineItem[];
    changed: {
        a: LineItem;
        b: LineItem;
        changes: Partial<LineItem>;
    }[];
    summary: {
        totalA: number;
        totalB: number;
        delta: number;
    };
}
export declare function computeDeterministicDiff(itemsA: LineItem[], itemsB: LineItem[]): DiffResult;
//# sourceMappingURL=diffEngine.d.ts.map