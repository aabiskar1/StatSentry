using System;
using System.Linq;
using LibreHardwareMonitor.Hardware;
using System.Text.Json;
using System.IO;
using System.Reflection;
using System.Security.Principal;

namespace LibreHardwareMonitorBridge
{
    // This class implements the visitor pattern to update all hardware
    public class UpdateVisitor : IVisitor
    {
        public void VisitComputer(IComputer computer)
        {
            computer.Traverse(this);
        }
        public void VisitHardware(IHardware hardware)
        {
            hardware.Update();
            foreach (IHardware subHardware in hardware.SubHardware) subHardware.Accept(this);
        }
        public void VisitSensor(ISensor sensor) { }
        public void VisitParameter(IParameter parameter) { }
    }

    public class Program
    {
        static void CollectSensors(IHardware hardware, ref double? cpuTemp, ref int coreCount)
        {
            // Print hardware info for debugging
            Console.Error.WriteLine($"[DEBUG] Hardware: {hardware.Name}, Type: {hardware.HardwareType}, Identifier: {hardware.Identifier}");
            
            foreach (var sensor in hardware.Sensors)
            {
                Console.Error.WriteLine($"[DEBUG] Sensor: {sensor.Name}, Type: {sensor.SensorType}, Value: {sensor.Value}");
                
                if (sensor.SensorType == SensorType.Temperature)
                {
                    // Accept any temperature sensor related to CPU
                    if (hardware.HardwareType == HardwareType.Cpu || 
                        (hardware.HardwareType == HardwareType.Motherboard && 
                         (sensor.Name.Contains("CPU", StringComparison.OrdinalIgnoreCase) || 
                          sensor.Name.Contains("Core", StringComparison.OrdinalIgnoreCase))))
                    {
                        if (sensor.Value.HasValue && sensor.Value.Value > 0 && sensor.Value.Value < 120)
                        {
                            Console.Error.WriteLine($"[DEBUG] Found valid CPU temperature: {sensor.Name} = {sensor.Value.Value}°C");
                            if (cpuTemp == null) cpuTemp = 0;
                            cpuTemp += sensor.Value.Value;
                            coreCount++;
                        }
                    }
                }
            }
            
            foreach (var subHardware in hardware.SubHardware)
            {
                CollectSensors(subHardware, ref cpuTemp, ref coreCount);
            }
        }

        public static void Main(string[] args)
        {
            try
            {
                // Try to be admin - critical for hardware access
                bool isAdmin = false;
                using (WindowsIdentity identity = WindowsIdentity.GetCurrent())
                {
                    WindowsPrincipal principal = new WindowsPrincipal(identity);
                    isAdmin = principal.IsInRole(WindowsBuiltInRole.Administrator);
                }
                
                Console.Error.WriteLine($"[DEBUG] Running as administrator: {isAdmin}");
                
                // Find and copy the LibreHardwareMonitor.sys driver if needed
                string currentDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? ".";
                string driverPath = Path.Combine(currentDir, "LibreHardwareMonitor.sys");
                
                if (!File.Exists(driverPath))
                {
                    Console.Error.WriteLine($"[DEBUG] Driver not found at: {driverPath}");
                    // Try finding it in parent directories
                    DirectoryInfo? parentDir = Directory.GetParent(currentDir);
                    while (parentDir != null)
                    {
                        string testPath = Path.Combine(parentDir.FullName, "LibreHardwareMonitorBridge", "LibreHardwareMonitor.sys");
                        if (File.Exists(testPath))
                        {
                            Console.Error.WriteLine($"[DEBUG] Found driver at: {testPath}");
                            try
                            {
                                File.Copy(testPath, driverPath, true);
                                Console.Error.WriteLine($"[DEBUG] Copied driver to: {driverPath}");
                                break;
                            }
                            catch (Exception ex)
                            {
                                Console.Error.WriteLine($"[ERROR] Failed to copy driver: {ex.Message}");
                            }
                        }
                        parentDir = parentDir.Parent;
                    }
                }
                
                double? cpuTemp = null;
                int coreCount = 0;
                
                // Create computer instance with all needed hardware types
                var computer = new Computer
                {
                    IsCpuEnabled = true,
                    IsMotherboardEnabled = true,
                    IsControllerEnabled = true,
                    IsGpuEnabled = false,
                    IsMemoryEnabled = false,
                    IsNetworkEnabled = false,
                    IsStorageEnabled = false
                };
                
                // Open computer and apply visitor pattern to update all sensors
                computer.Open();
                computer.Accept(new UpdateVisitor());
                
                // Extract CPU temperature from all available hardware
                foreach (var hardware in computer.Hardware)
                {
                    CollectSensors(hardware, ref cpuTemp, ref coreCount);
                }
                
                // Calculate average temperature if we found any cores
                if (cpuTemp != null && coreCount > 0)
                {
                    cpuTemp /= coreCount;
                }
                
                var result = new { cpuTemperature = cpuTemp };
                Console.WriteLine(JsonSerializer.Serialize(result));
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[ERROR] {ex.GetType().Name}: {ex.Message}");
                Console.Error.WriteLine(ex.StackTrace);
                var result = new { cpuTemperature = (double?)null };
                Console.WriteLine(JsonSerializer.Serialize(result));
            }
        }
    }
}
