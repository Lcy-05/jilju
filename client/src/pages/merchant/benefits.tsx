import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MerchantLayout } from "@/components/layout/merchant-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, CheckCircle, Clock, Pause, Save, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Benefit } from "@shared/schema";

interface BenefitFormData {
  title: string;
  description: string;
  type: string;
  percent?: number;
  amount?: number;
  gift?: string;
  minOrder?: number;
  validFrom: string;
  validTo: string;
  terms: string[];
}

export default function BenefitsManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  
  // For demo purposes, use a mock merchant ID
  const merchantId = "mock-merchant-id";

  // Form state
  const [formData, setFormData] = useState<BenefitFormData>({
    title: "",
    description: "",
    type: "PERCENT",
    percent: 10,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms: []
  });

  // Fetch benefits
  const { data: benefitsData, isLoading } = useQuery<{ benefits: Benefit[] }>({
    queryKey: [`/api/merchants/${merchantId}/benefits`],
    enabled: false // Disabled until real merchant ID is available
  });

  const benefits = benefitsData?.benefits || [];

  // Create benefit mutation
  const createMutation = useMutation({
    mutationFn: async (data: BenefitFormData) => {
      return await apiRequest('POST', `/api/merchants/${merchantId}/benefits`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${merchantId}/benefits`] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "혜택 생성 완료",
        description: "새로운 혜택이 생성되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "생성 실패",
        description: "혜택 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Update benefit mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BenefitFormData> }) => {
      return await apiRequest('PATCH', `/api/benefits/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${merchantId}/benefits`] });
      setIsEditDialogOpen(false);
      setSelectedBenefit(null);
      resetForm();
      toast({
        title: "혜택 수정 완료",
        description: "혜택이 성공적으로 수정되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "혜택 수정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Delete benefit mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/benefits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${merchantId}/benefits`] });
      toast({
        title: "혜택 삭제 완료",
        description: "혜택이 삭제되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "혜택 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Publish benefit mutation
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/benefits/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${merchantId}/benefits`] });
      toast({
        title: "혜택 발행 완료",
        description: "혜택이 발행되어 고객들에게 공개되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "발행 실패",
        description: "혜택 발행 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "PERCENT",
      percent: 10,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terms: []
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (selectedBenefit) {
      updateMutation.mutate({ id: selectedBenefit.id, data: formData });
    }
  };

  const handleEdit = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setFormData({
      title: benefit.title,
      description: benefit.description || "",
      type: benefit.type,
      percent: benefit.percent ? Number(benefit.percent) : undefined,
      amount: benefit.amount || undefined,
      gift: benefit.gift || undefined,
      minOrder: benefit.minOrder || undefined,
      validFrom: format(new Date(benefit.validFrom), 'yyyy-MM-dd'),
      validTo: format(new Date(benefit.validTo), 'yyyy-MM-dd'),
      terms: benefit.terms || []
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 이 혜택을 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const handlePublish = (id: string) => {
    if (confirm("이 혜택을 발행하시겠습니까? 발행 후에는 고객들에게 공개됩니다.")) {
      publishMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" data-testid={`badge-status-active`}><CheckCircle className="w-3 h-3 mr-1" />활성</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary" data-testid={`badge-status-draft`}><Clock className="w-3 h-3 mr-1" />초안</Badge>;
      case 'PAUSED':
        return <Badge variant="outline" data-testid={`badge-status-paused`}><Pause className="w-3 h-3 mr-1" />일시정지</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBenefitValue = (benefit: Benefit) => {
    switch (benefit.type) {
      case 'PERCENT':
        return `${benefit.percent}% 할인`;
      case 'AMOUNT':
        return `${benefit.amount?.toLocaleString()}원 할인`;
      case 'GIFT':
        return benefit.gift || "사은품 증정";
      case 'MEMBERSHIP':
        return benefit.membershipTier || "멤버십 혜택";
      default:
        return "-";
    }
  };

  const BenefitFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">혜택명 *</Label>
        <Input
          id="title"
          data-testid="input-benefit-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="예: 신규 고객 10% 할인"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          data-testid="textarea-benefit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="혜택에 대한 자세한 설명을 입력하세요"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">혜택 유형 *</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger data-testid="select-benefit-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERCENT">퍼센트 할인</SelectItem>
            <SelectItem value="AMOUNT">금액 할인</SelectItem>
            <SelectItem value="GIFT">사은품 증정</SelectItem>
            <SelectItem value="MEMBERSHIP">멤버십</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.type === 'PERCENT' && (
        <div className="space-y-2">
          <Label htmlFor="percent">할인율 (%) *</Label>
          <Input
            id="percent"
            type="number"
            data-testid="input-benefit-percent"
            value={formData.percent || ""}
            onChange={(e) => setFormData({ ...formData, percent: Number(e.target.value) })}
            min="1"
            max="100"
          />
        </div>
      )}

      {formData.type === 'AMOUNT' && (
        <div className="space-y-2">
          <Label htmlFor="amount">할인 금액 (원) *</Label>
          <Input
            id="amount"
            type="number"
            data-testid="input-benefit-amount"
            value={formData.amount || ""}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            min="0"
          />
        </div>
      )}

      {formData.type === 'GIFT' && (
        <div className="space-y-2">
          <Label htmlFor="gift">사은품 설명 *</Label>
          <Input
            id="gift"
            data-testid="input-benefit-gift"
            value={formData.gift || ""}
            onChange={(e) => setFormData({ ...formData, gift: e.target.value })}
            placeholder="예: 커피 쿠폰 1장"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="minOrder">최소 주문 금액 (원)</Label>
        <Input
          id="minOrder"
          type="number"
          data-testid="input-benefit-min-order"
          value={formData.minOrder || ""}
          onChange={(e) => setFormData({ ...formData, minOrder: Number(e.target.value) })}
          min="0"
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validFrom">시작일 *</Label>
          <Input
            id="validFrom"
            type="date"
            data-testid="input-benefit-valid-from"
            value={formData.validFrom}
            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validTo">종료일 *</Label>
          <Input
            id="validTo"
            type="date"
            data-testid="input-benefit-valid-to"
            value={formData.validTo}
            onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-benefits-management-title">혜택 관리</h1>
            <p className="text-muted-foreground mt-1">고객을 위한 혜택을 생성하고 관리하세요</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-benefit">
                <Plus className="w-4 h-4 mr-2" />
                새 혜택 만들기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>새 혜택 만들기</DialogTitle>
                <DialogDescription>고객들에게 제공할 혜택을 생성하세요</DialogDescription>
              </DialogHeader>
              <BenefitFormFields />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel-create">
                  취소
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-save-create">
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Benefits List */}
        <div className="grid grid-cols-1 gap-4">
          {benefits.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">아직 생성된 혜택이 없습니다</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-benefit">
                  <Plus className="w-4 h-4 mr-2" />
                  첫 혜택 만들기
                </Button>
              </CardContent>
            </Card>
          )}

          {benefits.map((benefit) => (
            <Card key={benefit.id} data-testid={`card-benefit-${benefit.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {benefit.title}
                      {getStatusBadge(benefit.status)}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {benefit.description || "설명 없음"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">혜택 내용</p>
                      <p className="font-medium" data-testid={`text-benefit-value-${benefit.id}`}>{getBenefitValue(benefit)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">최소 주문금액</p>
                      <p className="font-medium">{benefit.minOrder ? `${benefit.minOrder.toLocaleString()}원` : "제한 없음"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">유효 기간</p>
                      <p className="font-medium">
                        {format(new Date(benefit.validFrom), 'yyyy.MM.dd')} ~ {format(new Date(benefit.validTo), 'yyyy.MM.dd')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">발행일</p>
                      <p className="font-medium">
                        {benefit.publishedAt ? format(new Date(benefit.publishedAt), 'yyyy.MM.dd') : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {benefit.status === 'DRAFT' && (
                      <Button 
                        size="sm" 
                        onClick={() => handlePublish(benefit.id)}
                        data-testid={`button-publish-${benefit.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        발행
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(benefit)}
                      data-testid={`button-edit-${benefit.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      data-testid={`button-view-versions-${benefit.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      버전 기록
                    </Button>
                    {benefit.status === 'DRAFT' && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete(benefit.id)}
                        data-testid={`button-delete-${benefit.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>혜택 수정</DialogTitle>
              <DialogDescription>혜택 정보를 수정하세요</DialogDescription>
            </DialogHeader>
            <BenefitFormFields />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
                취소
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-save-edit">
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MerchantLayout>
  );
}
