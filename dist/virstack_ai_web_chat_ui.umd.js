var VirstackAIWebChatUIWidget = (() => {
  // virstack_ai_web_chat_ui.js
  var _scriptEl = document.currentScript || (() => {
    const s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();
  function readAttr(el, name, fallback) {
    const val = el && el.getAttribute(name);
    return val !== null && val !== "" ? val : fallback;
  }
  function buildConfig(el, overrides = {}) {
    return {
      primaryColor: readAttr(el, "data-primary-color", "#D68B4B"),
      secondaryColor: readAttr(el, "data-secondary-color", "#3C444E"),
      inputTextColor: readAttr(el, "data-input-text-color", "#000"),
      botBgColor: readAttr(el, "data-bot-background-color", "#70767d55"),
      serverUrl: readAttr(el, "data-server-url", "http://localhost:8000"),
      iconUrl: readAttr(el, "data-icon-url", ""),
      buttonSize: parseInt(readAttr(el, "data-button-size", "64"), 10),
      title: readAttr(el, "data-title", "Chat Assistant"),
      statusText: readAttr(el, "data-status-text", "Always here for you"),
      placeholder: readAttr(el, "data-placeholder", "Ask me anything..."),
      greetingMessage: readAttr(
        el,
        "data-greeting-message",
        "Hello! \u{1F44B} I'm here to help. How can I assist you today?"
      ),
      suggestions: readAttr(el, "data-suggestions", ""),
      autoOpen: readAttr(el, "data-auto-open", "true") !== "false",
      autoOpenDelay: parseInt(readAttr(el, "data-auto-open-delay", "800"), 10),
      ...overrides
    };
  }
  var SILENT_ROLES = /* @__PURE__ */ new Set(["tool_use", "tool_result", "tool"]);
  function isSilentTurn(turn) {
    if (SILENT_ROLES.has(turn.role)) return true;
    if (turn.role === "assistant" && typeof turn.content !== "string") return true;
    return false;
  }
  function formatText(raw) {
    let text = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    text = text.replace(/\\n/g, "\n");
    text = text.replace(/`([^`\n]+?)`/g, '<code class="vs-code">$1</code>');
    text = text.replace(/\*([^*\n]+?)\*/g, "<strong>$1</strong>");
    text = text.replace(/_([^_\n]+?)_/g, "<em>$1</em>");
    text = text.replace(/~([^~\n]+?)~/g, "<s>$1</s>");
    text = text.replace(
      /\bhttps?:\/\/[^\s<>"']+/g,
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="vs-link">${url}</a>`
    );
    text = text.replace(/\n/g, "<br>");
    return text;
  }
  function injectStyles(cfg) {
    if (document.getElementById("vs-widget-styles")) return;
    const P = cfg.primaryColor;
    const S = cfg.secondaryColor;
    const BS = cfg.buttonSize;
    const IT = cfg.inputTextColor;
    const BT = cfg.botBgColor;
    const css = `
#dharma-bubble{position:fixed;bottom:24px;right:24px;width:${BS}px;height:${BS}px;border-radius:50%;background:${P};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:99998;box-shadow:0 8px 32px rgba(0,0,0,.25);transition:transform .2s ease;}
#dharma-bubble:hover{transform:scale(1.1)}
#dharma-bubble:active{transform:scale(.95)}
#dharma-bubble-dot{position:absolute;top:4px;right:4px;width:12px;height:12px;border-radius:50%;background:${S};animation:dharma-pulse 2s ease-in-out infinite;}
#dharma-window{position:fixed;bottom:45px;right:24px;width:384px;height:600px;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column;z-index:99999;overflow:hidden;animation:dharma-open .3s cubic-bezier(.34,1.56,.64,1) both;}
#dharma-window.dharma-closing{animation:dharma-close .2s ease forwards}
#dharma-header{background:${S};padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
#dharma-header-left{display:flex;align-items:center;gap:12px}
#dharma-menu-btn,#dharma-close-btn{width:32px;height:32px;border-radius:50%;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;}
#dharma-menu-btn:hover,#dharma-close-btn:hover{background:rgba(255,255,255,.1)}
#dharma-avatar{width:40px;height:40px;border-radius:50%;background:${P};display:flex;align-items:center;justify-content:center;overflow:hidden;animation:dharma-rock 3s ease-in-out infinite;}
#dharma-title{color:#fff;font-size:17px;font-weight:600}
#dharma-status{display:flex;align-items:center;gap:6px;margin-top:2px}
#dharma-status-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;animation:dharma-blink 1.5s ease-in-out infinite;}
#dharma-status-text{color:rgba(255,255,255,.75);font-size:11px}
#dharma-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;background:linear-gradient(to bottom,#fff,#f9fafb);}
#dharma-messages::-webkit-scrollbar{width:4px}
#dharma-messages::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:4px}
#dharma-suggestions{margin-bottom:8px}
#dharma-suggestions p{text-align:center;font-size:13px;color:${S};margin-bottom:10px;}
.dharma-suggestion-btn{display:block;width:100%;padding:10px 14px;margin-bottom:8px;border-radius:10px;border:2px solid ${P};background:#fff;color:${S};font-size:13px;text-align:left;cursor:pointer;transition:box-shadow .2s,transform .1s;}
.dharma-suggestion-btn:hover{box-shadow:0 4px 12px rgba(0,0,0,.1);transform:translateY(-1px)}
.dharma-msg-row{display:flex;gap:8px;margin-bottom:14px;animation:dharma-msg-in .25s ease both;}
.dharma-msg-row.bot{justify-content:flex-start}
.dharma-msg-row.user{justify-content:flex-end}
.dharma-msg-avatar{width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}
.dharma-msg-avatar.bot{background:${P}}
.dharma-msg-avatar.user{background:${S}}
.dharma-msg-col{display:flex;flex-direction:column;max-width:75%}
.dharma-msg-col.bot{align-items:flex-start}
.dharma-msg-col.user{align-items:flex-end}
.dharma-bubble-text{padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.65;color:#000;word-break:break-word;}
.dharma-bubble-text.user{padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.65;color:#fff;word-break:break-word;}
.dharma-bubble-text.bot{background:${BT};border-top-left-radius:4px}
.dharma-bubble-text.user{background:${P};border-top-right-radius:4px}
/* WhatsApp-style inline formatting inside bubbles */
.dharma-bubble-text strong{font-weight:700}
.dharma-bubble-text em{font-style:italic}
.dharma-bubble-text s{text-decoration:line-through;opacity:.8}
.dharma-bubble-text code.vs-code{font-family:monospace;font-size:12px;background:rgba(0,0,0,.18);padding:1px 5px;border-radius:4px;white-space:pre-wrap;}
.dharma-bubble-text a.vs-link{color:#000;text-decoration:underline;text-underline-offset:2px;word-break:break-all;}
.dharma-bubble-text a.vs-link:hover{color:#333}
.dharma-timestamp{font-size:11px;color:#9ca3af;margin-top:4px;padding:0 4px}
#dharma-typing{display:flex;justify-content:flex-start;margin-bottom:14px}
.dharma-typing-bubble{background:${S};border-radius:16px;border-top-left-radius:4px;padding:12px 16px;display:flex;gap:4px;align-items:center;}
.dharma-dot{width:8px;height:8px;border-radius:50%;background:#fff;animation:dharma-bounce .6s ease-in-out infinite;}
.dharma-dot:nth-child(2){animation-delay:.1s}
.dharma-dot:nth-child(3){animation-delay:.2s}
#dharma-input-area{padding:14px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px;flex-shrink:0;background:#fff;}
#dharma-input{flex:1;padding:11px 14px;border-radius:12px;border:2px solid ${P};font-size:13px;color:${IT};outline:none;background:#fff;transition:box-shadow .2s;font-family:inherit;}
#dharma-input:focus{box-shadow:0 0 0 3px rgba(214,139,75,.15)}
#dharma-input::placeholder{color:#9ca3af}
#dharma-send-btn{width:46px;height:46px;border-radius:12px;background:${P};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .2s,transform .1s,box-shadow .2s;flex-shrink:0;}
#dharma-send-btn:hover:not(:disabled){box-shadow:0 4px 12px rgba(214,139,75,.4);transform:translateY(-1px)}
#dharma-send-btn:disabled{opacity:.45;cursor:not-allowed}
#dharma-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100000;display:flex;align-items:center;justify-content:center;animation:dharma-fade-in .15s ease;}
#dharma-modal{background:#fff;border-radius:16px;padding:28px;width:360px;box-shadow:0 20px 60px rgba(0,0,0,.2);position:relative;animation:dharma-modal-in .2s cubic-bezier(.34,1.56,.64,1);}
#dharma-modal h3{font-size:19px;font-weight:600;color:${S};margin-bottom:10px}
#dharma-modal p{font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:24px}
#dharma-modal-close{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;}
#dharma-modal-close:hover{background:#f3f4f6}
#dharma-modal-actions{display:flex;justify-content:flex-end;gap:10px}
.dharma-modal-cancel{padding:10px 22px;border-radius:10px;border:2px solid ${P};background:#fff;color:${S};font-size:13px;font-weight:500;cursor:pointer;transition:background .2s;font-family:inherit;}
.dharma-modal-cancel:hover{background:#fdf8f3}
.dharma-modal-confirm{padding:10px 22px;border-radius:10px;border:none;background:${P};color:#fff;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .2s;font-family:inherit;}
.dharma-modal-confirm:hover{opacity:.88}
@keyframes dharma-open{from{opacity:0;transform:scale(.8) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes dharma-close{from{opacity:1;transform:scale(1) translateY(0)}to{opacity:0;transform:scale(.8) translateY(20px)}}
@keyframes dharma-msg-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes dharma-fade-in{from{opacity:0}to{opacity:1}}
@keyframes dharma-modal-in{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
@keyframes dharma-rock{0%,100%{transform:rotate(0)}25%{transform:rotate(10deg)}75%{transform:rotate(-10deg)}}
@keyframes dharma-blink{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes dharma-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes dharma-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}
@media(max-width:440px){
  #dharma-window{width:calc(100vw - 24px);right:12px;bottom:90px;height:75vh}
  #dharma-bubble{right:12px;bottom:12px}
}`;
    const style = document.createElement("style");
    style.id = "vs-widget-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }
  var ICONS = {
    sparkles: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,
    user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    closeGray: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    send: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    chat: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
  };
  function imgTag(url) {
    return `<img src="${url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
  }
  function createWidget(cfg) {
    const STORAGE_KEY = "vs_messages";
    const MAX_MESSAGES = 200;
    function loadMessages() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw).map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch {
        return [];
      }
    }
    function saveMessages(msgs) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(
          msgs.slice(-MAX_MESSAGES).map((m) => ({ ...m, timestamp: m.timestamp.toISOString() }))
        ));
      } catch {
      }
    }
    function clearStoredMessages() {
      localStorage.removeItem(STORAGE_KEY);
    }
    function buildApiMessages(msgs) {
      return msgs.map((m) => {
        if (m.role) {
          const { id, timestamp, isBot, text, ...apiFields } = m;
          return apiFields;
        }
        return { role: m.isBot ? "assistant" : "user", content: m.text };
      });
    }
    let deviceId = localStorage.getItem("vs_device_id");
    if (!deviceId) {
      deviceId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : r & 3 | 8).toString(16);
      });
      localStorage.setItem("vs_device_id", deviceId);
    }
    let messages = loadMessages();
    let isTyping = false;
    let hasStartedConversation = messages.some((m) => !m.isBot && !m.role);
    const DEFAULT_SUGGESTIONS = [
      "How do I start meditating?",
      "Tell me about meditation types"
    ];
    const SUGGESTIONS = cfg.suggestions ? cfg.suggestions.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_SUGGESTIONS;
    function avatarHtml(isBot) {
      if (isBot && cfg.iconUrl) return imgTag(cfg.iconUrl);
      return isBot ? ICONS.sparkles : ICONS.user;
    }
    function bubbleIcon() {
      return cfg.iconUrl ? imgTag(cfg.iconUrl) : ICONS.chat;
    }
    function formatTime(date) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    function scrollToBottom() {
      const el = document.getElementById("dharma-messages");
      if (el) el.scrollTop = el.scrollHeight;
    }
    function scrollToMessageTop(rowEl) {
      const container = document.getElementById("dharma-messages");
      if (!container || !rowEl) return;
      container.scrollTop = rowEl.offsetTop - container.offsetTop - 8;
    }
    function updateSendBtn() {
      const btn = document.getElementById("dharma-send-btn");
      const input = document.getElementById("dharma-input");
      if (btn && input) btn.disabled = !input.value.trim() || isTyping;
    }
    function appendMessage(msg) {
      if (msg.role && SILENT_ROLES.has(msg.role)) return;
      if (msg.role === "assistant" && !msg.text && !msg.content) return;
      const container = document.getElementById("dharma-messages");
      if (!container) return;
      const suggestions = document.getElementById("dharma-suggestions");
      if (suggestions && !msg.isBot) suggestions.remove();
      const isBot = msg.isBot || msg.role === "assistant";
      const row = document.createElement("div");
      row.className = `dharma-msg-row ${isBot ? "bot" : "user"}`;
      const avatar = document.createElement("div");
      avatar.className = `dharma-msg-avatar ${isBot ? "bot" : "user"}`;
      avatar.innerHTML = avatarHtml(isBot);
      const col = document.createElement("div");
      col.className = `dharma-msg-col ${isBot ? "bot" : "user"}`;
      const bubble = document.createElement("div");
      bubble.className = `dharma-bubble-text ${isBot ? "bot" : "user"}`;
      const rawText = msg.text || (typeof msg.content === "string" ? msg.content : "");
      if (!rawText || !rawText.trim()) return;
      bubble.innerHTML = formatText(rawText);
      const ts = document.createElement("div");
      ts.className = "dharma-timestamp";
      ts.textContent = formatTime(msg.timestamp || /* @__PURE__ */ new Date());
      col.appendChild(bubble);
      col.appendChild(ts);
      if (isBot) {
        row.appendChild(avatar);
        row.appendChild(col);
      } else {
        row.appendChild(col);
        row.appendChild(avatar);
      }
      container.appendChild(row);
      if (isBot) {
        scrollToMessageTop(row);
      } else {
        scrollToBottom();
      }
    }
    function showTyping() {
      const c = document.getElementById("dharma-messages");
      if (!c) return;
      const el = document.createElement("div");
      el.id = "dharma-typing";
      el.innerHTML = `<div class="dharma-typing-bubble">
            <div class="dharma-dot"></div>
            <div class="dharma-dot"></div>
            <div class="dharma-dot"></div>
        </div>`;
      c.appendChild(el);
      scrollToBottom();
    }
    function hideTyping() {
      const el = document.getElementById("dharma-typing");
      if (el) el.remove();
    }
    async function sendMessage(text) {
      if (!text || !text.trim() || isTyping) return;
      const input = document.getElementById("dharma-input");
      if (input) input.value = "";
      const userMsg = {
        id: String(Date.now()),
        text: text.trim(),
        isBot: false,
        timestamp: /* @__PURE__ */ new Date()
      };
      messages.push(userMsg);
      saveMessages(messages);
      appendMessage(userMsg);
      hasStartedConversation = true;
      isTyping = true;
      updateSendBtn();
      showTyping();
      const sentCount = buildApiMessages(messages).length;
      try {
        const res = await fetch(cfg.serverUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          body: JSON.stringify({ messages: buildApiMessages(messages) })
        });
        const data = await res.json();
        hideTyping();
        const incomingArray = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : null;
        if (incomingArray && incomingArray.length > 0) {
          const incoming = incomingArray;
          const newTurns = incoming.slice(sentCount);
          for (const turn of newTurns) {
            const isSilent = isSilentTurn(turn);
            const msg = isSilent ? {
              ...turn,
              id: String(Date.now() + Math.random()),
              timestamp: /* @__PURE__ */ new Date()
            } : {
              id: String(Date.now() + Math.random()),
              text: typeof turn.content === "string" ? turn.content : JSON.stringify(turn.content),
              isBot: turn.role === "assistant",
              timestamp: /* @__PURE__ */ new Date()
            };
            messages.push(msg);
            appendMessage(msg);
          }
          saveMessages(messages);
        } else {
          const reply = data.answer || data.reply || data.message || data.choices?.[0]?.message?.content || "Sorry, I could not find an answer.";
          const botMsg = {
            id: String(Date.now() + 1),
            text: reply,
            isBot: true,
            timestamp: /* @__PURE__ */ new Date()
          };
          messages.push(botMsg);
          saveMessages(messages);
          appendMessage(botMsg);
        }
      } catch {
        hideTyping();
        const errMsg = {
          id: String(Date.now() + 1),
          text: "Sorry, something went wrong. Please try again.",
          isBot: true,
          timestamp: /* @__PURE__ */ new Date()
        };
        messages.push(errMsg);
        saveMessages(messages);
        appendMessage(errMsg);
      }
      isTyping = false;
      updateSendBtn();
    }
    function renderSuggestions() {
      const wrap = document.createElement("div");
      wrap.id = "dharma-suggestions";
      const label = document.createElement("p");
      label.textContent = "Try asking:";
      wrap.appendChild(label);
      SUGGESTIONS.forEach((t) => {
        const btn = document.createElement("button");
        btn.className = "dharma-suggestion-btn";
        btn.textContent = t;
        btn.addEventListener("click", () => sendMessage(t));
        wrap.appendChild(btn);
      });
      return wrap;
    }
    function openClearModal() {
      const overlay = document.createElement("div");
      overlay.id = "dharma-modal-overlay";
      const modal = document.createElement("div");
      modal.id = "dharma-modal";
      modal.innerHTML = `
            <button id="dharma-modal-close">${ICONS.closeGray}</button>
            <h3>Clear conversation</h3>
            <p>All messages will be cleared. Would you like to continue?</p>
            <div id="dharma-modal-actions">
                <button class="dharma-modal-cancel">Cancel</button>
                <button class="dharma-modal-confirm">Clear</button>
            </div>`;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      modal.querySelector(".dharma-modal-cancel").addEventListener("click", close);
      modal.querySelector("#dharma-modal-close").addEventListener("click", close);
      modal.querySelector(".dharma-modal-confirm").addEventListener("click", () => {
        messages = [];
        hasStartedConversation = false;
        clearStoredMessages();
        const c = document.getElementById("dharma-messages");
        if (c) {
          c.innerHTML = "";
          c.appendChild(renderSuggestions());
          showWelcome();
        }
        close();
      });
    }
    function showWelcome() {
      setTimeout(() => {
        const w = {
          id: `welcome-${Date.now()}`,
          text: cfg.greetingMessage,
          isBot: true,
          timestamp: /* @__PURE__ */ new Date()
        };
        messages.push(w);
        saveMessages(messages);
        appendMessage(w);
      }, 600);
    }
    function openChat() {
      const bubble = document.getElementById("dharma-bubble");
      if (bubble) bubble.style.display = "none";
      if (document.getElementById("dharma-window")) return;
      const win = document.createElement("div");
      win.id = "dharma-window";
      win.innerHTML = `
            <div id="dharma-header">
                <div id="dharma-header-left">
                    <button id="dharma-menu-btn">${ICONS.menu}</button>
                    <div id="dharma-avatar">${cfg.iconUrl ? imgTag(cfg.iconUrl) : ICONS.sparkles}</div>
                    <div>
                        <div id="dharma-title">${cfg.title}</div>
                        <div id="dharma-status">
                            <div id="dharma-status-dot"></div>
                            <span id="dharma-status-text">${cfg.statusText}</span>
                        </div>
                    </div>
                </div>
                <button id="dharma-close-btn">${ICONS.close}</button>
            </div>
            <div id="dharma-messages"></div>
            <div id="dharma-input-area">
                <input id="dharma-input" type="text"
                    placeholder="${cfg.placeholder}" autocomplete="off" />
                <button id="dharma-send-btn" disabled>${ICONS.send}</button>
            </div>`;
      document.body.appendChild(win);
      const msgContainer = document.getElementById("dharma-messages");
      if (messages.length === 0) {
        msgContainer.appendChild(renderSuggestions());
        showWelcome();
      } else {
        if (!hasStartedConversation) msgContainer.appendChild(renderSuggestions());
        messages.forEach((m) => appendMessage(m));
      }
      document.getElementById("dharma-close-btn").addEventListener("click", closeChat);
      document.getElementById("dharma-menu-btn").addEventListener("click", openClearModal);
      const input = document.getElementById("dharma-input");
      const sendBtn = document.getElementById("dharma-send-btn");
      input.addEventListener("input", updateSendBtn);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (!sendBtn.disabled) sendMessage(input.value);
        }
      });
      sendBtn.addEventListener("click", () => sendMessage(input.value));
      input.focus();
    }
    function closeChat() {
      const win = document.getElementById("dharma-window");
      if (!win) return;
      win.classList.add("dharma-closing");
      setTimeout(() => {
        win.remove();
        const b = document.getElementById("dharma-bubble");
        if (b) b.style.display = "flex";
      }, 200);
    }
    function buildBubble() {
      const btn = document.createElement("button");
      btn.id = "dharma-bubble";
      btn.innerHTML = `${bubbleIcon()}<div id="dharma-bubble-dot"></div>`;
      btn.addEventListener("click", openChat);
      document.body.appendChild(btn);
    }
    function mount() {
      injectStyles(cfg);
      buildBubble();
      if (cfg.autoOpen) setTimeout(openChat, cfg.autoOpenDelay);
    }
    return { mount, openChat, closeChat };
  }
  function init(overrides = {}) {
    const cfg = buildConfig(_scriptEl, overrides);
    const widget = createWidget(cfg);
    widget.mount();
    return widget;
  }
  function autoInit() {
    const cfg = buildConfig(_scriptEl);
    const widget = createWidget(cfg);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => widget.mount());
    } else {
      widget.mount();
    }
    return widget;
  }
  autoInit();
  window.VirstackAIWebChatUIWidget = { init, autoInit, createWidget };
})();
