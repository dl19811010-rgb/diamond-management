import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, Package2, Plus, Search, ShoppingCart, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { useStore } from '@/hooks/useStore';
import type { CreatePurchaseBatchInput, PurchaseBatch } from '@/types';

interface PurchaseManagementProps {
  onOpenExceptionCase?: (searchTerm?: string, statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed') => void;
}

const statusConfig: Record<PurchaseBatch['status'], { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed: { label: '已确认', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  shipping: { label: '已发运', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_transit_to_hk: { label: '在途去港', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  arrived_hk: { label: '香港到仓', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  transferred_sz: { label: '转运深圳中', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  arrived_sz: { label: '深圳到仓', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  received: { label: '已收货', className: 'bg-green-100 text-green-700 border-green-200' },
  in_processing: { label: '加工处理中', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  voided: { label: '已作废', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  exception: { label: '异常', className: 'bg-red-100 text-red-700 border-red-200' },
};

const initialForm: CreatePurchaseBatchInput = {
  supplier: '',
  stoneCategory: '小厘石',
  roughType: '小厘石',
  expectedWeight: 0,
  expectedStoneCount: 0,
  purchaseDate: new Date().toLocaleDateString('sv-SE'),
  expectedArrivalDate: '',
  origin: '印度苏拉特',
  destination: '香港中转仓',
  buyer: '',
  qualityRequirement: '',
  plannedDepartureDate: '',
  plannedFromSite: '印度采购地',
  plannedToSite: '香港中转仓',
  currency: 'USD',
  purchaseAmount: undefined,
  notes: '',
};

export default function PurchaseManagement({ onOpenExceptionCase }: PurchaseManagementProps) {
  const purchaseBatches = useStore((state) => state.purchaseBatches);
  const transitRecords = useStore((state) => state.transitRecords);
  const exceptionCases = useStore((state) => state.exceptionCases);
  const createPurchaseBatch = useStore((state) => state.createPurchaseBatch);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseBatch['status'] | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState<CreatePurchaseBatchInput>(initialForm);

  const filteredBatches = useMemo(
    () =>
      purchaseBatches.filter((batch) => {
        const keyword = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !keyword ||
          batch.purchaseNo.toLowerCase().includes(keyword) ||
          batch.supplier.toLowerCase().includes(keyword) ||
          batch.origin.toLowerCase().includes(keyword);
        const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [purchaseBatches, searchTerm, statusFilter]
  );

  const totalWeight = filteredBatches.reduce((sum, batch) => sum + batch.expectedWeight, 0);
  const totalCount = filteredBatches.reduce((sum, batch) => sum + batch.expectedStoneCount, 0);
  const activeExceptions = exceptionCases.filter((item) => item.status !== 'closed');

  const getBatchExceptions = (purchaseNo: string) => {
    const relatedTransitNos = transitRecords
      .filter((record) => record.relatedPurchaseNo === purchaseNo)
      .map((record) => record.transitNo);

    return activeExceptions.filter((item) => item.businessType === '在途流转' && relatedTransitNos.includes(item.relatedNo));
  };

  const handleCreate = () => {
    const result = createPurchaseBatch(form);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setShowCreateDialog(false);
    setForm(initialForm);
  };

  const exceptionCount = filteredBatches.reduce((sum, batch) => sum + getBatchExceptions(batch.purchaseNo).length, 0);

  return (
    <PageSectionLayout
      title="采购管理"
      description="从印度采购源头开始管理采购批次、供应商、预计到港计划和批次状态，并补上正式建单入口，作为全链路起点之一。"
      actions={
        <Button className="gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          新建采购批次
        </Button>
      }
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            采购批次 {filteredBatches.length} 个
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            预计重量 {totalWeight.toFixed(2)} ct
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            预计粒数 {totalCount.toLocaleString()} 粒
          </Badge>
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            挂单异常 {exceptionCount} 条
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部批次', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        { key: 'confirmed', label: '已确认', active: statusFilter === 'confirmed', onClick: () => setStatusFilter('confirmed') },
        { key: 'shipping', label: '运输中', active: statusFilter === 'shipping', onClick: () => setStatusFilter('shipping') },
        { key: 'arrived_hk', label: '香港到仓', active: statusFilter === 'arrived_hk', onClick: () => setStatusFilter('arrived_hk') },
        { key: 'received', label: '已收货', active: statusFilter === 'received', onClick: () => setStatusFilter('received') },
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
                  placeholder="搜索采购批次号、供应商、来源地..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'confirmed', 'shipping', 'arrived_hk', 'received', 'exception'] as const).map((status) => (
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {filteredBatches.map((batch, index) => {
            const relatedExceptions = getBatchExceptions(batch.purchaseNo);

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full border-0 shadow-lg">
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{batch.purchaseNo}</CardTitle>
                        <p className="mt-2 text-sm text-gray-500">{batch.supplier}</p>
                      </div>
                      <Badge variant="outline" className={statusConfig[batch.status].className}>
                        {statusConfig[batch.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">石种类别</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">{batch.roughType}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">预计重量</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">{batch.expectedWeight} ct</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-slate-400" />
                        <span>预计粒数：{batch.expectedStoneCount.toLocaleString()} 粒</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        <span>采购日期：{batch.purchaseDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4 text-slate-400" />
                        <span>路线：{batch.origin} → {batch.destination}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        <span>采购负责人：{batch.buyer}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">业务提醒</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {batch.notes || `预计 ${batch.expectedArrivalDate} 到达 ${batch.destination}，后续可继续接香港收货和在途流转。`}
                      </p>
                    </div>
                    {relatedExceptions.length > 0 && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          当前挂有 {relatedExceptions.length} 条在途异常
                        </div>
                        <p className="mt-2 text-sm text-red-700">{relatedExceptions[0].title}，责任人：{relatedExceptions[0].owner}</p>
                        {onOpenExceptionCase && (
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => onOpenExceptionCase(relatedExceptions[0].caseNo, 'all')}>
                            查看对应异常
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新建采购批次</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">供应商</p>
              <Input value={form.supplier} onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">采购负责人</p>
              <Input value={form.buyer} onChange={(e) => setForm((prev) => ({ ...prev, buyer: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">石种类别</p>
              <Input value={form.stoneCategory} onChange={(e) => setForm((prev) => ({ ...prev, stoneCategory: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">原石类型</p>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.roughType}
                onChange={(e) => setForm((prev) => ({ ...prev, roughType: e.target.value as PurchaseBatch['roughType'] }))}
              >
                <option value="小厘石">小厘石</option>
                <option value="小份石">小份石</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">预计重量(ct)</p>
              <Input type="number" step="0.01" value={form.expectedWeight || ''} onChange={(e) => setForm((prev) => ({ ...prev, expectedWeight: Number(e.target.value) }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">预计粒数</p>
              <Input type="number" value={form.expectedStoneCount || ''} onChange={(e) => setForm((prev) => ({ ...prev, expectedStoneCount: Number(e.target.value) }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">采购日期</p>
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">预计到达日期</p>
              <Input type="date" value={form.expectedArrivalDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedArrivalDate: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">起始地</p>
              <Input value={form.origin} onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">目的地</p>
              <Input value={form.destination} onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">采购备注</p>
              <Textarea rows={4} value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button className="bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={handleCreate}>
              创建采购批次
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
