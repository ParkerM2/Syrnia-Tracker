# Content Script

This tool allows you to inject Console Scripts into all pages specified by you.

https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

### Add New Script

1. Create a new folder in `matches/` with your script name and add an `index.ts` file.
2. Edit `manifest.ts`:
- In `content-scripts` section add object with:

```ts
{
  matches: ['URL_FOR_INJECT'], 
  js: ['content/{matches_folder_name}.iife.js']
}
```