// commons.js
"use strict";

var share = require('../sharepage'),
    commonsdb = require('../data/commonsdb.js'),
    inspect = require('util').inspect,
    us = require('underscore');

var PAGE = {
	seqname : { name: 'seqname', key: 'seqname', optional: false},
    //导出文件名
    file : {name: 'file', key: 'file', optional: false},
    //下载后的文件名
    fname : {name: 'fname', key: 'fname', optional: false}
}

function idstr(seq, length){
	var r = seq.toString();
    while (r.length < length) {
        r = "0" + r;
    }
    return r;
}

//下载导出后的文件
exports.download = function(req, res){
    var file = req.param('file');
    var fname = req.param('fname');
    if(!file || !fname)
        return share.rt(false, '参数错误', res);

    //var filename = encodeURI(fname);
    res.download('temp/' + file, fname, function(err){
        if(err) 
            console.trace("download file err file:%s, fname:%s, err:%s" , file, fname, err.message);
        else
            console.log('download file:%s with name:%s', file, fname);
    });
}

// 返回地市列表
exports.cityDept = function(req, res){
    res.json(commonsdb.citys);
}


// ============================================
// 下面是一些静态的控件代码
// ============================================
// 创建地市选择器
//  name : 输出控件的ID
//  opt : 渲染参数， 
//    { allowEmpty : false }
exports.citySelector = function(name, opt){
    opt = opt || { allowEmpty : false, multiSelector : false, required : false };
    if(opt.multiSelector){
        var selector =  '<select multiple style="height: 200px;" name=' 
            + name + ' class="form-control" ' + opt.required ? 'required' :'' + '>';
    }else{
        var selector =  '<select name="' + name + '" class="form-control" ' + (opt.required ? 'required' : '') + '>';
    }
    
    selector += ( opt.allowEmpty ?  "<option value=\"\">不选择</option>" : "");
    commonsdb.citys.forEach(function(city){
        selector += "<option value=" + city.city + ">" + city.city + "</option>\n";
    });
    return selector += "</select>"
};

// 基础数据枚举类型选择器
var enumdb = require('../sys/enumdb.js');
exports.enumSelector = function(name, enumname, opt){
    opt = opt || { allowEmpty : false , required : false , disabled : false };

    var key = enumname,
        enums = enumdb.getEnum(enumname);

    if(!enums) return '<span>程序错误：类型无效{' + key + '}</>';

    var selector =  "<select name=" + name + " class=\"form-control\" " 
        + (opt.required ? " required ": "") + (opt.disabled ? " disabled ": "") 
        + (opt.style ? 'style="' + opt.style + '"' : "" ) + " >";

    selector += ( opt.allowEmpty ?  "<option>不选择</option>" : "");
    enums.forEach(function(type){
        selector += "<option value=" + type.value + ">" + type.name + "</option>\n";
    });
    return selector += "</select>"   
}


// 根据角色判断用户是否具有执行某个功能的权利
// 有返回true，没有返回false
var sysroledb = require('../sys/roledb.js');
exports.hasRight = function(module, right, roleName){
    var role = sysroledb.getRole(roleName);
    //console.log("role:" + inspect(role));
    if(!role) return false;

    return role.checkRight(module, right);
}

// 判断是否系统管理员
exports.isAdmin = function(user){
    return share.isAdmin(user);
}

// 导入功能公用代码
// 创建一个远程调用的实现代码，支持验证和导入两个功能
var dnode = require('dnode'),
    extend = require('node.extend'),
    upload = require('./upload');
exports.createImpDnode = function(_moduledb, title){
    var d = dnode({
        //导入数据
        import : function(file, opt, updater, cb){
            var file = upload.settings.uploadpath + '/' + file ,
                args = extend({}, opt);
            console.log("开始导入%s数据:%s", title, file);
            _moduledb.importCSV(file, function(err, cnt){
                if(err){
                    console.log(err);
                    cb("导入文件出错:" + err, { count: cnt });
                }else{
                    cb(null, { count: cnt });    
                }
                // 导入完成，由客户端关闭连接
                // d.end();
            }, function(record, index){
                updater(record[0], index);
            }, args);
        },

        // 验证数据是否正确
        // args {
        //     siteType : opt.siteType,
        //     projectId : opt.projectId,
        //     creator : opt.userName,
        //     verify : true
        // }
        validate : function(file, opt, updater, cb){
            var file = upload.settings.uploadpath + '/' + file ,
            args = extend({ verify : true }, opt);
            
            console.log("开始验证%s数据:%s", title, file);
            _moduledb.importCSV(file, function(err, cnt){
                if(err){
                    cb("导入文件出错:" + err.message);
                }else{
                    cb(null, { count: cnt });
                } 
                // 导入完成，由客户端关闭连接
                //d.end();
            }, function(passed, reason, record, index){
                updater(passed, reason, record, index);
            }, args);
        }
    }).on('error', function(err){
        d.end(err);
        console.log("denode error, arguments:", arguments);
    }).on('end', function(){
        console.log("denode end, arguments:", arguments);
    });
    return d;
}


// 日期格式化工具
exports.dateFormat = require('dateformat');
exports.formatdate = function(date){
    return exports.dateFormat(date, "yyyy-mm-dd");
}
exports.formattime = function(date){
    return exports.dateFormat(date, "yyyy-mm-dd h:MM:ss");
}

// 返回所有的模块列表
var moduledb = require('../sys/moduledb.js');
exports.getModuleListJSON = function(){
    return JSON.stringify(moduledb.getAllModule().map( mod => {
        return { label : mod.module_name , value : mod.module_id } ;
      }));
}
exports.getModuleTreeJSON = function(){
    return JSON.stringify(moduledb.getModuleTree());
}

// 返回字典项
var enumdb = require('../sys/enumdb.js');
exports.getEnumListJSON = function(enum_name){
    var items = enumdb.getEnum(enum_name);
    if(items) 
        return JSON.stringify(
            items.map(item => ({ label : item.name , value : item.value }))
        );
    else
        return '[]';
}
exports.getDictListJSON = exports.getEnumListJSON;

var roledb = require('../sys/roledb.js');
exports.getRoleListJSON = function(){
    var roles = roledb.getRoles().map(role => 
        ({ label : role.role_name, value : role.role_name })
    );
    return JSON.stringify(roles);
}


var ACTIONS = [
    { action_id : '1', action_name : '查询'},
    { action_id : '2', action_name : '添加'},
    { action_id : '3', action_name : '删除'},
    { action_id : '4', action_name : '修改'},
    { action_id : '5', action_name : '导入'},
    { action_id : '6', action_name : '导出'},
    { action_id : '7', action_name : '审核'},
];
function _action_id(action_name){
    var action = us.find(ACTIONS, action => action.action_name === action_name);
    return action && action.action_id;
}
// 判断用户是否拥有某个模块的特定权限
exports.hasright = function(user, modulename, action_name) {
    var aid = _action_id(action_name);
    return user.privilege && user.privilege[modulename] 
        && us.contains(user.privilege[modulename], aid);
}

// 返回所有的模块树
exports.getModuleTree = function(){
    return moduledb.getModuleTree();
}

exports.calcage = function(year){
    return new Date().getFullYear() - year;
}

