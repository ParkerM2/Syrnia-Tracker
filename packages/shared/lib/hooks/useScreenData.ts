import { UPDATE_SCREEN_DATA } from '../../const.js';
import { useState, useEffect, useRef } from 'react';
import type { ScreenData } from '../utils/types.js';

// Helper to compare arrays
const arraysEqual = <T>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((val, index) => JSON.stringify(val) === JSON.stringify(b[index]));
};

// Deep comparison function for ScreenData
const isScreenDataEqual = (a: ScreenData | null, b: ScreenData | null | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.actionText.currentActionText === b.actionText.currentActionText &&
    a.actionText.exp === b.actionText.exp &&
    a.actionText.speedText === b.actionText.speedText &&
    a.actionText.addExp === b.actionText.addExp &&
    a.actionText.skillLevel === b.actionText.skillLevel &&
    a.actionText.expForNextLevel === b.actionText.expForNextLevel &&
    a.actionText.inventory.hp === b.actionText.inventory.hp &&
    a.actionText.inventory.farmingExp === b.actionText.inventory.farmingExp &&
    arraysEqual(a.actionText.combatExp, b.actionText.combatExp) &&
    arraysEqual(a.actionText.drops, b.actionText.drops) &&
    a.timestamp === b.timestamp
  );
};

export const useScreenData = (): ScreenData | null => {
  const [screenData, setScreenData] = useState<ScreenData | null>(null);
  const listenerRef = useRef<((message: { type: string; data?: ScreenData }) => void) | null>(null);

  useEffect(() => {
    // Create a stable listener function
    const messageListener = (message: { type: string; data?: ScreenData }) => {
      if (message.type === UPDATE_SCREEN_DATA) {
        setScreenData(prevData => {
          // Only update if data actually changed
          const newData = message.data ?? null;
          if (!isScreenDataEqual(prevData, newData)) {
            return newData;
          }
          return prevData; // Return previous data to prevent re-render
        });
      }
    };

    listenerRef.current = messageListener;
    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup: remove listener on unmount
    return () => {
      if (listenerRef.current) {
        chrome.runtime.onMessage.removeListener(listenerRef.current);
      }
    };
  }, []);

  // // Standalone isVisible function using HTMLElement
  // const isVisible = (element: HTMLElement): boolean => {
  //   const style = window.getComputedStyle(element);
  //   return (
  //     style.display !== 'none' &&
  //     style.visibility !== 'hidden' &&
  //     style.opacity !== '0' &&
  //     element.offsetParent !== null
  //   );
  // };

  // const scrapeScreenData = (): ScreenData => {
  //   // Get all visible text content
  //   const textNodes = document.body.querySelectorAll('*');
  //   const textContent: string[] = [];
  //   textNodes.forEach((node) => {
  //     // Ensure node is HTMLElement before calling isVisible
  //     if (node instanceof HTMLElement) {
  //       const text = node.textContent?.trim();
  //       if (text && isVisible(node)) {
  //         textContent.push(text);
  //       }
  //     }
  //   });

  //   // Get all visible images
  //   const images = Array.from(document.images)
  //     .filter((img) => isVisible(img))
  //     .map((img) => img.src);

  //   // Get all visible links
  //   const links = Array.from(document.links)
  //     .filter((link) => isVisible(link))
  //     .map((link) => link.href);

  //   return {
  //     textContent: [...new Set(textContent)],
  //     images: [...new Set(images)],
  //     links: [...new Set(links)],
  //     timestamp: new Date().toISOString(),
  //   };
  // };

  // useEffect(() => {
  //   // Initial scrape
  //   setScreenData(scrapeScreenData());

  //   // Set up MutationObserver to detect DOM changes
  //   const observer = new MutationObserver(() => {
  //     setScreenData(scrapeScreenData());
  //   });

  //   observer.observe(document.body, {
  //     childList: true,
  //     subtree: true,
  //     characterData: true,
  //   });

  //   // Cleanup observer on unmount
  //   return () => observer.disconnect();
  // }, []);

  return screenData;
};
