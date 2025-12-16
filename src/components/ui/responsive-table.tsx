import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  keyField?: string;
}

export function ResponsiveTable({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data available",
  keyField = "id",
}: ResponsiveTableProps) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((row, index) => (
          <Card
            key={row[keyField] || index}
            className={cn(
              "overflow-hidden",
              onRowClick && "cursor-pointer hover:shadow-md transition-shadow"
            )}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-4 space-y-2">
              {columns.map((column) => {
                const value = column.key.split('.').reduce((obj, key) => obj?.[key], row);
                const renderedValue = column.render ? column.render(value, row) : value;
                
                return (
                  <div key={column.key} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">
                      {column.label}
                    </span>
                    <span className={cn("text-sm text-right", column.className)}>
                      {renderedValue ?? "-"}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "text-left text-sm font-semibold text-muted-foreground py-3 px-4",
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row[keyField] || index}
              className={cn(
                "border-b border-border/50 hover:bg-muted/50 transition-colors",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => {
                const value = column.key.split('.').reduce((obj, key) => obj?.[key], row);
                const renderedValue = column.render ? column.render(value, row) : value;
                
                return (
                  <td
                    key={column.key}
                    className={cn("py-3 px-4 text-sm", column.className)}
                  >
                    {renderedValue ?? "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
