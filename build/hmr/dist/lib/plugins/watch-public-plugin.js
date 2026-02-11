import fg from 'fast-glob';
export const watchPublicPlugin = () => ({
    name: 'watch-public-plugin',
    async buildStart() {
        const files = await fg(['public/**/*']);
        for (const file of files) {
            this.addWatchFile(file);
        }
    },
});
