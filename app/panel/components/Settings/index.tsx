import { cn, Card, CardContent, CardHeader, CardTitle, Label, Select } from '@app/components';
import { useStorage } from '@app/hooks';
import { exampleThemeStorage } from '@app/utils/storage';
import { themes, applyTheme, getTheme } from '@app/utils/themes';
import { memo, useEffect } from 'react';

/**
 * Settings Component
 */
const Settings = memo(() => {
  const themeStorage = useStorage(exampleThemeStorage);
  const currentThemeName = themeStorage?.themeName || 'default';
  const isDark = themeStorage ? !themeStorage.isLight : true;

  // Apply theme when it changes
  useEffect(() => {
    if (themeStorage?.themeName) {
      const theme = getTheme(themeStorage.themeName);
      if (theme) {
        applyTheme(theme, isDark);
      }
    }
  }, [themeStorage?.themeName, isDark]);

  const handleThemeChange = async (themeName: string) => {
    await exampleThemeStorage.setThemeName(themeName);
    const theme = getTheme(themeName);
    if (theme) {
      applyTheme(theme, isDark);
    }
  };

  return (
    <div className={cn('flex flex-col gap-4')}>
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3">
            <Label htmlFor="theme-select" className="text-base font-medium">
              Color Theme
            </Label>
            <p className="text-sm text-muted-foreground">Choose a color theme for the extension</p>
            <Select id="theme-select" value={currentThemeName} onChange={e => handleThemeChange(e.target.value)}>
              {themes.map(theme => (
                <option key={theme.name} value={theme.name}>
                  {theme.displayName}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

Settings.displayName = 'Settings';

export default Settings;
