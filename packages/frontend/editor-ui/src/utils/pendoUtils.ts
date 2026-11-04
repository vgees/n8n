import type { ChatUI } from '@n8n/design-system/types/assistant';

/**
 * Pendo agent identifiers for the conversational AI surfaces in the editor
 */
export const PENDO_AGENT_IDS = {
	/** n8n AI Assistant (help / error / credentials chat) */
	assistant: '_zwbtIsRcUMys3km1LxsapqKnCA',
	/** AI Workflow Builder (prompt to workflow) */
	workflowBuilder: 'YQ7GP0HQYruAq8Anj5tr1W9NhXA',
	/** Workflow AI Agent Chat (manual chat with the user's workflow agent) */
	workflowAgentChat: '-ERYFWOXKbqzWNGKSrM5mH5hUHU',
} as const;

export type PendoAgentEventType = 'prompt' | 'agent_response' | 'user_reaction';

export type PendoAgentReaction = 'positive' | 'negative' | 'mixed' | 'undo' | 'retry';

export interface PendoAgentMetadata {
	agentId: string;
	conversationId: string;
	messageId: string;
	content: string;
	modelUsed?: string;
	suggestedPrompt?: boolean;
	toolsUsed?: string[];
	fileUploaded?: boolean;
}

declare global {
	interface Window {
		pendo?: {
			trackAgent?: (eventType: PendoAgentEventType, metadata: PendoAgentMetadata) => void;
		};
	}
}

/**
 * Sends a conversational agent event to Pendo, if the Pendo agent is loaded on the page.
 * Never throws, so analytics can not break the chat flows.
 */
export function trackPendoAgent(eventType: PendoAgentEventType, metadata: PendoAgentMetadata) {
	try {
		window.pendo?.trackAgent?.(eventType, metadata);
	} catch {
		// Analytics failures are ignored on purpose
	}
}

/**
 * Assistant and builder chats share the same id between a user message and the
 * assistant messages answering it, so prefix them to keep Pendo message ids unique.
 */
export function getPendoPromptMessageId(id: string) {
	return `prompt_${id}`;
}

export function getPendoResponseMessageId(id: string) {
	return `agent_response_${id}`;
}

/**
 * Builds a plain text representation of the assistant messages that form a single response
 */
export function getAssistantResponseText(messages: ChatUI.AssistantMessage[]): string {
	return messages
		.map((msg) => {
			switch (msg.type) {
				case 'text':
				case 'error':
				case 'rate-workflow':
					return msg.content;
				case 'block':
				case 'agent-suggestion':
					return [msg.title, msg.content].filter(Boolean).join('\n');
				case 'code-diff':
					return msg.description ?? '';
				case 'workflow-step':
					return msg.steps.join('\n');
				case 'workflow-node':
					return msg.nodes.join(', ');
				case 'workflow-composed':
					return msg.nodes.map((node) => node.name).join(', ');
				default:
					return '';
			}
		})
		.filter((text) => text.length > 0)
		.join('\n\n');
}
