#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Accept optional libman.json path as argument, default to /convert/libman.json
const libmanPath = process.argv[2] || '/convert/libman.json';
const outputDir = process.argv[3] || '/convert';

try {
  const libman = JSON.parse(fs.readFileSync(libmanPath, 'utf8'));
  
  // Extract project name from the folder containing libman.json
  const libmanDir = path.dirname(path.resolve(libmanPath));
  const projectName = path.basename(libmanDir);
  
  // Helper function to check if a package version exists in npm
  function checkPackageExists(name, version) {
    const result = spawnSync('npm', ['view', `${name}@${version}`, 'version'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.status === 0 && result.stdout.trim().length > 0;
  }
  
  // Collect dependencies for package.json, only including packages that exist in npm
  const dependencies = {};
  const skippedPackages = [];
  
  console.log('Checking package availability...');
  for (const lib of libman.libraries || []) {
    const match = lib.library.match(/^(.+?)@(.+)$/);
    if (match) {
      const [, name, version] = match;
      if (checkPackageExists(name, version)) {
        dependencies[name] = version;
        console.log(`  ✓ ${name}@${version}`);
      } else {
        skippedPackages.push({ name, version });
        console.log(`  ✗ ${name}@${version} (not found in npm)`);
      }
    }
  }
  
  if (skippedPackages.length > 0) {
    console.warn(`\n⚠️  Skipped ${skippedPackages.length} package(s) that don't exist in npm:`);
    for (const pkg of skippedPackages) {
      console.warn(`  - ${pkg.name}@${pkg.version}`);
    }
  }
  
  if (Object.keys(dependencies).length === 0) {
    throw new Error('No valid packages found to install. All packages from libman.json are unavailable.');
  }
  
  // Create package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    dependencies
  };
  const packageJsonPath = path.join(outputDir, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Created package.json');
  
  // Generate package-lock.json by running npm install
  // All packages have been validated, so this should succeed
  console.log('\nGenerating package-lock.json...');
  const result = spawnSync('npm', ['install', '--package-lock-only'], {
    cwd: outputDir,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  if (result.status !== 0) {
    // This shouldn't happen since we validated packages, but handle it just in case
    const errorOutput = (result.stderr || '') + (result.stdout || '');
    console.error('\n⚠️  npm install failed unexpectedly:');
    console.error(errorOutput);
    throw new Error('npm install failed. All packages were validated, but installation still failed.');
  }
  
  console.log('Created package-lock.json');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
