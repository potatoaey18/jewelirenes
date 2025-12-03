import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { FinishedItemsTab } from "@/components/inventory/FinishedItemsTab";
import { RawMaterialsTab } from "@/components/inventory/RawMaterialsTab";
import { FinishedItemDialog } from "@/components/inventory/FinishedItemDialog";
import { RawMaterialDialog } from "@/components/inventory/RawMaterialDialog";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

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
        `₱${Number(item.total_cost).toFixed(2)}`,
        `₱${Number(item.selling_price).toFixed(2)}`,
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
        `₱${Number(material.cost_per_unit).toFixed(2)}`
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="items">Finished Items</TabsTrigger>
            <TabsTrigger value="materials">Raw Materials</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap justify-end gap-2 mt-4">
            {activeTab === "items" && (
              <>
                <Button onClick={exportItemsPDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </>
            )}
            {activeTab === "materials" && (
              <>
                <Button onClick={exportMaterialsPDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleAddMaterial}>
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
