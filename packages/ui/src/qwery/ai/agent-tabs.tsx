import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../shadcn/tabs';
import { Button } from '../../shadcn/button';
import { XIcon, PlusIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AgentTab {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
}

export interface AgentTabsProps {
  tabs: AgentTab[];
  onTabAdd?: () => void;
  onTabRemove?: (tabId: string) => void;
  defaultTabId?: string;
  className?: string;
}

export function AgentTabs({
  tabs,
  onTabAdd,
  onTabRemove,
  defaultTabId,
  className,
}: AgentTabsProps) {
  const [activeTab, setActiveTab] = useState<string>(
    defaultTabId ?? tabs[0]?.id ?? '',
  );

  const activeTabValue = useMemo(() => {
    if (tabs.length === 0) {
      return '';
    }

    const tabExists = tabs.some((tab) => tab.id === activeTab);
    if (tabExists) {
      return activeTab;
    }

    return tabs[0]?.id ?? '';
  }, [activeTab, tabs]);

  // If no tabs, show empty state or add button
  if (tabs.length === 0) {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center p-4',
          className,
        )}
      >
        {onTabAdd && (
          <Button variant="outline" onClick={onTabAdd}>
            <PlusIcon />
            Add Tab
          </Button>
        )}
      </div>
    );
  }

  const handleTabRemove = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (onTabRemove) {
      onTabRemove(tabId);
    }
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <Tabs
        value={activeTabValue}
        onValueChange={setActiveTab}
        className="flex h-full flex-col"
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <TabsList className="h-auto w-full justify-start bg-transparent p-0">
            {tabs.map((tab) => (
              <div key={tab.id} className="group relative">
                <TabsTrigger
                  value={tab.id}
                  className="relative pr-8 data-[state=active]:bg-transparent"
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{tab.title}</span>
                    {tab.description && (
                      <span className="text-muted-foreground text-xs">
                        {tab.description}
                      </span>
                    )}
                  </div>
                </TabsTrigger>
                {onTabRemove && tabs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 h-5 w-5 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleTabRemove(e, tab.id)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </TabsList>
          {onTabAdd && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTabAdd}
              className="ml-2 shrink-0"
            >
              <PlusIcon />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="m-0 h-full p-4">
              {tab.component}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
