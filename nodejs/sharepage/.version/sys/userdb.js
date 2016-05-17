//#!本文件由share.js自动产生, 命令行为: node share.js gen user CRUD ..
'use strict';
/**
 * user数据库访问类
 */
var inspect = require('util').inspect
  , ObjectID = require('mongodb').ObjectID
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Data = require('../mongo.js')
  , Helper = require('../mongo.js').Helper
  , extend = require('node.extend')
  , csv = require('csv') 
  , share = require('../sharepage.js');

// 模块相关的全局属性
const module_name = 'user', module_desc = '用户管理';
// === 基本数据结构定义，按照实际需求修改 ===

// TODO: 下面为Demo数据结构，请改成模块实际数据结构
var user = new Schema({
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

    // ------------------ 通用数据 ----------------
    // 最后修改时间
    ctime : Date,
    // 最后修改时间
    utime : Date,
},  { collection: 'user' });

// 创建索引，以及设置唯一键
// TODO: 根据实际结构确定索引结构
user.index({_id : 1})
    .index({module_name : 1}, { unique : true })
    .index({module_id : 1}, { unique : true });
var user = mongoose.model('user', user ),
    _Module = user ;
exports.user  = user;


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
      fn(err, newModule);
    });
};

// 更新对象
exports.update = function(_id, data, fn){
    data.utime = new Date();
    _Module.findByIdAndUpdate(_id, {$set: data}, {new : false}, fn);
};

//删除对象
exports.delete = function(_id, fn) {
    _Module.remove({ _id : _id } , fn);
}

// 查询数据，支持排序和分页
exports.list = function(cond, sort, page, fn){
    // 使用Aggregate查询数据
  _Module.find(cond, defaultProjection)
    .sort(sort)
    .skip(page.skip)
    .limit(page.limit)
    .exec(function(err, docs){
      if(err) fn(err);

      fn(err, docs);
    });
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



// ============================= 下面是单元测试用的代码 ================================
var isme = require('../../sharepage.js').isme;
var tester = {
  testfn: function(){
    //TODO : 执行测试代码
  }
}

if(isme(__filename)){
  if(process.argv.length > 2 && isme(__filename)){
    testfn = process.argv[2];
    console.log("run test:%s", testfn);

    if(tester[testfn]){
      tester[testfn]();
    }
  }else{
    var testcmd = [];
    for(cmd in tester)
      testcmd.push(cmd);

    console.log('userdb.js '+ testcmd.join('|'));
  }
}

