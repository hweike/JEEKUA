// lib/payment/pdf-templates/shared/header.tsx
import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';

interface PDFHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
}

export function PDFHeader({ title, subtitle, rightContent }: PDFHeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {rightContent && <View>{rightContent}</View>}
    </View>
  );
}