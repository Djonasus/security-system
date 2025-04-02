import { defineConfig } from 'vite';
// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     dedupe: ['react', 'react-dom']
//   },
//   optimizeDeps: {
//     include: ['reflect-metadata']
//   },
//   esbuild: {
//     legalComments: 'eof'
//   }
// });

export default defineConfig({
  server: {
    port: 3000,
  },
  base: './',
  publicDir: 'public'
})