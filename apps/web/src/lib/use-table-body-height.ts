"use client";

import { type RefObject, useLayoutEffect, useState } from "react";

const MIN_TABLE_BODY_HEIGHT = 160;

function outerHeight(element: HTMLElement | null): number {
  if (!element) return 0;
  const style = getComputedStyle(element);
  return element.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
}

export function useTableBodyHeight(
  wrapperRef: RefObject<HTMLElement | null>,
  remeasureKey: string,
): number | undefined {
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const measure = () => {
      const tableHeader = wrapper.querySelector<HTMLElement>(".ant-table-thead");
      const pagination = wrapper.querySelector<HTMLElement>(".ant-table-pagination");
      const available = wrapper.clientHeight - outerHeight(tableHeader) - outerHeight(pagination);
      setHeight(Math.max(MIN_TABLE_BODY_HEIGHT, Math.floor(available)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [wrapperRef, remeasureKey]);

  return height;
}
