#!/usr/local/bin/node
var fs = require('fs-extra'),
    path = require('path'),
    async = require('async'),
    ejs = require('ejs'),
    us = require('underscore');

/*
 自动生成模块代码，模块的配置信息从module.json中读取
 */
var genCmd = {
    help : [
        "gen 用于快速生成项目",
        "  参数：gen {project_name} {project_type} {target_dir}",
        "    project_name: 项目名称",
        "    project_type: 项目类型",
        "    target_dir: 输出目录",
        "\n  例如: gen class"
    ],


    exec : function(args){
        console.log('实际操作还没有实现，可以手工复制nodejs目录下的所有文件到目标位置');
    }
}


// 打印每个命令对应的帮助信息
var helpCmd = {
    help : [
        "参数：help {cmd_name}",
    ],

    exec : function(args){
        //console.log(args);
        var cmd = args[0];
            cmdObj = share[cmd];
        console.log(cmdObj.help.join("\n"));
    }
}

var moduleCmd = {
    help : [
        "显示模块定义类容",
        "参数：module list",
        "  列出所有模块名",
        "参数：module {module_name}",
        "  module_name: 模块名称",
        "\n  例如: gen class"
    ],

    exec : function(args){
        if(!fs.existsSync('./module.json'))
            return console.log("ERROR: 模块定义文件(module.json)不存在");

        var modules = fs.readJsonSync('./module.json'),
            moduleName = args[0] ;

        if(moduleName){
            if(moduleName === 'list'){
                return console.log(us.map(modules, function(v,k){
                    return k;
                }).join(','));
            }

            if(!modules[moduleName])
                return console.log("ERROR: 模块[%s]不存在", moduleName);

            console.log("模块[%s]:", moduleName);
            console.log(modules[moduleName]);
        }else{
            console.log("所有模块:");
            console.log(modules);
        }
    }
}

var share = {
    gen : genCmd,
    help : helpCmd,
}

function printUsage(){
    var cmd = [];
    for(cmdname in share)
        cmd.push(cmdname);
    console.log('sharecli.js '+ cmd.join('|'));
}


//console.log(process.argv);
if(process.argv.length > 2){
    fn = process.argv[2];
    if(share[fn]){
        console.log("运行命令: %s", fn);
        share[fn].exec(process.argv.slice(3, process.argv.length));
    }else{
        printUsage();
    }
}else{
    printUsage();
}
