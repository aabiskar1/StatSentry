# PC Hardware Monitor

A lightweight, real-time hardware monitor for Windows that displays CPU and GPU usage and temperature with minimal overhead.

## Features

- Real-time CPU usage monitoring
- CPU temperature monitoring with multiple fallback methods
- GPU usage and temperature monitoring for NVIDIA GPUs
- Low resource usage
- Console-based output
- Enhanced version with table display and logging capabilities

## Requirements

- Windows operating system
- Node.js (v14 or higher)
- Administrator privileges (for accurate CPU temperature readings)
- For GPU monitoring: NVIDIA graphics card with recent drivers

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the native addon:
   ```
   npm run build
   ```

## Usage

### Basic Usage

Run the monitor without administrator privileges (CPU temperature may not be accurate):

```
node test_native.js
```

### For Accurate CPU Temperature

For accurate CPU temperature readings, run with administrator privileges:

1. Option 1: Double-click the `run_as_admin.bat` file and allow elevation
2. Option 2: Right-click on Command Prompt, select "Run as administrator", navigate to the project folder, and run:
   ```
   node test_native.js
   ```

### Enhanced Monitor

The enhanced monitor provides a better user interface and additional features:

```
node src/enhanced-monitor.js
```

Or use the convenience batch file:

```
enhanced-monitor.bat
```

Enhanced monitor options:

```
--log, -l                Enable logging to CSV file
--format, -f FORMAT      Output format: table, csv, json, text (default: table)
--interval, -i MS        Update interval in milliseconds (default: 1000)
--help, -h               Show help message
```

Example usage:

```
node src/enhanced-monitor.js --log --format table
```

For administrator privileges, use:

```
run_enhanced_as_admin.bat
```

## How It Works

### CPU Usage Monitoring

CPU usage is measured using Windows Performance Data Helper (PDH) API through a native C++ addon. This provides the same metrics that Task Manager displays.

### CPU Temperature Monitoring

The system uses multiple methods to detect CPU temperature, with fallbacks in case some methods don't work:

1. **LibreHardwareMonitor** - Uses a C# bridge to access the LibreHardwareMonitor library, which provides accurate hardware sensor readings when run with administrator privileges.
2. **WMI Queries** - Attempts several WMI (Windows Management Instrumentation) queries to access thermal data.
3. **PowerShell Commands** - Uses PowerShell to query temperature data via CIM instances.
4. **Simulation** - As a last resort, estimates CPU temperature based on CPU usage using a basic thermal model.

### GPU Monitoring

GPU metrics are obtained using NVIDIA's NVAPI SDK for NVIDIA graphics cards. This provides both GPU usage percentage and temperature.

## Troubleshooting

### No Temperature Readings

If you see `CPU Temp: 0.00°C` in the output:
- Try running with administrator privileges using the provided `run_as_admin.bat`
- Some CPU models or motherboards may not expose temperature sensors properly

### Temperature Values Don't Match Other Tools

Different monitoring tools may:
- Read from different sensors (core, package, motherboard)
- Apply different offsets (especially for AMD CPUs)
- Sample at different intervals

## Acknowledgements

- LibreHardwareMonitor project for hardware sensor access
- NVIDIA for the NVAPI SDK
- Node.js N-API team for the native addon capabilities
