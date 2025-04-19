export enum RunState {
  Ready,
  Connecting,
  Queued,
  Generating,
  Error,
}

export interface TextOutputPart {
  text: string;
  hidden: boolean;
  stream: string;
  type: "text";
}

export interface ErrorOutputPart {
  message: string;
  stream: string | null;
  type: "error";
}

export type OutputPart = TextOutputPart | ErrorOutputPart;

export interface MxlRequest {
  id: string;
  params: Record<string, any>;
}

export interface MxlChat {
  id: string;
  name: string;
  turns: MxlChatTurn[];
}

export interface MxlChatTurn {
  turnId: string;
  message: MxlChatMessage;
  reply: MxlChatReply;
}

export interface MxlChatMessage {
  role: string;
  content: string;
}

export interface MxlChatReply {
  role: string;
  content: string;
}

export interface MxlChat {
  id: string;
  name: string;
  runState: RunState;
  turns: MxlChatTurn[];
}

export interface MxlChatTurn {
  turnId: string;
  chatId: string;
  message: MxlChatMessage;
  reply: MxlChatReply;
}

export type MxlChatEntry = MxlChatMessage | MxlChatReply;

export interface MxlChatMessage {
  role: string;
  content: string;
}

export interface MxlChatReply {
  role: string;
  content: string;
}

// Returns a JSON array of messages suitable for a POST
// request body
export function chatMessagesJson(chat: MxlChat) {
  return chat.turns.flatMap((t) => {
    return [
      {
        role: "user",
        text: t.message.content,
      },
      {
        role: "assistant",
        text: t.reply.content,
      },
    ];
  });
}
