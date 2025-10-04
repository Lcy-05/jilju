import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Upload, MapPin, Clock, Image } from 'lucide-react';
import { useAuth, withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/hooks/use-location';
import { API_ENDPOINTS, APPLICATION_STATUS, BENEFIT_TYPES } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

// Wizard steps as per specification (S0-S8)
const WIZARD_STEPS = [
  { id: 0, title: '본인인증', description: '이메일/휴대폰 인증' },
  { id: 1, title: '사업자 정보', description: '사업자등록증 및 기본정보' },
  { id: 2, title: '매장 기본정보', description: '지점명, 카테고리, 대표전화' },
  { id: 3, title: '주소 및 위치', description: '주소검색, 지도핀, 중복탐지' },
  { id: 4, title: '영업시간', description: '운영시간 및 예외일정' },
  { id: 5, title: '사진 및 SNS', description: '매장사진, 로고, SNS' },
  { id: 6, title: '혜택 선택', description: '혜택 템플릿 선택' },
  { id: 7, title: '혜택 상세', description: '조건 설정 및 미리보기' },
  { id: 8, title: '확인 및 제출', description: '최종 검토 및 제출' }
];

// Form schemas for each step
const step0Schema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  phone: z.string().min(10, '올바른 휴대폰 번호를 입력하세요'),
  businessType: z.enum(['INDIVIDUAL', 'CORPORATION'])
});

const step1Schema = z.object({
  businessNumber: z.string().min(10, '사업자등록번호를 입력하세요'),
  businessName: z.string().min(1, '상호명을 입력하세요'),
  ownerName: z.string().min(1, '대표자명을 입력하세요')
});

const step2Schema = z.object({
  merchantName: z.string().min(1, '매장명을 입력하세요'),
  category: z.string().min(1, '카테고리를 선택하세요'),
  phone: z.string().min(10, '대표전화를 입력하세요')
});

const step3Schema = z.object({
  address: z.string().min(1, '주소를 입력하세요'),
  addressDetail: z.string().optional(),
  latitude: z.number(),
  longitude: z.number()
});

const step4Schema = z.object({
  operatingHours: z.array(z.object({
    dayOfWeek: z.number(),
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional()
  }))
});

const step5Schema = z.object({
  images: z.array(z.string()).optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  socialLinks: z.record(z.string()).optional()
});

const step6Schema = z.object({
  benefitType: z.enum(['PERCENT', 'AMOUNT', 'GIFT', 'MEMBERSHIP'])
});

const step7Schema = z.object({
  title: z.string().min(1, '혜택명을 입력하세요'),
  description: z.string().optional(),
  percent: z.number().optional(),
  amount: z.number().optional(),
  gift: z.string().optional(),
  membershipTier: z.string().optional(),
  minOrder: z.number().optional(),
  validFrom: z.string(),
  validTo: z.string(),
  terms: z.array(z.string()).optional()
});

function MerchantWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [applicationData, setApplicationData] = useState<any>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { location } = useLocation();
  const queryClient = useQueryClient();

  // Get categories for step 2
  const { data: categories } = useQuery({
    queryKey: [API_ENDPOINTS.CATEGORIES],
    staleTime: 30 * 60 * 1000,
  });

  // Load existing application if any
  const { data: existingApplication } = useQuery({
    queryKey: [API_ENDPOINTS.APPLICATIONS.LIST, user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `${API_ENDPOINTS.APPLICATIONS.LIST}?userId=${user?.id}&status=DRAFT`);
      return response.json();
    },
    enabled: !!user,
  });

  // Load existing application data
  useEffect(() => {
    if (existingApplication?.applications?.length > 0) {
      const app = existingApplication.applications[0];
      setApplicationId(app.id);
      setCurrentStep(app.currentStep || 0);
      setApplicationData(app.snapshot || {});
    }
  }, [existingApplication]);

  // Save application mutation
  const saveApplicationMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        currentStep,
        snapshot: { ...applicationData, ...data },
        status: currentStep === 8 ? APPLICATION_STATUS.SUBMITTED : APPLICATION_STATUS.DRAFT
      };

      if (applicationId) {
        const response = await apiRequest('PATCH', `${API_ENDPOINTS.APPLICATIONS.UPDATE}/${applicationId}`, payload);
        return response.json();
      } else {
        const response = await apiRequest('POST', API_ENDPOINTS.APPLICATIONS.CREATE, payload);
        return response.json();
      }
    },
    onSuccess: (data) => {
      if (!applicationId) {
        setApplicationId(data.application.id);
      }
      
      if (currentStep === 8) {
        toast({
          title: '신청서 제출 완료',
          description: '심사 후 연락드리겠습니다.',
        });
        window.location.href = '/profile';
      } else {
        toast({
          title: '저장되었습니다',
          description: '다음 단계로 진행하거나 나중에 계속할 수 있습니다.',
        });
      }
      
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.APPLICATIONS.LIST] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: error.message || '저장 중 오류가 발생했습니다.',
      });
    }
  });

  const handleNext = (data: any) => {
    const newData = { ...applicationData, ...data };
    setApplicationData(newData);
    saveApplicationMutation.mutate(data);
    
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleExit = () => {
    if (applicationData && Object.keys(applicationData).length > 0) {
      saveApplicationMutation.mutate(applicationData);
    }
    window.location.href = '/profile';
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card px-4 py-3 safe-top shadow-sm border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExit}
              className="p-2"
              data-testid="button-exit-wizard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">매장 등록</h1>
              <p className="text-sm text-muted-foreground">
                {WIZARD_STEPS[currentStep].title} ({currentStep + 1}/{WIZARD_STEPS.length})
              </p>
            </div>
          </div>
          
          <Badge variant="outline">
            {currentStep === 8 ? '제출 대기' : '작성중'}
          </Badge>
        </div>
        
        <Progress value={progress} className="mt-3" />
      </header>

      {/* Step Content */}
      <div className="p-4 max-w-2xl mx-auto">
        {currentStep === 0 && <Step0 onNext={handleNext} initialData={applicationData} />}
        {currentStep === 1 && <Step1 onNext={handleNext} onPrevious={handlePrevious} initialData={applicationData} />}
        {currentStep === 2 && <Step2 onNext={handleNext} onPrevious={handlePrevious} initialData={applicationData} categories={categories?.categories || []} />}
        {currentStep === 3 && <Step3 onNext={handleNext} onPrevious={handlePrevious} initialData={applicationData} />}
        {currentStep === 4 && <Step4 onNext={handleNext} onPrevious={handlePrevious} initialData={applicationData} />}
        {currentStep === 5 && <Step5 onNext={handleNext} onPrevious={handlePrevious} initialData={applicationData} />}
        {currentStep === 6 && <Step6 onNext={handleNext} onPrevious={handlePrevious} initialData={applicationData} />}
        {currentStep === 7 && <Step7 onNext={handleNext} onPrevious={handlePrevious} initialData={applicationData} />}
        {currentStep === 8 && <Step8 onSubmit={handleNext} onPrevious={handlePrevious} applicationData={applicationData} />}
      </div>
    </div>
  );
}

// Step 0: Authentication
function Step0({ onNext, initialData }: { onNext: (data: any) => void; initialData: any }) {
  const form = useForm({
    resolver: zodResolver(step0Schema),
    defaultValues: {
      email: initialData.email || '',
      phone: initialData.phone || '',
      businessType: initialData.businessType || 'INDIVIDUAL'
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>본인인증</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              data-testid="input-email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">휴대폰 번호</Label>
            <Input
              id="phone"
              {...form.register('phone')}
              placeholder="010-1234-5678"
              data-testid="input-phone"
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <Label>사업자 유형</Label>
            <Select onValueChange={(value: any) => form.setValue('businessType', value)}>
              <SelectTrigger data-testid="select-business-type">
                <SelectValue placeholder="사업자 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">개인사업자</SelectItem>
                <SelectItem value="CORPORATION">법인사업자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" data-testid="button-next-step0">
            다음 단계
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Step 1: Business Information
function Step1({ onNext, onPrevious, initialData }: { onNext: (data: any) => void; onPrevious: () => void; initialData: any }) {
  const form = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      businessNumber: initialData.businessNumber || '',
      businessName: initialData.businessName || '',
      ownerName: initialData.ownerName || ''
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>사업자 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
          <div>
            <Label htmlFor="businessNumber">사업자등록번호</Label>
            <Input
              id="businessNumber"
              {...form.register('businessNumber')}
              placeholder="123-45-67890"
              data-testid="input-business-number"
            />
            {form.formState.errors.businessNumber && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.businessNumber.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="businessName">상호명</Label>
            <Input
              id="businessName"
              {...form.register('businessName')}
              data-testid="input-business-name"
            />
            {form.formState.errors.businessName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.businessName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="ownerName">대표자명</Label>
            <Input
              id="ownerName"
              {...form.register('ownerName')}
              data-testid="input-owner-name"
            />
            {form.formState.errors.ownerName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.ownerName.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
              이전
            </Button>
            <Button type="submit" className="flex-1" data-testid="button-next-step1">
              다음 단계
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Step 2: Basic Store Information
function Step2({ onNext, onPrevious, initialData, categories }: { 
  onNext: (data: any) => void; 
  onPrevious: () => void; 
  initialData: any;
  categories: any[];
}) {
  const form = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      merchantName: initialData.merchantName || '',
      category: initialData.category || '',
      phone: initialData.phone || ''
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>매장 기본정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
          <div>
            <Label htmlFor="merchantName">매장명</Label>
            <Input
              id="merchantName"
              {...form.register('merchantName')}
              data-testid="input-merchant-name"
            />
            {form.formState.errors.merchantName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.merchantName.message}
              </p>
            )}
          </div>

          <div>
            <Label>카테고리</Label>
            <Select onValueChange={(value) => form.setValue('category', value)}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">대표전화</Label>
            <Input
              id="phone"
              {...form.register('phone')}
              data-testid="input-store-phone"
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
              이전
            </Button>
            <Button type="submit" className="flex-1" data-testid="button-next-step2">
              다음 단계
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Step 3: Address and Location  
function Step3({ onNext, onPrevious, initialData }: { 
  onNext: (data: any) => void; 
  onPrevious: () => void; 
  initialData: any;
}) {
  const { location } = useLocation();
  const form = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      address: initialData.address || '',
      addressDetail: initialData.addressDetail || '',
      latitude: initialData.latitude || location?.lat || 37.5665,
      longitude: initialData.longitude || location?.lng || 126.9780
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>주소 및 위치</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
          <div>
            <Label htmlFor="address">주소</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                {...form.register('address')}
                placeholder="주소를 검색하세요"
                data-testid="input-address"
                className="flex-1"
              />
              <Button type="button" variant="outline" data-testid="button-search-address">
                <MapPin className="w-4 h-4" />
              </Button>
            </div>
            {form.formState.errors.address && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="addressDetail">상세주소</Label>
            <Input
              id="addressDetail"
              {...form.register('addressDetail')}
              placeholder="동, 호수 등"
              data-testid="input-address-detail"
            />
          </div>

          {/* Map placeholder for location selection */}
          <div className="h-40 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">지도에서 정확한 위치를 선택하세요</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
              이전
            </Button>
            <Button type="submit" className="flex-1" data-testid="button-next-step3">
              다음 단계
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Step 4: Operating Hours
function Step4({ onNext, onPrevious, initialData }: { 
  onNext: (data: any) => void; 
  onPrevious: () => void; 
  initialData: any;
}) {
  const [operatingHours, setOperatingHours] = useState(
    initialData.operatingHours || Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      isOpen: true,
      openTime: '09:00',
      closeTime: '22:00'
    }))
  );

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  const handleSubmit = () => {
    onNext({ operatingHours });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>영업시간</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {operatingHours.map((hours, index) => (
            <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="w-8 text-sm font-medium">{daysOfWeek[index]}</div>
              
              <Checkbox
                checked={hours.isOpen}
                onCheckedChange={(checked) => {
                  const newHours = [...operatingHours];
                  newHours[index].isOpen = !!checked;
                  setOperatingHours(newHours);
                }}
                data-testid={`checkbox-day-${index}`}
              />
              
              {hours.isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={hours.openTime}
                    onChange={(e) => {
                      const newHours = [...operatingHours];
                      newHours[index].openTime = e.target.value;
                      setOperatingHours(newHours);
                    }}
                    className="w-24"
                    data-testid={`input-open-time-${index}`}
                  />
                  <span className="text-sm text-muted-foreground">~</span>
                  <Input
                    type="time"
                    value={hours.closeTime}
                    onChange={(e) => {
                      const newHours = [...operatingHours];
                      newHours[index].closeTime = e.target.value;
                      setOperatingHours(newHours);
                    }}
                    className="w-24"
                    data-testid={`input-close-time-${index}`}
                  />
                </div>
              ) : (
                <span className="flex-1 text-sm text-muted-foreground">휴무</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
            이전
          </Button>
          <Button onClick={handleSubmit} className="flex-1" data-testid="button-next-step4">
            다음 단계
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 5: Photos and SNS
function Step5({ onNext, onPrevious, initialData }: { 
  onNext: (data: any) => void; 
  onPrevious: () => void; 
  initialData: any;
}) {
  const form = useForm({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      website: initialData.website || '',
      socialLinks: initialData.socialLinks || {}
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>사진 및 SNS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
          {/* Photo upload placeholder */}
          <div>
            <Label>매장 사진</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                매장 내부/외부 사진을 업로드하세요
              </p>
              <Button type="button" variant="outline" size="sm" data-testid="button-upload-photos">
                <Upload className="w-4 h-4 mr-2" />
                사진 선택
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="website">웹사이트 (선택)</Label>
            <Input
              id="website"
              type="url"
              {...form.register('website')}
              placeholder="https://example.com"
              data-testid="input-website"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
              이전
            </Button>
            <Button type="submit" className="flex-1" data-testid="button-next-step5">
              다음 단계
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Step 6: Benefit Template Selection
function Step6({ onNext, onPrevious, initialData }: { 
  onNext: (data: any) => void; 
  onPrevious: () => void; 
  initialData: any;
}) {
  const [selectedType, setSelectedType] = useState(initialData.benefitType || '');

  const benefitTemplates = [
    {
      type: 'PERCENT',
      title: '할인율 혜택',
      description: '10%, 20%, 30% 등 퍼센트 할인',
      example: '전 메뉴 20% 할인',
      icon: '📊'
    },
    {
      type: 'AMOUNT',
      title: '정액 할인',
      description: '5,000원, 10,000원 등 고정 할인',
      example: '5,000원 즉시 할인',
      icon: '💰'
    },
    {
      type: 'GIFT',
      title: '증정 혜택',
      description: '무료 음료, 디저트 등 증정',
      example: '음료 1잔 무료 제공',
      icon: '🎁'
    },
    {
      type: 'MEMBERSHIP',
      title: '멤버십 혜택',
      description: '회원가입, 첫 달 할인 등',
      example: '첫 달 회원권 50% 할인',
      icon: '👑'
    }
  ];

  const handleSubmit = () => {
    if (selectedType) {
      onNext({ benefitType: selectedType });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>혜택 템플릿 선택</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {benefitTemplates.map((template) => (
            <div
              key={template.type}
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-colors",
                selectedType === template.type
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground"
              )}
              onClick={() => setSelectedType(template.type)}
              data-testid={`template-${template.type.toLowerCase()}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{template.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                  <Badge variant="outline" className="text-xs">
                    예시: {template.example}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
            이전
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1" 
            disabled={!selectedType}
            data-testid="button-next-step6"
          >
            다음 단계
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Step 7: Benefit Details
function Step7({ onNext, onPrevious, initialData }: { 
  onNext: (data: any) => void; 
  onPrevious: () => void; 
  initialData: any;
}) {
  const form = useForm({
    resolver: zodResolver(step7Schema),
    defaultValues: {
      title: initialData.title || '',
      description: initialData.description || '',
      percent: initialData.percent || undefined,
      amount: initialData.amount || undefined,
      gift: initialData.gift || '',
      membershipTier: initialData.membershipTier || '',
      minOrder: initialData.minOrder || undefined,
      validFrom: initialData.validFrom || new Date().toISOString().split('T')[0],
      validTo: initialData.validTo || '',
      terms: initialData.terms || ['다른 할인 혜택과 중복 사용 불가', '1인 1일 1회 사용 가능']
    }
  });

  const benefitType = initialData.benefitType;

  return (
    <Card>
      <CardHeader>
        <CardTitle>혜택 상세 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
          <div>
            <Label htmlFor="title">혜택명</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="예: 전 메뉴 20% 할인"
              data-testid="input-benefit-title"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {benefitType === 'PERCENT' && (
            <div>
              <Label htmlFor="percent">할인율 (%)</Label>
              <Input
                id="percent"
                type="number"
                {...form.register('percent', { valueAsNumber: true })}
                min="1"
                max="100"
                data-testid="input-percent"
              />
            </div>
          )}

          {benefitType === 'AMOUNT' && (
            <div>
              <Label htmlFor="amount">할인 금액 (원)</Label>
              <Input
                id="amount"
                type="number"
                {...form.register('amount', { valueAsNumber: true })}
                min="1000"
                step="1000"
                data-testid="input-amount"
              />
            </div>
          )}

          {benefitType === 'GIFT' && (
            <div>
              <Label htmlFor="gift">증정품</Label>
              <Input
                id="gift"
                {...form.register('gift')}
                placeholder="예: 아메리카노 1잔"
                data-testid="input-gift"
              />
            </div>
          )}

          {benefitType === 'MEMBERSHIP' && (
            <div>
              <Label htmlFor="membershipTier">멤버십 등급</Label>
              <Input
                id="membershipTier"
                {...form.register('membershipTier')}
                placeholder="예: 골드 회원"
                data-testid="input-membership"
              />
            </div>
          )}

          <div>
            <Label htmlFor="minOrder">최소 주문금액 (원, 선택)</Label>
            <Input
              id="minOrder"
              type="number"
              {...form.register('minOrder', { valueAsNumber: true })}
              min="0"
              step="1000"
              data-testid="input-min-order"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="validFrom">시작일</Label>
              <Input
                id="validFrom"
                type="date"
                {...form.register('validFrom')}
                data-testid="input-valid-from"
              />
            </div>
            <div>
              <Label htmlFor="validTo">종료일</Label>
              <Input
                id="validTo"
                type="date"
                {...form.register('validTo')}
                data-testid="input-valid-to"
              />
              {form.formState.errors.validTo && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.validTo.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">혜택 설명 (선택)</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="혜택에 대한 자세한 설명을 입력하세요"
              data-testid="textarea-description"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
              이전
            </Button>
            <Button type="submit" className="flex-1" data-testid="button-next-step7">
              다음 단계
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Step 8: Review and Submit
function Step8({ onSubmit, onPrevious, applicationData }: { 
  onSubmit: (data: any) => void; 
  onPrevious: () => void; 
  applicationData: any;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>신청서 최종 확인</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Review sections */}
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">사업자 정보</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">상호명:</span> {applicationData.businessName}</p>
              <p><span className="text-muted-foreground">대표자:</span> {applicationData.ownerName}</p>
              <p><span className="text-muted-foreground">사업자번호:</span> {applicationData.businessNumber}</p>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">매장 정보</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">매장명:</span> {applicationData.merchantName}</p>
              <p><span className="text-muted-foreground">주소:</span> {applicationData.address}</p>
              <p><span className="text-muted-foreground">전화:</span> {applicationData.phone}</p>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">혜택 정보</h4>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">혜택명:</span> {applicationData.title}</p>
              <p><span className="text-muted-foreground">유형:</span> {applicationData.benefitType}</p>
              <p><span className="text-muted-foreground">기간:</span> {applicationData.validFrom} ~ {applicationData.validTo}</p>
            </div>
          </div>
        </div>

        {/* Terms agreement */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">신청 안내</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 신청서 검토에는 2-3일 정도 소요됩니다</li>
            <li>• 승인 후 바로 매장 운영을 시작할 수 있습니다</li>
            <li>• 추가 서류가 필요한 경우 연락드리겠습니다</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onPrevious} className="flex-1">
            이전
          </Button>
          <Button 
            onClick={() => onSubmit(applicationData)} 
            className="flex-1"
            data-testid="button-submit-application"
          >
            신청서 제출
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default withAuth(MerchantWizard);
