import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Download, Package, Layers, Trash2 } from "lucide-react";
import { FinishedItemsTab } from "@/components/inventory/FinishedItemsTab";
import { RawMaterialsTab } from "@/components/inventory/RawMaterialsTab";
import { DeletedItemsTab } from "@/components/inventory/DeletedItemsTab";
import { FinishedItemDialog } from "@/components/inventory/FinishedItemDialog";
import { RawMaterialDialog } from "@/components/inventory/RawMaterialDialog";
import { CsvImport, CsvSampleDownload } from "@/components/CsvImport";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { formatCurrencyForPDF } from "@/lib/pdfUtils";
export default function Inventory() {
  const [activeTab, setActiveTab] = useState("items");
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddItem = () => {
    setSelectedItem(null);
    setIsItemDialogOpen(true);
  };

  const handleAddMaterial = () => {
    setSelectedMaterial(null);
    setIsMaterialDialogOpen(true);
  };

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const exportItemsPDF = async () => {
    try {
      const { data: items, error } = await supabase
        .from("finished_items")
        .select(`
          *,
          item_materials (
            quantity_used,
            cost_at_time,
            subtotal,
            raw_materials (name, type)
          ),
          item_labor (labor_type, total_cost)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Finished Items Report", 14, 20);
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = items?.map(item => [
        new Date(item.date_manufactured).toLocaleDateString(),
        item.sku,
        item.name,
        formatCurrencyForPDF(item.total_cost),
        formatCurrencyForPDF(item.selling_price),
        item.stock.toString()
      ]) || [];

      autoTable(doc, {
        startY: 35,
        head: [['Date', 'SKU', 'Name', 'Total Cost', 'Selling Price', 'Stock']],
        body: tableData,
      });

      doc.save(`finished-items-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const exportMaterialsPDF = async () => {
    try {
      const { data: materials, error } = await supabase
        .from("raw_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Raw Materials Report", 14, 20);
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = materials?.map(material => [
        material.name,
        material.type,
        `${Number(material.quantity_on_hand).toFixed(2)} ${material.unit}`,
        formatCurrencyForPDF(material.cost_per_unit)
      ]) || [];

      autoTable(doc, {
        startY: 35,
        head: [['Name', 'Type', 'Quantity', 'Cost per Unit']],
        body: tableData,
      });

      doc.save(`raw-materials-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold">Inventory Management</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="items" className="text-xs sm:text-sm gap-1">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Finished Items</span>
              <span className="xs:hidden">Items</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-xs sm:text-sm gap-1">
              <Layers className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Raw Materials</span>
              <span className="xs:hidden">Materials</span>
            </TabsTrigger>
            <TabsTrigger value="bin" className="text-xs sm:text-sm gap-1">
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              Bin
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row flex-wrap justify-end gap-2">
            {activeTab === "items" && (
              <>
                <Button onClick={exportItemsPDF} variant="outline" className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleAddItem} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </>
            )}
            {activeTab === "materials" && (
              <>
                <CsvSampleDownload
                  title="Import Raw Materials"
                  columns={[
                    { key: "name", label: "Material Name", required: true },
                    { key: "type", label: "Type (gold/silver/diamond/gem/south_sea_pearl/other)", required: true },
                    { key: "quantity_on_hand", label: "Quantity", required: true },
                    { key: "unit", label: "Unit (grams/pcs)", required: true },
                    { key: "cost_per_unit", label: "Cost per Unit", required: true },
                    { key: "other_description", label: "Other Description (if type is other)" },
                  ]}
                  sampleData={[
                    { name: "18K Yellow Gold", type: "gold", quantity_on_hand: "100", unit: "grams", cost_per_unit: "3500", other_description: "" },
                    { name: "Round Diamond 0.5ct", type: "diamond", quantity_on_hand: "50", unit: "pcs", cost_per_unit: "15000", other_description: "" },
                    { name: "Ruby Oval", type: "gem", quantity_on_hand: "20", unit: "pcs", cost_per_unit: "8000", other_description: "" },
                    { name: "925 Sterling Silver", type: "silver", quantity_on_hand: "500", unit: "grams", cost_per_unit: "80", other_description: "" },
                  ]}
                />
                <CsvImport
                  title="Import Raw Materials"
                  columns={[
                    { key: "name", label: "Material Name", required: true },
                    { key: "type", label: "Type (gold/silver/diamond/gem/south_sea_pearl/other)", required: true },
                    { key: "quantity_on_hand", label: "Quantity", required: true },
                    { key: "unit", label: "Unit (grams/pcs)", required: true },
                    { key: "cost_per_unit", label: "Cost per Unit", required: true },
                    { key: "other_description", label: "Other Description (if type is other)" },
                  ]}
                  sampleData={[
                    { name: "18K Yellow Gold", type: "gold", quantity_on_hand: "100", unit: "grams", cost_per_unit: "3500", other_description: "" },
                    { name: "Round Diamond 0.5ct", type: "diamond", quantity_on_hand: "50", unit: "pcs", cost_per_unit: "15000", other_description: "" },
                    { name: "Ruby Oval", type: "gem", quantity_on_hand: "20", unit: "pcs", cost_per_unit: "8000", other_description: "" },
                    { name: "925 Sterling Silver", type: "silver", quantity_on_hand: "500", unit: "grams", cost_per_unit: "80", other_description: "" },
                  ]}
                  onImport={async (data) => {
                    const validTypes = ["gold", "silver", "diamond", "gem", "south_sea_pearl", "other"];
                    const materials = data.map(row => {
                      const type = row.type?.toLowerCase();
                      if (!validTypes.includes(type)) {
                        throw new Error(`Invalid type "${row.type}" for material "${row.name}". Valid types: ${validTypes.join(", ")}`);
                      }
                      return {
                        name: row.name,
                        type: type as any,
                        quantity_on_hand: parseFloat(row.quantity_on_hand) || 0,
                        unit: row.unit,
                        cost_per_unit: parseFloat(row.cost_per_unit) || 0,
                        other_description: row.other_description || null,
                      };
                    });
                    const { error } = await supabase.from("raw_materials").insert(materials);
                    if (error) throw error;
                    handleSuccess();
                  }}
                />
                <Button onClick={exportMaterialsPDF} variant="outline" className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleAddMaterial} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Material
                </Button>
              </>
            )}
          </div>

          <TabsContent value="items" className="mt-6">
            <FinishedItemsTab 
              refreshTrigger={refreshTrigger}
              onEdit={(item) => {
                setSelectedItem(item);
                setIsItemDialogOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="materials" className="mt-6">
            <RawMaterialsTab 
              refreshTrigger={refreshTrigger}
              onEdit={(material) => {
                setSelectedMaterial(material);
                setIsMaterialDialogOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="bin" className="mt-6">
            <DeletedItemsTab 
              refreshTrigger={refreshTrigger}
              onRestore={handleSuccess}
            />
          </TabsContent>
        </Tabs>

        <FinishedItemDialog
          open={isItemDialogOpen}
          onOpenChange={setIsItemDialogOpen}
          item={selectedItem}
          onSuccess={handleSuccess}
        />

        <RawMaterialDialog
          open={isMaterialDialogOpen}
          onOpenChange={setIsMaterialDialogOpen}
          material={selectedMaterial}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
