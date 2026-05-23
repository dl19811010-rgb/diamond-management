import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock3, MapPinned, Search, ShieldAlert, Truck, UserRoundCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { useStore } from '@/hooks/useStore';
import type { TransitRecord } from '@/types';

interface TransitManagementProps {
  initialSearchTerm?: string;
  onOpenExceptionCase?: (searchTerm?: string, statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed') => void;
  onOpenHandoverRecord?: (searchTerm: string) => void;
  onOpenReceiptRecord?: (searchTerm: string) => void;
}

const transitStatusConfig: Record<TransitRecord['status'], { label: string; className: string }> = {
  pending_departure: { label: '待发运', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_transit: { label: '运输中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  arrived: { label: '已到达', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  signed: { label: '已签收', className: 'bg-green-100 text-green-700 border-green-200' },
  delayed: { label: '已延误', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  exception: { label: '异常', className: 'bg-red-100 text-red-700 border-red-200' },
};

const riskBadgeConfig: Record<TransitRecord['riskLevel'], string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-red-100 text-red-700 border-red-200',
};

export default function TransitManagement({
  initialSearchTerm = '',
  onOpenExceptionCase,
  onOpenHandoverRecord,
  onOpenReceiptRecord,
}: TransitManagementProps) {
  const transitRecords = useStore((state) => state.transitRecords);
  const handoverRecords = useStore((state) => state.handoverRecords);
  const exceptionCases = useStore((state) => state.exceptionCases);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [routeFilter, setRouteFilter] = useState<TransitRecord['route'] | 'all'>('all');

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const filteredRecords = useMemo(
    () =>
      transitRecords.filter((record) => {
        const matchesSearch =
          record.transitNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.relatedPurchaseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.carrier.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRoute = routeFilter === 'all' || record.route === routeFilter;
        return matchesSearch && matchesRoute;
      }),
    [transitRecords, searchTerm, routeFilter]
  );

  const inTransitCount = filteredRecords.filter((item) => item.status === 'in_transit').length;
  const signedCount = filteredRecords.filter((item) => item.status === 'signed').length;
  const highRiskCount = filteredRecords.filter((item) => item.riskLevel === 'high' || item.status === 'exception').length;
  const activeExceptions = exceptionCases.filter((item) => item.businessType === '在途流转' && item.status !== 'closed');

  return (
    <PageSectionLayout
      title="在途流转"
      description="跟踪印度到香港、香港到深圳的在途批次和交接状态，先把路线、承运、签收、风险和备注统一纳入同一视图。"
      stats={
        <>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            运输中 {inTransitCount} 单
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已签收 {signedCount} 单
          </Badge>
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            高风险 {highRiskCount} 单
          </Badge>
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
            挂单异常 {activeExceptions.length} 条
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部路线', active: routeFilter === 'all', onClick: () => setRouteFilter('all') },
        { key: 'india_to_hk', label: '印度 → 香港', active: routeFilter === 'india_to_hk', onClick: () => setRouteFilter('india_to_hk') },
        { key: 'hk_to_sz', label: '香港 → 深圳', active: routeFilter === 'hk_to_sz', onClick: () => setRouteFilter('hk_to_sz') },
      ]}
    >
      <div className="space-y-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索流转单号、采购批次号、承运人..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'india_to_hk', 'hk_to_sz'] as const).map((route) => (
                  <Button
                    key={route}
                    variant={routeFilter === route ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRouteFilter(route)}
                    className={routeFilter === route ? 'bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]' : ''}
                  >
                    {route === 'all' ? '全部' : route === 'india_to_hk' ? '印度 → 香港' : '香港 → 深圳'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredRecords.map((record, index) => (
            (() => {
              const relatedExceptions = activeExceptions.filter((item) => item.relatedNo === record.transitNo);
              const relatedHandover = handoverRecords.find((item) => item.relatedNo === record.transitNo);

              return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{record.transitNo}</h3>
                        <Badge variant="outline" className={transitStatusConfig[record.status].className}>
                          {transitStatusConfig[record.status].label}
                        </Badge>
                        <Badge variant="outline" className={riskBadgeConfig[record.riskLevel]}>
                          风险：{record.riskLevel === 'low' ? '低' : record.riskLevel === 'medium' ? '中' : '高'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-4 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-slate-400" />
                          <span>承运：{record.carrier}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-slate-400" />
                          <span>{record.fromLocation} → {record.toLocation}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          <span>预计到达：{record.expectedArrivalTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserRoundCheck className="h-4 w-4 text-slate-400" />
                          <span>交接人：{record.handoverBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-slate-400" />
                          <span>关联采购：{record.relatedPurchaseNo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-slate-400" />
                          <span>批次数：{record.batchCount} 批 / {record.expectedWeight} ct</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 xl:min-w-[260px]">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">发运时间</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{record.departureTime}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">签收状态</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{record.receivedBy || '待签收'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">流转备注</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {record.notes || `当前路线为 ${record.route === 'india_to_hk' ? '印度 → 香港' : '香港 → 深圳'}，可继续接扫码交接与签收留痕。`}
                    </p>
                  </div>
                  {relatedExceptions.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        已挂异常 {relatedExceptions.length} 条
                      </div>
                      <p className="mt-2 text-sm text-red-700">{relatedExceptions[0].title}，最新动作：{relatedExceptions[0].latestAction}</p>
                      {onOpenExceptionCase && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => onOpenExceptionCase(relatedExceptions[0].caseNo, 'all')}>
                          查看对应异常
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {relatedHandover && onOpenHandoverRecord && (
                      <Button variant="outline" size="sm" onClick={() => onOpenHandoverRecord(relatedHandover.handoverNo)}>
                        查看交接单
                      </Button>
                    )}
                    {onOpenReceiptRecord && (
                      <Button variant="outline" size="sm" onClick={() => onOpenReceiptRecord(record.transitNo)}>
                        去收货管理
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
              );
            })()
          ))}
        </div>
      </div>
    </PageSectionLayout>
  );
}
