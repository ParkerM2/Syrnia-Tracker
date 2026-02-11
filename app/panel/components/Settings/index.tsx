import CustomThemeDialog from "./CustomThemeDialog";
import { useCustomThemes } from "./useCustomThemes";
import { cn, Button, Card, CardContent, CardHeader, CardTitle, Label, Select } from "@app/components";
import { useStorage } from "@app/hooks";
import { exampleThemeStorage } from "@app/utils/storage";
import { themes, makeCustomThemeName } from "@app/utils/themes";
import { memo } from "react";

/**
 * Settings Component
 */
const Settings = memo(() => {
  const themeStorage = useStorage(exampleThemeStorage);
  const currentThemeName = themeStorage?.themeName || "default";

  const {
    customThemes: hookCustomThemes,
    dialog,
    openAddDialog,
    openEditDialog,
    closeDialog,
    setName,
    setCss,
    save,
    deleteTheme,
  } = useCustomThemes();

  const handleThemeChange = async (themeName: string) => {
    await exampleThemeStorage.setThemeName(themeName);
  };

  const handleDeleteTheme = async (id: string) => {
    if (currentThemeName === makeCustomThemeName(id)) {
      await exampleThemeStorage.setThemeName("default");
    }
    await deleteTheme(id);
  };

  return (
    <div className={cn("flex flex-col gap-4")}>
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="bg-card/50 flex flex-col gap-2 rounded-lg border border-border p-3">
            <Label htmlFor="theme-select" className="text-base font-medium">
              Color Theme
            </Label>
            <p className="text-sm text-muted-foreground">Choose a color theme for the extension</p>
            <Select id="theme-select" value={currentThemeName} onChange={e => handleThemeChange(e.target.value)}>
              <optgroup label="Built-in">
                {themes.map(theme => (
                  <option key={theme.name} value={theme.name}>
                    {theme.displayName}
                  </option>
                ))}
              </optgroup>
              {hookCustomThemes.length > 0 && (
                <optgroup label="Custom">
                  {hookCustomThemes.map(theme => (
                    <option key={theme.id} value={makeCustomThemeName(theme.id)}>
                      {theme.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Custom Themes Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Custom Themes</CardTitle>
          <Button size="sm" onClick={openAddDialog}>
            Add Custom Theme
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {hookCustomThemes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom themes yet. Add one by pasting CSS variables from tweakcn.com or similar.
            </p>
          ) : (
            hookCustomThemes.map(theme => (
              <div
                key={theme.id}
                className="bg-card/50 flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium">{theme.name}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(theme)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteTheme(theme.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <CustomThemeDialog
        open={dialog.open}
        editingId={dialog.editingId}
        name={dialog.name}
        css={dialog.css}
        error={dialog.error}
        onNameChange={setName}
        onCssChange={setCss}
        onSave={save}
        onClose={closeDialog}
      />
    </div>
  );
});

Settings.displayName = "Settings";

export default Settings;
