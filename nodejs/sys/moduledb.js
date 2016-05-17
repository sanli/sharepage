//#!本文件由share.js自动产生于Mon Sep 15 2014 23:05:13 GMT+0800 (CST), 产生命令行为: node share.js gen sysmodule CRUD ..
// HOWTO: 完成特定模块功能，请修改标记了TODO:的地方，扩展功能请实现再文件最末尾标记的位置，方便以后重新生成后合并
/**
 * sysmodule数据库访问类
 */
'use strict';
var inspect = require('util').inspect
  , ObjectID = require('mongodb').ObjectID
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Data = require('../mongo.js')
  , Helper = require('../mongo.js').Helper
  , extend = require('node.extend')
  , us = require('underscore')
  , csv = require('csv')
  , share = require('../sharepage.js') ;

// 模块相关的全局属性
const module_name = 'module', module_desc = '模块管理';

// === 基本数据结构定义，按照实际需求修改 ===
// 定义数据结构
var sys_module = new Schema({
    // ID字段在每个对象中会自动创建，除非需要自己创建_id,否者不要放开
    /* _id : Schema.Types.ObjectId, */
    // ---- 基本信息 ----
    // 模块名称
    module_name : String,
    // 模块显示在菜单上的字符
    lable : String,
    // 模块编号
    module_id : String,
    // 父模块编号
    parent_id : String,
    // 图标
    icon : String,
    // 模块对应的URL
    url : String,
    // 是否激活
    active: Boolean,
    // 模块初始化的时候传入到模块的基础参数
    init_status : String,
    // 是否是系统管理模块，如果是系统管理模块，就不显示在navi上
    sysadmin_module: Boolean,
    // 在界面上显示的时候的序号， 按照字典序排列
    order : String,
    // ------------------ 通用数据 ----------------
    // 最后修改时间
    ctime : Date,
    // 最后修改时间
    utime : Date,
},  { collection: 'sys_module' });
// 创建索引
sys_module.index({_id : 1})
    .index({module_name : 1}, { unique : true })
    .index({module_id : 1}, { unique : true });

var SysModule = mongoose.model('sys_module', sys_module),
    _Module = SysModule;
exports.SysModule = SysModule;


//以下字段不用在基本查询的时候返回
var defaultProjection = { };

// === 基本CRUD功能实现函数,一般不用修改，除非需要实现特定的数据逻辑 ===
// 创建模块对象，并更新权限
var roledb = require('./roledb.js');
exports.create = function(data, fn){
    console.log(data);
    debugger;
    var module = new _Module(data);
    module.ctime = new Date();
    module.utime = new Date();
    async.series([
        function(cb){ _Module.create(module, cb); },
        function(cb){ roledb.setRoleModulePrivilige('sysadmin', data.module_id, [1,2,3,4,5,6,7] , cb); },
        function(cb){ roledb.setRoleModulePrivilige('admin', data.module_id, [1,2,3,4,5,6,7] , cb); },
    ], function(err){
        if(err) console.log(`新建${module_desc}出错 :` + err);

        invalideCache();
        // 载入缓存
        _getModuleTree(function(err){
            if(err) 
                console.log(err);
            else
                console.log('重新载入模块列表完成');
        });
        fn(err);
    });
};

// 更新对象
exports.update = function(_id, data, fn){
    //检查是否与现有重复
    data.utime = new Date();
    _Module.findByIdAndUpdate(_id, {$set: data}, {new : false}, function(err){
        invalideCache();
        // 载入缓存
        _getModuleTree(function(err){
            if(err) 
                console.log(err);
            else
                console.log('重新载入模块列表完成');
        });
        fn(err);
    });
};

//删除对象，根据
exports.delete = function(_id, fn) {
    _Module.remove({ _id : _id } , function(err){
        invalideCache();
        // 载入缓存
        _getModuleTree(function(err){
            if(err) 
                console.log(err);
            else
                console.log('重新载入模块列表完成');
        });
        fn(err);
    });
}

// 查询数据，支持排序和分页
exports.list = function(cond, sort, page, fn){
  // 使用Aggregate查询数据
  _Module.find(cond, defaultProjection)
    .sort(sort)
    .skip(page.skip)
    .limit(page.limit)
    .exec(function(err, docs){
      if(err) console.trace(`新建${module_desc}出错:`, err);

      fn(err, docs);
    });
}

//返回某个查询的返回值数量，主要用于分页
exports.count = function(cond, fn){
    _Module.find(cond)
        .count(function(err, count){
          if(err) console.trace(`新建${module_desc}出错:`, err);

          fn(err, count);
        });
}

//按照ID查询对象
exports.findById = function(_id, fn){
  _Module.findById(_id, function(err, doc){
    fn(err, doc ? doc.toObject() : {});
  });
}

// =============== 扩展的代码请加在这一行下面，方便以后升级模板的时候合并 ===================
// 返回所有系统模块，用于内部的权限查询，会进行缓存，修改module是需要清楚Cache
var cachedGetAll = share._CreateCachedGetAllFn('sysmoduledb.modules', "getAllModule", _Module, {}, { parent_id : 1, order : 1 }),
    invalideCache = cachedGetAll.invalide;
exports.getAllModule =  cachedGetAll.list;
function _getModuleTree(fn){
    cachedGetAll.list(function(err, modules){
        if(err) return fn(err);

        // 构建模块树，使用递归，效率略低，适用于不频繁修改的树
        var root = [];
        modules.forEach((module) => { 
            if(module.parent_id === 'root')
                root.push(module);
        });

        function _findSubModules(module){
            var module_id = module.module_id;
            var submodules = us.filter(modules, module => { return module.parent_id === module_id })
            module.submodules = submodules;
            if(module.submodules.length > 0){
                submodules.forEach(submodule => { _findSubModules(submodule); } );
            }
        }
        root.forEach(module => { _findSubModules(module) });
        cache.put('sysmoduledb.moduletree', root);
        fn(null, root);
    });
}

var cache = require('memory-cache');
exports.getAllModule = function(){
    return cache.get('sysmoduledb.modules');
}
exports.getModuleTree = function(){
    return cache.get('sysmoduledb.moduletree');
}

// 载入缓存
_getModuleTree(function(err){
    if(err) 
        console.log(err);
    else
        console.log('载入模块列表完成');
});


// 从modules.json导入模块数据
var fs = require('fs-extra');
var _ = require('lodash');
var async = require('async');
function importmodule(fn){
    var jsonfile = __dirname + '/../sharepage/module.json';
    fs.readJson(jsonfile, function(err, data){
        if(err) return fn(err);

        async.eachOfSeries( data, function( moduleinfo, moudleid, cb ){
            _Module.findOne({ module_id : moudleid}, function(err, moduleobj){
                if(err) return cb(err);

                if(moduleobj){
                    console.log('Module:%s已经存在，跳过', moudleid);
                    return cb();
                }
                var opt = moduleinfo.options;
                exports.create({
                    module_id : moudleid,
                    module_name : opt.module_desc,
                    parent_id : 'root',
                    icon : 'glyphicon-asterisk',
                    url : opt.url,
                    active : true,
                    sysadmin_module : 'false'
                }, cb);
            });
        }, fn);
    });
}

// ============================= 下面是单元测试用的代码 ================================
var isme = require('../sharepage.js').isme;
var tester = {
    testGetAllModule: function(args){
        exports.getAllModule(function(err, modules){
            console.log(modules);
        });
    },

    testGetModuleTree : function(args){
        _getModuleTree(function(err){
            var moduletree = exports.getModuleTree();
            console.log(inspect(moduletree));
            console.log(JSON.stringify(moduletree));
        });
    },

    importmodule : function(args){
        importmodule(err => console.log(err ? err : '倒入完成'));
    }
 }

if(isme(__filename)){
  if(process.argv.length > 2 && isme(__filename)){
    var testfn = process.argv[2];
    console.log("run test:%s", testfn);

    if(tester[testfn]){
        console.log("连接已建立");
        tester[testfn](process.argv.slice(3) );
    }else{
        console.log('输入的是无效的命令')
    }
  }else{
    var testcmd = [];
    for(var cmd in tester)
      testcmd.push(cmd);

    console.log(__filename + ' '+ testcmd.join('|'));
  }
}


