import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from '../../ai-elements/prompt-input';
import { ChatStatus } from 'ai';
import QweryContext, { QweryContextProps } from './context';
import { isResponseInProgress } from './utils/chat-status';
import { DatasourceSelector, type DatasourceItem } from './datasource-selector';
import { useToolVariant } from './tool-variant-context';
import { Switch } from '../../shadcn/switch';
import {
  ArrowUp,
  ImageIcon,
  PlusIcon,
  PaperclipIcon,
  SlidersHorizontalIcon,
  SquareIcon,
  XIcon,
} from 'lucide-react';
import { ModelsManagerSheet } from './models-manager-sheet';
import { ModelSelector } from './model-selector';
import { type SearchEngine, isSearchEngine } from './web-fetch-visualizer';
import { SubMenuSearchEngineSelect } from '../search-engine-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { PromptInputButton } from '../../ai-elements/prompt-input';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ModelOption = { name: string; shortName?: string; value: string };

export interface QweryPromptInputProps {
  onSubmit: (message: PromptInputMessage) => void;
  input: string;
  setInput: (input: string) => void;
  model: string;
  setModel: (model: string) => void;
  models: ModelOption[];
  allModels?: ModelOption[];
  onModelsChange?: (enabledModels: ModelOption[]) => void;
  status: ChatStatus | undefined;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onStop?: () => void;
  stopDisabled?: boolean;
  attachmentsCount?: number;
  usage?: QweryContextProps;
  // Datasource selector props
  selectedDatasources?: string[];
  onDatasourceSelectionChange?: (datasourceIds: string[]) => void;
  datasources?: DatasourceItem[];
  pluginLogoMap?: Map<string, string>;
  datasourcesLoading?: boolean;
  showSuggestionBadges?: boolean;
  onShowSuggestionBadgesChange?: (value: boolean) => void;
  webSearch?: boolean;
  onWebSearchChange?: (value: boolean) => void;
  preferredSearchEngine?: SearchEngine;
  onPreferredSearchEngineChange?: (engine: SearchEngine) => void;
}

/* eslint-disable react-hooks/refs -- React Compiler false positive: props are not refs */
function PromptInputContent(props: QweryPromptInputProps) {
  const attachments = usePromptInputAttachments();
  const attachmentsCount = props.attachmentsCount ?? attachments.files.length;
  const { variant, setVariant } = useToolVariant();
  const [sheetOpen, setSheetOpen] = useState(false);

  const WEB_SEARCH_KEY = 'qwery-web-search-enabled';
  const [localWebSearch, setLocalWebSearch] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(WEB_SEARCH_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const webSearch = props.webSearch ?? localWebSearch;
  const setWebSearch = props.onWebSearchChange ?? setLocalWebSearch;
  useEffect(() => {
    if (props.onWebSearchChange != null) return;
    try {
      localStorage.setItem(WEB_SEARCH_KEY, String(localWebSearch));
    } catch {
      /* ignore */
    }
  }, [localWebSearch, props.onWebSearchChange]);

  const PREFERRED_SEARCH_ENGINE_KEY = 'qwery-preferred-search-engine';
  const [localSearchEngine, setLocalSearchEngine] = useState<SearchEngine>(
    () => {
      if (typeof window === 'undefined') return 'google';
      const stored = localStorage.getItem(PREFERRED_SEARCH_ENGINE_KEY);
      return stored && isSearchEngine(stored) ? stored : 'google';
    },
  );
  const preferredSearchEngine =
    props.preferredSearchEngine ?? localSearchEngine;
  const setPreferredSearchEngine =
    props.onPreferredSearchEngineChange ?? setLocalSearchEngine;

  useEffect(() => {
    if (props.onPreferredSearchEngineChange != null) return;
    try {
      localStorage.setItem(PREFERRED_SEARCH_ENGINE_KEY, localSearchEngine);
    } catch {
      /* ignore */
    }
  }, [localSearchEngine, props.onPreferredSearchEngineChange]);

  const handleSearchEngineChange = useCallback(
    (value: string) => {
      if (isSearchEngine(value)) setPreferredSearchEngine(value);
    },
    [setPreferredSearchEngine],
  );

  const canManageModels =
    props.allModels != null && props.onModelsChange != null;
  const enabledModelIds = useMemo(
    () => new Set(props.models.map((m) => m.value)),
    [props.models],
  );

  const handleModelsChange = useCallback(
    (next: Set<string>) => {
      if (!props.allModels || !props.onModelsChange) return;
      const enabled = props.allModels.filter((m) => next.has(m.value));
      props.onModelsChange(enabled);
    },
    [props.allModels, props.onModelsChange],
  );

  return (
    <>
      <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          ref={props.textareaRef}
          onChange={(e) => props.setInput(e.target.value)}
          value={props.input}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (e.key === 'Enter' && e.shiftKey) {
              return;
            }

            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              e.stopPropagation();

              if (isResponseInProgress(props.status)) {
                return;
              }

              const form = e.currentTarget.form;
              const submitButton = form?.querySelector(
                'button[type="submit"]',
              ) as HTMLButtonElement | null;
              if (submitButton && !submitButton.disabled) {
                form?.requestSubmit();
              }
            }
          }}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <PromptInputButton aria-label="Add or attach">
                <PlusIcon className="size-4" />
              </PromptInputButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem disabled className="gap-2">
                <ImageIcon className="size-4" />
                <span>Add image/video</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => attachments.openFileDialog()}
              >
                <PaperclipIcon className="size-4" />
                <span>Attach file</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <PromptInputButton aria-label="Options">
                <SlidersHorizontalIcon className="size-4" />
              </PromptInputButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="flex cursor-default items-center justify-between gap-3 py-2"
              >
                <span className="text-sm">Minimal Tool UI</span>
                <Switch
                  checked={variant === 'minimal'}
                  onCheckedChange={(checked) => {
                    setVariant(checked ? 'minimal' : 'default');
                  }}
                />
              </DropdownMenuItem>
              {props.onShowSuggestionBadgesChange != null && (
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="flex cursor-default items-center justify-between gap-3 py-2"
                >
                  <span className="text-sm">Show suggestion badges</span>
                  <Switch
                    checked={props.showSuggestionBadges !== false}
                    onCheckedChange={props.onShowSuggestionBadgesChange}
                  />
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="flex cursor-default items-center justify-between gap-3 py-2"
              >
                <span className="text-sm">Web search</span>
                <Switch checked={webSearch} onCheckedChange={setWebSearch} />
              </DropdownMenuItem>
              {webSearch && (
                <SubMenuSearchEngineSelect
                  value={preferredSearchEngine}
                  onValueChange={handleSearchEngineChange}
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {props.datasources &&
            props.onDatasourceSelectionChange &&
            props.pluginLogoMap && (
              <DatasourceSelector
                selectedDatasources={props.selectedDatasources ?? []}
                onSelectionChange={props.onDatasourceSelectionChange}
                datasources={props.datasources}
                pluginLogoMap={props.pluginLogoMap}
                isLoading={props.datasourcesLoading}
              />
            )}
          <ModelSelector
            models={props.models}
            value={props.model}
            onValueChange={props.setModel}
            searchPlaceholder="Search models..."
            onOpenManageSheet={
              canManageModels ? () => setSheetOpen(true) : undefined
            }
          />

          {canManageModels && props.allModels && (
            <ModelsManagerSheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              allModels={props.allModels}
              enabledModelIds={enabledModelIds}
              onModelsChange={handleModelsChange}
            />
          )}
        </PromptInputTools>
        <div className="flex shrink-0 items-center gap-1">
          <QweryContext
            usedTokens={
              typeof props.usage?.usedTokens === 'number' &&
              !isNaN(props.usage.usedTokens)
                ? props.usage.usedTokens
                : 0
            }
            maxTokens={
              typeof props.usage?.maxTokens === 'number' &&
              !isNaN(props.usage.maxTokens)
                ? props.usage.maxTokens
                : 0
            }
            usage={props.usage?.usage}
            modelId={props.usage?.modelId ?? props.model}
          />
          <PromptInputSubmit
            disabled={
              props.stopDisabled ||
              (!isResponseInProgress(props.status) &&
                !props.input.trim() &&
                attachmentsCount === 0)
            }
            status={props.status}
            type={
              isResponseInProgress(props.status) && !props.stopDisabled
                ? 'button'
                : 'submit'
            }
            onClick={async (e) => {
              if (
                isResponseInProgress(props.status) &&
                !props.stopDisabled &&
                props.onStop
              ) {
                e.preventDefault();
                e.stopPropagation();
                props.onStop();
              }
            }}
          >
            {isResponseInProgress(props.status) && !props.stopDisabled ? (
              <SquareIcon className="size-4" />
            ) : props.status === 'error' ? (
              <XIcon className="size-4" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </PromptInputSubmit>
        </div>
      </PromptInputFooter>
    </>
  );
}

export default function QweryPromptInput(props: QweryPromptInputProps) {
  const { onSubmit, setInput } = props;

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      onSubmit(message);
      setInput('');
    },
    [onSubmit, setInput],
  );

  return (
    <PromptInput onSubmit={handleSubmit} globalDrop multiple>
      <PromptInputContent {...props} />
    </PromptInput>
  );
}
/* eslint-enable react-hooks/refs */
