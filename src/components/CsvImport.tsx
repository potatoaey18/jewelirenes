import { useState } from "react";
import { Upload, FileText, Download, X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CsvImportProps {
  onImport: (data: any[]) => Promise<void>;
  sampleData: Record<string, string>[];
  columns: { key: string; label: string; required?: boolean }[];
  title: string;
  description?: string;
}

export function CsvImport({ onImport, sampleData, columns, title, description }: CsvImportProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const downloadSample = () => {
    const headers = columns.map(c => c.key).join(",");
    const rows = sampleData.map(row => 
      columns.map(c => {
        const value = row[c.key] || "";
        // Escape values with commas or quotes
        if (value.includes(",") || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    ).join("\n");
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-sample.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Sample CSV downloaded");
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || "";
      });
      
      data.push(row);
    }
    
    return data;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const validateData = (data: any[]): string[] => {
    const errors: string[] = [];
    const requiredColumns = columns.filter(c => c.required).map(c => c.key);
    
    // Check for required columns
    if (data.length > 0) {
      const dataKeys = Object.keys(data[0]);
      const missingColumns = requiredColumns.filter(col => !dataKeys.includes(col));
      if (missingColumns.length > 0) {
        errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
      }
    }
    
    // Validate each row
    data.forEach((row, index) => {
      requiredColumns.forEach(col => {
        if (!row[col] || row[col].trim() === "") {
          errors.push(`Row ${index + 1}: Missing required field "${col}"`);
        }
      });
    });
    
    return errors;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    
    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      const validationErrors = validateData(data);
      
      setParsedData(data);
      setErrors(validationErrors);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      toast.error("Please fix validation errors before importing");
      return;
    }
    
    setImporting(true);
    try {
      await onImport(parsedData);
      toast.success(`Successfully imported ${parsedData.length} records`);
      setOpen(false);
      resetState();
    } catch (error: any) {
      toast.error(error.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || "Upload a CSV file to import data. Download the sample format first to ensure correct column headers."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sample Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Sample CSV Format</p>
                <p className="text-xs text-muted-foreground">Download to see the required format</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadSample}>
              <Download className="h-4 w-4 mr-2" />
              Download Sample
            </Button>
          </div>

          {/* Required Columns Info */}
          <div className="p-4 border rounded-lg">
            <p className="font-medium text-sm mb-2">Column Reference</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {columns.map(col => (
                <div key={col.key} className="flex items-center gap-1">
                  <span className={col.required ? "text-destructive" : "text-muted-foreground"}>
                    {col.required ? "•" : "○"}
                  </span>
                  <code className="bg-muted px-1 rounded">{col.key}</code>
                  <span className="text-muted-foreground">- {col.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">• Required fields ○ Optional fields</p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label 
              htmlFor="csv-upload" 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center gap-2">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{parsedData.length} records found</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      resetState();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload CSV file</p>
                </>
              )}
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="font-medium text-destructive">Validation Errors</p>
              </div>
              <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                {errors.slice(0, 10).map((error, i) => (
                  <li key={i} className="text-destructive">{error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="text-muted-foreground">...and {errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && errors.length === 0 && (
            <div className="p-4 border border-green-500/50 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-600">Ready to import {parsedData.length} records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {columns.slice(0, 4).map(col => (
                        <th key={col.key} className="text-left p-1 font-medium">{col.label}</th>
                      ))}
                      {columns.length > 4 && <th className="text-left p-1">...</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b">
                        {columns.slice(0, 4).map(col => (
                          <td key={col.key} className="p-1 truncate max-w-[100px]">{row[col.key]}</td>
                        ))}
                        {columns.length > 4 && <td className="p-1">...</td>}
                      </tr>
                    ))}
                    {parsedData.length > 3 && (
                      <tr>
                        <td colSpan={Math.min(columns.length, 5)} className="p-1 text-muted-foreground">
                          ...and {parsedData.length - 3} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!file || errors.length > 0 || importing}
            >
              {importing ? "Importing..." : `Import ${parsedData.length} Records`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
