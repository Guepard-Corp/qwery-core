import type { Conversation, ChatMessage } from '../state/types.ts';

export type TranscriptOptions = {
  thinking: boolean;
  toolDetails: boolean;
};

export function formatConversationTranscript(
  conv: Conversation,
  options: TranscriptOptions,
): string {
  let out = `# ${conv.title}\n\n`;
  out += `**ID:** ${conv.id}\n`;
  out += `**Created:** ${new Date(conv.createdAt).toLocaleString()}\n`;
  out += `**Updated:** ${new Date(conv.updatedAt).toLocaleString()}\n\n`;
  out += `---\n\n`;

  for (const msg of conv.messages) {
    out += formatMessage(msg, options);
    out += `---\n\n`;
  }

  return out;
}

function formatMessage(msg: ChatMessage, options: TranscriptOptions): string {
  if (msg.role === 'user') {
    return `## User\n\n${msg.content}\n\n`;
  }
  let out = `## Assistant`;
  if (msg.model || msg.duration) {
    out += ` (${[msg.model, msg.duration].filter(Boolean).join(' · ')})`;
  }
  out += `\n\n${msg.content}\n\n`;
  if (options.toolDetails && msg.toolCalls.length > 0) {
    for (const tool of msg.toolCalls) {
      out += `\`\`\`\nTool: ${tool.name}\n`;
      if (tool.args) out += `Args: ${tool.args}\n`;
      if (tool.output) out += `Output:\n${tool.output}\n`;
      out += `\`\`\`\n\n`;
    }
  }
  return out;
}
