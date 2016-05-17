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
        "参数：gen {module_name}",
        "  module_name: 模块名称",
        "\n  例如: gen class"
    ],

    /*
    templs : [
        { file: "back_db.js" , out : "data/{module_name}db.js" },
        { file: "back_route.js" , out : "routes/{module_name}ctl.js" },
        { file: "front_module.js" , out : "public/js/{module_name}.js" },
        { file: "front_module.html" , out : "views/{module_name}page.html" },
    ],

    WORKFLOW_templs : [
        { file: "back_db.js" , out : "data/{module_name}db.js" },
        { file: "back_route.js" , out : "routes/{module_name}ctl.js" },
        { file: "front_module.js" , out : "public/js/{module_name}.js" },
        { file: "front_module.html" , out : "views/{module_name}page.html" },
        { file: "front_module_dlg.html" , out : "views/{module_name}_dlg.html" },
        { file: "front_module_form.html" , out : "views/form_{module_name}.html" },
        { file: "front_module_tb.html" , out : "views/tb_{module_name}.html" },
    ],
    */

    CRUD_templs : [
        { file: "back_db.js" , out : "{outdir}/{module_name}db.js" },
        { file: "back_route.js" , out : "{outdir}/{module_name}ctl.js" },
        { file: "front_module.js" , out : "{outdir}/public/js/{module_name}.js" },
        { file: "front_module.html" , out : "{outdir}/view/{module_name}page.html" },
        { file: "front_module_widget.js" , out : "{outdir}/public/js/{module_name}widget.js", 
            widget : true },
        { file: "front_module_widget.html" , out : "{outdir}/view/{module_name}widget.html",
            widget : true }
    ],

    NAVI_templs : [
        /* 目前不生成后端代码，只生成前端代码
        { file: "back_db.js" , out : "data/{module_name}db.js" },
        { file: "back_route.js" , out : "routes/{module_name}ctl.js" },*/
        { file: "front_module.js" , out : "{outdir}/js/{module_dir}/{module_name}.js" },
        { file: "front_module.html" , out : "{outdir}/WEB-INF/page/{module_dir}/{module_name}page.jsp" }
    ],

    RPT_templs : [
        /* 目前不生成后端代码，只生成前端代码
        { file: "back_db.js" , out : "data/{module_name}db.js" },
        { file: "back_route.js" , out : "routes/{module_name}ctl.js" },*/
        { file: "front_module.js" , out : "{outdir}/js/{module_dir}/{module_name}.js" },
        { file: "front_module.html" , out : "{outdir}/WEB-INF/page/{module_dir}/{module_name}page.jsp" },
        { file: "front_module_widget.js" , out : "{outdir}/js/{module_dir}/{module_name}widget.js", 
            widget : true },
        { file: "front_module_widget.html" , out : "{outdir}/WEB-INF/page/{module_dir}/{module_name}widget.jsp",
            widget : true }
    ],

    _preProcessModule : function(module, moduleName){
        // 主模块
        module.options.moduleType = 'primay';
        module.options.name = moduleName;
        module.submodules && module.submodules.forEach(function(submodule){
            submodule.options.moduleType = 'submodule';
            submodule.options.primaymodule = module;
        });
    },

    exec : function(args){
        if(!fs.existsSync('./module.json'))
            return console.log("ERROR: 模块定义文件(module.json)不存在");

        var modules = fs.readJsonSync('./module.json'),
            moduleName = args[0];

        var module = modules[moduleName];
        if(!module){
            return console.log('ERROR: 模块[%s]未定义，请现在module.json中添加对应的定义信息。', moduleName);
        }else{
            genCmd._preProcessModule(module, moduleName);       
        }
        var moduleDir = module.sysmodule ? 'sys' : moduleName;
        console.log("开始生成模块文件:\n 模块名称:[%s]\n 基础模版:[%s]\n 输出目录:[%s]\n 模块信息:[%s]",
            moduleName, module.template, moduleDir, JSON.stringify(module.options));

        var templs = genCmd[ module.template + '_templs' ];
        if(!templs) return ;


        // 根据模版生成目标文件
        function _genfile(templ, moduleName, module){
            // 如果该模块不需要生成widget，则跳过本模版文件
            if(templ.widget && !module.options.widget)
                return console.log('模板文件[%s]用于widget，不需要在此模块生成。', templ.file);

            if(!templ.widget && module.options.widget_only)
                return console.log('改模块为widget_only=true,模板文件[%s]不用于widget，不需要在此模块生成。', templ.file);                

            var tempfile = module.template + "/" + templ.file,
                outfileName = templ.out.replace('{module_dir}', moduleDir)
                    .replace(/{module_name}/g, moduleName).replace(/{outdir}/g, module.outdir),
                versionfile = templ.out.replace('{module_dir}', moduleDir)
                    .replace(/{module_name}/g, moduleName).replace(/{outdir}/g, '.version/' + moduleDir),
                outfile = outfileName;

            if(!fs.existsSync(tempfile)){
                return console.log('ERROR: 模板文件[%s]不存在，请检查模版配置是否正确。', module.template);
            }
            var str = fs.readFileSync(tempfile, 'utf8'), 
                ret = ejs.render(str, {
                    module_name: moduleName,
                    options : module.options
                },{ delimiter : "$" });
            
            fs.ensureDirSync(path.dirname(versionfile));
            fs.ensureDirSync(path.dirname(outfile));

            if(fs.existsSync(outfile)){
                console.log('ERROR: 目标文件[%s]已经存在，不能再次生成文件.', outfile);
                return console.log('1. 如果是因为模版改变需要再次生成，请使用 merge 命令; \n2.如果确实要重新生成，请删除目标文件后重新运行，删除前请执行svn commit')
            }
            // 在.version目录下保留一份生成文件，
            // 用于在模版发生改变的时候，与改文件比较来进行三方merge，把改变推送到生成的文件中
            fs.writeFileSync(versionfile, ret);
            // 正真生成目标文件
            fs.writeFileSync(outfile, ret);
            console.log("生成文件:%s", outfile);
        }

        templs.forEach(function(templ){
            console.log('-----------------------------------\n生成模版文件：' + templ.file + '\n-----------------------------------');
            _genfile(templ, moduleName, module);
        });
        module.submodules && module.submodules.forEach(function(submodule){
            submodule.outdir = module.outdir;
            console.log("===================================\n开始生成子模块文件:\n 模块名称:[%s]\n 基础模版:[%s]\n 输出目录:[%s]\n 模块信息:[%s]\n===================================\n",
                submodule.name, submodule.template, moduleDir, submodule.options);

            var subtempls = genCmd[ submodule.template + '_templs' ];
            if(!subtempls) return ;
            subtempls.forEach(function(subtempl){
                console.log('-----------------------------------\n生成模版文件：' + subtempl.file + '\n-----------------------------------');
                _genfile(subtempl, submodule.name, submodule);
            });
        });
    }
}

var exec = require('child_process').exec;
var mergeCmd = {
    help : [
        "修改模版代码后，重新生成模块代码，把修改的部分合并到以前生成的代码中，",
        "合并的算法使用git的3方合并，比较.version目录中以前生成的文件和本次生成的文件，提取出改变的行作为patch，然后把patch应用到系统中的代码。",
        "注意: 合并代码有一定的风险，有冲突的修改位置可能导致合并失败，如果失败了，需要手工修改文件中的冲突位置。",
        "合并前的源文件会改名并保留（*.timestamp）,请在确认无误后手工删除。",
        "参数: merge {module_name}",
        "  module_name: 模块名称",
        "\n  例如: merge class"
    ],

    exec : function(args){
        if(!fs.existsSync('./module.json'))
            return console.log("ERROR: 模块定义文件(module.json)不存在");

        var modules = fs.readJsonSync('./module.json'),
            moduleName = args[0];

        var module = modules[moduleName];
        if(!module){
            return console.log('ERROR: 模块[%s]未定义，请现在module.json中添加对应的定义信息。', moduleName);
        }else{
            genCmd._preProcessModule(module, moduleName);       
        }
        var moduleDir = module.sysmodule ? 'sys' : moduleName;
        console.log("开始重新生成并合并模块文件:\n 模块名称:[%s]\n 基础模版:[%s]\n 输出目录:[%s]\n 模块信息:[%s]",
            moduleName, module.template, module.outdir, JSON.stringify(module.options));

        var templs = genCmd[ module.template + '_templs' ];
        if(!templs) 
            return 

        // 合并模版templ对应的文件
        function _megerfile(templ, moduleName, module, callback){
            // 如果该模块不需要生成widget，则跳过本模版文件
            if(templ.widget && !module.options.widget){
                console.log('模板文件[%s]用于widget，不需要在此模块生成。', templ.file);
                return callback();
            }

            if(!templ.widget && module.options.widget_only){
                console.log('本模块为widget_only=true,模板文件[%s]不用于widget，不需要在此模块生成。', templ.file);                
                return callback();
            }
            
            var tempfile = module.template + "/" + templ.file,
                outfileName = templ.out.replace('{module_dir}', moduleDir)
                    .replace(/{module_name}/g, moduleName).replace(/{outdir}/g, module.outdir),
                versionfile = templ.out.replace('{module_dir}', moduleDir)
                    .replace(/{module_name}/g, moduleName).replace(/{outdir}/g, '.version/' + moduleDir),
                newVersionfile = versionfile + '.new';
                outfile = outfileName,
                newOutfile = outfileName + '.new';
                backOutfile = outfile + '.' + (new Date().getTime());

            if(!fs.existsSync(versionfile)){
                console.log('ERROR: 生成文件快照[%s]不存在，可能是没有正确生成。', versionfile);
                return callback();
            }
            if(!fs.existsSync(outfileName)){
                console.log('ERROR: 生成文件[%s]不存在，可能是没有正确生成。', outfileName);
                return callback();
            }

            if(!fs.existsSync(tempfile)){
                console.log('ERROR: 模板文件[%s]不存在，请检查模版配置是否正确。', module.template);
                return callback();
            }
            var str = fs.readFileSync(tempfile, 'utf8'), 
                ret = ejs.render(str, {
                    module_name: moduleName,
                    options : module.options
                },{ delimiter : "$" });

            // 在.version下生成新的文件
            fs.writeFileSync(newVersionfile, ret);
            
            var cmd = ['kdiff3', versionfile, newVersionfile, outfile, '-o' , newOutfile , '--auto'];
            console.log("> 执行三方合并\n base:%s\n new:%s\n old:%s", versionfile, newVersionfile, outfile);
            console.log("> cmd:\n%s\n", cmd.join(' '));
            // 执行3方合并，使用kdiff3工具，如果没有冲突就直接通过，如果有冲突，会弹出图形见面手工解决冲突
            var out = exec(cmd.join(' '), function(error, stdout, stderr){
                if(error) return callback(error);

                if(!fs.existsSync(newOutfile)){
                    console.log("ERROR: 三方合并未完成,输出文件[%s]不存在,跳过当前文件。", newOutfile);
                    return callback();      
                }
                // 备份老现有文件
                async.series([
                    function(cb){ 
                        fs.move(newVersionfile, versionfile, { clobber : true } ,cb); 
                    },
                    function(cb){ 
                        console.log("> 三方合并完成，覆盖base版本生成文件, 备份当前文件为:[%s]。", backOutfile);
                        fs.move(outfile, backOutfile, cb); 
                    },
                    function(cb){ 
                        fs.move(newOutfile, outfile, cb); 
                    },
                ], callback);
            });
        }

        // 合并主模块
        async.eachSeries(templs, function(templ, callback){
            console.log('-----------------------------------\n生成文件：' + templ.file + '\n-----------------------------------');
            _megerfile(templ, moduleName, module, callback);
        }, function(err){
            if(err){
                console.log("合并主模版完成,有错误 ERROR:", err);
            }else{
                console.log("合并主模版完成");
            }

            // 合并子模块
            module.submodules && async.eachSeries(module.submodules, function(submodule, submodulecb){
                submodule.outdir = module.outdir;
                console.log("===================================\n开始生成子模块文件:\n 模块名称:[%s]\n 基础模版:[%s]\n 输出目录:[%s]\n 模块信息:[%s]\n===================================\n",
                    submodule.name, submodule.template, moduleDir, submodule.options);

                var subtempls = genCmd[ submodule.template + '_templs' ];
                if(!subtempls) return ;

                async.eachSeries(subtempls, function(subtempl, callback){
                    console.log('-----------------------------------\n生成子模块模版文件：' + subtempl.file + '\n-----------------------------------');
                    console.log(subtempl.file);
                    _megerfile(subtempl, submodule.name, submodule, callback);
                }, function(err){
                    if(err){
                        console.log("合并模版完成,有错误 ERROR:", err);
                    }else{
                        console.log("合并模版完成");
                    }
                    submodulecb();
                });
            }, function(err){
                    if(err){
                        console.log("合并子模版完成,有错误 ERROR:", err);
                    }else{
                        console.log("合并子模版完成");
                    }
            });
        });
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
    module : moduleCmd, 
    merge : mergeCmd
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
