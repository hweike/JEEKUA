// lib/payment/pdf-templates/account-pdf.tsx
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';

// ============================================================
// 字体注册
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
    console.log('[PDF] 中文字体注册成功');
  } else {
    console.warn('[PDF] 字体文件不存在:', fontPath);
  }
} catch (error) {
  console.warn('[PDF] 中文字体注册失败，使用 Helvetica:', error);
}

const fontFamily = fontRegistered ? 'NotoSansSC' : 'Helvetica';

// ============================================================
// 样式定义
// ============================================================
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingTop: 50,
    paddingBottom: 50,
    fontFamily: fontFamily,
    backgroundColor: '#ffffff',
  },
  // ✅ Logo 区域：居中并排（只有企业Logo）
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 130,
    height: 50,
    objectFit: 'contain',
  },
  // ✅ 标题区域
  titleContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a56db',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'left',  // ✅ 左对齐
    lineHeight: 1.6,
    paddingHorizontal: 0,  // ✅ 移除左右内边距
  },
  // ✅ 表格样式
  tableContainer: {
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 32,
  },
  tableRowLast: {
    flexDirection: 'row',
    minHeight: 32,
  },
  tableLabel: {
    width: '35%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    textAlign: 'right',  // ✅ 靠右对齐
  },
  tableValue: {
    width: '65%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 9,
    color: '#1f2937',
    textAlign: 'left',
  },
  // ✅ 支持货币
  currencyContainer: {
    marginTop: 12,
    marginBottom: 30,  // ✅ 增加底部间距，为签名留空间
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f0f7ff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  currencyLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a56db',
    marginBottom: 4,
  },
  currencyValue: {
    fontSize: 10,
    color: '#1f2937',
  },
  // ✅ 右下角签名 - 使用绝对定位，确保在页面底部
  signatureContainer: {
    position: 'absolute',
    bottom: 110,
    right: 40,
    textAlign: 'right',
  },
  signatureText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  signatureCompany: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10,
  },
});

interface AccountPDFProps {
  account: any;
  siteName: string;
  bankLogoBase64?: string;  // 银行 Logo Base64（暂不使用，保留接口）
  companyLogoBase64?: string; // 企业 Logo Base64
}

// ✅ 账户信息字段配置
interface FieldConfig {
  key: string;
  label: string;
  show: (account: any) => boolean;
  getValue: (account: any) => string;
}

const fieldConfigs: FieldConfig[] = [
  {
    key: 'beneficiary_name',
    label: 'Beneficiary Name',
    show: (account) => !!account.beneficiary_name,
    getValue: (account) => account.beneficiary_name || '-',
  },
  {
    key: 'beneficiary_account',
    label: 'Beneficiary account number',
    show: (account) => !!account.beneficiary_account,
    getValue: (account) => account.beneficiary_account || '-',
  },
  {
    key: 'country_region',
    label: 'Country/Region',
    show: (account) => !!account.country_region,
    getValue: (account) => account.country_region || '-',
  },
  {
    key: 'swift_code',
    label: 'Swift Code',
    show: (account) => !!account.swift_code,
    getValue: (account) => account.swift_code || '-',
  },
  {
    key: 'beneficiary_address',
    label: 'Beneficiary Address',
    show: (account) => !!account.beneficiary_address,
    getValue: (account) => account.beneficiary_address || '-',
  },
  {
    key: 'beneficiary_bank',
    label: 'Beneficiary Bank',
    show: (account) => !!account.beneficiary_bank,
    getValue: (account) => account.beneficiary_bank || '-',
  },
  {
    key: 'beneficiary_bank_address',
    label: 'Beneficiary Bank Address',
    show: (account) => !!account.beneficiary_bank_address,
    getValue: (account) => account.beneficiary_bank_address || '-',
  },
  {
    key: 'bank_code',
    label: 'Bank Code',
    show: (account) => !!account.bank_code,
    getValue: (account) => account.bank_code || '-',
  },
  {
    key: 'branch_code',
    label: 'Branch Code',
    show: (account) => !!account.branch_code,
    getValue: (account) => account.branch_code || '-',
  },
];

export default function AccountPDF({ 
  account, 
  siteName = '', 
  bankLogoBase64,  // 保留参数但不再使用
  companyLogoBase64,
}: AccountPDFProps) {
  // ✅ 获取要显示的字段
  const visibleFields = fieldConfigs.filter(f => f.show(account));

  // ✅ 获取支持货币
  const currencies = Array.isArray(account.currency) 
    ? account.currency.join(', ') 
    : account.currency || 'All';

  // ✅ 签名公司名称：优先使用传入的 siteName，如果为空则使用 account 的 display_name
  const companyName = siteName || account.display_name_en || account.display_name_zh || 'Feisman Power';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ============================================================ */}
        {/* 第一部分：Logo 区域 - 只显示企业 Logo，居中 */}
        {/* ============================================================ */}
        <View style={styles.logoContainer}>
          {companyLogoBase64 && <Image src={companyLogoBase64} style={styles.logo} />}
        </View>

        {/* ============================================================ */}
        {/* 第二部分：标题 + 提示（左对齐） */}
        {/* ============================================================ */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>ACCOUNT CONFIRMATION</Text>
          <Text style={styles.subtitle}>
            Please pay attention to fill in the correct Beneficiary Account Number, as the beneficiary bank will review the Beneficiary account number to receive the payment.
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 第三部分：表格（标签靠右对齐） */}
        {/* ============================================================ */}
        <View style={styles.tableContainer}>
          {visibleFields.map((field, index) => {
            const isLast = index === visibleFields.length - 1;
            return (
              <View key={field.key} style={isLast ? styles.tableRowLast : styles.tableRow}>
                <View style={styles.tableLabel}>
                  <Text>{field.label}</Text>
                </View>
                <View style={styles.tableValue}>
                  <Text>{field.getValue(account)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ============================================================ */}
        {/* 第四部分：支持货币 */}
        {/* ============================================================ */}
        <View style={styles.currencyContainer}>
          <Text style={styles.currencyLabel}>Supported Currencies:</Text>
          <Text style={styles.currencyValue}>{currencies}</Text>
        </View>

        {/* ============================================================ */}
        {/* 第五部分：右下角签名（固定在底部） */}
        {/* ============================================================ */}
        <View style={styles.signatureContainer}>
          <Text style={styles.signatureText}>For and on behalf of</Text>
          <Text style={styles.signatureCompany}>{companyName}</Text>
        </View>

        {/* 页脚 */}
        <Text style={styles.footer}>
          Generated: {new Date().toLocaleString()}
        </Text>
      </Page>
    </Document>
  );
}