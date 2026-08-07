'use client';

import { TablePagination, type TablePaginationProps } from '@mui/material';
import { LIST_PAGE_SIZE_OPTIONS } from './constants';

export type ListTablePaginationProps = Omit<
  TablePaginationProps,
  'component' | 'rowsPerPageOptions'
> & {
  rowsPerPageOptions?: number[];
};

/** Liste tabloları altında ortak sayfalama çubuğu */
export function ListTablePagination({
  rowsPerPageOptions = [...LIST_PAGE_SIZE_OPTIONS],
  labelRowsPerPage = 'Sayfa başına',
  labelDisplayedRows = ({ from, to, count }) =>
    `${from}–${to} / ${count !== -1 ? count : `more than ${to}`}`,
  sx,
  ...rest
}: ListTablePaginationProps) {
  return (
    <TablePagination
      component="div"
      rowsPerPageOptions={rowsPerPageOptions}
      labelRowsPerPage={labelRowsPerPage}
      labelDisplayedRows={labelDisplayedRows}
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        '.MuiTablePagination-toolbar': { flexWrap: 'wrap', gap: 0.5 },
        ...((sx as object) || {}),
      }}
      {...rest}
    />
  );
}
