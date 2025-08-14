import './globals.css'
import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ConfigProvider } from 'antd'
import locale from 'antd/locale/vi_VN'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Email App',
  description: 'Trịnh Thị Bình An',
  openGraph: {
    title: 'Email App',
    description: 'Trịnh Thị Bình An',
    url: '/',
    siteName: 'Email App',
    images: [
      {
        url: '/icon-mail.svg',
        width: 1200,
        height: 630,
        alt: 'Email App'
      }
    ],
    locale: 'vi_VN',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Email App',
    description: 'Trịnh Thị Bình An',
    images: ['/icon-mail.svg']
  },
  icons: [
    { rel: 'icon', url: '/icon-mail.svg' },
    { rel: 'shortcut icon', url: '/icon-mail.svg' }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>
        <AntdRegistry>
          <ConfigProvider 
            locale={locale}
            theme={{
              token: {
                colorPrimary: '#1890ff',
                borderRadius: 8,
              },
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
