//#!本文件由share.js自动产生, 命令行为: node share.js gen role CRUD ..
'use strict';
/**
 * role数据库访问类
 */
var inspect = require('util').inspect
  , ObjectID = require('mongodb').ObjectID
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Data = require('../mongo.js')
  , Helper = require('../mongo.js').Helper
  , extend = require('node.extend')
  , csv = require('csv') 
  , _ = require('lodash')
  , async = require('async')
  , share = require('../sharepage.js');

// 模块相关的全局属性
const module_name = 'role', module_desc = '角色管理';
// === 基本数据结构定义，按照实际需求修改 ===

// TODO: 下面为Demo数据结构，请改成模块实际数据结构
var sys_role = new Schema({
    // ID字段在每个对象中会自动创建，除非需要自己创建_id,否者不要放开
    /* _id : Schema.Types.ObjectId, */
    // ---- 基本信息 ----
    // 角色名称
    role_name : String,
    // 角色在各个模块上的权限
    privilege : [{
      module_id : String,
      // 一般来说mongodb中应该尽量避免这种2层的array嵌套
      // 由于actions是比较简单的数组，为了简便，如此使用
      actions : [String],
    }],

    // ------------------ 通用数据 ----------------
    // 最后修改时间
    ctime : Date,
    // 最后修改时间
    utime : Date,
},  { collection: 'sys_role' });

// 创建索引，以及设置唯一键
// TODO: 根据实际结构确定索引结构
sys_role.index({_id : 1})
    .index({role_name : 1}, { unique : true })
    .index({'privilege.module_id' : 1});
var sys_role = mongoose.model('sys_role', sys_role ),
    _Module = sys_role ;
exports.sys_role  = sys_role;


// 以下字段不用在列表查询的时候返回
// TODO:  需要修改为实际数据结构对应的字段
var defaultProjection = { ctime : 0, utime : 0 };


// === 基本功能实现函数,一般不用修改 ===
// 创建对象
exports.create = function(data, fn){
    var module = new _Module(data);
    module.ctime = new Date();
    module.utime = new Date();

    _Module.create(module, function(err, newModule){
      if(err) return fn(err);

      _refresh();
      fn(err, newModule);
    });
};

// 更新对象
exports.update = function(_id, data, fn){
    data.utime = new Date();
    _Module.findByIdAndUpdate(_id, {$set: data}, {new : false}, function(err){
        if(!err) _refresh();
        fn(err)
    });
};

//删除对象
exports.delete = function(_id, fn) {
    _Module.remove({ _id : { $in : _id } } , function(err){
        if(!err) _refresh();
        fn(err)
    });
}

// 查询数据，支持排序和分页
exports.list = function(cond, sort, page, fn){
    // 使用Aggregate查询数据
  _Module.find(cond, defaultProjection)
    .sort(sort)
    .skip(page.skip)
    .limit(page.limit)
    .exec(fn);
}

// 普通查询,用于数据导出
exports.query = function(cond, sort, fn){
    _Module.find(cond)
    .sort(sort)
    .exec(fn);
}

//返回某个查询的返回值数量，主要用于分页
exports.count = function(cond, fn){
  _Module.find(cond)
    .count(function(err, count){
      if(err) return fn(err);

      fn(err, count);
    });
}

//按照ID查询对象
exports.findById = function(_id, fn){
  _Module.findById(_id, function(err, doc){
    fn(err, doc ? doc.toObject() : {});
  });
}

// 按照条件查询返回一个第一个找到的对象
exports.findByCond = function(cond, fn){
  _Module.findOne(cond, function(err, doc){
    fn(err, doc ? doc.toObject() : null);
  });  
}


// =============== 扩展的代码请加在这一行下面，方便以后升级模板的时候合并 ===================
// 设置特定角色针对某个模块的权限
// @rulename : 角色名称，如果角色不存在，则创建新角色
// @module_id: 模块编号
// @privileges: 角色在模块上具有的权限，覆盖当前权限
function setRoleModulePrivilige(rulename, module_id, privileges, fn){
  _Module.findOne({ role_name : rulename }, function(err, rule){
    if(err) return fn(err);

    if(!rule){
      return _Module.create({
        role_name : rulename,
        ctime : new Date(),
        utime : new Date(),
        privilege : [
          { 
            "module_id" : module_id, 
            "actions" : privileges
          }
        ]
      }, async.apply(_refresh, fn));
    }else{
      var privilege = rule.privilege;
      if(!privilege) privilege = [];

      if( ! _.some(privilege, modulep => {
        if(modulep.module_id === module_id){
          modulep.actions = privileges;
          return true;
        }else{
          return false;
        }
      })){
        privilege.push({
          "module_id" : module_id, 
          "actions" : privileges
        })
      };

      console.log(privilege);

      _Module.update({ role_name : rulename },
        { $set : { privilege : privilege } },
        async.apply(_refresh, fn));
    }
  });
}
exports.setRoleModulePrivilige = setRoleModulePrivilige;


// 返回所有系统模块，用于内部的权限查询，会进行缓存，修改module是需要清楚Cache
var cachedGetAll = share._CreateCachedGetAllFn('roledb.role', "getAllRoles", _Module, {}, {}),
    invalideCache = cachedGetAll.invalide;

var cache = require('memory-cache');
// 载入缓存
function _loadCache(fn){
  cachedGetAll.list(function(err, roles){
    if(err) {
      console.trace(err);
      return fn(err);
    }else{
      console.log('载入角色完成, 一共载入：%s个角色', roles.length);
    }

    roles.forEach( (role) => {
        var privilege = {};
        role.privilege.forEach( priv => privilege[priv.module_id] = priv.actions );
        cache.put('roles.' + role.role_name, privilege);
    });
    fn && fn(null, roles);
  });
}

// 刷新缓存
function _refresh(fn){
  invalideCache();
  _loadCache(fn);
}


exports.getRolePrivilege = function(role_name){
  return cache.get('roles.' + role_name);
}

exports.getRoles = function(){
  return cache.get('roledb.role');
}

// 系统启动的时候载入角色权限
_loadCache();
// ============================= 下面是单元测试用的代码 ================================
var isme = require('../sharepage.js').isme;
var tester = {
  testfn: function(){
    //TODO : 执行测试代码
  },

  testSetRoleModulePrivilige : function(){
    setRoleModulePrivilige('testrole', 'testmodule', [1,2,3,4,5,6,7], function(err){
      console.log(err ? err : '设置完成');
    });
  }
}

if(isme(__filename)){
  if(process.argv.length > 2 && isme(__filename)){
    var testfn = process.argv[2];
    console.log("run test:%s", testfn);

    if(tester[testfn]){
      tester[testfn]();
    }
  }else{
    var testcmd = [];
    for(var cmd in tester)
      testcmd.push(cmd);

    console.log('roledb.js '+ testcmd.join('|'));
  }
}

