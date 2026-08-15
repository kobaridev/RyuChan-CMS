/** @type {import('tailwindcss').Config} */
import daisyUI from 'daisyui'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito"', '"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [daisyUI, typography],
  daisyui: {
    themes: true,
    darkTheme: 'dracula',
    logs: false,
  },
}