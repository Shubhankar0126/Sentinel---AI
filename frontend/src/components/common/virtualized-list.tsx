"use client";

import { useMemo, useState, type ReactNode, type UIEvent } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  overscan = 4,
  renderItem
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const { visibleItems, offsetTop, totalHeight } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + height) / itemHeight) + overscan);
    return {
      visibleItems: items.slice(startIndex, endIndex).map((item, index) => ({
        item,
        index: startIndex + index
      })),
      offsetTop: startIndex * itemHeight,
      totalHeight: items.length * itemHeight
    };
  }, [height, itemHeight, items, overscan, scrollTop]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <div className="overflow-y-auto rounded-2xl border border-border/70" style={{ height }} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetTop}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ minHeight: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
