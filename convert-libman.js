#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Accept optional root directory path as argument, default to current working directory
const rootDir = process.argv[2] || process.cwd();

// Recursively find all libman.json files in the directory tree
function findLibmanFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      findLibmanFiles(filePath, fileList);
    } else if (file === 'libman.json') {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Helper function to check if a package version exists in npm
function checkPackageExists(name, version) {
  const result = spawnSync('npm', ['view', `${name}@${version}`, 'version'], {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  return result.status === 0 && result.stdout.trim().length > 0;
}

// Process a single libman.json file
function processLibmanFile(libmanPath) {
  const libmanDir = path.dirname(path.resolve(libmanPath));
  const projectName = path.basename(libmanDir);
  
  console.log(`\n📦 Processing: ${libmanPath}`);
  
  const libman = JSON.parse(fs.readFileSync(libmanPath, 'utf8'));
  
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
    console.warn('⚠️  No valid packages found to install. Skipping this libman.json.');
    return false;
  }
  
  // Create package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    dependencies
  };
  const packageJsonPath = path.join(libmanDir, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log(`Created package.json at ${packageJsonPath}`);
  
  // Generate package-lock.json by running npm install
  // All packages have been validated, so this should succeed
  console.log('Generating package-lock.json...');
  const result = spawnSync('npm', ['install', '--package-lock-only'], {
    cwd: libmanDir,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  if (result.status !== 0) {
    // This shouldn't happen since we validated packages, but handle it just in case
    const errorOutput = (result.stderr || '') + (result.stdout || '');
    console.error('\n⚠️  npm install failed unexpectedly:');
    console.error(errorOutput);
    throw new Error(`npm install failed for ${libmanPath}. All packages were validated, but installation still failed.`);
  }
  
  console.log(`Created package-lock.json at ${path.join(libmanDir, 'package-lock.json')}`);
  return true;
}

try {
  // Check if root directory exists
  if (!fs.existsSync(rootDir)) {
    throw new Error(`Root directory does not exist: ${rootDir}`);
  }
  
  console.log(`🔍 Searching for libman.json files in: ${rootDir}`);
  
  // Find all libman.json files
  const libmanFiles = findLibmanFiles(rootDir);
  
  if (libmanFiles.length === 0) {
    console.warn(`⚠️  No libman.json files found in ${rootDir}`);
    process.exit(0);
  }
  
  console.log(`Found ${libmanFiles.length} libman.json file(s)\n`);
  
  // Process each libman.json file
  let successCount = 0;
  let failureCount = 0;
  
  for (const libmanPath of libmanFiles) {
    try {
      if (processLibmanFile(libmanPath)) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${libmanPath}:`, error.message);
      failureCount++;
    }
  }
  
  console.log(`\n✅ Completed: ${successCount} succeeded, ${failureCount} failed`);
  
  if (failureCount > 0) {
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
