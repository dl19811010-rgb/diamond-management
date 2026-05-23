import type { CustomerOrder } from '@/types';

export interface CustomerOrderCreditControl {
  remainingAmount: number;
  customerOutstandingAmount: number;
  creditLimit: number;
  availableCredit: number;
  agingDays: number;
  maxAgingDays: number;
  overLimit: boolean;
  overdue: boolean;
  isRestricted: boolean;
  reason: string;
}

const getReceiptAgingDays = (dateText?: string, today = new Date()) => {
  if (!dateText) {
    return 0;
  }

  const baseDate = new Date(dateText.replace(/-/g, '/'));
  return Math.max(0, Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
};

export const getCustomerOrderRemainingAmount = (order: CustomerOrder) =>
  Math.max(0, (order.orderAmount || 0) - (order.paidAmount || 0) - (order.writeOffAmount || 0));

export const getCustomerOrderCreditControl = (
  targetOrder: CustomerOrder,
  allOrders: CustomerOrder[],
  today = new Date()
): CustomerOrderCreditControl => {
  const customerOrders = allOrders.filter((item) => item.customerName === targetOrder.customerName);
  const customerOutstandingAmount = customerOrders.reduce((sum, item) => sum + getCustomerOrderRemainingAmount(item), 0);
  const remainingAmount = getCustomerOrderRemainingAmount(targetOrder);
  const creditLimit = targetOrder.customerCreditLimit || 0;
  const agingDays = getReceiptAgingDays(targetOrder.receiptConfirmedAt, today);
  const maxAgingDays = customerOrders.reduce(
    (max, item) => Math.max(max, getReceiptAgingDays(item.receiptConfirmedAt, today)),
    0
  );
  const overLimit = creditLimit > 0 && customerOutstandingAmount > creditLimit;
  const overdue = customerOrders.some((item) => getCustomerOrderRemainingAmount(item) > 0 && getReceiptAgingDays(item.receiptConfirmedAt, today) >= 16);
  const availableCredit = creditLimit > 0 ? Math.max(0, creditLimit - customerOutstandingAmount) : 0;
  const reasons: string[] = [];

  if (overLimit) {
    reasons.push(`客户未结应收 ${customerOutstandingAmount.toLocaleString()} 元，已超信用额度 ${creditLimit.toLocaleString()} 元`);
  }

  if (overdue) {
    reasons.push(`客户存在账龄 ${maxAgingDays} 天的逾期未结订单`);
  }

  return {
    remainingAmount,
    customerOutstandingAmount,
    creditLimit,
    availableCredit,
    agingDays,
    maxAgingDays,
    overLimit,
    overdue,
    isRestricted: overLimit || overdue,
    reason: reasons.join('；') || '正常',
  };
};

export const getRestrictedCustomerNames = (orders: CustomerOrder[], today = new Date()) =>
  Array.from(
    new Set(
      orders
        .filter((order) => getCustomerOrderCreditControl(order, orders, today).isRestricted)
        .map((order) => order.customerName)
    )
  );
