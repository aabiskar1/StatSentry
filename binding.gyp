{
  "targets": [
    {
      "target_name": "hardware_monitor",
      "sources": [
        "src/hardware_monitor.cpp"
      ],
      "include_dirs": [
        "<!(node -p \"require('path').resolve('node_modules/node-addon-api')\")",
        "src/vendor/nvapi",
        "src"
      ],
      "libraries": [
        "<(module_root_dir)/src/vendor/nvapi/amd64/nvapi64.lib",
        "-lwbemuuid",
        "-lpdh"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "RuntimeLibrary": 2
        }
      }
    }
  ]
}
