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

  // Copy UI HTML, embedding schema data if available
  let html = fs.readFileSync('src/ui.html', 'utf8');
  const dataPath = '../design-export/figjam-widget/schema-bundle.json';
  if (fs.existsSync(dataPath)) {
    const schemaData = fs.readFileSync(dataPath, 'utf8');
    const autoLoadScript = `\n    var __EMBEDDED_DATA__ = ${schemaData};\n`;
    html = html.replace('<script>', '<script>' + autoLoadScript);
    console.log('Embedded schema data in ui.html (' + Math.round(schemaData.length / 1024) + 'KB)');
  }
  fs.writeFileSync('dist/ui.html', html);

  // Copy manifest into dist/ so everything is in one folder
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  manifest.main = 'widget.js';
  manifest.ui = 'ui.html';
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

  // Copy schema bundle to dist/ so it's next to the manifest for easy loading
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
