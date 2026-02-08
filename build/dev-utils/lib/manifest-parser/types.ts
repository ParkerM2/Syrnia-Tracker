type ManifestType = chrome.runtime.ManifestV3;

export interface IManifestParser {
  convertManifestToString: (manifest: ManifestType, isFirefox: boolean) => string;
}
