import * as esbuild from 'esbuild';
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';

const isWatch = process.argv.includes('--watch');

if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}

mkdirSync('dist');

if (existsSync('src/public')) {
  cpSync('src/public', 'dist', { recursive: true });
}

const baseConfig = {
  bundle: true,
  outdir: 'dist',
  target: ['chrome100'],
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  loader: { '.png': 'dataurl' },
  define: { 'process.env.NODE_ENV': isWatch ? '"development"' : '"production"' }
};

const mainConfig = {
  ...baseConfig,
  entryPoints: ['src/main.js'],
  format: 'iife'
};

const extensionConfig = {
  ...baseConfig,
  entryPoints: ['src/background.js', 'src/content.js', 'src/main.css'],
};

if (isWatch) {
  const ctxMain = await esbuild.context(mainConfig);
  const ctxExt = await esbuild.context(extensionConfig);

  await ctxMain.watch();
  await ctxExt.watch();

  console.log('[esbuild] Watching for changes in src.');
} else {
  await esbuild.build(mainConfig);
  await esbuild.build(extensionConfig);

  console.log('[esbuild] Build finished successfully.');
}