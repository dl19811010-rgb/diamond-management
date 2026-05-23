export type UserRole =
  | 'admin'
  | 'purchaser'
  | 'receiver'
  | 'hk_receiver'
  | 'sz_receiver'
  | 'inspector'
  | 'sorter'
  | 'screening'
  | 'packer'
  | 'shipper'
  | 'finance';

export type AccountStatus = 'active' | 'disabled';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '系统管理员',
  purchaser: '采购专员',
  receiver: '收货员',
  hk_receiver: '香港收货员',
  sz_receiver: '深圳收货员',
  inspector: '质检员',
  sorter: '分选员',
  screening: '细筛员',
  packer: '封包员',
  shipper: '出货员',
  finance: '财务',
};

export interface Account {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  department: string;
  title?: string;
  phone?: string;
  avatar?: string;
  wechatBound: boolean;
  corpWechatUserId?: string;
  corpWechatDisplayName?: string;
  lastWechatBindingAt?: string;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt?: string;
  mustChangePassword: boolean;
}

export interface CreateAccountInput {
  username: string;
  name: string;
  role: UserRole;
  department: string;
  phone?: string;
  title?: string;
  password?: string;
  wechatBound?: boolean;
  corpWechatUserId?: string;
  corpWechatDisplayName?: string;
}

export interface RolePermission {
  role: UserRole;
  name: string;
  description: string;
  pages: string[];
}

export interface NumberingRules {
  purchasePrefix: string;
  customerOrderPrefix: string;
  receiptPrefix: string;
  batchPrefix: string;
  packagePrefix: string;
  handoverPrefix: string;
  shipmentPrefix: string;
}

export interface SystemSettings {
  companyName: string;
  systemName: string;
  version: string;
  supportContact: string;
  defaultPassword: string;
  allowRememberMe: boolean;
  corpWechatIntegrationEnabled: boolean;
  forceWechatBindingForHandover: boolean;
  enableOperationLog: boolean;
  corpWechatAppName: string;
  corpWechatCorpId: string;
  corpWechatAgentId: string;
  corpWechatCallbackUrl: string;
  autoCreateTransitExceptionOnDelay: boolean;
  autoCreateHandoverExceptionOnPendingConfirm: boolean;
  autoCreateExceptionOnWechatUnbound: boolean;
  autoCreatePackingExceptionOnStatus: boolean;
  warehouseSites: string[];
  stoneCategories: string[];
  qualityGrades: string[];
  exceptionTypes: string[];
  numberingRules: NumberingRules;
}

export interface PurchaseBatch {
  id: string;
  purchaseNo: string;
  sourceType: '印度采购';
  supplierId?: string;
  supplier: string;
  stoneCategory: string;
  roughType: '小厘石' | '小份石';
  sizeCategory?: string;
  qualityRequirement?: string;
  expectedWeight: number;
  expectedStoneCount: number;
  purchasedWeight?: number;
  purchasedStoneCount?: number;
  purchaseDate: string;
  expectedArrivalDate: string;
  plannedDepartureDate?: string;
  origin: string;
  destination: string;
  plannedFromSite?: string;
  plannedToSite?: string;
  currency?: 'INR' | 'USD' | 'HKD' | 'CNY';
  purchaseAmount?: number;
  buyerUserId?: string;
  buyer: string;
  status:
    | 'draft'
    | 'confirmed'
    | 'shipping'
    | 'in_transit_to_hk'
    | 'arrived_hk'
    | 'transferred_sz'
    | 'arrived_sz'
    | 'received'
    | 'in_processing'
    | 'completed'
    | 'voided'
    | 'exception';
  notes?: string;
  createdAt?: string;
  confirmedAt?: string;
}

export interface CreatePurchaseBatchInput {
  supplier: string;
  stoneCategory: string;
  roughType: '小厘石' | '小份石';
  expectedWeight: number;
  expectedStoneCount: number;
  purchaseDate: string;
  expectedArrivalDate: string;
  origin: string;
  destination: string;
  buyer: string;
  qualityRequirement?: string;
  plannedDepartureDate?: string;
  plannedFromSite?: string;
  plannedToSite?: string;
  currency?: 'INR' | 'USD' | 'HKD' | 'CNY';
  purchaseAmount?: number;
  notes?: string;
}

export interface FinanceTransactionRecord {
  id: string;
  type: 'invoice' | 'payment' | 'writeoff';
  amount: number;
  referenceNo?: string;
  operator: string;
  recordedAt: string;
  remark?: string;
}

export interface DunningFollowUpRecord {
  id: string;
  status: 'pending' | 'contacted' | 'promised' | 'escalated' | 'resolved';
  operator: string;
  recordedAt: string;
  nextFollowUpAt?: string;
  remark?: string;
}

export interface CustomerOrder {
  id: string;
  orderNo: string;
  customerId?: string;
  customerName: string;
  orderSource: '老客户复购' | '业务报价' | '现货匹配' | '渠道转单';
  orderDate: string;
  salesUserId?: string;
  salesName: string;
  requiredStoneCategory: '小厘石' | '小份石';
  requiredQuality?: string;
  requiredWeight: number;
  requiredStoneCount?: number;
  packageRequirement?: string;
  shipmentRequirement?: string;
  signoffRequirement?: string;
  requestedDeliveryDate?: string;
  priorityLevel: 'normal' | 'urgent' | 'vip';
  matchedPackageNos: string[];
  matchedInventoryWeight: number;
  latestShipmentNo?: string;
  customerContact?: string;
  customerContactPhone?: string;
  customerCreditLimit?: number;
  settlementMode?: '预付款' | '月结' | '到付' | '其他';
  orderAmount?: number;
  remark?: string;
  receiptConfirmed?: boolean;
  receiptConfirmedAt?: string;
  receiptConfirmedBy?: string;
  financeConfirmed?: boolean;
  financeConfirmedAt?: string;
  financeConfirmedBy?: string;
  invoiceRegistered?: boolean;
  invoiceRegisteredAt?: string;
  invoiceRegisteredBy?: string;
  invoiceNo?: string;
  paymentRegistered?: boolean;
  paymentRegisteredAt?: string;
  paymentRegisteredBy?: string;
  paymentReferenceNo?: string;
  paidAmount?: number;
  writeOffAmount?: number;
  writeOffAt?: string;
  writeOffBy?: string;
  writeOffReferenceNo?: string;
  financeRecords?: FinanceTransactionRecord[];
  dunningStatus?: DunningFollowUpRecord['status'];
  lastDunningAt?: string;
  lastDunningBy?: string;
  nextDunningAt?: string;
  dunningRemark?: string;
  dunningRecords?: DunningFollowUpRecord[];
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  status:
    | 'draft'
    | 'confirmed'
    | 'matching'
    | 'partially_matched'
    | 'ready_to_ship'
    | 'shipped'
    | 'signed'
    | 'completed'
    | 'voided'
    | 'exception';
  createdAt: string;
  confirmedAt?: string;
}

export interface CreateCustomerOrderInput {
  customerName: string;
  orderSource: CustomerOrder['orderSource'];
  orderDate: string;
  salesName: string;
  requiredStoneCategory: CustomerOrder['requiredStoneCategory'];
  requiredQuality?: string;
  requiredWeight: number;
  requiredStoneCount?: number;
  packageRequirement?: string;
  shipmentRequirement?: string;
  signoffRequirement?: string;
  requestedDeliveryDate?: string;
  priorityLevel: CustomerOrder['priorityLevel'];
  customerContact?: string;
  customerContactPhone?: string;
  settlementMode?: CustomerOrder['settlementMode'];
  orderAmount?: number;
  remark?: string;
}

export interface TransitRecord {
  id: string;
  transitNo: string;
  relatedPurchaseNo: string;
  route: 'india_to_hk' | 'hk_to_sz';
  batchCount: number;
  stoneCategory: string;
  expectedWeight: number;
  actualWeight?: number;
  departureTime: string;
  expectedArrivalTime: string;
  actualArrivalTime?: string;
  fromLocation: string;
  toLocation: string;
  carrier: string;
  handoverBy: string;
  receivedBy?: string;
  status: 'pending_departure' | 'in_transit' | 'arrived' | 'signed' | 'delayed' | 'exception';
  riskLevel: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface ReceiptRecord {
  id: string;
  receiptNo: string;
  receiptType: 'hk_receipt' | 'sz_receipt';
  batchId?: string;
  batchNo: string;
  sourceTransitId?: string;
  sourceTransitNo: string;
  siteCode: 'HK' | 'SZ';
  siteName: string;
  expectedWeight: number;
  actualWeight: number;
  weightDiff: number;
  expectedStoneCount: number;
  actualStoneCount: number;
  stoneDiff: number;
  packageIntegrity: '完好' | '轻微破损' | '严重破损';
  sealCheckResult?: '一致' | '不一致' | '无封签';
  receiptPhotos: string[];
  receiverUserId?: string;
  receiverName: string;
  reviewerUserId?: string;
  reviewerName?: string;
  receiptTime: string;
  reviewTime?: string;
  differenceLevel: 'none' | 'minor' | 'major';
  differenceReason?: string;
  allowNextStep: boolean;
  inventoryPosted: boolean;
  exceptionCaseId?: string;
  remark?: string;
  status: 'pending' | 'receiving' | 'received' | 'reviewing' | 'reviewed' | 'exception' | 'posted' | 'closed' | 'voided';
  createdBy: string;
  createdAt: string;
}

export interface CreateReceiptInput {
  receiptType: ReceiptRecord['receiptType'];
  batchNo: string;
  sourceTransitNo: string;
  siteCode: ReceiptRecord['siteCode'];
  siteName: string;
  expectedWeight: number;
  actualWeight: number;
  expectedStoneCount: number;
  actualStoneCount: number;
  packageIntegrity: ReceiptRecord['packageIntegrity'];
  sealCheckResult?: ReceiptRecord['sealCheckResult'];
  receiverName: string;
  reviewerName?: string;
  differenceReason?: string;
  remark?: string;
}

export interface SortingTask {
  id: string;
  sortingNo: string;
  sourceBatchNo: string;
  sourceReceiptNo?: string;
  sourceInventoryPackageNo?: string;
  dispatchSource?: 'manual' | 'receipt_auto';
  stoneCategory: string;
  assignedTo: string;
  receiveDate: string;
  startTime: string;
  expectedFinishTime: string;
  returnedTime?: string;
  inputWeight: number;
  outputWeight?: number;
  lossWeight?: number;
  inputStoneCount: number;
  outputStoneCount?: number;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'exception';
  priority: 'normal' | 'urgent';
  resultSummary: string;
}

export interface ScreeningTask {
  id: string;
  screeningNo: string;
  sourceSortingNo: string;
  ruleName: string;
  assignedTo: string;
  scheduledDate: string;
  completedDate?: string;
  beforeWeight: number;
  afterWeight?: number;
  beforeStoneCount: number;
  afterStoneCount?: number;
  reviewBy?: string;
  result: 'pending' | 'screening' | 'passed' | 'recheck' | 'failed';
  gradeChange: 'up' | 'same' | 'down';
  notes: string;
}

export interface PackingTask {
  id: string;
  packingNo: string;
  sourceScreeningNo: string;
  packageNo: string;
  sealCode: string;
  assignedTo: string;
  reviewedBy?: string;
  packDate: string;
  targetCustomer: string;
  netWeight: number;
  stoneCount: number;
  packageCount: number;
  status: 'pending' | 'packing' | 'review' | 'completed' | 'exception';
  packagingType: '标准封包' | '客户专包';
  remarks: string;
}

export interface ShipmentTask {
  id: string;
  shipmentNo: string;
  sourceOrderNo?: string;
  customerName: string;
  packageNo: string;
  packageNos?: string[];
  packageCount?: number;
  relatedPackingNo: string;
  dispatchSource?: 'packing' | 'inventory_match';
  logisticProvider?: string;
  logisticNo?: string;
  plannedShipDate: string;
  shippedDate?: string;
  signedDate?: string;
  reviewedBy: string;
  shippedBy?: string;
  receiptConfirmed?: boolean;
  receiptConfirmedAt?: string;
  receiptConfirmedBy?: string;
  netWeight: number;
  stoneCount: number;
  status: 'pending_review' | 'ready_to_ship' | 'shipped' | 'signed' | 'delayed' | 'exception';
  shippingRequirement: string;
}

export interface HandoverRecord {
  id: string;
  handoverNo: string;
  businessType: '采购到港' | '香港转深圳' | '分选领料' | '分选交回' | '细筛交接' | '封包复核' | '出货签收';
  relatedNo: string;
  packageNo?: string;
  fromNode: string;
  toNode: string;
  handoverBy: string;
  receivedBy: string;
  handoverTime: string;
  status: 'pending_confirm' | 'confirmed' | 'completed' | 'exception';
  wechatConfirmed: boolean;
  corpWechatUserId?: string;
  corpWechatDisplayName?: string;
  lastWechatBindingAt?: string;
  netWeight: number;
  stoneCount: number;
  remarks: string;
}

export interface ExceptionActionLog {
  id: string;
  action: string;
  detail: string;
  actor: string;
  timestamp: string;
}

export interface ExceptionCase {
  id: string;
  caseNo: string;
  businessType: '在途流转' | '分选' | '细筛' | '封包' | '出货' | '扫码交接';
  relatedNo: string;
  packageNo?: string;
  title: string;
  exceptionType: string;
  severity: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'resolved' | 'closed';
  discoveredAt: string;
  discoveredBy: string;
  owner: string;
  resolution?: string;
  latestAction: string;
  actionLogs?: ExceptionActionLog[];
}

// 订单相关类型
export interface Order {
  id: string;
  orderNo: string;
  supplier: string;
  netWeight: number;
  stoneCount: number;
  status: 'pending' | 'inspecting' | 'completed' | 'exception';
  receiveTime: string;
  inspector?: string;
  packageNo?: string;
}

// 质检记录类型
export interface QualityRecord {
  id: string;
  orderId: string;
  packageNo: string;
  result: 'passed' | 'failed';
  issues?: QualityIssue[];
  inspector: string;
  inspectTime: string;
  netWeight: number;
  stoneCount: number;
}

// 质量问题类型
export interface QualityIssue {
  type: string;
  description: string;
  count: number;
}

// 封包追踪类型
export interface PackageTrace {
  packageNo: string;
  orderId: string;
  steps: TraceStep[];
  currentStatus: string;
}

export interface TraceStep {
  stage: string;
  status: 'pending' | 'processing' | 'completed';
  timestamp?: string;
  operator?: string;
  data?: {
    passed?: number;
    failed?: number;
    netWeight?: number;
    stoneCount?: number;
  };
}

// 用户类型
export interface User {
  id: string;
  name: string;
  avatar?: string;
  role: UserRole;
  wechatBound: boolean;
}

// 库存类型
export interface Inventory {
  id: string;
  packageNo: string;
  stoneCategory?: string;
  sourceBatchNo?: string;
  sourceReceiptNo?: string;
  sourceTransitNo?: string;
  sourceSiteName?: string;
  reservedForOrderNo?: string;
  netWeight: number;
  stoneCount: number;
  status: 'pending_test' | 'testing' | 'passed' | 'failed';
  location: string;
  entryTime: string;
  createdBy?: string;
  remark?: string;
}

// 扫码记录类型
export interface ScanRecord {
  id: string;
  type: 'receive' | 'deliver';
  orderId: string;
  packageNo: string;
  operator: string;
  scanTime: string;
  wechatConfirmed: boolean;
  data: {
    netWeight: number;
    stoneCount: number;
  };
}

// 统计数据类型
export interface DashboardStats {
  pendingCount: number;
  inspectingCount: number;
  completedCount: number;
  exceptionCount: number;
  todayInspectCount: number;
  todayPassRate: number;
}
