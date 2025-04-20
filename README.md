# mixlayer-react-chat <img align="right" src="screenshot.gif" width="360" alt="Animated screenshot" />

<code>mixlayer-react-chat</code> is a simple React component that provides a ready-to-use, simple chat interface. It handles message display, user input, and communication with a [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) chat API.

#### Features

✅ Response streaming<br/>
✅ Markdown rendering<br/>
✅ Autoscrolling<br/>
✅ Auto-resizable input box<br/>

## Usage

1. Add the dependency to your project.

```bash
$ npm install @mixlayer/react-chat
```

2. Insert the `MixlayerChat` component into your React component tree. You need to provide the URL for your chat backend.

```jsx
import { MixlayerChat } from "mixlayer-react-chat";
import "mixlayer-react-chat/style.css"; // Import default styles

function App() {
  return (
    <div style={{ height: "500px", width: "400px", border: "1px solid #ccc" }}>
      <MixlayerChat url="/chat" emptyState={<div>Start chatting!</div>} />
    </div>
  );
}

export default App;
```

#### Props

- `url`: (Required) The URL of your backend chat endpoint.
- `emptyState`: (Optional) A React node to display when the chat is empty.
- `className`: (Optional) Additional CSS classes for the main chat container.

## Backend

The backend endpoint should implement Server-Sent Events (SSE) to stream chat responses.

#### Request

`mixlayer-react-chat` will submit a request with a body in the following format:

```javascript
{
  "params": {
    "messages": [
      {
        "role": "user",
        "text": "The content of the user's message."
      },
      {
        "role": "assistant",
        "text": "The content of a previous assistant message (if any)."
      }
      // ... additional messages in the conversation history
    ]
  }
}
```

#### Response

When `mixlayer-react-chat` connects to the provided URL, it expects a stream of JSON objects in the `data` field of each event.

**Text Frame**

```json
{
  "type": "text",
  "text": "The text chunk being streamed"
}
```

**Error Frame**

```json
{
  "type": "error",
  "error": "Description of the error"
}
```

**Done Frame** Signals the end of the stream for a chat turn.

```json
{
  "done": true
}
```

### Backend Example

Here's an example backend using [Hono](https://hono.dev) and [Mixlayer](https://mixlayer.com).

```typescript
import { Hono } from "hono";
import { stream, streamSSE } from "hono/streaming";
import { user, assistant, open } from "@mixlayer/llm";

interface ChatRequest {
  params: {
    messages: {
      role: "user" | "assistant";
      text: string;
    }[];
  };
}

app.post("/chat", async (c) => {
  const body = await c.req.json<ChatRequest>();

  return streamSSE(c, async (stream) => {
    const seq = await open();

    for (const message of body.params.messages) {
      await seq.append(message.text, { role: message.role });
    }

    const response = await assistant(seq)
      .gen({ temperature: 0.8 })
      .textStream();
    let reader = response.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      await stream.writeSSE({
        data: JSON.stringify({ text: value }),
      });
    }

    await stream.writeSSE({
      data: JSON.stringify({ done: true }),
    });
  });
});
```
