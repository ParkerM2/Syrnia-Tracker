import Header from "./components/Header";
import { UntrackedExpBanner } from "./components/UntrackedExpBanner";
import { useSidePanel } from "./hooks/useSidePanel";
import { QueryProvider } from "./providers/QueryProvider";
import { ErrorDisplay, LoadingSpinner, ThemeToggle } from "@app/components";
import { withErrorBoundary, withSuspense } from "@app/hoc";
import { useStorage } from "@app/hooks";
import { zoomStorage } from "@app/utils/storage";
import { useState } from "react";

const SidePanelContent = () => {
  const { display, setDisplay, ActiveScreen } = useSidePanel();
  const { zoomLevel } = useStorage(zoomStorage);
  const [bannerExpanded, setBannerExpanded] = useState(false);

  return (
    <div
      className="bg-sidebar text-sidebarForeground"
      style={{ zoom: zoomLevel / 100, minHeight: `${10000 / zoomLevel}vh` }}>
      <div className="sticky top-0 z-50 mb-4 bg-sidebar px-4 pt-4">
        <Header display={display} setDisplay={setDisplay} />
      </div>
      <UntrackedExpBanner onExpandChange={setBannerExpanded} />
      {!bannerExpanded && (
        <div className="px-4 pb-4">
          <ActiveScreen />
        </div>
      )}
      <ThemeToggle />
    </div>
  );
};

const SidePanel = () => (
  <QueryProvider>
    <SidePanelContent />
  </QueryProvider>
);

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
