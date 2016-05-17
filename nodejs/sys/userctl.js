//#!本文件由share.js自动产生于Fri Sep 19 2014 17:09:24 GMT+0800 (CST), 产生命令行为: node share.js gen sysuser CRUD ..
/**
 * sysuserHTTP入口模块, 需要在主文件中添加map
 * var sysuser = require('./routes/sysuser').bindurl(app);
 */
 'use strict';
var sysuserdb = require('./userdb.js')
    // base function
    , share = require('../sharepage')
    , express = require('express')
    , sf = require('../config.js')
    , path = require('path')
    , commons = require('../routes/commons.js')
    , inspect = require('util').inspect
    , ObjectID = require('mongodb').ObjectID
    , commons = require('../routes/commons.js');

// 模块相关的全局属性
const module_name = 'module', module_desc = '模块管理';

//LIST用到的参数
var PAGE = {
    // 列表页条件,包括页的开始记录数skip，和页面长度limit 
    page : {name:'page', key:'page', optional: true, default: { skip: 0, limit: 50 }},
    // 查询条件
    cond : {name: 'cond', key: 'cond', optional: true, default: {} },
    // 排序条件
    sort : {name: 'sort', key: 'sort', optional: true, default: { _id :1 } },
    // 类型
    type : {name: 'type', key: 'type', optional: false},
}
//导入文件用到的参数
var IMP = {
    file : {name: 'file', key: 'file', optional: false},
}
//CRUD参数
var CRUD = {
    data : {name: 'data', key: 'data', optional: false},
    _id : {name:'_id', key:'_id', optional: false},
    username : {name: 'username', key: 'username', optional: false},
    password : {name: 'password', key: 'password', optional: false},
    newpassword : {name: 'newpassword', key: 'newpassword', optional: false},
}


// 注册URL
exports.bindurl=function(app){
    app.use(express.static(path.join(__dirname, 'public')));
    share.bindurl(app, '/sys/user.html', { outType : 'page'}, exports.page);
    share.bindurl(app, '/sys/user/create', exports.create);
    share.bindurl(app, '/sys/user/update', exports.update);
    share.bindurl(app, '/sys/user/list', exports.list);
    share.bindurl(app, '/sys/user/get', exports.get);
    share.bindurl(app, '/sys/user/delete', exports.delete);
    share.bindurl(app, '/sys/user/count', exports.count);
    share.bindurl(app, '/user/get', exports.get);
    // 登录系统
    share.bindurl(app, '/signin', { needAuth : false }, exports.signin);
    share.bindurl(app, '/getloginuser', exports.getloginuser);
    share.bindurl(app, '/updatepass', exports.updatepass);
    share.bindurl(app, '/signout', exports.signout);
}


// GUI页面
exports.page = function(req, res){
    res.render('userpage.html', {
        conf : require('../config.js'),
        user : req.session.user,
        commons : commons,
        opt : {
            title : module_desc
        }
    });
};

// 更新对象
exports.create = function(req, res){
    var arg = share.getParam(`创建新${module_desc}对象:`, req, res, [CRUD.data]);
    if(!arg.passed)
       return;

    sysuserdb.create(arg.data, function(err, newDoc){
        if(err) return share.rt(false, `创建新${module_desc}对象:` + err.message, res);

        share.rt(true, { _id: newDoc._id }, res);
    });
}

// 更新对象
exports.update = function(req, res){
    var arg = share.getParam(`更新${module_desc}对象`, req, res, [CRUD._id, CRUD.data]);
    if(!arg.passed) return;

    console.log(arg._id);

    var data = arg.data;
    delete data._id;
    sysuserdb.update( arg._id , data , function(err, cnt){
        if(err) {
            console.log(err);
            return share.rt(false, `更新${module_desc}对象` + err.message, res);
        }
        
        share.rt(true, { cnt : cnt }, res);
    });
}


// 查询对象，并返回列表
exports.list = function(req, res){
    var arg = share.getParam(`查询${module_desc}列表`, req, res, [PAGE.page, PAGE.cond, PAGE.sort]);
    if(!arg.passed)
        return;

    var page = {
        skip : parseInt(arg.page.skip),
        limit : parseInt(arg.page.limit),
    };

    share.searchCondExp(arg.cond);
    share.fillUserDataRule(arg.cond, req, _datafiler);
    sysuserdb.list(arg.cond, arg.sort, page, function(err, docs){
        if(err) return share.rt(false, err.message, res);
        
        share.rt(true, {docs: docs}, res);
    });
};

function _datafiler(cond, user){
}

// 查询结果集的返回数量
exports.count = function(req, res){
    var arg = share.getParam(`统计${module_desc}数量`, req, res, [PAGE.cond]);
    if(!arg.passed)
        return;

    share.searchCondExp(arg.cond);
    share.fillUserDataRule(arg.cond, req, _datafiler);
    sysuserdb.count(arg.cond, function(err, count){
        if(err) return share.rt(false, err.message, res);
        
        share.rt(true, {count: count}, res);
    });
}

// 查询对象详细信息
exports.get = function(req, res){
    var arg = share.getParam(`读取${module_desc}对象数据`, req, res, [CRUD._id]);
    if(!arg.passed) return;

    sysuserdb.findById(arg._id, function(err, doc){
        if(err) return share.rt(false, "查询出错:" + err.message, res);
        if(!doc) return share.rt(false, "找不到对象：" + _id);

        share.rt(true, { doc : doc }, res);
    });
}

// 删除对象
exports.delete = function(req, res){
    var arg = share.getParam("delete sysuser", req, res, [CRUD._id]);
    if(!arg.passed) return;

    sysuserdb.delete(arg._id , function(err, doc){
        if(err) return share.rt(false, "删除sysuser出错:" + err.message, res);
        
        share.rt(true, { doc : doc }, res);
    });
}

// === 扩展的代码请加在这一行下面，方便以后升级模板的时候合并 ===
exports.signout = function(req, res){
    req.session.destroy(function(){
        res.redirect("/");
    });
}

var sysuserdb = require('./userdb.js');
exports.signin = function(req, res){
    var arg = share.getParam("delete sysuser", req, res, [CRUD.username, CRUD.password]);
    if(!arg.passed) return;

    sysuserdb.authorize(arg.username, arg.password, function(err, user){
        if(err) return share.rt(false, "登录失败:" + err.message, res);

        console.log("用户登录成功，用户姓名：%s", user.userName);
        delete user['password'];
        req.session.user = user;
        share.rt(true, { msg : "登录成功" }, res);
    });
}
exports.getloginuser = function(req, res){
    var user = req.session.user;
    if(user){
        rt(true, { user: user }, res);
    }else{
        rt(false, "用户没有登录",res);
    }   
}

// 更新对象
exports.updatepass = function(req, res){
    var arg = share.getParam(`更新${module_desc}对象`, req, res, [ CRUD.password, CRUD.newpassword]);
    if(!arg.passed) return;

    var username = req.session.user.login_name;
    sysuserdb.authorize(username, arg.password, function(err, user){
        if(err) return share.rt(false, "密码不正确:" + err.message, res);
        
        sysuserdb.sysuser.update( { login_name : username } , { $set : { password : arg.newpassword }} , function(err, cnt){
            if(err) {
                console.log(err);
                return share.rt(false, `更新${module_desc}对象` + err.message, res);
            }
            
            share.rt(true, {}, res);
        });
    });
}

