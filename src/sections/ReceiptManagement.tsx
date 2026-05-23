import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Package2, Plus, Scale, Search, ShieldCheck, Warehouse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { useStore } from '@/hooks/useStore';
import type { CreateReceiptInput, ReceiptRecord } from '@/types';

interface ReceiptManagementProps {
  initialSearchTerm?: string;
  onOpenExceptionCase?: (searchTerm?: string, statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed') => void;
}

const statusConfig: Record<ReceiptRecord['status'], { label: string; className: string }> = {
  pending: { label: '待收货', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  receiving: { label: '收货中', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  received: { label: '已收货', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  reviewing: { label: '复核中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  reviewed: { label: '已复核', className: 'bg-green-100 text-green-700 border-green-200' },
  exception: { label: '差异异常', className: 'bg-red-100 text-red-700 border-red-200' },
  posted: { label: '已过账', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  closed: { label: '已关闭', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  voided: { label: '已作废', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const differenceLabelMap: Record<ReceiptRecord['differenceLevel'], string> = {
  none: '无差异',
  minor: '轻微差异',
  major: '重大差异',
};

const initialForm: CreateReceiptInput = {
  receiptType: 'hk_receipt',
  batchNo: '',
  sourceTransitNo: '',
  siteCode: 'HK',
  siteName: '香港中转仓',
  expectedWeight: 0,
  actualWeight: 0,
  expectedStoneCount: 0,
  actualStoneCount: 0,
  packageIntegrity: '完好',
  sealCheckResult: '一致',
  receiverName: '',
  reviewerName: '',
  differenceReason: '',
  remark: '',
};

export default function ReceiptManagement({ initialSearchTerm = '', onOpenExceptionCase }: ReceiptManagementProps) {
  const receiptRecords = useStore((state) => state.receiptRecords);
  const transitRecords = useStore((state) => state.transitRecords);
  const purchaseBatches = useStore((state) => state.purchaseBatches);
  const exceptionCases = useStore((state) => state.exceptionCases);
  const createReceiptRecord = useStore((state) => state.createReceiptRecord);

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [siteFilter, setSiteFilter] = useState<ReceiptRecord['siteCode'] | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState<CreateReceiptInput>(initialForm);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const filteredReceipts = useMemo(
    () =>
      receiptRecords.filter((record) => {
        const keyword = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !keyword ||
          record.receiptNo.toLowerCase().includes(keyword) ||
          record.batchNo.toLowerCase().includes(keyword) ||
          record.sourceTransitNo.toLowerCase().includes(keyword);
        const matchesSite = siteFilter === 'all' || record.siteCode === siteFilter;
        return matchesSearch && matchesSite;
      }),
    [receiptRecords, searchTerm, siteFilter]
  );

  const handleCreate = () => {
    const result = createReceiptRecord(form);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setShowCreateDialog(false);
    setForm(initialForm);
  };

  const openTransitCandidates = transitRecords.filter((item) => item.status !== 'pending_departure');
  const exceptionCount = filteredReceipts.filter((item) => item.status === 'exception').length;

  return (
    <PageSectionLayout
      title="收货管理"
      description="把香港收货、深圳收货和差异复核统一收口为正式收货单，作为在途流转进入仓内处理前的硬关口。"
      actions={
        <Button className="gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          新建收货单
        </Button>
      }
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            收货单 {receiptRecords.length} 份
          </Badge>
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
            香港收货 {receiptRecords.filter((item) => item.siteCode === 'HK').length}
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            可进入下一步 {receiptRecords.filter((item) => item.allowNextStep).length}
          </Badge>
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            差异异常 {exceptionCount}
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部收货', active: siteFilter === 'all', onClick: () => setSiteFilter('all') },
        { key: 'HK', label: '香港收货', active: siteFilter === 'HK', onClick: () => setSiteFilter('HK') },
        { key: 'SZ', label: '深圳收货', active: siteFilter === 'SZ', onClick: () => setSiteFilter('SZ') },
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
                  placeholder="搜索收货单号、批次号、流转单号..."
                  className="pl-10"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                可直接建单的在途单：{openTransitCandidates.length} 个
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredReceipts.map((record, index) => {
            const linkedBatch = purchaseBatches.find((item) => item.purchaseNo === record.batchNo);
            const linkedException = exceptionCases.find(
              (item) => item.businessType === '在途流转' && item.relatedNo === record.sourceTransitNo && item.status !== 'closed'
            );

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full border-0 shadow-lg">
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{record.receiptNo}</CardTitle>
                        <p className="mt-2 text-sm text-gray-500">{record.siteName} / {record.sourceTransitNo}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant="outline" className={statusConfig[record.status].className}>
                          {statusConfig[record.status].label}
                        </Badge>
                        <Badge variant="outline" className={record.differenceLevel === 'major' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}>
                          {differenceLabelMap[record.differenceLevel]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">预计重量</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">{record.expectedWeight} ct</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">实收重量</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">{record.actualWeight} ct</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-slate-400" />
                        <span>关联采购批次：{linkedBatch?.purchaseNo || record.batchNo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-slate-400" />
                        <span>重量差异：{record.weightDiff} ct / 粒数差异：{record.stoneDiff} 粒</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
                        <span>封签检查：{record.sealCheckResult || '未检查'} / 包装状态：{record.packageIntegrity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4 text-slate-400" />
                        <span>收货人：{record.receiverName} / 复核人：{record.reviewerName || '待复核'}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">处理结论</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {record.remark || record.differenceReason || (record.allowNextStep ? '当前收货结果允许进入下一流程。' : '当前收货结果需先完成差异处理。')}
                      </p>
                    </div>

                    {linkedException && onOpenExceptionCase && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          已联动异常单 {linkedException.caseNo}
                        </div>
                        <p className="mt-2 text-sm text-red-700">{linkedException.title}</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => onOpenExceptionCase(linkedException.caseNo, 'all')}>
                          查看对应异常
                        </Button>
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
            <DialogTitle>新建收货单</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">收货类型</p>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.receiptType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    receiptType: e.target.value as ReceiptRecord['receiptType'],
                    siteCode: e.target.value === 'hk_receipt' ? 'HK' : 'SZ',
                    siteName: e.target.value === 'hk_receipt' ? '香港中转仓' : '深圳主仓',
                  }))
                }
              >
                <option value="hk_receipt">香港收货</option>
                <option value="sz_receipt">深圳收货</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">来源流转单</p>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.sourceTransitNo}
                onChange={(e) => {
                  const matchedTransit = transitRecords.find((item) => item.transitNo === e.target.value);
                  const matchedBatch = purchaseBatches.find((item) => item.purchaseNo === matchedTransit?.relatedPurchaseNo);

                  setForm((prev) => ({
                    ...prev,
                    sourceTransitNo: e.target.value,
                    batchNo: matchedTransit?.relatedPurchaseNo || prev.batchNo,
                    expectedWeight: matchedTransit?.actualWeight || matchedTransit?.expectedWeight || 0,
                    expectedStoneCount: matchedBatch?.purchasedStoneCount || matchedBatch?.expectedStoneCount || 0,
                    actualWeight: matchedTransit?.actualWeight || matchedTransit?.expectedWeight || 0,
                    actualStoneCount: matchedBatch?.purchasedStoneCount || matchedBatch?.expectedStoneCount || 0,
                  }));
                }}
              >
                <option value="">请选择流转单</option>
                {openTransitCandidates.map((item) => (
                  <option key={item.id} value={item.transitNo}>
                    {item.transitNo} / {item.relatedPurchaseNo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">采购批次号</p>
              <Input value={form.batchNo} onChange={(e) => setForm((prev) => ({ ...prev, batchNo: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">收货站点</p>
              <Input value={form.siteName} onChange={(e) => setForm((prev) => ({ ...prev, siteName: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">预计重量(ct)</p>
              <Input type="number" step="0.01" value={form.expectedWeight || ''} onChange={(e) => setForm((prev) => ({ ...prev, expectedWeight: Number(e.target.value) }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">实收重量(ct)</p>
              <Input type="number" step="0.01" value={form.actualWeight || ''} onChange={(e) => setForm((prev) => ({ ...prev, actualWeight: Number(e.target.value) }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">预计粒数</p>
              <Input type="number" value={form.expectedStoneCount || ''} onChange={(e) => setForm((prev) => ({ ...prev, expectedStoneCount: Number(e.target.value) }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">实收粒数</p>
              <Input type="number" value={form.actualStoneCount || ''} onChange={(e) => setForm((prev) => ({ ...prev, actualStoneCount: Number(e.target.value) }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">包装完整性</p>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.packageIntegrity}
                onChange={(e) => setForm((prev) => ({ ...prev, packageIntegrity: e.target.value as ReceiptRecord['packageIntegrity'] }))}
              >
                <option value="完好">完好</option>
                <option value="轻微破损">轻微破损</option>
                <option value="严重破损">严重破损</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">封签检查</p>
              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={form.sealCheckResult}
                onChange={(e) => setForm((prev) => ({ ...prev, sealCheckResult: e.target.value as ReceiptRecord['sealCheckResult'] }))}
              >
                <option value="一致">一致</option>
                <option value="不一致">不一致</option>
                <option value="无封签">无封签</option>
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">收货人</p>
              <Input value={form.receiverName} onChange={(e) => setForm((prev) => ({ ...prev, receiverName: e.target.value }))} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">复核人</p>
              <Input value={form.reviewerName || ''} onChange={(e) => setForm((prev) => ({ ...prev, reviewerName: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">差异原因 / 收货备注</p>
              <Textarea
                rows={4}
                value={form.differenceReason || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, differenceReason: e.target.value, remark: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button className="bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={handleCreate}>
              创建收货单
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
