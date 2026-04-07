import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7E6381',
          light: '#9B7FA0',
          dark: '#6B5270',
        },
        accent: {
          DEFAULT: '#CBB56D',
          light: '#D9C88A',
          dark: '#B09A52',
        },
        brand: {
          dark: '#3E152A',
          darkLight: '#5A2040',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
