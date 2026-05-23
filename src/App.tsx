import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/hooks/useStore';
import LoginPage from '@/sections/LoginPage';
import Dashboard from '@/sections/Dashboard';
import OrderManagement from '@/sections/OrderManagement';
import ReceiptManagement from '@/sections/ReceiptManagement';
import QualityInspection from '@/sections/QualityInspection';
import ScanConfirmation from '@/sections/ScanConfirmation';
import PackageTrace from '@/sections/PackageTrace';
import InventoryManagement from '@/sections/InventoryManagement';
import ExceptionHandling from '@/sections/ExceptionHandling';
import AccountManagement from '@/sections/AccountManagement';
import SystemSettings from '@/sections/SystemSettings';
import PurchaseManagement from '@/sections/PurchaseManagement';
import TransitManagement from '@/sections/TransitManagement';
import SortingManagement from '@/sections/SortingManagement';
import ScreeningManagement from '@/sections/ScreeningManagement';
import PackingManagement from '@/sections/PackingManagement';
import ShippingManagement from '@/sections/ShippingManagement';
import FinanceLedger from '@/sections/FinanceLedger';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import type { ExceptionCase } from '@/types';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  ClipboardCheck,
  Diamond,
  LogOut,
  PackageCheck,
  PackageSearch,
  ScanSearch,
  QrCode,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Truck,
  Users,
  WandSparkles,
} from 'lucide-react';
import { getRestrictedCustomerNames } from '@/utils/orderFinance';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';

type PageType =
  | 'dashboard'
  | 'purchase'
  | 'transit'
  | 'orders'
  | 'receipt'
  | 'sorting'
  | 'screening'
  | 'quality'
  | 'packing'
  | 'scan'
  | 'trace'
  | 'inventory'
  | 'shipping'
  | 'finance'
  | 'exceptions'
  | 'accounts'
  | 'settings';

type NavigationGroup = 'overview' | 'sourcing' | 'production' | 'warehouse' | 'finance' | 'admin';

interface PageMeta {
  id: PageType;
  label: string;
  shortLabel: string;
  description: string;
  group: NavigationGroup;
  icon: typeof Activity;
}

interface ExceptionViewState {
  searchTerm: string;
  statusFilter: ExceptionCase['status'] | 'all';
  businessTypeFilter: ExceptionCase['businessType'] | 'all';
}

type BusinessLookupPage = 'orders' | 'transit' | 'receipt' | 'sorting' | 'screening' | 'packing' | 'shipping' | 'scan';

const pageMetaMap: Record<PageType, PageMeta> = {
  dashboard: {
    id: 'dashboard',
    label: '仪表盘',
    shortLabel: '总览',
    description: '查看整体业务概况、关键指标和近期活动。',
    group: 'overview',
    icon: Activity,
  },
  purchase: {
    id: 'purchase',
    label: '采购管理',
    shortLabel: '采购',
    description: '管理印度采购来源、采购批次和供应商来货计划。',
    group: 'sourcing',
    icon: ShoppingCart,
  },
  transit: {
    id: 'transit',
    label: '在途流转',
    shortLabel: '在途',
    description: '跟踪印度到香港、香港到深圳的在途批次与交接状态。',
    group: 'sourcing',
    icon: Truck,
  },
  orders: {
    id: 'orders',
    label: '客户订单',
    shortLabel: '订单',
    description: '管理客户订单源头、客户需求、配货优先级和出货前状态。',
    group: 'sourcing',
    icon: ClipboardList,
  },
  receipt: {
    id: 'receipt',
    label: '收货管理',
    shortLabel: '收货',
    description: '统一管理香港收货、深圳收货、差异复核和是否允许进入下一步。',
    group: 'sourcing',
    icon: ClipboardCheck,
  },
  sorting: {
    id: 'sorting',
    label: '分选管理',
    shortLabel: '分选',
    description: '记录分选领料、分出类别、损耗与交回结果。',
    group: 'production',
    icon: WandSparkles,
  },
  screening: {
    id: 'screening',
    label: '细筛管理',
    shortLabel: '细筛',
    description: '管理细筛规则、筛后结果和复检节点。',
    group: 'production',
    icon: ScanSearch,
  },
  quality: {
    id: 'quality',
    label: '质检流程',
    shortLabel: '质检',
    description: '处理检验、判定、记录和质量问题。',
    group: 'production',
    icon: CheckCircle2,
  },
  packing: {
    id: 'packing',
    label: '封包管理',
    shortLabel: '封包',
    description: '管理封包单、封签码、封包复核与封包结构。',
    group: 'warehouse',
    icon: PackageCheck,
  },
  scan: {
    id: 'scan',
    label: '扫码交接',
    shortLabel: '扫码',
    description: '统一处理交接扫码、签收确认和留痕。',
    group: 'warehouse',
    icon: QrCode,
  },
  trace: {
    id: 'trace',
    label: '封包追踪',
    shortLabel: '追踪',
    description: '查看封包流转路径、节点状态和明细。',
    group: 'warehouse',
    icon: PackageSearch,
  },
  inventory: {
    id: 'inventory',
    label: '库存管理',
    shortLabel: '库存',
    description: '查看库存状态、库位和在库明细。',
    group: 'warehouse',
    icon: Boxes,
  },
  shipping: {
    id: 'shipping',
    label: '出货管理',
    shortLabel: '出货',
    description: '管理客户出货、复核、物流与客户签收状态。',
    group: 'warehouse',
    icon: Truck,
  },
  finance: {
    id: 'finance',
    label: '财务台账',
    shortLabel: '财务',
    description: '汇总归档订单、对账状态、财务确认和月结统计。',
    group: 'finance',
    icon: ReceiptText,
  },
  exceptions: {
    id: 'exceptions',
    label: '异常处理',
    shortLabel: '异常',
    description: '集中处理重量、粒数、品质和交接异常。',
    group: 'warehouse',
    icon: AlertTriangle,
  },
  accounts: {
    id: 'accounts',
    label: '账户管理',
    shortLabel: '账户',
    description: '管理员创建账号、分配角色并维护状态。',
    group: 'admin',
    icon: Users,
  },
  settings: {
    id: 'settings',
    label: '系统设置',
    shortLabel: '设置',
    description: '配置系统名称、规则、仓位与基础资料。',
    group: 'admin',
    icon: Settings2,
  },
};

const navGroupConfig: { id: NavigationGroup; label: string }[] = [
  { id: 'overview', label: '工作总览' },
  { id: 'sourcing', label: '采购与流转' },
  { id: 'production', label: '生产与质检' },
  { id: 'warehouse', label: '仓储与交接' },
  { id: 'finance', label: '对账与财务' },
  { id: 'admin', label: '系统管理' },
];

function App() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const currentUser = useStore((state) => state.currentUser);
  const rolePermissions = useStore((state) => state.rolePermissions);
  const systemSettings = useStore((state) => state.systemSettings);
  const exceptionCases = useStore((state) => state.exceptionCases);
  const handoverRecords = useStore((state) => state.handoverRecords);
  const customerOrders = useStore((state) => state.customerOrders);
  const logout = useStore((state) => state.logout);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [exceptionViewState, setExceptionViewState] = useState<ExceptionViewState>({
    searchTerm: '',
    statusFilter: 'all',
    businessTypeFilter: 'all',
  });
  const [pageSearchState, setPageSearchState] = useState<Partial<Record<BusinessLookupPage, string>>>({});

  const handleBack = () => {
    setCurrentPage('dashboard');
  };

  const handleOpenExceptions = (
    searchTerm = '',
    statusFilter: ExceptionCase['status'] | 'all' = 'all',
    businessTypeFilter: ExceptionCase['businessType'] | 'all' = 'all'
  ) => {
    setExceptionViewState({ searchTerm, statusFilter, businessTypeFilter });
    setCurrentPage('exceptions');
  };

  const handleOpenBusinessLookup = (pageId: BusinessLookupPage, searchTerm: string) => {
    setPageSearchState((prev) => ({ ...prev, [pageId]: searchTerm }));
    setCurrentPage(pageId);
  };

  const handleOpenHandoverLookup = (searchTerm: string) => {
    setPageSearchState((prev) => ({ ...prev, scan: searchTerm }));
    setCurrentPage('scan');
  };

  // 页面切换动画配置
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const allowedPages = useMemo(() => {
    if (!currentUser) {
      return ['dashboard'] as PageType[];
    }

    const matchedRole = rolePermissions.find((item) => item.role === currentUser.role);
    if (!matchedRole) {
      return ['dashboard'] as PageType[];
    }

    return matchedRole.pages.filter((page): page is PageType => page in pageMetaMap);
  }, [currentUser, rolePermissions]);

  const visibleGroups = useMemo(
    () =>
      navGroupConfig
        .map((group) => ({
          ...group,
          items: allowedPages.map((page) => pageMetaMap[page]).filter((item) => item.group === group.id),
        }))
        .filter((group) => group.items.length > 0),
    [allowedPages]
  );
  const activeExceptionCount = useMemo(
    () => exceptionCases.filter((item) => item.status === 'pending' || item.status === 'processing').length,
    [exceptionCases]
  );
  const pageExceptionCounts = useMemo(() => {
    const counts: Partial<Record<PageType, number>> = {
      transit: 0,
      sorting: 0,
      screening: 0,
      packing: 0,
      shipping: 0,
      scan: 0,
      exceptions: activeExceptionCount,
    };

    exceptionCases.forEach((item) => {
      if (item.status === 'closed') {
        return;
      }

      if (item.businessType === '在途流转') {
        counts.transit = (counts.transit ?? 0) + 1;
        return;
      }

      if (item.businessType === '分选') {
        counts.sorting = (counts.sorting ?? 0) + 1;
        return;
      }

      if (item.businessType === '细筛') {
        counts.screening = (counts.screening ?? 0) + 1;
        return;
      }

      if (item.businessType === '封包') {
        counts.packing = (counts.packing ?? 0) + 1;
        return;
      }

      if (item.businessType === '出货') {
        counts.shipping = (counts.shipping ?? 0) + 1;
        return;
      }

      if (item.businessType === '扫码交接') {
        counts.scan = (counts.scan ?? 0) + 1;
      }
    });

    handoverRecords.forEach((record) => {
      if (record.businessType === '出货签收' && record.status === 'exception') {
        counts.shipping = (counts.shipping ?? 0) + 1;
      }
    });

    return counts;
  }, [activeExceptionCount, exceptionCases, handoverRecords]);
  const restrictedCustomerNames = useMemo(() => getRestrictedCustomerNames(customerOrders), [customerOrders]);
  const restrictedCustomerCount = restrictedCustomerNames.length;

  useEffect(() => {
    if (!allowedPages.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [allowedPages, currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            onOpenExceptions={handleOpenExceptions}
            onOpenFinance={() => setCurrentPage('finance')}
            onOpenOrders={(searchTerm = '') => handleOpenBusinessLookup('orders', searchTerm)}
          />
        );
      case 'purchase':
        return <PurchaseManagement onOpenExceptionCase={handleOpenExceptions} />;
      case 'transit':
        return (
          <TransitManagement
            initialSearchTerm={pageSearchState.transit ?? ''}
            onOpenExceptionCase={handleOpenExceptions}
            onOpenHandoverRecord={handleOpenHandoverLookup}
            onOpenReceiptRecord={(searchTerm) => handleOpenBusinessLookup('receipt', searchTerm)}
          />
        );
      case 'orders':
        return <OrderManagement initialSearchTerm={pageSearchState.orders ?? ''} />;
      case 'receipt':
        return (
          <ReceiptManagement
            initialSearchTerm={pageSearchState.receipt ?? ''}
            onOpenExceptionCase={handleOpenExceptions}
          />
        );
      case 'sorting':
        return (
          <SortingManagement
            initialSearchTerm={pageSearchState.sorting ?? ''}
            onOpenExceptionCase={handleOpenExceptions}
            onOpenHandoverRecord={handleOpenHandoverLookup}
          />
        );
      case 'screening':
        return (
          <ScreeningManagement
            initialSearchTerm={pageSearchState.screening ?? ''}
            onOpenExceptionCase={handleOpenExceptions}
            onOpenHandoverRecord={handleOpenHandoverLookup}
          />
        );
      case 'quality':
        return <QualityInspection />;
      case 'packing':
        return (
          <PackingManagement
            initialSearchTerm={pageSearchState.packing ?? ''}
            onOpenExceptionCase={handleOpenExceptions}
            onOpenHandoverRecord={handleOpenHandoverLookup}
          />
        );
      case 'scan':
        return (
          <ScanConfirmation
            initialSearchTerm={pageSearchState.scan ?? ''}
            onOpenExceptionCase={handleOpenExceptions}
            onOpenBusinessLink={handleOpenBusinessLookup}
          />
        );
      case 'trace':
        return <PackageTrace />;
      case 'inventory':
        return <InventoryManagement />;
      case 'shipping':
        return (
          <ShippingManagement
            initialSearchTerm={pageSearchState.shipping ?? ''}
            onOpenExceptionCase={handleOpenExceptions}
            onOpenHandoverRecord={handleOpenHandoverLookup}
          />
        );
      case 'finance':
        return <FinanceLedger />;
      case 'exceptions':
        return (
          <ExceptionHandling
            initialSearchTerm={exceptionViewState.searchTerm}
            initialStatusFilter={exceptionViewState.statusFilter}
            initialBusinessTypeFilter={exceptionViewState.businessTypeFilter}
            onOpenBusinessLink={handleOpenBusinessLookup}
            onOpenHandoverLink={handleOpenHandoverLookup}
          />
        );
      case 'accounts':
        return <AccountManagement onBack={handleBack} />;
      case 'settings':
        return <SystemSettings onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LoginPage />
          </motion.div>
        ) : (
          <SidebarProvider defaultOpen>
            <Sidebar
              variant="inset"
              collapsible="icon"
              className="border-r border-slate-200 bg-[#f6f8fb] text-slate-900"
            >
              <SidebarHeader className="border-b border-slate-200/90 px-3 py-4">
                <button
                  type="button"
                  onClick={() => setCurrentPage('dashboard')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d6b36c] to-[#a08042]">
                    <Diamond className="h-5 w-5 text-[#1a1a1a]" />
                  </div>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-[15px] font-semibold tracking-[0.01em] text-slate-900">{systemSettings.systemName}</p>
                    <p className="truncate text-xs font-medium text-slate-600">菜单统一放左侧，页面只负责内容</p>
                  </div>
                </button>
              </SidebarHeader>

              <SidebarContent className="px-3 py-4">
                {visibleGroups.map((group) => (
                  <SidebarGroup key={group.id} className="mb-5 last:mb-0">
                    <SidebarGroupLabel className="mb-2 flex items-center justify-between px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      <span>{group.label}</span>
                      {group.items.some((item) => (pageExceptionCounts[item.id] ?? 0) > 0) && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          {group.items.reduce((sum, item) => sum + (pageExceptionCounts[item.id] ?? 0), 0)}
                        </span>
                      )}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu className="gap-1.5">
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              isActive={currentPage === item.id}
                              tooltip={item.label}
                              onClick={() => {
                                if (item.id === 'exceptions') {
                                  setExceptionViewState({ searchTerm: '', statusFilter: 'all', businessTypeFilter: 'all' });
                                }

                                if (
                                  item.id === 'transit' ||
                                  item.id === 'receipt' ||
                                  item.id === 'sorting' ||
                                  item.id === 'screening' ||
                                  item.id === 'packing' ||
                                  item.id === 'shipping' ||
                                  item.id === 'scan'
                                ) {
                                  setPageSearchState((prev) => ({ ...prev, [item.id]: '' }));
                                }

                                setCurrentPage(item.id);
                              }}
                              className={`relative h-12 rounded-xl px-4 pl-5 !text-[15px] !font-semibold tracking-[0.01em] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:content-[''] ${
                                currentPage === item.id
                                  ? 'border border-[#d6b36c] bg-[#d6b36c] !text-[#1a1a1a] shadow-sm before:bg-[#8a6a2f] hover:bg-[#d6b36c]'
                                  : 'border border-transparent !text-slate-800 before:bg-transparent hover:border-slate-200 hover:bg-white hover:!text-slate-900 hover:before:bg-slate-300'
                              }`}
                            >
                              <item.icon className={`h-[18px] w-[18px] ${currentPage === item.id ? '!text-[#1a1a1a]' : '!text-slate-700'}`} />
                              <span className={currentPage === item.id ? '!text-[#1a1a1a]' : '!text-slate-800'}>{item.label}</span>
                              {(pageExceptionCounts[item.id] ?? 0) > 0 && (
                                <span
                                  className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    currentPage === item.id ? 'bg-[#8a6a2f] text-white' : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {pageExceptionCounts[item.id]}
                                </span>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                ))}
              </SidebarContent>

              <SidebarFooter className="border-t border-slate-200/90 p-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm group-data-[collapsible=icon]:px-2">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-800">
                      {currentUser?.name?.slice(0, 1) || '用'}
                    </div>
                    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                      <p className="truncate text-sm font-semibold text-slate-900">{currentUser?.name}</p>
                      <p className="truncate text-xs font-medium text-slate-600">{pageMetaMap[currentPage].label}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="w-full justify-start gap-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 group-data-[collapsible=icon]:justify-center"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">退出登录</span>
                  </Button>
                </div>
              </SidebarFooter>
              <SidebarRail />
            </Sidebar>

            <SidebarInset className="min-w-0 overflow-x-hidden bg-[#f5f5f5]">
              <div className="flex items-center justify-between px-4 pt-4 sm:px-6 lg:px-8">
                <SidebarTrigger className="border border-gray-200 bg-white shadow-sm hover:bg-gray-50 md:hidden" />
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {restrictedCustomerCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage('finance')}
                      className="gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    >
                      <ReceiptText className="h-4 w-4" />
                      信用受限客户 {restrictedCustomerCount}
                    </Button>
                  )}
                  {activeExceptionCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenExceptions('', 'pending')}
                      className="gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      待处理异常 {activeExceptionCount}
                    </Button>
                  )}
                </div>
              </div>
              <div className="mx-auto w-full max-w-[1320px] min-w-0 px-4 py-6 sm:px-6 lg:px-8">
                <motion.div
                  className="min-w-0 overflow-hidden"
                  key={currentPage}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 0.2 }}
                >
                  {renderPage()}
                </motion.div>
              </div>
            </SidebarInset>
          </SidebarProvider>
        )}
      </AnimatePresence>
      <Toaster />
    </div>
  );
}

export default App;
