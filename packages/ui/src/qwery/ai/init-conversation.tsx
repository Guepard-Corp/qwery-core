import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '../../ai-elements/prompt-input';
import { ChatStatus } from 'ai';

export interface QweryConversationInitProps {
  onSubmit: (message: PromptInputMessage) => void;
  input: string;
  setInput: (input: string) => void;
  status: ChatStatus | undefined;
}

export function QweryConversationInit(props: QweryConversationInitProps) {
  return (
    <div className="grid shrink-0 gap-4 pt-4">
      <div className="w-full px-4 pb-4">
        <PromptInput
          onSubmit={props.onSubmit}
          className="mt-4"
          globalDrop
          multiple
        >
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => props.setInput(e.target.value)}
              value={props.input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools></PromptInputTools>
            <PromptInputSubmit
              disabled={!props.input && !props.status}
              status={props.status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export default QweryConversationInit;
