import { useState, useEffect } from "react";
import { FolderPlus, FilePlus, Upload, Trash2, Folder, File, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const Files = () => {
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentFolder]);

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

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase.from("folders").delete().eq("id", folderId);
      if (error) throw error;
      toast.success("Folder deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    try {
      await supabase.storage.from("file-system").remove([storagePath]);
      const { error } = await supabase.from("files").delete().eq("id", fileId);
      if (error) throw error;
      toast.success("File deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePreviewFile = async (storagePath: string) => {
    try {
      const { data } = supabase.storage.from("file-system").getPublicUrl(storagePath);
      window.open(data.publicUrl, "_blank");
    } catch (error: any) {
      toast.error(error.message);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold mb-2">File Management</h2>
            <p className="text-muted-foreground">Current path: {getCurrentPath()}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setFolderDialogOpen(true)}
              className="bg-accent hover:bg-accent/90"
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
              className="flex items-center gap-2 cursor-pointer bg-accent text-accent-foreground px-4 py-2 rounded-md hover:bg-accent/90"
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

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className="cursor-pointer hover:shadow-lg transition-all group"
            >
              <CardContent className="p-4">
                <div
                  className="flex flex-col items-center text-center"
                  onClick={() => setCurrentFolder(folder.id)}
                >
                  <Folder className="h-16 w-16 text-accent mb-2" />
                  <p className="font-medium truncate w-full">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(folder.created_at), "PP")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}

          {files.map((file) => (
            <Card key={file.id} className="hover:shadow-lg transition-all group">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <File className="h-16 w-16 text-muted-foreground mb-2" />
                  <p className="font-medium truncate w-full text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                    onClick={() => handleDeleteFile(file.id, file.storage_path)}
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
    </div>
  );
};

export default Files;