import { defineConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import glsl from 'vite-plugin-glsl';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    port: 3000
  },
  define: {
    global: {}
  },
  plugins: [
    glsl({
      compress: false
    }),
    eslint({
      failOnError: false,
      failOnWarning: true
    }),
    tsconfigPaths()
  ]
});
