import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { MerchantLayout } from '@/components/layout/merchant-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Gift, Eye, MousePointer } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';

interface KPISummary {
  viewCount: number;
  clickCount: number;
  couponIssued: number;
  couponRedeemed: number;
  ctr: number;
  conversionRate: number;
}

interface DailyKPI {
  date: string;
  viewCount: number;
  clickCount: number;
  couponIssued: number;
  couponRedeemed: number;
  ctr: number;
}

export default function MerchantDashboard() {
  const { user } = useAuth();

  // Get merchant ID from user object
  const merchantId = user?.merchantId;

  // Fetch KPI summary
  const { data: summary, isLoading: summaryLoading } = useQuery<KPISummary>({
    queryKey: [`/api/analytics/merchant/${merchantId}/summary`],
    enabled: !!merchantId
  });

  // Fetch daily KPIs (last 30 days)
  const { data: dailyData, isLoading: dailyLoading } = useQuery<DailyKPI[]>({
    queryKey: [`/api/analytics/merchant/${merchantId}`, { period: 'daily', days: 30 }],
    enabled: !!merchantId
  });

  // Placeholder data for demo
  const placeholderSummary: KPISummary = {
    viewCount: 1234,
    clickCount: 567,
    couponIssued: 234,
    couponRedeemed: 123,
    ctr: 45.9,
    conversionRate: 52.6
  };

  const placeholderDaily: DailyKPI[] = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    viewCount: Math.floor(Math.random() * 100) + 20,
    clickCount: Math.floor(Math.random() * 50) + 10,
    couponIssued: Math.floor(Math.random() * 30) + 5,
    couponRedeemed: Math.floor(Math.random() * 20) + 2,
    ctr: Math.floor(Math.random() * 30) + 20
  }));

  const displaySummary = summary || placeholderSummary;
  const displayDaily = dailyData || placeholderDaily;

  const stats = [
    {
      name: '총 조회수',
      value: displaySummary.viewCount.toLocaleString(),
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: '클릭수',
      value: displaySummary.clickCount.toLocaleString(),
      icon: MousePointer,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: '쿠폰 발급',
      value: displaySummary.couponIssued.toLocaleString(),
      icon: Gift,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'CTR',
      value: `${displaySummary.ctr.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">대시보드</h1>
          <p className="text-muted-foreground mt-1">매장 성과를 한눈에 확인하세요</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.name} data-testid={`card-${stat.name.toLowerCase().replace(' ', '-')}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid={`text-${stat.name.toLowerCase().replace(' ', '-')}-value`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Views & Clicks */}
          <Card data-testid="card-views-clicks-chart">
            <CardHeader>
              <CardTitle>조회수 & 클릭수 추이</CardTitle>
              <CardDescription>최근 30일간 데이터</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={displayDaily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="viewCount" stroke="#3b82f6" strokeWidth={2} name="조회수" />
                  <Line type="monotone" dataKey="clickCount" stroke="#10b981" strokeWidth={2} name="클릭수" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Coupon Issuance & Redemption */}
          <Card data-testid="card-coupon-chart">
            <CardHeader>
              <CardTitle>쿠폰 발급 & 사용</CardTitle>
              <CardDescription>최근 30일간 데이터</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={displayDaily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="couponIssued" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="발급" />
                  <Area type="monotone" dataKey="couponRedeemed" stackId="2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="사용" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CTR Trend */}
          <Card className="lg:col-span-2" data-testid="card-ctr-chart">
            <CardHeader>
              <CardTitle>클릭률(CTR) 추이</CardTitle>
              <CardDescription>최근 30일간 데이터</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={displayDaily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'CTR (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="ctr" fill="#f59e0b" name="CTR (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
}
