import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Settings2, ShieldCheck, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useStore } from '@/hooks/useStore';
import type { NumberingRules, SystemSettings as SystemSettingsType } from '@/types';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { toast } from 'sonner';

interface SystemSettingsProps {
  onBack: () => void;
}

type EditableSettings = Omit<SystemSettingsType, 'warehouseSites' | 'stoneCategories' | 'qualityGrades' | 'exceptionTypes' | 'numberingRules'>;

export default function SystemSettings({ onBack }: SystemSettingsProps) {
  const currentUser = useStore((state) => state.currentUser);
  const systemSettings = useStore((state) => state.systemSettings);
  const updateSystemSettings = useStore((state) => state.updateSystemSettings);
  const updateNumberingRules = useStore((state) => state.updateNumberingRules);

  const [baseSettings, setBaseSettings] = useState<EditableSettings>({
    companyName: systemSettings.companyName,
    systemName: systemSettings.systemName,
    version: systemSettings.version,
    supportContact: systemSettings.supportContact,
    defaultPassword: systemSettings.defaultPassword,
    allowRememberMe: systemSettings.allowRememberMe,
    corpWechatIntegrationEnabled: systemSettings.corpWechatIntegrationEnabled,
    forceWechatBindingForHandover: systemSettings.forceWechatBindingForHandover,
    enableOperationLog: systemSettings.enableOperationLog,
    corpWechatAppName: systemSettings.corpWechatAppName,
    corpWechatCorpId: systemSettings.corpWechatCorpId,
    corpWechatAgentId: systemSettings.corpWechatAgentId,
    corpWechatCallbackUrl: systemSettings.corpWechatCallbackUrl,
    autoCreateTransitExceptionOnDelay: systemSettings.autoCreateTransitExceptionOnDelay,
    autoCreateHandoverExceptionOnPendingConfirm: systemSettings.autoCreateHandoverExceptionOnPendingConfirm,
    autoCreateExceptionOnWechatUnbound: systemSettings.autoCreateExceptionOnWechatUnbound,
    autoCreatePackingExceptionOnStatus: systemSettings.autoCreatePackingExceptionOnStatus,
  });
  const [warehouseSites, setWarehouseSites] = useState(systemSettings.warehouseSites.join('，'));
  const [stoneCategories, setStoneCategories] = useState(systemSettings.stoneCategories.join('，'));
  const [qualityGrades, setQualityGrades] = useState(systemSettings.qualityGrades.join('，'));
  const [exceptionTypes, setExceptionTypes] = useState(systemSettings.exceptionTypes.join('，'));
  const [numberingRules, setNumberingRules] = useState<NumberingRules>(systemSettings.numberingRules);

  useEffect(() => {
    setBaseSettings({
      companyName: systemSettings.companyName,
      systemName: systemSettings.systemName,
      version: systemSettings.version,
      supportContact: systemSettings.supportContact,
      defaultPassword: systemSettings.defaultPassword,
      allowRememberMe: systemSettings.allowRememberMe,
      corpWechatIntegrationEnabled: systemSettings.corpWechatIntegrationEnabled,
      forceWechatBindingForHandover: systemSettings.forceWechatBindingForHandover,
      enableOperationLog: systemSettings.enableOperationLog,
      corpWechatAppName: systemSettings.corpWechatAppName,
      corpWechatCorpId: systemSettings.corpWechatCorpId,
      corpWechatAgentId: systemSettings.corpWechatAgentId,
      corpWechatCallbackUrl: systemSettings.corpWechatCallbackUrl,
      autoCreateTransitExceptionOnDelay: systemSettings.autoCreateTransitExceptionOnDelay,
      autoCreateHandoverExceptionOnPendingConfirm: systemSettings.autoCreateHandoverExceptionOnPendingConfirm,
      autoCreateExceptionOnWechatUnbound: systemSettings.autoCreateExceptionOnWechatUnbound,
      autoCreatePackingExceptionOnStatus: systemSettings.autoCreatePackingExceptionOnStatus,
    });
    setWarehouseSites(systemSettings.warehouseSites.join('，'));
    setStoneCategories(systemSettings.stoneCategories.join('，'));
    setQualityGrades(systemSettings.qualityGrades.join('，'));
    setExceptionTypes(systemSettings.exceptionTypes.join('，'));
    setNumberingRules(systemSettings.numberingRules);
  }, [systemSettings]);

  const splitTags = (value: string) =>
    value
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const handleSave = () => {
    updateSystemSettings({
      ...baseSettings,
      warehouseSites: splitTags(warehouseSites),
      stoneCategories: splitTags(stoneCategories),
      qualityGrades: splitTags(qualityGrades),
      exceptionTypes: splitTags(exceptionTypes),
    });
    updateNumberingRules(numberingRules);
    toast.success('系统设置已保存');
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#1a1a1a]">系统设置</h1>
              <p className="text-sm text-gray-500">仅系统管理员可访问</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
              <ShieldCheck className="h-12 w-12 text-amber-500" />
              <div>
                <p className="text-lg font-semibold text-[#1a1a1a]">当前账号没有系统设置权限</p>
                <p className="mt-2 text-sm text-gray-500">请使用管理员账号登录后再维护基础设置和系统规则。</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <PageSectionLayout
      title="系统设置"
      description="维护公司基础信息、默认密码、扫码规则和编号规则；统一页头后，后续可以继续扩展打印模板、消息配置和流程前置条件。"
      actions={
        <Button className="bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={handleSave}>
          保存设置
        </Button>
      }
      stats={
        <>
          <Button variant="outline" size="sm" className="pointer-events-none">
            仓位 {systemSettings.warehouseSites.length}
          </Button>
          <Button variant="outline" size="sm" className="pointer-events-none">
            石种 {systemSettings.stoneCategories.length}
          </Button>
          <Button variant="outline" size="sm" className="pointer-events-none">
            异常类型 {systemSettings.exceptionTypes.length}
          </Button>
        </>
      }
      tabs={[
        { key: 'base', label: '基础信息', active: true },
        { key: 'rules', label: '流程规则' },
        { key: 'numbering', label: '编号规则' },
      ]}
    >
      <div className="space-y-6">
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { label: '仓位数量', value: systemSettings.warehouseSites.length, icon: Warehouse },
            { label: '石种类别', value: systemSettings.stoneCategories.length, icon: Settings2 },
            { label: '异常类型', value: systemSettings.exceptionTypes.length, icon: ShieldCheck },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm text-gray-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#1a1a1a]">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-[#c9a962]/10 p-4 text-[#c9a962]">
                    <item.icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>基础信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">公司名称</label>
                <Input value={baseSettings.companyName} onChange={(e) => setBaseSettings((prev) => ({ ...prev, companyName: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">系统名称</label>
                <Input value={baseSettings.systemName} onChange={(e) => setBaseSettings((prev) => ({ ...prev, systemName: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">版本号</label>
                <Input value={baseSettings.version} onChange={(e) => setBaseSettings((prev) => ({ ...prev, version: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">技术支持</label>
                <Input value={baseSettings.supportContact} onChange={(e) => setBaseSettings((prev) => ({ ...prev, supportContact: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">默认初始密码</label>
                <Input value={baseSettings.defaultPassword} onChange={(e) => setBaseSettings((prev) => ({ ...prev, defaultPassword: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>流程与登录规则</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: '允许记住我',
                  checked: baseSettings.allowRememberMe,
                  key: 'allowRememberMe',
                },
                {
                  label: '启用企业微信接入预留',
                  checked: baseSettings.corpWechatIntegrationEnabled,
                  key: 'corpWechatIntegrationEnabled',
                },
                {
                  label: '交接动作强制企业微信绑定',
                  checked: baseSettings.forceWechatBindingForHandover,
                  key: 'forceWechatBindingForHandover',
                },
                {
                  label: '启用操作日志留痕',
                  checked: baseSettings.enableOperationLog,
                  key: 'enableOperationLog',
                },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-[#1a1a1a]">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) =>
                      setBaseSettings((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>企业微信预留</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">应用名称</label>
                <Input value={baseSettings.corpWechatAppName} onChange={(e) => setBaseSettings((prev) => ({ ...prev, corpWechatAppName: e.target.value }))} placeholder="例如：钻石ERP交接助手" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">企业 ID</label>
                <Input value={baseSettings.corpWechatCorpId} onChange={(e) => setBaseSettings((prev) => ({ ...prev, corpWechatCorpId: e.target.value }))} placeholder="正式接入后填写 corpid" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">应用 AgentId</label>
                <Input value={baseSettings.corpWechatAgentId} onChange={(e) => setBaseSettings((prev) => ({ ...prev, corpWechatAgentId: e.target.value }))} placeholder="正式接入后填写 agentid" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">回调地址预留</label>
                <Input value={baseSettings.corpWechatCallbackUrl} onChange={(e) => setBaseSettings((prev) => ({ ...prev, corpWechatCallbackUrl: e.target.value }))} placeholder="例如：https://erp.example.com/callback/wecom" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>基础资料</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">仓位与库区</label>
                <Input value={warehouseSites} onChange={(e) => setWarehouseSites(e.target.value)} placeholder="多个值用逗号分隔" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">石种类别</label>
                <Input value={stoneCategories} onChange={(e) => setStoneCategories(e.target.value)} placeholder="例如：小厘石，小份石" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">品质等级</label>
                <Input value={qualityGrades} onChange={(e) => setQualityGrades(e.target.value)} placeholder="例如：A，B，C，待复检" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">异常类型</label>
                <Input value={exceptionTypes} onChange={(e) => setExceptionTypes(e.target.value)} placeholder="例如：重量差异，扫码失败" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>自动异常规则</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: '在途延误或异常时自动建异常单',
                  checked: baseSettings.autoCreateTransitExceptionOnDelay,
                  key: 'autoCreateTransitExceptionOnDelay',
                },
                {
                  label: '交接待确认时自动建扫码异常单',
                  checked: baseSettings.autoCreateHandoverExceptionOnPendingConfirm,
                  key: 'autoCreateHandoverExceptionOnPendingConfirm',
                },
                {
                  label: '缺少企微实名绑定时自动建异常单',
                  checked: baseSettings.autoCreateExceptionOnWechatUnbound,
                  key: 'autoCreateExceptionOnWechatUnbound',
                },
                {
                  label: '封包进入异常状态时自动建异常单',
                  checked: baseSettings.autoCreatePackingExceptionOnStatus,
                  key: 'autoCreatePackingExceptionOnStatus',
                },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-[#1a1a1a]">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) =>
                      setBaseSettings((prev) => ({
                        ...prev,
                        [item.key]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>编号规则</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">采购单前缀</label>
                <Input value={numberingRules.purchasePrefix} onChange={(e) => setNumberingRules((prev) => ({ ...prev, purchasePrefix: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">批次前缀</label>
                <Input value={numberingRules.batchPrefix} onChange={(e) => setNumberingRules((prev) => ({ ...prev, batchPrefix: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">封包前缀</label>
                <Input value={numberingRules.packagePrefix} onChange={(e) => setNumberingRules((prev) => ({ ...prev, packagePrefix: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">交接单前缀</label>
                <Input value={numberingRules.handoverPrefix} onChange={(e) => setNumberingRules((prev) => ({ ...prev, handoverPrefix: e.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">出货单前缀</label>
                <Input value={numberingRules.shipmentPrefix} onChange={(e) => setNumberingRules((prev) => ({ ...prev, shipmentPrefix: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageSectionLayout>
  );
}
