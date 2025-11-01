import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Trash2, Edit2, X } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminChat() {
  const [, setLocation] = useLocation();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  if (!hasAnyRole(['ADMIN', 'OPERATOR'])) {
    setLocation("/");
    return null;
  }

  const { data: roomsData } = useQuery<{ rooms: ChatRoom[] }>({
    queryKey: ["/api/admin/chat/rooms"],
    refetchInterval: 5000,
  });

  const { data: messagesData, refetch } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ["/api/chat/rooms", selectedRoom?.id, "messages"],
    enabled: !!selectedRoom?.id,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/chat/rooms/${selectedRoom?.id}/messages`, {
        content,
        messageType: "TEXT"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoom?.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rooms"] });
      setMessage("");
      refetch();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ messageId, textContent }: { messageId: string; textContent: string }) => {
      return apiRequest("PATCH", `/api/admin/chat/messages/${messageId}`, { textContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoom?.id, "messages"] });
      setEditingMessageId(null);
      setEditContent("");
      toast({ title: "메시지 수정 완료" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest("DELETE", `/api/admin/chat/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoom?.id, "messages"] });
      toast({ title: "메시지 삭제 완료" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return apiRequest("POST", `/api/chat/rooms/${roomId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chat/rooms"] });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  const handleEdit = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditContent(currentText);
  };

  const handleSaveEdit = () => {
    if (!editingMessageId || !editContent.trim()) return;
    updateMutation.mutate({ messageId: editingMessageId, textContent: editContent });
  };

  const handleDelete = (messageId: string) => {
    if (confirm("메시지를 삭제하시겠습니까?")) {
      deleteMutation.mutate(messageId);
    }
  };

  const handleRoomSelect = (room: ChatRoom) => {
    setSelectedRoom(room);
    if (room.unreadCount > 0) {
      markReadMutation.mutate(room.id);
    }
  };

  const rooms = roomsData?.rooms || [];
  const messages = messagesData?.messages || [];
  const reversedMessages = [...messages].reverse();

  return (
    <div className="flex h-screen bg-[#1a0a0a]">
      {/* Room List */}
      <div className="w-80 border-r border-white/10 flex flex-col">
        <div className="sticky top-0 bg-black/40 backdrop-blur-md border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin")}
              className="text-white hover:bg-white/10"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-white">채팅 관리</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className={`m-2 cursor-pointer transition-colors ${
                selectedRoom?.id === room.id ? 'border-red-500 bg-red-500/10' : ''
              }`}
              onClick={() => handleRoomSelect(room)}
              data-testid={`room-${room.id}`}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-white">사용자 {room.userId.slice(0, 8)}</p>
                    <p className="text-xs text-white/60">
                      {room.lastMessageAt
                        ? format(new Date(room.lastMessageAt), 'MM/dd HH:mm', { locale: ko })
                        : '메시지 없음'}
                    </p>
                  </div>
                  {room.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            <div className="sticky top-0 bg-black/40 backdrop-blur-md border-b border-white/10 p-4">
              <h2 className="text-lg font-bold text-white">사용자 {selectedRoom.userId.slice(0, 8)}</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {reversedMessages.map((msg) => {
                const isAdmin = msg.senderType === 'ADMIN';
                const isEditing = editingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className={`max-w-[75%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="bg-white/10 border-white/20 text-white"
                            data-testid={`input-edit-${msg.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            className="bg-green-500 hover:bg-green-600"
                            data-testid={`button-save-edit-${msg.id}`}
                          >
                            저장
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingMessageId(null)}
                            className="text-white hover:bg-white/10"
                            data-testid={`button-cancel-edit-${msg.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`rounded-2xl px-4 py-2.5 ${
                              isAdmin ? 'bg-red-500 text-white' : 'bg-white/10 text-white'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.textContent}</p>
                            <p className="text-[10px] mt-1 opacity-60">
                              {format(new Date(msg.createdAt), 'HH:mm', { locale: ko })}
                              {msg.isEdited && ' (수정됨)'}
                            </p>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(msg.id, msg.textContent || '')}
                                className="text-white/60 hover:text-white h-6 px-2"
                                data-testid={`button-edit-${msg.id}`}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(msg.id)}
                                className="text-white/60 hover:text-red-500 h-6 px-2"
                                data-testid={`button-delete-${msg.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/60">
            <p>채팅방을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
