import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  // Demo build for GitHub Pages
  if (mode === 'demo') {
    return {
      root: 'demo',
      base: '/nanopub-view/', // Replace with your repo name
      build: {
        outDir: '../demo-dist',
        emptyOutDir: true
      }
    };
  }
  
  // Library build mode
  if (command === 'build') {
    return {
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/index.js'),
          name: 'NanopubViewer',
          formats: ['es', 'umd'],
          fileName: (format) => {
            if (format === 'es') return 'nanopub-viewer.esm.js';
            if (format === 'umd') return 'nanopub-viewer.js';
          }
        },
        rollupOptions: {
          output: {
            assetFileNames: (assetInfo) => {
              if (assetInfo.name === 'style.css') return 'nanopub-viewer.css';
              return assetInfo.name;
            }
          }
        }
      }
    };
  }
  
  // Dev server mode
  return {
    root: 'demo',
    server: {
      port: 3000,
      open: true
    }
  };
});
