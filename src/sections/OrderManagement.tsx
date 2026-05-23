import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, CircleDollarSign, Package2, Plus, Search, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useStore } from '@/hooks/useStore';
import type { CreateCustomerOrderInput, CustomerOrder } from '@/types';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { getCustomerOrderCreditControl } from '@/utils/orderFinance';

const statusConfig: Record<CustomerOrder['status'], { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed: { label: '已确认', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  matching: { label: '配货中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  partially_matched: { label: '部分匹配', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  ready_to_ship: { label: '待出货', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  shipped: { label: '已出货', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  signed: { label: '已签收', className: 'bg-green-100 text-green-700 border-green-200' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  voided: { label: '已作废', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  exception: { label: '异常', className: 'bg-red-100 text-red-700 border-red-200' },
};

const priorityLabelMap: Record<CustomerOrder['priorityLevel'], string> = {
  normal: '常规',
  urgent: '加急',
  vip: 'VIP',
};

const initialForm: CreateCustomerOrderInput = {
  customerName: '',
  orderSource: '老客户复购',
  orderDate: new Date().toLocaleDateString('sv-SE'),
  salesName: '',
  requiredStoneCategory: '小厘石',
  requiredQuality: '',
  requiredWeight: 0,
  requiredStoneCount: undefined,
  packageRequirement: '',
  shipmentRequirement: '',
  signoffRequirement: '',
  requestedDeliveryDate: '',
  priorityLevel: 'normal',
  customerContact: '',
  customerContactPhone: '',
  settlementMode: '月结',
  orderAmount: undefined,
  remark: '',
};

interface OrderManagementProps {
  initialSearchTerm?: string;
}

export default function OrderManagement({ initialSearchTerm = '' }: OrderManagementProps) {
  const customerOrders = useStore((state) => state.customerOrders);
  const inventory = useStore((state) => state.inventory);
  const createCustomerOrder = useStore((state) => state.createCustomerOrder);
  const matchInventoryToCustomerOrder = useStore((state) => state.matchInventoryToCustomerOrder);
  const createShipmentForCustomerOrder = useStore((state) => state.createShipmentForCustomerOrder);
  const confirmCustomerOrderFinance = useStore((state) => state.confirmCustomerOrderFinance);
  const archiveCustomerOrder = useStore((state) => state.archiveCustomerOrder);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerOrder['status'] | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [form, setForm] = useState<CreateCustomerOrderInput>(initialForm);
  const existingCustomerOrder = useMemo(
    () =>
      customerOrders.find(
        (item) => item.customerName.trim().toLowerCase() === form.customerName.trim().toLowerCase()
      ),
    [customerOrders, form.customerName]
  );
  const createOrderRiskPreview = useMemo(() => {
    if (!existingCustomerOrder) {
      return null;
    }

    const projectedOrder: CustomerOrder = {
      id: 'draft-credit-preview',
      orderNo: 'DRAFT-PREVIEW',
      customerName: form.customerName.trim(),
      orderSource: form.orderSource,
      orderDate: form.orderDate,
      salesName: form.salesName || existingCustomerOrder.salesName,
      requiredStoneCategory: form.requiredStoneCategory,
      requiredQuality: form.requiredQuality || undefined,
      requiredWeight: form.requiredWeight || 0,
      requiredStoneCount: form.requiredStoneCount,
      packageRequirement: form.packageRequirement || undefined,
      shipmentRequirement: form.shipmentRequirement || undefined,
      signoffRequirement: form.signoffRequirement || undefined,
      requestedDeliveryDate: form.requestedDeliveryDate || undefined,
      priorityLevel: form.priorityLevel,
      matchedPackageNos: [],
      matchedInventoryWeight: 0,
      customerContact: form.customerContact || existingCustomerOrder.customerContact,
      customerContactPhone: form.customerContactPhone || existingCustomerOrder.customerContactPhone,
      customerCreditLimit: existingCustomerOrder.customerCreditLimit,
      settlementMode: form.settlementMode || existingCustomerOrder.settlementMode,
      orderAmount: form.orderAmount || 0,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      status: 'draft',
    };

    return getCustomerOrderCreditControl(projectedOrder, [...customerOrders, projectedOrder]);
  }, [customerOrders, existingCustomerOrder, form]);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const filteredOrders = useMemo(
    () =>
      customerOrders.filter((order) => {
        const keyword = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !keyword ||
          order.orderNo.toLowerCase().includes(keyword) ||
          order.customerName.toLowerCase().includes(keyword) ||
          order.salesName.toLowerCase().includes(keyword);
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [customerOrders, searchTerm, statusFilter]
  );

  const handleCreate = () => {
    const result = createCustomerOrder(form);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setShowCreateDialog(false);
    setForm(initialForm);
  };

  const availableInventoryCount = inventory.filter((item) => item.status === 'passed' && !item.reservedForOrderNo).length;
  const restrictedOrderCount = customerOrders.filter((order) => getCustomerOrderCreditControl(order, customerOrders).isRestricted).length;

  const handleMatchInventory = (orderId: string) => {
    const result = matchInventoryToCustomerOrder(orderId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
  };

  const handleCreateShipment = (orderId: string) => {
    const result = createShipmentForCustomerOrder(orderId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
  };

  const handleFinanceConfirm = (orderId: string) => {
    const result = confirmCustomerOrderFinance(orderId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
  };

  const handleArchive = (orderId: string) => {
    const result = archiveCustomerOrder(orderId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
  };

  return (
    <PageSectionLayout
      title="客户订单管理"
      description="以客户订单作为正式销售源头，统一管理客户需求、配货优先级、包装要求和出货前状态，替代旧演示订单入口。"
      actions={
        <Button className="gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          新建客户订单
        </Button>
      }
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            订单总数 {customerOrders.length}
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            配货中 {customerOrders.filter((item) => item.status === 'matching' || item.status === 'partially_matched').length}
          </Badge>
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
            待出货 {customerOrders.filter((item) => item.status === 'ready_to_ship').length}
          </Badge>
          <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
            可用库存 {availableInventoryCount} 包
          </Badge>
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
            信用受限 {restrictedOrderCount} 单
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已签收 {customerOrders.filter((item) => item.status === 'signed' || item.status === 'completed').length}
          </Badge>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            已归档 {customerOrders.filter((item) => item.archived).length}
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部订单', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        { key: 'confirmed', label: '已确认', active: statusFilter === 'confirmed', onClick: () => setStatusFilter('confirmed') },
        { key: 'matching', label: '配货中', active: statusFilter === 'matching', onClick: () => setStatusFilter('matching') },
        { key: 'ready_to_ship', label: '待出货', active: statusFilter === 'ready_to_ship', onClick: () => setStatusFilter('ready_to_ship') },
        { key: 'completed', label: '已完成', active: statusFilter === 'completed', onClick: () => setStatusFilter('completed') },
      ]}
    >
      <div className="space-y-6">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索订单号、客户名称、业务员..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'confirmed', 'matching', 'ready_to_ship', 'completed'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]' : ''}
                  >
                    {status === 'all' ? '全部' : statusConfig[status].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {(() => {
                const creditControl = getCustomerOrderCreditControl(order, customerOrders);
                return (
              <Card className="h-full border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{order.orderNo}</CardTitle>
                      <p className="mt-2 text-sm text-gray-500">{order.customerName}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant="outline" className={statusConfig[order.status].className}>
                        {statusConfig[order.status].label}
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {priorityLabelMap[order.priorityLevel]}
                      </Badge>
                      {creditControl.isRestricted && (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                          信用受限
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">需求石种</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{order.requiredStoneCategory}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">需求重量</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{order.requiredWeight} ct</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <span>业务负责人：{order.salesName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      <span>要求交期：{order.requestedDeliveryDate || '未指定'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package2 className="h-4 w-4 text-slate-400" />
                      <span>已匹配封包：{order.matchedPackageNos.length ? order.matchedPackageNos.join('，') : '待匹配'}</span>
                    </div>
                    {order.latestShipmentNo && (
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4 text-slate-400" />
                        <span>最新出货单：{order.latestShipmentNo}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-slate-400" />
                      <span>结算方式：{order.settlementMode || '未填写'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-slate-400" />
                      <span>
                        信用额度：{order.customerCreditLimit ? `${order.customerCreditLimit.toLocaleString()} 元` : '未设置'} / 客户未结：
                        {creditControl.customerOutstandingAmount.toLocaleString()} 元
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={order.receiptConfirmed ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>
                      {order.receiptConfirmed ? '回单已确认' : '待回单确认'}
                    </Badge>
                    <Badge variant="outline" className={order.financeConfirmed ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>
                      {order.financeConfirmed ? '财务已确认' : '待财务确认'}
                    </Badge>
                    <Badge variant="outline" className={order.archived ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>
                      {order.archived ? '已归档' : '待归档'}
                    </Badge>
                  </div>

                  {creditControl.isRestricted && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        当前客户已触发信用限制
                      </div>
                      <p className="mt-2">{creditControl.reason}</p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-500">订单要求</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {order.shipmentRequirement || order.packageRequirement || order.remark || '当前订单已创建，可继续联动配货、封包与出货规则。'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-500">创建时间：{order.createdAt}</div>
                    <div className="flex flex-wrap gap-2">
                      {(order.status === 'confirmed' || order.status === 'matching' || order.status === 'partially_matched') && (
                        <Button variant="outline" size="sm" disabled={creditControl.isRestricted} onClick={() => handleMatchInventory(order.id)}>
                          自动匹配库存
                        </Button>
                      )}
                      {order.matchedPackageNos.length > 0 && !order.latestShipmentNo && (
                        <Button
                          size="sm"
                          disabled={creditControl.isRestricted}
                          className="bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]"
                          onClick={() => handleCreateShipment(order.id)}
                        >
                          生成出货准备
                        </Button>
                      )}
                      {order.status === 'completed' && order.receiptConfirmed && !order.financeConfirmed && (
                        <Button variant="outline" size="sm" onClick={() => handleFinanceConfirm(order.id)}>
                          财务确认
                        </Button>
                      )}
                      {order.status === 'completed' && order.receiptConfirmed && order.financeConfirmed && !order.archived && (
                        <Button variant="outline" size="sm" onClick={() => handleArchive(order.id)}>
                          订单归档
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                        查看详情
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
                );
              })()}
            </motion.div>
          ))}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新建客户订单</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">客户名称</p>
              <Input value={form.customerName} onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">业务员</p>
              <Input value={form.salesName} onChange={(e) => setForm((prev) => ({ ...prev, salesName: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">订单来源</p>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.orderSource}
                onChange={(e) => setForm((prev) => ({ ...prev, orderSource: e.target.value as CustomerOrder['orderSource'] }))}
              >
                <option value="老客户复购">老客户复购</option>
                <option value="业务报价">业务报价</option>
                <option value="现货匹配">现货匹配</option>
                <option value="渠道转单">渠道转单</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">订单日期</p>
              <Input type="date" value={form.orderDate} onChange={(e) => setForm((prev) => ({ ...prev, orderDate: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">需求石种</p>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.requiredStoneCategory}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, requiredStoneCategory: e.target.value as CustomerOrder['requiredStoneCategory'] }))
                }
              >
                <option value="小厘石">小厘石</option>
                <option value="小份石">小份石</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">优先级</p>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.priorityLevel}
                onChange={(e) => setForm((prev) => ({ ...prev, priorityLevel: e.target.value as CustomerOrder['priorityLevel'] }))}
              >
                <option value="normal">常规</option>
                <option value="urgent">加急</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">需求重量(ct)</p>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.requiredWeight || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, requiredWeight: Number(e.target.value) }))}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">需求粒数</p>
              <Input
                type="number"
                min="0"
                value={form.requiredStoneCount || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, requiredStoneCount: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">客户联系人</p>
              <Input value={form.customerContact || ''} onChange={(e) => setForm((prev) => ({ ...prev, customerContact: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">联系电话</p>
              <Input value={form.customerContactPhone || ''} onChange={(e) => setForm((prev) => ({ ...prev, customerContactPhone: e.target.value }))} />
            </div>
            {existingCustomerOrder && (
              <div className="md:col-span-2">
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    createOrderRiskPreview?.isRestricted
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-blue-200 bg-blue-50 text-blue-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    已识别历史客户：{existingCustomerOrder.customerName}
                  </div>
                  <p className="mt-2">
                    当前客户未结应收 {createOrderRiskPreview?.customerOutstandingAmount.toLocaleString() || 0} 元，
                    信用额度 {existingCustomerOrder.customerCreditLimit ? `${existingCustomerOrder.customerCreditLimit.toLocaleString()} 元` : '未设置'}。
                  </p>
                  <p className="mt-2">
                    {createOrderRiskPreview?.isRestricted
                      ? `按当前录入金额预估，建单后会触发信用限制：${createOrderRiskPreview.reason}`
                      : '当前未触发信用限制，可继续建单。'}
                  </p>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">包装要求 / 出货说明</p>
              <Textarea
                rows={4}
                value={form.shipmentRequirement || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shipmentRequirement: e.target.value,
                    packageRequirement: prev.packageRequirement || '按客户订单要求封包',
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button className="bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={handleCreate}>
              创建订单
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>客户订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">订单号</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedOrder.orderNo}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">客户名称</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedOrder.customerName}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">订单状态</p>
                  <div className="mt-2">
                    <Badge variant="outline" className={statusConfig[selectedOrder.status].className}>
                      {statusConfig[selectedOrder.status].label}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">已匹配重量</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedOrder.matchedInventoryWeight} ct</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">匹配与出货</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  已匹配库存包：{selectedOrder.matchedPackageNos.length ? selectedOrder.matchedPackageNos.join('，') : '待匹配'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  最新出货单：{selectedOrder.latestShipmentNo || '尚未生成'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">后置管理</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  回单确认：{selectedOrder.receiptConfirmed ? `${selectedOrder.receiptConfirmedBy || '系统'} / ${selectedOrder.receiptConfirmedAt}` : '待确认'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  财务确认：{selectedOrder.financeConfirmed ? `${selectedOrder.financeConfirmedBy || '系统'} / ${selectedOrder.financeConfirmedAt}` : '待确认'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  信用限制：{getCustomerOrderCreditControl(selectedOrder, customerOrders).isRestricted ? getCustomerOrderCreditControl(selectedOrder, customerOrders).reason : '正常'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  归档状态：{selectedOrder.archived ? `${selectedOrder.archivedBy || '系统'} / ${selectedOrder.archivedAt}` : '待归档'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700">备注与要求</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedOrder.remark || selectedOrder.shipmentRequirement || selectedOrder.packageRequirement || '暂无补充说明'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
