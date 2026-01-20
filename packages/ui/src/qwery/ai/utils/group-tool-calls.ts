import type { ToolUIPart, UIMessage } from 'ai';
import { getUserFriendlyToolName } from './tool-name';

export interface ToolCallGroup {
  startIndex: number;
  endIndex: number;
  toolParts: Array<{ part: ToolUIPart; index: number }>;
  name: string;
}

/**
 * Groups consecutive tool calls in a message's parts array.
 * Returns an array of groups, where each group contains consecutive tool calls.
 */
export function groupConsecutiveToolCalls(
  parts: UIMessage['parts'],
): ToolCallGroup[] {
  const groups: ToolCallGroup[] = [];
  let currentGroup: ToolCallGroup | null = null;

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (!part) continue;
    
    if (part.type.startsWith('tool-')) {
      const toolPart = part as ToolUIPart;

      if (currentGroup === null) {
        // Start a new group
        currentGroup = {
          startIndex: index,
          endIndex: index,
          toolParts: [{ part: toolPart, index }],
          name: getToolGroupName(toolPart),
        };
      } else {
        // Add to existing group
        currentGroup.toolParts.push({ part: toolPart, index });
        currentGroup.endIndex = index;
        currentGroup.name = getToolGroupName(currentGroup.toolParts);
      }
    } else {
      // Non-tool part encountered, finalize current group if exists
      // Only group if there are 2+ consecutive tool calls
      if (currentGroup !== null && currentGroup.toolParts.length > 1) {
        groups.push(currentGroup);
      }
      currentGroup = null;
    }
  }

  // Finalize any remaining group
  // Only group if there are 2+ consecutive tool calls
  if (currentGroup !== null && currentGroup.toolParts.length > 1) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Gets a semantic name for a tool group based on the tools it contains.
 */
function getToolGroupName(
  toolPartOrParts: ToolUIPart | Array<{ part: ToolUIPart; index: number }>,
): string {
  const toolParts = Array.isArray(toolPartOrParts)
    ? toolPartOrParts.map((tp) => tp.part)
    : [toolPartOrParts];

  const uniqueToolTypes = new Set(
    toolParts.map((tp) => {
      if ('toolName' in tp && typeof tp.toolName === 'string') {
        return tp.toolName;
      }
      return tp.type;
    }),
  );

  const count = toolParts.length;

  if (uniqueToolTypes.size === 1) {
    const toolType = Array.from(uniqueToolTypes)[0];
    if (!toolType) {
      return `Tool Execution (${count} steps)`;
    }

    // Get friendly name for better grouping
    const friendlyName = toolType.startsWith('tool-')
      ? getUserFriendlyToolName(toolType)
      : getUserFriendlyToolName(`tool-${toolType}`);

    // Generate action name based on tool type
    const lowerName = friendlyName.toLowerCase();
    if (lowerName.includes('query') || lowerName.includes('sql')) {
      return `Query Execution (${count} steps)`;
    }
    if (lowerName.includes('chart')) {
      return `Chart Generation (${count} steps)`;
    }
    if (lowerName.includes('schema')) {
      return `Schema Analysis (${count} steps)`;
    }
    if (lowerName.includes('connection') || lowerName.includes('test')) {
      return `Connection Test (${count} steps)`;
    }
    if (lowerName.includes('workflow')) {
      return `Workflow Execution (${count} steps)`;
    }
    
    return `${friendlyName} (${count} steps)`;
  }

  // Multiple different tool types
  const toolNames = Array.from(uniqueToolTypes)
    .slice(0, 2)
    .map((tt) => {
      const friendlyName = tt.startsWith('tool-')
        ? getUserFriendlyToolName(tt)
        : getUserFriendlyToolName(`tool-${tt}`);
      return friendlyName;
    })
    .join(', ');
  
  const remaining = uniqueToolTypes.size - 2;
  if (remaining > 0) {
    return `${toolNames} +${remaining} more (${count} tools)`;
  }
  
  return `${toolNames} (${count} tools)`;
}

/**
 * Checks if a part index is part of a tool call group.
 */
export function isPartOfToolGroup(
  index: number,
  groups: ToolCallGroup[],
): boolean {
  return groups.some(
    (group) => index >= group.startIndex && index <= group.endIndex,
  );
}

/**
 * Gets the tool group that contains a specific part index.
 */
export function getToolGroupForIndex(
  index: number,
  groups: ToolCallGroup[],
): ToolCallGroup | undefined {
  return groups.find(
    (group) => index >= group.startIndex && index <= group.endIndex,
  );
}

