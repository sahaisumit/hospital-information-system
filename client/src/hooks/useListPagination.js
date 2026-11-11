import { useEffect, useMemo, useState } from "react";

export default function useListPagination(items = []) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [items.length, pageSize]);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageItems = useMemo(() => items.slice((safePage - 1) * pageSize, safePage * pageSize), [items, safePage, pageSize]);
  return { pageItems, page: safePage, pageSize, setPage, setPageSize, total: items.length };
}
