import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MerchantLayout } from "@/components/layout/merchant-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Clock, MapPin, Image as ImageIcon, Globe, Save } from "lucide-react";
import type { Merchant, MerchantHours } from "@shared/schema";

const DAYS_OF_WEEK = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

interface StoreFormData {
  name: string;
  description: string;
  phone: string;
  address: string;
  addressDetail: string;
  website: string;
  images: string[];
}

interface HoursFormData {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export default function StoreManagement() {
  const { toast } = useToast();
  
  // For demo purposes, use a mock merchant ID
  // In real app, get from user's merchant relationship
  const merchantId = "mock-merchant-id";

  // Fetch merchant data
  const { data: merchant, isLoading: merchantLoading } = useQuery<{ merchant: Merchant }>({
    queryKey: [`/api/merchants/${merchantId}`],
    enabled: false // Disabled until real merchant ID is available
  });

  // Fetch merchant hours
  const { data: hoursData, isLoading: hoursLoading } = useQuery<{ hours: MerchantHours[] }>({
    queryKey: [`/api/merchants/${merchantId}/hours`],
    enabled: false // Disabled until real merchant ID is available
  });

  // Initialize form data
  const [storeData, setStoreData] = useState<StoreFormData>({
    name: merchant?.merchant.name || "",
    description: merchant?.merchant.description || "",
    phone: merchant?.merchant.phone || "",
    address: merchant?.merchant.address || "",
    addressDetail: merchant?.merchant.addressDetail || "",
    website: merchant?.merchant.website || "",
    images: merchant?.merchant.images || []
  });

  const [hours, setHours] = useState<HoursFormData[]>(
    hoursData?.hours || 
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      isOpen: i !== 0, // Closed on Sunday by default
      openTime: "09:00",
      closeTime: "18:00"
    }))
  );

  // Update merchant mutation
  const updateMerchantMutation = useMutation({
    mutationFn: async (data: Partial<StoreFormData>) => {
      return await apiRequest('PATCH', `/api/merchants/${merchantId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${merchantId}`] });
      toast({
        title: "매장 정보 저장 완료",
        description: "매장 정보가 성공적으로 업데이트되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "매장 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Update hours mutation
  const updateHoursMutation = useMutation({
    mutationFn: async (data: HoursFormData[]) => {
      return await apiRequest('PUT', `/api/merchants/${merchantId}/hours`, { hours: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${merchantId}/hours`] });
      toast({
        title: "운영 시간 저장 완료",
        description: "운영 시간이 성공적으로 업데이트되었습니다."
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "운영 시간 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleStoreUpdate = () => {
    updateMerchantMutation.mutate(storeData);
  };

  const handleHoursUpdate = () => {
    updateHoursMutation.mutate(hours);
  };

  const handleHourChange = (dayIndex: number, field: keyof HoursFormData, value: any) => {
    setHours(prev => prev.map((h, i) => 
      i === dayIndex ? { ...h, [field]: value } : h
    ));
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-store-management-title">매장 관리</h1>
          <p className="text-muted-foreground mt-1">매장 정보와 운영 시간을 관리하세요</p>
        </div>

        {/* Basic Information */}
        <Card data-testid="card-basic-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              기본 정보
            </CardTitle>
            <CardDescription>매장의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">매장명 *</Label>
                <Input
                  id="name"
                  data-testid="input-store-name"
                  value={storeData.name}
                  onChange={(e) => setStoreData({ ...storeData, name: e.target.value })}
                  placeholder="매장 이름"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">대표전화 *</Label>
                <Input
                  id="phone"
                  data-testid="input-store-phone"
                  value={storeData.phone}
                  onChange={(e) => setStoreData({ ...storeData, phone: e.target.value })}
                  placeholder="02-1234-5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">매장 소개</Label>
              <Textarea
                id="description"
                data-testid="textarea-store-description"
                value={storeData.description}
                onChange={(e) => setStoreData({ ...storeData, description: e.target.value })}
                placeholder="매장을 소개해주세요"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소 *</Label>
              <Input
                id="address"
                data-testid="input-store-address"
                value={storeData.address}
                onChange={(e) => setStoreData({ ...storeData, address: e.target.value })}
                placeholder="서울시 강남구..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressDetail">상세 주소</Label>
              <Input
                id="addressDetail"
                data-testid="input-store-address-detail"
                value={storeData.addressDetail}
                onChange={(e) => setStoreData({ ...storeData, addressDetail: e.target.value })}
                placeholder="건물명, 층수 등"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">
                <Globe className="w-4 h-4 inline mr-1" />
                웹사이트
              </Label>
              <Input
                id="website"
                data-testid="input-store-website"
                value={storeData.website}
                onChange={(e) => setStoreData({ ...storeData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <Button 
              onClick={handleStoreUpdate} 
              disabled={updateMerchantMutation.isPending}
              data-testid="button-save-store-info"
              className="w-full md:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMerchantMutation.isPending ? "저장 중..." : "기본 정보 저장"}
            </Button>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card data-testid="card-operating-hours">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              운영 시간
            </CardTitle>
            <CardDescription>요일별 운영 시간을 설정하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hours.map((hour, index) => (
              <div key={index} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg" data-testid={`hours-row-${index}`}>
                <div className="flex items-center justify-between md:w-32">
                  <span className="font-medium">{DAYS_OF_WEEK[hour.dayOfWeek]}</span>
                  <Switch
                    checked={hour.isOpen}
                    onCheckedChange={(checked) => handleHourChange(index, 'isOpen', checked)}
                    data-testid={`switch-open-${index}`}
                  />
                </div>
                
                {hour.isOpen && (
                  <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="w-12">시작</Label>
                      <Input
                        type="time"
                        value={hour.openTime}
                        onChange={(e) => handleHourChange(index, 'openTime', e.target.value)}
                        data-testid={`input-open-time-${index}`}
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="w-12">종료</Label>
                      <Input
                        type="time"
                        value={hour.closeTime}
                        onChange={(e) => handleHourChange(index, 'closeTime', e.target.value)}
                        data-testid={`input-close-time-${index}`}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}

                {!hour.isOpen && (
                  <span className="text-muted-foreground text-sm">휴무</span>
                )}
              </div>
            ))}

            <Button 
              onClick={handleHoursUpdate} 
              disabled={updateHoursMutation.isPending}
              data-testid="button-save-hours"
              className="w-full md:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateHoursMutation.isPending ? "저장 중..." : "운영 시간 저장"}
            </Button>
          </CardContent>
        </Card>

        {/* Images */}
        <Card data-testid="card-images">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              매장 이미지
            </CardTitle>
            <CardDescription>매장 사진을 추가하여 고객들에게 보여주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">이미지 업로드 기능은 곧 제공됩니다</p>
              <Button variant="outline" disabled data-testid="button-upload-image">
                이미지 업로드
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
