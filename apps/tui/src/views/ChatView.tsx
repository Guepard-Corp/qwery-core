import type { AppState } from '../state/types.ts';
import { getCurrentConversation } from '../state/types.ts';
import { ChatTitleBar } from '../components/ChatTitleBar.tsx';
import { ChatMessage } from '../components/ChatMessage.tsx';
import { Loader } from '../components/Loader.tsx';
import { ChatInput } from '../components/ChatInput.tsx';
import { ChatStatusBar } from '../components/ChatStatusBar.tsx';
import { Sidebar } from '../components/Sidebar.tsx';

const SIDEBAR_WIDTH = 36;

interface ChatViewProps {
  state: AppState;
}

export function ChatView({ state }: ChatViewProps) {
  const conv = getCurrentConversation(state);
  const messages = conv?.messages ?? [];
  const title = conv?.title ?? 'New Conversation';
  const mainWidth = state.width - SIDEBAR_WIDTH;

  return (
    <box flexDirection="row" width={state.width} height={state.height}>
      <box flexDirection="column" flexGrow={1} width={mainWidth}>
        <ChatTitleBar title={title} width={mainWidth} />
        <box height={1} />
        <scrollbox flexDirection="column" flexGrow={1}>
          {messages.map((msg, i) => (
            <box key={i} flexDirection="column">
              <ChatMessage msg={msg} width={mainWidth - 2} />
              {i < messages.length - 1 ? <box height={1} /> : null}
            </box>
          ))}
          {state.agentBusy && (
            <>
              <box height={1} />
              <Loader phase={state.loaderPhase} />
            </>
          )}
        </scrollbox>
        <box height={1} />
        <ChatInput value={state.chatInput} width={mainWidth} />
        <ChatStatusBar width={mainWidth} mesh={state.meshStatus} />
      </box>
      <Sidebar conversation={conv} height={state.height} />
    </box>
  );
}
