import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Account,
  CreateCustomerOrderInput,
  CreateAccountInput,
  CreatePurchaseBatchInput,
  CreateReceiptInput,
  CustomerOrder,
  DashboardStats,
  DunningFollowUpRecord,
  ExceptionCase,
  ExceptionActionLog,
  FinanceTransactionRecord,
  HandoverRecord,
  Inventory,
  NumberingRules,
  Order,
  PackageTrace,
  PackingTask,
  PurchaseBatch,
  QualityRecord,
  ReceiptRecord,
  RolePermission,
  ScanRecord,
  ScreeningTask,
  ShipmentTask,
  SortingTask,
  SystemSettings,
  TransitRecord,
} from '@/types';
import { getCustomerOrderCreditControl } from '@/utils/orderFinance';

interface AppState {
  // 用户状态
  currentUser: Account | null;
  isAuthenticated: boolean;
  accounts: Account[];
  rolePermissions: RolePermission[];
  systemSettings: SystemSettings;
  login: (username: string, password: string) => { success: boolean; message: string };
  logout: () => void;
  createAccount: (input: CreateAccountInput) => { success: boolean; message: string };
  updateAccount: (accountId: string, updates: Partial<Account>) => void;
  resetAccountPassword: (accountId: string) => { success: boolean; message: string; password?: string };
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  updateNumberingRules: (rules: Partial<NumberingRules>) => void;

  // 采购与在途
  purchaseBatches: PurchaseBatch[];
  customerOrders: CustomerOrder[];
  transitRecords: TransitRecord[];
  receiptRecords: ReceiptRecord[];
  sortingTasks: SortingTask[];
  screeningTasks: ScreeningTask[];
  packingTasks: PackingTask[];
  shipmentTasks: ShipmentTask[];
  handoverRecords: HandoverRecord[];
  exceptionCases: ExceptionCase[];
  createPurchaseBatch: (input: CreatePurchaseBatchInput) => { success: boolean; message: string; batch?: PurchaseBatch };
  createCustomerOrder: (input: CreateCustomerOrderInput) => { success: boolean; message: string; order?: CustomerOrder };
  createReceiptRecord: (input: CreateReceiptInput) => { success: boolean; message: string; record?: ReceiptRecord };
  updateReceiptRecord: (receiptId: string, updates: Partial<ReceiptRecord>) => void;
  matchInventoryToCustomerOrder: (orderId: string) => { success: boolean; message: string };
  createShipmentForCustomerOrder: (orderId: string) => { success: boolean; message: string; shipment?: ShipmentTask };
  advanceShipmentTask: (shipmentId: string) => { success: boolean; message: string };
  confirmShipmentReceipt: (shipmentId: string) => { success: boolean; message: string };
  confirmCustomerOrderFinance: (orderId: string) => { success: boolean; message: string };
  registerCustomerOrderInvoice: (orderId: string) => { success: boolean; message: string; invoiceNo?: string };
  registerCustomerOrderPayment: (orderId: string, mode?: 'partial' | 'full') => { success: boolean; message: string; amount?: number };
  registerCustomerOrderWriteOff: (orderId: string) => { success: boolean; message: string; amount?: number };
  registerCustomerOrderDunningFollowUp: (
    orderId: string
  ) => { success: boolean; message: string; status?: DunningFollowUpRecord['status'] };
  archiveCustomerOrder: (orderId: string) => { success: boolean; message: string };

  // 订单状态
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  receiveOrder: (orderId: string, inspector: string) => void;

  // 质检记录
  qualityRecords: QualityRecord[];
  addQualityRecord: (record: QualityRecord) => void;

  // 封包追踪
  packageTraces: PackageTrace[];
  updatePackageTrace: (trace: PackageTrace) => void;

  // 库存
  inventory: Inventory[];
  updateInventory: (item: Inventory) => void;

  // 扫码记录
  scanRecords: ScanRecord[];
  addScanRecord: (record: ScanRecord) => void;
  addHandoverRecord: (record: HandoverRecord) => void;
  advanceHandoverRecord: (recordId: string) => void;
  updateHandoverRecord: (recordId: string, updates: Partial<HandoverRecord>) => void;
  updateExceptionCase: (caseId: string, updates: Partial<ExceptionCase>) => void;

  // 统计数据
  stats: DashboardStats;
  updateStats: (stats: Partial<DashboardStats>) => void;
}

// 模拟初始数据
const mockOrders: Order[] = [
  {
    id: '1',
    orderNo: 'ORD20240304001',
    supplier: '钻石供应商A',
    netWeight: 15.23,
    stoneCount: 150,
    status: 'pending',
    receiveTime: '2024-03-04 09:30:00',
  },
  {
    id: '2',
    orderNo: 'ORD20240304002',
    supplier: '钻石供应商B',
    netWeight: 8.56,
    stoneCount: 85,
    status: 'inspecting',
    receiveTime: '2024-03-04 10:15:00',
    inspector: '张检验员',
    packageNo: 'PKG20240304001',
  },
  {
    id: '3',
    orderNo: 'ORD20240304003',
    supplier: '钻石供应商C',
    netWeight: 22.18,
    stoneCount: 220,
    status: 'completed',
    receiveTime: '2024-03-04 08:00:00',
    inspector: '李检验员',
    packageNo: 'PKG20240304002',
  },
  {
    id: '4',
    orderNo: 'ORD20240304004',
    supplier: '钻石供应商D',
    netWeight: 5.32,
    stoneCount: 53,
    status: 'exception',
    receiveTime: '2024-03-04 11:00:00',
    inspector: '王检验员',
    packageNo: 'PKG20240304003',
  },
];

const mockStats: DashboardStats = {
  pendingCount: 12,
  inspectingCount: 5,
  completedCount: 28,
  exceptionCount: 2,
  todayInspectCount: 45,
  todayPassRate: 94.5,
};

const mockPurchaseBatches: PurchaseBatch[] = [
  {
    id: 'pur-1',
    purchaseNo: 'PUR20260507001',
    sourceType: '印度采购',
    supplier: 'Surat Diamond Source A',
    stoneCategory: '小厘石',
    roughType: '小厘石',
    expectedWeight: 62.5,
    expectedStoneCount: 12800,
    purchasedWeight: 61.9,
    purchasedStoneCount: 12680,
    purchaseDate: '2026-05-02',
    expectedArrivalDate: '2026-05-09',
    origin: '印度苏拉特',
    destination: '香港中转仓',
    buyer: '陈采购',
    status: 'shipping',
    notes: '优先用于深圳本周分选批次',
  },
  {
    id: 'pur-2',
    purchaseNo: 'PUR20260507002',
    sourceType: '印度采购',
    supplier: 'Mumbai Fine Parcel',
    stoneCategory: '小份石',
    roughType: '小份石',
    expectedWeight: 38.2,
    expectedStoneCount: 4650,
    purchaseDate: '2026-05-03',
    expectedArrivalDate: '2026-05-10',
    origin: '印度孟买',
    destination: '香港中转仓',
    buyer: '李采购',
    status: 'confirmed',
  },
  {
    id: 'pur-3',
    purchaseNo: 'PUR20260507003',
    sourceType: '印度采购',
    supplier: 'Jaipur Micro Stone',
    stoneCategory: '小厘石',
    roughType: '小厘石',
    expectedWeight: 48.8,
    expectedStoneCount: 9800,
    purchasedWeight: 48.1,
    purchasedStoneCount: 9650,
    purchaseDate: '2026-04-28',
    expectedArrivalDate: '2026-05-05',
    origin: '印度斋浦尔',
    destination: '深圳主仓',
    buyer: '陈采购',
    status: 'received',
    notes: '已并入深圳待分选库存',
  },
];

const mockCustomerOrders: CustomerOrder[] = [
  {
    id: 'co-1',
    orderNo: 'CO20260509001',
    customerName: '深圳恒钻珠宝',
    orderSource: '老客户复购',
    orderDate: '2026-05-08',
    salesName: '吴业务',
    requiredStoneCategory: '小厘石',
    requiredQuality: 'A',
    requiredWeight: 30.5,
    requiredStoneCount: 6200,
    packageRequirement: '12 包独立封包',
    shipmentRequirement: '专车送达并提前通知仓库',
    signoffRequirement: '客户仓扫码签收',
    requestedDeliveryDate: '2026-05-10',
    priorityLevel: 'vip',
    matchedPackageNos: ['PKG20260507021'],
    matchedInventoryWeight: 30.5,
    latestShipmentNo: 'SHP20260507001',
    customerContact: '刘经理',
    customerContactPhone: '13900000001',
    customerCreditLimit: 160000,
    settlementMode: '月结',
    orderAmount: 185000,
    remark: '优先安排本周五出货。',
    status: 'ready_to_ship',
    createdAt: '2026-05-08 09:20:00',
    confirmedAt: '2026-05-08 09:35:00',
  },
  {
    id: 'co-2',
    orderNo: 'CO20260509002',
    customerName: '香港宝石贸易',
    orderSource: '业务报价',
    orderDate: '2026-05-09',
    salesName: '林业务',
    requiredStoneCategory: '小份石',
    requiredQuality: 'B',
    requiredWeight: 18.8,
    requiredStoneCount: 2360,
    packageRequirement: '标准封包',
    shipmentRequirement: '香港门店签收',
    priorityLevel: 'urgent',
    matchedPackageNos: [],
    matchedInventoryWeight: 0,
    customerContact: '陈店长',
    customerContactPhone: '13900000002',
    customerCreditLimit: 80000,
    settlementMode: '预付款',
    orderAmount: 96000,
    remark: '待现货匹配后安排出货。',
    status: 'matching',
    createdAt: '2026-05-09 10:10:00',
    confirmedAt: '2026-05-09 10:18:00',
  },
  {
    id: 'co-3',
    orderNo: 'CO20260509003',
    customerName: '广州钻彩供应链',
    orderSource: '渠道转单',
    orderDate: '2026-05-07',
    salesName: '赵业务',
    requiredStoneCategory: '小厘石',
    requiredQuality: 'A',
    requiredWeight: 26.4,
    requiredStoneCount: 5020,
    packageRequirement: '客户专包',
    shipmentRequirement: '已发货，等待回单',
    signoffRequirement: '签收后回传图片',
    requestedDeliveryDate: '2026-05-08',
    priorityLevel: 'normal',
    matchedPackageNos: ['PKG20260506011'],
    matchedInventoryWeight: 26.4,
    latestShipmentNo: 'SHP20260507003',
    customerContact: '马主管',
    customerContactPhone: '13900000003',
    customerCreditLimit: 180000,
    settlementMode: '到付',
    orderAmount: 143000,
    remark: '历史订单，已签收待完结。',
    receiptConfirmed: true,
    receiptConfirmedAt: '2026-05-08 13:20:00',
    receiptConfirmedBy: '赵业务',
    financeConfirmed: true,
    financeConfirmedAt: '2026-05-08 16:40:00',
    financeConfirmedBy: '周财务',
    paymentRegistered: true,
    paymentRegisteredAt: '2026-05-09 10:15:00',
    paymentRegisteredBy: '周财务',
    paymentReferenceNo: 'PAY20260509001',
    paidAmount: 143000,
    financeRecords: [
      {
        id: 'fr-co3-pay-1',
        type: 'payment',
        amount: 143000,
        referenceNo: 'PAY20260509001',
        operator: '周财务',
        recordedAt: '2026-05-09 10:15:00',
        remark: '到付订单已完成全额回款登记。',
      },
    ],
    archived: true,
    archivedAt: '2026-05-08 18:10:00',
    archivedBy: '系统管理员',
    status: 'completed',
    createdAt: '2026-05-07 08:50:00',
    confirmedAt: '2026-05-07 09:00:00',
  },
  {
    id: 'co-4',
    orderNo: 'CO20260509004',
    customerName: '上海瑞钻贸易',
    orderSource: '老客户复购',
    orderDate: '2026-05-06',
    salesName: '吴业务',
    requiredStoneCategory: '小份石',
    requiredQuality: 'A',
    requiredWeight: 21.6,
    requiredStoneCount: 2880,
    packageRequirement: '月结客户专包',
    shipmentRequirement: '客户已签收，待财务开票与回款登记',
    signoffRequirement: '签收后回传收货章',
    requestedDeliveryDate: '2026-05-07',
    priorityLevel: 'normal',
    matchedPackageNos: ['PKG20260507024'],
    matchedInventoryWeight: 21.6,
    latestShipmentNo: 'SHP20260507004',
    customerContact: '宋经理',
    customerContactPhone: '13900000004',
    customerCreditLimit: 150000,
    settlementMode: '月结',
    orderAmount: 122000,
    remark: '已完成财务确认，待登记开票。',
    receiptConfirmed: true,
    receiptConfirmedAt: '2026-05-08 10:10:00',
    receiptConfirmedBy: '吴业务',
    financeConfirmed: true,
    financeConfirmedAt: '2026-05-08 16:00:00',
    financeConfirmedBy: '周财务',
    status: 'completed',
    createdAt: '2026-05-06 14:20:00',
    confirmedAt: '2026-05-06 14:30:00',
  },
  {
    id: 'co-5',
    orderNo: 'CO20260418005',
    customerName: '苏州曜石珠宝',
    orderSource: '老客户复购',
    orderDate: '2026-04-18',
    salesName: '赵业务',
    requiredStoneCategory: '小厘石',
    requiredQuality: 'A',
    requiredWeight: 32.8,
    requiredStoneCount: 5400,
    packageRequirement: '分包出货',
    shipmentRequirement: '客户已签收，存在部分回款与核销处理',
    signoffRequirement: '签收章与对账单同步上传',
    requestedDeliveryDate: '2026-04-19',
    priorityLevel: 'normal',
    matchedPackageNos: ['PKG20260418005'],
    matchedInventoryWeight: 32.8,
    latestShipmentNo: 'SHP20260418005',
    customerContact: '韩总',
    customerContactPhone: '13900000005',
    customerCreditLimit: 90000,
    settlementMode: '月结',
    orderAmount: 168000,
    remark: '历史月结客户，已部分回款并做一次核销，仍有尾款待收。',
    receiptConfirmed: true,
    receiptConfirmedAt: '2026-04-20 10:30:00',
    receiptConfirmedBy: '赵业务',
    financeConfirmed: true,
    financeConfirmedAt: '2026-04-20 15:00:00',
    financeConfirmedBy: '周财务',
    invoiceRegistered: true,
    invoiceRegisteredAt: '2026-04-21 09:20:00',
    invoiceRegisteredBy: '周财务',
    invoiceNo: 'INV20260418005',
    paidAmount: 40000,
    paymentReferenceNo: 'PAY20260422001',
    writeOffAmount: 20000,
    writeOffAt: '2026-04-28 16:20:00',
    writeOffBy: '周财务',
    writeOffReferenceNo: 'WO20260428001',
    dunningStatus: 'promised',
    lastDunningAt: '2026-05-06 10:30:00',
    lastDunningBy: '周财务',
    nextDunningAt: '2026-05-11 15:00:00',
    dunningRemark: '客户承诺本周补尾款，财务待二次跟进。',
    dunningRecords: [
      {
        id: 'dg-co5-1',
        status: 'contacted',
        operator: '周财务',
        recordedAt: '2026-05-02 11:00:00',
        nextFollowUpAt: '2026-05-06 10:30:00',
        remark: '首次电话催收，客户确认已收到对账单。',
      },
      {
        id: 'dg-co5-2',
        status: 'promised',
        operator: '周财务',
        recordedAt: '2026-05-06 10:30:00',
        nextFollowUpAt: '2026-05-11 15:00:00',
        remark: '客户承诺本周内安排尾款支付。',
      },
    ],
    financeRecords: [
      {
        id: 'fr-co5-invoice-1',
        type: 'invoice',
        amount: 168000,
        referenceNo: 'INV20260418005',
        operator: '周财务',
        recordedAt: '2026-04-21 09:20:00',
        remark: '月结发票已开具。',
      },
      {
        id: 'fr-co5-payment-1',
        type: 'payment',
        amount: 40000,
        referenceNo: 'PAY20260422001',
        operator: '周财务',
        recordedAt: '2026-04-22 11:10:00',
        remark: '客户先支付第一笔回款。',
      },
      {
        id: 'fr-co5-writeoff-1',
        type: 'writeoff',
        amount: 20000,
        referenceNo: 'WO20260428001',
        operator: '周财务',
        recordedAt: '2026-04-28 16:20:00',
        remark: '经审批后登记一次部分核销。',
      },
    ],
    status: 'completed',
    createdAt: '2026-04-18 10:10:00',
    confirmedAt: '2026-04-18 10:30:00',
  },
];

const mockTransitRecords: TransitRecord[] = [
  {
    id: 'tr-1',
    transitNo: 'TR20260507001',
    relatedPurchaseNo: 'PUR20260507001',
    route: 'india_to_hk',
    batchCount: 3,
    stoneCategory: '小厘石',
    expectedWeight: 62.5,
    actualWeight: 61.9,
    departureTime: '2026-05-06 09:30:00',
    expectedArrivalTime: '2026-05-09 18:00:00',
    fromLocation: '印度苏拉特',
    toLocation: '香港中转仓',
    carrier: 'Air Cargo 88',
    handoverBy: '陈采购',
    status: 'in_transit',
    riskLevel: 'medium',
    notes: '海关资料已补齐，待香港仓签收',
  },
  {
    id: 'tr-2',
    transitNo: 'TR20260507002',
    relatedPurchaseNo: 'PUR20260507003',
    route: 'hk_to_sz',
    batchCount: 2,
    stoneCategory: '小厘石',
    expectedWeight: 48.1,
    actualWeight: 48.1,
    departureTime: '2026-05-05 08:20:00',
    expectedArrivalTime: '2026-05-05 13:30:00',
    actualArrivalTime: '2026-05-05 14:10:00',
    fromLocation: '香港中转仓',
    toLocation: '深圳主仓',
    carrier: '深港专车',
    handoverBy: '香港收货员',
    receivedBy: '深圳收货员',
    status: 'signed',
    riskLevel: 'low',
  },
  {
    id: 'tr-3',
    transitNo: 'TR20260507003',
    relatedPurchaseNo: 'PUR20260507002',
    route: 'india_to_hk',
    batchCount: 1,
    stoneCategory: '小份石',
    expectedWeight: 38.2,
    departureTime: '2026-05-07 11:00:00',
    expectedArrivalTime: '2026-05-11 17:00:00',
    fromLocation: '印度孟买',
    toLocation: '香港中转仓',
    carrier: 'SKY Diamond Logistics',
    handoverBy: '李采购',
    status: 'pending_departure',
    riskLevel: 'low',
  },
];

const mockReceiptRecords: ReceiptRecord[] = [
  {
    id: 'rcpt-1',
    receiptNo: 'RCV20260509001',
    receiptType: 'hk_receipt',
    batchId: 'pur-3',
    batchNo: 'PUR20260507003',
    sourceTransitId: 'tr-2',
    sourceTransitNo: 'TR20260507002',
    siteCode: 'HK',
    siteName: '香港中转仓',
    expectedWeight: 48.1,
    actualWeight: 48.1,
    weightDiff: 0,
    expectedStoneCount: 9650,
    actualStoneCount: 9650,
    stoneDiff: 0,
    packageIntegrity: '完好',
    sealCheckResult: '一致',
    receiptPhotos: [],
    receiverName: '香港收货员',
    reviewerName: '仓务主管',
    receiptTime: '2026-05-05 13:45:00',
    reviewTime: '2026-05-05 14:00:00',
    differenceLevel: 'none',
    allowNextStep: true,
    inventoryPosted: false,
    remark: '香港到仓收货完成，可安排深圳转运。',
    status: 'reviewed',
    createdBy: '香港收货员',
    createdAt: '2026-05-05 13:40:00',
  },
  {
    id: 'rcpt-2',
    receiptNo: 'RCV20260509002',
    receiptType: 'sz_receipt',
    batchId: 'pur-3',
    batchNo: 'PUR20260507003',
    sourceTransitId: 'tr-2',
    sourceTransitNo: 'TR20260507002',
    siteCode: 'SZ',
    siteName: '深圳主仓',
    expectedWeight: 48.1,
    actualWeight: 47.6,
    weightDiff: -0.5,
    expectedStoneCount: 9650,
    actualStoneCount: 9588,
    stoneDiff: -62,
    packageIntegrity: '轻微破损',
    sealCheckResult: '不一致',
    receiptPhotos: [],
    receiverName: '深圳收货员',
    reviewerName: '张检验员',
    receiptTime: '2026-05-05 14:15:00',
    reviewTime: '2026-05-05 14:40:00',
    differenceLevel: 'major',
    differenceReason: '到仓发现外包装轻微破损并存在粒数差异，已转差异复核。',
    allowNextStep: false,
    inventoryPosted: false,
    remark: '当前不允许直接入库，待异常处理完成。',
    status: 'exception',
    createdBy: '深圳收货员',
    createdAt: '2026-05-05 14:05:00',
  },
];

const mockInventory: Inventory[] = [
  {
    id: 'inv-1',
    packageNo: 'PKG20260508031',
    stoneCategory: '小厘石',
    sourceBatchNo: 'PUR20260506098',
    sourceReceiptNo: 'RCV20260508012',
    sourceTransitNo: 'TR20260508009',
    sourceSiteName: '深圳主仓',
    netWeight: 16.8,
    stoneCount: 3020,
    status: 'pending_test',
    location: '深圳待分选区-A1',
    entryTime: '2026-05-08 15:20:00',
    createdBy: '深圳收货员',
    remark: '深圳收货通过后自动入账，待分选主管派工。',
  },
  {
    id: 'inv-2',
    packageNo: 'PKG20260508032',
    stoneCategory: '小厘石',
    sourceBatchNo: 'PUR20260506095',
    sourceReceiptNo: 'RCV20260508008',
    sourceTransitNo: 'TR20260508004',
    sourceSiteName: '深圳主仓',
    netWeight: 22.4,
    stoneCount: 4280,
    status: 'testing',
    location: '分选作业区-B2',
    entryTime: '2026-05-08 11:10:00',
    createdBy: '深圳收货员',
    remark: '已进入分选处理中。',
  },
  {
    id: 'inv-3',
    packageNo: 'PKG20260508033',
    stoneCategory: '小份石',
    netWeight: 18.92,
    stoneCount: 185,
    status: 'passed',
    location: '可用库存区-C2',
    entryTime: '2026-05-08 10:00:00',
    createdBy: '库存管理员',
    remark: '历史可用库存，待客户订单匹配。',
  },
  {
    id: 'inv-4',
    packageNo: 'PKG20260508034',
    stoneCategory: '小厘石',
    sourceBatchNo: 'PUR20260506099',
    sourceReceiptNo: 'RCV20260508015',
    sourceTransitNo: 'TR20260508011',
    sourceSiteName: '深圳主仓',
    netWeight: 31.2,
    stoneCount: 6120,
    status: 'passed',
    location: '可用库存区-C4',
    entryTime: '2026-05-08 17:10:00',
    createdBy: '库存管理员',
    remark: '已完成分选并转为可用库存，可参与客户订单匹配。',
  },
];

const mockSortingTasks: SortingTask[] = [
  {
    id: 'sort-1',
    sortingNo: 'SORT20260507001',
    sourceBatchNo: 'PUR20260507003',
    stoneCategory: '小厘石',
    assignedTo: '林分选',
    receiveDate: '2026-05-07',
    startTime: '2026-05-07 09:20:00',
    expectedFinishTime: '2026-05-07 17:30:00',
    inputWeight: 48.1,
    outputWeight: 47.62,
    lossWeight: 0.48,
    inputStoneCount: 9650,
    outputStoneCount: 9588,
    status: 'review',
    priority: 'urgent',
    resultSummary: '已分出 3 个粒度层级，待主管复核损耗与交回数据。',
  },
  {
    id: 'sort-2',
    sortingNo: 'SORT20260507002',
    sourceBatchNo: 'PUR20260507001',
    stoneCategory: '小厘石',
    assignedTo: '黄分选',
    receiveDate: '2026-05-08',
    startTime: '2026-05-08 10:00:00',
    expectedFinishTime: '2026-05-08 19:00:00',
    inputWeight: 20.5,
    inputStoneCount: 4250,
    status: 'in_progress',
    priority: 'normal',
    resultSummary: '正在按客户要求拆分颗粒区间，暂未交回。',
  },
  {
    id: 'sort-3',
    sortingNo: 'SORT20260507003',
    sourceBatchNo: 'PUR20260507002',
    stoneCategory: '小份石',
    assignedTo: '林分选',
    receiveDate: '2026-05-09',
    startTime: '2026-05-09 08:30:00',
    expectedFinishTime: '2026-05-09 16:00:00',
    inputWeight: 18.4,
    inputStoneCount: 2260,
    status: 'pending',
    priority: 'normal',
    resultSummary: '待香港到仓确认后开始分选。',
  },
];

const mockScreeningTasks: ScreeningTask[] = [
  {
    id: 'scr-1',
    screeningNo: 'SCR20260507001',
    sourceSortingNo: 'SORT20260507001',
    ruleName: '0.8mm 细筛标准',
    assignedTo: '周细筛',
    scheduledDate: '2026-05-08',
    beforeWeight: 47.62,
    afterWeight: 47.18,
    beforeStoneCount: 9588,
    afterStoneCount: 9520,
    reviewBy: '张检验员',
    result: 'passed',
    gradeChange: 'same',
    notes: '筛后结构稳定，允许进入待封包。',
  },
  {
    id: 'scr-2',
    screeningNo: 'SCR20260507002',
    sourceSortingNo: 'SORT20260507002',
    ruleName: '客户 B 细筛规则',
    assignedTo: '何细筛',
    scheduledDate: '2026-05-09',
    beforeWeight: 20.5,
    beforeStoneCount: 4250,
    result: 'screening',
    gradeChange: 'same',
    notes: '已领料，等待分选交回完整明细后继续。',
  },
  {
    id: 'scr-3',
    screeningNo: 'SCR20260507003',
    sourceSortingNo: 'SORT20260507003',
    ruleName: '复筛对比规则',
    assignedTo: '周细筛',
    scheduledDate: '2026-05-10',
    beforeWeight: 18.4,
    beforeStoneCount: 2260,
    result: 'pending',
    gradeChange: 'up',
    notes: '计划做高等级复筛，对比品质提升幅度。',
  },
];

const mockPackingTasks: PackingTask[] = [
  {
    id: 'pack-1',
    packingNo: 'PACK20260507001',
    sourceScreeningNo: 'SCR20260507001',
    packageNo: 'PKG20260507021',
    sealCode: 'SEAL-882103',
    assignedTo: '陈封包',
    reviewedBy: '张检验员',
    packDate: '2026-05-08 16:20:00',
    targetCustomer: '深圳恒钻珠宝',
    netWeight: 47.18,
    stoneCount: 9520,
    packageCount: 12,
    status: 'review',
    packagingType: '客户专包',
    remarks: '待复核封签码与装箱清单后进入出货准备。',
  },
  {
    id: 'pack-2',
    packingNo: 'PACK20260507002',
    sourceScreeningNo: 'SCR20260507002',
    packageNo: 'PKG20260507022',
    sealCode: 'SEAL-882104',
    assignedTo: '李封包',
    packDate: '2026-05-09 10:30:00',
    targetCustomer: '香港宝石贸易',
    netWeight: 20.5,
    stoneCount: 4250,
    packageCount: 6,
    status: 'packing',
    packagingType: '标准封包',
    remarks: '正在按常规结构封包，等待细筛交回完整数据。',
  },
  {
    id: 'pack-3',
    packingNo: 'PACK20260507003',
    sourceScreeningNo: 'SCR20260507003',
    packageNo: 'PKG20260507023',
    sealCode: 'SEAL-882105',
    assignedTo: '陈封包',
    packDate: '2026-05-10 09:00:00',
    targetCustomer: '广州钻彩供应链',
    netWeight: 18.4,
    stoneCount: 2260,
    packageCount: 4,
    status: 'pending',
    packagingType: '客户专包',
    remarks: '待细筛结果确认后开始封包。',
  },
];

const mockShipmentTasks: ShipmentTask[] = [
  {
    id: 'ship-1',
    shipmentNo: 'SHP20260507001',
    sourceOrderNo: 'CO20260509001',
    customerName: '深圳恒钻珠宝',
    packageNo: 'PKG20260507021',
    packageNos: ['PKG20260507021'],
    packageCount: 1,
    relatedPackingNo: 'PACK20260507001',
    dispatchSource: 'packing',
    logisticProvider: '顺丰专送',
    logisticNo: 'SF8855601023',
    plannedShipDate: '2026-05-09 15:00:00',
    reviewedBy: '刘出货',
    netWeight: 47.18,
    stoneCount: 9520,
    status: 'ready_to_ship',
    shippingRequirement: '客户要求专车送达并提前电话确认。',
  },
  {
    id: 'ship-2',
    shipmentNo: 'SHP20260507002',
    sourceOrderNo: 'CO20260509002',
    customerName: '香港宝石贸易',
    packageNo: 'PKG20260507018',
    packageNos: ['PKG20260507018'],
    packageCount: 1,
    relatedPackingNo: 'PACK20260506008',
    dispatchSource: 'packing',
    logisticProvider: '港深当日达',
    logisticNo: 'HKSZ-20260508-18',
    plannedShipDate: '2026-05-08 11:30:00',
    shippedDate: '2026-05-08 11:45:00',
    reviewedBy: '黄复核',
    shippedBy: '刘出货',
    netWeight: 15.6,
    stoneCount: 3180,
    status: 'shipped',
    shippingRequirement: '香港门店收货，需扫码签收。',
  },
  {
    id: 'ship-3',
    shipmentNo: 'SHP20260507003',
    sourceOrderNo: 'CO20260509003',
    customerName: '广州钻彩供应链',
    packageNo: 'PKG20260506011',
    packageNos: ['PKG20260506011'],
    packageCount: 1,
    relatedPackingNo: 'PACK20260506009',
    dispatchSource: 'packing',
    logisticProvider: '粤通物流',
    logisticNo: 'YT-6601288',
    plannedShipDate: '2026-05-07 14:00:00',
    shippedDate: '2026-05-07 14:20:00',
    signedDate: '2026-05-08 09:35:00',
    reviewedBy: '刘出货',
    shippedBy: '刘出货',
    receiptConfirmed: true,
    receiptConfirmedAt: '2026-05-08 13:20:00',
    receiptConfirmedBy: '赵业务',
    netWeight: 26.4,
    stoneCount: 5020,
    status: 'signed',
    shippingRequirement: '客户仓已签收，待财务确认交付回单。',
  },
  {
    id: 'ship-4',
    shipmentNo: 'SHP20260507004',
    sourceOrderNo: 'CO20260509004',
    customerName: '上海瑞钻贸易',
    packageNo: 'PKG20260507024',
    packageNos: ['PKG20260507024'],
    packageCount: 1,
    relatedPackingNo: 'PACK20260507004',
    dispatchSource: 'packing',
    logisticProvider: '华东专线',
    logisticNo: 'HD-20260507-24',
    plannedShipDate: '2026-05-07 13:30:00',
    shippedDate: '2026-05-07 14:10:00',
    signedDate: '2026-05-08 09:10:00',
    reviewedBy: '刘出货',
    shippedBy: '刘出货',
    receiptConfirmed: true,
    receiptConfirmedAt: '2026-05-08 10:10:00',
    receiptConfirmedBy: '吴业务',
    netWeight: 21.6,
    stoneCount: 2880,
    status: 'signed',
    shippingRequirement: '客户华东仓已签收，等待财务登记开票。',
  },
  {
    id: 'ship-5',
    shipmentNo: 'SHP20260418005',
    sourceOrderNo: 'CO20260418005',
    customerName: '苏州曜石珠宝',
    packageNo: 'PKG20260418005',
    packageNos: ['PKG20260418005'],
    packageCount: 1,
    relatedPackingNo: 'PACK20260418005',
    dispatchSource: 'packing',
    logisticProvider: '华东专线',
    logisticNo: 'HD-20260418-05',
    plannedShipDate: '2026-04-19 09:30:00',
    shippedDate: '2026-04-19 10:05:00',
    signedDate: '2026-04-20 09:50:00',
    reviewedBy: '刘出货',
    shippedBy: '刘出货',
    receiptConfirmed: true,
    receiptConfirmedAt: '2026-04-20 10:30:00',
    receiptConfirmedBy: '赵业务',
    netWeight: 32.8,
    stoneCount: 5400,
    status: 'signed',
    shippingRequirement: '客户已签收，财务需持续跟踪尾款与信用占用。',
  },
];

const mockHandoverRecords: HandoverRecord[] = [
  {
    id: 'hd-1',
    handoverNo: 'HD20260507001',
    businessType: '香港转深圳',
    relatedNo: 'TR20260507002',
    packageNo: 'PKG20260507008',
    fromNode: '香港中转仓',
    toNode: '深圳主仓',
    handoverBy: '香港收货员',
    receivedBy: '深圳收货员',
    handoverTime: '2026-05-05 14:10:00',
    status: 'completed',
    wechatConfirmed: true,
    corpWechatUserId: 'wechat_szreceiver',
    netWeight: 48.1,
    stoneCount: 9650,
    remarks: '深港专车到仓后已扫码签收。',
  },
  {
    id: 'hd-2',
    handoverNo: 'HD20260507002',
    businessType: '分选交回',
    relatedNo: 'SORT20260507001',
    packageNo: 'PKG20260507021',
    fromNode: '分选工位',
    toNode: '细筛工位',
    handoverBy: '林分选',
    receivedBy: '周细筛',
    handoverTime: '2026-05-08 09:00:00',
    status: 'confirmed',
    wechatConfirmed: true,
    corpWechatUserId: 'wechat_screening_zhou',
    netWeight: 47.62,
    stoneCount: 9588,
    remarks: '分选交回完成，待细筛继续领料。',
  },
  {
    id: 'hd-3',
    handoverNo: 'HD20260507003',
    businessType: '出货签收',
    relatedNo: 'SHP20260507002',
    packageNo: 'PKG20260507018',
    fromNode: '深圳出货区',
    toNode: '香港宝石贸易',
    handoverBy: '刘出货',
    receivedBy: '香港门店收货员',
    handoverTime: '2026-05-08 16:35:00',
    status: 'pending_confirm',
    wechatConfirmed: false,
    netWeight: 15.6,
    stoneCount: 3180,
    remarks: '客户侧待扫码确认签收。',
  },
];

const createCurrentTimestamp = () => new Date().toLocaleString('zh-CN', { hour12: false });
const createCurrentDate = () => new Date().toLocaleDateString('sv-SE');

const createDocumentNo = (prefix: string, currentCount: number) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}${datePart}${String(currentCount + 1).padStart(3, '0')}`;
};

const getReceiptDifferenceLevel = (
  weightDiff: number,
  stoneDiff: number,
  packageIntegrity: ReceiptRecord['packageIntegrity'],
  sealCheckResult?: ReceiptRecord['sealCheckResult']
): ReceiptRecord['differenceLevel'] => {
  const absWeightDiff = Math.abs(weightDiff);
  const absStoneDiff = Math.abs(stoneDiff);

  if (packageIntegrity === '严重破损' || sealCheckResult === '不一致' || absWeightDiff >= 0.3 || absStoneDiff >= 50) {
    return 'major';
  }

  if (packageIntegrity === '轻微破损' || sealCheckResult === '无封签' || absWeightDiff > 0 || absStoneDiff > 0) {
    return 'minor';
  }

  return 'none';
};

const createInventoryRecordFromReceipt = (
  receipt: ReceiptRecord,
  batch: PurchaseBatch | undefined,
  inventoryCount: number,
  numberingRules: NumberingRules
): Inventory => ({
  id: `inv-${Date.now()}`,
  packageNo: createDocumentNo(numberingRules.packagePrefix, inventoryCount),
  stoneCategory: batch?.roughType || batch?.stoneCategory,
  sourceBatchNo: receipt.batchNo,
  sourceReceiptNo: receipt.receiptNo,
  sourceTransitNo: receipt.sourceTransitNo,
  sourceSiteName: receipt.siteName,
  netWeight: receipt.actualWeight,
  stoneCount: receipt.actualStoneCount,
  status: 'pending_test',
  location: receipt.siteCode === 'SZ' ? '深圳待分选区-A1' : '香港中转待调拨区',
  entryTime: receipt.reviewTime || receipt.receiptTime,
  createdBy: receipt.receiverName,
  remark: `由收货单 ${receipt.receiptNo} 自动入账。`,
});

const createSortingTaskFromReceipt = (
  receipt: ReceiptRecord,
  batch: PurchaseBatch | undefined,
  inventory: Inventory,
  currentCount: number
): SortingTask => {
  const datePart = (receipt.reviewTime || receipt.receiptTime).split(' ')[0];
  const isUrgent = Boolean(batch?.notes?.includes('优先'));

  return {
    id: `sort-${Date.now()}`,
    sortingNo: createDocumentNo('SORT', currentCount),
    sourceBatchNo: receipt.batchNo,
    sourceReceiptNo: receipt.receiptNo,
    sourceInventoryPackageNo: inventory.packageNo,
    dispatchSource: 'receipt_auto',
    stoneCategory: batch?.roughType || batch?.stoneCategory || '小厘石',
    assignedTo: '待分配',
    receiveDate: datePart,
    startTime: `${datePart} 09:00:00`,
    expectedFinishTime: `${datePart} 18:00:00`,
    inputWeight: receipt.actualWeight,
    inputStoneCount: receipt.actualStoneCount,
    status: 'pending',
    priority: isUrgent ? 'urgent' : 'normal',
    resultSummary: `系统根据收货单 ${receipt.receiptNo} 自动生成待分选任务，等待主管分派。`,
  };
};

const normalizeInventoryItem = (
  item: Inventory,
  purchaseBatches: PurchaseBatch[],
  fallbackInventory?: Inventory
): Inventory => ({
  ...fallbackInventory,
  ...item,
  stoneCategory:
    item.stoneCategory ||
    fallbackInventory?.stoneCategory ||
    purchaseBatches.find((batch) => batch.purchaseNo === item.sourceBatchNo)?.roughType ||
    mockInventory.find((sample) => sample.packageNo === item.packageNo)?.stoneCategory,
});

const normalizeCustomerOrder = (item: CustomerOrder, fallbackOrder?: CustomerOrder): CustomerOrder => ({
  ...fallbackOrder,
  ...item,
  latestShipmentNo: item.latestShipmentNo || fallbackOrder?.latestShipmentNo,
  customerCreditLimit: item.customerCreditLimit ?? fallbackOrder?.customerCreditLimit,
  settlementMode: item.settlementMode || fallbackOrder?.settlementMode,
  orderAmount: item.orderAmount ?? fallbackOrder?.orderAmount,
  receiptConfirmed: item.receiptConfirmed ?? fallbackOrder?.receiptConfirmed,
  receiptConfirmedAt: item.receiptConfirmedAt || fallbackOrder?.receiptConfirmedAt,
  receiptConfirmedBy: item.receiptConfirmedBy || fallbackOrder?.receiptConfirmedBy,
  financeConfirmed: item.financeConfirmed ?? fallbackOrder?.financeConfirmed,
  financeConfirmedAt: item.financeConfirmedAt || fallbackOrder?.financeConfirmedAt,
  financeConfirmedBy: item.financeConfirmedBy || fallbackOrder?.financeConfirmedBy,
  invoiceRegistered: item.invoiceRegistered ?? fallbackOrder?.invoiceRegistered,
  invoiceRegisteredAt: item.invoiceRegisteredAt || fallbackOrder?.invoiceRegisteredAt,
  invoiceRegisteredBy: item.invoiceRegisteredBy || fallbackOrder?.invoiceRegisteredBy,
  invoiceNo: item.invoiceNo || fallbackOrder?.invoiceNo,
  paymentRegistered: item.paymentRegistered ?? fallbackOrder?.paymentRegistered,
  paymentRegisteredAt: item.paymentRegisteredAt || fallbackOrder?.paymentRegisteredAt,
  paymentRegisteredBy: item.paymentRegisteredBy || fallbackOrder?.paymentRegisteredBy,
  paymentReferenceNo: item.paymentReferenceNo || fallbackOrder?.paymentReferenceNo,
  paidAmount: item.paidAmount ?? fallbackOrder?.paidAmount,
  writeOffAmount: item.writeOffAmount ?? fallbackOrder?.writeOffAmount,
  writeOffAt: item.writeOffAt || fallbackOrder?.writeOffAt,
  writeOffBy: item.writeOffBy || fallbackOrder?.writeOffBy,
  writeOffReferenceNo: item.writeOffReferenceNo || fallbackOrder?.writeOffReferenceNo,
  financeRecords: item.financeRecords || fallbackOrder?.financeRecords,
  dunningStatus: item.dunningStatus || fallbackOrder?.dunningStatus,
  lastDunningAt: item.lastDunningAt || fallbackOrder?.lastDunningAt,
  lastDunningBy: item.lastDunningBy || fallbackOrder?.lastDunningBy,
  nextDunningAt: item.nextDunningAt || fallbackOrder?.nextDunningAt,
  dunningRemark: item.dunningRemark || fallbackOrder?.dunningRemark,
  dunningRecords: item.dunningRecords || fallbackOrder?.dunningRecords,
  archived: item.archived ?? fallbackOrder?.archived,
  archivedAt: item.archivedAt || fallbackOrder?.archivedAt,
  archivedBy: item.archivedBy || fallbackOrder?.archivedBy,
});

const normalizeShipmentTask = (item: ShipmentTask, fallbackTask?: ShipmentTask): ShipmentTask => ({
  ...fallbackTask,
  ...item,
  sourceOrderNo: item.sourceOrderNo || fallbackTask?.sourceOrderNo,
  packageNos: item.packageNos || fallbackTask?.packageNos,
  packageCount: item.packageCount ?? fallbackTask?.packageCount,
  dispatchSource: item.dispatchSource || fallbackTask?.dispatchSource,
  receiptConfirmed: item.receiptConfirmed ?? fallbackTask?.receiptConfirmed,
  receiptConfirmedAt: item.receiptConfirmedAt || fallbackTask?.receiptConfirmedAt,
  receiptConfirmedBy: item.receiptConfirmedBy || fallbackTask?.receiptConfirmedBy,
});

const getCustomerOrderStatusFromShipment = (shipment: ShipmentTask): CustomerOrder['status'] => {
  if (shipment.status === 'signed') {
    return 'completed';
  }

  if (shipment.status === 'shipped') {
    return 'shipped';
  }

  if (shipment.status === 'exception' || shipment.status === 'delayed') {
    return 'exception';
  }

  return 'ready_to_ship';
};

const canArchiveCustomerOrder = (order: CustomerOrder) =>
  order.status === 'completed' && order.receiptConfirmed && order.financeConfirmed;

const createExceptionLog = (action: string, detail: string, actor: string, timestamp = createCurrentTimestamp()): ExceptionActionLog => ({
  id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  action,
  detail,
  actor,
  timestamp,
});

const mockExceptionCases: ExceptionCase[] = [
  {
    id: 'ex-1',
    caseNo: 'EX20260507001',
    businessType: '在途流转',
    relatedNo: 'TR20260507001',
    title: '印度到港批次到货延后',
    exceptionType: '签收超时',
    severity: 'medium',
    status: 'processing',
    discoveredAt: '2026-05-09 18:20:00',
    discoveredBy: '香港收货员',
    owner: '陈采购',
    latestAction: '已联系承运人补充航班落地信息。',
    actionLogs: [
      createExceptionLog('异常创建', '在途延误异常已登记。', '系统', '2026-05-09 18:20:00'),
      createExceptionLog('转入处理中', '已联系承运人补充航班落地信息。', '陈采购', '2026-05-09 18:35:00'),
    ],
  },
  {
    id: 'ex-2',
    caseNo: 'EX20260507002',
    businessType: '封包',
    relatedNo: 'PACK20260507001',
    packageNo: 'PKG20260507021',
    title: '封签码与装箱清单待复核',
    exceptionType: '封包信息不符',
    severity: 'high',
    status: 'pending',
    discoveredAt: '2026-05-08 17:10:00',
    discoveredBy: '张检验员',
    owner: '陈封包',
    latestAction: '待封包员重新核对封签码与客户专包清单。',
    actionLogs: [createExceptionLog('异常创建', '封包异常待复核。', '系统', '2026-05-08 17:10:00')],
  },
  {
    id: 'ex-3',
    caseNo: 'EX20260507003',
    businessType: '扫码交接',
    relatedNo: 'HD20260507003',
    packageNo: 'PKG20260507018',
    title: '客户签收扫码未完成',
    exceptionType: '扫码失败',
    severity: 'low',
    status: 'resolved',
    discoveredAt: '2026-05-08 16:50:00',
    discoveredBy: '刘出货',
    owner: '刘出货',
    resolution: '已改为重新发送企业微信确认链接，客户待最终回执。',
    latestAction: '已补发确认链接，等待系统自动回写。',
    actionLogs: [
      createExceptionLog('异常创建', '客户签收扫码未完成，系统自动登记。', '系统', '2026-05-08 16:50:00'),
      createExceptionLog('已解决', '已补发确认链接，等待系统自动回写。', '刘出货', '2026-05-08 17:05:00'),
    ],
  },
];

const mockAccounts: Account[] = [
  {
    id: 'acc-admin',
    username: 'admin',
    password: 'admin123',
    name: '系统管理员',
    role: 'admin',
    department: '信息管理部',
    title: '超级管理员',
    phone: '13800000000',
    wechatBound: false,
    status: 'active',
    createdAt: '2026-05-07 09:00:00',
    mustChangePassword: false,
  },
  {
    id: 'acc-inspector',
    username: 'zhangjian',
    password: '123456',
    name: '张检验员',
    role: 'inspector',
    department: '质检部',
    title: '质检员',
    phone: '13800000001',
    wechatBound: true,
    corpWechatUserId: 'wechat_zhangjian',
    corpWechatDisplayName: '张检验员',
    lastWechatBindingAt: '2026-05-07 09:12:00',
    status: 'active',
    createdAt: '2026-05-07 09:10:00',
    mustChangePassword: false,
  },
  {
    id: 'acc-receiver',
    username: 'szreceiver',
    password: '123456',
    name: '深圳收货员',
    role: 'sz_receiver',
    department: '深圳仓',
    title: '收货专员',
    phone: '13800000002',
    wechatBound: false,
    status: 'active',
    createdAt: '2026-05-07 09:20:00',
    mustChangePassword: true,
  },
  {
    id: 'acc-finance',
    username: 'finance',
    password: '123456',
    name: '周财务',
    role: 'finance',
    department: '财务部',
    title: '财务专员',
    phone: '13800000008',
    wechatBound: false,
    status: 'active',
    createdAt: '2026-05-07 09:30:00',
    mustChangePassword: false,
  },
];

const mockRolePermissions: RolePermission[] = [
  {
    role: 'admin',
    name: '系统管理员',
    description: '拥有全部业务与系统配置权限',
    pages: [
      'dashboard',
      'purchase',
      'transit',
      'orders',
      'receipt',
      'sorting',
      'screening',
      'quality',
      'packing',
      'scan',
      'trace',
      'inventory',
      'shipping',
      'finance',
      'exceptions',
      'accounts',
      'settings',
    ],
  },
  {
    role: 'inspector',
    name: '质检员',
    description: '负责质检、扫码、查看追踪和库存',
    pages: ['dashboard', 'screening', 'quality', 'packing', 'scan', 'trace', 'inventory', 'exceptions'],
  },
  {
    role: 'sz_receiver',
    name: '深圳收货员',
    description: '负责收货、扫码和库存确认',
    pages: ['dashboard', 'transit', 'orders', 'receipt', 'scan', 'inventory', 'trace'],
  },
  {
    role: 'receiver',
    name: '收货员',
    description: '负责订单收货和交接签收',
    pages: ['dashboard', 'orders', 'receipt', 'scan', 'inventory'],
  },
  {
    role: 'finance',
    name: '财务',
    description: '负责回单确认后的财务确认、对账与月结统计',
    pages: ['dashboard', 'orders', 'shipping', 'finance'],
  },
];

const mockSystemSettings: SystemSettings = {
  companyName: '钻石 ERP 内部管理系统',
  systemName: '全检钻仓管理系统',
  version: 'v2.1.0',
  supportContact: 'IT部门',
  defaultPassword: '123456',
  allowRememberMe: true,
  corpWechatIntegrationEnabled: false,
  forceWechatBindingForHandover: false,
  enableOperationLog: true,
  corpWechatAppName: '钻石ERP交接助手',
  corpWechatCorpId: '',
  corpWechatAgentId: '',
  corpWechatCallbackUrl: '',
  autoCreateTransitExceptionOnDelay: true,
  autoCreateHandoverExceptionOnPendingConfirm: true,
  autoCreateExceptionOnWechatUnbound: true,
  autoCreatePackingExceptionOnStatus: true,
  warehouseSites: ['香港中转仓', '深圳主仓', '封包库'],
  stoneCategories: ['小厘石', '小份石'],
  qualityGrades: ['A', 'B', 'C', '待复检'],
  exceptionTypes: ['重量差异', '粒数差异', '品质不符', '扫码失败', '签收超时'],
  numberingRules: {
    purchasePrefix: 'PUR',
    customerOrderPrefix: 'CO',
    receiptPrefix: 'RCV',
    batchPrefix: 'BAT',
    packagePrefix: 'PKG',
    handoverPrefix: 'HD',
    shipmentPrefix: 'SHP',
  },
};

const mockPackageTraces: PackageTrace[] = [
  {
    packageNo: 'PKG20240304001',
    orderId: '2',
    currentStatus: 'inspecting',
    steps: [
      { stage: '入库钻仓', status: 'completed', timestamp: '2024-03-04 09:00:00', operator: '仓库管理员' },
      { stage: '全检钻仓', status: 'processing', timestamp: '2024-03-04 10:15:00', operator: '张检验员', data: { netWeight: 8.56, stoneCount: 85 } },
      { stage: '仪器检测', status: 'pending' },
      { stage: '成品入库', status: 'pending' },
    ],
  },
  {
    packageNo: 'PKG20240304002',
    orderId: '3',
    currentStatus: 'testing',
    steps: [
      { stage: '入库钻仓', status: 'completed', timestamp: '2024-03-04 08:00:00', operator: '仓库管理员' },
      { stage: '全检钻仓', status: 'completed', timestamp: '2024-03-04 09:30:00', operator: '李检验员', data: { passed: 215, failed: 5, netWeight: 22.18, stoneCount: 220 } },
      { stage: '仪器检测', status: 'processing', timestamp: '2024-03-04 11:00:00', operator: '仪器操作员' },
      { stage: '成品入库', status: 'pending' },
    ],
  },
];

const appendRemark = (value: string | undefined, remark: string) => {
  const normalized = value?.trim() ?? '';
  if (normalized.includes(remark)) {
    return normalized;
  }

  return normalized ? `${normalized} ${remark}` : remark;
};

const exceptionKey = (item: Pick<ExceptionCase, 'businessType' | 'relatedNo' | 'exceptionType'>) =>
  `${item.businessType}-${item.relatedNo}-${item.exceptionType}`;

const createExceptionCase = (
  seed: Omit<ExceptionCase, 'id' | 'caseNo' | 'discoveredAt'>,
  index: number
): ExceptionCase => {
  const serial = `${Date.now()}${index}`.slice(-11);
  const discoveredAt = createCurrentTimestamp();

  return {
    ...seed,
    id: `ex-auto-${Date.now()}-${index}`,
    caseNo: `EX${serial}`,
    discoveredAt,
    actionLogs: [createExceptionLog('异常创建', seed.latestAction, '系统', discoveredAt)],
  };
};

const applyAutoExceptionRules = (
  state: Pick<
    AppState,
    | 'systemSettings'
    | 'transitRecords'
    | 'packingTasks'
    | 'handoverRecords'
    | 'exceptionCases'
  >
): ExceptionCase[] => {
  const existingKeys = new Set(
    state.exceptionCases
      .filter((item) => item.status !== 'closed')
      .map((item) => exceptionKey(item))
  );
  const candidates: Omit<ExceptionCase, 'id' | 'caseNo' | 'discoveredAt'>[] = [];

  if (state.systemSettings.autoCreateTransitExceptionOnDelay) {
    state.transitRecords.forEach((record) => {
      if (record.status !== 'delayed' && record.status !== 'exception') {
        return;
      }

      candidates.push({
        businessType: '在途流转',
        relatedNo: record.transitNo,
        packageNo: undefined,
        title: record.status === 'delayed' ? '在途批次运输延误' : '在途流转发生异常',
        exceptionType: record.status === 'delayed' ? '签收超时' : '流转异常',
        severity: record.riskLevel === 'high' ? 'high' : 'medium',
        status: 'pending',
        discoveredBy: record.receivedBy || record.handoverBy,
        owner: record.handoverBy,
        latestAction:
          record.status === 'delayed'
            ? '系统已根据在途状态自动生成延误异常，待采购或收货人员跟进。'
            : '系统已根据流转异常状态自动建单，待责任人处理。',
      });
    });
  }

  if (state.systemSettings.autoCreatePackingExceptionOnStatus) {
    state.packingTasks.forEach((record) => {
      if (record.status !== 'exception') {
        return;
      }

      candidates.push({
        businessType: '封包',
        relatedNo: record.packingNo,
        packageNo: record.packageNo,
        title: '封包作业进入异常状态',
        exceptionType: '封包信息不符',
        severity: 'high',
        status: 'pending',
        discoveredBy: record.reviewedBy || record.assignedTo,
        owner: record.assignedTo,
        latestAction: '系统已根据封包异常状态自动建单，待封包员和复核人核对。',
      });
    });
  }

  state.handoverRecords.forEach((record) => {
    if (state.systemSettings.autoCreateHandoverExceptionOnPendingConfirm && record.status === 'pending_confirm' && !record.wechatConfirmed) {
      candidates.push({
        businessType: '扫码交接',
        relatedNo: record.handoverNo,
        packageNo: record.packageNo,
        title: record.businessType === '出货签收' ? '客户签收扫码未完成' : '交接扫码待最终确认',
        exceptionType: '扫码失败',
        severity: record.businessType === '出货签收' ? 'medium' : 'low',
        status: 'pending',
        discoveredBy: record.handoverBy,
        owner: record.handoverBy,
        latestAction: '系统检测到交接仍未完成确认，已自动生成待跟进异常单。',
      });
    }

    if (state.systemSettings.autoCreateExceptionOnWechatUnbound && state.systemSettings.forceWechatBindingForHandover && !record.corpWechatUserId) {
      candidates.push({
        businessType: '扫码交接',
        relatedNo: record.handoverNo,
        packageNo: record.packageNo,
        title: '交接凭证缺少企业微信实名绑定',
        exceptionType: '企微未绑定',
        severity: 'high',
        status: 'pending',
        discoveredBy: record.handoverBy,
        owner: record.handoverBy,
        latestAction: '系统要求交接实名绑定，但当前凭证未记录企微身份，待补绑后再闭环。',
      });
    }
  });

  const nextCases = [...state.exceptionCases];

  candidates.forEach((candidate, index) => {
    const key = exceptionKey(candidate);

    if (existingKeys.has(key)) {
      return;
    }

    nextCases.unshift(createExceptionCase(candidate, index));
    existingKeys.add(key);
  });

  return nextCases;
};

const syncBusinessDataWithHandover = (
  state: Pick<
    AppState,
    'purchaseBatches' | 'customerOrders' | 'transitRecords' | 'sortingTasks' | 'screeningTasks' | 'packingTasks' | 'shipmentTasks'
  >,
  record: HandoverRecord
): Pick<
  AppState,
  'purchaseBatches' | 'customerOrders' | 'transitRecords' | 'sortingTasks' | 'screeningTasks' | 'packingTasks' | 'shipmentTasks'
> => {
  const syncTime = record.handoverTime || createCurrentTimestamp();
  const linkedTransit = state.transitRecords.find((item) => item.transitNo === record.relatedNo);

  return {
    purchaseBatches: state.purchaseBatches.map((batch) => {
      if (!linkedTransit || batch.purchaseNo !== linkedTransit.relatedPurchaseNo) {
        return batch;
      }

      if (record.businessType === '采购到港') {
        return {
          ...batch,
          status: 'arrived_hk' as const,
          notes: appendRemark(batch.notes, '香港到港扫码已登记。'),
        };
      }

      if (record.businessType === '香港转深圳') {
        return {
          ...batch,
          status: record.status === 'completed' ? ('received' as const) : ('transferred_sz' as const),
          notes: appendRemark(batch.notes, '香港转深圳交接已登记。'),
        };
      }

      return batch;
    }),
    transitRecords: state.transitRecords.map((item) => {
      if (
        item.transitNo !== record.relatedNo ||
        (record.businessType !== '采购到港' && record.businessType !== '香港转深圳')
      ) {
        return item;
      }

      const nextStatus: TransitRecord['status'] = record.status === 'completed' ? 'signed' : 'arrived';

      return {
        ...item,
        status: nextStatus,
        actualArrivalTime: item.actualArrivalTime || syncTime,
        receivedBy: record.receivedBy,
        notes: appendRemark(
          item.notes,
          record.status === 'completed' ? '扫码签收已完成。' : '已生成到仓交接凭证，等待最终完结。'
        ),
      };
    }),
    sortingTasks: state.sortingTasks.map((item) => {
      if (record.businessType === '分选领料' && item.sortingNo === record.relatedNo) {
        const nextStatus: SortingTask['status'] = 'in_progress';

        return {
          ...item,
          status: nextStatus,
          resultSummary: appendRemark(item.resultSummary, '已完成扫码领料，进入分选作业。'),
        };
      }

      if (record.businessType === '分选交回' && item.sortingNo === record.relatedNo) {
        const nextStatus: SortingTask['status'] = record.status === 'completed' ? 'completed' : 'review';

        return {
          ...item,
          status: nextStatus,
          returnedTime: record.status === 'completed' ? syncTime : item.returnedTime,
          resultSummary: appendRemark(
            item.resultSummary,
            record.status === 'completed' ? '分选交回已完成闭环。' : '分选交回已扫码确认，等待最终完结。'
          ),
        };
      }

      return item;
    }),
    screeningTasks: state.screeningTasks.map((item) => {
      if (record.businessType !== '细筛交接' || item.screeningNo !== record.relatedNo) {
        return item;
      }

      const nextResult: ScreeningTask['result'] =
        record.status === 'completed'
          ? item.afterWeight
            ? 'passed'
            : 'screening'
          : item.result === 'pending'
            ? 'screening'
            : item.result;

      return {
        ...item,
        result: nextResult,
        completedDate: record.status === 'completed' ? syncTime.split(' ')[0] : item.completedDate,
        notes: appendRemark(
          item.notes,
          record.status === 'completed' ? '细筛结果已完成交接。' : '细筛结果已扫码移交封包。'
        ),
      };
    }),
    packingTasks: state.packingTasks.map((item) => {
      if (record.businessType === '细筛交接' && item.sourceScreeningNo === record.relatedNo) {
        const nextStatus: PackingTask['status'] = item.status === 'pending' ? 'packing' : item.status;

        return {
          ...item,
          status: nextStatus,
          remarks: appendRemark(item.remarks, '细筛交接已确认，可继续封包。'),
        };
      }

      if (record.businessType === '封包复核' && item.packingNo === record.relatedNo) {
        const nextStatus: PackingTask['status'] = record.status === 'completed' ? 'completed' : 'review';

        return {
          ...item,
          status: nextStatus,
          reviewedBy: item.reviewedBy || record.receivedBy,
          remarks: appendRemark(
            item.remarks,
            record.status === 'completed' ? '封包复核已完成。' : '封包复核已扫码确认。'
          ),
        };
      }

      return item;
    }),
    shipmentTasks: state.shipmentTasks.map((item) => {
      if (record.businessType === '封包复核' && item.relatedPackingNo === record.relatedNo) {
        const nextStatus: ShipmentTask['status'] = item.status === 'pending_review' ? 'ready_to_ship' : item.status;

        return {
          ...item,
          status: nextStatus,
          shippingRequirement: appendRemark(item.shippingRequirement, '封包复核已通过，可安排出货。'),
        };
      }

      if (record.businessType === '出货签收' && item.shipmentNo === record.relatedNo) {
        const nextStatus: ShipmentTask['status'] = record.status === 'completed' ? 'signed' : 'shipped';

        return {
          ...item,
          status: nextStatus,
          shippedBy: item.shippedBy || record.handoverBy,
          shippedDate: item.shippedDate || syncTime,
          signedDate: record.status === 'completed' ? item.signedDate || syncTime : item.signedDate,
          shippingRequirement: appendRemark(
            item.shippingRequirement,
            record.status === 'completed' ? '客户扫码签收已完成。' : '已发起客户扫码签收确认。'
          ),
        };
      }

      return item;
    }),
    customerOrders: state.customerOrders.map((order) => {
      const linkedShipment = state.shipmentTasks.find(
        (item) =>
          item.sourceOrderNo === order.orderNo &&
          ((record.businessType === '出货签收' && item.shipmentNo === record.relatedNo) ||
            (record.businessType === '封包复核' && item.relatedPackingNo === record.relatedNo))
      );

      if (!linkedShipment) {
        return order;
      }

      if (record.businessType === '封包复核') {
        return {
          ...order,
          status: linkedShipment.status === 'pending_review' ? 'ready_to_ship' : order.status,
          latestShipmentNo: linkedShipment.shipmentNo,
        };
      }

      if (record.businessType === '出货签收') {
        const nextShipment: ShipmentTask = {
          ...linkedShipment,
          status: record.status === 'completed' ? 'signed' : 'shipped',
        };

        return {
          ...order,
          status: getCustomerOrderStatusFromShipment(nextShipment),
          latestShipmentNo: linkedShipment.shipmentNo,
        };
      }

      return order;
    }),
  };
};

const syncBusinessDataWithException = (
  state: Pick<
    AppState,
    'customerOrders' | 'transitRecords' | 'sortingTasks' | 'screeningTasks' | 'packingTasks' | 'shipmentTasks' | 'handoverRecords'
  >,
  item: ExceptionCase
): Pick<
  AppState,
  'customerOrders' | 'transitRecords' | 'sortingTasks' | 'screeningTasks' | 'packingTasks' | 'shipmentTasks' | 'handoverRecords'
> => {
  const isActive = item.status === 'pending' || item.status === 'processing';

  return {
    transitRecords: state.transitRecords.map((record) => {
      if (item.businessType !== '在途流转' || record.transitNo !== item.relatedNo) {
        return record;
      }

      const nextStatus: TransitRecord['status'] = isActive
        ? item.exceptionType.includes('超时') || item.title.includes('延后')
          ? 'delayed'
          : 'exception'
        : record.actualArrivalTime
          ? record.receivedBy
            ? 'signed'
            : 'arrived'
          : 'in_transit';

      return {
        ...record,
        status: nextStatus,
        notes: appendRemark(
          record.notes,
          isActive ? `异常单 ${item.caseNo} 已挂起跟进。` : `异常单 ${item.caseNo} 已${item.status === 'closed' ? '关闭' : '解决'}。`
        ),
      };
    }),
    sortingTasks: state.sortingTasks.map((record) => {
      if (item.businessType !== '分选' || record.sortingNo !== item.relatedNo) {
        return record;
      }

      const nextStatus: SortingTask['status'] = isActive
        ? 'exception'
        : item.status === 'closed'
          ? 'completed'
          : record.outputWeight
            ? 'review'
            : 'in_progress';

      return {
        ...record,
        status: nextStatus,
        resultSummary: appendRemark(
          record.resultSummary,
          isActive ? `异常单 ${item.caseNo} 处理中。` : `异常单 ${item.caseNo} 已${item.status === 'closed' ? '关闭' : '解决'}。`
        ),
      };
    }),
    screeningTasks: state.screeningTasks.map((record) => {
      if (item.businessType !== '细筛' || record.screeningNo !== item.relatedNo) {
        return record;
      }

      const nextResult: ScreeningTask['result'] = isActive
        ? 'failed'
        : item.status === 'closed'
          ? 'passed'
          : record.afterWeight
            ? 'recheck'
            : 'screening';

      return {
        ...record,
        result: nextResult,
        notes: appendRemark(
          record.notes,
          isActive ? `异常单 ${item.caseNo} 已介入。` : `异常单 ${item.caseNo} 已${item.status === 'closed' ? '关闭' : '解决'}。`
        ),
      };
    }),
    packingTasks: state.packingTasks.map((record) => {
      if (item.businessType !== '封包' || record.packingNo !== item.relatedNo) {
        return record;
      }

      const nextStatus: PackingTask['status'] = isActive
        ? 'exception'
        : item.status === 'closed'
          ? 'completed'
          : record.reviewedBy
            ? 'review'
            : 'packing';

      return {
        ...record,
        status: nextStatus,
        remarks: appendRemark(
          record.remarks,
          isActive ? `异常单 ${item.caseNo} 持续处理中。` : `异常单 ${item.caseNo} 已${item.status === 'closed' ? '关闭' : '解决'}。`
        ),
      };
    }),
    shipmentTasks: state.shipmentTasks.map((record) => {
      if (item.businessType !== '出货' || record.shipmentNo !== item.relatedNo) {
        return record;
      }

      const nextStatus: ShipmentTask['status'] = isActive
        ? item.exceptionType.includes('超时')
          ? 'delayed'
          : 'exception'
        : record.signedDate
          ? 'signed'
          : record.shippedDate
            ? 'shipped'
            : 'ready_to_ship';

      return {
        ...record,
        status: nextStatus,
        shippingRequirement: appendRemark(
          record.shippingRequirement,
          isActive ? `异常单 ${item.caseNo} 已介入处理。` : `异常单 ${item.caseNo} 已${item.status === 'closed' ? '关闭' : '解决'}。`
        ),
      };
    }),
    customerOrders: state.customerOrders.map((record) => {
      const linkedShipment = state.shipmentTasks.find((task) => task.sourceOrderNo === record.orderNo && task.shipmentNo === item.relatedNo);
      if (item.businessType !== '出货' || !linkedShipment) {
        return record;
      }

      const nextStatus: CustomerOrder['status'] = isActive
        ? 'exception'
        : linkedShipment.signedDate
          ? 'signed'
          : linkedShipment.shippedDate
            ? 'shipped'
            : linkedShipment.status === 'pending_review'
              ? 'ready_to_ship'
              : 'ready_to_ship';

      return {
        ...record,
        status: nextStatus,
        latestShipmentNo: linkedShipment.shipmentNo,
      };
    }),
    handoverRecords: state.handoverRecords.map((record) => {
      if (
        item.businessType !== '扫码交接' ||
        (record.handoverNo !== item.relatedNo && record.id !== item.relatedNo && record.relatedNo !== item.relatedNo)
      ) {
        return record;
      }

      const nextStatus: HandoverRecord['status'] = isActive
        ? 'exception'
        : item.status === 'closed'
          ? 'completed'
          : 'confirmed';

      return {
        ...record,
        status: nextStatus,
        wechatConfirmed: !isActive,
        remarks: appendRemark(
          record.remarks,
          isActive ? `异常单 ${item.caseNo} 已挂起扫码问题。` : `异常单 ${item.caseNo} 已${item.status === 'closed' ? '关闭' : '解决'}。`
        ),
      };
    }),
  };
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 用户状态
      currentUser: null,
      isAuthenticated: false,
      accounts: mockAccounts,
      rolePermissions: mockRolePermissions,
      systemSettings: mockSystemSettings,
      purchaseBatches: mockPurchaseBatches,
      customerOrders: mockCustomerOrders,
      transitRecords: mockTransitRecords,
      receiptRecords: mockReceiptRecords,
      sortingTasks: mockSortingTasks,
      screeningTasks: mockScreeningTasks,
      packingTasks: mockPackingTasks,
      shipmentTasks: mockShipmentTasks,
      handoverRecords: mockHandoverRecords,
      exceptionCases: mockExceptionCases,
      createPurchaseBatch: (input) => {
        const supplier = input.supplier.trim();
        const buyer = input.buyer.trim();

        if (!supplier || !buyer || !input.stoneCategory.trim()) {
          return { success: false, message: '请完整填写供应商、石种和采购负责人' };
        }

        const numberingRules = get().systemSettings.numberingRules;
        const batchNo = createDocumentNo(numberingRules.purchasePrefix, get().purchaseBatches.length);
        const timestamp = createCurrentTimestamp();
        const nextBatch: PurchaseBatch = {
          id: `pur-${Date.now()}`,
          purchaseNo: batchNo,
          sourceType: '印度采购',
          supplier,
          stoneCategory: input.stoneCategory.trim(),
          roughType: input.roughType,
          qualityRequirement: input.qualityRequirement?.trim() || undefined,
          expectedWeight: input.expectedWeight,
          expectedStoneCount: input.expectedStoneCount,
          purchaseDate: input.purchaseDate || createCurrentDate(),
          expectedArrivalDate: input.expectedArrivalDate,
          plannedDepartureDate: input.plannedDepartureDate || undefined,
          origin: input.origin.trim(),
          destination: input.destination.trim(),
          plannedFromSite: input.plannedFromSite?.trim() || undefined,
          plannedToSite: input.plannedToSite?.trim() || undefined,
          currency: input.currency,
          purchaseAmount: input.purchaseAmount,
          buyer,
          status: 'confirmed',
          notes: input.notes?.trim() || undefined,
          createdAt: timestamp,
          confirmedAt: timestamp,
        };

        set((state) => ({
          purchaseBatches: [nextBatch, ...state.purchaseBatches],
        }));

        return { success: true, message: `采购批次 ${batchNo} 已创建`, batch: nextBatch };
      },
      createCustomerOrder: (input) => {
        const customerName = input.customerName.trim();
        const salesName = input.salesName.trim();

        if (!customerName || !salesName || input.requiredWeight <= 0) {
          return { success: false, message: '请完整填写客户、业务员和需求重量' };
        }

        const numberingRules = get().systemSettings.numberingRules;
        const orderNo = createDocumentNo(numberingRules.customerOrderPrefix, get().customerOrders.length);
        const timestamp = createCurrentTimestamp();
        const nextOrder: CustomerOrder = {
          id: `co-${Date.now()}`,
          orderNo,
          customerName,
          orderSource: input.orderSource,
          orderDate: input.orderDate || createCurrentDate(),
          salesName,
          requiredStoneCategory: input.requiredStoneCategory,
          requiredQuality: input.requiredQuality?.trim() || undefined,
          requiredWeight: input.requiredWeight,
          requiredStoneCount: input.requiredStoneCount,
          packageRequirement: input.packageRequirement?.trim() || undefined,
          shipmentRequirement: input.shipmentRequirement?.trim() || undefined,
          signoffRequirement: input.signoffRequirement?.trim() || undefined,
          requestedDeliveryDate: input.requestedDeliveryDate || undefined,
          priorityLevel: input.priorityLevel,
          matchedPackageNos: [],
          matchedInventoryWeight: 0,
          customerContact: input.customerContact?.trim() || undefined,
          customerContactPhone: input.customerContactPhone?.trim() || undefined,
          settlementMode: input.settlementMode,
          orderAmount: input.orderAmount,
          remark: input.remark?.trim() || undefined,
          status: 'confirmed',
          createdAt: timestamp,
          confirmedAt: timestamp,
        };

        set((state) => ({
          customerOrders: [nextOrder, ...state.customerOrders],
        }));

        return { success: true, message: `客户订单 ${orderNo} 已创建`, order: nextOrder };
      },
      createReceiptRecord: (input) => {
        const batchNo = input.batchNo.trim();
        const sourceTransitNo = input.sourceTransitNo.trim();
        const receiverName = input.receiverName.trim();
        const siteName = input.siteName.trim();

        if (!batchNo || !sourceTransitNo || !receiverName || !siteName) {
          return { success: false, message: '请完整填写批次号、流转单号、收货站点和收货人' };
        }

        const currentState = get();
        const matchedTransit = currentState.transitRecords.find((item) => item.transitNo === sourceTransitNo);
        if (!matchedTransit) {
          return { success: false, message: '未找到对应在途流转单，请先确认流转单号' };
        }

        const numberingRules = currentState.systemSettings.numberingRules;
        const receiptNo = createDocumentNo(numberingRules.receiptPrefix, currentState.receiptRecords.length);
        const timestamp = createCurrentTimestamp();
        const weightDiff = Number((input.actualWeight - input.expectedWeight).toFixed(2));
        const stoneDiff = input.actualStoneCount - input.expectedStoneCount;
        const differenceLevel = getReceiptDifferenceLevel(weightDiff, stoneDiff, input.packageIntegrity, input.sealCheckResult);
        const allowNextStep = differenceLevel !== 'major';
        const inventoryPosted = allowNextStep && input.siteCode === 'SZ';
        const status: ReceiptRecord['status'] = allowNextStep ? (inventoryPosted ? 'posted' : 'reviewed') : 'exception';
        const nextReceipt: ReceiptRecord = {
          id: `rcpt-${Date.now()}`,
          receiptNo,
          receiptType: input.receiptType,
          batchId: currentState.purchaseBatches.find((item) => item.purchaseNo === batchNo)?.id,
          batchNo,
          sourceTransitId: matchedTransit.id,
          sourceTransitNo,
          siteCode: input.siteCode,
          siteName,
          expectedWeight: input.expectedWeight,
          actualWeight: input.actualWeight,
          weightDiff,
          expectedStoneCount: input.expectedStoneCount,
          actualStoneCount: input.actualStoneCount,
          stoneDiff,
          packageIntegrity: input.packageIntegrity,
          sealCheckResult: input.sealCheckResult,
          receiptPhotos: [],
          receiverName,
          reviewerName: input.reviewerName?.trim() || undefined,
          receiptTime: timestamp,
          reviewTime: timestamp,
          differenceLevel,
          differenceReason: input.differenceReason?.trim() || undefined,
          allowNextStep,
          inventoryPosted,
          remark: input.remark?.trim() || undefined,
          status,
          createdBy: currentState.currentUser?.name || receiverName,
          createdAt: timestamp,
        };

        set((state) => {
          const matchedBatch = state.purchaseBatches.find((item) => item.purchaseNo === batchNo);
          const shouldCreateInventory = allowNextStep && input.siteCode === 'SZ';
          const nextInventory = shouldCreateInventory
            ? createInventoryRecordFromReceipt(nextReceipt, matchedBatch, state.inventory.length, state.systemSettings.numberingRules)
            : null;
          const hasSortingTask = state.sortingTasks.some(
            (task) =>
              task.sourceBatchNo === batchNo &&
              task.status !== 'completed' &&
              task.status !== 'exception'
          );
          const nextSortingTask =
            shouldCreateInventory && nextInventory && !hasSortingTask
              ? createSortingTaskFromReceipt(nextReceipt, matchedBatch, nextInventory, state.sortingTasks.length)
              : null;
          const transitRecords = state.transitRecords.map((record) =>
            record.transitNo === sourceTransitNo
              ? {
                  ...record,
                  status: allowNextStep ? ('signed' as const) : ('exception' as const),
                  actualArrivalTime: record.actualArrivalTime || timestamp,
                  receivedBy: receiverName,
                  notes: appendRemark(
                    record.notes,
                    allowNextStep
                      ? `${siteName}收货已完成，已生成收货单 ${receiptNo}。`
                      : `${siteName}收货发现差异，已生成收货单 ${receiptNo} 并转异常跟进。`
                  ),
                }
              : record
          );
          const purchaseBatches = state.purchaseBatches.map((batch) => {
            if (batch.purchaseNo !== batchNo) {
              return batch;
            }

            const nextStatus: PurchaseBatch['status'] = allowNextStep
              ? input.siteCode === 'HK'
                ? 'arrived_hk'
                : 'received'
              : 'exception';

            return {
              ...batch,
              status: nextStatus,
              notes: appendRemark(
                batch.notes,
                allowNextStep ? `${siteName}收货已完成。` : `${siteName}收货发现重大差异，等待异常处理。`
              ),
            };
          });
          const exceptionCases = applyAutoExceptionRules({
            ...state,
            transitRecords,
            packingTasks: state.packingTasks,
            handoverRecords: state.handoverRecords,
            exceptionCases: state.exceptionCases,
          });

          return {
            receiptRecords: [nextReceipt, ...state.receiptRecords],
            transitRecords,
            purchaseBatches,
            sortingTasks: nextSortingTask ? [nextSortingTask, ...state.sortingTasks] : state.sortingTasks,
            inventory: nextInventory ? [nextInventory, ...state.inventory] : state.inventory,
            exceptionCases,
          };
        });

        return {
          success: true,
          message: allowNextStep ? `收货单 ${receiptNo} 已创建并允许进入下一步` : `收货单 ${receiptNo} 已创建，并已触发差异跟进`,
          record: nextReceipt,
        };
      },
      updateReceiptRecord: (receiptId, updates) =>
        set((state) => ({
          receiptRecords: state.receiptRecords.map((item) => (item.id === receiptId ? { ...item, ...updates } : item)),
        })),
      matchInventoryToCustomerOrder: (orderId) => {
        const state = get();
        const order = state.customerOrders.find((item) => item.id === orderId);

        if (!order) {
          return { success: false, message: '未找到对应客户订单' };
        }

        const creditControl = getCustomerOrderCreditControl(order, state.customerOrders);
        if (creditControl.isRestricted) {
          return {
            success: false,
            message: `客户 ${order.customerName} 当前受信用限制，${creditControl.reason}，暂不允许匹配库存`,
          };
        }

        const availableInventory = state.inventory
          .filter((item) => {
            const fallbackStoneCategory =
              item.stoneCategory ||
              mockInventory.find((sample) => sample.packageNo === item.packageNo)?.stoneCategory ||
              state.purchaseBatches.find((batch) => batch.purchaseNo === item.sourceBatchNo)?.roughType;

            return (
              item.status === 'passed' &&
              !item.reservedForOrderNo &&
              fallbackStoneCategory === order.requiredStoneCategory
            );
          })
          .sort((a, b) => a.netWeight - b.netWeight);

        if (!availableInventory.length) {
          return { success: false, message: '当前没有可用库存可匹配该订单' };
        }

        let matchedWeight = 0;
        const matchedPackageNos: string[] = [];

        for (const item of availableInventory) {
          matchedPackageNos.push(item.packageNo);
          matchedWeight += item.netWeight;
          if (matchedWeight >= order.requiredWeight) {
            break;
          }
        }

        const nextStatus: CustomerOrder['status'] =
          matchedWeight >= order.requiredWeight ? 'ready_to_ship' : 'partially_matched';

        set((currentState) => ({
          inventory: currentState.inventory.map((item) =>
            matchedPackageNos.includes(item.packageNo)
              ? {
                  ...item,
                  reservedForOrderNo: order.orderNo,
                  location: '待出货锁定区',
                  remark: appendRemark(item.remark, `已匹配客户订单 ${order.orderNo}。`),
                }
              : item
          ),
          customerOrders: currentState.customerOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  matchedPackageNos,
                  matchedInventoryWeight: Number(matchedWeight.toFixed(2)),
                  status: nextStatus,
                }
              : item
          ),
        }));

        return {
          success: true,
          message:
            nextStatus === 'ready_to_ship'
              ? `已匹配 ${matchedPackageNos.length} 个库存包，可进入出货准备`
              : `已匹配 ${matchedPackageNos.length} 个库存包，但当前仅部分满足订单需求`,
        };
      },
      createShipmentForCustomerOrder: (orderId) => {
        const state = get();
        const order = state.customerOrders.find((item) => item.id === orderId);

        if (!order) {
          return { success: false, message: '未找到对应客户订单' };
        }

        const creditControl = getCustomerOrderCreditControl(order, state.customerOrders);
        if (creditControl.isRestricted) {
          return {
            success: false,
            message: `客户 ${order.customerName} 当前受信用限制，${creditControl.reason}，暂不允许生成出货准备`,
          };
        }

        if (!order.matchedPackageNos.length) {
          return { success: false, message: '请先完成库存匹配后再生成出货准备' };
        }

        const existingShipment = state.shipmentTasks.find(
          (item) => item.sourceOrderNo === order.orderNo && item.status !== 'exception'
        );
        if (existingShipment) {
          return { success: false, message: `订单已存在出货任务 ${existingShipment.shipmentNo}` };
        }

        const matchedInventory = state.inventory.filter((item) => order.matchedPackageNos.includes(item.packageNo));
        const totalWeight = matchedInventory.reduce((sum, item) => sum + item.netWeight, 0);
        const totalStoneCount = matchedInventory.reduce((sum, item) => sum + item.stoneCount, 0);
        const numberingRules = state.systemSettings.numberingRules;
        const shipmentNo = createDocumentNo(numberingRules.shipmentPrefix, state.shipmentTasks.length);
        const shipment: ShipmentTask = {
          id: `ship-${Date.now()}`,
          shipmentNo,
          sourceOrderNo: order.orderNo,
          customerName: order.customerName,
          packageNo: order.matchedPackageNos[0],
          packageNos: order.matchedPackageNos,
          packageCount: order.matchedPackageNos.length,
          relatedPackingNo: order.matchedPackageNos[0],
          dispatchSource: 'inventory_match',
          plannedShipDate: order.requestedDeliveryDate
            ? `${order.requestedDeliveryDate} 15:00:00`
            : createCurrentTimestamp(),
          reviewedBy: state.currentUser?.name || '出货主管',
          netWeight: Number(totalWeight.toFixed(2)),
          stoneCount: totalStoneCount,
          status: 'pending_review',
          shippingRequirement: order.shipmentRequirement || order.packageRequirement || '按客户订单要求安排出货。',
        };

        set((currentState) => ({
          shipmentTasks: [shipment, ...currentState.shipmentTasks],
          customerOrders: currentState.customerOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  status: 'ready_to_ship',
                  latestShipmentNo: shipmentNo,
                }
              : item
          ),
          inventory: currentState.inventory.map((item) =>
            order.matchedPackageNos.includes(item.packageNo)
              ? {
                  ...item,
                  reservedForOrderNo: order.orderNo,
                  location: '出货待复核区',
                  remark: appendRemark(item.remark, `已生成出货准备 ${shipmentNo}。`),
                }
              : item
          ),
        }));

        return { success: true, message: `出货准备 ${shipmentNo} 已生成`, shipment };
      },
      advanceShipmentTask: (shipmentId) => {
        const state = get();
        const shipment = state.shipmentTasks.find((item) => item.id === shipmentId);

        if (!shipment) {
          return { success: false, message: '未找到对应出货任务' };
        }

        if (shipment.status === 'signed') {
          return { success: false, message: '该出货任务已签收完成' };
        }

        if (shipment.status === 'exception' || shipment.status === 'delayed') {
          return { success: false, message: '当前出货任务存在异常，请先处理异常' };
        }

        const timestamp = createCurrentTimestamp();
        const nextStatus: ShipmentTask['status'] =
          shipment.status === 'pending_review'
            ? 'ready_to_ship'
            : shipment.status === 'ready_to_ship'
              ? 'shipped'
              : shipment.status;

        const relatedOrder = state.customerOrders.find((item) => item.orderNo === shipment.sourceOrderNo);
        if (nextStatus === 'shipped' && relatedOrder) {
          const creditControl = getCustomerOrderCreditControl(relatedOrder, state.customerOrders);
          if (creditControl.isRestricted) {
            return {
              success: false,
              message: `客户 ${relatedOrder.customerName} 当前受信用限制，${creditControl.reason}，暂不允许确认发货`,
            };
          }
        }

        if (nextStatus === shipment.status) {
          return { success: false, message: '当前状态无需继续推进' };
        }

        set((currentState) => ({
          shipmentTasks: currentState.shipmentTasks.map((item) =>
            item.id === shipmentId
              ? {
                  ...item,
                  status: nextStatus,
                  reviewedBy:
                    shipment.status === 'pending_review' ? currentState.currentUser?.name || item.reviewedBy || '出货主管' : item.reviewedBy,
                  shippedBy:
                    nextStatus === 'shipped' ? currentState.currentUser?.name || item.shippedBy || '刘出货' : item.shippedBy,
                  shippedDate: nextStatus === 'shipped' ? item.shippedDate || timestamp : item.shippedDate,
                  shippingRequirement: appendRemark(
                    item.shippingRequirement,
                    nextStatus === 'ready_to_ship' ? '出货复核已完成。' : '已确认发货，等待客户扫码签收。'
                  ),
                }
              : item
          ),
          customerOrders: currentState.customerOrders.map((order) =>
            order.orderNo === shipment.sourceOrderNo
              ? {
                  ...order,
                  status: nextStatus === 'shipped' ? 'shipped' : 'ready_to_ship',
                  latestShipmentNo: shipment.shipmentNo,
                }
              : order
          ),
          inventory: currentState.inventory.map((item) =>
            shipment.packageNos?.includes(item.packageNo) || item.packageNo === shipment.packageNo
              ? {
                  ...item,
                  location: nextStatus === 'shipped' ? '已出货待签收' : '出货待复核区',
                  remark: appendRemark(
                    item.remark,
                    nextStatus === 'shipped'
                      ? `已随出货单 ${shipment.shipmentNo} 发出，等待客户签收。`
                      : `已进入出货单 ${shipment.shipmentNo} 复核阶段。`
                  ),
                }
              : item
          ),
        }));

        return {
          success: true,
          message: nextStatus === 'ready_to_ship' ? `出货单 ${shipment.shipmentNo} 已完成复核` : `出货单 ${shipment.shipmentNo} 已确认发货`,
        };
      },
      confirmShipmentReceipt: (shipmentId) => {
        const state = get();
        const shipment = state.shipmentTasks.find((item) => item.id === shipmentId);

        if (!shipment) {
          return { success: false, message: '未找到对应出货任务' };
        }

        if (shipment.status !== 'signed') {
          return { success: false, message: '请在客户签收完成后再确认回单' };
        }

        if (shipment.receiptConfirmed) {
          return { success: false, message: '该出货任务已确认回单' };
        }

        const timestamp = createCurrentTimestamp();
        const actor = state.currentUser?.name || '业务员';

        set((currentState) => ({
          shipmentTasks: currentState.shipmentTasks.map((item) =>
            item.id === shipmentId
              ? {
                  ...item,
                  receiptConfirmed: true,
                  receiptConfirmedAt: timestamp,
                  receiptConfirmedBy: actor,
                  shippingRequirement: appendRemark(item.shippingRequirement, '客户签收回单已确认。'),
                }
              : item
          ),
          customerOrders: currentState.customerOrders.map((order) =>
            order.orderNo === shipment.sourceOrderNo
              ? {
                  ...order,
                  receiptConfirmed: true,
                  receiptConfirmedAt: timestamp,
                  receiptConfirmedBy: actor,
                  latestShipmentNo: shipment.shipmentNo,
                }
              : order
          ),
        }));

        return { success: true, message: `出货单 ${shipment.shipmentNo} 已确认回单` };
      },
      confirmCustomerOrderFinance: (orderId) => {
        const state = get();
        const order = state.customerOrders.find((item) => item.id === orderId);

        if (!order) {
          return { success: false, message: '未找到对应客户订单' };
        }

        if (order.status !== 'completed') {
          return { success: false, message: '请在订单完成交付后再做财务确认' };
        }

        if (!order.receiptConfirmed) {
          return { success: false, message: '请先确认客户回单后再做财务确认' };
        }

        if (order.financeConfirmed) {
          return { success: false, message: '该订单已完成财务确认' };
        }

        const timestamp = createCurrentTimestamp();
        const actor = state.currentUser?.name || '财务';

        set((currentState) => ({
          customerOrders: currentState.customerOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  financeConfirmed: true,
                  financeConfirmedAt: timestamp,
                  financeConfirmedBy: actor,
                  remark: appendRemark(item.remark, '财务确认已完成。'),
                }
              : item
          ),
        }));

        return { success: true, message: `订单 ${order.orderNo} 已完成财务确认` };
      },
      registerCustomerOrderInvoice: (orderId) => {
        const state = get();
        const order = state.customerOrders.find((item) => item.id === orderId);

        if (!order) {
          return { success: false, message: '未找到对应客户订单' };
        }

        if (order.settlementMode !== '月结') {
          return { success: false, message: '当前仅月结订单需要登记开票' };
        }

        if (!order.financeConfirmed) {
          return { success: false, message: '请先完成财务确认后再登记开票' };
        }

        if (order.invoiceRegistered) {
          return { success: false, message: '该订单已登记开票' };
        }

        const timestamp = createCurrentTimestamp();
        const actor = state.currentUser?.name || '财务';
        const invoiceNo = `INV${order.orderNo.slice(2)}`;

        set((currentState) => ({
          customerOrders: currentState.customerOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  invoiceRegistered: true,
                  invoiceRegisteredAt: timestamp,
                  invoiceRegisteredBy: actor,
                  invoiceNo,
                  financeRecords: [
                    ...(item.financeRecords || []),
                    {
                      id: `fr-${item.orderNo}-invoice-${Date.now()}`,
                      type: 'invoice',
                      amount: item.orderAmount || 0,
                      referenceNo: invoiceNo,
                      operator: actor,
                      recordedAt: timestamp,
                      remark: '财务已登记发票。',
                    } satisfies FinanceTransactionRecord,
                  ],
                  remark: appendRemark(item.remark, `财务已登记开票，发票号 ${invoiceNo}。`),
                }
              : item
          ),
        }));

        return { success: true, message: `订单 ${order.orderNo} 已登记开票`, invoiceNo };
      },
      registerCustomerOrderPayment: (orderId, mode = 'full') => {
        const state = get();
        const order = state.customerOrders.find((item) => item.id === orderId);

        if (!order) {
          return { success: false, message: '未找到对应客户订单' };
        }

        if (!order.receiptConfirmed || !order.financeConfirmed) {
          return { success: false, message: '请先完成回单确认和财务确认后再登记回款' };
        }

        if (order.settlementMode === '月结' && !order.invoiceRegistered) {
          return { success: false, message: '月结订单请先完成开票登记后再登记回款' };
        }

        const currentPaidAmount = order.paidAmount || 0;
        const currentWriteOffAmount = order.writeOffAmount || 0;
        const remainingAmount = Math.max(0, (order.orderAmount || 0) - currentPaidAmount - currentWriteOffAmount);

        if (remainingAmount <= 0) {
          return { success: false, message: '该订单已无待收金额' };
        }

        const timestamp = createCurrentTimestamp();
        const actor = state.currentUser?.name || '财务';
        const paymentReferenceNo = `PAY${order.orderNo.slice(2)}${mode === 'partial' ? 'P' : 'F'}`;
        const paymentAmount =
          mode === 'partial'
            ? Math.min(remainingAmount, Math.max(10000, Math.round(remainingAmount * 0.4)))
            : remainingAmount;
        const nextPaidAmount = currentPaidAmount + paymentAmount;
        const nextRemainingAmount = Math.max(0, (order.orderAmount || 0) - nextPaidAmount - currentWriteOffAmount);

        set((currentState) => ({
          customerOrders: currentState.customerOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  paymentRegistered: nextRemainingAmount <= 0,
                  paymentRegisteredAt: nextRemainingAmount <= 0 ? timestamp : item.paymentRegisteredAt,
                  paymentRegisteredBy: nextRemainingAmount <= 0 ? actor : item.paymentRegisteredBy,
                  paymentReferenceNo,
                  paidAmount: nextPaidAmount,
                  financeRecords: [
                    ...(item.financeRecords || []),
                    {
                      id: `fr-${item.orderNo}-payment-${Date.now()}`,
                      type: 'payment',
                      amount: paymentAmount,
                      referenceNo: paymentReferenceNo,
                      operator: actor,
                      recordedAt: timestamp,
                      remark: mode === 'partial' ? '财务已登记一笔部分回款。' : '财务已登记尾款结清。',
                    } satisfies FinanceTransactionRecord,
                  ],
                  remark: appendRemark(
                    item.remark,
                    mode === 'partial'
                      ? `财务已登记部分回款 ${paymentAmount} 元，回款单号 ${paymentReferenceNo}。`
                      : `财务已登记回款结清，回款单号 ${paymentReferenceNo}。`
                  ),
                }
              : item
          ),
        }));

        return {
          success: true,
          message: mode === 'partial' ? `订单 ${order.orderNo} 已登记部分回款` : `订单 ${order.orderNo} 已登记回款结清`,
          amount: paymentAmount,
        };
      },
      registerCustomerOrderWriteOff: (orderId) => {
        const state = get();
        const order = state.customerOrders.find((item) => item.id === orderId);

        if (!order) {
          return { success: false, message: '未找到对应客户订单' };
        }

        if (!order.financeConfirmed) {
          return { success: false, message: '请先完成财务确认后再登记核销' };
        }

        const currentPaidAmount = order.paidAmount || 0;
        const currentWriteOffAmount = order.writeOffAmount || 0;
        const remainingAmount = Math.max(0, (order.orderAmount || 0) - currentPaidAmount - currentWriteOffAmount);

        if (remainingAmount <= 0) {
          return { success: false, message: '该订单已无可核销金额' };
        }

        const timestamp = createCurrentTimestamp();
        const actor = state.currentUser?.name || '财务';
        const writeOffReferenceNo = `WO${order.orderNo.slice(2)}`;
        const writeOffAmount = remainingAmount;

        set((currentState) => ({
          customerOrders: currentState.customerOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  writeOffAmount: (item.writeOffAmount || 0) + writeOffAmount,
                  writeOffAt: timestamp,
                  writeOffBy: actor,
                  writeOffReferenceNo,
                  financeRecords: [
                    ...(item.financeRecords || []),
                    {
                      id: `fr-${item.orderNo}-writeoff-${Date.now()}`,
                      type: 'writeoff',
                      amount: writeOffAmount,
                      referenceNo: writeOffReferenceNo,
                      operator: actor,
                      recordedAt: timestamp,
                      remark: '财务已登记一笔核销。',
                    } satisfies FinanceTransactionRecord,
                  ],
                  remark: appendRemark(item.remark, `财务已登记核销 ${writeOffAmount} 元，核销单号 ${writeOffReferenceNo}。`),
                }
              : item
          ),
        }));

        return { success: true, message: `订单 ${order.orderNo} 已登记核销`, amount: writeOffAmount };
      },
      registerCustomerOrderDunningFollowUp: (orderId) => {
        const state = get();
        const order = state.customerOrders.find((item) => item.id === orderId);

        if (!order) {
          return { success: false, message: '未找到对应客户订单' };
        }

        const remainingAmount = Math.max(0, (order.orderAmount || 0) - (order.paidAmount || 0) - (order.writeOffAmount || 0));
        if (remainingAmount <= 0) {
          return { success: false, message: '该订单已无待催收金额' };
        }

        if (!order.financeConfirmed) {
          return { success: false, message: '请先完成财务确认后再登记催收跟进' };
        }

        const actor = state.currentUser?.name || '财务';
        const timestamp = createCurrentTimestamp();
        const nextStatusMap: Record<NonNullable<CustomerOrder['dunningStatus']> | 'default', DunningFollowUpRecord['status']> = {
          default: 'contacted',
          pending: 'contacted',
          contacted: 'promised',
          promised: 'escalated',
          escalated: 'resolved',
          resolved: 'contacted',
        };
        const currentStatus = order.dunningStatus || 'pending';
        const nextStatus = nextStatusMap[currentStatus] || nextStatusMap.default;
        const nextFollowUpAt =
          nextStatus === 'resolved'
            ? undefined
            : new Date(Date.now() + (nextStatus === 'promised' ? 3 : 2) * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace('T', ' ');
        const remarkMap: Record<DunningFollowUpRecord['status'], string> = {
          pending: '待催收',
          contacted: '已完成一次电话或微信催收。',
          promised: '客户已承诺付款时间，待继续跟进。',
          escalated: '客户未按承诺回款，已升级催收。',
          resolved: '本次催收已阶段性闭环，等待回款或复核。',
        };

        set((currentState) => ({
          customerOrders: currentState.customerOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  dunningStatus: nextStatus,
                  lastDunningAt: timestamp,
                  lastDunningBy: actor,
                  nextDunningAt: nextFollowUpAt,
                  dunningRemark: remarkMap[nextStatus],
                  dunningRecords: [
                    ...(item.dunningRecords || []),
                    {
                      id: `dg-${item.orderNo}-${Date.now()}`,
                      status: nextStatus,
                      operator: actor,
                      recordedAt: timestamp,
                      nextFollowUpAt,
                      remark: remarkMap[nextStatus],
                    } satisfies DunningFollowUpRecord,
                  ],
                  remark: appendRemark(item.remark, `财务已登记催收跟进，当前状态 ${nextStatus}。`),
                }
              : item
          ),
        }));

        return { success: true, message: `订单 ${order.orderNo} 已登记催收跟进`, status: nextStatus };
      },
      archiveCustomerOrder: (orderId) => {
        const state = get();
        const order = state.customerOrders.find((item) => item.id === orderId);

        if (!order) {
          return { success: false, message: '未找到对应客户订单' };
        }

        if (!canArchiveCustomerOrder(order)) {
          return { success: false, message: '请先完成回单确认和财务确认后再归档' };
        }

        if (order.archived) {
          return { success: false, message: '该订单已归档' };
        }

        const timestamp = createCurrentTimestamp();
        const actor = state.currentUser?.name || '系统管理员';

        set((currentState) => ({
          customerOrders: currentState.customerOrders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  archived: true,
                  archivedAt: timestamp,
                  archivedBy: actor,
                  remark: appendRemark(item.remark, '订单已完成归档。'),
                }
              : item
          ),
        }));

        return { success: true, message: `订单 ${order.orderNo} 已归档` };
      },
      login: (username, password) => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
          return { success: false, message: '请输入用户名和密码' };
        }

        const matchedAccount = get().accounts.find((account) => account.username === trimmedUsername);

        if (!matchedAccount) {
          return { success: false, message: '账号不存在，请联系管理员开通' };
        }

        if (matchedAccount.status === 'disabled') {
          return { success: false, message: '当前账号已停用，请联系管理员' };
        }

        if (matchedAccount.password !== trimmedPassword) {
          return { success: false, message: '密码错误，请重新输入' };
        }

        const lastLoginAt = new Date().toLocaleString('zh-CN', { hour12: false });
        const nextAccount = { ...matchedAccount, lastLoginAt };

        set((state) => ({
          currentUser: nextAccount,
          isAuthenticated: true,
          accounts: state.accounts.map((account) => (account.id === matchedAccount.id ? nextAccount : account)),
        }));

        return {
          success: true,
          message: matchedAccount.mustChangePassword ? '登录成功，请尽快修改初始密码' : '登录成功',
        };
      },
      logout: () => set({ currentUser: null, isAuthenticated: false }),
      createAccount: (input) => {
        const username = input.username.trim();

        if (!username || !input.name.trim()) {
          return { success: false, message: '请完整填写账号和姓名' };
        }

        const duplicate = get().accounts.some((account) => account.username === username);
        if (duplicate) {
          return { success: false, message: '账号已存在，请更换用户名' };
        }

        const password = input.password?.trim() || get().systemSettings.defaultPassword;
        const corpWechatUserId = input.corpWechatUserId?.trim() || undefined;
        const hasWechatBinding = Boolean(corpWechatUserId);
        const newAccount: Account = {
          id: `acc-${Date.now()}`,
          username,
          password,
          name: input.name.trim(),
          role: input.role,
          department: input.department.trim() || '未分配部门',
          title: input.title?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          wechatBound: input.wechatBound ?? hasWechatBinding,
          corpWechatUserId,
          corpWechatDisplayName: input.corpWechatDisplayName?.trim() || undefined,
          lastWechatBindingAt: hasWechatBinding ? createCurrentTimestamp() : undefined,
          status: 'active',
          createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
          mustChangePassword: true,
        };

        set((state) => ({
          accounts: [newAccount, ...state.accounts],
        }));

        return { success: true, message: `账号创建成功，初始密码为 ${password}` };
      },
      updateAccount: (accountId, updates) =>
        set((state) => {
          const normalizedUpdates =
            'corpWechatUserId' in updates || 'wechatBound' in updates || 'corpWechatDisplayName' in updates
              ? {
                  ...updates,
                  corpWechatUserId: updates.corpWechatUserId?.trim() || undefined,
                  corpWechatDisplayName: updates.corpWechatDisplayName?.trim() || undefined,
                  wechatBound:
                    updates.wechatBound ??
                    Boolean(updates.corpWechatUserId?.trim()),
                  lastWechatBindingAt:
                    updates.wechatBound === false || updates.corpWechatUserId === ''
                      ? undefined
                      : updates.corpWechatUserId || updates.wechatBound
                        ? createCurrentTimestamp()
                        : updates.lastWechatBindingAt,
                }
              : updates;
          const nextAccounts = state.accounts.map((account) =>
            account.id === accountId ? { ...account, ...normalizedUpdates } : account
          );
          const nextCurrentUser =
            state.currentUser?.id === accountId ? { ...state.currentUser, ...normalizedUpdates } : state.currentUser;

          return {
            accounts: nextAccounts,
            currentUser: nextCurrentUser,
          };
        }),
      resetAccountPassword: (accountId) => {
        const defaultPassword = get().systemSettings.defaultPassword;
        const target = get().accounts.find((account) => account.id === accountId);

        if (!target) {
          return { success: false, message: '未找到该账号' };
        }

        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.id === accountId
              ? { ...account, password: defaultPassword, mustChangePassword: true }
              : account
          ),
          currentUser:
            state.currentUser?.id === accountId
              ? { ...state.currentUser, password: defaultPassword, mustChangePassword: true }
              : state.currentUser,
        }));

        return { success: true, message: '密码已重置为系统默认密码', password: defaultPassword };
      },
      updateSystemSettings: (settings) =>
        set((state) => ({
          systemSettings: { ...state.systemSettings, ...settings },
          exceptionCases: applyAutoExceptionRules({
            ...state,
            systemSettings: { ...state.systemSettings, ...settings },
          }),
        })),
      updateNumberingRules: (rules) =>
        set((state) => ({
          systemSettings: {
            ...state.systemSettings,
            numberingRules: { ...state.systemSettings.numberingRules, ...rules },
          },
        })),

      // 订单状态
      orders: mockOrders,
      setOrders: (orders) => set({ orders }),
      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
        })),
      receiveOrder: (orderId, inspector) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: 'inspecting' as const,
                  inspector,
                  packageNo: `${get().systemSettings.numberingRules.packagePrefix}${Date.now()}`,
                }
              : o
          ),
        })),

      // 质检记录
      qualityRecords: [],
      addQualityRecord: (record) =>
        set((state) => ({
          qualityRecords: [...state.qualityRecords, record],
        })),

      // 封包追踪
      packageTraces: mockPackageTraces,
      updatePackageTrace: (trace) =>
        set((state) => ({
          packageTraces: state.packageTraces.map((t) => (t.packageNo === trace.packageNo ? trace : t)),
        })),

      // 库存
      inventory: mockInventory,
      updateInventory: (item) =>
        set((state) => {
          const existing = state.inventory.some((inventoryItem) => inventoryItem.packageNo === item.packageNo);
          return {
            inventory: existing
              ? state.inventory.map((inventoryItem) =>
                  inventoryItem.packageNo === item.packageNo ? item : inventoryItem
                )
              : [...state.inventory, item],
          };
        }),

      // 扫码记录
      scanRecords: [],
      addScanRecord: (record) =>
        set((state) => ({
          scanRecords: [...state.scanRecords, record],
        })),
      addHandoverRecord: (record) =>
        set((state) => {
          const businessSync = syncBusinessDataWithHandover(state, record);
          const nextExceptionCases = applyAutoExceptionRules({
            ...state,
            ...businessSync,
            handoverRecords: [record, ...state.handoverRecords],
          });

          return {
            handoverRecords: [record, ...state.handoverRecords],
            exceptionCases: nextExceptionCases,
            ...businessSync,
          };
        }),
      advanceHandoverRecord: (recordId) =>
        set((state) => {
          const targetRecord = state.handoverRecords.find((item) => item.id === recordId);

          if (!targetRecord || targetRecord.status === 'completed' || targetRecord.status === 'exception') {
            return state;
          }

          const nextStatus: HandoverRecord['status'] =
            targetRecord.status === 'pending_confirm' ? 'confirmed' : 'completed';
          const nextRecord: HandoverRecord = {
            ...targetRecord,
            status: nextStatus,
            wechatConfirmed: true,
            handoverTime: createCurrentTimestamp(),
            remarks: appendRemark(
              targetRecord.remarks,
              nextStatus === 'completed' ? '交接流程已完成闭环。' : '已收到扫码确认，进入待完结状态。'
            ),
          };
          const businessSync = syncBusinessDataWithHandover(state, nextRecord);
          const nextHandoverRecords = state.handoverRecords.map((item) => (item.id === recordId ? nextRecord : item));
          const nextExceptionCases = applyAutoExceptionRules({
            ...state,
            ...businessSync,
            handoverRecords: nextHandoverRecords,
          });

          return {
            handoverRecords: nextHandoverRecords,
            exceptionCases: nextExceptionCases,
            ...businessSync,
          };
        }),
      updateHandoverRecord: (recordId, updates) =>
        set((state) => {
          const targetRecord = state.handoverRecords.find((item) => item.id === recordId);

          if (!targetRecord) {
            return state;
          }

          const normalizedUpdates =
            'corpWechatUserId' in updates || 'corpWechatDisplayName' in updates
              ? {
                  ...updates,
                  corpWechatUserId: updates.corpWechatUserId?.trim() || undefined,
                  corpWechatDisplayName: updates.corpWechatDisplayName?.trim() || undefined,
                  lastWechatBindingAt:
                    updates.corpWechatUserId === ''
                      ? undefined
                      : updates.corpWechatUserId || updates.corpWechatDisplayName
                        ? createCurrentTimestamp()
                        : updates.lastWechatBindingAt,
                }
              : updates;

          const nextRecord = {
            ...targetRecord,
            ...normalizedUpdates,
          };
          const nextHandoverRecords = state.handoverRecords.map((item) => (item.id === recordId ? nextRecord : item));
          const nextExceptionCases = applyAutoExceptionRules({
            ...state,
            handoverRecords: nextHandoverRecords,
          });

          return {
            handoverRecords: nextHandoverRecords,
            exceptionCases: nextExceptionCases,
          };
        }),
      updateExceptionCase: (caseId, updates) =>
        set((state) => {
          const currentCase = state.exceptionCases.find((item) => item.id === caseId);

          if (!currentCase) {
            return state;
          }

          const actor = state.currentUser?.name || '系统';
          const nextStatus = updates.status ?? currentCase.status;
          const action =
            nextStatus !== currentCase.status
              ? nextStatus === 'processing'
                ? '转入处理中'
                : nextStatus === 'resolved'
                  ? '已解决'
                  : nextStatus === 'closed'
                    ? '已关闭'
                    : '异常更新'
              : '异常更新';
          const detail =
            updates.latestAction || updates.resolution || (nextStatus !== currentCase.status ? `异常状态已更新为 ${nextStatus}` : '异常信息已更新。');
          const nextCase = {
            ...currentCase,
            ...updates,
            actionLogs: [...(currentCase.actionLogs ?? []), createExceptionLog(action, detail, actor)],
          };
          const businessSync = syncBusinessDataWithException(state, nextCase);
          const nextExceptionCases = state.exceptionCases.map((item) => (item.id === caseId ? nextCase : item));

          return {
            exceptionCases: applyAutoExceptionRules({
              ...state,
              ...businessSync,
              exceptionCases: nextExceptionCases,
            }),
            ...businessSync,
          };
        }),

      // 统计数据
      stats: mockStats,
      updateStats: (newStats) =>
        set((state) => ({
          stats: { ...state.stats, ...newStats },
        })),
    }),
    {
      name: 'diamond-erp-store',
      version: 6,
      migrate: (persistedState) => persistedState as AppState,
      merge: (persistedState, currentState) => {
        const typedPersistedState = persistedState as Partial<AppState> | undefined;
        const mergedInventoryMap = new Map<string, Inventory>();
        const mergedCustomerOrderMap = new Map<string, CustomerOrder>();
        const mergedShipmentTaskMap = new Map<string, ShipmentTask>();

        currentState.inventory.forEach((item) => {
          mergedInventoryMap.set(item.packageNo, normalizeInventoryItem(item, currentState.purchaseBatches));
        });

        currentState.customerOrders.forEach((item) => {
          mergedCustomerOrderMap.set(item.orderNo, normalizeCustomerOrder(item));
        });

        currentState.shipmentTasks.forEach((item) => {
          mergedShipmentTaskMap.set(item.shipmentNo, normalizeShipmentTask(item));
        });

        typedPersistedState?.inventory?.forEach((item) => {
          const fallbackInventory = mergedInventoryMap.get(item.packageNo);
          mergedInventoryMap.set(
            item.packageNo,
            normalizeInventoryItem(item, typedPersistedState?.purchaseBatches || currentState.purchaseBatches, fallbackInventory)
          );
        });

        typedPersistedState?.customerOrders?.forEach((item) => {
          const fallbackOrder = mergedCustomerOrderMap.get(item.orderNo);
          mergedCustomerOrderMap.set(item.orderNo, normalizeCustomerOrder(item, fallbackOrder));
        });

        typedPersistedState?.shipmentTasks?.forEach((item) => {
          const fallbackTask = mergedShipmentTaskMap.get(item.shipmentNo);
          mergedShipmentTaskMap.set(item.shipmentNo, normalizeShipmentTask(item, fallbackTask));
        });

        return {
          ...currentState,
          ...typedPersistedState,
          inventory: Array.from(mergedInventoryMap.values()),
          customerOrders: Array.from(mergedCustomerOrderMap.values()),
          shipmentTasks: Array.from(mergedShipmentTaskMap.values()),
          rolePermissions: mockRolePermissions,
          systemSettings: {
            ...currentState.systemSettings,
            ...typedPersistedState?.systemSettings,
            numberingRules: {
              ...currentState.systemSettings.numberingRules,
              ...typedPersistedState?.systemSettings?.numberingRules,
            },
          },
        };
      },
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        accounts: state.accounts,
        rolePermissions: state.rolePermissions,
        systemSettings: state.systemSettings,
        orders: state.orders,
        qualityRecords: state.qualityRecords,
        packageTraces: state.packageTraces,
        purchaseBatches: state.purchaseBatches,
        customerOrders: state.customerOrders,
        transitRecords: state.transitRecords,
        receiptRecords: state.receiptRecords,
        sortingTasks: state.sortingTasks,
        screeningTasks: state.screeningTasks,
        packingTasks: state.packingTasks,
        shipmentTasks: state.shipmentTasks,
        handoverRecords: state.handoverRecords,
        exceptionCases: state.exceptionCases,
        inventory: state.inventory,
        scanRecords: state.scanRecords,
        stats: state.stats,
      }),
    }
  )
);
