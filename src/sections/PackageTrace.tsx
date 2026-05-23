import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Search,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Diamond,
  FlaskConical,
  Warehouse,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStore } from '@/hooks/useStore';
import type { PackageTrace } from '@/types';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import gsap from 'gsap';

const stageIcons: Record<string, React.ElementType> = {
  '入库钻仓': Warehouse,
  '全检钻仓': Diamond,
  '仪器检测': FlaskConical,
  '成品入库': Package,
};

const stageColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500 border-gray-200',
  processing: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
};

export default function PackageTracePage() {
  const { packageTraces, orders, qualityRecords } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrace, setSelectedTrace] = useState<PackageTrace | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 时间线动画
    if (timelineRef.current && selectedTrace) {
      const path = timelineRef.current.querySelector('.timeline-path');
      const nodes = timelineRef.current.querySelectorAll('.timeline-node');

      if (path) {
        gsap.fromTo(
          path,
          { strokeDashoffset: 1000 },
          { strokeDashoffset: 0, duration: 1.5, ease: 'power2.out' }
        );
      }

      gsap.fromTo(
        nodes,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, stagger: 0.2, ease: 'back.out(1.7)', delay: 0.5 }
      );
    }
  }, [selectedTrace]);

  const filteredTraces = packageTraces.filter(
    (trace) =>
      trace.packageNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trace.orderId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOrderInfo = (orderId: string) => {
    return orders.find((o) => o.id === orderId);
  };

  const getQualityInfo = (packageNo: string) => {
    return qualityRecords.find((r) => r.packageNo === packageNo);
  };

  return (
    <PageSectionLayout
      title="封包追踪"
      description="查看封包全流程数据追踪，后续可继续扩展批次追踪、交接节点和流程回看。"
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            封包总数 {filteredTraces.length}
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            进行中 {filteredTraces.filter((trace) => trace.steps.some((s) => s.status === 'processing')).length}
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部封包', active: true },
        { key: 'running', label: '进行中' },
        { key: 'done', label: '已完成' },
      ]}
    >
      <div className="space-y-6">
        {/* 搜索栏 */}
        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索封包号、订单号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* 封包列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTraces.map((trace, index) => {
            const order = getOrderInfo(trace.orderId);
            const qualityInfo = getQualityInfo(trace.packageNo);
            const currentStage = trace.steps.find((s) => s.status === 'processing');
            const completedSteps = trace.steps.filter((s) => s.status === 'completed').length;

            return (
              <motion.div
                key={trace.packageNo}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <Card
                  className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow overflow-hidden"
                  onClick={() => setSelectedTrace(trace)}
                >
                  <div className="h-2 bg-gradient-to-r from-[#c9a962] via-amber-400 to-[#c9a962]" />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30">
                        {trace.packageNo}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <TrendingUp className="w-4 h-4" />
                        <span>{completedSteps}/{trace.steps.length}</span>
                      </div>
                    </div>

                    {order && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">净石重:</span>
                          <span className="font-medium">{order.netWeight}ct</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">粒数:</span>
                          <span className="font-medium">{order.stoneCount}粒</span>
                        </div>
                      </div>
                    )}

                    {/* 进度条 */}
                    <div className="mb-4">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#c9a962] to-amber-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${(completedSteps / trace.steps.length) * 100}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                        />
                      </div>
                    </div>

                    {/* 当前状态 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {currentStage ? (
                          <>
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                            </div>
                            <span className="text-sm font-medium text-amber-700">{currentStage.stage}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-green-700">已完成</span>
                          </>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-[#c9a962] hover:text-[#b08d52] hover:bg-[#c9a962]/10 gap-1">
                        查看详情
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* 质检结果摘要 */}
                    {qualityInfo && (
                      <div className={`mt-4 p-3 rounded-lg ${qualityInfo.result === 'passed' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2">
                          {qualityInfo.result === 'passed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-red-600" />
                          )}
                          <span className={`text-sm font-medium ${qualityInfo.result === 'passed' ? 'text-green-700' : 'text-red-700'}`}>
                            质检{qualityInfo.result === 'passed' ? '合格' : '不合格'}
                            {qualityInfo.issues && ` (${qualityInfo.issues.reduce((s, i) => s + i.count, 0)}项问题)`}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 封包详情弹窗 */}
      <Dialog open={!!selectedTrace} onOpenChange={() => setSelectedTrace(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#c9a962]" />
              封包流程详情 - {selectedTrace?.packageNo}
            </DialogTitle>
          </DialogHeader>

          {selectedTrace && (
            <div className="space-y-6" ref={timelineRef}>
              {/* 基本信息 */}
              {getOrderInfo(selectedTrace.orderId) && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">净石重</p>
                    <p className="text-lg font-medium">{getOrderInfo(selectedTrace.orderId)?.netWeight}ct</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">粒数</p>
                    <p className="text-lg font-medium">{getOrderInfo(selectedTrace.orderId)?.stoneCount}粒</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">供应商</p>
                    <p className="text-lg font-medium">{getOrderInfo(selectedTrace.orderId)?.supplier}</p>
                  </div>
                </div>
              )}

              {/* 时间线 */}
              <div className="relative">
                {/* 连接线 */}
                <svg
                  className="absolute left-8 top-0 h-full w-1"
                  style={{ zIndex: 0 }}
                >
                  <line
                    x1="2"
                    y1="0"
                    x2="2"
                    y2="100%"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                  <motion.line
                    className="timeline-path"
                    x1="2"
                    y1="0"
                    x2="2"
                    y2="100%"
                    stroke="#c9a962"
                    strokeWidth="2"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                  />
                </svg>

                {/* 节点 */}
                <div className="space-y-6 relative z-10">
                  {selectedTrace.steps.map((step, index) => {
                    const Icon = stageIcons[step.stage] || Package;
                    return (
                      <motion.div
                        key={step.stage}
                        className="timeline-node flex items-start gap-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                      >
                        {/* 节点图标 */}
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                            step.status === 'completed'
                              ? 'bg-green-100 border-green-500'
                              : step.status === 'processing'
                              ? 'bg-amber-100 border-amber-500'
                              : 'bg-gray-100 border-gray-300'
                          }`}
                        >
                          <Icon
                            className={`w-7 h-7 ${
                              step.status === 'completed'
                                ? 'text-green-600'
                                : step.status === 'processing'
                                ? 'text-amber-600'
                                : 'text-gray-400'
                            }`}
                          />
                        </div>

                        {/* 节点内容 */}
                        <div
                          className={`flex-1 p-4 rounded-xl border ${
                            step.status === 'completed'
                              ? 'bg-green-50 border-green-200'
                              : step.status === 'processing'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-lg">{step.stage}</h3>
                            <Badge className={stageColors[step.status]}>
                              {step.status === 'completed' ? '已完成' : step.status === 'processing' ? '进行中' : '待处理'}
                            </Badge>
                          </div>

                          {step.timestamp && (
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(step.timestamp).toLocaleString()}
                              </span>
                              {step.operator && (
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {step.operator}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 阶段数据 */}
                          {step.data && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                              <div className="grid grid-cols-2 gap-3">
                                {step.data.netWeight !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">净石重:</span>
                                    <span className="font-medium">{step.data.netWeight}ct</span>
                                  </div>
                                )}
                                {step.data.stoneCount !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">粒数:</span>
                                    <span className="font-medium">{step.data.stoneCount}粒</span>
                                  </div>
                                )}
                                {step.data.passed !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">合格:</span>
                                    <span className="font-medium text-green-600">{step.data.passed}粒</span>
                                  </div>
                                )}
                                {step.data.failed !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">不合格:</span>
                                    <span className="font-medium text-red-600">{step.data.failed}粒</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* 质检详情 */}
              {getQualityInfo(selectedTrace.packageNo) && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Diamond className="w-5 h-5 text-[#c9a962]" />
                    质检详情
                  </h3>
                  {(() => {
                    const quality = getQualityInfo(selectedTrace.packageNo);
                    if (!quality) return null;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">检验结果:</span>
                          <Badge className={quality.result === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {quality.result === 'passed' ? '合格' : '不合格'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">检验员:</span>
                          <span>{quality.inspector}</span>
                        </div>
                        {quality.issues && quality.issues.length > 0 && (
                          <div className="mt-3">
                            <span className="text-gray-500">问题列表:</span>
                            <div className="mt-2 space-y-1">
                              {quality.issues.map((issue, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                                  <span>{issue.description}</span>
                                  <Badge variant="outline" className="bg-red-100 text-red-700">
                                    {issue.count} 项
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
