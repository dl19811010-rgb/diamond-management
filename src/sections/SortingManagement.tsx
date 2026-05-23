import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock3, Gauge, Package2, Search, UserRound, Weight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { useStore } from '@/hooks/useStore';
import type { SortingTask } from '@/types';

interface SortingManagementProps {
  initialSearchTerm?: string;
  onOpenExceptionCase?: (searchTerm?: string, statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed') => void;
  onOpenHandoverRecord?: (searchTerm: string) => void;
}

const sortingStatusConfig: Record<SortingTask['status'], { label: string; className: string }> = {
  pending: { label: '待开始', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: '分选中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  review: { label: '待复核', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700 border-green-200' },
  exception: { label: '异常', className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function SortingManagement({ initialSearchTerm = '', onOpenExceptionCase, onOpenHandoverRecord }: SortingManagementProps) {
  const sortingTasks = useStore((state) => state.sortingTasks);
  const handoverRecords = useStore((state) => state.handoverRecords);
  const exceptionCases = useStore((state) => state.exceptionCases);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<SortingTask['status'] | 'all'>('all');

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const filteredTasks = useMemo(
    () =>
      sortingTasks.filter((task) => {
        const matchesSearch =
          task.sortingNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.sourceBatchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.sourceReceiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [sortingTasks, searchTerm, statusFilter]
  );

  const totalInputWeight = filteredTasks.reduce((sum, task) => sum + task.inputWeight, 0);
  const totalOutputWeight = filteredTasks.reduce((sum, task) => sum + (task.outputWeight || 0), 0);
  const urgentCount = filteredTasks.filter((task) => task.priority === 'urgent').length;
  const autoDispatchCount = filteredTasks.filter((task) => task.dispatchSource === 'receipt_auto').length;
  const activeExceptions = exceptionCases.filter((item) => item.businessType === '分选' && item.status !== 'closed');

  return (
    <PageSectionLayout
      title="分选管理"
      description="管理分选领料、作业中状态、损耗和交回结果，把深圳收货后的生产加工过程沉淀成标准作业单。"
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            作业单 {filteredTasks.length} 张
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            输入重量 {totalInputWeight.toFixed(2)} ct
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已交回 {totalOutputWeight.toFixed(2)} ct
          </Badge>
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            加急 {urgentCount} 张
          </Badge>
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
            自动派工 {autoDispatchCount} 张
          </Badge>
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
            挂单异常 {activeExceptions.length} 条
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部作业', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        { key: 'pending', label: '待开始', active: statusFilter === 'pending', onClick: () => setStatusFilter('pending') },
        { key: 'in_progress', label: '分选中', active: statusFilter === 'in_progress', onClick: () => setStatusFilter('in_progress') },
        { key: 'review', label: '待复核', active: statusFilter === 'review', onClick: () => setStatusFilter('review') },
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索分选单号、来源批次、分选员..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'in_progress', 'review', 'completed'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]' : ''}
                  >
                    {status === 'all' ? '全部' : sortingStatusConfig[status].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredTasks.map((task, index) => (
            (() => {
              const relatedExceptions = activeExceptions.filter((item) => item.relatedNo === task.sortingNo);
              const relatedHandover = handoverRecords.find((item) => item.relatedNo === task.sortingNo);

              return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full border-0 shadow-lg">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{task.sortingNo}</CardTitle>
                      <p className="mt-2 text-sm text-gray-500">
                        来源批次：{task.sourceBatchNo}
                        {task.sourceReceiptNo ? ` / 收货单：${task.sourceReceiptNo}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className={sortingStatusConfig[task.status].className}>
                        {sortingStatusConfig[task.status].label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={task.priority === 'urgent' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}
                      >
                        {task.priority === 'urgent' ? '加急' : '普通'}
                      </Badge>
                      {task.dispatchSource === 'receipt_auto' && (
                        <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                          收货自动派工
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">输入重量</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{task.inputWeight.toFixed(2)} ct</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">交回重量</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {task.outputWeight ? `${task.outputWeight.toFixed(2)} ct` : '待交回'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <span>分选员：{task.assignedTo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      <span>计划完成：{task.expectedFinishTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package2 className="h-4 w-4 text-slate-400" />
                      <span>石种：{task.stoneCategory} / 入料 {task.inputStoneCount.toLocaleString()} 粒</span>
                    </div>
                    {task.sourceInventoryPackageNo && (
                      <div className="flex items-center gap-2">
                        <Package2 className="h-4 w-4 text-slate-400" />
                        <span>来源库存包：{task.sourceInventoryPackageNo}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-slate-400" />
                      <span>损耗：{typeof task.lossWeight === 'number' ? `${task.lossWeight.toFixed(2)} ct` : '待统计'}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500">作业摘要</p>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{task.resultSummary}</p>
                  </div>

                  {task.status === 'exception' && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        分选异常待处理
                      </div>
                    </div>
                  )}
                  {relatedExceptions.length > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        当前挂有 {relatedExceptions.length} 条异常单
                      </div>
                      <p className="mt-2">{relatedExceptions[0].title}，责任人：{relatedExceptions[0].owner}</p>
                      {onOpenExceptionCase && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => onOpenExceptionCase(relatedExceptions[0].caseNo, 'all')}>
                          查看对应异常
                        </Button>
                      )}
                    </div>
                  )}
                  {relatedHandover && onOpenHandoverRecord && (
                    <Button variant="outline" size="sm" onClick={() => onOpenHandoverRecord(relatedHandover.handoverNo)}>
                      查看交接单
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
