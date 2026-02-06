import type { AppState } from '../state/types.ts';
import { getCurrentConversation } from '../state/types.ts';
import { ChatTitleBar } from '../components/ChatTitleBar.tsx';
import { ChatMessage } from '../components/ChatMessage.tsx';
import { Loader } from '../components/Loader.tsx';
import { ChatInput } from '../components/ChatInput.tsx';
import { ChatStatusBar } from '../components/ChatStatusBar.tsx';
import { Sidebar } from '../components/Sidebar.tsx';
import { useStyles } from '../theme/index.ts';

const SIDEBAR_WIDTH = 36;

interface ChatViewProps {
  state: AppState;
}

export function ChatView({ state }: ChatViewProps) {
  const conv = getCurrentConversation(state);
  const messages = conv?.messages ?? [];
  const title = conv?.title ?? 'New Conversation';
  const mainWidth = state.width - SIDEBAR_WIDTH;
  useStyles();

  const attachedNames =
    conv?.datasources?.length && state.projectDatasources.length
      ? conv.datasources
          .map(
            (id) =>
              state.projectDatasources.find((d) => d.id === id)?.name ?? id,
          )
          .filter(Boolean)
      : [];

  let flatIdx = 0;
  const toolMetasByMessage: Record<
    number,
    { toolIndex: number; flatIndex: number }[]
  > = {};
  messages.forEach((msg, i) => {
    if (msg.role === 'assistant' && msg.toolCalls.length > 0) {
      toolMetasByMessage[i] = msg.toolCalls.map((_, j) => ({
        toolIndex: j,
        flatIndex: flatIdx++,
      }));
    }
  });

  const showStreaming =
    state.agentBusy &&
    (state.streamingAgentContent.length > 0 ||
      state.streamingToolCalls.length > 0);
  const streamingMsg = showStreaming
    ? {
        role: 'assistant' as const,
        content: state.streamingAgentContent,
        toolCalls: state.streamingToolCalls.map((t) => ({
          name: t.name,
          args: '',
          status: t.status,
        })),
        model: '',
        duration: '',
      }
    : null;

  return (
    <box flexDirection="row" width={state.width} height={state.height}>
      <box flexDirection="column" flexGrow={1} width={mainWidth}>
        <ChatTitleBar title={title} width={mainWidth} />
        <box height={1} />
        <scrollbox flexDirection="column" flexGrow={1}>
          {messages.map((msg, i) => (
            <box key={i} flexDirection="column">
              <ChatMessage
                msg={msg}
                width={mainWidth - 2}
                messageIndex={i}
                toolMetas={toolMetasByMessage[i] ?? []}
                expandedToolKeys={state.expandedToolKeys}
                focusedToolFlatIndex={state.focusedToolFlatIndex}
              />
              {i < messages.length - 1 ? <box height={1} /> : null}
            </box>
          ))}
          {streamingMsg && (
            <>
              <box height={1} />
              <ChatMessage
                msg={streamingMsg}
                width={mainWidth - 2}
                messageIndex={-1}
                toolMetas={[]}
                expandedToolKeys={state.expandedToolKeys}
                focusedToolFlatIndex={state.focusedToolFlatIndex}
              />
            </>
          )}
          {state.agentBusy && !showStreaming && (
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
      <Sidebar
        conversation={conv}
        attachedDatasourceNames={attachedNames}
        height={state.height}
      />
    </box>
  );
}
