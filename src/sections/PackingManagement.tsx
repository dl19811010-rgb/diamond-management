import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Archive, Package2, Search, ShieldCheck, UserRound, Weight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { useStore } from '@/hooks/useStore';
import type { PackingTask } from '@/types';

interface PackingManagementProps {
  initialSearchTerm?: string;
  onOpenExceptionCase?: (searchTerm?: string, statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed') => void;
  onOpenHandoverRecord?: (searchTerm: string) => void;
}

const packingStatusConfig: Record<PackingTask['status'], { label: string; className: string }> = {
  pending: { label: '待封包', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  packing: { label: '封包中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  review: { label: '待复核', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700 border-green-200' },
  exception: { label: '异常', className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function PackingManagement({ initialSearchTerm = '', onOpenExceptionCase, onOpenHandoverRecord }: PackingManagementProps) {
  const packingTasks = useStore((state) => state.packingTasks);
  const handoverRecords = useStore((state) => state.handoverRecords);
  const exceptionCases = useStore((state) => state.exceptionCases);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<PackingTask['status'] | 'all'>('all');

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const filteredTasks = useMemo(
    () =>
      packingTasks.filter((task) => {
        const matchesSearch =
          task.packingNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.packageNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.targetCustomer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [packingTasks, searchTerm, statusFilter]
  );

  const totalWeight = filteredTasks.reduce((sum, task) => sum + task.netWeight, 0);
  const reviewCount = filteredTasks.filter((task) => task.status === 'review').length;
  const completedCount = filteredTasks.filter((task) => task.status === 'completed').length;
  const activeExceptions = exceptionCases.filter((item) => item.businessType === '封包' && item.status !== 'closed');

  return (
    <PageSectionLayout
      title="封包管理"
      description="管理封包单、封签码、封包复核和客户专包要求，把细筛后的结果沉淀成可出货的封包单位。"
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            封包单 {filteredTasks.length} 张
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            待复核 {reviewCount} 张
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已完成 {completedCount} 张
          </Badge>
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
            总重量 {totalWeight.toFixed(2)} ct
          </Badge>
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
            挂单异常 {activeExceptions.length} 条
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部封包', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        { key: 'pending', label: '待封包', active: statusFilter === 'pending', onClick: () => setStatusFilter('pending') },
        { key: 'packing', label: '封包中', active: statusFilter === 'packing', onClick: () => setStatusFilter('packing') },
        { key: 'review', label: '待复核', active: statusFilter === 'review', onClick: () => setStatusFilter('review') },
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
                  placeholder="搜索封包单号、封包号、客户名称..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'packing', 'review', 'completed'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]' : ''}
                  >
                    {status === 'all' ? '全部' : packingStatusConfig[status].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {filteredTasks.map((task, index) => (
            (() => {
              const relatedExceptions = activeExceptions.filter((item) => item.relatedNo === task.packingNo);
              const relatedHandover = handoverRecords.find((item) => item.relatedNo === task.packingNo || item.packageNo === task.packageNo);

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
                      <CardTitle className="text-lg">{task.packingNo}</CardTitle>
                      <p className="mt-2 text-sm text-gray-500">封包号：{task.packageNo}</p>
                    </div>
                    <Badge variant="outline" className={packingStatusConfig[task.status].className}>
                      {packingStatusConfig[task.status].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">封签码</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{task.sealCode}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">包装方式</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{task.packagingType}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <span>封包员：{task.assignedTo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      <span>复核人：{task.reviewedBy || '待复核'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-slate-400" />
                      <span>重量 / 粒数：{task.netWeight.toFixed(2)} ct / {task.stoneCount.toLocaleString()} 粒</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-slate-400" />
                      <span>包数：{task.packageCount} 包，客户：{task.targetCustomer}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Package2 className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500">封包备注</p>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{task.remarks}</p>
                  </div>
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
