import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Eye, History, MessageSquare, PackageCheck, QrCode, Search, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useStore } from '@/hooks/useStore';
import type { ExceptionCase, HandoverRecord } from '@/types';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { toast } from 'sonner';

type HandoverTemplate = Omit<HandoverRecord, 'id' | 'handoverNo' | 'handoverTime' | 'status' | 'wechatConfirmed'>;

const statusConfig: Record<HandoverRecord['status'], { label: string; className: string }> = {
  pending_confirm: { label: '待确认', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed: { label: '已确认', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700 border-green-200' },
  exception: { label: '异常', className: 'bg-red-100 text-red-700 border-red-200' },
};

const getAdvanceLabel = (record: HandoverRecord) => {
  if (record.status === 'pending_confirm') {
    return record.businessType === '出货签收' ? '确认客户签收' : '确认扫码';
  }

  return '完成交接';
};

interface ScanConfirmationProps {
  initialSearchTerm?: string;
  onOpenExceptionCase?: (
    searchTerm?: string,
    statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed',
    businessTypeFilter?: ExceptionCase['businessType'] | 'all'
  ) => void;
  onOpenBusinessLink?: (
    pageId: 'transit' | 'sorting' | 'screening' | 'packing' | 'shipping' | 'scan',
    searchTerm: string
  ) => void;
}

export default function ScanConfirmation({
  initialSearchTerm = '',
  onOpenExceptionCase,
  onOpenBusinessLink,
}: ScanConfirmationProps) {
  const {
    accounts,
    customerOrders,
    systemSettings,
    transitRecords,
    sortingTasks,
    screeningTasks,
    packingTasks,
    shipmentTasks,
    handoverRecords,
    exceptionCases,
    addHandoverRecord,
    advanceHandoverRecord,
    updateHandoverRecord,
  } = useStore();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<HandoverRecord['status'] | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<HandoverTemplate | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HandoverRecord | null>(null);
  const [wechatUserIdInput, setWechatUserIdInput] = useState('');
  const [wechatDisplayNameInput, setWechatDisplayNameInput] = useState('');

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  useEffect(() => {
    setWechatUserIdInput(selectedRecord?.corpWechatUserId || '');
    setWechatDisplayNameInput(selectedRecord?.corpWechatDisplayName || '');
  }, [selectedRecord]);

  const createTemplate = (template: HandoverTemplate): HandoverTemplate => template;

  const matchWechatBinding = (names: string[]) => {
    const normalizedNames = names.map((name) => name.trim()).filter(Boolean);
    const matchedAccount = accounts.find((account) => {
      if (!account.wechatBound || !account.corpWechatUserId) {
        return false;
      }

      return normalizedNames.some(
        (name) => account.name === name || name.includes(account.name) || account.name.includes(name)
      );
    });

    return matchedAccount
      ? {
          corpWechatUserId: matchedAccount.corpWechatUserId,
          matchedName: matchedAccount.name,
        }
      : {
          corpWechatUserId: undefined,
          matchedName: undefined,
        };
  };

  const handoverTemplates = useMemo<HandoverTemplate[]>(() => {
    const existingTemplateKeys = new Set(handoverRecords.map((item) => `${item.businessType}-${item.relatedNo}`));

    return [
      ...transitRecords
        .filter((record) => record.status === 'in_transit' || record.status === 'pending_departure')
        .slice(0, 2)
        .map((record) => {
          const receivedBy = record.receivedBy || '待签收人';
          const matchedWechat = matchWechatBinding([record.handoverBy, receivedBy]);

          return createTemplate({
            businessType: record.route === 'india_to_hk' ? '采购到港' : '香港转深圳',
            relatedNo: record.transitNo,
            packageNo: undefined,
            fromNode: record.fromLocation,
            toNode: record.toLocation,
            handoverBy: record.handoverBy,
            receivedBy,
            corpWechatUserId: matchedWechat.corpWechatUserId,
            netWeight: record.actualWeight || record.expectedWeight,
            stoneCount: record.batchCount * 1000,
            remarks: matchedWechat.matchedName
              ? `${record.notes || '待扫码确认本次流转交接。'} 已自动匹配企微账号：${matchedWechat.matchedName}。`
              : record.notes || '待扫码确认本次流转交接。',
          });
        }),
      ...sortingTasks
        .filter((task) => task.status === 'pending')
        .slice(0, 1)
        .map((task) => {
          const matchedWechat = matchWechatBinding(['深圳收货员', task.assignedTo]);

          return createTemplate({
            businessType: '分选领料',
            relatedNo: task.sortingNo,
            packageNo: undefined,
            fromNode: '深圳主仓',
            toNode: '分选工位',
            handoverBy: '深圳收货员',
            receivedBy: task.assignedTo,
            corpWechatUserId: matchedWechat.corpWechatUserId,
            netWeight: task.inputWeight,
            stoneCount: task.inputStoneCount,
            remarks: matchedWechat.matchedName
              ? `待分选员扫码领料后开始作业。 已自动匹配企微账号：${matchedWechat.matchedName}。`
              : '待分选员扫码领料后开始作业。',
          });
        }),
      ...sortingTasks
        .filter((task) => task.status === 'review' || task.status === 'in_progress')
        .slice(0, 1)
        .map((task) => {
          const receivedBy = screeningTasks[0]?.assignedTo || '待领料人';
          const matchedWechat = matchWechatBinding([task.assignedTo, receivedBy]);

          return createTemplate({
            businessType: '分选交回',
            relatedNo: task.sortingNo,
            packageNo: undefined,
            fromNode: '分选工位',
            toNode: '细筛工位',
            handoverBy: task.assignedTo,
            receivedBy,
            corpWechatUserId: matchedWechat.corpWechatUserId,
            netWeight: task.outputWeight || task.inputWeight,
            stoneCount: task.outputStoneCount || task.inputStoneCount,
            remarks: matchedWechat.matchedName
              ? `${task.resultSummary} 已自动匹配企微账号：${matchedWechat.matchedName}。`
              : task.resultSummary,
          });
        }),
      ...screeningTasks
        .filter((task) => task.result === 'passed' || task.result === 'recheck')
        .slice(0, 1)
        .map((task) => {
          const linkedPacking = packingTasks.find((packing) => packing.sourceScreeningNo === task.screeningNo);
          const receivedBy = linkedPacking?.assignedTo || '待封包员';
          const matchedWechat = matchWechatBinding([task.assignedTo, receivedBy]);

          return createTemplate({
            businessType: '细筛交接',
            relatedNo: task.screeningNo,
            packageNo: linkedPacking?.packageNo,
            fromNode: '细筛工位',
            toNode: '封包工位',
            handoverBy: task.assignedTo,
            receivedBy,
            corpWechatUserId: matchedWechat.corpWechatUserId,
            netWeight: task.afterWeight || task.beforeWeight,
            stoneCount: task.afterStoneCount || task.beforeStoneCount,
            remarks: matchedWechat.matchedName ? `${task.notes} 已自动匹配企微账号：${matchedWechat.matchedName}。` : task.notes,
          });
        }),
      ...packingTasks
        .filter((task) => task.status === 'review')
        .slice(0, 1)
        .map((task) => {
          const receivedBy = task.reviewedBy || '待复核人';
          const matchedWechat = matchWechatBinding([task.assignedTo, receivedBy]);

          return createTemplate({
            businessType: '封包复核',
            relatedNo: task.packingNo,
            packageNo: task.packageNo,
            fromNode: '封包工位',
            toNode: '出货复核台',
            handoverBy: task.assignedTo,
            receivedBy,
            corpWechatUserId: matchedWechat.corpWechatUserId,
            netWeight: task.netWeight,
            stoneCount: task.stoneCount,
            remarks: matchedWechat.matchedName ? `${task.remarks} 已自动匹配企微账号：${matchedWechat.matchedName}。` : task.remarks,
          });
        }),
      ...shipmentTasks
        .filter((task) => task.status === 'ready_to_ship' || task.status === 'shipped')
        .slice(0, 1)
        .map((task) => {
          const handoverBy = task.shippedBy || '刘出货';
          const receivedBy = `${task.customerName}收货员`;
          const matchedWechat = matchWechatBinding([handoverBy, receivedBy]);

          return createTemplate({
            businessType: '出货签收',
            relatedNo: task.shipmentNo,
            packageNo: task.packageNo,
            fromNode: '深圳出货区',
            toNode: task.customerName,
            handoverBy,
            receivedBy,
            corpWechatUserId: matchedWechat.corpWechatUserId,
            netWeight: task.netWeight,
            stoneCount: task.stoneCount,
            remarks: matchedWechat.matchedName
              ? `${task.shippingRequirement} 已自动匹配企微账号：${matchedWechat.matchedName}。`
              : task.shippingRequirement,
          });
        }),
    ].filter((template) => !existingTemplateKeys.has(`${template.businessType}-${template.relatedNo}`));
  }, [accounts, handoverRecords, packingTasks, screeningTasks, shipmentTasks, sortingTasks, transitRecords]);

  const filteredRecords = handoverRecords.filter((record) => {
    const matchesSearch =
      record.handoverNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.relatedNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.businessType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.packageNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getBusinessLink = (record: HandoverRecord) => {
    if (record.businessType === '采购到港' || record.businessType === '香港转深圳') {
      return { pageId: 'transit' as const, label: '查看在途单', searchTerm: record.relatedNo };
    }

    if (record.businessType === '分选领料' || record.businessType === '分选交回') {
      return { pageId: 'sorting' as const, label: '查看分选单', searchTerm: record.relatedNo };
    }

    if (record.businessType === '细筛交接') {
      return { pageId: 'screening' as const, label: '查看细筛单', searchTerm: record.relatedNo };
    }

    if (record.businessType === '封包复核') {
      return { pageId: 'packing' as const, label: '查看封包单', searchTerm: record.relatedNo };
    }

    if (record.businessType === '出货签收') {
      return { pageId: 'shipping' as const, label: '查看出货单', searchTerm: record.relatedNo };
    }

    return null;
  };

  const getRelatedException = (record: HandoverRecord) =>
    exceptionCases.find(
      (item) =>
        item.businessType === '扫码交接' &&
        (item.relatedNo === record.handoverNo || item.relatedNo === record.id || item.relatedNo === record.relatedNo) &&
        item.status !== 'closed'
    );

  const saveWechatBinding = (record: HandoverRecord) => {
    const trimmedUserId = wechatUserIdInput.trim();
    const trimmedDisplayName = wechatDisplayNameInput.trim();

    if (!trimmedUserId) {
      toast.error('请先填写企业微信用户ID');
      return;
    }

    updateHandoverRecord(record.id, {
      corpWechatUserId: trimmedUserId,
      corpWechatDisplayName: trimmedDisplayName || record.receivedBy,
      remarks: appendWechatBindingRemark(record.remarks, trimmedDisplayName || record.receivedBy),
    });
    toast.success('交接单企业微信实名信息已补录');
    setSelectedRecord((current) =>
      current
        ? {
            ...current,
            corpWechatUserId: trimmedUserId,
            corpWechatDisplayName: trimmedDisplayName || record.receivedBy,
            lastWechatBindingAt: new Date().toLocaleString('zh-CN', { hour12: false }),
            remarks: appendWechatBindingRemark(record.remarks, trimmedDisplayName || record.receivedBy),
          }
        : current
    );
  };

  const appendWechatBindingRemark = (remarks: string, displayName: string) => {
    const remark = `已补录企微实名：${displayName}。`;
    return remarks.includes(remark) ? remarks : `${remarks} ${remark}`.trim();
  };

  const getBusinessSummary = (record: HandoverRecord) => {
    if (record.businessType === '采购到港' || record.businessType === '香港转深圳') {
      const linkedTransit = transitRecords.find((item) => item.transitNo === record.relatedNo);
      return {
        title: '在途业务信息',
        lines: [
          `流转单号：${record.relatedNo}`,
          `承运信息：${linkedTransit?.carrier || '待补充'}`,
          `风险等级：${linkedTransit?.riskLevel || '待评估'}`,
          `当前状态：${linkedTransit?.status || '未找到关联流转单'}`,
        ],
      };
    }

    if (record.businessType === '分选领料' || record.businessType === '分选交回') {
      const linkedSorting = sortingTasks.find((item) => item.sortingNo === record.relatedNo);
      return {
        title: '分选业务信息',
        lines: [
          `分选单号：${record.relatedNo}`,
          `负责人：${linkedSorting?.assignedTo || '待补充'}`,
          `当前状态：${linkedSorting?.status || '未找到关联分选单'}`,
          `结果摘要：${linkedSorting?.resultSummary || '待补充'}`,
        ],
      };
    }

    if (record.businessType === '细筛交接') {
      const linkedScreening = screeningTasks.find((item) => item.screeningNo === record.relatedNo);
      return {
        title: '细筛业务信息',
        lines: [
          `细筛单号：${record.relatedNo}`,
          `负责人：${linkedScreening?.assignedTo || '待补充'}`,
          `当前结果：${linkedScreening?.result || '未找到关联细筛单'}`,
          `规则：${linkedScreening?.ruleName || '待补充'}`,
        ],
      };
    }

    if (record.businessType === '封包复核') {
      const linkedPacking = packingTasks.find((item) => item.packingNo === record.relatedNo);
      return {
        title: '封包业务信息',
        lines: [
          `封包单号：${record.relatedNo}`,
          `封包编号：${linkedPacking?.packageNo || record.packageNo || '待补充'}`,
          `当前状态：${linkedPacking?.status || '未找到关联封包单'}`,
          `客户：${linkedPacking?.targetCustomer || '待补充'}`,
        ],
      };
    }

    const linkedShipment = shipmentTasks.find((item) => item.shipmentNo === record.relatedNo);
    const linkedOrder = customerOrders.find((item) => item.orderNo === linkedShipment?.sourceOrderNo);
    return {
      title: '出货业务信息',
      lines: [
        `出货单号：${record.relatedNo}`,
        `来源订单：${linkedShipment?.sourceOrderNo || '待补充'}`,
        `客户：${linkedShipment?.customerName || '待补充'}`,
        `当前状态：${linkedShipment?.status || '未找到关联出货单'}`,
        `订单状态：${linkedOrder?.status || '未找到关联客户订单'}`,
        `物流：${linkedShipment?.logisticProvider || '待安排'}`,
      ],
    };
  };

  const createHandover = (template: HandoverTemplate) => {
    const initialStatus: HandoverRecord['status'] = template.businessType === '出货签收' ? 'pending_confirm' : 'confirmed';
    const nextRecord: HandoverRecord = {
      ...template,
      id: `hd-${Date.now()}`,
      handoverNo: `HD${Date.now()}`,
      handoverTime: new Date().toLocaleString('zh-CN', { hour12: false }),
      status: initialStatus,
      wechatConfirmed: initialStatus !== 'pending_confirm',
    };
    addHandoverRecord(nextRecord);
    setSelectedTemplate(null);
  };

  return (
    <PageSectionLayout
      title="扫码交接"
      description="统一管理采购到港、香港转深圳、分选交回、细筛交接、封包复核和出货签收的扫码留痕，逐步向企业微信实名确认过渡。"
      actions={
        <Button variant="outline" className="gap-2">
          <History className="h-4 w-4" />
          交接凭证中心
        </Button>
      }
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            待确认 {handoverRecords.filter((item) => item.status === 'pending_confirm').length} 条
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已完成 {handoverRecords.filter((item) => item.status === 'completed').length} 条
          </Badge>
          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
            已确认 {handoverRecords.filter((item) => item.status === 'confirmed').length} 条
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            候选交接 {handoverTemplates.length} 条
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部凭证', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        {
          key: 'pending_confirm',
          label: '待确认',
          active: statusFilter === 'pending_confirm',
          onClick: () => setStatusFilter('pending_confirm'),
        },
        {
          key: 'confirmed',
          label: '已确认',
          active: statusFilter === 'confirmed',
          onClick: () => setStatusFilter('confirmed'),
        },
        {
          key: 'completed',
          label: '已完成',
          active: statusFilter === 'completed',
          onClick: () => setStatusFilter('completed'),
        },
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
                  placeholder="搜索交接单号、关联业务单号、封包号..."
                  className="pl-10"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                企业微信实名：{systemSettings.forceWechatBindingForHandover ? '当前交接要求实名绑定' : '当前为预留状态，已支持自动匹配已绑定员工'}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-5 w-5 text-[#c9a962]" />
                待发起交接
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {handoverTemplates.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  当前没有新的待发起交接，已生成的凭证会自动从候选区移除。
                </div>
              )}
              {handoverTemplates.map((template, index) => (
                <motion.div
                  key={`${template.businessType}-${template.relatedNo}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{template.businessType}</p>
                      <p className="text-xs text-slate-500">关联单号：{template.relatedNo}</p>
                    </div>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      待扫码
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>{template.fromNode} → {template.toNode}</p>
                    <p>交接人：{template.handoverBy}，接收人：{template.receivedBy}</p>
                    <p>重量 / 粒数：{template.netWeight} ct / {template.stoneCount.toLocaleString()} 粒</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={
                        template.corpWechatUserId
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }
                    >
                      {template.corpWechatUserId ? `已匹配企微：${template.corpWechatUserId}` : '待匹配企微账号'}
                    </Badge>
                    {systemSettings.forceWechatBindingForHandover && !template.corpWechatUserId && (
                      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                        当前规则下将自动挂异常
                      </Badge>
                    )}
                  </div>
                  <Button
                    className="mt-4 w-full gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    发起扫码交接
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PackageCheck className="h-5 w-5 text-green-600" />
                交接凭证记录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {filteredRecords.map((record, index) => (
                (() => {
                  const relatedException = getRelatedException(record);
                  const businessLink = getBusinessLink(record);

                  return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{record.handoverNo}</p>
                      <p className="text-xs text-slate-500">
                        {record.businessType} / {record.relatedNo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusConfig[record.status].className}>
                        {statusConfig[record.status].label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          record.wechatConfirmed
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }
                      >
                        {record.wechatConfirmed ? '企业微信已确认' : '待微信确认'}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <p>路径：{record.fromNode} → {record.toNode}</p>
                    <p>交接双方：{record.handoverBy} / {record.receivedBy}</p>
                    <p>重量 / 粒数：{record.netWeight} ct / {record.stoneCount.toLocaleString()} 粒</p>
                    <p>交接时间：{record.handoverTime}</p>
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{record.remarks}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                      <Eye className="mr-2 h-4 w-4" />
                      查看详情
                    </Button>
                    {relatedException && onOpenExceptionCase && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenExceptionCase(relatedException.caseNo, 'all', '扫码交接')}
                      >
                        查看异常单
                      </Button>
                    )}
                    {businessLink && onOpenBusinessLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenBusinessLink(businessLink.pageId, businessLink.searchTerm)}
                      >
                        {businessLink.label}
                      </Button>
                    )}
                  </div>
                  {record.status !== 'completed' && record.status !== 'exception' && (
                    <Button
                      variant="outline"
                      className="mt-3 w-full gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                      onClick={() => advanceHandoverRecord(record.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {getAdvanceLabel(record)}
                    </Button>
                  )}
                </motion.div>
                  );
                })()
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#c9a962]" />
              确认发起扫码交接
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{selectedTemplate.businessType}</p>
                <p className="mt-2">
                  {selectedTemplate.fromNode} → {selectedTemplate.toNode}
                </p>
                <p className="mt-1">
                  交接双方：{selectedTemplate.handoverBy} / {selectedTemplate.receivedBy}
                </p>
                <p className="mt-1">
                  重量 / 粒数：{selectedTemplate.netWeight} ct / {selectedTemplate.stoneCount.toLocaleString()} 粒
                </p>
                <p className="mt-1">
                  企微匹配：{selectedTemplate.corpWechatUserId || '未匹配到已绑定账号'}
                </p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                系统会立即生成交接凭证，并同步推进对应业务单状态。出货签收会先进入“待确认”，等待客户侧扫码完成后再闭环。
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  取消
                </Button>
                <Button
                  className="gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]"
                  onClick={() => createHandover(selectedTemplate)}
                >
                  <MessageSquare className="h-4 w-4" />
                  生成交接凭证
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#c9a962]" />
              交接单详情
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusConfig[selectedRecord.status].className}>
                    {statusConfig[selectedRecord.status].label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      selectedRecord.wechatConfirmed
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }
                  >
                    {selectedRecord.wechatConfirmed ? '扫码已确认' : '待扫码确认'}
                  </Badge>
                </div>
                <p className="text-lg font-semibold text-slate-900">{selectedRecord.handoverNo}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {selectedRecord.businessType} / {selectedRecord.relatedNo}
                  {selectedRecord.packageNo ? ` / ${selectedRecord.packageNo}` : ''}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  路径：{selectedRecord.fromNode} → {selectedRecord.toNode}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  交接双方：{selectedRecord.handoverBy} / {selectedRecord.receivedBy}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  重量 / 粒数：{selectedRecord.netWeight} ct / {selectedRecord.stoneCount.toLocaleString()} 粒
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">企业微信实名信息</p>
                  <p className="mt-2 text-sm text-slate-600">
                    当前状态：{selectedRecord.corpWechatUserId ? '已匹配实名账号' : '未匹配实名账号'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">企微账号：{selectedRecord.corpWechatUserId || '待补绑'}</p>
                  <p className="mt-1 text-sm text-slate-600">实名名称：{selectedRecord.corpWechatDisplayName || '待补录'}</p>
                  <p className="mt-1 text-sm text-slate-600">最近补录：{selectedRecord.lastWechatBindingAt || '暂无记录'}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    系统规则：{systemSettings.forceWechatBindingForHandover ? '当前交接关闭前要求实名绑定' : '当前为预留状态'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">{getBusinessSummary(selectedRecord).title}</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    {getBusinessSummary(selectedRecord).lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-900">补录企业微信实名</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input value={wechatUserIdInput} onChange={(e) => setWechatUserIdInput(e.target.value)} placeholder="企业微信用户ID" />
                  <Input value={wechatDisplayNameInput} onChange={(e) => setWechatDisplayNameInput(e.target.value)} placeholder="企微显示名称" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {accounts
                    .filter((account) => account.wechatBound && account.corpWechatUserId)
                    .slice(0, 4)
                    .map((account) => (
                      <Button
                        key={account.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWechatUserIdInput(account.corpWechatUserId || '');
                          setWechatDisplayNameInput(account.corpWechatDisplayName || account.name);
                        }}
                      >
                        使用 {account.name}
                      </Button>
                    ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="outline" onClick={() => saveWechatBinding(selectedRecord)}>
                    保存实名补录
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                备注：{selectedRecord.remarks}
              </div>

              {getRelatedException(selectedRecord) && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    已挂关联异常
                  </div>
                  <p className="mt-2">
                    {getRelatedException(selectedRecord)?.title} / {getRelatedException(selectedRecord)?.caseNo}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                  关闭
                </Button>
                {getRelatedException(selectedRecord) && onOpenExceptionCase && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const relatedException = getRelatedException(selectedRecord);
                      if (relatedException) {
                        onOpenExceptionCase(relatedException.caseNo, 'all', '扫码交接');
                        setSelectedRecord(null);
                      }
                    }}
                  >
                    查看异常单
                  </Button>
                )}
                {getBusinessLink(selectedRecord) && onOpenBusinessLink && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const businessLink = getBusinessLink(selectedRecord);
                      if (businessLink) {
                        onOpenBusinessLink(businessLink.pageId, businessLink.searchTerm);
                        setSelectedRecord(null);
                      }
                    }}
                  >
                    {getBusinessLink(selectedRecord)?.label}
                  </Button>
                )}
                {selectedRecord.status !== 'completed' && selectedRecord.status !== 'exception' && (
                  <Button
                    className="gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]"
                    onClick={() => {
                      advanceHandoverRecord(selectedRecord.id);
                      setSelectedRecord(null);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {getAdvanceLabel(selectedRecord)}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
