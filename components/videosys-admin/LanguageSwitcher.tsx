'use client'

import { useRouter } from 'next/navigation'

export default function LanguageSwitcher({
  currentLocale,
  basePath,
}: {
  currentLocale: string
  basePath: string
}) {
  const router = useRouter()
  const locales = [
    { code: 'zh', name: '中文' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ]

  const handleChange = (locale: string) => {
    // 保留当前选中的 category 参数
    const url = new URL(window.location.href)
    const category = url.searchParams.get('category') || ''
    router.push(`${basePath}?locale=${locale}${category ? `&category=${category}` : ''}`)
  }

  return (
    <select
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
    >
      {locales.map((loc) => (
        <option key={loc.code} value={loc.code}>
          {loc.name}
        </option>
      ))}
    </select>
  )
}