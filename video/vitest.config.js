import { defineConfig } from 'vitest/config'

// The social-proof video toolchain is plain Node: no DOM, no React.
// It keeps its own config so the app suite stays jsdom-only.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['video/src/**/*.test.js'],
  },
})
