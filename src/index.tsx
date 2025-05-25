import "./style.css";

import { createContext, useEffect, useContext, useState } from "react";
import { ChatMessages } from "./chat-messages";
import { InputBox } from "./input-box";
import { MxlChat } from "./types";
import { UseMixlayerChat, useMixlayerChat } from "./use-chat-client";

export const MixlayerChatContext = createContext<UseMixlayerChat>(null!);
export const useMixlayerChatState = () => useContext(MixlayerChatContext);

export function MixlayerChat(props: {
  className?: string;
  url?: string;
  emptyState?: React.ReactNode;
}) {
  const mixlayerChat = useMixlayerChat(props.url ?? "/chat");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentChat, setCurrentChat] = useState<MxlChat | null>(null);
  const [chatMessagesDiv, setChatMessagesDiv] = useState<HTMLDivElement | null>(
    null
  );
  const [autoscroll, setAutoscroll] = useState(true);

  const isEmptyState =
    !currentChat ||
    (currentChat.turns.length === 0 && !mixlayerChat.state.response);

  useEffect(() => {
    const chatId = mixlayerChat.createNewChat(null);
    setCurrentChatId(chatId);
  }, []);

  useEffect(() => {
    if (currentChatId) {
      let chat =
        mixlayerChat.state.chats.find((chat) => chat.id === currentChatId) ??
        null;
      setCurrentChat(chat);
    }
  }, [currentChatId, mixlayerChat.state.chats]);

  useEffect(() => {
    if (!chatMessagesDiv || !autoscroll) return;
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
  }, [
    chatMessagesDiv,
    mixlayerChat.state.response?.chatTurn,
    currentChat?.turns,
    autoscroll,
  ]);

  useEffect(() => {
    if (!chatMessagesDiv) return;

    const handleScroll = () => {
      // Calculate if user is at bottom (with small threshold)
      const distanceFromBottom =
        chatMessagesDiv.scrollHeight -
        chatMessagesDiv.scrollTop -
        chatMessagesDiv.clientHeight;

      const isAtBottom = distanceFromBottom < 10;

      setAutoscroll(isAtBottom);
    };

    chatMessagesDiv.addEventListener("scroll", handleScroll);

    return () => {
      chatMessagesDiv.removeEventListener("scroll", handleScroll);
    };
  }, [chatMessagesDiv]);

  return (
    <MixlayerChatContext.Provider value={mixlayerChat}>
      <div
        className={`relative w-full h-full flex justify-center ${props.className}`}
      >
        {!isEmptyState && (
          <div className="w-full h-full flex flex-col">
            <div
              className="flex-1 pt-3 overflow-scroll min-h-0 pb-40"
              ref={setChatMessagesDiv}
            >
              <div className="max-w-[640px] mx-auto px-3">
                <ChatMessages chat={currentChat} />
              </div>
            </div>
          </div>
        )}

        {isEmptyState && <div>{props.emptyState}</div>}

        <div className="absolute bottom-5 w-full max-w-[680px] mx-auto px-3">
          <InputBox
            runState={mixlayerChat.state.runState}
            onSendClick={(message) =>
              currentChatId &&
              mixlayerChat.sendChatMessage(currentChatId, message)
            }
            onStopClick={() => currentChatId && mixlayerChat.stopRequest()}
          />
        </div>
      </div>
    </MixlayerChatContext.Provider>
  );
}

export { useMixlayerChat } from "./use-chat-client";
export { InputBox } from "./input-box";
export { ChatMessages } from "./chat-messages";
