import React, { createContext, useContext, useState, useCallback, useRef } from "react";
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


type ActionType = "create" | "update" | "delete" | "restore" | "custom";

interface ConfirmationConfig {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  actionType?: ActionType;
  destructive?: boolean;
}

interface ConfirmationState extends ConfirmationConfig {
  isOpen: boolean;
  isLoading: boolean;
}

interface ConfirmationContextType {
  confirm: (config?: ConfirmationConfig) => Promise<boolean>;
}

const defaultMessages: Record<ActionType, { title: string; description: string; confirmLabel: string }> = {
  create: {
    title: "Confirm Creation",
    description: "Are you sure you want to create this record?",
    confirmLabel: "Create",
  },
  update: {
    title: "Confirm Changes",
    description: "Are you sure you want to save these changes?",
    confirmLabel: "Save Changes",
  },
  delete: {
    title: "Confirm Deletion",
    description: "This action cannot be undone. Are you sure you want to delete this?",
    confirmLabel: "Delete",
  },
  restore: {
    title: "Confirm Restoration",
    description: "Are you sure you want to restore this item?",
    confirmLabel: "Restore",
  },
  custom: {
    title: "Confirm Action",
    description: "Are you sure you want to proceed with this action?",
    confirmLabel: "Confirm",
  },
};

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    isLoading: false,
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((config: ConfirmationConfig = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        isLoading: false,
        ...config,
      });
    });
  }, []);

  const handleConfirm = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resolveRef.current?.(true);
    setState({ isOpen: false, isLoading: false });
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState({ isOpen: false, isLoading: false });
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      handleCancel();
    }
  }, [handleCancel]);

  const actionType = state.actionType || "custom";
  const defaults = defaultMessages[actionType];
  const isDestructive = state.destructive ?? actionType === "delete";

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={state.isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title || defaults.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {state.description || defaults.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={state.isLoading}>
              {state.cancelLabel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={isDestructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {state.confirmLabel || defaults.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used within a ConfirmationProvider");
  }
  return context;
}
