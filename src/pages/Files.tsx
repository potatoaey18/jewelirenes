import { useState, useEffect } from "react";
import { FolderPlus, Upload, Trash2, Folder, File, Download, Eye, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Files = () => {
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "folder" | "file"; id: string; storagePath?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Fetch customers for client files tab
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch customer files
  const { data: customerFiles = [] } = useQuery({
    queryKey: ['customer-files-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_files')
        .select(`
          *,
          customers(name),
          files(*)
        `);
      if (error) throw error;
      return data;
    }
  });

  // Fetch unique vendors from expenses
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('vendor')
        .not('vendor', 'is', null);
      if (error) throw error;
      
      // Get unique vendors
      const uniqueVendors = [...new Set(data.map(e => e.vendor).filter(Boolean))];
      return uniqueVendors.sort();
    }
  });

  // Fetch vendor files
  const { data: vendorFiles = [] } = useQuery({
    queryKey: ['vendor-files-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_files')
        .select(`
          *,
          files(*)
        `);
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (activeTab === "all") {
      fetchData();
    }
  }, [currentFolder, activeTab]);

  const fetchData = async () => {
    try {
      let foldersQuery = supabase.from("folders").select("*").order("name");
      if (currentFolder) {
        foldersQuery = foldersQuery.eq("parent_id", currentFolder);
      } else {
        foldersQuery = foldersQuery.is("parent_id", null);
      }
      const { data: foldersData, error: foldersError } = await foldersQuery;

      if (foldersError) throw foldersError;
      setFolders(foldersData || []);

      let filesQuery = supabase.from("files").select("*").order("name");
      if (currentFolder) {
        filesQuery = filesQuery.eq("folder_id", currentFolder);
      } else {
        filesQuery = filesQuery.is("folder_id", null);
      }
      const { data: filesData, error: filesError } = await filesQuery;

      if (filesError) throw filesError;
      setFiles(filesData || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getCurrentPath = () => {
    if (!currentFolder) return "/";
    const folder = folders.find((f) => f.id === currentFolder);
    return folder?.path || "/";
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setLoading(true);
    try {
      const path = currentFolder
        ? `${getCurrentPath()}/${newFolderName}`
        : `/${newFolderName}`;

      const folderData: any = {
        name: newFolderName,
        path,
      };
      
      if (currentFolder) {
        folderData.parent_id = currentFolder;
      }

      const { error } = await supabase.from("folders").insert(folderData);

      if (error) throw error;

      toast.success("Folder created");
      setNewFolderName("");
      setFolderDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = currentFolder ? `${currentFolder}/${fileName}` : fileName;

      const { error: uploadError } = await supabase.storage
        .from("file-system")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const fileData: any = {
        name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: filePath,
      };
      
      if (currentFolder) {
        fileData.folder_id = currentFolder;
      }

      const { error: dbError } = await supabase.from("files").insert(fileData);

      if (dbError) throw dbError;

      toast.success("File uploaded");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteClick = (type: "folder" | "file", id: string, storagePath?: string) => {
    setItemToDelete({ type, id, storagePath });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === "folder") {
        const { error } = await supabase.from("folders").delete().eq("id", itemToDelete.id);
        if (error) throw error;
        toast.success("Folder deleted");
      } else {
        if (itemToDelete.storagePath) {
          await supabase.storage.from("file-system").remove([itemToDelete.storagePath]);
        }
        const { error } = await supabase.from("files").delete().eq("id", itemToDelete.id);
        if (error) throw error;
        toast.success("File deleted");
      }
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handlePreviewFile = async (storagePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("file-system")
        .createSignedUrl(storagePath, 3600); // 1 hour expiry
      
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      toast.error(error.message || "Failed to preview file");
    }
  };

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from("file-system").download(storagePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Group customer files by customer
  const customerFilesGrouped = customers.map(customer => {
    const filesForCustomer = customerFiles.filter(cf => cf.customer_id === customer.id);
    return {
      ...customer,
      files: filesForCustomer
    };
  });

  // Group vendor files by vendor
  const vendorFilesGrouped = vendors.map(vendor => {
    const filesForVendor = vendorFiles.filter(vf => vf.vendor_name === vendor);
    return {
      name: vendor,
      files: filesForVendor
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">File Management</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Organize and manage your files</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="all" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Folder className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">All</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Clients</span> ({customers.length})
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Vendors</span> ({vendors.length})
            </TabsTrigger>
          </TabsList>

          {/* All Files Tab */}
          <TabsContent value="all">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Path: {getCurrentPath()}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setFolderDialogOpen(true)}
                  className="bg-accent hover:bg-accent/90 w-full sm:w-auto"
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 cursor-pointer bg-accent text-accent-foreground px-4 py-2 rounded-md hover:bg-accent/90 w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </Label>
              </div>
            </div>

            {currentFolder && (
              <Button
                variant="outline"
                onClick={() => setCurrentFolder(null)}
                className="mb-4"
              >
                ← Back to Root
              </Button>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {folders.map((folder) => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:shadow-lg transition-all group"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div
                      className="flex flex-col items-center text-center"
                      onClick={() => setCurrentFolder(folder.id)}
                    >
                      <Folder className="h-10 w-10 sm:h-16 sm:w-16 text-accent mb-2" />
                      <p className="font-medium truncate w-full text-sm sm:text-base">{folder.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {format(new Date(folder.created_at), "PP")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick("folder", folder.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {files.map((file) => (
                <Card key={file.id} className="hover:shadow-lg transition-all group">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col items-center text-center">
                      <File className="h-10 w-10 sm:h-16 sm:w-16 text-muted-foreground mb-2" />
                      <p className="font-medium truncate w-full text-xs sm:text-sm">{file.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {(file.file_size / 1024).toFixed(1)} KB
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {format(new Date(file.created_at), "PP")}
                      </p>
                    </div>
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreviewFile(file.storage_path)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownloadFile(file.storage_path, file.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDeleteClick("file", file.id, file.storage_path)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {folders.length === 0 && files.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  This folder is empty. Create a folder or upload files to get started.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            {selectedCustomerId ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCustomerId(null)}
                  className="mb-4"
                >
                  ← Back to Clients
                </Button>
                <h3 className="text-lg font-semibold">
                  {customerFilesGrouped.find(c => c.id === selectedCustomerId)?.name}'s Files
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {customerFilesGrouped
                    .find(c => c.id === selectedCustomerId)
                    ?.files.map((cf: any) => (
                      <Card key={cf.id} className="hover:shadow-lg transition-all group">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col items-center text-center">
                            <File className="h-10 w-10 sm:h-16 sm:w-16 text-muted-foreground mb-2" />
                            <p className="font-medium truncate w-full text-xs sm:text-sm">{cf.files?.name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {cf.files?.file_size ? `${(cf.files.file_size / 1024).toFixed(1)} KB` : ''}
                            </p>
                            {cf.description && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
                                {cf.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                if (cf.files?.storage_path) {
                                  const { data } = supabase.storage.from("customer-files").getPublicUrl(cf.files.storage_path);
                                  window.open(data.publicUrl, "_blank");
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={async () => {
                                if (cf.files?.storage_path) {
                                  const { data, error } = await supabase.storage.from("customer-files").download(cf.files.storage_path);
                                  if (!error && data) {
                                    const url = URL.createObjectURL(data);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = cf.files.name;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  }
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  {customerFilesGrouped.find(c => c.id === selectedCustomerId)?.files.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No files attached to this customer yet.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {customerFilesGrouped.map((customer) => (
                  <Card
                    key={customer.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 sm:h-16 sm:w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                          <Users className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <p className="font-medium truncate w-full text-sm sm:text-base">{customer.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {customer.files.length} file(s)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {customers.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No clients yet. Add customers to see their file folders here.
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {vendorFilesGrouped.map((vendor) => (
                <Card
                  key={vendor.name}
                  className="hover:shadow-lg transition-all"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-10 w-10 sm:h-16 sm:w-16 bg-accent/10 rounded-full flex items-center justify-center mb-2">
                        <Building2 className="h-5 w-5 sm:h-8 sm:w-8 text-accent" />
                      </div>
                      <p className="font-medium truncate w-full text-sm sm:text-base">{vendor.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {vendor.files.length} file(s)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {vendors.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No vendors yet. Add expenses with vendors to see their file folders here.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={loading || !newFolderName.trim()}
              className="bg-accent hover:bg-accent/90"
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.type === "folder" ? "folder and all its contents" : "file"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Files;
