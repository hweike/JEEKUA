// lib/payment/pdf-templates/order-pdf2.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';

// ============================================================
// ✅ 数值安全格式化函数（新增）
// ============================================================
const formatAmount = (value: any): string => {
  const num = Number(value);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

// ============================================================
// 字体注册 - 使用本地字体
// ============================================================
let fontRegistered = false;

try {
  const fontPath = path.join(process.cwd(), 'public/fonts/notosanssc/NotoSansSC-Regular.ttf');
  const boldFontPath = path.join(process.cwd(), 'public/fonts/notosanssc/NotoSansSC-Bold.ttf');

  if (fs.existsSync(fontPath)) {
    Font.register({
      family: 'NotoSansSC',
      src: fontPath,
    });
    
    if (fs.existsSync(boldFontPath)) {
      Font.register({
        family: 'NotoSansSC',
        src: boldFontPath,
        fontWeight: 'bold',
      });
    }
    
    fontRegistered = true;
    console.log('[PDF] 中文字体注册成功 (order-pdf)');
  } else {
    console.warn('[PDF] 字体文件不存在 (order-pdf):', fontPath);
  }
} catch (error) {
  console.warn('[PDF] 中文字体注册失败，使用 Helvetica (order-pdf):', error);
}

const fontFamily = fontRegistered ? 'NotoSansSC' : 'Helvetica';

// ============================================================
// 样式定义
// ============================================================
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingTop: 35,
    paddingBottom: 50,
    fontSize: 10,
    fontFamily: fontFamily,
    backgroundColor: '#ffffff',
  },
  // ✅ 外部包裹容器 - 通栏灰色背景，无间隙
  headerWrapper: {
    marginHorizontal: -40,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 40,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 8,
  },
  // ✅ 第一部分：Logo + 网站名称
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logo: {
    width: 130,
    height: 50,
    objectFit: 'contain',
    marginRight: 10,
  },
  siteName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 1,
  },
  // ✅ 第二部分：公司信息 - 与 Logo 区域无间隙
  companyInfoContainer: {
    alignItems: 'flex-start',
    marginTop: 4,
  },
  companyInfoText: {
    fontSize: 9,
    color: '#444',
    lineHeight: 1.5,
  },
  divider: {
    borderBottom: '2px solid #ddd',
    marginVertical: 6,
  },
  titleContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 2,
  },
  docInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docInfoText: {
    fontSize: 10,
    color: '#333',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: '1px solid #ddd',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 80,
    fontSize: 9,
    color: '#666',
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: '#333',
  },
  valueBold: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
  },
  table: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  colProduct: { width: '42%', fontSize: 8 },
  colSpec: { width: '18%', fontSize: 8 },
  colQty: { width: '12%', fontSize: 8, textAlign: 'center' },
  colPrice: { width: '14%', fontSize: 8, textAlign: 'right' },
  colTotal: { width: '14%', fontSize: 8, textAlign: 'right' },
  colHeader: { fontSize: 9, fontWeight: 'bold' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 20,
    height: 20,
    objectFit: 'cover',
    borderRadius: 2,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  summaryContainer: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
    width: '100%',
  },
  summaryLabel: {
    fontSize: 9,
    color: '#666',
    width: 120,
    textAlign: 'right',
    marginRight: 20,
  },
  summaryValue: {
    fontSize: 9,
    width: 100,
    textAlign: 'right',
  },
  summaryTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    width: 100,
    textAlign: 'right',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    width: 120,
    textAlign: 'right',
    marginRight: 20,
  },
  shippingContainer: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  shippingItem: {
    width: '50%',
    flexDirection: 'row',
    marginBottom: 3,
  },
  shippingLabel: {
    width: 110,
    fontSize: 9,
    color: '#666',
  },
  shippingValue: {
    flex: 1,
    fontSize: 9,
    color: '#333',
    fontWeight: 'bold',
  },
  bankSectionWrapper: {
    marginTop: 10,
  },
  bankSection: {
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 6,
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bankLabel: {
    width: 130,
    fontSize: 8,
    color: '#666',
  },
  bankValue: {
    flex: 1,
    fontSize: 8,
    color: '#333',
    fontWeight: 'bold',
  },
  bankAccountName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  attention: {
    marginTop: 6,
    padding: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  attentionText: {
    fontSize: 8,
    color: '#92400e',
  },
  termsContainer: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 8,
    color: '#555',
    lineHeight: 1.5,
  },
  signatureSection: {
    marginTop: 14,
  },
  signatureText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 64,
  },
  signContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signBox: {
    width: '45%',
  },
  signLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  signLine: {
    borderBottom: '1px solid #333',
    marginTop: 20,
    width: '100%',
  },
  signName: {
    fontSize: 9,
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
  },
  signDate: {
    fontSize: 8,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTop: '1px solid #eee',
    paddingTop: 8,
  },
});

interface OrderPDFProps {
  order: any;
  siteName: string;
  sellerInfo: {
    company: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
    city?: string;
    province?: string;
    country?: string;
    postalCode?: string;
  };
  paymentAccounts?: any[];
  companyLogoBase64?: string;
}

// ✅ 格式化日期
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ✅ 获取运输方式显示
function getShippingMethodDisplay(method: string): string {
  const map: Record<string, string> = {
    '快递': 'Express',
    '多式联运': 'Intermodal',
    '海运': 'Sea Freight',
    '空运': 'Air Freight',
    '陆运': 'Land Transport',
    '邮政': 'Postal',
  };
  return map[method] || method;
}

// ✅ 获取贸易术语显示
function getTradeTermDisplay(term: string): string {
  const map: Record<string, string> = {
    'EXW': 'Ex Works',
    'FCA': 'Free Carrier',
    'FAS': 'Free Alongside Ship',
    'FOB': 'Free On Board',
    'CFR': 'Cost and Freight',
    'CIF': 'Cost Insurance and Freight',
    'CPT': 'Carriage Paid To',
    'CIP': 'Carriage and Insurance Paid To',
    'DAT': 'Delivered At Terminal',
    'DAP': 'Delivered At Place',
    'DDP': 'Delivered Duty Paid',
  };
  return map[term] || term;
}

// ✅ 获取发货日期显示
function getShippingDateDisplay(order: any): string {
  if (!order.shipping_date_type) return '-';
  if (order.shipping_date_type === 'deposit') {
    return `Ship within ${order.shipping_days || 10} days after deposit received`;
  }
  if (order.shipping_date_type === 'balance') {
    return `Ship within ${order.shipping_days || 10} days after balance received`;
  }
  if (order.shipping_date_type === 'fixed' && order.shipping_date) {
    return `Ship on ${formatDate(order.shipping_date)}`;
  }
  return '-';
}

// ✅ 获取单个银行账户显示 - 序号使用 #1, #2, #3
function getSingleAccountDisplay(account: any, index: number, total: number) {
  if (!account) return null;
  
  const fields = [
    { key: 'beneficiary_name', label: 'Beneficiary Name' },
    { key: 'beneficiary_account', label: 'Account Number' },
    { key: 'beneficiary_bank', label: 'Bank' },
    { key: 'swift_code', label: 'SWIFT Code' },
    { key: 'country_region', label: 'Country/Region' },
    { key: 'beneficiary_address', label: 'Beneficiary Address' },
    { key: 'beneficiary_bank_address', label: 'Bank Address' },
    { key: 'iban', label: 'IBAN' },
    { key: 'bank_code', label: 'Bank Code' },
    { key: 'branch_code', label: 'Branch Code' },
    { key: 'currency', label: 'Supported Currencies' },
  ];
  
  const visibleFields = fields.filter(f => account[f.key] && account[f.key] !== '');
  
  if (visibleFields.length === 0 && !account.attention) return null;

  const displayName = account.display_name_en || account.display_name_zh || 'Account';

  return (
    <View key={account.id || index} style={styles.bankSectionWrapper}>
      <View style={styles.bankSection}>
        {total > 1 && (
          <Text style={styles.bankAccountName}>
            #{index + 1} {displayName}
          </Text>
        )}
        {visibleFields.map((field) => (
          <View key={field.key} style={styles.bankRow}>
            <Text style={styles.bankLabel}>{field.label}:</Text>
            <Text style={styles.bankValue}>{account[field.key]}</Text>
          </View>
        ))}
        {account.attention && (
          <View style={styles.attention}>
            <Text style={styles.attentionText}>⚠️ {account.attention}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function OrderPDF({ 
  order, 
  siteName, 
  sellerInfo,
  paymentAccounts = [],
  companyLogoBase64,
}: OrderPDFProps) {
  const now = new Date();
  
  // ✅ 从所有关联账户中筛选出 T/T 银行账户 (payment_method === 'tt')
  const allAccounts = paymentAccounts || [];
  const ttAccounts = allAccounts.filter(a => a.payment_method === 'tt');
  
  // ✅ 限制最多显示 3 个账号
  const accounts = ttAccounts.slice(0, 3);
  
  // ✅ 判断是否显示银行账户：有 T/T 账户就显示
  const hasBankAccounts = accounts.length > 0;

  // ✅ 确定使用的 Logo
  const logoToUse = companyLogoBase64 || sellerInfo.logo || '';

  // ✅ 构建完整地址
  const addressParts = [
    sellerInfo.address,
    sellerInfo.city,
    sellerInfo.province,
    sellerInfo.country,
    sellerInfo.postalCode,
  ].filter(Boolean);
  
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : sellerInfo.address;

  // ✅ 商品图片获取
  const getProductImage = (item: any): string => {
    if (item.product_image) {
      return item.product_image;
    }
    return '';
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ✅ 第一部分 + 第二部分：共用通栏灰色背景，中间无间隙 */}
        <View style={styles.headerWrapper}>
          {/* 第一部分：Logo + 网站名称 */}
          <View style={styles.headerContainer}>
            {logoToUse && (
              <Image src={logoToUse} style={styles.logo} />
            )}
            <Text style={styles.siteName}>{siteName}</Text>
          </View>

          {/* 第二部分：公司信息 - 紧接在 Logo 下方，无间隙 */}
          <View style={styles.companyInfoContainer}>
            <Text style={styles.companyInfoText}>{fullAddress}</Text>
            <Text style={styles.companyInfoText}>Tel: {sellerInfo.phone}  |  Email: {sellerInfo.email}</Text>
          </View>
        </View>

        {/* 第三部分：分割线 
        <View style={styles.divider} />
        */}
        {/* 第四部分：PROFORMA INVOICE */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>PROFORMA INVOICE</Text>
        </View>

        {/* 第五部分：PI No. + Date */}
        <View style={styles.docInfoContainer}>
          <Text style={styles.docInfoText}>
            PI No.: {order.contract_no || order.order_no}  |  Date: {formatDate(now.toISOString())}
          </Text>
        </View>

        {/* 第六部分：Buyer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buyer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{order.buyer_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.valueBold}>{order.buyer_company || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{order.buyer_email}</Text>
          </View>
          {order.buyer_phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{order.buyer_phone}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {order.buyer_address || '-'}
              {order.buyer_address && order.buyer_country ? `, ${order.buyer_country}` : ''}
              {!order.buyer_address && order.buyer_country ? order.buyer_country : ''}
            </Text>
          </View>
        </View>

        {/* 第七部分：Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colProduct, styles.colHeader]}>Product Name</Text>
              <Text style={[styles.colSpec, styles.colHeader]}>Specification</Text>
              <Text style={[styles.colQty, styles.colHeader]}>Quantity</Text>
              <Text style={[styles.colPrice, styles.colHeader]}>Unit Price</Text>
              <Text style={[styles.colTotal, styles.colHeader]}>Subtotal</Text>
            </View>
            {order.items.map((item: any, index: number) => {
              const imageUrl = getProductImage(item);
              const isLast = index === order.items.length - 1;
              
              return (
                <View key={item.id || index} style={isLast ? styles.tableRowLast : styles.tableRow}>
                  <View style={styles.colProduct}>
                    <View style={styles.productRow}>
                      {imageUrl && (
                        <Image src={imageUrl} style={styles.productImage} />
                      )}
                      <Text style={styles.productName}>{item.product_name}</Text>
                    </View>
                  </View>
                  <Text style={styles.colSpec}>{item.specification || '-'}</Text>
                  <Text style={styles.colQty}>
                    <Text>{item.quantity}</Text>
                    {'\n'}
                    <Text style={{ fontSize: 6, color: '#999' }}>{item.unit || 'pcs'}</Text>
                  </Text>
                  {/* ✅ 修复：使用 formatAmount */}
                  <Text style={styles.colPrice}>{order.currency} {formatAmount(item.price)}</Text>
                  <Text style={styles.colTotal}>{order.currency} {formatAmount(item.total)}</Text>
                </View>
              );
            })}
          </View>
          
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sub Total:</Text>
              {/* ✅ 修复：使用 formatAmount */}
              <Text style={styles.summaryValue}>{order.currency} {formatAmount(order.sub_total)}</Text>
            </View>
            {Number(order.discount) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount:</Text>
                <Text style={styles.summaryValue}>-{order.currency} {formatAmount(order.discount)}</Text>
              </View>
            )}
            {Number(order.shipping_fee) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Fee:</Text>
                <Text style={styles.summaryValue}>{order.currency} {formatAmount(order.shipping_fee)}</Text>
              </View>
            )}
            {Number(order.tax) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax:</Text>
                <Text style={styles.summaryValue}>{order.currency} {formatAmount(order.tax)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotal}>{order.currency} {formatAmount(order.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* 第八部分：Shipping Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Information</Text>
          <View style={styles.shippingContainer}>
            <View style={styles.shippingItem}>
              <Text style={styles.shippingLabel}>Shipping Method:</Text>
              <Text style={styles.shippingValue}>{getShippingMethodDisplay(order.shipping_method) || '-'}</Text>
            </View>
            <View style={styles.shippingItem}>
              <Text style={styles.shippingLabel}>Shipping Date:</Text>
              <Text style={styles.shippingValue}>{getShippingDateDisplay(order)}</Text>
            </View>
            <View style={styles.shippingItem}>
              <Text style={styles.shippingLabel}>Trade Term:</Text>
              <Text style={styles.shippingValue}>{getTradeTermDisplay(order.trade_term) || '-'}</Text>
            </View>
          </View>
        </View>

        {/* ✅ 第九部分：Bank Account Information - 只显示 T/T 账户 */}
        {hasBankAccounts && (
          <View wrap={false} style={styles.bankSectionWrapper}>
            <Text style={[styles.sectionTitle, { fontSize: 10 }]}>Bank Account Information</Text>
            {accounts.map((account, index) => 
              getSingleAccountDisplay(account, index, accounts.length)
            )}
          </View>
        )}

        {/* 第十部分：Terms & Conditions */}
        {order.legal_terms && (
          <View style={styles.termsContainer}>
            <Text style={[styles.sectionTitle, { fontSize: 10 }]}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{order.legal_terms}</Text>
          </View>
        )}

        {/* 第十一 + 第十二部分：签名 */}
        <View wrap={false} style={styles.signatureSection}>
          <Text style={styles.signatureText}>Please sign and return this P/I for confirmation</Text>
          
          <View style={styles.signContainer}>
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>CONFIRMED AND ACCEPTED BY</Text>
              <View style={styles.signLine} />
              <Text style={styles.signName}>{order.buyer_company || order.buyer_name}</Text>
              <Text style={styles.signDate}>Date: __________________</Text>
            </View>
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>CONFIRMED AND ACCEPTED BY</Text>
              <View style={styles.signLine} />
              <Text style={styles.signName}>{sellerInfo.company}</Text>
              <Text style={styles.signDate}>Date: {formatDate(now.toISOString())}</Text>
            </View>
          </View>
        </View>

        {/* 页脚 */}
        <View style={styles.footer}>
          <Text>This is a computer-generated document. No signature is required.</Text>
          <Text>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
}