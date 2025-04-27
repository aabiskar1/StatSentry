// Logger module for PC hardware monitor
const fs = require('fs');
const path = require('path');
const os = require('os');

class Logger {
  constructor(options = {}) {
    this.options = {
      logToFile: options.logToFile || false,
      logFilePath: options.logFilePath || path.join(__dirname, '../logs'),
      logFileName: options.logFileName || `hw_monitor_${new Date().toISOString().replace(/:/g, '-')}.csv`,
      consoleFormat: options.consoleFormat || 'table', // 'table', 'csv', 'json', 'text'
      interval: options.interval || 1000, // ms
      ...options
    };
    
    this.metrics = [];
    this.startTime = Date.now();
    this.lastLogTime = 0;
    
    // Create log directory if it doesn't exist
    if (this.options.logToFile) {
      try {
        if (!fs.existsSync(this.options.logFilePath)) {
          fs.mkdirSync(this.options.logFilePath, { recursive: true });
        }
        
        // Initialize log file with headers
        const fullPath = path.join(this.options.logFilePath, this.options.logFileName);
        fs.writeFileSync(fullPath, 'Timestamp,CPU Usage (%),CPU Temp (°C),GPU Usage (%),GPU Temp (°C)\n');
        
        console.log(`Logging to ${fullPath}`);
      } catch (err) {
        console.error('Error creating log file:', err);
        this.options.logToFile = false;
      }
    }
  }
  
  log(metrics) {
    const timestamp = new Date().toISOString();
    const { cpuUsage, cpuTemp, gpuUsage, gpuTemp } = metrics;
    
    // Add to in-memory buffer (limited to last 100 entries)
    this.metrics.push({ timestamp, cpuUsage, cpuTemp, gpuUsage, gpuTemp });
    if (this.metrics.length > 100) this.metrics.shift();
    
    // Write to log file if enabled
    if (this.options.logToFile) {
      const logLine = `${timestamp},${cpuUsage.toFixed(2)},${cpuTemp.toFixed(2)},${gpuUsage.toFixed(2)},${gpuTemp.toFixed(2)}\n`;
      const fullPath = path.join(this.options.logFilePath, this.options.logFileName);
      
      try {
        fs.appendFileSync(fullPath, logLine);
      } catch (err) {
        console.error('Error writing to log file:', err);
      }
    }
    
    // Output to console in the requested format
    this._outputToConsole(metrics);
  }
  
  _outputToConsole(metrics) {
    const { cpuUsage, cpuTemp, gpuUsage, gpuTemp } = metrics;
    const timestamp = new Date().toISOString();
    
    switch (this.options.consoleFormat) {
      case 'json':
        console.log(JSON.stringify({ timestamp, cpuUsage, cpuTemp, gpuUsage, gpuTemp }));
        break;
        
      case 'csv':
        console.log(`${timestamp},${cpuUsage.toFixed(2)},${cpuTemp.toFixed(2)},${gpuUsage.toFixed(2)},${gpuTemp.toFixed(2)}`);
        break;
        
      case 'table':
        // Only update the table if enough time has passed (to reduce flickering)
        const now = Date.now();
        if (now - this.lastLogTime >= this.options.interval) {
          this.lastLogTime = now;
          
          // Clear console and show header
          console.clear();
          const uptime = this._formatTime((now - this.startTime) / 1000);
          console.log(`\nPC Hardware Monitor - ${timestamp} (Uptime: ${uptime})\n`);
          
          // Display current metrics
          console.log('┌───────────┬───────────┬───────────┐');
          console.log('│ Component │   Usage   │    Temp   │');
          console.log('├───────────┼───────────┼───────────┤');
          console.log(`│ CPU       │ ${this._formatValue(cpuUsage, '%', 6)} │ ${this._formatValue(cpuTemp, '°C', 6)} │`);
          console.log(`│ GPU       │ ${this._formatValue(gpuUsage, '%', 6)} │ ${this._formatValue(gpuTemp, '°C', 6)} │`);
          console.log('└───────────┴───────────┴───────────┘');
          
          // Display trend graphs if we have enough data
          if (this.metrics.length > 5) {
            const cpuUsageTrend = this._generateTrend(this.metrics.map(m => m.cpuUsage));
            const cpuTempTrend = this._generateTrend(this.metrics.map(m => m.cpuTemp));
            
            console.log('\nTrends (last minute):');
            console.log(`CPU Usage: ${cpuUsageTrend}`);
            console.log(`CPU Temp:  ${cpuTempTrend}`);
          }
          
          // Display system info
          console.log(`\nSystem: ${os.hostname()} | ${os.type()} ${os.release()} | ${os.cpus()[0].model}`);
          
          if (this.options.logToFile) {
            console.log(`\nLogging to: ${path.join(this.options.logFilePath, this.options.logFileName)}`);
          }
          
          // Add note about admin privileges if CPU temp is from simulation
          if (cpuTemp > 0 && (cpuTemp === Math.round(cpuTemp) || 
              (cpuTemp.toFixed(2).endsWith('.00') || 
               cpuTemp.toFixed(2).endsWith('.50')))) {
            console.log('\nNote: CPU temperature may be simulated. Run with admin rights for accurate readings.');
          }
        }
        break;
        
      default: // text
        console.log(`[${timestamp}] CPU: ${cpuUsage.toFixed(2)}% | ${cpuTemp.toFixed(2)}°C | GPU: ${gpuUsage.toFixed(2)}% | ${gpuTemp.toFixed(2)}°C`);
    }
  }
  
  _formatValue(value, unit, length) {
    const formatted = value.toFixed(2) + unit;
    return formatted.padStart(length);
  }
  
  _formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  _generateTrend(values) {
    // Use simple ASCII characters to represent a trend
    // For a more sophisticated implementation, use a library like asciichart
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const recent = values.slice(-20); // Just use the last 20 values
    
    if (recent.length < 2) return '';
    
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min || 1; // Avoid division by zero
    
    return recent.map(v => {
      const normalized = (v - min) / range;
      const index = Math.min(chars.length - 1, Math.floor(normalized * chars.length));
      return chars[index];
    }).join('');
  }
  
  getSummary() {
    if (this.metrics.length === 0) return null;
    
    // Calculate averages and max values
    const cpuUsageValues = this.metrics.map(m => m.cpuUsage);
    const cpuTempValues = this.metrics.map(m => m.cpuTemp);
    const gpuUsageValues = this.metrics.map(m => m.gpuUsage);
    const gpuTempValues = this.metrics.map(m => m.gpuTemp);
    
    return {
      samples: this.metrics.length,
      duration: ((Date.now() - this.startTime) / 1000).toFixed(1) + 's',
      cpu: {
        usage: {
          avg: this._calculateAverage(cpuUsageValues).toFixed(2) + '%',
          max: Math.max(...cpuUsageValues).toFixed(2) + '%',
          min: Math.min(...cpuUsageValues).toFixed(2) + '%'
        },
        temp: {
          avg: this._calculateAverage(cpuTempValues).toFixed(2) + '°C',
          max: Math.max(...cpuTempValues).toFixed(2) + '°C',
          min: Math.min(...cpuTempValues).toFixed(2) + '°C'
        }
      },
      gpu: {
        usage: {
          avg: this._calculateAverage(gpuUsageValues).toFixed(2) + '%',
          max: Math.max(...gpuUsageValues).toFixed(2) + '%',
          min: Math.min(...gpuUsageValues).toFixed(2) + '%'
        },
        temp: {
          avg: this._calculateAverage(gpuTempValues).toFixed(2) + '°C',
          max: Math.max(...gpuTempValues).toFixed(2) + '°C',
          min: Math.min(...gpuTempValues).toFixed(2) + '°C'
        }
      }
    };
  }
  
  _calculateAverage(array) {
    return array.reduce((a, b) => a + b, 0) / array.length;
  }
}

module.exports = Logger;
