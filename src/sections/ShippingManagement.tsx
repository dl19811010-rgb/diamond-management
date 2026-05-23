import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BadgeCheck, CalendarClock, PackageCheck, Search, ShieldCheck, Truck, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { useStore } from '@/hooks/useStore';
import type { ShipmentTask } from '@/types';
import { toast } from 'sonner';
import { getCustomerOrderCreditControl } from '@/utils/orderFinance';

interface ShippingManagementProps {
  initialSearchTerm?: string;
  onOpenExceptionCase?: (searchTerm?: string, statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed') => void;
  onOpenHandoverRecord?: (searchTerm: string) => void;
}

const shipmentStatusConfig: Record<ShipmentTask['status'], { label: string; className: string }> = {
  pending_review: { label: '待复核', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  ready_to_ship: { label: '待出货', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  shipped: { label: '已出货', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  signed: { label: '已签收', className: 'bg-green-100 text-green-700 border-green-200' },
  delayed: { label: '已延误', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  exception: { label: '异常', className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function ShippingManagement({ initialSearchTerm = '', onOpenExceptionCase, onOpenHandoverRecord }: ShippingManagementProps) {
  const shipmentTasks = useStore((state) => state.shipmentTasks);
  const customerOrders = useStore((state) => state.customerOrders);
  const handoverRecords = useStore((state) => state.handoverRecords);
  const exceptionCases = useStore((state) => state.exceptionCases);
  const advanceShipmentTask = useStore((state) => state.advanceShipmentTask);
  const confirmShipmentReceipt = useStore((state) => state.confirmShipmentReceipt);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<ShipmentTask['status'] | 'all'>('all');

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const filteredTasks = useMemo(
    () =>
      shipmentTasks.filter((task) => {
        const matchesSearch =
          task.shipmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.packageNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.sourceOrderNo?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [shipmentTasks, searchTerm, statusFilter]
  );

  const readyCount = filteredTasks.filter((task) => task.status === 'ready_to_ship').length;
  const shippedCount = filteredTasks.filter((task) => task.status === 'shipped').length;
  const signedCount = filteredTasks.filter((task) => task.status === 'signed').length;
  const pendingReviewCount = filteredTasks.filter((task) => task.status === 'pending_review').length;
  const directMatchCount = filteredTasks.filter((task) => task.dispatchSource === 'inventory_match').length;
  const receiptConfirmedCount = filteredTasks.filter((task) => task.receiptConfirmed).length;
  const activeExceptions = exceptionCases.filter((item) => item.status !== 'closed');
  const restrictedShipmentCount = filteredTasks.filter((task) => {
    const relatedOrder = customerOrders.find((item) => item.orderNo === task.sourceOrderNo);
    return relatedOrder ? getCustomerOrderCreditControl(relatedOrder, customerOrders).isRestricted : false;
  }).length;

  return (
    <PageSectionLayout
      title="出货管理"
      description="管理客户出货复核、物流信息和客户签收状态，把封包后的交付链真正闭合起来。"
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            待出货 {readyCount} 单
          </Badge>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            待复核 {pendingReviewCount} 单
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            已出货 {shippedCount} 单
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已签收 {signedCount} 单
          </Badge>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            回单已确认 {receiptConfirmedCount} 单
          </Badge>
          <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
            库存直配 {directMatchCount} 单
          </Badge>
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
            信用受限 {restrictedShipmentCount} 单
          </Badge>
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
            挂单异常 {activeExceptions.filter((item) => item.businessType === '出货' || item.businessType === '扫码交接').length} 条
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部出货', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        { key: 'pending_review', label: '待复核', active: statusFilter === 'pending_review', onClick: () => setStatusFilter('pending_review') },
        { key: 'ready_to_ship', label: '待出货', active: statusFilter === 'ready_to_ship', onClick: () => setStatusFilter('ready_to_ship') },
        { key: 'shipped', label: '已出货', active: statusFilter === 'shipped', onClick: () => setStatusFilter('shipped') },
        { key: 'signed', label: '已签收', active: statusFilter === 'signed', onClick: () => setStatusFilter('signed') },
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
                  placeholder="搜索出货单号、客户名称、封包号..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending_review', 'ready_to_ship', 'shipped', 'signed'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]' : ''}
                  >
                    {status === 'all' ? '全部' : shipmentStatusConfig[status].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredTasks.map((task, index) => (
            (() => {
              const relatedHandoverNos = handoverRecords
                .filter((record) => record.businessType === '出货签收' && record.relatedNo === task.shipmentNo)
                .map((record) => record.handoverNo);
              const relatedOrder = customerOrders.find((item) => item.orderNo === task.sourceOrderNo);
              const creditControl = relatedOrder ? getCustomerOrderCreditControl(relatedOrder, customerOrders) : null;
              const relatedExceptions = activeExceptions.filter(
                (item) =>
                  (item.businessType === '出货' && item.relatedNo === task.shipmentNo) ||
                  (item.businessType === '扫码交接' && relatedHandoverNos.includes(item.relatedNo))
              );

              return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{task.shipmentNo}</CardTitle>
                      <p className="mt-2 text-sm text-gray-500">
                        客户：{task.customerName}
                        {task.sourceOrderNo ? ` / 来源订单：${task.sourceOrderNo}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={shipmentStatusConfig[task.status].className}>
                        {shipmentStatusConfig[task.status].label}
                      </Badge>
                      {task.dispatchSource === 'inventory_match' && (
                        <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                          库存直配
                        </Badge>
                      )}
                      {creditControl?.isRestricted && (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                          信用受限
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">关联封包</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{task.packageNos?.join('，') || task.packageNo}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">物流商</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{task.logisticProvider || '待安排'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">包数 / 物流单号</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{task.packageCount || 1} 包 / {task.logisticNo || '待生成'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      <span>复核人：{task.reviewedBy}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <span>出货人：{task.shippedBy || '待安排'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-slate-400" />
                      <span>计划出货：{task.plannedShipDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-slate-400" />
                      <span>重量 / 粒数：{task.netWeight.toFixed(2)} ct / {task.stoneCount.toLocaleString()} 粒</span>
                    </div>
                  </div>

                  {creditControl?.isRestricted && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        当前客户受信用限制，出货动作受控
                      </div>
                      <p className="mt-2">{creditControl.reason}</p>
                    </div>
                  )}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500">出货要求</p>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{task.shippingRequirement}</p>
                    {(task.shippedDate || task.signedDate) && (
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                        {task.shippedDate && <span>出货时间：{task.shippedDate}</span>}
                        {task.signedDate && (
                          <span className="flex items-center gap-1 text-green-600">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            签收时间：{task.signedDate}
                          </span>
                        )}
                        {task.receiptConfirmedAt && <span>回单确认：{task.receiptConfirmedBy || '系统'} / {task.receiptConfirmedAt}</span>}
                      </div>
                    )}
                  </div>
                  {relatedExceptions.length > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        当前挂有 {relatedExceptions.length} 条出货相关异常
                      </div>
                      <p className="mt-2">{relatedExceptions[0].title}，最新动作：{relatedExceptions[0].latestAction}</p>
                      {onOpenExceptionCase && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => onOpenExceptionCase(relatedExceptions[0].caseNo, 'all')}>
                          查看对应异常
                        </Button>
                      )}
                    </div>
                  )}
                  {relatedHandoverNos[0] && onOpenHandoverRecord && (
                    <Button variant="outline" size="sm" onClick={() => onOpenHandoverRecord(relatedHandoverNos[0])}>
                      查看交接单
                    </Button>
                  )}
                  {(task.status === 'pending_review' || task.status === 'ready_to_ship') && (
                    <Button
                      size="sm"
                      disabled={task.status === 'ready_to_ship' && Boolean(creditControl?.isRestricted)}
                      className="bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]"
                      onClick={() => {
                        const result = advanceShipmentTask(task.id);
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }

                        toast.success(result.message);
                      }}
                    >
                      {task.status === 'pending_review' ? '完成出货复核' : creditControl?.isRestricted ? '信用受限' : '确认已发货'}
                    </Button>
                  )}
                  {task.status === 'signed' && !task.receiptConfirmed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const result = confirmShipmentReceipt(task.id);
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }

                        toast.success(result.message);
                      }}
                    >
                      确认回单
                    </Button>
                  )}
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
