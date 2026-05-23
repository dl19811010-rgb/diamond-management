import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeDollarSign,
  BellRing,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Clock3,
  FileArchive,
  FileText,
  PhoneCall,
  ReceiptText,
  Search,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PageSectionLayout from '@/components/layout/PageSectionLayout';
import { useStore } from '@/hooks/useStore';
import { toast } from 'sonner';

type LedgerFilter = 'all' | 'pending_receipt' | 'pending_finance' | 'pending_archive' | 'archived';
type LedgerStatus = Exclude<LedgerFilter, 'all'>;
type DunningFilter = 'all' | DunningRow['status'] | 'due_today' | 'due_overdue';

interface FinanceRecordItem {
  id: string;
  type: 'invoice' | 'payment' | 'writeoff';
  amount: number;
  referenceNo?: string;
  operator: string;
  recordedAt: string;
  remark?: string;
}

interface DunningRecordItem {
  id: string;
  status: 'pending' | 'contacted' | 'promised' | 'escalated' | 'resolved';
  operator: string;
  recordedAt: string;
  nextFollowUpAt?: string;
  remark?: string;
}

interface LedgerRow {
  orderId: string;
  orderNo: string;
  shipmentNo: string;
  customerName: string;
  customerCreditLimit: number;
  settlementMode: string;
  orderAmount: number;
  shippedDate?: string;
  signedDate?: string;
  receiptConfirmedAt?: string;
  receiptConfirmedBy?: string;
  financeConfirmedAt?: string;
  financeConfirmedBy?: string;
  invoiceRegisteredAt?: string;
  invoiceRegisteredBy?: string;
  invoiceNo?: string;
  paymentRegistered: boolean;
  paymentRegisteredAt?: string;
  paymentRegisteredBy?: string;
  paymentReferenceNo?: string;
  paidAmount: number;
  writeOffAmount: number;
  writeOffAt?: string;
  writeOffBy?: string;
  writeOffReferenceNo?: string;
  financeRecords: FinanceRecordItem[];
  dunningStatus?: DunningRecordItem['status'];
  lastDunningAt?: string;
  lastDunningBy?: string;
  nextDunningAt?: string;
  dunningRemark?: string;
  dunningRecords: DunningRecordItem[];
  archivedAt?: string;
  archivedBy?: string;
  agingDays: number;
  remainingAmount: number;
  status: LedgerStatus;
}

interface AgingBucket {
  key: '0-7' | '8-15' | '16-30' | '30+';
  label: string;
  amount: number;
  count: number;
}

interface StatementRow {
  customerName: string;
  settlementModes: string[];
  orderCount: number;
  totalAmount: number;
  outstandingAmount: number;
  archivedAmount: number;
  creditLimit: number;
  availableCredit: number;
  maxAgingDays: number;
  isRestricted: boolean;
  restrictionReason: string;
  outstandingOrders: string[];
}

interface InvoiceRow {
  orderId: string;
  orderNo: string;
  customerName: string;
  statementMonth: string;
  amount: number;
  invoiceNo: string;
  status: 'pending_issue' | 'issued';
}

interface AlertRow {
  orderId: string;
  orderNo: string;
  customerName: string;
  creditLimit: number;
  agingDays: number;
  amount: number;
  level: 'notice' | 'warning';
  reason: string;
}

interface WriteOffRow {
  orderId: string;
  orderNo: string;
  customerName: string;
  amount: number;
  referenceNo: string;
  recordedAt?: string;
  recordedBy?: string;
}

interface DunningRow {
  orderId: string;
  orderNo: string;
  customerName: string;
  status: DunningRecordItem['status'];
  recordedAt: string;
  recordedBy: string;
  nextFollowUpAt?: string;
  remark?: string;
}

const dunningStatusConfig: Record<DunningRow['status'], { label: string; className: string }> = {
  pending: { label: '待催收', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  contacted: { label: '已联系', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  promised: { label: '已承诺', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  escalated: { label: '升级催收', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  resolved: { label: '已闭环', className: 'border-violet-200 bg-violet-50 text-violet-700' },
};

const ledgerStatusConfig: Record<LedgerStatus, { label: string; className: string }> = {
  pending_receipt: {
    label: '待回单确认',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  pending_finance: {
    label: '待财务确认',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  pending_archive: {
    label: '待归档',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  archived: {
    label: '已归档',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

const getLedgerStatus = (row: Pick<LedgerRow, 'receiptConfirmedAt' | 'financeConfirmedAt' | 'archivedAt'>): LedgerStatus => {
  if (row.archivedAt) {
    return 'archived';
  }

  if (row.financeConfirmedAt) {
    return 'pending_archive';
  }

  if (row.receiptConfirmedAt) {
    return 'pending_finance';
  }

  return 'pending_receipt';
};

const getInvoiceStatusLabel = (status: InvoiceRow['status']) =>
  status === 'issued'
    ? { label: '已开票', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
    : { label: '待开票', className: 'border-amber-200 bg-amber-50 text-amber-700' };

const parseDateTime = (value?: string) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/-/g, '/');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function FinanceLedger() {
  const customerOrders = useStore((state) => state.customerOrders);
  const shipmentTasks = useStore((state) => state.shipmentTasks);
  const registerCustomerOrderInvoice = useStore((state) => state.registerCustomerOrderInvoice);
  const registerCustomerOrderPayment = useStore((state) => state.registerCustomerOrderPayment);
  const registerCustomerOrderWriteOff = useStore((state) => state.registerCustomerOrderWriteOff);
  const registerCustomerOrderDunningFollowUp = useStore((state) => state.registerCustomerOrderDunningFollowUp);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LedgerFilter>('all');
  const [dunningFilter, setDunningFilter] = useState<DunningFilter>('all');
  const today = useMemo(() => new Date('2026-05-09T12:00:00'), []);

  const ledgerRows = useMemo<LedgerRow[]>(
    () =>
      customerOrders
        .filter((order) => order.latestShipmentNo || order.orderAmount || order.receiptConfirmed || order.financeConfirmed || order.archived)
        .map((order) => {
          const shipment =
            shipmentTasks.find((item) => item.shipmentNo === order.latestShipmentNo) ||
            shipmentTasks.find((item) => item.sourceOrderNo === order.orderNo);
          const baseDateText = order.receiptConfirmedAt || shipment?.signedDate || shipment?.shippedDate || order.createdAt;
          const baseDate = baseDateText ? new Date(baseDateText.replace(/-/g, '/')) : today;
          const agingDays = Math.max(0, Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
          const paidAmount = order.paidAmount || 0;
          const writeOffAmount = order.writeOffAmount || 0;
          const remainingAmount = Math.max(0, (order.orderAmount || 0) - paidAmount - writeOffAmount);

          const rowBase = {
            orderId: order.id,
            orderNo: order.orderNo,
            shipmentNo: shipment?.shipmentNo || order.latestShipmentNo || '-',
            customerName: order.customerName,
            customerCreditLimit: order.customerCreditLimit || 0,
            settlementMode: order.settlementMode || '未设置',
            orderAmount: order.orderAmount || 0,
            shippedDate: shipment?.shippedDate,
            signedDate: shipment?.signedDate,
            receiptConfirmedAt: order.receiptConfirmedAt,
            receiptConfirmedBy: order.receiptConfirmedBy,
            financeConfirmedAt: order.financeConfirmedAt,
            financeConfirmedBy: order.financeConfirmedBy,
            invoiceRegisteredAt: order.invoiceRegisteredAt,
            invoiceRegisteredBy: order.invoiceRegisteredBy,
            invoiceNo: order.invoiceNo,
            paymentRegistered: Boolean(order.paymentRegistered),
            paymentRegisteredAt: order.paymentRegisteredAt,
            paymentRegisteredBy: order.paymentRegisteredBy,
            paymentReferenceNo: order.paymentReferenceNo,
            paidAmount,
            writeOffAmount,
            writeOffAt: order.writeOffAt,
            writeOffBy: order.writeOffBy,
            writeOffReferenceNo: order.writeOffReferenceNo,
            financeRecords: order.financeRecords || [],
            dunningStatus: order.dunningStatus,
            lastDunningAt: order.lastDunningAt,
            lastDunningBy: order.lastDunningBy,
            nextDunningAt: order.nextDunningAt,
            dunningRemark: order.dunningRemark,
            dunningRecords: order.dunningRecords || [],
            archivedAt: order.archivedAt,
            archivedBy: order.archivedBy,
            agingDays,
            remainingAmount,
          };

          return {
            ...rowBase,
            status: getLedgerStatus(rowBase),
          };
        })
        .sort((a, b) => {
          const timeA = a.archivedAt || a.financeConfirmedAt || a.receiptConfirmedAt || a.signedDate || a.shippedDate || '';
          const timeB = b.archivedAt || b.financeConfirmedAt || b.receiptConfirmedAt || b.signedDate || b.shippedDate || '';
          return timeB.localeCompare(timeA);
        }),
    [customerOrders, shipmentTasks, today]
  );

  const dueFollowUpRows = useMemo(() => {
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    return ledgerRows
      .filter((row) => row.remainingAmount > 0 && row.nextDunningAt)
      .map((row) => {
        const nextFollowUpDate = parseDateTime(row.nextDunningAt);
        if (!nextFollowUpDate) {
          return null;
        }

        return {
          ...row,
          dueType:
            nextFollowUpDate.getTime() < today.getTime()
              ? ('overdue' as const)
              : nextFollowUpDate.getTime() <= endOfToday.getTime()
                ? ('today' as const)
                : ('upcoming' as const),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => row.dueType !== 'upcoming')
      .sort((a, b) => {
        if (a.dueType !== b.dueType) {
          return a.dueType === 'overdue' ? -1 : 1;
        }
        return (a.nextDunningAt || '').localeCompare(b.nextDunningAt || '');
      });
  }, [ledgerRows, today]);

  const filteredRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return ledgerRows.filter((row) => {
      const matchesKeyword =
        !keyword ||
        row.orderNo.toLowerCase().includes(keyword) ||
        row.shipmentNo.toLowerCase().includes(keyword) ||
        row.customerName.toLowerCase().includes(keyword) ||
        row.settlementMode.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesDunning =
        dunningFilter === 'all'
          ? true
          : dunningFilter === 'due_today'
            ? dueFollowUpRows.some((item) => item.orderId === row.orderId && item.dueType === 'today')
            : dunningFilter === 'due_overdue'
              ? dueFollowUpRows.some((item) => item.orderId === row.orderId && item.dueType === 'overdue')
              : row.dunningStatus === dunningFilter;

      return matchesKeyword && matchesStatus && matchesDunning;
    });
  }, [dueFollowUpRows, dunningFilter, ledgerRows, searchTerm, statusFilter]);

  const totalAmount = ledgerRows.reduce((sum, row) => sum + row.orderAmount, 0);
  const archivedAmount = ledgerRows.filter((row) => row.status === 'archived').reduce((sum, row) => sum + row.orderAmount, 0);
  const monthlySettlementAmount = ledgerRows
    .filter((row) => row.settlementMode === '月结')
    .reduce((sum, row) => sum + row.orderAmount, 0);
  const outstandingAmount = ledgerRows.reduce((sum, row) => sum + row.remainingAmount, 0);

  const monthlySummary = useMemo(() => {
    const summaryMap = new Map<
      string,
      {
        month: string;
        orderCount: number;
        amount: number;
        archivedCount: number;
        monthSettleCount: number;
        outstandingAmount: number;
      }
    >();

    ledgerRows.forEach((row) => {
      const sourceDate = row.archivedAt || row.financeConfirmedAt || row.receiptConfirmedAt || row.signedDate || row.shippedDate;
      const month = (sourceDate || '未归档').slice(0, 7) || '未归档';
      const current = summaryMap.get(month) || {
        month,
        orderCount: 0,
        amount: 0,
        archivedCount: 0,
        monthSettleCount: 0,
        outstandingAmount: 0,
      };

      current.orderCount += 1;
      current.amount += row.orderAmount;
      current.archivedCount += row.status === 'archived' ? 1 : 0;
      current.monthSettleCount += row.settlementMode === '月结' ? 1 : 0;
      current.outstandingAmount += row.remainingAmount;
      summaryMap.set(month, current);
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
  }, [ledgerRows]);

  const settlementSummary = useMemo(() => {
    const map = new Map<string, { mode: string; count: number; amount: number; outstandingAmount: number }>();

    ledgerRows.forEach((row) => {
      const current = map.get(row.settlementMode) || { mode: row.settlementMode, count: 0, amount: 0, outstandingAmount: 0 };
      current.count += 1;
      current.amount += row.orderAmount;
      current.outstandingAmount += row.remainingAmount;
      map.set(row.settlementMode, current);
    });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [ledgerRows]);

  const agingSummary = useMemo<AgingBucket[]>(() => {
    const buckets: AgingBucket[] = [
      { key: '0-7', label: '0-7天', amount: 0, count: 0 },
      { key: '8-15', label: '8-15天', amount: 0, count: 0 },
      { key: '16-30', label: '16-30天', amount: 0, count: 0 },
      { key: '30+', label: '30天以上', amount: 0, count: 0 },
    ];

    ledgerRows
      .filter((row) => row.remainingAmount > 0)
      .forEach((row) => {
        const targetBucket =
          row.agingDays <= 7
            ? buckets[0]
            : row.agingDays <= 15
              ? buckets[1]
              : row.agingDays <= 30
                ? buckets[2]
                : buckets[3];

        targetBucket.amount += row.remainingAmount;
        targetBucket.count += 1;
      });

    return buckets;
  }, [ledgerRows]);

  const customerStatements = useMemo<StatementRow[]>(() => {
    const map = new Map<string, StatementRow>();

    ledgerRows.forEach((row) => {
      const current = map.get(row.customerName) || {
        customerName: row.customerName,
        settlementModes: [],
        orderCount: 0,
        totalAmount: 0,
        outstandingAmount: 0,
        archivedAmount: 0,
        creditLimit: row.customerCreditLimit,
        availableCredit: row.customerCreditLimit,
        maxAgingDays: 0,
        isRestricted: false,
        restrictionReason: '正常',
        outstandingOrders: [],
      };

      current.orderCount += 1;
      current.totalAmount += row.orderAmount;
      current.creditLimit = Math.max(current.creditLimit, row.customerCreditLimit);
      if (!current.settlementModes.includes(row.settlementMode)) {
        current.settlementModes.push(row.settlementMode);
      }
      if (row.status === 'archived') {
        current.archivedAmount += row.orderAmount;
      }
      if (row.remainingAmount > 0) {
        current.outstandingAmount += row.remainingAmount;
        current.maxAgingDays = Math.max(current.maxAgingDays, row.agingDays);
        current.outstandingOrders.push(row.orderNo);
      }

      map.set(row.customerName, current);
    });

    return Array.from(map.values())
      .map((item) => {
        const reasons: string[] = [];
        if (item.creditLimit > 0 && item.outstandingAmount > item.creditLimit) {
          reasons.push(`信用占用超额 ${Number(item.outstandingAmount - item.creditLimit).toLocaleString()} 元`);
        }
        if (item.maxAgingDays >= 16) {
          reasons.push(`存在逾期 ${item.maxAgingDays} 天订单`);
        } else if (item.maxAgingDays >= 8) {
          reasons.push(`账龄关注 ${item.maxAgingDays} 天`);
        }

        const availableCredit = item.creditLimit > 0 ? Math.max(0, item.creditLimit - item.outstandingAmount) : 0;
        const isRestricted = item.maxAgingDays >= 16 || (item.creditLimit > 0 && item.outstandingAmount > item.creditLimit);

        return {
          ...item,
          availableCredit,
          isRestricted,
          restrictionReason: reasons.join('；') || '正常',
        };
      })
      .sort((a, b) => b.outstandingAmount - a.outstandingAmount || b.totalAmount - a.totalAmount);
  }, [ledgerRows]);

  const invoiceRows = useMemo<InvoiceRow[]>(
    () =>
      ledgerRows
        .filter((row) => row.settlementMode === '月结')
        .map((row) => {
          const monthSource = row.archivedAt || row.financeConfirmedAt || row.receiptConfirmedAt || row.signedDate || row.shippedDate || '';
          const statementMonth = monthSource ? monthSource.slice(0, 7) : '待生成';
          const status: InvoiceRow['status'] = row.invoiceRegisteredAt ? 'issued' : 'pending_issue';
          return {
            orderId: row.orderId,
            orderNo: row.orderNo,
            customerName: row.customerName,
            statementMonth,
            amount: row.orderAmount,
            invoiceNo: row.invoiceNo || '-',
            status,
          };
        })
        .sort((a, b) => b.statementMonth.localeCompare(a.statementMonth)),
    [ledgerRows]
  );

  const alertRows = useMemo<AlertRow[]>(
    () =>
      ledgerRows
        .filter((row) => row.remainingAmount > 0 && (row.agingDays >= 8 || (row.customerCreditLimit > 0 && row.remainingAmount > row.customerCreditLimit)))
        .map((row) => {
          const overCredit = row.customerCreditLimit > 0 && row.remainingAmount > row.customerCreditLimit;
          const level: AlertRow['level'] = row.agingDays >= 16 || overCredit ? 'warning' : 'notice';
          const reasons = [
            overCredit ? `未结金额超信用额度 ${Number(row.remainingAmount - row.customerCreditLimit).toLocaleString()} 元` : '',
            row.agingDays >= 16 ? `账龄已达 ${row.agingDays} 天` : row.agingDays >= 8 ? `账龄关注 ${row.agingDays} 天` : '',
          ].filter(Boolean);

          return {
            orderId: row.orderId,
            orderNo: row.orderNo,
            customerName: row.customerName,
            creditLimit: row.customerCreditLimit,
            agingDays: row.agingDays,
            amount: row.remainingAmount,
            level,
            reason: reasons.join('；'),
          };
        })
        .sort((a, b) => b.agingDays - a.agingDays || b.amount - a.amount),
    [ledgerRows]
  );

  const writeOffRows = useMemo<WriteOffRow[]>(
    () =>
      ledgerRows
        .flatMap((row) =>
          row.financeRecords
            .filter((record) => record.type === 'writeoff')
            .map((record) => ({
              orderId: row.orderId,
              orderNo: row.orderNo,
              customerName: row.customerName,
              amount: record.amount,
              referenceNo: record.referenceNo || row.writeOffReferenceNo || '-',
              recordedAt: record.recordedAt || row.writeOffAt,
              recordedBy: record.operator || row.writeOffBy,
            }))
        )
        .sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || '')),
    [ledgerRows]
  );

  const dunningRows = useMemo<DunningRow[]>(
    () =>
      ledgerRows
        .flatMap((row) =>
          (row.dunningRecords || []).map((record) => ({
            orderId: row.orderId,
            orderNo: row.orderNo,
            customerName: row.customerName,
            status: record.status,
            recordedAt: record.recordedAt,
            recordedBy: record.operator,
            nextFollowUpAt: record.nextFollowUpAt,
            remark: record.remark,
          }))
        )
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [ledgerRows]
  );

  const pendingDunningCount = ledgerRows.filter((row) => row.remainingAmount > 0 && row.agingDays >= 8).length;
  const dueTodayCount = dueFollowUpRows.filter((row) => row.dueType === 'today').length;
  const overdueFollowUpCount = dueFollowUpRows.filter((row) => row.dueType === 'overdue').length;

  const filteredCustomerStatements = useMemo(
    () =>
      customerStatements.filter((item) => {
        if (dunningFilter === 'all') {
          return true;
        }

        const relatedRows = ledgerRows.filter((row) => row.customerName === item.customerName && row.remainingAmount > 0);
        if (!relatedRows.length) {
          return false;
        }

        if (dunningFilter === 'due_today') {
          return dueFollowUpRows.some((row) => row.customerName === item.customerName && row.dueType === 'today');
        }

        if (dunningFilter === 'due_overdue') {
          return dueFollowUpRows.some((row) => row.customerName === item.customerName && row.dueType === 'overdue');
        }

        return relatedRows.some((row) => row.dunningStatus === dunningFilter);
      }),
    [customerStatements, dueFollowUpRows, dunningFilter, ledgerRows]
  );

  const restrictedCustomers = customerStatements.filter((item) => item.isRestricted).length;

  const handleInvoiceRegister = (orderId: string) => {
    const result = registerCustomerOrderInvoice(orderId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.invoiceNo ? `${result.message}，发票号 ${result.invoiceNo}` : result.message);
  };

  const handlePaymentRegister = (orderId: string, mode: 'partial' | 'full') => {
    const result = registerCustomerOrderPayment(orderId, mode);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.amount ? `${result.message}，金额 ${result.amount.toLocaleString()} 元` : result.message);
  };

  const handleWriteOffRegister = (orderId: string) => {
    const result = registerCustomerOrderWriteOff(orderId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.amount ? `${result.message}，金额 ${result.amount.toLocaleString()} 元` : result.message);
  };

  const handleDunningFollowUp = (orderId: string) => {
    const result = registerCustomerOrderDunningFollowUp(orderId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    const label = result.status ? dunningStatusConfig[result.status].label : '';
    toast.success(label ? `${result.message}，当前状态 ${label}` : result.message);
  };

  return (
    <PageSectionLayout
      title="财务台账"
      description="汇总已出货到已归档订单的对账节点、回款、核销与信用占用情况，让财务处理在系统里形成可追溯闭环。"
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            台账订单 {ledgerRows.length} 单
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            待回单 {ledgerRows.filter((row) => row.status === 'pending_receipt').length} 单
          </Badge>
          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
            待财务 {ledgerRows.filter((row) => row.status === 'pending_finance').length} 单
          </Badge>
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
            受限客户 {restrictedCustomers} 家
          </Badge>
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
            待催收 {pendingDunningCount} 单
          </Badge>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            已归档 {ledgerRows.filter((row) => row.status === 'archived').length} 单
          </Badge>
        </>
      }
      tabs={[
        { key: 'all', label: '全部台账', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
        { key: 'pending_receipt', label: '待回单', active: statusFilter === 'pending_receipt', onClick: () => setStatusFilter('pending_receipt') },
        { key: 'pending_finance', label: '待财务', active: statusFilter === 'pending_finance', onClick: () => setStatusFilter('pending_finance') },
        { key: 'pending_archive', label: '待归档', active: statusFilter === 'pending_archive', onClick: () => setStatusFilter('pending_archive') },
        { key: 'archived', label: '已归档', active: statusFilter === 'archived', onClick: () => setStatusFilter('archived') },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">订单总额</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{totalAmount.toLocaleString()} 元</p>
              </div>
              <div className="rounded-2xl bg-[#c9a962]/10 p-3">
                <CircleDollarSign className="h-6 w-6 text-[#a08042]" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">已归档金额</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{archivedAmount.toLocaleString()} 元</p>
              </div>
              <div className="rounded-2xl bg-emerald-100 p-3">
                <FileArchive className="h-6 w-6 text-emerald-700" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">月结金额</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{monthlySettlementAmount.toLocaleString()} 元</p>
              </div>
              <div className="rounded-2xl bg-violet-100 p-3">
                <Wallet className="h-6 w-6 text-violet-700" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">未结应收</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{outstandingAmount.toLocaleString()} 元</p>
              </div>
              <div className="rounded-2xl bg-amber-100 p-3">
                <BadgeDollarSign className="h-6 w-6 text-amber-700" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索订单号、出货单号、客户、结算方式..."
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: '全部催收' },
                  { key: 'contacted', label: '已联系' },
                  { key: 'promised', label: '已承诺' },
                  { key: 'escalated', label: '升级催收' },
                  { key: 'resolved', label: '已闭环' },
                  { key: 'due_today', label: `今日到期 ${dueTodayCount}` },
                  { key: 'due_overdue', label: `已到期 ${overdueFollowUpCount}` },
                ].map((item) => (
                  <Button
                    key={item.key}
                    variant={dunningFilter === item.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDunningFilter(item.key as DunningFilter)}
                    className={dunningFilter === item.key ? 'bg-[#1f2937] text-white hover:bg-[#111827]' : ''}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {dueFollowUpRows.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PhoneCall className="h-5 w-5 text-[#a08042]" />
                下次跟进到期提醒
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 p-6 xl:grid-cols-3">
              {dueFollowUpRows.slice(0, 6).map((item) => (
                <div key={`${item.orderNo}-${item.nextDunningAt}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.orderNo}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.customerName}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.dueType === 'overdue'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }
                    >
                      {item.dueType === 'overdue' ? '已到期' : '今日到期'}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>跟进状态：{item.dunningStatus ? dunningStatusConfig[item.dunningStatus].label : '待催收'}</p>
                    <p>下次跟进：{item.nextDunningAt || '-'}</p>
                    <p>未结应收：{item.remainingAmount.toLocaleString()} 元</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {alertRows.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BellRing className="h-5 w-5 text-[#a08042]" />
                账龄与信用预警
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 p-6 xl:grid-cols-3">
              {alertRows.map((item) => (
                <div key={item.orderNo} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.orderNo}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.customerName}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.level === 'warning'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }
                    >
                      {item.level === 'warning' ? '受限处理' : '账龄关注'}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>账龄：{item.agingDays} 天</p>
                    <p>未结金额：{item.amount.toLocaleString()} 元</p>
                    <p>信用额度：{item.creditLimit > 0 ? `${item.creditLimit.toLocaleString()} 元` : '未设置'}</p>
                    <p>{item.reason}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ReceiptText className="h-5 w-5 text-[#a08042]" />
                财务台账
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">订单 / 出货</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">客户 / 结算</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">金额结构</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">对账状态</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">最新节点</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">财务动作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, index) => {
                      const canInvoice = row.settlementMode === '月结' && Boolean(row.financeConfirmedAt) && !row.invoiceRegisteredAt;
                      const canCollect =
                        row.remainingAmount > 0 &&
                        Boolean(row.receiptConfirmedAt) &&
                        Boolean(row.financeConfirmedAt) &&
                        (row.settlementMode !== '月结' || Boolean(row.invoiceRegisteredAt));
                      const canWriteOff = row.remainingAmount > 0 && Boolean(row.financeConfirmedAt);
                      const canDunning = row.remainingAmount > 0 && row.agingDays >= 8 && Boolean(row.financeConfirmedAt);
                      const showRestricted =
                        (row.customerCreditLimit > 0 && row.remainingAmount > row.customerCreditLimit) || row.agingDays >= 16;

                      return (
                        <motion.tr
                          key={row.orderNo}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-6 py-4 align-top">
                            <p className="font-semibold text-slate-900">{row.orderNo}</p>
                            <p className="mt-1 text-sm text-slate-500">{row.shipmentNo}</p>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <p className="font-medium text-slate-800">{row.customerName}</p>
                            <p className="mt-1 text-sm text-slate-500">{row.settlementMode}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              信用额度：{row.customerCreditLimit > 0 ? `${row.customerCreditLimit.toLocaleString()} 元` : '未设置'}
                            </p>
                          </td>
                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            <p className="font-semibold text-slate-900">{row.orderAmount.toLocaleString()} 元</p>
                            <p className="mt-1">已回款：{row.paidAmount.toLocaleString()} 元</p>
                            <p className="mt-1">已核销：{row.writeOffAmount.toLocaleString()} 元</p>
                            <p className="mt-1 font-medium text-amber-700">剩余应收：{row.remainingAmount.toLocaleString()} 元</p>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className={ledgerStatusConfig[row.status].className}>
                                {ledgerStatusConfig[row.status].label}
                              </Badge>
                              {row.remainingAmount <= 0 && (
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                  已结清
                                </Badge>
                              )}
                              {showRestricted && (
                                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                                  信用受限
                                </Badge>
                              )}
                              {row.dunningStatus && (
                                <Badge variant="outline" className={dunningStatusConfig[row.dunningStatus].className}>
                                  催收 {dunningStatusConfig[row.dunningStatus].label}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top text-sm text-slate-600">
                            {row.archivedAt
                              ? `归档：${row.archivedBy || '系统'} / ${row.archivedAt}`
                              : row.financeConfirmedAt
                                ? `财务：${row.financeConfirmedBy || '系统'} / ${row.financeConfirmedAt}`
                                : row.receiptConfirmedAt
                                  ? `回单：${row.receiptConfirmedBy || '系统'} / ${row.receiptConfirmedAt}`
                                  : row.signedDate
                                    ? `签收：${row.signedDate}`
                                    : row.shippedDate || '待更新'}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              {row.invoiceRegisteredAt ? (
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                  发票 {row.invoiceNo || '-'}
                                </Badge>
                              ) : (
                                canInvoice && (
                                  <Button variant="outline" size="sm" onClick={() => handleInvoiceRegister(row.orderId)}>
                                    登记开票
                                  </Button>
                                )
                              )}
                              {canCollect && row.remainingAmount > 0 && (
                                <Button variant="outline" size="sm" onClick={() => handlePaymentRegister(row.orderId, 'partial')}>
                                  部分回款
                                </Button>
                              )}
                              {canCollect && row.remainingAmount > 0 && (
                                <Button size="sm" onClick={() => handlePaymentRegister(row.orderId, 'full')}>
                                  {row.paidAmount > 0 ? '回款结清' : '登记回款'}
                                </Button>
                              )}
                              {canWriteOff && row.remainingAmount > 0 && (
                                <Button variant="outline" size="sm" onClick={() => handleWriteOffRegister(row.orderId)}>
                                  登记核销
                                </Button>
                              )}
                              {canDunning && (
                                <Button variant="outline" size="sm" onClick={() => handleDunningFollowUp(row.orderId)}>
                                  登记催收
                                </Button>
                              )}
                              {row.agingDays >= 8 && row.remainingAmount > 0 && (
                                <Badge
                                  variant="outline"
                                  className={
                                    row.agingDays >= 16
                                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                                      : 'border-amber-200 bg-amber-50 text-amber-700'
                                  }
                                >
                                  账龄 {row.agingDays} 天
                                </Badge>
                              )}
                              {row.nextDunningAt && row.remainingAmount > 0 && (
                                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                                  下次跟进 {row.nextDunningAt.slice(0, 16)}
                                </Badge>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarRange className="h-5 w-5 text-[#a08042]" />
                  月结统计
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {monthlySummary.map((item) => (
                  <div key={item.month} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{item.month}</p>
                      <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                        {item.orderCount} 单
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">金额：{item.amount.toLocaleString()} 元</p>
                    <p className="mt-2 text-sm text-slate-600">未结：{item.outstandingAmount.toLocaleString()} 元</p>
                    <p className="mt-2 text-sm text-slate-600">月结订单：{item.monthSettleCount} 单</p>
                    <p className="mt-2 text-sm text-slate-600">已归档：{item.archivedCount} 单</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-[#a08042]" />
                  结算方式分布
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {settlementSummary.map((item) => (
                  <div key={item.mode} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{item.mode}</p>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {item.count} 单
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">累计金额：{item.amount.toLocaleString()} 元</p>
                    <p className="mt-2 text-sm text-slate-600">未结金额：{item.outstandingAmount.toLocaleString()} 元</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="h-5 w-5 text-[#a08042]" />
                应收账龄
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {agingSummary.map((item) => (
                <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      {item.count} 单
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">未结金额：{item.amount.toLocaleString()} 元</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-[#a08042]" />
                月结开票记录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {invoiceRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  暂无月结开票记录
                </div>
              ) : (
                invoiceRows.map((item) => {
                  const invoiceStatus = getInvoiceStatusLabel(item.status);
                  return (
                    <div key={item.orderNo} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.orderNo}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.customerName}</p>
                        </div>
                        <Badge variant="outline" className={invoiceStatus.className}>
                          {invoiceStatus.label}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>对账月份：{item.statementMonth}</p>
                        <p>金额：{item.amount.toLocaleString()} 元</p>
                        <p>发票号：{item.invoiceNo}</p>
                      </div>
                      {item.status === 'pending_issue' && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => handleInvoiceRegister(item.orderId)}>
                          登记开票
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-[#a08042]" />
              客户对账单
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">客户</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">结算方式</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">累计金额</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">未结金额</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">信用额度</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">受限状态</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">待对账订单</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomerStatements.map((item, index) => (
                    <motion.tr
                      key={item.customerName}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 align-top">
                        <p className="font-semibold text-slate-900">{item.customerName}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.orderCount} 单订单</p>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-600">{item.settlementModes.join(' / ')}</td>
                      <td className="px-6 py-4 align-top font-semibold text-slate-900">{item.totalAmount.toLocaleString()} 元</td>
                      <td className="px-6 py-4 align-top text-sm text-amber-700">{item.outstandingAmount.toLocaleString()} 元</td>
                      <td className="px-6 py-4 align-top text-sm text-slate-600">
                        <p>{item.creditLimit > 0 ? `${item.creditLimit.toLocaleString()} 元` : '未设置'}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          可用：{item.creditLimit > 0 ? `${item.availableCredit.toLocaleString()} 元` : '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-600">
                        <Badge
                          variant="outline"
                          className={
                            item.isRestricted
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }
                        >
                          {item.isRestricted ? '受限' : '正常'}
                        </Badge>
                        <p className="mt-2 max-w-[280px] text-xs text-slate-500">{item.restrictionReason}</p>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-600">
                        {item.outstandingOrders.length > 0 ? item.outstandingOrders.join('、') : '无'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PhoneCall className="h-5 w-5 text-[#a08042]" />
              催收跟进记录
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            {dunningRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                暂无催收跟进记录
              </div>
            ) : (
              dunningRows.map((item) => (
                <div key={`${item.orderNo}-${item.recordedAt}-${item.status}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.orderNo}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.customerName}</p>
                    </div>
                    <Badge variant="outline" className={dunningStatusConfig[item.status].className}>
                      {dunningStatusConfig[item.status].label}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>跟进时间：{item.recordedAt}</p>
                    <p>跟进人：{item.recordedBy}</p>
                    <p>下次跟进：{item.nextFollowUpAt || '-'}</p>
                    <p>{item.remark || '已登记催收跟进。'}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BadgeDollarSign className="h-5 w-5 text-[#a08042]" />
              核销记录
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            {writeOffRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                暂无核销记录
              </div>
            ) : (
              writeOffRows.map((item) => (
                <div key={`${item.orderNo}-${item.referenceNo}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.orderNo}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.customerName}</p>
                    </div>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      {item.amount.toLocaleString()} 元
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>核销单号：{item.referenceNo}</p>
                    <p>登记时间：{item.recordedAt || '-'}</p>
                    <p>登记人：{item.recordedBy || '-'}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageSectionLayout>
  );
}
