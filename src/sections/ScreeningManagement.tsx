import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BadgeCheck, Filter, Microscope, Search, UserRoundSearch, Weight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { useStore } from '@/hooks/useStore';
import type { ScreeningTask } from '@/types';

interface ScreeningManagementProps {
  initialSearchTerm?: string;
  onOpenExceptionCase?: (searchTerm?: string, statusFilter?: 'all' | 'pending' | 'processing' | 'resolved' | 'closed') => void;
  onOpenHandoverRecord?: (searchTerm: string) => void;
}

const screeningResultConfig: Record<ScreeningTask['result'], { label: string; className: string }> = {
  pending: { label: '待细筛', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  screening: { label: '细筛中', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  passed: { label: '已通过', className: 'bg-green-100 text-green-700 border-green-200' },
  recheck: { label: '待复筛', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  failed: { label: '未通过', className: 'bg-red-100 text-red-700 border-red-200' },
};

const gradeChangeLabel: Record<ScreeningTask['gradeChange'], string> = {
  up: '等级提升',
  same: '等级不变',
  down: '等级下降',
};

export default function ScreeningManagement({ initialSearchTerm = '', onOpenExceptionCase, onOpenHandoverRecord }: ScreeningManagementProps) {
  const screeningTasks = useStore((state) => state.screeningTasks);
  const handoverRecords = useStore((state) => state.handoverRecords);
  const exceptionCases = useStore((state) => state.exceptionCases);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [resultFilter, setResultFilter] = useState<ScreeningTask['result'] | 'all'>('all');

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const filteredTasks = useMemo(
    () =>
      screeningTasks.filter((task) => {
        const matchesSearch =
          task.screeningNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.sourceSortingNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.ruleName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesResult = resultFilter === 'all' || task.result === resultFilter;
        return matchesSearch && matchesResult;
      }),
    [screeningTasks, searchTerm, resultFilter]
  );

  const totalBeforeWeight = filteredTasks.reduce((sum, task) => sum + task.beforeWeight, 0);
  const totalAfterWeight = filteredTasks.reduce((sum, task) => sum + (task.afterWeight || 0), 0);
  const passedCount = filteredTasks.filter((task) => task.result === 'passed').length;
  const activeExceptions = exceptionCases.filter((item) => item.businessType === '细筛' && item.status !== 'closed');

  return (
    <PageSectionLayout
      title="细筛管理"
      description="管理细筛规则、筛前筛后数据、复检动作和等级变化，让封包前的质量结构有可核对的中间层。"
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            细筛单 {filteredTasks.length} 张
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            筛前重量 {totalBeforeWeight.toFixed(2)} ct
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已通过 {passedCount} 张
          </Badge>
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
            筛后重量 {totalAfterWeight.toFixed(2)} ct
          </Badge>
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
            挂单异常 {activeExceptions.length} 条
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部细筛', active: resultFilter === 'all', onClick: () => setResultFilter('all') },
        { key: 'pending', label: '待细筛', active: resultFilter === 'pending', onClick: () => setResultFilter('pending') },
        { key: 'screening', label: '细筛中', active: resultFilter === 'screening', onClick: () => setResultFilter('screening') },
        { key: 'passed', label: '已通过', active: resultFilter === 'passed', onClick: () => setResultFilter('passed') },
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
                  placeholder="搜索细筛单号、来源分选单、规则名称..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'screening', 'passed', 'recheck'] as const).map((result) => (
                  <Button
                    key={result}
                    variant={resultFilter === result ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResultFilter(result)}
                    className={resultFilter === result ? 'bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]' : ''}
                  >
                    {result === 'all' ? '全部' : screeningResultConfig[result].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredTasks.map((task, index) => (
            (() => {
              const relatedExceptions = activeExceptions.filter((item) => item.relatedNo === task.screeningNo);
              const relatedHandover = handoverRecords.find((item) => item.relatedNo === task.screeningNo);

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
                      <CardTitle className="text-lg">{task.screeningNo}</CardTitle>
                      <p className="mt-2 text-sm text-gray-500">来源分选单：{task.sourceSortingNo}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={screeningResultConfig[task.result].className}>
                        {screeningResultConfig[task.result].label}
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {gradeChangeLabel[task.gradeChange]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">细筛规则</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{task.ruleName}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">筛前重量</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{task.beforeWeight.toFixed(2)} ct</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">筛后重量</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {task.afterWeight ? `${task.afterWeight.toFixed(2)} ct` : '待完成'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                    <div className="flex items-center gap-2">
                      <Microscope className="h-4 w-4 text-slate-400" />
                      <span>计划日期：{task.scheduledDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRoundSearch className="h-4 w-4 text-slate-400" />
                      <span>细筛员：{task.assignedTo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-slate-400" />
                      <span>复检：{task.reviewBy || '待复检'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-slate-400" />
                      <span>筛前粒数：{task.beforeStoneCount.toLocaleString()} 粒</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500">细筛说明</p>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{task.notes}</p>
                  </div>
                  {relatedExceptions.length > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        当前挂有 {relatedExceptions.length} 条异常单
                      </div>
                      <p className="mt-2">{relatedExceptions[0].title}，最新动作：{relatedExceptions[0].latestAction}</p>
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
