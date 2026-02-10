const esbuild = require('esbuild');
const fs = require('fs');

const watch = process.argv.includes('--watch');

// Build the plugin code
async function build() {
  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  const buildOptions = {
    entryPoints: ['src/code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    target: 'es2017',
  };

  if (watch) {
    // Use context API for watch mode
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
  }

  // Copy the UI HTML file, embedding schema data if available
  let html = fs.readFileSync('src/ui.html', 'utf8');
  const dataPath = '../design-export/figma-plugin/all-data.json';
  if (fs.existsSync(dataPath)) {
    const schemaData = fs.readFileSync(dataPath, 'utf8');
    // Inject auto-load script before closing </script> tag
    const autoLoadScript = `
    // Auto-load embedded schema data
    try {
      const embeddedData = ${schemaData};
      updateBrowseTab(embeddedData);
    } catch (e) {
      console.warn('Failed to auto-load embedded data:', e);
    }`;
    html = html.replace('  </script>', autoLoadScript + '\n  </script>');
  }
  fs.writeFileSync('dist/ui.html', html);

  // Copy manifest into dist/ so everything is in one folder
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  manifest.main = 'code.js';
  manifest.ui = 'ui.html';
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

  console.log('Build complete');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
