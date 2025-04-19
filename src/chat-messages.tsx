import {
  RunState,
  MxlChat,
  MxlChatMessage,
  MxlChatReply,
  MxlChatTurn,
} from "./types";

import ReactMarkdown from "react-markdown";
import { useMixlayerChatState } from "./index";
import { RefreshCwIcon, TrashIcon } from "./icons";

export function ChatMessages(props: {
  className?: string;
  chat: MxlChat;
  turnClassName?: string;
}) {
  const { state } = useMixlayerChatState();
  const currentTurn = state.response?.chatTurn;

  return (
    <div className={props.className}>
      {props.chat.turns.map((turn: MxlChatTurn, idx: number) => (
        <ChatMessageTurn
          index={idx}
          key={idx}
          chatId={props.chat.id}
          turnId={turn.turnId}
          input={turn.message}
          reply={turn.reply}
          className={props.turnClassName}
          isLast={idx === props.chat.turns.length - 1}
          isCurrentTurn={false}
        />
      ))}
      {currentTurn && (
        <ChatMessageTurn
          index={props.chat.turns.length}
          key={props.chat.turns.length}
          chatId={props.chat.id}
          turnId={currentTurn.turnId}
          input={currentTurn.message}
          reply={currentTurn.reply}
          className={props.turnClassName}
          isLast={false}
          isCurrentTurn={true}
        />
      )}
    </div>
  );
}

export function ChatMessageTurn(props: {
  index: number;
  chatId: string;
  turnId: string;
  input: MxlChatMessage;
  reply: MxlChatReply;
  className?: string;
  isLast: boolean;
  isCurrentTurn: boolean;
}) {
  const { input, reply, className } = props;
  const {
    state: { runState },
    regenerateLastChatTurn,
    deleteChatTurn,
  } = useMixlayerChatState();

  return (
    <div className={`${props.index > 0 ? "mt-8" : "mt-4"} ${className} group`}>
      <div className="flex">
        <div className="flex-1"></div>
        <div className="whitespace-pre-wrap rounded-2xl rounded-br-none w-7/8 border-gray-200 border bg-[#fcfcfc] p-2 px-4 mt-1">
          {input.content}
        </div>
      </div>
      <div className="w-full pt-4 prose">
        <ReactMarkdown
          components={{
            pre(props: any) {
              const { children, className, node, ...rest } = props;
              return (
                <pre {...rest} className={`${className} bg-gray-100 p-4`}>
                  {children}
                </pre>
              );
            },
            code(props: any) {
              const { children, className, node, ...rest } = props;
              return (
                <code {...rest} className={`${className} text-gray-700`}>
                  {children}
                </code>
              );
            },
          }}
        >
          {reply.content}
        </ReactMarkdown>
      </div>
      {props.isLast && !props.isCurrentTurn && runState === RunState.Ready && (
        <div className="flex flex-row">
          <div className="flex-1"></div>
          <div className="flex mt-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300 space-x-2 pr-2">
            <TurnButton
              icon={TrashIcon}
              tooltip="Delete turn"
              onClick={() => deleteChatTurn(props.chatId, props.turnId)}
            />
            <TurnButton
              icon={RefreshCwIcon}
              tooltip="Regenerate"
              onClick={() => regenerateLastChatTurn(props.chatId)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TurnButton(props: {
  icon: React.ComponentType<{ className: string }>;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <div onClick={props.onClick} className="cursor-pointer">
      <props.icon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
    </div>
  );
}
