import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Uncomment to import from @botforge/shared in the future:
  // transpilePackages: ['@botforge/shared'],
}

export default withNextIntl(nextConfig)
