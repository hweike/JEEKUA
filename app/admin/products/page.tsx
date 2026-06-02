// app/admin/products/page.tsx
import { redirect } from 'next/navigation';
export default function ProductsIndex() {
  redirect('/admin/products/categories');
}