import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderType: 'USER' | 'ADMIN';
  messageType: 'TEXT' | 'IMAGE';
  textContent: string | null;
  imageUrl: string | null;
  replyToMessageId: string | null;
  isEdited: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ChatRoom = {
  id: string;
  userId: string;
  status: string;
  lastMessageAt: Date | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export default function Chat() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: roomData } = useQuery<{ room: ChatRoom }>({
    queryKey: ["/api/chat/room"],
    enabled: !!user,
  });

  const { data: messagesData, refetch } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ["/api/chat/rooms", roomData?.room?.id, "messages"],
    enabled: !!roomData?.room?.id,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/chat/rooms/${roomData?.room?.id}/messages`, {
        content,
        messageType: "TEXT"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", roomData?.room?.id, "messages"] });
      setMessage("");
      refetch();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  const messages = messagesData?.messages || [];
  const reversedMessages = [...messages].reverse();

  return (
    <div className="flex flex-col h-screen bg-[#1a0a0a]">
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/profile")}
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white">1:1 문의</h1>
            <p className="text-xs text-white/60">관리자와 대화하세요</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {reversedMessages.map((msg) => {
          const isAdmin = msg.senderType === 'ADMIN';
          return (
            <div
              key={msg.id}
              className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
              data-testid={`message-${msg.id}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isAdmin
                    ? 'bg-white/10 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.textContent}
                </p>
                <p className="text-[10px] mt-1 opacity-60">
                  {format(new Date(msg.createdAt), 'HH:mm', { locale: ko })}
                  {msg.isEdited && ' (수정됨)'}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-black/40 backdrop-blur-md border-t border-white/10 p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="bg-red-500 hover:bg-red-600 text-white"
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
