import { useStorage } from "@app/hooks";
import { parseThemeCss, reconstructCss, validateParsedTheme } from "@app/utils/parse-theme-css";
import { customThemesStorage } from "@app/utils/storage/custom-themes-storage";
import { useCallback, useState } from "react";
import type { CustomTheme } from "@app/utils/storage/types";

interface DialogState {
  open: boolean;
  editingId: string | null;
  name: string;
  css: string;
  error: string | null;
}

const initialDialogState: DialogState = {
  open: false,
  editingId: null,
  name: "",
  css: "",
  error: null,
};

export const useCustomThemes = () => {
  const customThemesState = useStorage(customThemesStorage);
  const customThemes = customThemesState?.themes ?? [];
  const [dialog, setDialog] = useState<DialogState>(initialDialogState);

  const openAddDialog = useCallback(() => {
    setDialog({ open: true, editingId: null, name: "", css: "", error: null });
  }, []);

  const openEditDialog = useCallback((theme: CustomTheme) => {
    setDialog({
      open: true,
      editingId: theme.id,
      name: theme.name,
      css: reconstructCss(theme.variables),
      error: null,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(initialDialogState);
  }, []);

  const setName = useCallback((name: string) => {
    setDialog(prev => ({ ...prev, name, error: null }));
  }, []);

  const setCss = useCallback((css: string) => {
    setDialog(prev => ({ ...prev, css, error: null }));
  }, []);

  const save = useCallback(async () => {
    const trimmedName = dialog.name.trim();
    if (!trimmedName) {
      setDialog(prev => ({ ...prev, error: "Theme name is required." }));
      return;
    }

    const parsed = parseThemeCss(dialog.css);
    const validationError = validateParsedTheme(parsed);
    if (validationError) {
      setDialog(prev => ({ ...prev, error: validationError }));
      return;
    }

    if (dialog.editingId) {
      await customThemesStorage.updateTheme(dialog.editingId, {
        name: trimmedName,
        variables: parsed,
      });
    } else {
      const newTheme: CustomTheme = {
        id: crypto.randomUUID(),
        name: trimmedName,
        createdAt: Date.now(),
        variables: parsed,
      };
      await customThemesStorage.addTheme(newTheme);
    }

    setDialog(initialDialogState);
  }, [dialog.name, dialog.css, dialog.editingId]);

  const deleteTheme = useCallback(async (id: string) => {
    await customThemesStorage.deleteTheme(id);
  }, []);

  return {
    customThemes,
    dialog,
    openAddDialog,
    openEditDialog,
    closeDialog,
    setName,
    setCss,
    save,
    deleteTheme,
  };
};
