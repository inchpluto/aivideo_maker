import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  const demoBuild = mode === 'demo';
  return {
    base: './',
    server: {
      host: '127.0.0.1',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4174',
          changeOrigin: false
        }
      }
    },
    plugins: demoBuild ? [viteSingleFile()] : [],
    build: {
      assetsInlineLimit: demoBuild ? 100000000 : 4096,
      cssCodeSplit: !demoBuild,
      rollupOptions: {
        output: demoBuild ? { inlineDynamicImports: true } : {
          manualChunks: {
            react: ['react', 'react-dom'],
            icons: ['lucide-react']
          }
        }
      }
    }
  };
});
