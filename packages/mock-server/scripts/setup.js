/**
 * Setup script for mock server
 * Initializes databases and seeds initial data
 */

import { resolve } from 'path';
import { performSetup, displaySetupSummary } from '../src/setup.js';
import { closeAll } from '../src/database-manager.js';

async function setup() {
  const args = process.argv.slice(2);
  const specsArg = args.find(a => a.startsWith('--specs='));
  if (!specsArg) {
    console.error('Error: --specs=<dir> is required.\n');
    console.error('Usage: node scripts/setup.js --specs=<dir>');
    process.exit(1);
  }
  const specsDir = resolve(specsArg.split('=')[1]);

  console.log('='.repeat(70));
  console.log('Mock Server Setup');
  console.log('='.repeat(70));

  try {
    // Perform setup (load specs and seed databases)
    const { summary } = await performSetup({ specsDir, verbose: true });
    
    // Display summary
    displaySetupSummary(summary);
    
    console.log('\n✓ Setup complete!');
    console.log('\nStart the mock server with: npm run mock:start\n');
    
    // Close databases
    closeAll();
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error);
    closeAll();
    process.exit(1);
  }
}

setup();
