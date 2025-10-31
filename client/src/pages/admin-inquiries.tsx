import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Inquiry {
  id: string;
  userId: string;
  title: string;
  content: string;
  status: string;
  response: string | null;
  responderId: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const responseSchema = z.object({
  response: z.string().min(10, '답변은 최소 10자 이상 입력해주세요').max(2000, '답변은 2000자 이하로 입력해주세요'),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export default function AdminInquiries() {
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const responseForm = useForm<z.infer<typeof responseSchema>>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      response: '',
      status: 'RESOLVED',
    },
  });

  // Fetch all inquiries
  const { data: inquiriesData, isLoading } = useQuery({
    queryKey: ['/api/admin/inquiries', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'ALL' 
        ? '/api/admin/inquiries'
        : `/api/admin/inquiries?status=${statusFilter}`;
      const response = await apiRequest('GET', url);
      const data = await response.json();
      return data.inquiries as Inquiry[];
    },
  });

  // Update inquiry response mutation
  const updateResponseMutation = useMutation({
    mutationFn: async (data: { id: string; response: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/inquiries/${data.id}/response`, {
        response: data.response,
        status: data.status,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: '답변 등록 완료',
        description: '문의에 대한 답변이 등록되었습니다.',
      });
      setIsResponseModalOpen(false);
      setSelectedInquiry(null);
      responseForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/inquiries'] });
    },
    onError: (error: any) => {
      toast({
        title: '답변 등록 실패',
        description: error.message || '답변을 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleOpenResponse = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    responseForm.reset({
      response: inquiry.response || '',
      status: inquiry.status as any,
    });
    setIsResponseModalOpen(true);
  };

  const handleSubmitResponse = (data: z.infer<typeof responseSchema>) => {
    if (!selectedInquiry) return;
    updateResponseMutation.mutate({
      id: selectedInquiry.id,
      response: data.response,
      status: data.status,
    });
  };

  if (!hasAnyRole(['ADMIN', 'OPERATOR'])) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
          <p className="text-muted-foreground mb-4">관리자 권한이 필요합니다.</p>
          <Button onClick={() => window.location.href = '/'}>
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const inquiries = inquiriesData || [];
  const pendingCount = inquiries.filter(i => i.status === 'PENDING').length;
  const inProgressCount = inquiries.filter(i => i.status === 'IN_PROGRESS').length;
  const resolvedCount = inquiries.filter(i => i.status === 'RESOLVED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">대기중</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">처리중</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">답변완료</Badge>;
      case 'CLOSED':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">종료</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a0a0a] pb-20">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="text-white"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">문의 관리</h1>
              <p className="text-sm text-white/60">사용자 문의 확인 및 답변</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-yellow-500/10 border-yellow-500/20">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-xs text-yellow-600/80">대기중</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
                <div className="text-xs text-blue-600/80">처리중</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
                <div className="text-xs text-green-600/80">답변완료</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <main className="px-4 py-6">
        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ALL">전체</TabsTrigger>
            <TabsTrigger value="PENDING">대기</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">처리중</TabsTrigger>
            <TabsTrigger value="RESOLVED">완료</TabsTrigger>
            <TabsTrigger value="CLOSED">종료</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Inquiries List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-white/60">로딩 중...</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <p className="text-white/60">문의가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inquiry) => (
              <Card 
                key={inquiry.id} 
                className="cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => handleOpenResponse(inquiry)}
                data-testid={`card-inquiry-${inquiry.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-1 truncate">{inquiry.title}</CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2">{inquiry.content}</p>
                    </div>
                    {getStatusBadge(inquiry.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true, locale: ko })}
                    </div>
                    {inquiry.respondedAt && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        답변완료
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Response Modal */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogTitle>문의 상세 및 답변</DialogTitle>
          <DialogDescription>
            문의 내용을 확인하고 답변을 작성하세요.
          </DialogDescription>

          {selectedInquiry && (
            <div className="space-y-4">
              {/* Inquiry Details */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">제목</div>
                  <div className="font-semibold">{selectedInquiry.title}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">내용</div>
                  <div className="whitespace-pre-wrap">{selectedInquiry.content}</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">작성일: </span>
                    {formatDistanceToNow(new Date(selectedInquiry.createdAt), { addSuffix: true, locale: ko })}
                  </div>
                  <div>{getStatusBadge(selectedInquiry.status)}</div>
                </div>
              </div>

              {/* Response Form */}
              <Form {...responseForm}>
                <form onSubmit={responseForm.handleSubmit(handleSubmitResponse)} className="space-y-4">
                  <FormField
                    control={responseForm.control}
                    name="response"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>답변</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="답변 내용을 입력하세요 (최소 10자)"
                            className="min-h-[150px] resize-none"
                            {...field}
                            data-testid="textarea-response"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={responseForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>상태</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="상태 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PENDING">대기중</SelectItem>
                            <SelectItem value="IN_PROGRESS">처리중</SelectItem>
                            <SelectItem value="RESOLVED">답변완료</SelectItem>
                            <SelectItem value="CLOSED">종료</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsResponseModalOpen(false)}
                      disabled={updateResponseMutation.isPending}
                      data-testid="button-cancel-response"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateResponseMutation.isPending}
                      data-testid="button-submit-response"
                    >
                      {updateResponseMutation.isPending ? '등록 중...' : '답변 등록'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
