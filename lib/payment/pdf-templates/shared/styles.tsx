// lib/payment/pdf-templates/shared/styles.ts
import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  primary: '#1a56db',
  secondary: '#374151',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  border: '#e5e7eb',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  white: '#ffffff',
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: colors.white,
  },

  // 页眉
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottom: `1px solid ${colors.border}`,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 10,
    color: colors.gray,
    marginTop: 2,
  },

  // 页脚
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: colors.gray,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 10,
  },

  // 标题
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `1px solid ${colors.border}`,
  },

  // 信息行
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  infoLabel: {
    width: 120,
    fontSize: 9,
    color: colors.gray,
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: colors.secondary,
  },

  // 表格
  table: {
    width: '100%',
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottom: `1px solid ${colors.border}`,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: `1px solid ${colors.border}`,
  },
  tableCell: {
    fontSize: 8,
    color: colors.secondary,
  },
  tableCellRight: {
    fontSize: 8,
    color: colors.secondary,
    textAlign: 'right',
  },
  tableCellCenter: {
    fontSize: 8,
    color: colors.secondary,
    textAlign: 'center',
  },

  // 金额汇总
  totalSection: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 2,
    width: 200,
  },
  totalLabel: {
    fontSize: 9,
    color: colors.gray,
    width: 80,
    textAlign: 'right',
    paddingRight: 16,
  },
  totalValue: {
    fontSize: 9,
    color: colors.secondary,
    width: 100,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    marginTop: 4,
    borderTop: `2px solid ${colors.secondary}`,
    width: 200,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.secondary,
    width: 80,
    textAlign: 'right',
    paddingRight: 16,
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    width: 100,
    textAlign: 'right',
  },

  // 注意事项
  attentionBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fffbeb',
    border: `1px solid ${colors.warning}`,
    borderRadius: 4,
  },
  attentionText: {
    fontSize: 8,
    color: '#92400e',
  },

  // 底部条款
  termsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: `1px solid ${colors.border}`,
  },
  termsText: {
    fontSize: 8,
    color: colors.gray,
    lineHeight: 1.5,
  },

  // 签名
  signature: {
    marginTop: 20,
    paddingTop: 12,
    borderTop: `1px solid ${colors.border}`,
  },
  signatureLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
  },
  signatureValue: {
    fontSize: 9,
    color: colors.secondary,
  },

  // 状态标签
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 'bold',
  },
  statusDraft: { backgroundColor: colors.lightGray, color: colors.gray },
  statusSent: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  statusPending: { backgroundColor: '#fef3c7', color: '#b45309' },
  statusPaid: { backgroundColor: '#d1fae5', color: '#065f46' },
  statusExpired: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  statusCancelled: { backgroundColor: colors.lightGray, color: colors.gray },

  // 布局
  flexRow: {
    flexDirection: 'row',
  },
  flexBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },

  // 网格
  grid2: {
    flexDirection: 'row',
    gap: 20,
  },
  gridCol: {
    flex: 1,
  },

  // 商品列宽
  colProduct: { width: '40%' },
  colSpec: { width: '20%' },
  colPrice: { width: '15%', textAlign: 'right' },
  colQty: { width: '10%', textAlign: 'center' },
  colTotal: { width: '15%', textAlign: 'right' },
});