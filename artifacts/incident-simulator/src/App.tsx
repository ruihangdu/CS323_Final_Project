import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SimulatorPage from "@/pages/SimulatorPage";
import SetupPage from "@/pages/SetupPage";
import CustomSimulatorPage from "@/pages/CustomSimulatorPage";
import EmployerOnboardingPage from "@/pages/EmployerOnboardingPage";
import ConstellationPage from "@/pages/ConstellationPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={SetupPage} />
      <Route path="/sim" component={SimulatorPage} />
      <Route path="/custom" component={CustomSimulatorPage} />
      <Route path="/employer" component={EmployerOnboardingPage} />
      <Route path="/employer/constellation" component={ConstellationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
