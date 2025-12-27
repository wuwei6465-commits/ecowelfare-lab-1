import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 修改为相对路径 './'，这样代码可以部署在任何仓库或子目录下，不会因为仓库名不匹配而报错
  base: './',
})