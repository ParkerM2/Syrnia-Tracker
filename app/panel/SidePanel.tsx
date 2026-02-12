import Header from "./components/Header";
import { useSidePanel } from "./hooks/useSidePanel";
import { QueryProvider } from "./providers/QueryProvider";
import { ErrorDisplay, LoadingSpinner, ThemeToggle } from "@app/components";
import { withErrorBoundary, withSuspense } from "@app/hoc";

const SidePanelContent = () => {
  const { display, setDisplay, ActiveScreen } = useSidePanel();

  return (
    <div className="min-h-screen bg-sidebar text-sidebarForeground">
      <div className="sticky top-0 z-50 bg-sidebar px-8 pb-0 pt-8">
        <Header display={display} setDisplay={setDisplay} />
      </div>
      <div className="px-8 pb-8">
        <ActiveScreen />
      </div>
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
