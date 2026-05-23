import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ClipboardList,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStore } from '@/hooks/useStore';
import { getCustomerOrderCreditControl, getRestrictedCustomerNames } from '@/utils/orderFinance';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import gsap from 'gsap';

const trendData = [
  { time: '08:00', count: 12, passed: 10 },
  { time: '09:00', count: 18, passed: 16 },
  { time: '10:00', count: 25, passed: 23 },
  { time: '11:00', count: 20, passed: 19 },
  { time: '12:00', count: 15, passed: 14 },
  { time: '13:00', count: 22, passed: 20 },
  { time: '14:00', count: 28, passed: 26 },
];

const activityLogs = [
  { id: 1, action: '订单接收', detail: 'ORD20240304005', time: '14:32:18', user: '张检验员' },
  { id: 2, action: '质检完成', detail: 'PKG20240304003 - 合格', time: '14:28:45', user: '李检验员' },
  { id: 3, action: '扫码签收', detail: 'PKG20240304004', time: '14:25:12', user: '王检验员' },
  { id: 4, action: '异常上报', detail: 'PKG20240304002 - 重量不符', time: '14:20:33', user: '张检验员' },
  { id: 5, action: '仪器检测', detail: 'PKG20240304001 - 通过', time: '14:15:08', user: '仪器操作员' },
];

interface DashboardProps {
  onOpenExceptions: (
    searchTerm?: string,
    statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed',
    businessTypeFilter?: 'all' | '在途流转' | '分选' | '细筛' | '封包' | '出货' | '扫码交接'
  ) => void;
  onOpenFinance: () => void;
  onOpenOrders: (searchTerm?: string) => void;
}

export default function Dashboard({ onOpenExceptions, onOpenFinance, onOpenOrders }: DashboardProps) {
  const { stats, exceptionCases, customerOrders } = useStore();
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 卡片交错动画
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.stat-card');
      gsap.fromTo(
        cards,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
        }
      );
    }
  }, []);

  const statCards = [
    {
      title: '待处理订单',
      value: stats.pendingCount,
      icon: ClipboardList,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-500',
    },
    {
      title: '检验中',
      value: stats.inspectingCount,
      icon: Loader2,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-500',
    },
    {
      title: '已完成',
      value: stats.completedCount,
      icon: CheckCircle2,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-500',
    },
    {
      title: '异常订单',
      value: stats.exceptionCount,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-500',
    },
  ];
  const activeExceptions = exceptionCases.filter((item) => item.status === 'pending' || item.status === 'processing');
  const restrictedCustomerNames = useMemo(() => getRestrictedCustomerNames(customerOrders), [customerOrders]);
  const restrictedCustomerProfiles = useMemo(
    () =>
      restrictedCustomerNames
        .map((customerName) => {
          const targetOrder = customerOrders.find((item) => item.customerName === customerName);
          if (!targetOrder) {
            return null;
          }

          const creditControl = getCustomerOrderCreditControl(targetOrder, customerOrders);
          return {
            customerName,
            outstandingAmount: creditControl.customerOutstandingAmount,
            creditLimit: creditControl.creditLimit,
            overLimit: creditControl.overLimit,
            overdue: creditControl.overdue,
            maxAgingDays: creditControl.maxAgingDays,
            reason: creditControl.reason,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((a, b) => {
          if (a.overdue !== b.overdue) {
            return a.overdue ? -1 : 1;
          }
          return b.outstandingAmount - a.outstandingAmount;
        }),
    [customerOrders, restrictedCustomerNames]
  );
  const restrictedCustomerSummary = restrictedCustomerProfiles.slice(0, 3);
  const overdueCustomerCount = restrictedCustomerProfiles.filter((item) => item.overdue).length;
  const overLimitCustomerCount = restrictedCustomerProfiles.filter((item) => item.overLimit).length;
  const dunningList = restrictedCustomerProfiles.slice(0, 5);
  const dueFollowUpList = useMemo(() => {
    const now = new Date('2026-05-09T12:00:00');
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    return customerOrders
      .map((order) => {
        const remainingAmount = Math.max(0, (order.orderAmount || 0) - (order.paidAmount || 0) - (order.writeOffAmount || 0));
        const nextDunningAt = order.nextDunningAt;
        const nextFollowUp = nextDunningAt ? new Date(nextDunningAt.replace(/-/g, '/')) : null;
        if (!nextDunningAt || !nextFollowUp || Number.isNaN(nextFollowUp.getTime()) || remainingAmount <= 0) {
          return null;
        }

        const dueType =
          nextFollowUp.getTime() < now.getTime()
            ? ('overdue' as const)
            : nextFollowUp.getTime() <= endOfToday.getTime()
              ? ('today' as const)
              : null;

        if (!dueType) {
          return null;
        }

        return {
          customerName: order.customerName,
          orderNo: order.orderNo,
          nextDunningAt,
          dunningStatus: order.dunningStatus || 'pending',
          dueType,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        if (a.dueType !== b.dueType) {
          return a.dueType === 'overdue' ? -1 : 1;
        }
        return a.nextDunningAt.localeCompare(b.nextDunningAt);
      })
      .slice(0, 4);
  }, [customerOrders]);
  const dueTodayFollowUpCount = dueFollowUpList.filter((item) => item.dueType === 'today').length;
  const overdueFollowUpCount = dueFollowUpList.filter((item) => item.dueType === 'overdue').length;
  const creditRiskTrend = useMemo(() => {
    const monthMap = new Map<string, { month: string; overLimitCount: number; overdueCount: number }>();

    customerOrders.forEach((order) => {
      const month = (order.orderDate || order.createdAt || '').slice(0, 7) || '未标记';
      const current = monthMap.get(month) || { month, overLimitCount: 0, overdueCount: 0 };
      const creditControl = getCustomerOrderCreditControl(order, customerOrders);

      if (creditControl.overLimit) {
        current.overLimitCount += 1;
      }
      if (creditControl.overdue) {
        current.overdueCount += 1;
      }

      monthMap.set(month, current);
    });

    return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [customerOrders]);
  const exceptionOverview = [
    { label: '在途流转', count: activeExceptions.filter((item) => item.businessType === '在途流转').length, businessType: '在途流转' as const },
    { label: '分选', count: activeExceptions.filter((item) => item.businessType === '分选').length, businessType: '分选' as const },
    { label: '封包', count: activeExceptions.filter((item) => item.businessType === '封包').length, businessType: '封包' as const },
    { label: '扫码交接', count: activeExceptions.filter((item) => item.businessType === '扫码交接').length, businessType: '扫码交接' as const },
  ];

  return (
    <div className="w-full min-w-0 overflow-hidden space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]"
      >
        <Card className="border-0 bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#111827] text-white shadow-lg">
          <CardContent className="flex h-full flex-col justify-between gap-6 p-8">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#d6b36c]">布局主轴</p>
              <h2 className="mt-3 text-3xl font-bold">先用统一导航骨架承载全部模块，再逐步补细分内容</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300">
                当前已经切换为左侧主导航统一承载菜单，后续新增采购、在途流转、分选、细筛、封包、出货等页面时，只需要继续扩展左侧结构，不必再在顶部或内容区重复放导航入口。
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="flex h-full flex-col justify-between p-8">
            <div>
              <p className="text-sm text-gray-500">本期重点</p>
              <h3 className="mt-2 text-2xl font-bold text-[#1a1a1a]">先稳住结构，再继续扩模块</h3>
            </div>
            <div className="mt-6 space-y-4 text-sm text-gray-500">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="font-medium text-[#1a1a1a]">1. 左侧导航固定主入口</p>
                <p className="mt-1">避免顶部菜单越加越挤，新增模块也有清晰位置。</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="font-medium text-[#1a1a1a]">2. 页面标题只负责内容说明</p>
                <p className="mt-1">导航入口集中在左侧，页面本身只展示本模块的说明和操作。</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="font-medium text-[#1a1a1a]">3. 页面只负责内容本身</p>
                <p className="mt-1">后续不再让每个页面单独维护一套总导航。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <div className="min-w-0">
        {/* 统计卡片 */}
        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <motion.div
              key={card.title}
              className="stat-card"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                      <p className="text-3xl font-bold text-[#1a1a1a]">{card.value}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl ${card.bgColor} flex items-center justify-center`}>
                      <card.icon className={`w-7 h-7 ${card.textColor}`} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className={`h-1 flex-1 rounded-full bg-gradient-to-r ${card.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* 检验趋势图 */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-[#c9a962]" />
                  今日检验趋势
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c9a962" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#c9a962" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#c9a962"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        name="检验数量"
                      />
                      <Area
                        type="monotone"
                        dataKey="passed"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPassed)"
                        name="合格数量"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 今日概览 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 shadow-lg h-full">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-[#c9a962]" />
                  今日概览
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#c9a962]/10 to-transparent rounded-xl">
                    <div>
                      <p className="text-sm text-gray-500">今日检验总量</p>
                      <p className="text-2xl font-bold text-[#1a1a1a]">{stats.todayInspectCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#c9a962]/20 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-[#c9a962]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-xl">
                    <div>
                      <p className="text-sm text-gray-500">合格率</p>
                      <p className="text-2xl font-bold text-[#1a1a1a]">{stats.todayPassRate}%</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-transparent rounded-xl">
                    <div>
                      <p className="text-sm text-gray-500">平均检验时间</p>
                      <p className="text-2xl font-bold text-[#1a1a1a]">12.5分钟</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.25fr]"
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center justify-between gap-3 text-lg">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  信用风险总览
                </span>
                <Button variant="outline" size="sm" className="gap-2" onClick={onOpenFinance}>
                  查看财务台账
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-700">当前受限客户</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{restrictedCustomerNames.length}</p>
                <p className="mt-2 text-sm text-slate-600">超额度或存在逾期未结订单的客户会在这里集中提醒。</p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm text-rose-700">超额度客户</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{overLimitCustomerCount}</p>
                  <p className="mt-1 text-xs text-slate-500">客户未结应收已超过信用额度</p>
                </div>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm text-orange-700">逾期客户</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{overdueCustomerCount}</p>
                  <p className="mt-1 text-xs text-slate-500">存在 16 天及以上未结订单</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">风险趋势</p>
                    <p className="mt-1 text-xs text-slate-500">按订单月份聚合超额度与逾期风险数量</p>
                  </div>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={creditRiskTrend}>
                      <defs>
                        <linearGradient id="colorOverLimit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="overLimitCount"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorOverLimit)"
                        name="超额度"
                      />
                      <Area
                        type="monotone"
                        dataKey="overdueCount"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorOverdue)"
                        name="逾期"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {restrictedCustomerSummary.map((item) => (
                  <button
                    key={item.customerName}
                    type="button"
                    onClick={() => onOpenOrders(item.customerName)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-amber-200 hover:bg-amber-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.customerName}</p>
                        <p className="mt-1 text-sm text-slate-500">未结应收 {item.outstandingAmount.toLocaleString()} 元</p>
                      </div>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                        {item.creditLimit > 0 ? `额度 ${item.creditLimit.toLocaleString()} 元` : '未设额度'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{item.reason}</p>
                  </button>
                ))}
                {restrictedCustomerSummary.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    当前没有触发信用限制的客户，可继续从订单和财务台账跟进回款情况。
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2" onClick={() => onOpenOrders()}>
                  查看客户订单
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button className="gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={onOpenFinance}>
                  进入财务台账
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center justify-between gap-3 text-lg">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  全局异常待办
                </span>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => onOpenExceptions('', 'pending')}>
                  查看全部
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {exceptionOverview.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onOpenExceptions('', 'pending', item.businessType)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-red-200 hover:bg-red-50"
                  >
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{item.count}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center justify-between gap-3 text-lg">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#c9a962]" />
                  待催收列表
                </span>
                <Button variant="outline" size="sm" className="gap-2" onClick={onOpenFinance}>
                  去财务跟进
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {dueFollowUpList.length > 0 && (
                  <div className="border-b border-gray-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        今日到期 {dueTodayFollowUpCount}
                      </span>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                        已到期 {overdueFollowUpCount}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {dueFollowUpList.map((item) => (
                        <button
                          key={`${item.orderNo}-${item.nextDunningAt}`}
                          type="button"
                          onClick={onOpenFinance}
                          className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left transition-colors hover:bg-amber-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{item.customerName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.orderNo} / 下次跟进 {item.nextDunningAt.slice(0, 16)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              item.dueType === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.dueType === 'overdue' ? '已到期' : '今日到期'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {dunningList.map((item) => (
                  <button
                    key={item.customerName}
                    type="button"
                    onClick={() => onOpenOrders(item.customerName)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-amber-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{item.customerName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        未结应收 {item.outstandingAmount.toLocaleString()} 元
                        {item.creditLimit > 0 ? ` / 额度 ${item.creditLimit.toLocaleString()} 元` : ' / 未设额度'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.overdue ? `逾期 ${item.maxAgingDays} 天优先催收` : '额度超限，建议先沟通回款'}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white bg-[#1f2937]">
                      {item.overdue ? '逾期' : '超额'}
                    </div>
                  </button>
                ))}
                {dunningList.length === 0 && (
                  <div className="p-6 text-sm text-slate-500">当前没有需要优先催收的客户。</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-[#c9a962]" />
                异常待办清单
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {activeExceptions.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.businessType} / {item.relatedNo} / 责任人：{item.owner}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onOpenExceptions(item.caseNo, 'all')}>
                      查看
                    </Button>
                  </div>
                ))}
                {activeExceptions.length === 0 && (
                  <div className="p-6 text-sm text-slate-500">当前没有待处理异常，业务链路运行正常。</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 实时活动日志 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-[#c9a962]" />
                实时活动日志
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {activityLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#c9a962]/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-[#c9a962]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1a1a1a]">{log.action}</p>
                        <p className="text-sm text-gray-500">{log.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#1a1a1a]">{log.time}</p>
                      <p className="text-xs text-gray-500">{log.user}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
