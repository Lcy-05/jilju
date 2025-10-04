import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Building2, 
  Gift, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Filter,
  Search,
  Download,
  Upload,
  Settings,
  Shield,
  FileText,
  TrendingUp,
  Activity,
  DollarSign,
  Target
} from 'lucide-react';
import { useAuth, withAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { MerchantApplication, Benefit, Merchant, User } from '@/types';
import { API_ENDPOINTS, APPLICATION_STATUS, ROLES } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface KPIData {
  activeBenefits: number;
  newMerchants: number;
  dailyCouponsIssued: number;
  dailyCouponsUsed: number;
  pendingApplications: number;
  totalReports: number;
  avgProcessingTime: number;
}

interface ApplicationWithDetails extends MerchantApplication {
  applicant?: User;
  reviewer?: User;
}

function AdminConsole() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [isApplicationDetailOpen, setIsApplicationDetailOpen] = useState(false);
  const [applicationFilter, setApplicationFilter] = useState('IN_REVIEW');
  
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not authorized
  useEffect(() => {
    if (!hasRole('OPERATOR') && !hasRole('ADMIN')) {
      window.location.href = '/profile';
    }
  }, [hasRole]);

  // Get dashboard KPIs
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['/api/admin/dashboard/kpis'],
    queryFn: async () => {
      // Mock data since endpoint doesn't exist yet
      return {
        activeBenefits: 1247,
        newMerchants: 23,
        dailyCouponsIssued: 156,
        dailyCouponsUsed: 89,
        pendingApplications: 8,
        totalReports: 3,
        avgProcessingTime: 2.4
      } as KPIData;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get merchant applications for kanban board
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: [API_ENDPOINTS.APPLICATIONS.LIST, applicationFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: applicationFilter });
      const response = await apiRequest('GET', `${API_ENDPOINTS.APPLICATIONS.LIST}?${params}`);
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds for real-time feel
  });

  // Get all applications for kanban view
  const { data: allApplicationsData } = useQuery({
    queryKey: [API_ENDPOINTS.APPLICATIONS.LIST, 'all'],
    queryFn: async () => {
      const response = await apiRequest('GET', API_ENDPOINTS.APPLICATIONS.LIST);
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  // Get merchants for management
  const { data: merchantsData, isLoading: merchantsLoading } = useQuery({
    queryKey: [API_ENDPOINTS.MERCHANTS.SEARCH, 'admin'],
    queryFn: async () => {
      const response = await apiRequest('GET', `${API_ENDPOINTS.MERCHANTS.SEARCH}?limit=100`);
      return response.json();
    },
    enabled: activeTab === 'merchants',
    staleTime: 5 * 60 * 1000,
  });

  // Get benefits for management
  const { data: benefitsData, isLoading: benefitsLoading } = useQuery({
    queryKey: [API_ENDPOINTS.BENEFITS.SEARCH, 'admin'],
    queryFn: async () => {
      const response = await apiRequest('GET', `${API_ENDPOINTS.BENEFITS.SEARCH}?limit=100`);
      return response.json();
    },
    enabled: activeTab === 'benefits',
    staleTime: 5 * 60 * 1000,
  });

  // Approve application mutation
  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await apiRequest('POST', `${API_ENDPOINTS.APPLICATIONS.APPROVE.replace(':id', applicationId)}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '신청 승인됨',
        description: '매장 신청이 승인되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.APPLICATIONS.LIST] });
      setIsApplicationDetailOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: '승인 실패',
        description: error.message || '신청 승인 중 오류가 발생했습니다.',
      });
    }
  });

  // Reject application mutation
  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string; notes: string }) => {
      const response = await apiRequest('POST', `${API_ENDPOINTS.APPLICATIONS.REJECT.replace(':id', applicationId)}`, { notes });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '신청 반려됨',
        description: '매장 신청이 반려되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.APPLICATIONS.LIST] });
      setIsApplicationDetailOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: '반려 실패',
        description: error.message || '신청 반려 중 오류가 발생했습니다.',
      });
    }
  });

  const handleApplicationClick = (application: ApplicationWithDetails) => {
    setSelectedApplication(application);
    setIsApplicationDetailOpen(true);
  };

  const handleApproveApplication = () => {
    if (selectedApplication) {
      approveApplicationMutation.mutate(selectedApplication.id);
    }
  };

  const handleRejectApplication = (notes: string) => {
    if (selectedApplication) {
      rejectApplicationMutation.mutate({ 
        applicationId: selectedApplication.id, 
        notes 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      [APPLICATION_STATUS.DRAFT]: { variant: 'secondary' as const, label: '임시저장' },
      [APPLICATION_STATUS.SUBMITTED]: { variant: 'default' as const, label: '제출됨' },
      [APPLICATION_STATUS.IN_REVIEW]: { variant: 'default' as const, label: '심사중' },
      [APPLICATION_STATUS.NEEDS_INFO]: { variant: 'outline' as const, label: '보완요청' },
      [APPLICATION_STATUS.APPROVED]: { variant: 'default' as const, label: '승인됨', className: 'bg-green-500' },
      [APPLICATION_STATUS.REJECTED]: { variant: 'destructive' as const, label: '반려됨' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const applications = applicationsData?.applications || [];
  const allApplications = allApplicationsData?.applications || [];
  const merchants = merchantsData?.merchants || [];
  const benefits = benefitsData?.benefits || [];

  // Group applications by status for kanban
  const applicationsByStatus = {
    [APPLICATION_STATUS.SUBMITTED]: allApplications.filter((app: MerchantApplication) => app.status === APPLICATION_STATUS.SUBMITTED),
    [APPLICATION_STATUS.IN_REVIEW]: allApplications.filter((app: MerchantApplication) => app.status === APPLICATION_STATUS.IN_REVIEW),
    [APPLICATION_STATUS.NEEDS_INFO]: allApplications.filter((app: MerchantApplication) => app.status === APPLICATION_STATUS.NEEDS_INFO),
    [APPLICATION_STATUS.APPROVED]: allApplications.filter((app: MerchantApplication) => app.status === APPLICATION_STATUS.APPROVED),
    [APPLICATION_STATUS.REJECTED]: allApplications.filter((app: MerchantApplication) => app.status === APPLICATION_STATUS.REJECTED)
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">관리자 콘솔</h1>
          <p className="text-muted-foreground">질주 플랫폼 관리 및 운영</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {hasRole('ADMIN') ? '관리자' : '운영자'}
          </Badge>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/'}
            data-testid="button-home"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            메인으로
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            대시보드
          </TabsTrigger>
          <TabsTrigger value="applications" data-testid="tab-applications">
            <FileText className="w-4 h-4 mr-2" />
            신청서 ({applicationsByStatus[APPLICATION_STATUS.IN_REVIEW]?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="merchants" data-testid="tab-merchants">
            <Building2 className="w-4 h-4 mr-2" />
            매장관리
          </TabsTrigger>
          <TabsTrigger value="benefits" data-testid="tab-benefits">
            <Gift className="w-4 h-4 mr-2" />
            혜택관리
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            사용자관리
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 혜택</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-benefits">
                  {kpiData?.activeBenefits?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  전체 게시된 혜택 수
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">신규 매장</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-new-merchants">
                  {kpiData?.newMerchants || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  이번 달 승인된 매장
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">일일 쿠폰 발급</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-daily-coupons">
                  {kpiData?.dailyCouponsIssued || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  사용률: {kpiData?.dailyCouponsUsed ? Math.round((kpiData.dailyCouponsUsed / kpiData.dailyCouponsIssued) * 100) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평균 처리 시간</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-processing-time">
                  {kpiData?.avgProcessingTime || 0}일
                </div>
                <p className="text-xs text-muted-foreground">
                  신청 승인까지 소요시간
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">강남 카페 모카 승인 완료</p>
                    <p className="text-xs text-muted-foreground">2시간 전</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">신사 베이커리 보완 요청</p>
                    <p className="text-xs text-muted-foreground">4시간 전</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">청담 헤어살롱 신규 신청</p>
                    <p className="text-xs text-muted-foreground">6시간 전</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Kanban Tab */}
        <TabsContent value="applications" className="space-y-6">
          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <Select value={applicationFilter} onValueChange={setApplicationFilter}>
              <SelectTrigger className="w-48" data-testid="select-application-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_REVIEW">심사중 ({applicationsByStatus[APPLICATION_STATUS.IN_REVIEW]?.length || 0})</SelectItem>
                <SelectItem value="SUBMITTED">제출됨 ({applicationsByStatus[APPLICATION_STATUS.SUBMITTED]?.length || 0})</SelectItem>
                <SelectItem value="NEEDS_INFO">보완요청 ({applicationsByStatus[APPLICATION_STATUS.NEEDS_INFO]?.length || 0})</SelectItem>
                <SelectItem value="APPROVED">승인됨 ({applicationsByStatus[APPLICATION_STATUS.APPROVED]?.length || 0})</SelectItem>
                <SelectItem value="REJECTED">반려됨 ({applicationsByStatus[APPLICATION_STATUS.REJECTED]?.length || 0})</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex-1" />
            
            <Button variant="outline" data-testid="button-export-applications">
              <Download className="w-4 h-4 mr-2" />
              내보내기
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(applicationsByStatus).map(([status, statusApplications]) => (
              <Card key={status} className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {getStatusBadge(status)}
                    <span className="text-xs text-muted-foreground">
                      {statusApplications.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {statusApplications.slice(0, 10).map((application: MerchantApplication) => (
                    <Card 
                      key={application.id}
                      className="cursor-pointer hover:shadow-md transition-shadow p-3"
                      onClick={() => handleApplicationClick(application)}
                      data-testid={`card-application-${application.id}`}
                    >
                      <h4 className="font-medium text-sm line-clamp-1">
                        {(application.snapshot as any)?.merchantName || '매장명 미입력'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {(application.snapshot as any)?.businessName || '사업자명 미입력'}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {application.submittedAt 
                            ? formatDistanceToNow(new Date(application.submittedAt), { 
                                addSuffix: true, 
                                locale: ko 
                              })
                            : formatDistanceToNow(new Date(application.createdAt), { 
                                addSuffix: true, 
                                locale: ko 
                              })}
                        </span>
                        <Progress 
                          value={(application.currentStep / 8) * 100} 
                          className="w-12 h-1" 
                        />
                      </div>
                    </Card>
                  ))}
                  
                  {statusApplications.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      해당 상태의 신청서가 없습니다
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Merchants Tab */}
        <TabsContent value="merchants" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="매장명, 주소, 전화번호로 검색..." 
                className="pl-10"
                data-testid="input-search-merchants"
              />
            </div>
            <Button variant="outline" data-testid="button-add-merchant">
              <Building2 className="w-4 h-4 mr-2" />
              매장 추가
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>매장 관리</CardTitle>
            </CardHeader>
            <CardContent>
              {merchantsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>매장명</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>주소</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead className="w-24">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchants.slice(0, 20).map((merchant: Merchant) => (
                      <TableRow key={merchant.id}>
                        <TableCell className="font-medium">
                          {merchant.name}
                        </TableCell>
                        <TableCell>
                          {merchant.categoryPath?.join(' > ')}
                        </TableCell>
                        <TableCell className="max-w-48 truncate">
                          {merchant.address}
                        </TableCell>
                        <TableCell>
                          <Badge variant={merchant.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {merchant.status === 'ACTIVE' ? '운영중' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(merchant.createdAt), { 
                            addSuffix: true, 
                            locale: ko 
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-view-merchant-${merchant.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-edit-merchant-${merchant.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefits Tab */}
        <TabsContent value="benefits" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="혜택명, 매장명으로 검색..." 
                className="pl-10"
                data-testid="input-search-benefits"
              />
            </div>
            <Button variant="outline" data-testid="button-filter-benefits">
              <Filter className="w-4 h-4 mr-2" />
              필터
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>혜택 관리</CardTitle>
            </CardHeader>
            <CardContent>
              {benefitsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>혜택명</TableHead>
                      <TableHead>매장명</TableHead>
                      <TableHead>타입</TableHead>
                      <TableHead>할인/혜택</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>유효기간</TableHead>
                      <TableHead className="w-24">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benefits.slice(0, 20).map((benefit: Benefit) => (
                      <TableRow key={benefit.id}>
                        <TableCell className="font-medium max-w-48 truncate">
                          {benefit.title}
                        </TableCell>
                        <TableCell>
                          {(benefit as any).merchant_name || '매장명 없음'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {benefit.type === 'PERCENT' && '할인율'}
                            {benefit.type === 'AMOUNT' && '정액할인'}
                            {benefit.type === 'GIFT' && '증정'}
                            {benefit.type === 'MEMBERSHIP' && '멤버십'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {benefit.type === 'PERCENT' && `${benefit.percent}%`}
                          {benefit.type === 'AMOUNT' && `${benefit.amount?.toLocaleString()}원`}
                          {benefit.type === 'GIFT' && benefit.gift}
                          {benefit.type === 'MEMBERSHIP' && benefit.membershipTier}
                        </TableCell>
                        <TableCell>
                          <Badge variant={benefit.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {benefit.status === 'ACTIVE' ? '활성' : '비활성'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(benefit.validTo) > new Date() ? (
                            formatDistanceToNow(new Date(benefit.validTo), { locale: ko }) + ' 후 만료'
                          ) : (
                            '만료됨'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-view-benefit-${benefit.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-edit-benefit-${benefit.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="이메일, 이름으로 검색..." 
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Button variant="outline" data-testid="button-manage-roles">
              <Shield className="w-4 h-4 mr-2" />
              권한 관리
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>사용자 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4" />
                <p>사용자 관리 기능은 곧 추가됩니다</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Application Detail Dialog */}
      <Dialog open={isApplicationDetailOpen} onOpenChange={setIsApplicationDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>신청서 상세 - {(selectedApplication?.snapshot as any)?.merchantName || '매장명 미입력'}</DialogTitle>
            <DialogDescription>
              신청일: {selectedApplication?.submittedAt 
                ? new Date(selectedApplication.submittedAt).toLocaleDateString('ko-KR')
                : new Date(selectedApplication?.createdAt || '').toLocaleDateString('ko-KR')
              }
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Status and Progress */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedApplication.status)}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">진행률:</span>
                  <Progress value={(selectedApplication.currentStep / 8) * 100} className="w-32" />
                  <span className="text-sm text-muted-foreground">
                    {selectedApplication.currentStep}/8
                  </span>
                </div>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">사업자 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">사업자등록번호</Label>
                      <p className="font-medium">{(selectedApplication.snapshot as any)?.businessNumber || '미입력'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">상호명</Label>
                      <p className="font-medium">{(selectedApplication.snapshot as any)?.businessName || '미입력'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">대표자명</Label>
                      <p className="font-medium">{(selectedApplication.snapshot as any)?.ownerName || '미입력'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">매장 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">매장명</Label>
                      <p className="font-medium">{(selectedApplication.snapshot as any)?.merchantName || '미입력'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">카테고리</Label>
                      <p className="font-medium">{(selectedApplication.snapshot as any)?.category || '미입력'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">주소</Label>
                      <p className="font-medium">{(selectedApplication.snapshot as any)?.address || '미입력'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">전화번호</Label>
                      <p className="font-medium">{(selectedApplication.snapshot as any)?.phone || '미입력'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Review Notes */}
              {selectedApplication.reviewNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">검토 의견</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedApplication.reviewNotes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {selectedApplication.status === APPLICATION_STATUS.IN_REVIEW && (
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-reject-application">
                        <XCircle className="w-4 h-4 mr-2" />
                        반려
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>신청 반려</DialogTitle>
                        <DialogDescription>
                          반려 사유를 입력해주세요. 신청자에게 전달됩니다.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea 
                          placeholder="반려 사유를 상세히 작성해주세요..."
                          data-testid="textarea-reject-reason"
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleRejectApplication('반려 처리되었습니다.')}
                            variant="destructive"
                            data-testid="button-confirm-reject"
                          >
                            반려 확인
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    onClick={handleApproveApplication}
                    className="flex-1"
                    data-testid="button-approve-application"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    승인
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(AdminConsole, [ROLES.OPERATOR, ROLES.ADMIN]);
