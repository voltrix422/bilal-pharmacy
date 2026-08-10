"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/LoadingSpinner";

function exportToCsv<TData>(
  table: TanstackTable<TData>,
  filename = "export.csv"
) {
  const visibleColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getIsVisible() && col.id !== "select" && col.id !== "actions");

  const headers = visibleColumns.map((col) => {
    const header = col.columnDef.header;
    return typeof header === "string" ? header : col.id;
  });

  const rows = table.getFilteredRowModel().rows.map((row) =>
    visibleColumns.map((col) => {
      const value = row.getValue(col.id);
      if (value == null) return "";
      if (typeof value === "object") return JSON.stringify(value);
      const str = String(value);
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    })
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchValue?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: TData[]) => void;
  filename?: string;
  pageSize?: number;
  className?: string;
  toolbar?: React.ReactNode;
  showColumnToggle?: boolean;
  showExport?: boolean;
  showPagination?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchValue = "",
  isLoading = false,
  emptyTitle = "No results",
  emptyDescription = "Try adjusting your filters or add a new record.",
  onEmptyAction,
  emptyActionLabel = "Add new",
  enableRowSelection = false,
  onRowSelectionChange,
  filename = "export.csv",
  pageSize = 10,
  className,
  toolbar,
  showColumnToggle = true,
  showExport = true,
  showPagination = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const selectionColumn = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableRowSelection) return [];
    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ];
  }, [enableRowSelection]);

  const table = useReactTable({
    data,
    columns: [...selectionColumn, ...columns],
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });

  React.useEffect(() => {
    if (!searchKey) return;
    table.getColumn(searchKey)?.setFilterValue(searchValue);
  }, [searchKey, searchValue, table]);

  const onRowSelectionChangeRef = React.useRef(onRowSelectionChange);
  onRowSelectionChangeRef.current = onRowSelectionChange;

  React.useEffect(() => {
    if (!onRowSelectionChangeRef.current) return;
    const selected = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original);
    onRowSelectionChangeRef.current(selected);
  }, [rowSelection, table]);

  if (isLoading) {
    return <TableSkeleton rows={pageSize} cols={Math.min(columns.length, 6)} />;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {toolbar}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showExport ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 sm:flex-none"
              onClick={() => exportToCsv(table, filename)}
            >
              <Download className="mr-2 h-4 w-4" />
              <span className="sm:inline">Export</span>
            </Button>
          ) : null}
          {showColumnToggle ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 flex-1 sm:flex-none"
                >
                  <Columns3 className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto rounded-xl border border-border bg-card text-card-foreground sm:mx-0 sm:rounded-md">
        <Table className="min-w-[640px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap text-xs">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <ArrowUp className="h-3.5 w-3.5" />,
                            desc: <ArrowDown className="h-3.5 w-3.5" />,
                          }[header.column.getIsSorted() as string] ?? (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="active:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 text-xs sm:py-2 sm:text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-48 p-0"
                >
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={onEmptyAction ? emptyActionLabel : undefined}
                    onAction={onEmptyAction}
                    className="border-0 bg-transparent py-10"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground sm:text-sm">
            {enableRowSelection
              ? `${table.getFilteredSelectedRowModel().rows.length} selected`
              : `${table.getFilteredRowModel().rows.length} rows`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground sm:text-sm">
              {table.getState().pagination.pageIndex + 1}/
              {table.getPageCount() || 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
