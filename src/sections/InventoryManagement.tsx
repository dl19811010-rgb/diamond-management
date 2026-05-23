import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Scale, CheckCircle2, Clock, ArrowRight, AlertTriangle, Warehouse, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStore } from '@/hooks/useStore';
import type { Inventory } from '@/types';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import gsap from 'gsap';

const getStatusConfig = (status: Inventory['status']) => {
  const configs = {
    pending_test: {
      label: '待分选',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Clock,
    },
    testing: {
      label: '分选中',
      className: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: Package,
    },
    passed: {
      label: '可用库存',
      className: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle2,
    },
    failed: {
      label: '异常冻结',
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: AlertTriangle,
    },
  };
  return configs[status];
};

export default function InventoryManagement() {
  const inventory = useStore((state) => state.inventory);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Inventory['status'] | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.inventory-card');
      gsap.fromTo(cards, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' });
    }
  }, [inventory.length]);

  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const keyword = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !keyword ||
          item.packageNo.toLowerCase().includes(keyword) ||
          item.location.toLowerCase().includes(keyword) ||
          item.sourceBatchNo?.toLowerCase().includes(keyword) ||
          item.sourceReceiptNo?.toLowerCase().includes(keyword);
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [inventory, searchTerm, statusFilter]
  );

  const stats = {
    total: inventory.reduce((sum, i) => sum + i.stoneCount, 0),
    totalWeight: inventory.reduce((sum, i) => sum + i.netWeight, 0),
    pending: inventory.filter((i) => i.status === 'pending_test').length,
    testing: inventory.filter((i) => i.status === 'testing').length,
    passed: inventory.filter((i) => i.status === 'passed').length,
    failed: inventory.filter((i) => i.status === 'failed').length,
  };

  return (
    <PageSectionLayout
      title="库存管理"
      description="查看由收货单入账后的库存包、来源批次、来源收货单和当前库位，作为收货进入分选与后续配货的中间台账。"
      actions={
        <>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            导出
          </Button>
          <Button className="gap-2 bg-[#c9a962] hover:bg-[#b08d52] text-white">
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </>
      }
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            待分选 {stats.pending} 包
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            分选中 {stats.testing} 包
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            可用库存 {stats.passed} 包
          </Badge>
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            异常冻结 {stats.failed} 包
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部库存', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        { key: 'pending_test', label: '待分选', active: statusFilter === 'pending_test', onClick: () => setStatusFilter('pending_test') },
        { key: 'testing', label: '分选中', active: statusFilter === 'testing', onClick: () => setStatusFilter('testing') },
        { key: 'passed', label: '可用库存', active: statusFilter === 'passed', onClick: () => setStatusFilter('passed') },
        { key: 'failed', label: '异常冻结', active: statusFilter === 'failed', onClick: () => setStatusFilter('failed') },
      ]}
    >
      <div className="space-y-8">
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4" ref={cardsRef}>
          <Card className="inventory-card border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">库存总量</p>
                  <p className="text-2xl font-bold">{stats.total} 粒</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a962]/10">
                  <Package className="w-6 h-6 text-[#c9a962]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="inventory-card border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总重量</p>
                  <p className="text-2xl font-bold">{stats.totalWeight.toFixed(2)} ct</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <Scale className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="inventory-card border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">待派工/处理中</p>
                  <p className="text-2xl font-bold">{stats.pending + stats.testing}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="inventory-card border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">可用/冻结</p>
                  <p className="text-2xl font-bold">{stats.passed + stats.failed}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 w-5 h-5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索库存包号、来源批次、收货单号、库位..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'pending_test', label: '待分选' },
                  { key: 'testing', label: '分选中' },
                  { key: 'passed', label: '可用' },
                  { key: 'failed', label: '冻结' },
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={statusFilter === filter.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(filter.key as Inventory['status'] | 'all')}
                    className={statusFilter === filter.key ? 'bg-[#c9a962] hover:bg-[#b08d52]' : ''}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-[#c9a962]" />
                库存列表
              </span>
              <span className="text-sm font-normal text-gray-500">共 {filteredInventory.length} 条记录</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">库存包号</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">来源批次</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">重量 / 粒数</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">库位</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">来源收货单</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.map((item, index) => {
                    const statusConfig = getStatusConfig(item.status);
                    return (
                      <motion.tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-[#c9a962]" />
                            <span className="font-medium text-[#1a1a1a]">{item.packageNo}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{item.sourceBatchNo || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{item.netWeight} ct / {item.stoneCount} 粒</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`${statusConfig.className} flex w-fit items-center gap-1`}>
                            <statusConfig.icon className="w-3 h-3" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{item.location}</td>
                        <td className="px-6 py-4 text-gray-600">{item.sourceReceiptNo || '历史库存'}</td>
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            className="gap-1 text-[#c9a962] hover:bg-[#c9a962]/10 hover:text-[#b08d52]"
                          >
                            详情
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#c9a962]" />
              库存详情 - {selectedItem?.packageNo}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">净石重</p>
                  <p className="text-xl font-bold">{selectedItem.netWeight} ct</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">粒数</p>
                  <p className="text-xl font-bold">{selectedItem.stoneCount} 粒</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p className="mb-2 text-sm text-gray-500">当前状态</p>
                {(() => {
                  const config = getStatusConfig(selectedItem.status);
                  return (
                    <Badge className={`${config.className} px-4 py-2 text-lg`}>
                      <config.icon className="mr-2 w-5 h-5" />
                      {config.label}
                    </Badge>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">来源批次</p>
                  <p className="font-medium text-lg">{selectedItem.sourceBatchNo || '历史库存'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">来源收货单</p>
                  <p className="font-medium">{selectedItem.sourceReceiptNo || '无'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">库位</p>
                  <p className="font-medium text-lg">{selectedItem.location}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-1 text-sm text-gray-500">入账时间</p>
                  <p className="font-medium">{selectedItem.entryTime}</p>
                </div>
              </div>

              <div className="rounded-lg border border-[#c9a962]/30 bg-gradient-to-r from-[#c9a962]/10 to-transparent p-4">
                <p className="mb-2 text-sm font-medium text-[#c9a962]">来源说明</p>
                <p className="text-sm leading-6 text-gray-700">
                  {selectedItem.remark || `该库存项来源于 ${selectedItem.sourceSiteName || '仓内处理'}，可继续进入分选、筛选与后续配货流程。`}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
