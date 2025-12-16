import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "cards" | "table";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  storageKey?: string;
}

export function ViewToggle({ viewMode, onViewModeChange, storageKey }: ViewToggleProps) {
  const handleChange = (mode: ViewMode) => {
    onViewModeChange(mode);
    if (storageKey) {
      localStorage.setItem(storageKey, mode);
    }
  };

  return (
    <div className="flex items-center border border-border rounded-lg p-0.5 bg-background">
      <Button
        variant={viewMode === "cards" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 sm:h-8 px-2"
        onClick={() => handleChange("cards")}
      >
        <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
      <Button
        variant={viewMode === "table" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 sm:h-8 px-2"
        onClick={() => handleChange("table")}
      >
        <Table2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
}

export function useViewMode(storageKey: string, defaultMode: ViewMode = "cards"): [ViewMode, (mode: ViewMode) => void] {
  const stored = localStorage.getItem(storageKey);
  const initialMode = (stored as ViewMode) || defaultMode;
  
  return [initialMode, (mode: ViewMode) => localStorage.setItem(storageKey, mode)];
}
