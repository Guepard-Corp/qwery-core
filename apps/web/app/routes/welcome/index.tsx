import { useState } from 'react';

import { Link } from 'react-router';

import { ChevronRightIcon } from '@radix-ui/react-icons';

import { Button } from '@qwery/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@qwery/ui/card';
import { PageBody } from '@qwery/ui/page';
import { Trans } from '@qwery/ui/trans';

type HoveredCard = 'datasource' | 'database' | null;

export default function WelcomePage() {
  const [hoveredCard, setHoveredCard] = useState<HoveredCard>(null);

  return (
    <PageBody>
      <div className="flex flex-col items-center py-12">
        <div className="w-full max-w-5xl space-y-12 px-4">
          {/* Header Section */}
          <div className="space-y-3 text-left">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              WELCOME
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              <Trans i18nKey="welcome:pageTitle" />
            </h1>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Connect to Data Source Card */}
            <Card
              className="group flex flex-col transition-shadow hover:shadow-lg"
              onMouseEnter={() => setHoveredCard('datasource')}
            >
              <CardHeader className="flex-1 pb-4">
                <CardTitle className="text-2xl font-bold">
                  Connect to a data source
                </CardTitle>
                <CardDescription className="text-foreground/80 mt-2 text-base">
                  <Trans i18nKey="welcome:connectDatasourceDescription" />
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  variant="outline"
                  className="group-hover:border-primary w-full border-2"
                >
                  <Link
                    to="/datasources"
                    className="flex items-center justify-center gap-2"
                  >
                    <Trans i18nKey="welcome:connectDatasourceButton" />
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Start a Database Card */}
            <Card
              className="group flex flex-col transition-shadow hover:shadow-lg"
              onMouseEnter={() => setHoveredCard('database')}
            >
              <CardHeader className="flex-1 pb-4">
                <CardTitle className="text-2xl font-bold">
                  Start a database
                </CardTitle>
                <CardDescription className="text-foreground/80 mt-2 text-base">
                  <Trans i18nKey="welcome:startDatabaseDescription" />
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  asChild
                  variant="outline"
                  className="group-hover:border-primary w-full border-2"
                >
                  <Link
                    to="/datasources"
                    className="flex items-center justify-center gap-2"
                  >
                    <Trans i18nKey="welcome:startDatabaseButton" />
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Info Card - appears on hover */}
          {hoveredCard && (
            <Card className="animate-in fade-in mt-6 transition-all duration-200">
              <CardHeader>
                <CardTitle>
                  {hoveredCard === 'datasource'
                    ? 'Connect to a data source'
                    : 'Start a database'}
                </CardTitle>
                <CardDescription>
                  {/* Explanations will go here */}
                  Detailed explanations and web video will be added here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Web video placeholder */}
                <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-lg">
                  <p className="text-muted-foreground">Video placeholder</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageBody>
  );
}
