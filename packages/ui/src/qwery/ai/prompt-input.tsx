import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
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
import { DatasourceSelector, type DatasourceItem } from './datasource-selector';

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

              if (
                props.status === 'streaming' ||
                props.status === 'submitted'
              ) {
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
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
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
        </PromptInputTools>
        <div className="shrink-0">
          <PromptInputSubmit
            disabled={
              props.stopDisabled ||
              (props.status !== 'streaming' &&
                props.status !== 'submitted' &&
                !props.input.trim() &&
                attachmentsCount === 0)
            }
            status={props.status}
            type={
              (props.status === 'streaming' || props.status === 'submitted') &&
              !props.stopDisabled
                ? 'button'
                : 'submit'
            }
            onClick={async (e) => {
              if (
                (props.status === 'streaming' || props.status === 'submitted') &&
                !props.stopDisabled &&
                props.onStop
              ) {
                e.preventDefault();
                e.stopPropagation();
                props.onStop();
              }
            }}
          />
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
