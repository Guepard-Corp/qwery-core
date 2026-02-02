import { Switch, Route } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from './pages/home';
import Docs from './pages/docs';
import Blog from './pages/blog';
import Changelog from './pages/changelog';
import Download from './pages/download';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/docs" component={Docs} />
      <Route path="/docs/:slug" component={Docs} />
      <Route path="/blog" component={Blog} />
      <Route path="/changelog" component={Changelog} />
      <Route path="/download" component={Download} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
