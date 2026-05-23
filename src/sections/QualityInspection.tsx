import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Scale,
  Hash,
  User,
  Clock,
  QrCode,
  Save,
  Plus,
  Minus,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/hooks/useStore';
import type { Order, QualityIssue } from '@/types';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import gsap from 'gsap';

const qualityIssueTypes = [
  { type: 'color_deviation', label: '色泽偏差', description: '钻石颜色与标准不符' },
  { type: 'clarity_issue', label: '净度问题', description: '内含物超出允许范围' },
  { type: 'cut_defect', label: '切工缺陷', description: '切工比例不达标' },
  { type: 'weight_deviation', label: '重量偏差', description: '实际重量与标注重差>3%' },
  { type: 'synthetic_suspect', label: '合成嫌疑', description: '疑似合成钻石' },
  { type: 'treatment_detected', label: '处理痕迹', description: '发现优化处理痕迹' },
  { type: 'chipping', label: '破损缺口', description: '钻石表面有破损或缺口' },
  { type: 'other', label: '其他问题', description: '其他质量问题' },
];

export default function QualityInspection() {
  const { orders, qualityRecords, addQualityRecord, updateOrderStatus } = useStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [inspectResult, setInspectResult] = useState<'passed' | 'failed' | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [note, setNote] = useState('');
  const conveyorRef = useRef<HTMLDivElement>(null);

  const inspectingOrders = orders.filter((o) => o.status === 'inspecting');

  useEffect(() => {
    // 传送带动画
    if (conveyorRef.current) {
      const cards = conveyorRef.current.querySelectorAll('.package-card');
      gsap.fromTo(
        cards,
        { x: 100, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
        }
      );
    }
  }, [inspectingOrders]);

  const handleInspect = (order: Order) => {
    setSelectedOrder(order);
    setShowInspectModal(true);
    setInspectResult(null);
    setIssues([]);
    setNote('');
  };

  const addIssue = (type: string, description: string) => {
    const existingIssue = issues.find((i) => i.type === type);
    if (existingIssue) {
      setIssues(issues.map((i) => (i.type === type ? { ...i, count: i.count + 1 } : i)));
    } else {
      setIssues([...issues, { type, description, count: 1 }]);
    }
  };

  const removeIssue = (type: string) => {
    const existingIssue = issues.find((i) => i.type === type);
    if (existingIssue && existingIssue.count > 1) {
      setIssues(issues.map((i) => (i.type === type ? { ...i, count: i.count - 1 } : i)));
    } else {
      setIssues(issues.filter((i) => i.type !== type));
    }
  };

  const submitInspection = () => {
    if (selectedOrder && inspectResult) {
      const record = {
        id: Date.now().toString(),
        orderId: selectedOrder.id,
        packageNo: selectedOrder.packageNo || '',
        result: inspectResult,
        issues: inspectResult === 'failed' ? issues : undefined,
        inspector: '张检验员',
        inspectTime: new Date().toISOString(),
        netWeight: selectedOrder.netWeight,
        stoneCount: selectedOrder.stoneCount,
      };
      addQualityRecord(record);
      updateOrderStatus(selectedOrder.id, inspectResult === 'passed' ? 'completed' : 'exception');
      setShowInspectModal(false);
      setShowQRModal(true);
    }
  };

  return (
    <PageSectionLayout
      title="质检流程"
      description="处理钻石质量检验、问题录入和结果判定；统一页头后，后续可继续扩展复检、异常归档和扫码确认等二级内容。"
      stats={
        <>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            检验中 {inspectingOrders.length} 单
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            最近记录 {qualityRecords.length} 条
          </Badge>
        </>
      }
      tabs={[
        { key: 'pending', label: '待检封包', active: true },
        { key: 'records', label: '检验记录' },
        { key: 'issues', label: '质量问题' },
      ]}
    >
      <div className="space-y-8">
        {/* 传送带区域 */}
        <Card className="border-0 shadow-lg mb-8 overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-[#c9a962]/10 to-transparent">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-[#c9a962]" />
              待检封包传送带
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {inspectingOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无待检验订单</p>
                <p className="text-sm text-gray-400 mt-1">请先在订单管理中接收订单</p>
              </div>
            ) : (
              <div
                ref={conveyorRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
              >
                {inspectingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    className="package-card flex-shrink-0 w-72"
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  >
                    <Card className="border-2 border-[#c9a962]/30 hover:border-[#c9a962] transition-colors cursor-pointer bg-gradient-to-br from-white to-[#c9a962]/5"
                      onClick={() => handleInspect(order)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30">
                            {order.packageNo}
                          </Badge>
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Scale className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">净重:</span>
                            <span className="font-medium">{order.netWeight}ct</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">粒数:</span>
                            <span className="font-medium">{order.stoneCount}粒</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">检验员:</span>
                            <span className="font-medium">{order.inspector}</span>
                          </div>
                        </div>
                        <Button
                          className="w-full mt-4 bg-[#c9a962] hover:bg-[#b08d52] text-white"
                          size="sm"
                        >
                          开始检验
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近检验记录 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#c9a962]" />
              最近检验记录
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      封包号
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      检验结果
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      问题数量
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      检验员
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      检验时间
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {qualityRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        暂无检验记录
                      </td>
                    </tr>
                  ) : (
                    qualityRecords.map((record) => (
                      <motion.tr
                        key={record.id}
                        className="hover:bg-gray-50 transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="bg-[#c9a962]/10 text-[#c9a962]">
                            {record.packageNo}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {record.result === 'passed' ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              合格
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" />
                              不合格
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {record.issues ? (
                            <span className="text-red-600 font-medium">
                              {record.issues.reduce((sum, i) => sum + i.count, 0)} 项
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{record.inspector}</td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(record.inspectTime).toLocaleString()}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 检验弹窗 */}
      <Dialog open={showInspectModal} onOpenChange={() => setShowInspectModal(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#c9a962]" />
              质量检验 - {selectedOrder?.packageNo}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* 订单信息 */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">净石重</p>
                  <p className="text-lg font-medium">{selectedOrder.netWeight}ct</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">粒数</p>
                  <p className="text-lg font-medium">{selectedOrder.stoneCount}粒</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">供应商</p>
                  <p className="text-lg font-medium">{selectedOrder.supplier}</p>
                </div>
              </div>

              {/* 检验结果选择 */}
              <div>
                <Label className="text-base font-medium mb-3 block">检验结果</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setInspectResult('passed')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      inspectResult === 'passed'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <CheckCircle2 className={`w-8 h-8 mx-auto mb-2 ${inspectResult === 'passed' ? 'text-green-500' : 'text-gray-400'}`} />
                    <p className={`font-medium ${inspectResult === 'passed' ? 'text-green-700' : 'text-gray-600'}`}>合格</p>
                  </button>
                  <button
                    onClick={() => setInspectResult('failed')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      inspectResult === 'failed'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <XCircle className={`w-8 h-8 mx-auto mb-2 ${inspectResult === 'failed' ? 'text-red-500' : 'text-gray-400'}`} />
                    <p className={`font-medium ${inspectResult === 'failed' ? 'text-red-700' : 'text-gray-600'}`}>不合格</p>
                  </button>
                </div>
              </div>

              {/* 不合格问题录入 */}
              <AnimatePresence>
                {inspectResult === 'failed' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <Label className="text-base font-medium text-red-700">质量问题录入</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {qualityIssueTypes.map((issue) => {
                          const existingIssue = issues.find((i) => i.type === issue.type);
                          return (
                            <div
                              key={issue.type}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100"
                            >
                              <div>
                                <p className="font-medium text-gray-700">{issue.label}</p>
                                <p className="text-xs text-gray-500">{issue.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => removeIssue(issue.type)}
                                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                  disabled={!existingIssue}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-8 text-center font-medium">
                                  {existingIssue?.count || 0}
                                </span>
                                <button
                                  onClick={() => addIssue(issue.type, issue.label)}
                                  className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 备注 */}
              <div>
                <Label className="text-base font-medium mb-2 block">备注</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="请输入检验备注..."
                  className="min-h-[100px]"
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowInspectModal(false)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-[#c9a962] hover:bg-[#b08d52] text-white gap-2"
                  onClick={submitInspection}
                  disabled={!inspectResult || (inspectResult === 'failed' && issues.length === 0)}
                >
                  <Save className="w-4 h-4" />
                  提交检验结果
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 扫码确认弹窗 */}
      <Dialog open={showQRModal} onOpenChange={() => setShowQRModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#c9a962]" />
              扫码确认交货
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="relative inline-block mb-6">
              <div className="w-56 h-56 bg-[#1a1a1a] rounded-xl p-3 mx-auto relative overflow-hidden">
                <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-7 gap-1 p-3">
                    {[...Array(49)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 ${Math.random() > 0.5 ? 'bg-[#1a1a1a]' : 'bg-white'}`}
                      />
                    ))}
                  </div>
                </div>
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a962] to-transparent"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <motion.div
                className="absolute inset-0 border-2 border-[#c9a962] rounded-xl"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <p className="text-gray-600 mb-2">请使用微信扫描二维码确认交货</p>
            <p className="text-sm text-gray-400 mb-4">
              封包: {qualityRecords[qualityRecords.length - 1]?.packageNo}
            </p>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
              <div className="flex items-center gap-2 justify-center text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">检验结果已提交</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                {qualityRecords[qualityRecords.length - 1]?.result === 'passed' ? '合格' : '不合格'}
              </p>
            </div>
            <Button
              onClick={() => setShowQRModal(false)}
              className="bg-[#c9a962] hover:bg-[#b08d52] text-white w-full"
            >
              完成
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
