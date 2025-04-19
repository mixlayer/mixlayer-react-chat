import { RunState } from "./types";
import { ArrowUpIcon, SquareIcon } from "./icons";
import { useCallback, useState } from "react";

function Button(props: {
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`cursor-pointer ${props.className}`}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function RunStopButton(props: {
  onStopClick: () => void;
  onSendClick: () => void;
  runState: RunState;
  className?: string;
  disabled?: boolean;
}) {
  if (
    props.runState === RunState.Generating ||
    props.runState === RunState.Queued
  ) {
    return (
      <Button
        className={`h-8 shadow-none text-xs ${props.className}`}
        disabled={props.disabled}
        onClick={props.onStopClick}
      >
        <SquareIcon className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      className="h-8 shadow-none text-xs"
      disabled={props.disabled}
      onClick={props.onSendClick}
    >
      <ArrowUpIcon className="size-4" />
    </Button>
  );
}

export function InputBox(props: {
  onSendClick: (message: string) => void;
  onStopClick: () => void;
  runState: RunState;
}) {
  let { onSendClick: onSend, onStopClick: onStop, runState } = props;

  const [message, setMessage] = useState("");

  const onSendClick = useCallback(() => {
    if (message.trim() === "") {
      return;
    }

    onSend(message.trim());
    setMessage("");
  }, [message, onSend]);

  const onStopClick = useCallback(() => {
    onStop();
  }, [onStop]);

  return (
    <div className="bg-white flex-col w-full max-w-[680px] mx-auto min-h-[var(--input-min-height)] border border-gray-200 focus-within:border-gray-400 focus-within:shadow-sm focus-within:shadow-gray-200 focus-within:ring-2 focus-within:ring-gray-100 rounded-md shadow-xs transition-colors duration-150 ">
      <div className="flex-1 flex p-3">
        <textarea
          placeholder="Send a message"
          className="focus:outline-none flex-1 resize-none w-full max-h-[140px] overflow-y-auto"
          onChange={(e) => {
            e.target.style.height = "auto";
            const maxHeight = 140; // match the max-h- class
            const newHeight = Math.min(e.target.scrollHeight, maxHeight);
            // 48, 72, 96, 120, 140
            e.target.style.height = `${newHeight}px`;
            setMessage(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) {
                return; // allow new line
              }
              e.preventDefault();
              onSendClick();
            }
          }}
          value={message}
        />
      </div>
      <div className="flex flex-none h-10 pt-2 align-middle items-center">
        <div className="flex-1"></div>
        <div className="pr-2">
          <RunStopButton
            onStopClick={onStopClick}
            onSendClick={onSendClick}
            runState={runState}
          />
        </div>
      </div>
    </div>
  );
}
