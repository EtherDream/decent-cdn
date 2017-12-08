// DEBUG MODE
var SW_MAIN    = ";;;<@embed sw_main.js>;;;"
var SW_LOADER  = "<@embed sw_loader.js>"
var SW_INSTALL = "<@embed sw_install.js>"

eval(self.window ? SW_INSTALL : SW_LOADER);