//#!本文件由share.js自动产生于Fri Sep 19 2014 17:09:24 GMT+0800 (CST), 产生命令行为: node share.js gen sysuser CRUD ..
'use strict';

/**
 * sysuser数据库访问类
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
var sys_user = new Schema({
    // ID字段在每个对象中会自动创建，除非需要自己创建_id,否者不要放开
    /* _id : Schema.Types.ObjectId, */
    // ---- 基本信息 ----
    // 登录用户名
    login_name : String,
    // 实际用户名
    real_name : String,
    // 所拥有的角色
    role : String,
    // 密码
    password : String,
    // 所属部门，只能属于一个部门
    org : String,
    // 是否启用
    active : Boolean,
    // 最后登录时间
    lastlogin_time : Date,
    // 总共登录次数
    login_times : Number,
    // ==== 其他扩展信息信息 ====    
    city : String,

    // ==== 一些其他附加信息 ====
    // 创建时间
    ctime : Date,
    // 最后修改时间
    utime : Date,
},  { collection: 'sys_user' });
// 创建索引 
// TODO: 根据实际结构确定索引结构
sys_user.index({_id : 1})
    .index({login_name : 1}, { unique : true })
    .index({org : 1})
    .index({role : 1});
var _Module = mongoose.model('sys_user ', sys_user );
exports.sysuser = _Module;

// 以下字段不用在列表查询的时候返回
// TODO:  需要修改为实际数据结构对应的字段
var defaultProjection = { utime : 0 , ctime : 0 };


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
    _Module.remove({ _id : { $in : _id } } , fn);
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
    .count(fn);
}

//按照ID查询对象
exports.findById = function(_id, fn){
  _Module.findById(_id, function(err, doc){
    fn(err, doc ? doc.toObject() : {});
  });
}
// =============== 扩展的代码请加在这一行下面，方便以后升级模板的时候合并 ===================
exports.findOne = function(username, fn){
  _Module.findOne({userName : username}, function( err, user ){
        if(err)
            return fn(err);

        if(user === null)
            return fn(new Error('用户不存在'));

        fn(null, user);
  });
};

/**
 * 验证用户登录信息，如果用户登录有效，返回用户对象
 * 如果无效，返回错误
 * @param fn  fn(err, user)
 */
 var roledb = require('./roledb.js');
exports.authorize = function(username, pass, fn){
  _Module.findOne({ login_name : username }, function( err, user ){
        if(err)
            return fn(err);

        if(user === null)
            return fn(new Error('用户不存在'));

        if(user.password != pass)
            return fn(new Error('密码错误'));

        if(!user.active)
            return fn(new Error('用户帐户被锁定'));  

        
        _Module.update({ _id : user._id}, 
            {   
                $set : { lastlogin_time : new Date() },  
                $inc : { login_times : 1 }
            },function(err){ 
                if(err) console.trace(err); 
            });
        var obj = user.toObject();
        obj.privilege = roledb.getRolePrivilege(user.role);
        fn(null, obj);
  });
};

/**
 * 修改用户密码
 */
exports.updatePass = function(username, pass, fn){
  _Module.update( { userName : username } , { $set : { password : pass } }, fn);
};

// ============================= 下面是单元测试用的代码 ================================
var isme = require('../sharepage.js').isme;
var tester = {
  testImportCSV: function(){
    exports.importCSV ("../uploads/td_tmpl.csv", 'td', function(err, cnt){
      if(err) return console.log("import err", err);
      console.log("import success, count:" + cnt );
    });
  },

  testGetUserByCity : function(){
    exports.getAllUsers(function(err, user){
      //console.log(user);
      exports._getCityUser(function(err, citymap){
        console.log(citymap);
      });
    });
  },

  testGetUserByCitys : function(){
    exports._getCityUsers(function(err, citymap){
        console.log(citymap);
    });
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

    console.log('sysuserdb.js '+ testcmd.join('|'));
  }
}

