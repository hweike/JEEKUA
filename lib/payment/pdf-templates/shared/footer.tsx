// lib/payment/pdf-templates/shared/footer.tsx
import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';

interface PDFFooterProps {
  siteName?: string;
  showTimestamp?: boolean;
}

export function PDFFooter({ siteName, showTimestamp = true }: PDFFooterProps) {
  const name = siteName || process.env.NEXT_PUBLIC_SITE_NAME || 'Feisman Power';
  const timestamp = showTimestamp ? new Date().toLocaleString() : '';

  return (
    <View style={styles.footer}>
      <Text>此文档由 {name} 提供</Text>
      {timestamp && <Text style={{ fontSize: 7, marginTop: 2 }}>生成时间: {timestamp}</Text>}
    </View>
  );
}