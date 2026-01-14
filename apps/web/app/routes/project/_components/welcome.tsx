import { Link, useNavigate, useParams } from 'react-router';
import { ChevronRightIcon, PlusIcon, Link2Icon } from '@radix-ui/react-icons'; // Assuming you have these or similar icons

import { PlaygroundTry } from '@qwery/playground/playground-try';
import { Button } from '@qwery/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@qwery/ui/card';
import { PageBody } from '@qwery/ui/page';
import { Trans } from '@qwery/ui/trans';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';

export default function WelcomePage() {
  const navigate = useNavigate();
  const params = useParams();
  const project_id = params.slug as string;

  const handlePlaygroundClick = () => {
    navigate(createPath(pathsConfig.app.projectPlayground, project_id));
  };

  return (
    <PageBody>
      <div className="flex flex-col items-center py-12 md:py-20">
        <div className="w-full max-w-6xl space-y-12 px-6">
          
          {/* Header Section */}
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                Project Onboarding
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <Trans i18nKey="welcome:pageTitle" />
              </h1>
              <p className="text-muted-foreground max-w-lg text-lg">
                Get started by connecting your data or spinning up a new database.
              </p>
            </div>
            {/* Playground is now a secondary action next to header on desktop */}
            <div className="w-full md:w-auto">
               <PlaygroundTry onClick={handlePlaygroundClick} />
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Cards Grid */}
          <div className="grid gap-8 md:grid-cols-2">
            
            {/* Connect to Data Source Card */}
            <Card className="flex flex-col justify-between border-2 transition-all duration-200 hover:border-primary/20 hover:bg-muted/10">
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Link2Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">
                  Connect to a data source
                </CardTitle>
                <CardDescription className="mt-2 text-base leading-relaxed">
                  <Trans i18nKey="welcome:connectDatasourceDescription" />
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-0">
                {/* Integrated Visual Placeholder */}
                <div className="bg-muted/40 border-border/60 flex aspect-video w-full items-center justify-center rounded-md border border-dashed">
                  <span className="text-muted-foreground text-sm font-medium">
                    Explainer Video / Preview
                  </span>
                </div>
              </CardContent>

              <CardFooter className="pt-6">
                <Button asChild className="w-full" size="lg">
                  <Link
                    to={createPath(pathsConfig.app.availableSources, project_id)}
                    className="flex items-center justify-center gap-2"
                  >
                    <Trans i18nKey="welcome:connectDatasourceButton" />
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Start a Database Card */}
            <Card className="flex flex-col justify-between border-2 transition-all duration-200 hover:border-primary/20 hover:bg-muted/10">
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                  <PlusIcon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">
                  Start a database
                </CardTitle>
                <CardDescription className="mt-2 text-base leading-relaxed">
                  <Trans i18nKey="welcome:startDatabaseDescription" />
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-0">
                {/* Integrated Visual Placeholder */}
                <div className="bg-muted/40 border-border/60 flex aspect-video w-full items-center justify-center rounded-md border border-dashed">
                  <span className="text-muted-foreground text-sm font-medium">
                    Explainer Video / Preview
                  </span>
                </div>
              </CardContent>

              <CardFooter className="pt-6">
                <Button asChild variant="outline" className="w-full border-2" size="lg">
                  <Link
                    to="/datasources"
                    className="flex items-center justify-center gap-2"
                  >
                    <Trans i18nKey="welcome:startDatabaseButton" />
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </PageBody>
  );
}