import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/main.js',
  format: 'iife',
  target: ['chrome100'],
  sourcemap: true,
};

if (isWatch) {
  let ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('[esbuild] Watching for changes in src.');
} else {
  await esbuild.build(config);
  console.log('[esbuild] Build finished successfully.');
}