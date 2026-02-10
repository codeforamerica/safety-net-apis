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

  // Copy UI HTML (kept small — FigJam serializes it into __html__ in the sandbox)
  fs.copyFileSync('src/ui.html', 'dist/ui.html');

  // Copy manifest into dist/ so everything is in one folder
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  manifest.main = 'widget.js';
  manifest.ui = 'ui.html';
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

  // Copy schema bundle to dist/ so it's next to the manifest for easy loading
  const dataPath = '../design-export/figjam-widget/schema-bundle.json';
  if (fs.existsSync(dataPath)) {
    fs.copyFileSync(dataPath, 'dist/schema-bundle.json');
    console.log('Copied schema-bundle.json to dist/');
  }

  console.log('Build complete');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
