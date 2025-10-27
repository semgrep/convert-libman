#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Accept optional libman.json path as argument, default to /convert/libman.json
const libmanPath = process.argv[2] || '/convert/libman.json';
const outputDir = process.argv[3] || '/convert';

try {
  const libman = JSON.parse(fs.readFileSync(libmanPath, 'utf8'));
  
  // Collect dependencies for package.json
  const dependencies = {};
  for (const lib of libman.libraries || []) {
    const match = lib.library.match(/^(.+?)@(.+)$/);
    if (match) {
      const [, name, version] = match;
      dependencies[name] = version;
    }
  }
  
  // Create package.json
  const packageJson = {
    name: 'libman',
    version: '1.0.0',
    dependencies
  };
  const packageJsonPath = path.join(outputDir, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Created package.json');
  
  // Generate package-lock.json by running npm install
  console.log('Generating package-lock.json...');
  execSync('npm install --package-lock-only', { stdio: 'inherit', cwd: outputDir });
  console.log('Created package-lock.json');
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
