import { Settings, LayoutGrid, Table2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFontSize } from "@/hooks/useFontSize";

interface DashboardSettingsProps {
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
}

export function DashboardSettings({ viewMode, onViewModeChange }: DashboardSettingsProps) {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="flex items-center gap-2">
      {/* View Toggle */}
      <div className="flex items-center border border-border rounded-lg p-0.5">
        <Button
          variant={viewMode === "cards" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2"
          onClick={() => onViewModeChange("cards")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "table" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2"
          onClick={() => onViewModeChange("table")}
        >
          <Table2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Font Size Settings */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Font</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel className="text-xs">Font Size</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={fontSize} onValueChange={(v) => setFontSize(v as "small" | "medium" | "large")}>
            <DropdownMenuRadioItem value="small" className="text-xs">
              Small
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="medium" className="text-sm">
              Medium
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="large" className="text-base">
              Large
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
