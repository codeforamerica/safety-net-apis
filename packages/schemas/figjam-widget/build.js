const esbuild = require('esbuild');
const fs = require('fs');

const watch = process.argv.includes('--watch');

async function build() {
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  const buildOptions = {
    entryPoints: ['src/widget.tsx'],
    bundle: true,
    outfile: 'dist/widget.js',
    target: 'es2017',
    jsx: 'transform',
    jsxFactory: 'figma.widget.h',
    jsxFragment: 'figma.widget.Fragment',
  };

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
  }

  fs.copyFileSync('src/ui.html', 'dist/ui.html');

  console.log('Build complete');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
