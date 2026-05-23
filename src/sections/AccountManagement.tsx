import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, KeyRound, Plus, Shield, UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useStore } from '@/hooks/useStore';
import { ROLE_LABELS, type CreateAccountInput, type UserRole } from '@/types';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { toast } from 'sonner';

interface AccountManagementProps {
  onBack: () => void;
}

const roleOptions: UserRole[] = [
  'admin',
  'purchaser',
  'hk_receiver',
  'sz_receiver',
  'inspector',
  'sorter',
  'screening',
  'packer',
  'shipper',
  'finance',
];

const initialForm: CreateAccountInput = {
  username: '',
  name: '',
  role: 'inspector',
  department: '质检部',
  phone: '',
  title: '',
  password: '',
  wechatBound: false,
  corpWechatUserId: '',
  corpWechatDisplayName: '',
};

export default function AccountManagement({ onBack }: AccountManagementProps) {
  const currentUser = useStore((state) => state.currentUser);
  const accounts = useStore((state) => state.accounts);
  const systemSettings = useStore((state) => state.systemSettings);
  const createAccount = useStore((state) => state.createAccount);
  const updateAccount = useStore((state) => state.updateAccount);
  const resetAccountPassword = useStore((state) => state.resetAccountPassword);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState<CreateAccountInput>(initialForm);

  const filteredAccounts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return accounts;
    return accounts.filter(
      (account) =>
        account.username.toLowerCase().includes(keyword) ||
        account.name.toLowerCase().includes(keyword) ||
        account.department.toLowerCase().includes(keyword)
    );
  }, [accounts, searchKeyword]);

  const activeCount = accounts.filter((account) => account.status === 'active').length;
  const wechatBoundCount = accounts.filter((account) => account.wechatBound).length;
  const pendingWechatCount = accounts.filter((account) => !account.wechatBound).length;
  const adminCount = accounts.filter((account) => account.role === 'admin').length;

  const handleCreateAccount = () => {
    const result = createAccount(form);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setShowCreateDialog(false);
    setForm(initialForm);
  };

  const handleResetPassword = (accountId: string) => {
    const result = resetAccountPassword(accountId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(`${result.message}：${result.password}`);
  };

  const handleToggleStatus = (accountId: string, nextStatus: 'active' | 'disabled') => {
    updateAccount(accountId, { status: nextStatus });
    toast.success(nextStatus === 'active' ? '账号已启用' : '账号已停用');
  };

  const handleToggleWechatBinding = (accountId: string) => {
    const targetAccount = accounts.find((account) => account.id === accountId);

    if (!targetAccount) {
      toast.error('未找到对应账号');
      return;
    }

    if (targetAccount.wechatBound) {
      updateAccount(accountId, {
        wechatBound: false,
        corpWechatUserId: '',
        corpWechatDisplayName: '',
      });
      toast.success('已解除企业微信绑定预留');
      return;
    }

    if (!targetAccount.corpWechatUserId) {
      toast.error('请先填写企业微信用户ID，再执行绑定预留');
      return;
    }

    updateAccount(accountId, { wechatBound: true });
    toast.success('已标记为企业微信已绑定');
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
              <h1 className="text-xl font-bold text-[#1a1a1a]">账户管理</h1>
              <p className="text-sm text-gray-500">仅系统管理员可访问</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
              <Shield className="h-12 w-12 text-amber-500" />
              <div>
                <p className="text-lg font-semibold text-[#1a1a1a]">当前账号没有系统管理权限</p>
                <p className="mt-2 text-sm text-gray-500">请使用管理员账号登录，或联系管理员分配权限后再进入。</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <PageSectionLayout
      title="账户管理"
      description="管理员创建账号、分配角色、重置密码并维护启停用状态；当前已统一到内页头结构，后续可继续挂接角色权限和企业微信绑定流程。"
      actions={
        <Button className="gap-2 bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          新建账户
        </Button>
      }
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            账户总数 {accounts.length}
          </Badge>
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            已启用 {activeCount}
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            已绑定企微 {wechatBoundCount}
          </Badge>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
            待补绑 {pendingWechatCount}
          </Badge>
        </>
      }
      tabs={[
        { key: 'accounts', label: '员工账户', active: true },
        { key: 'roles', label: `管理员 ${adminCount}` },
        { key: 'wechat', label: '企微绑定' },
      ]}
    >
      <div className="space-y-6">
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { label: '账户总数', value: `${accounts.length}`, icon: Users, color: 'text-blue-500 bg-blue-50' },
            { label: '已启用账户', value: `${activeCount}`, icon: UserCog, color: 'text-green-500 bg-green-50' },
            { label: '已绑定企微', value: `${wechatBoundCount}`, icon: Shield, color: 'text-amber-500 bg-amber-50' },
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
                  <div className={`rounded-2xl p-4 ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#1a1a1a]">默认策略</p>
              <p className="mt-1 text-sm text-gray-500">
                初始密码为 `{systemSettings.defaultPassword}`，新建账户后默认要求首次修改密码，当前管理员数量 {adminCount} 个。
              </p>
              <p className="mt-2 text-sm text-gray-500">
                企微接入状态：{systemSettings.corpWechatIntegrationEnabled ? '已开启预留配置' : '暂未启用正式接入'}，
                交接强制实名：{systemSettings.forceWechatBindingForHandover ? '已开启' : '未开启'}。
              </p>
            </div>
            <div className="w-full md:w-72">
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索账号/姓名/部门"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredAccounts.map((account, index) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="border-0 shadow-md">
                <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-[#1a1a1a]">{account.name}</p>
                      <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                        {account.status === 'active' ? '启用中' : '已停用'}
                      </Badge>
                      <Badge variant="outline">{ROLE_LABELS[account.role]}</Badge>
                      {account.wechatBound ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">已绑定企微</Badge> : null}
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-500 md:grid-cols-2 xl:grid-cols-4">
                      <span>登录账号：{account.username}</span>
                      <span>所属部门：{account.department}</span>
                      <span>创建时间：{account.createdAt}</span>
                      <span>最近登录：{account.lastLoginAt || '未登录'}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-500 md:grid-cols-2 xl:grid-cols-3">
                      <span>企微用户ID：{account.corpWechatUserId || '未配置'}</span>
                      <span>企微显示名：{account.corpWechatDisplayName || '未配置'}</span>
                      <span>最近绑定：{account.lastWechatBindingAt || '未绑定'}</span>
                    </div>
                    {account.mustChangePassword ? (
                      <p className="mt-3 text-sm text-amber-600">该账号使用默认密码或已被重置，建议首次登录后立即修改密码。</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => handleResetPassword(account.id)}>
                      <KeyRound className="h-4 w-4" />
                      重置密码
                    </Button>
                    <Button
                      variant={account.status === 'active' ? 'outline' : 'default'}
                      onClick={() => handleToggleStatus(account.id, account.status === 'active' ? 'disabled' : 'active')}
                    >
                      {account.status === 'active' ? '停用账号' : '启用账号'}
                    </Button>
                    <Button variant="outline" onClick={() => handleToggleWechatBinding(account.id)}>
                      {account.wechatBound ? '解除企微绑定' : '标记企微已绑'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建员工账户</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">登录账号</label>
              <Input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} placeholder="例如：zhangsan" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">员工姓名</label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="请输入姓名" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">角色</label>
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">所属部门</label>
              <Input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="例如：质检部" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">岗位名称</label>
              <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="例如：班组长" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">联系电话</label>
              <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="请输入手机号" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">初始密码</label>
              <Input
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={`留空则使用默认密码 ${systemSettings.defaultPassword}`}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">企业微信用户ID</label>
              <Input
                value={form.corpWechatUserId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    corpWechatUserId: e.target.value,
                    wechatBound: Boolean(e.target.value.trim()),
                  }))
                }
                placeholder="未接正式企微前可先留空"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">企业微信显示名</label>
              <Input
                value={form.corpWechatDisplayName}
                onChange={(e) => setForm((prev) => ({ ...prev, corpWechatDisplayName: e.target.value }))}
                placeholder="例如：张检验员"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button className="bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]" onClick={handleCreateAccount}>
              创建账户
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageSectionLayout>
  );
}
