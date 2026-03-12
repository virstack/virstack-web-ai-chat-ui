# virstack-web-ai-chat-ui

A lightweight, zero-dependency AI chat widget you can drop into any website with a single `<script>` tag. Fully configurable via `data-*` attributes, themed with CSS variables, and ships as a self-contained IIFE bundle with no external dependencies.

Built by [Virstack](https://virstack.com).

---

## Features

- Single file — no CSS import needed, styles are injected automatically
- Configurable via `data-*` attributes on the `<script>` tag
- Auto-opens on page load with a customisable greeting message
- Persists full conversation history in `localStorage`
- Sends conversation history as `{ messages: [] }` (OpenAI-compatible format) on every message
- Suggestion chips configurable via a comma-separated attribute
- Clear conversation option in the chat menu
- Mobile responsive
- Works with any backend — just point `data-server-url` at your endpoint

---

## Quick Start

### Option 1 — Use the pre-built bundle (recommended)

Download `dist/virstack_ai_web_chat_ui.umd.js` from this repo and add it to your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My App</title>
</head>
<body>

  <!-- Add this before </body> -->
  <script
    src="./virstack_ai_web_chat_ui.umd.js"
    data-virstack-widget
    data-server-url="https://your-api.example.com/chat"
    data-title="My Assistant"
    data-greeting-message="Hi there! How can I help you today?"
  ></script>

</body>
</html>
```

That's it. The widget will auto-mount, open on load, and send your first greeting message.

---

### Option 2 — Build from source

**Prerequisites:** Node.js 16+

```bash
git clone https://github.com/virstack/virstack-web-ai-chat-ui.git
cd virstack-web-ai-chat-ui
npm install
npm run build
```

The compiled file will be at `dist/virstack_ai_web_chat_ui.umd.js`.

**`package.json` build script:**

```json
{
  "scripts": {
    "build": "esbuild virstack_ai_web_chat_ui.js --bundle --outfile=dist/virstack_ai_web_chat_ui.umd.js --format=iife --global-name=VirstackAIWebChatUIWidget --platform=browser"
  },
  "devDependencies": {
    "esbuild": "^0.20.0"
  }
}
```

---

## Configuration

All options are set as `data-*` attributes on the `<script>` tag.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `data-server-url` | `string` | `http://localhost:8000` | **Required.** The POST endpoint that receives `{ messages: [] }` and returns a response. |
| `data-primary-color` | `string` | `#D68B4B` | Primary accent colour (bubble, send button, user messages, borders). Accepts any valid CSS colour. |
| `data-secondary-color` | `string` | `#324A6D` | Secondary colour (header, bot messages, input text). Accepts any valid CSS colour. |
| `data-title` | `string` | `Chat Assistant` | The name displayed in the chat header. |
| `data-status-text` | `string` | `Always here for you` | Subtitle text shown below the title in the header. |
| `data-greeting-message` | `string` | `Hello! 👋 I'm here to help...` | The assistant's first message shown automatically on open. |
| `data-placeholder` | `string` | `Ask me anything...` | Input field placeholder text. |
| `data-suggestions` | `string` | *(four built-in defaults)* | Comma-separated list of suggestion chip labels shown before the user sends a message. |
| `data-icon-url` | `string` | *(sparkles SVG)* | URL of an image to use as the bot avatar (bubble button, chat header, bot messages). |
| `data-button-size` | `number` | `64` | Width and height of the floating bubble button in pixels. |
| `data-auto-open` | `boolean` | `true` | Whether the chat window opens automatically on page load. Set to `"false"` to disable. |
| `data-auto-open-delay` | `number` | `800` | Delay in milliseconds before the chat window auto-opens. |

### Full example with all attributes

```html
<script
  src="./virstack_ai_web_chat_ui.umd.js"
  data-virstack-widget
  data-server-url="https://api.yourapp.com/chat"
  data-primary-color="#10b981"
  data-secondary-color="#1e3a5f"
  data-title="Aria"
  data-status-text="Online now"
  data-greeting-message="Hey! 👋 I'm Aria. Ask me anything about our services."
  data-placeholder="Type your question..."
  data-suggestions="What are your pricing plans?, How do I get started?, Talk to a human, Book a demo"
  data-icon-url="https://cdn.yourapp.com/aria-avatar.png"
  data-button-size="72"
  data-auto-open="true"
  data-auto-open-delay="1200"
></script>
```

---

## API Request / Response

### Request

On every user message the widget sends a `POST` request to `data-server-url` with the full conversation history in the body:

```json
{
  "messages": [
    { "role": "assistant", "content": "Hey! 👋 I'm Aria. Ask me anything." },
    { "role": "user",      "content": "What are your pricing plans?" }
  ]
}
```

The `messages` array uses the OpenAI role format (`user` / `assistant`) and includes every message in the session — including the initial greeting — so your backend has full context on every call.

### Response

The widget reads the reply from your server response. It checks these fields in order and uses the first one it finds:

| Field | Example |
|---|---|
| `answer` | `{ "answer": "Our plans start at $29/mo." }` |
| `reply` | `{ "reply": "Our plans start at $29/mo." }` |
| `message` | `{ "message": "Our plans start at $29/mo." }` |
| OpenAI format | `{ "choices": [{ "message": { "content": "..." } }] }` |

**Minimal valid response:**

```json
{ "answer": "Our plans start at $29/mo." }
```

**OpenAI-compatible response (also works directly):**

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Our plans start at $29/mo."
      }
    }
  ]
}
```

---

## JavaScript API

The widget exposes a global `VirstackAIWebChatUIWidget` object. This is useful if you need to control the widget programmatically or initialise it dynamically.

### `VirstackAIWebChatUIWidget.init(overrides?)`

Manually initialise the widget with optional config overrides. Any key passed here takes precedence over the corresponding `data-*` attribute.

```html
<!-- Load without data-virstack-widget so it doesn't auto-init -->
<script src="./virstack_ai_web_chat_ui.umd.js"></script>
<script>
  const widget = VirstackAIWebChatUIWidget.init({
    serverUrl:       'https://api.yourapp.com/chat',
    primaryColor:    '#10b981',
    title:           'Aria',
    greetingMessage: 'Hello from JS!',
    suggestions:     'Pricing, Getting started, Contact',
    autoOpen:        false,
  });
</script>
```

**Returns:** `{ mount, openChat, closeChat }`

### `widget.openChat()`

Programmatically open the chat window.

```js
document.getElementById('my-button').addEventListener('click', () => {
  widget.openChat();
});
```

### `widget.closeChat()`

Programmatically close the chat window.

```js
widget.closeChat();
```

### `VirstackAIWebChatUIWidget.createWidget(cfg)`

Low-level factory. Creates a widget instance from a plain config object without reading any `data-*` attributes. Returns `{ mount, openChat, closeChat }`.

```js
const widget = VirstackAIWebChatUIWidget.createWidget({
  serverUrl:    'https://api.yourapp.com/chat',
  primaryColor: '#D68B4B',
  secondaryColor: '#324A6D',
  title: 'My Bot',
  greetingMessage: 'Hi!',
  suggestions: '',
  placeholder: 'Ask me...',
  statusText: 'Online',
  iconUrl: '',
  buttonSize: 64,
  autoOpen: true,
  autoOpenDelay: 800,
});
widget.mount();
```

---

## localStorage

The widget stores data in `localStorage` under these keys:

| Key | Description |
|---|---|
| `vs_messages` | Full conversation history (up to 200 messages). Restored on the next page load. |
| `vs_device_id` | A randomly generated UUID that persists across sessions to identify the browser. |

To clear conversation history programmatically:

```js
localStorage.removeItem('vs_messages');
```

Users can also clear the conversation from inside the chat using the **⋮ menu → Clear conversation** option.

---

## Backend Integration Example

Here is a minimal Node.js/Express backend example:

```js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  // messages = [{ role: 'assistant', content: '...' }, { role: 'user', content: '...' }]

  // Pass to your LLM of choice
  const reply = await myLLM.chat(messages);

  res.json({ answer: reply });
});

app.listen(3000);
```

The widget is compatible with any LLM provider that accepts the OpenAI messages format — OpenAI, Anthropic, Gemini, Ollama, LiteLLM, etc.

---

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Requires `fetch` and `localStorage` — no polyfills needed for any browser released after 2017.

---

## Project Structure

```
virstack-web-ai-chat-ui/
├── virstack_ai_web_chat_ui.js   # Source file (ES2020, no bundler required to read)
├── dist/
│   └── virstack_ai_web_chat_ui.umd.js  # Pre-built IIFE bundle (use this in production)
├── package.json
└── README.md
```

---

## License

MIT © [Virstack](https://virstack.com)
