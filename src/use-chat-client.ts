import SSE, { connectStream, Frame } from "./sse";
import {
  chatMessagesJson,
  MxlChat,
  MxlChatTurn,
  OutputPart,
  RunState,
} from "./types";
import { useEffect, useReducer } from "react";
import { v4 as uuidv4 } from "uuid";
import { produce, WritableDraft } from "immer";

export interface MixlayerChatClientState {
  runState: RunState;
  response: AppResponse | null;
  params: string;
  chats: MxlChat[];
}

export interface UseMixlayerChat {
  state: MixlayerChatClientState;
  clearOutput: () => void;
  setParams: (params: string) => void;
  sendRequest: () => void;
  stopRequest: () => void;
  sendChatMessage: (chatId: string, message: string) => void;
  createNewChat: (name: string | null) => string;
  renameChat: (chatId: string, name: string) => void;
  deleteChat: (chatId: string) => void;
  regenerateLastChatTurn: (chatId: string) => void;
  deleteChatTurn: (chatId: string, requestId: string) => void;
}

interface AppResponse {
  // the body of the request that was sent to the app
  requestBody: any;

  // all output parts received for this response
  outputParts: OutputPart[];

  // streams recognized by this response
  streams: string[];

  // console output received for this response
  consoleOutput: string;

  // current chat turn for this response (if a chat response)
  chatTurn: MxlChatTurn | null;

  // SSE channel being used to receive this response
  sseChannel: SSE | null;
}

type AppResponseAction = {
  type: "RECEIVE_FRAME";
  frame: Frame;
};

type AppClientAction =
  | AppResponseAction
  | { type: "CLEAR_OUTPUT" }
  | { type: "SET_PARAMS"; params: string }
  | { type: "BEGIN_APP_REQUEST" }
  | { type: "STOP_REQUEST" }
  | { type: "BEGIN_APP_CHAT_REQUEST"; chatId: string; message: string }
  | { type: "REQUEST_CONNECTED"; sseChannel: SSE }
  | { type: "CREATE_CHAT"; id: string; name: string }
  | { type: "RENAME_CHAT"; chatId: string; name: string }
  | { type: "DELETE_CHAT"; chatId: string }
  | { type: "REGENERATE_LAST_CHAT_TURN"; chatId: string }
  | { type: "DELETE_CHAT_TURN"; chatId: string; turnId: string };

function allocAppResponse(
  body: any,
  chatTurn: MxlChatTurn | null
): AppResponse {
  return {
    requestBody: body,
    outputParts: [],
    streams: [],
    consoleOutput: "",
    chatTurn,
    sseChannel: null,
  };
}

function chatResponseReducer(
  draft: WritableDraft<AppResponse>,
  action: AppResponseAction
): void {
  switch (action.type) {
    case "RECEIVE_FRAME":
      switch (action.frame.type) {
        case "text":
          draft.outputParts.push({
            type: "text",
            text: action.frame.text,
            hidden: action.frame.hidden,
            stream: action.frame.stream,
          });

          if (
            action.frame.stream &&
            draft.streams.indexOf(action.frame.stream) === -1
          ) {
            draft.streams.push(action.frame.stream);
          }

          if (!action.frame.hidden && draft.chatTurn) {
            draft.chatTurn.reply.content += action.frame.text;
          }

          break;
        case "error":
          draft.outputParts.push({
            type: "error",
            stream: action.frame.stream,
            message: action.frame.error,
          });
          break;
        case "done":
          draft.sseChannel = null;
          break;
        default:
          console.warn(`Unknown frame type`, action.frame);
      }
  }
}

function writeTurnToChat(draft: WritableDraft<MixlayerChatClientState>) {
  if (draft.response === null) {
    return;
  }

  if (draft.response.chatTurn) {
    const chatTurn = draft.response!.chatTurn;
    const chat = draft.chats.find((chat) => chat.id === chatTurn.chatId);

    if (chat) {
      chat.turns.push(draft.response!.chatTurn);
    } else {
      console.error("chat not found when appending chat turn");
    }

    draft.response.chatTurn = null;
  }
}

function chatClientReducer(
  state: MixlayerChatClientState,
  action: AppClientAction
): MixlayerChatClientState {
  switch (action.type) {
    case "BEGIN_APP_REQUEST":
      return produce(state, (draft) => {
        draft.runState = RunState.Connecting;
        draft.response = allocAppResponse(
          { showHidden: true, params: JSON.parse(draft.params) },
          null
        );
      });
    case "BEGIN_APP_CHAT_REQUEST":
      return produce(state, (draft) => {
        draft.runState = RunState.Connecting;

        const chat = state.chats.find((chat) => chat.id === action.chatId);

        if (!chat) {
          throw new Error(`Chat not found: ${action.chatId}`);
        }

        const messages = chatMessagesJson(chat);

        messages.push({
          role: "user",
          text: action.message,
        });

        draft.response = allocAppResponse(
          {
            showHidden: true,
            params: {
              messages,
              ...JSON.parse(draft.params),
            },
          },
          {
            turnId: uuidv4(),
            chatId: chat.id,
            message: {
              role: "user",
              content: action.message,
            },
            reply: {
              role: "assistant",
              content: "",
            },
          }
        );
      });
    case "REQUEST_CONNECTED":
      return produce(state, (draft) => {
        draft.runState = RunState.Generating;
        draft.response!.sseChannel = action.sseChannel;
      });
    case "RECEIVE_FRAME":
      return produce(state, (draft) => {
        chatResponseReducer(draft.response!, action);

        if (action.frame.type === "done") {
          // close out chat turn
          writeTurnToChat(draft);

          draft.runState = RunState.Ready;
        }

        if (action.frame.type === "error") {
          draft.runState = RunState.Error;
          draft.response!.sseChannel?.close();
          draft.response!.sseChannel = null;
        }
      });
    case "CREATE_CHAT":
      return produce(state, (draft) => {
        draft.chats.push({
          id: action.id,
          name: action.name,
          turns: [],
          runState: RunState.Ready,
        });
      });

    case "RENAME_CHAT":
      return produce(state, (draft) => {
        const chat = draft.chats.find((chat) => chat.id === action.chatId);
        if (chat) {
          chat.name = action.name;
        }
      });
    case "CLEAR_OUTPUT":
      return produce(state, (draft) => {
        draft.response = null;
      });

    case "SET_PARAMS":
      return produce(state, (draft) => {
        draft.params = action.params;
      });
    case "STOP_REQUEST":
      return produce(state, (draft) => {
        writeTurnToChat(draft);
        draft.runState = RunState.Ready;
        draft.response!.sseChannel?.close();
        draft.response!.sseChannel = null;
      });
    case "DELETE_CHAT":
      return produce(state, (draft) => {
        draft.chats = draft.chats.filter((chat) => chat.id !== action.chatId);
      });
    case "REGENERATE_LAST_CHAT_TURN":
      return produce(state, (draft) => {
        console.log("re-generating last chat turn", action.chatId);
        const chat = draft.chats.find((chat) => chat.id === action.chatId);
        if (chat) {
          let lastTurn = chat.turns.pop();

          if (lastTurn) {
            draft.runState = RunState.Connecting;
            const messages = chatMessagesJson(chat);

            messages.push({
              role: "user",
              text: lastTurn.message.content,
            });

            draft.response = allocAppResponse(
              {
                showHidden: true,
                params: {
                  messages,
                  ...JSON.parse(draft.params),
                },
              },
              {
                turnId: uuidv4(),
                chatId: chat.id,
                message: {
                  role: "user",
                  content: lastTurn.message.content,
                },
                reply: {
                  role: "assistant",
                  content: "",
                },
              }
            );
          } else {
            console.error("no last turn found when regenerating chat turn");
          }
        } else {
          console.error("chat not found when regenerating last chat turn");
        }
      });
    case "DELETE_CHAT_TURN":
      console.log("deleting chat turn", action.chatId, action.turnId);
      return produce(state, (draft) => {
        const chat = draft.chats.find((chat) => chat.id === action.chatId);
        if (chat) {
          chat.turns = chat.turns.filter(
            (turn) => turn.turnId !== action.turnId
          );
        }
      });
  }
}

// A hook used to manage state for a client that
// communicates with a Mixlayer app.
export function useMixlayerChat(url: string): UseMixlayerChat {
  const [state, dispatch] = useReducer(chatClientReducer, {
    runState: RunState.Ready,
    response: null,
    params: "{\n}",
    chats: [],
  });

  if (!url) {
    throw new Error("url is required for useMixlayerChat");
  }

  useEffect(() => {
    if (state.runState !== RunState.Connecting) {
      return;
    }

    if (state.response === null) {
      throw new Error(
        "state error: could not start request, no response allocated."
      );
    }

    const body = state.response.requestBody;

    const sse = connectStream(url, body, (frame) => {
      dispatch({ type: "RECEIVE_FRAME", frame });
    });

    dispatch({ type: "REQUEST_CONNECTED", sseChannel: sse });
  }, [state]);

  return {
    state,
    clearOutput: () => {
      dispatch({ type: "CLEAR_OUTPUT" });
    },
    setParams: (params: string) => {
      dispatch({ type: "SET_PARAMS", params });
    },
    sendRequest: () => {
      dispatch({ type: "BEGIN_APP_REQUEST" });
    },
    stopRequest: () => {
      dispatch({ type: "STOP_REQUEST" });
    },
    sendChatMessage: (chatId: string, message: string) => {
      dispatch({ type: "BEGIN_APP_CHAT_REQUEST", chatId, message });
    },
    createNewChat: (name: string | null) => {
      const id = uuidv4();
      dispatch({ type: "CREATE_CHAT", id, name: name || "Untitled Chat" });
      return id;
    },
    renameChat: (chatId: string, name: string) => {
      dispatch({ type: "RENAME_CHAT", chatId, name });
    },
    deleteChat: (chatId: string) => {
      dispatch({ type: "DELETE_CHAT", chatId });
    },
    regenerateLastChatTurn: (chatId: string) => {
      dispatch({ type: "REGENERATE_LAST_CHAT_TURN", chatId });
    },
    deleteChatTurn: (chatId: string, turnId: string) => {
      dispatch({ type: "DELETE_CHAT_TURN", chatId, turnId });
    },
  };
}
