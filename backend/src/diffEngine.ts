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

export function computeDeterministicDiff(itemsA: LineItem[], itemsB: LineItem[]): DiffResult {
  const result: DiffResult = {
    added: [],
    removed: [],
    changed: [],
    summary: {
      totalA: 0,
      totalB: 0,
      delta: 0
    }
  };

  const mapA = new Map(itemsA.map(item => [item.id, item]));
  const mapB = new Map(itemsB.map(item => [item.id, item]));

  for (const itemA of itemsA) {
    result.summary.totalA += itemA.totalPrice;
    const itemB = mapB.get(itemA.id);
    
    if (!itemB) {
      result.removed.push(itemA);
    } else {
      // Exists in both, check for changes
      const changes: Partial<LineItem> = {};
      let hasChanges = false;
      
      if (itemA.qty !== itemB.qty) { changes.qty = itemB.qty; hasChanges = true; }
      if (itemA.unitPrice !== itemB.unitPrice) { changes.unitPrice = itemB.unitPrice; hasChanges = true; }
      if (itemA.totalPrice !== itemB.totalPrice) { changes.totalPrice = itemB.totalPrice; hasChanges = true; }
      
      if (hasChanges) {
        result.changed.push({ a: itemA, b: itemB, changes });
      }
    }
  }

  for (const itemB of itemsB) {
    result.summary.totalB += itemB.totalPrice;
    if (!mapA.has(itemB.id)) {
      result.added.push(itemB);
    }
  }

  result.summary.delta = result.summary.totalB - result.summary.totalA;

  return result;
}
