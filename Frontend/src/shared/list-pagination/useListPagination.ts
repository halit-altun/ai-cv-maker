'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TablePaginationProps } from '@mui/material/TablePagination';
import {
  DEFAULT_LIST_PAGE,
  DEFAULT_LIST_PAGE_SIZE,
  LIST_PAGE_SIZE_OPTIONS,
  type ListPageSize,
} from './constants';

export type UseListPaginationResult<T> = {
  page: number;
  pageSize: ListPageSize;
  total: number;
  pageItems: T[];
  setPage: (page: number) => void;
  setPageSize: (size: ListPageSize) => void;
  tablePaginationProps: Pick<
    TablePaginationProps,
    | 'count'
    | 'page'
    | 'rowsPerPage'
    | 'onPageChange'
    | 'onRowsPerPageChange'
    | 'rowsPerPageOptions'
    | 'labelRowsPerPage'
    | 'labelDisplayedRows'
  >;
};

/**
 * Client-side liste sayfalama.
 * page 1-based; MUI TablePagination için 0-based props üretir.
 * resetDeps değişince sayfa 1’e döner (filtre/arama vb.).
 */
export function useListPagination<T>(
  items: T[],
  resetDeps: unknown[] = []
): UseListPaginationResult<T> {
  const [page, setPage] = useState(DEFAULT_LIST_PAGE);
  const [pageSize, setPageSizeState] = useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- caller passes explicit reset keys
  useEffect(() => {
    setPage(DEFAULT_LIST_PAGE);
  }, resetDeps);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  const setPageSize = useCallback((size: ListPageSize) => {
    setPageSizeState(size);
    setPage(DEFAULT_LIST_PAGE);
  }, []);

  const onPageChange = useCallback((_event: unknown, nextZeroBased: number) => {
    setPage(nextZeroBased + 1);
  }, []);

  const onRowsPerPageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = Number(event.target.value);
      const allowed = LIST_PAGE_SIZE_OPTIONS.includes(next as ListPageSize)
        ? (next as ListPageSize)
        : DEFAULT_LIST_PAGE_SIZE;
      setPageSize(allowed);
    },
    [setPageSize]
  );

  return {
    page: safePage,
    pageSize,
    total,
    pageItems,
    setPage,
    setPageSize,
    tablePaginationProps: {
      count: total,
      page: safePage - 1,
      rowsPerPage: pageSize,
      onPageChange,
      onRowsPerPageChange,
      rowsPerPageOptions: [...LIST_PAGE_SIZE_OPTIONS],
      labelRowsPerPage: 'Sayfa başına',
      labelDisplayedRows: ({ from, to, count }) =>
        `${from}–${to} / ${count !== -1 ? count : `more than ${to}`}`,
    },
  };
}

/**
 * Server-side sayfalama state (limit/skip API’leri için).
 * resetDeps değişince page → 1.
 */
export function useServerListPagination(resetDeps: unknown[] = []) {
  const [page, setPage] = useState(DEFAULT_LIST_PAGE);
  const [pageSize, setPageSizeState] = useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(DEFAULT_LIST_PAGE);
  }, resetDeps);

  const setPageSize = useCallback((size: ListPageSize) => {
    setPageSizeState(size);
    setPage(DEFAULT_LIST_PAGE);
  }, []);

  const skip = (Math.max(1, page) - 1) * pageSize;

  const onPageChange = useCallback((_event: unknown, nextZeroBased: number) => {
    setPage(nextZeroBased + 1);
  }, []);

  const onRowsPerPageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = Number(event.target.value);
      const allowed = LIST_PAGE_SIZE_OPTIONS.includes(next as ListPageSize)
        ? (next as ListPageSize)
        : DEFAULT_LIST_PAGE_SIZE;
      setPageSize(allowed);
    },
    [setPageSize]
  );

  const buildTablePaginationProps = useCallback(
    (total: number): UseListPaginationResult<unknown>['tablePaginationProps'] => ({
      count: total,
      page: Math.max(0, page - 1),
      rowsPerPage: pageSize,
      onPageChange,
      onRowsPerPageChange,
      rowsPerPageOptions: [...LIST_PAGE_SIZE_OPTIONS],
      labelRowsPerPage: 'Sayfa başına',
      labelDisplayedRows: ({ from, to, count }) =>
        `${from}–${to} / ${count !== -1 ? count : `more than ${to}`}`,
    }),
    [onPageChange, onRowsPerPageChange, page, pageSize]
  );

  return {
    page,
    pageSize,
    skip,
    limit: pageSize,
    setPage,
    setPageSize,
    buildTablePaginationProps,
  };
}
