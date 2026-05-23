import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ClipboardCheck, Eye, Search, ShieldAlert, UserRound, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStore } from '@/hooks/useStore';
import type { ExceptionCase } from '@/types';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { toast } from 'sonner';

const severityConfig: Record<ExceptionCase['severity'], { label: string; className: string }> = {
  high: { label: '高', className: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: '中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: '低', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const statusConfig: Record<ExceptionCase['status'], { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  processing: { label: '处理中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: '已解决', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  closed: { label: '已关闭', className: 'bg-green-100 text-green-700 border-green-200' },
};

interface ExceptionHandlingProps {
  initialSearchTerm?: string;
  initialStatusFilter?: ExceptionCase['status'] | 'all';
  initialBusinessTypeFilter?: ExceptionCase['businessType'] | 'all';
  onOpenBusinessLink?: (
    pageId: 'transit' | 'sorting' | 'screening' | 'packing' | 'shipping' | 'scan',
    searchTerm: string
  ) => void;
  onOpenHandoverLink?: (searchTerm: string) => void;
}

export default function ExceptionHandling({
  initialSearchTerm = '',
  initialStatusFilter = 'all',
  initialBusinessTypeFilter = 'all',
  onOpenBusinessLink,
  onOpenHandoverLink,
}: ExceptionHandlingProps) {
  const exceptionCases = useStore((state) => state.exceptionCases);
  const updateExceptionCase = useStore((state) => state.updateExceptionCase);
  const systemSettings = useStore((state) => state.systemSettings);
  const handoverRecords = useStore((state) => state.handoverRecords);
  const transitRecords = useStore((state) => state.transitRecords);
  const sortingTasks = useStore((state) => state.sortingTasks);
  const screeningTasks = useStore((state) => state.screeningTasks);
  const packingTasks = useStore((state) => state.packingTasks);
  const shipmentTasks = useStore((state) => state.shipmentTasks);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<ExceptionCase['status'] | 'all'>(initialStatusFilter);
  const [businessTypeFilter, setBusinessTypeFilter] = useState<ExceptionCase['businessType'] | 'all'>(initialBusinessTypeFilter);
  const [selectedCase, setSelectedCase] = useState<ExceptionCase | null>(null);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    setBusinessTypeFilter(initialBusinessTypeFilter);
  }, [initialBusinessTypeFilter]);

  const getBusinessLink = (item: ExceptionCase) => {
    if (item.businessType === '在途流转') {
      return { pageId: 'transit' as const, label: '查看在途单', searchTerm: item.relatedNo };
    }

    if (item.businessType === '分选') {
      return { pageId: 'sorting' as const, label: '查看分选单', searchTerm: item.relatedNo };
    }

    if (item.businessType === '细筛') {
      return { pageId: 'screening' as const, label: '查看细筛单', searchTerm: item.relatedNo };
    }

    if (item.businessType === '封包') {
      return { pageId: 'packing' as const, label: '查看封包单', searchTerm: item.relatedNo };
    }

    if (item.businessType === '出货') {
      return { pageId: 'shipping' as const, label: '查看出货单', searchTerm: item.relatedNo };
    }

    if (item.businessType === '扫码交接') {
      return { pageId: 'scan' as const, label: '查看交接单', searchTerm: item.relatedNo };
    }

    return null;
  };

  const filteredCases = exceptionCases.filter((item) => {
    const matchesSearch =
      item.caseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.relatedNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.packageNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.businessType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesBusinessType = businessTypeFilter === 'all' || item.businessType === businessTypeFilter;
    return matchesSearch && matchesStatus && matchesBusinessType;
  });

  const findLinkedHandover = (item: ExceptionCase) =>
    handoverRecords.find(
      (record) =>
        record.handoverNo === item.relatedNo ||
        record.id === item.relatedNo ||
        (item.businessType === '扫码交接' && record.relatedNo === item.relatedNo) ||
        (item.packageNo && record.packageNo === item.packageNo && record.businessType === '出货签收')
    );

  const getCloseValidation = (item: ExceptionCase) => {
    const reasons: string[] = [];

    if (item.businessType === '扫码交接') {
      const linkedHandover = findLinkedHandover(item);

      if (!linkedHandover) {
        reasons.push('未找到对应交接凭证，暂不能关闭。');
      } else {
        if (!linkedHandover.wechatConfirmed) {
          reasons.push('交接凭证仍未完成扫码确认。');
        }

        if (linkedHandover.status !== 'completed') {
          reasons.push('交接凭证尚未完成闭环。');
        }

        if (systemSettings.forceWechatBindingForHandover && !linkedHandover.corpWechatUserId) {
          reasons.push('当前规则要求交接实名绑定企业微信。');
        }
      }
    }

    if (item.businessType === '在途流转') {
      const linkedTransit = transitRecords.find((record) => record.transitNo === item.relatedNo);
      if (!linkedTransit || (linkedTransit.status !== 'arrived' && linkedTransit.status !== 'signed')) {
        reasons.push('在途流转尚未恢复到到仓或签收状态。');
      }
    }

    if (item.businessType === '分选') {
      const linkedSorting = sortingTasks.find((record) => record.sortingNo === item.relatedNo);
      if (!linkedSorting || (linkedSorting.status !== 'review' && linkedSorting.status !== 'completed')) {
        reasons.push('分选单仍未进入复核或完成状态。');
      }
    }

    if (item.businessType === '细筛') {
      const linkedScreening = screeningTasks.find((record) => record.screeningNo === item.relatedNo);
      if (!linkedScreening || (linkedScreening.result !== 'passed' && linkedScreening.result !== 'recheck')) {
        reasons.push('细筛结果尚未恢复到可交接状态。');
      }
    }

    if (item.businessType === '封包') {
      const linkedPacking = packingTasks.find((record) => record.packingNo === item.relatedNo);
      if (!linkedPacking || (linkedPacking.status !== 'review' && linkedPacking.status !== 'completed')) {
        reasons.push('封包单仍未进入复核通过状态。');
      }
    }

    if (item.businessType === '出货') {
      const linkedShipment = shipmentTasks.find((record) => record.shipmentNo === item.relatedNo);
      if (!linkedShipment || linkedShipment.status !== 'signed') {
        reasons.push('出货单尚未完成客户签收。');
      }
    }

    return {
      canClose: reasons.length === 0,
      reasons,
    };
  };

  const pushStatus = (item: ExceptionCase) => {
    if (item.status === 'pending') {
      updateExceptionCase(item.id, { status: 'processing', latestAction: '已转入处理中，等待责任人跟进。' });
      return;
    }

    if (item.status === 'processing') {
      updateExceptionCase(item.id, {
        status: 'resolved',
        resolution: '已完成本轮处理动作，等待最终关闭。',
        latestAction: '问题已解决，待归档关闭。',
      });
      return;
    }

    if (item.status === 'resolved') {
      const validation = getCloseValidation(item);

      if (!validation.canClose) {
        toast.error(`异常单暂不能关闭：${validation.reasons.join('；')}`);
        return;
      }

      updateExceptionCase(item.id, { status: 'closed', latestAction: '异常单已归档关闭。' });
    }
  };

  return (
    <PageSectionLayout
      title="异常处理"
      description="围绕在途流转、分选、细筛、封包、出货和扫码交接建立异常单，统一查看严重程度、责任人、处理动作和关闭状态。"
      stats={
        <>
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            高优先 {exceptionCases.filter((item) => item.severity === 'high').length} 单
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            处理中 {exceptionCases.filter((item) => item.status === 'processing').length} 单
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已关闭 {exceptionCases.filter((item) => item.status === 'closed').length} 单
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部异常', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        { key: 'pending', label: '待处理', active: statusFilter === 'pending', onClick: () => setStatusFilter('pending') },
        { key: 'processing', label: '处理中', active: statusFilter === 'processing', onClick: () => setStatusFilter('processing') },
        { key: 'resolved', label: '已解决', active: statusFilter === 'resolved', onClick: () => setStatusFilter('resolved') },
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
                  placeholder="搜索异常单号、关联业务单号、封包号..."
                  className="pl-10"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                异常不会直接回退流程，统一通过异常单跟踪处理和关闭
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(['all', '在途流转', '分选', '细筛', '封包', '出货', '扫码交接'] as const).map((type) => (
                <Button
                  key={type}
                  variant={businessTypeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBusinessTypeFilter(type)}
                  className={businessTypeFilter === type ? 'bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]' : ''}
                >
                  {type === 'all' ? '全部业务' : type}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredCases.map((item, index) => (
            (() => {
              const businessLink = getBusinessLink(item);
              const closeValidation = getCloseValidation(item);
              const actionLogCount = item.actionLogs?.length ?? 0;

              return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border-0 shadow-lg">
                <div className={`h-1 ${item.severity === 'high' ? 'bg-red-500' : item.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.caseNo}</p>
                      <p className="mt-1 text-base font-medium text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.businessType} / {item.relatedNo}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={severityConfig[item.severity].className}>
                        严重度：{severityConfig[item.severity].label}
                      </Badge>
                      <Badge variant="outline" className={statusConfig[item.status].className}>
                        {statusConfig[item.status].label}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <p>异常类型：{item.exceptionType}</p>
                    <p>发现时间：{item.discoveredAt}</p>
                    <p>发现人：{item.discoveredBy}</p>
                    <p>责任人：{item.owner}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    最新动作：{item.latestAction}
                  </div>
                  {actionLogCount > 0 && (
                    <div className="text-xs text-slate-500">已记录 {actionLogCount} 条处理留痕</div>
                  )}
                  {item.status === 'resolved' && !closeValidation.canClose && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      关闭前需补齐：{closeValidation.reasons.join('；')}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => setSelectedCase(item)}>
                      <Eye className="h-4 w-4" />
                      查看详情
                    </Button>
                    {businessLink && onOpenBusinessLink && (
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => onOpenBusinessLink(businessLink.pageId, businessLink.searchTerm)}>
                        <ClipboardCheck className="h-4 w-4" />
                        {businessLink.label}
                      </Button>
                    )}
                    {item.businessType === '扫码交接' && onOpenHandoverLink && (
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => onOpenHandoverLink(item.relatedNo)}>
                        <ClipboardCheck className="h-4 w-4" />
                        查看交接单
                      </Button>
                    )}
                    <Button
                      className="flex-1 gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]"
                      onClick={() => pushStatus(item)}
                      disabled={item.status === 'closed'}
                    >
                      <Wrench className="h-4 w-4" />
                      推进处理
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
              );
            })()
          ))}
        </div>
      </div>

      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              异常单详情
            </DialogTitle>
          </DialogHeader>
          {selectedCase && (
            (() => {
              const businessLink = getBusinessLink(selectedCase);
              const closeValidation = getCloseValidation(selectedCase);
              const actionLogs =
                selectedCase.actionLogs && selectedCase.actionLogs.length > 0
                  ? selectedCase.actionLogs
                  : [
                      {
                        id: `${selectedCase.id}-fallback`,
                        action: '异常创建',
                        detail: selectedCase.latestAction,
                        actor: selectedCase.discoveredBy,
                        timestamp: selectedCase.discoveredAt,
                      },
                    ];

              return (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={severityConfig[selectedCase.severity].className}>
                    严重度：{severityConfig[selectedCase.severity].label}
                  </Badge>
                  <Badge variant="outline" className={statusConfig[selectedCase.status].className}>
                    {statusConfig[selectedCase.status].label}
                  </Badge>
                </div>
                <p className="text-lg font-semibold text-slate-900">{selectedCase.title}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {selectedCase.businessType} / {selectedCase.relatedNo}
                  {selectedCase.packageNo ? ` / ${selectedCase.packageNo}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    异常信息
                  </div>
                  <p className="text-sm text-slate-600">类型：{selectedCase.exceptionType}</p>
                  <p className="mt-1 text-sm text-slate-600">发现时间：{selectedCase.discoveredAt}</p>
                  <p className="mt-1 text-sm text-slate-600">发现人：{selectedCase.discoveredBy}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <UserRound className="h-4 w-4 text-[#c9a962]" />
                    责任与动作
                  </div>
                  <p className="text-sm text-slate-600">责任人：{selectedCase.owner}</p>
                  <p className="mt-1 text-sm text-slate-600">最新动作：{selectedCase.latestAction}</p>
                </div>
              </div>

              {selectedCase.resolution && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  解决说明：{selectedCase.resolution}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-900">异常推进留痕</p>
                <div className="mt-3 space-y-3">
                  {actionLogs.map((log) => (
                    <div key={log.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">{log.action}</span>
                        <span className="text-xs text-slate-500">{log.timestamp}</span>
                      </div>
                      <p className="mt-1">{log.detail}</p>
                      <p className="mt-1 text-xs text-slate-500">操作人：{log.actor}</p>
                    </div>
                  ))}
                </div>
              </div>
              {selectedCase.status === 'resolved' && !closeValidation.canClose && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  <p className="font-medium">关闭前校验未通过</p>
                  <p className="mt-2">{closeValidation.reasons.join('；')}</p>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedCase(null)}>
                  关闭
                </Button>
                {businessLink && onOpenBusinessLink && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenBusinessLink(businessLink.pageId, businessLink.searchTerm);
                      setSelectedCase(null);
                    }}
                  >
                    {businessLink.label}
                  </Button>
                )}
                {selectedCase.businessType === '扫码交接' && onOpenHandoverLink && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenHandoverLink(selectedCase.relatedNo);
                      setSelectedCase(null);
                    }}
                  >
                    查看交接单
                  </Button>
                )}
                <Button
                  className="gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]"
                  disabled={selectedCase.status === 'closed' || (selectedCase.status === 'resolved' && !closeValidation.canClose)}
                  onClick={() => {
                    pushStatus(selectedCase);
                    setSelectedCase(null);
                  }}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  推进异常状态
                </Button>
              </div>
            </div>
              );
            })()
          )}
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
