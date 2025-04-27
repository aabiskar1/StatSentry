#include <napi.h>
#include <windows.h>
#include <pdh.h>
#include <pdhmsg.h>
#include <comdef.h>
#include <Wbemidl.h>
#include "vendor/nvapi/nvapi.h"
#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "pdh.lib")

// Helper to get CPU usage using PDH
Napi::Value GetCpuUsage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    static PDH_HQUERY cpuQuery = NULL;
    static PDH_HCOUNTER cpuTotal;
    static bool initialized = false;
    PDH_FMT_COUNTERVALUE counterVal;
    double usage = 0.0;

    if (!initialized) {
        if (PdhOpenQuery(NULL, 0, &cpuQuery) != ERROR_SUCCESS) {
            Napi::TypeError::New(env, "Failed to open PDH query").ThrowAsJavaScriptException();
            return env.Null();
        }
        if (PdhAddCounterW(cpuQuery, L"\\Processor(_Total)\\% Processor Time", 0, &cpuTotal) != ERROR_SUCCESS) {
            Napi::TypeError::New(env, "Failed to add PDH counter").ThrowAsJavaScriptException();
            return env.Null();
        }
        initialized = true;
        // First call to collect data
        PdhCollectQueryData(cpuQuery);
        Sleep(100); // Wait a bit for next sample
    }
    PdhCollectQueryData(cpuQuery);
    if (PdhGetFormattedCounterValue(cpuTotal, PDH_FMT_DOUBLE, NULL, &counterVal) == ERROR_SUCCESS) {
        usage = counterVal.doubleValue;
    }
    return Napi::Number::New(env, usage);
}

// Helper to get CPU temperature using systeminformation in Node.js (native stub returns 0.0)
Napi::Value GetCpuTemperature(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, 0.0);
}

// Get GPU usage and temperature using NVAPI
Napi::Value GetGpuInfo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Object result = Napi::Object::New(env);
    double usage = 0.0;
    double temp = 0.0;
    NvAPI_Status status = NVAPI_OK;
    static bool nvapiInitialized = false;
    if (!nvapiInitialized) {
        status = NvAPI_Initialize();
        nvapiInitialized = (status == NVAPI_OK);
    }
    if (nvapiInitialized) {
        NvPhysicalGpuHandle gpuHandles[NVAPI_MAX_PHYSICAL_GPUS] = {0};
        NvU32 gpuCount = 0;
        if (NvAPI_EnumPhysicalGPUs(gpuHandles, &gpuCount) == NVAPI_OK && gpuCount > 0) {
            // Get temperature
            NV_GPU_THERMAL_SETTINGS thermal = {0};
            thermal.version = NV_GPU_THERMAL_SETTINGS_VER;
            if (NvAPI_GPU_GetThermalSettings(gpuHandles[0], NVAPI_THERMAL_TARGET_ALL, &thermal) == NVAPI_OK) {
                temp = (double)thermal.sensor[0].currentTemp;
            }
            // Get utilization (usage) - average all present domains
            NV_GPU_DYNAMIC_PSTATES_INFO_EX pstates = {0};
            pstates.version = NV_GPU_DYNAMIC_PSTATES_INFO_EX_VER;
            if (NvAPI_GPU_GetDynamicPstatesInfoEx(gpuHandles[0], &pstates) == NVAPI_OK) {
                double total = 0.0;
                int count = 0;
                for (int i = 0; i < NVAPI_MAX_GPU_UTILIZATIONS; ++i) {
                    if (pstates.utilization[i].bIsPresent) {
                        total += pstates.utilization[i].percentage;
                        count++;
                    }
                }
                if (count > 0) usage = total / count;
            }
        }
    }
    result.Set("usage", usage);
    result.Set("temperature", temp);
    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "getCpuUsage"), Napi::Function::New(env, GetCpuUsage));
    exports.Set(Napi::String::New(env, "getCpuTemperature"), Napi::Function::New(env, GetCpuTemperature));
    exports.Set(Napi::String::New(env, "getGpuInfo"), Napi::Function::New(env, GetGpuInfo));
    return exports;
}

NODE_API_MODULE(hardware_monitor, Init)
