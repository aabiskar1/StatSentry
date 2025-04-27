const path = require('path');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m'
  }
};

// Helper function to print colored messages
function printHeading(message) {
  console.log(`\n${colors.bright}${colors.fg.cyan}${message}${colors.reset}`);
}

function printSuccess(message) {
  console.log(`${colors.fg.green}✓ ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.fg.red}✗ ${message}${colors.reset}`);
}

function printInfo(message) {
  console.log(`${colors.fg.yellow}ℹ ${message}${colors.reset}`);
}

// Check if running as administrator
function isAdmin() {
  try {
    // This file operation will fail if not running as admin
    const testFile = path.join(process.env.windir, 'temp', 'admin-test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (e) {
    return false;
  }
}

// Check for required dependencies
function checkDependencies() {
  printHeading("Checking Dependencies...");
  
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`Node.js version: ${nodeVersion}`);
  const versionNum = Number(nodeVersion.substring(1).split('.')[0]);
  if (versionNum < 14) {
    printError("Node.js version 14 or higher is recommended");
  } else {
    printSuccess("Node.js version is adequate");
  }
  
  // Check for required libraries
  try {
    require('node-gyp');
    printSuccess("node-gyp is installed");
  } catch (e) {
    printError("node-gyp is not installed. Install it with: npm install -g node-gyp");
  }
  
  // Check for build tools
  if (process.platform === 'win32') {
    try {
      execSync('where cl.exe', { stdio: 'ignore' });
      printSuccess("MSVC compiler found");
    } catch (e) {
      printError("MSVC compiler not found. Install Visual Studio Build Tools");
      printInfo("You can install build tools with: npm install --global windows-build-tools");
    }
  }
}

// Copy required drivers and libraries
function setupLibraries() {
  printHeading("Setting Up Required Libraries...");
  
  // Define source and destination paths
  const libSources = [
    {
      src: path.join(__dirname, 'LibreHardwareMonitorBridge', 'LibreHardwareMonitorLib.dll'),
      dst: path.join(__dirname, 'src', 'LibreHardwareMonitorBridge', 'bin', 'Release', 'net9.0', 'LibreHardwareMonitorLib.dll'),
      name: 'LibreHardwareMonitorLib.dll'
    },
    {
      src: path.join(__dirname, 'LibreHardwareMonitorBridge', 'LibreHardwareMonitor.sys'),
      dst: path.join(__dirname, 'src', 'LibreHardwareMonitorBridge', 'bin', 'Release', 'net9.0', 'LibreHardwareMonitor.sys'),
      name: 'LibreHardwareMonitor.sys driver'
    }
  ];
  
  // Create destination directory if it doesn't exist
  const dstDir = path.join(__dirname, 'src', 'LibreHardwareMonitorBridge', 'bin', 'Release', 'net9.0');
  if (!fs.existsSync(dstDir)) {
    try {
      fs.mkdirSync(dstDir, { recursive: true });
      printSuccess(`Created directory: ${dstDir}`);
    } catch (e) {
      printError(`Failed to create directory: ${dstDir}`);
      console.error(e);
    }
  }
  
  // Copy each library
  libSources.forEach(lib => {
    if (fs.existsSync(lib.src)) {
      try {
        fs.copyFileSync(lib.src, lib.dst);
        printSuccess(`Copied ${lib.name}`);
      } catch (e) {
        printError(`Failed to copy ${lib.name}`);
        console.error(e);
      }
    } else {
      printError(`${lib.name} not found at ${lib.src}`);
    }
  });
}

// Build and compile the project
function buildProject() {
  printHeading("Building Project...");
  
  try {
    printInfo("Building native addon...");
    execSync('npm run build', { stdio: 'inherit' });
    printSuccess("Native addon built successfully");
  } catch (e) {
    printError("Failed to build native addon");
    console.error(e);
  }
  
  try {
    printInfo("Building LibreHardwareMonitorBridge...");
    execSync('dotnet build -c Release ./src/LibreHardwareMonitorBridge/LibreHardwareMonitorBridge.csproj', { stdio: 'inherit' });
    printSuccess("LibreHardwareMonitorBridge built successfully");
  } catch (e) {
    printError("Failed to build LibreHardwareMonitorBridge");
    console.error(e);
  }
}

// Display system information
function showSystemInfo() {
  printHeading("System Information");
  
  console.log(`OS: ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`CPU: ${os.cpus()[0].model} (${os.cpus().length} cores)`);
  console.log(`Memory: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
  console.log(`Running as Administrator: ${isAdmin() ? 'Yes' : 'No'}`);
  
  if (!isAdmin()) {
    printInfo("For accurate CPU temperature readings, run with administrator privileges.");
    printInfo("Use the run_as_admin.bat script or start Node.js with admin rights.");
  }
}

// Run a quick test
function runQuickTest() {
  printHeading("Running Quick Test...");
  
  try {
    printInfo("Testing CPU usage monitor...");
    const native = require('./src/hardware_monitor');
    const cpuUsage = native.getCpuUsage();
    console.log(`CPU Usage: ${cpuUsage.toFixed(2)}%`);
    printSuccess("CPU usage monitor is working");
    
    printInfo("Testing GPU monitor...");
    const gpuInfo = native.getGpuInfo();
    console.log(`GPU Usage: ${gpuInfo.usage.toFixed(2)}%, Temperature: ${gpuInfo.temperature.toFixed(2)}°C`);
    if (gpuInfo.temperature > 0) {
      printSuccess("GPU monitoring is working");
    } else {
      printInfo("GPU temperature reading returned 0, which might be normal if the GPU is idle or not supported");
    }
    
    printInfo("Testing hardware sensing (this may take a few seconds)...");
    console.log("A quick sample will appear below:");
    execSync('node test_native.js --quick-test', { stdio: 'inherit' });
    
    printSuccess("Tests completed!");
  } catch (e) {
    printError("Test failed");
    console.error(e);
  }
}

// Main function
async function main() {
  console.log(`${colors.bright}${colors.fg.green}================================${colors.reset}`);
  console.log(`${colors.bright}${colors.fg.green}PC Hardware Monitor Setup Tool${colors.reset}`);
  console.log(`${colors.bright}${colors.fg.green}================================${colors.reset}`);
  
  // Run all setup functions
  checkDependencies();
  setupLibraries();
  buildProject();
  showSystemInfo();
  
  if (process.argv.includes('--run-test')) {
    runQuickTest();
  }
  
  // Print final instructions
  printHeading("Setup Complete!");
  console.log(`${colors.bright}To run the hardware monitor:${colors.reset}`);
  console.log(`${colors.fg.white}1. For basic monitoring: ${colors.fg.cyan}node test_native.js${colors.reset}`);
  console.log(`${colors.fg.white}2. For accurate CPU temperature: ${colors.fg.cyan}Run run_as_admin.bat${colors.reset}`);
  console.log("\nFor more information, see the README.md file.");
}

// Run the main function
main().catch(console.error);
