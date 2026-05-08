import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { useChatRooms, useChatMessages } from "../hooks/useSupport";
import {
  Send, MessagesSquare, User, Shield, Circle,
  Smile, Paperclip, X, FileText,
} from "lucide-react";

const AGENT_REPLIES = [
  "Certo, estou verificando isso para você.",
  "Um momento, vou consultar nossa equipe técnica.",
  "Entendido! Posso te ajudar com isso.",
  "Analisando o problema agora...",
  "Obrigado pela informação. Vou investigar.",
  "Isso foi resolvido em nossa última atualização. Verifique a versão.",
];

const EMOJI_LIST = [
  "😀","😊","😂","🙌","👍","❤️","🎉","🔥",
  "✅","⚠️","🚀","💡","🎵","🎸","🎤","🎹",
  "📁","📎","🗂️","📋","✏️","📝","🔍","💬",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

type AttachedFile = { name: string; size: string; type: string };

function ChatWindow({ roomId }: { roomId: string }) {
  const { messages, sendMessage } = useChatMessages(roomId);
  const [text, setText]               = useState("");
  const [typing, setTyping]           = useState(false);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [attached, setAttached]       = useState<AttachedFile | null>(null);
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function handleSend() {
    if (!text.trim() && !attached) return;
    const content = attached
      ? `${text.trim() ? text.trim() + "\n" : ""}📎 ${attached.name} (${attached.size})`
      : text.trim();
    sendMessage(content, "support");
    setText("");
    setAttached(null);
    setShowEmoji(false);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      sendMessage(AGENT_REPLIES[Math.floor(Math.random() * AGENT_REPLIES.length)], "user");
    }, 1500);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleEmojiPick(emoji: string) {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const kb = file.size / 1024;
    const size = kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
    setAttached({ name: file.name, size, type: file.type });
    e.target.value = "";
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessagesSquare className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-[13px] text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-[11.5px] text-muted-foreground/60 mt-1">Envie uma mensagem para iniciar</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender === "support";
          return (
            <div
              key={msg.id}
              className={cn("flex gap-2 items-end", isMe ? "flex-row-reverse" : "flex-row")}
              data-testid={`chat-msg-${msg.id}`}
            >
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full shrink-0",
                isMe ? "bg-primary/20" : "bg-muted",
              )}>
                {isMe
                  ? <Shield className="h-3 w-3 text-primary" />
                  : <User className="h-3 w-3 text-muted-foreground" />
                }
              </div>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2",
                isMe
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm",
              )}>
                <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                <p className={cn(
                  "text-[10px] mt-0.5",
                  isMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground",
                )}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex gap-2 items-end">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted shrink-0">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attached file preview */}
      {attached && (
        <div className="px-3 pb-1 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/40 text-[11.5px] text-foreground flex-1 min-w-0">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate font-medium">{attached.name}</span>
            <span className="text-muted-foreground shrink-0">{attached.size}</span>
          </div>
          <button
            onClick={() => setAttached(null)}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-remove-attachment"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-3 pb-2">
          <div className="rounded-xl border border-border/60 bg-card p-2 grid grid-cols-8 gap-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted text-base transition-colors"
                onClick={() => handleEmojiPick(emoji)}
                data-testid={`emoji-${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input toolbar */}
      <div className="border-t border-border/60 p-3 flex gap-2 items-center">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-file-upload"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0",
            showEmoji ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          data-testid="button-emoji-picker"
        >
          <Smile className="h-4 w-4" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0",
            attached ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          data-testid="button-attach-file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <Input
          placeholder="Digite uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          className="text-sm h-9 flex-1"
          data-testid="input-chat-message"
        />
        <Button
          size="sm"
          className="h-9 w-9 p-0 shrink-0"
          onClick={handleSend}
          disabled={!text.trim() && !attached}
          data-testid="button-send-chat"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function SupportChat() {
  const { rooms, markRead } = useChatRooms();
  const [activeRoom, setActiveRoom] = useState(rooms[0]?.id ?? "");

  const activeRoomData = rooms.find((r) => r.id === activeRoom);

  function handleSelectRoom(roomId: string) {
    setActiveRoom(roomId);
    markRead(roomId);
  }

  return (
    <MainLayout title="Chat ao Vivo" description="Atendimento em tempo real">
      <div
        className="rounded-2xl border border-border/60 bg-card overflow-hidden animate-fade-in"
        style={{ height: "calc(100vh - 160px)" }}
      >
        <div className="flex h-full">
          {/* Room list */}
          <div className="w-72 shrink-0 border-r border-border/60 flex flex-col">
            <div className="px-4 py-3 border-b border-border/60">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                Conversas
              </p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors",
                    activeRoom === room.id && "bg-primary/5 border-l-2 border-primary",
                  )}
                  onClick={() => handleSelectRoom(room.id)}
                  data-testid={`room-${room.id}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <Circle className={cn(
                        "h-1.5 w-1.5 fill-current shrink-0",
                        room.online ? "text-green-400" : "text-muted-foreground/40",
                      )} />
                      <span className="text-[12.5px] font-medium text-foreground truncate max-w-[140px]">
                        {room.participant_name}
                      </span>
                    </div>
                    {room.unread_count > 0 && (
                      <Badge className="h-4 min-w-4 px-1 text-[9px] bg-primary">
                        {room.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{room.last_message}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {room.participant_email}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeRoomData ? (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{activeRoomData.participant_name}</p>
                    <p className="text-[11px] text-muted-foreground">{activeRoomData.participant_email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10.5px] border",
                      activeRoomData.status === "active"
                        ? "text-green-400 border-green-500/30 bg-green-500/10"
                        : "text-muted-foreground border-border",
                    )}
                  >
                    {activeRoomData.status === "active" ? "Ativo" : "Encerrado"}
                  </Badge>
                </div>
                <ChatWindow roomId={activeRoom} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessagesSquare className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-[13px] text-muted-foreground">Selecione uma conversa</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
