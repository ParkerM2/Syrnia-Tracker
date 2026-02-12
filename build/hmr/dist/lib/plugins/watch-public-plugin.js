import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
export const watchPublicPlugin = () => ({
    name: 'watch-public-plugin',
    async buildStart() {
        const entries = await readdir('public', { recursive: true, withFileTypes: true });
        const files = entries.filter(e => e.isFile()).map(e => join(e.parentPath, e.name));
        for (const file of files) {
            this.addWatchFile(file);
        }
    },
});
