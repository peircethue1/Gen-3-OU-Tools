import * as esbuild from 'esbuild';
import { existsSync, rmSync, mkdirSync, cpSync, watch } from 'fs';

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
  define: { 'process.env.NODE_ENV': isWatch ? '"development"' : '"production"' },
};

const mainConfig = {
  ...baseConfig,
  entryPoints: ['src/main.js'],
  format: 'iife',
};

const extensionConfig = {
  ...baseConfig,
  entryPoints: ['src/background.js', 'src/content.js'],
};

if (isWatch) {
  const ctxMain = await esbuild.context(mainConfig);
  const ctxExt = await esbuild.context(extensionConfig);

  await ctxMain.watch();
  await ctxExt.watch();

  if (existsSync('src/public')) {
    watch('src/public', { recursive: true }, () => {
      try {
        cpSync('src/public', 'dist', { recursive: true });
      } catch { }
    });
  }

  console.log('[esbuild] Watching for changes in src.');
} else {
  await esbuild.build(mainConfig);
  await esbuild.build(extensionConfig);

  console.log('[esbuild] Build finished successfully.');
}