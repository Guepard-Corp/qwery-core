import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
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
  PaperclipIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { PromptInputButton } from '../../ai-elements/prompt-input';

export interface QweryPromptInputProps {
  onSubmit: (message: PromptInputMessage) => void;
  input: string;
  setInput: (input: string) => void;
  model: string;
  setModel: (model: string) => void;
  models: { name: string; value: string }[];
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
}

/* eslint-disable react-hooks/refs -- React Compiler false positive: props are not refs */
function PromptInputContent(props: QweryPromptInputProps) {
  const attachments = usePromptInputAttachments();
  const attachmentsCount = props.attachmentsCount ?? attachments.files.length;
  const { variant, setVariant } = useToolVariant();

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
          <PromptInputSelect
            onValueChange={(value) => {
              props.setModel(value);
            }}
            value={props.model}
          >
            <PromptInputSelectTrigger>
              <PromptInputSelectValue />
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {props.models.map((model) => (
                <PromptInputSelectItem key={model.value} value={model.value}>
                  {model.name}
                </PromptInputSelectItem>
              ))}
            </PromptInputSelectContent>
          </PromptInputSelect>
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
  return (
    <PromptInput onSubmit={props.onSubmit} className="mt-4" globalDrop multiple>
      <PromptInputContent {...props} />
    </PromptInput>
  );
}
/* eslint-enable react-hooks/refs */
