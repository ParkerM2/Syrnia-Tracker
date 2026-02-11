import Header from "./components/Header";
import { useSidePanel } from "./hooks/useSidePanel";
import { QueryProvider } from "./providers/QueryProvider";
import { ErrorDisplay, LoadingSpinner, ThemeToggle } from "@app/components";
import { withErrorBoundary, withSuspense } from "@app/hoc";

const SidePanelContent = () => {
  const { display, setDisplay, ActiveScreen } = useSidePanel();

  return (
    <div className="min-h-screen bg-sidebar p-8 text-sidebarForeground">
      <Header display={display} setDisplay={setDisplay} />
      <ActiveScreen />
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
