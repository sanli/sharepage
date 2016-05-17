//#!本文件由share.js自动产生于<M%=new Date() %M>, 产生命令行为: node share.js gen <M%=module_name %M> CRUD ..
/**
 * <M%=module_name %M>HTTP入口模块, 需要在主文件中添加map
 * var <M%=module_name %M> = require('./routes/<M%=module_name %M>').bindurl(app);
 */
var <M%=module_name %M>db = require('../data/<M%=module_name %M>db.js')
    // base function
    , share = require('../sharepage')
    , express = require('express')
    , path = require('path')
    , conf = require('../config.js')
    , inspect = require('util').inspect
    , ObjectID = require('mongodb').ObjectID;

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
    // dlg file
    dlgfile : {name: 'dlgfile', key: 'dlgfile', optional: false}
}
//导入文件用到的参数
var IMP = {
    file : {name: 'file', key: 'file', optional: false},
}
//CRUD参数
var CRUD = {
    data : {name: 'data', key: 'data', optional: false},
    _id : {name:'_id', key:'_id', optional: false},
}


// 注册URL
exports.bindurl=function(app){
    //动态文件
    share.bindurl(app, '/<M%=module_name %M>.html', { outType : 'page'}, exports.page);
    share.bindurl(app, '/<M%=module_name %M>/create', exports.create);
    share.bindurl(app, '/<M%=module_name %M>/update', exports.update);
    share.bindurl(app, '/<M%=module_name %M>/list', exports.list);
    share.bindurl(app, '/<M%=module_name %M>/retrive', exports.retrive);
    share.bindurl(app, '/<M%=module_name %M>/retriveByCond', exports.retriveByCond);
    share.bindurl(app, '/<M%=module_name %M>/delete', exports.delete);
    share.bindurl(app, '/<M%=module_name %M>/count', exports.count);
    share.bindurl(app, '/<M%=module_name %M>/import', exports.import);
    share.bindurl(app, '/<M%=module_name %M>/templ', exports.templ);
    share.bindurl(app, '/<M%=module_name %M>/export', exports.export);
    share.bindurl(app, '/<M%=module_name %M>/dlg/:dlgfile', { outType : 'page'}, exports.dlg);
    //TODO: 扩展的API加在下面
    // ...
}


// GUI页面
exports.page = function(req, res){
    res.render('<M%=module_name %M>/<M%=module_name %M>page.html', {
        conf : conf,
        target : conf.target,
        stamp : conf.stamp,
        title: sf.getTitle("<M%=module_desc %M>"),
        user : req.session.user,
        commons : require('./cagcommonsctl.js')
    });
};

// 更新对象
exports.create = function(req, res){
    var arg = share.getParam("创建新<M%=module_name %M>对象:", req, res, [CRUD.data]);
    if(!arg.passed)
       return;

    <M%=module_name %M>db.create(arg.data, function(err, newDoc){
        if(err) return share.rt(false, "创建新<M%=module_name %M>对象出错:" + err.message, res);

        share.rt(true, { _id: newDoc._id }, res);
    });
}

// 更新对象
exports.update = function(req, res){
    var arg = share.getParam("更新<M%=module_name %M>对象", req, res, [CRUD._id, CRUD.data]);
    if(!arg.passed) return;

    console.log(arg._id);

    var data = arg.data;
    delete data._id;
    <M%=module_name %M>db.update( arg._id , data , function(err, cnt){
        if(err) {
            console.log(err);
            return share.rt(false, "更新<M%=module_name %M>出错:" + err.message, res);
        }
        
        share.rt(true, { cnt : cnt }, res);
    });
}


// 查询对象，并返回列表
exports.list = function(req, res){
    var arg = share.getParam("查询<M%=module_name %M>列表", req, res, [PAGE.page, PAGE.cond, PAGE.sort]);
    if(!arg.passed)
        return;

    var page = {
        skip : parseInt(arg.page.skip),
        limit : parseInt(arg.page.limit),
    };

    share.searchCondExp(arg.cond);
    console.log(arg.cond);
    
    share.fillUserDataRule(arg.cond, req);
    <M%=module_name %M>db.list(arg.cond, arg.sort, page, function(err, docs){
        if(err) return share.rt(false, err.message, res);
        
        share.rt(true, {docs: docs}, res);
    });
};

// 查询结果集的返回数量
exports.count = function(req, res){
    var arg = share.getParam("<M%=module_name %M> count", req, res, [PAGE.cond]);
    if(!arg.passed)
        return;

    share.searchCondExp(arg.cond);
    share.fillUserDataRule(arg.cond, req);
    <M%=module_name %M>db.count(arg.cond, function(err, count){
        if(err) return share.rt(false, err.message, res);
        
        share.rt(true, {count: count}, res);
    });
}

// 查询对象详细信息
exports.retrive = function(req, res){
    var arg = share.getParam("retrive <M%=module_name %M>", req, res, [CRUD._id]);
    if(!arg.passed) return;

    <M%=module_name %M>db.findById(arg._id, function(err, doc){
        if(err) return share.rt(false, "查询<M%=module_name %M>出错:" + err.message, res);
        if(!doc) return share.rt(false, "找不到对象：" + _id);

        share.rt(true, { doc : doc }, res);
    });
}

// 按照条件查询站点数据
exports.retriveByCond = function(req, res){ 
    var arg = share.getParam("retrive <M%=module_name %M>", req, res, [PAGE.cond]);
    if(!arg.passed) return;

    <M%=module_name %M>db.findByCond(arg.cond, function(err, doc){
        if(err) return share.rt(false, "查询<M%=module_name %M>出错:" + err.message, res);
        
        share.rt(true, { doc : doc }, res);
    });    
}

// 删除对象
exports.delete = function(req, res){
    var arg = share.getParam("delete <M%=module_name %M>", req, res, [CRUD._id]);
    if(!arg.passed) return;

    <M%=module_name %M>db.delete(arg._id , function(err, doc){
        if(err) return share.rt(false, "删除<M%=module_name %M>出错:" + err.message, res);
        
        share.rt(true, { doc : doc }, res);
    });
}

// 短链跳转，通过特定ID跳转到某个页面，大部分情况下不用实现
exports.jump = function(req, res){
    //TODO: 加入短链跳转
}

//确认导入CSV格式的数据
exports.import = function(req, res){
    var arg = share.getParam("import <M%=module_name %M> file", req, res, [IMP.file]);
    if(!arg.passed)
        return;
    var file = upload.settings.uploadpath + '/' + arg.file ,
        type = arg.type;

    <M%=module_name %M>db.importCSV(file, type, function(err, cnt){
        if(err) return share.rt(false, "导入<M%=module_name %M>文件出错:" + err.message, res);

        share.rt(true, { count: cnt }, res);
    })
};

exports.templ = function(req, res){
    var filename = encodeURI('<M%=module_desc %M>导入表模版.csv');
    res.attachment(filename);
    res.send(<M%=module_name %M>db.cvsfield.join(','));
    res.send(require('iconv-lite').encode( <M%=module_name %M>db.cvsfield.join(','), 'gbk' ));
}

exports.export = function(req, res){
    var arg = share.getParam("<M%=module_name %M> list", req, res, [PAGE.cond, PAGE.sort]);
    if(!arg.passed)
        return;

    share.searchCondExp(arg.cond);
    share.fillUserDataRule(arg.cond, req);
    <M%=module_name %M>db.query(arg.cond, arg.sort, function(err, docs){
        if(err) return rt(false, err.message, res);
        
        var filename = "<M%=module_name %M>_export_"  + new Date().getTime() + ".csv";
        var exporter = <M%=module_name %M>db.createExporter();
        share.exportToCSVFile(docs, filename, exporter, function(err){
            if(err)
                return share.rt(false, "导出文件错误:" + err , res);

            return share.rt(true, {file: filename, fname: "<M%=module_desc %M>数据_"
                    + new Date().toISOString().replace(/T.*Z/,'') +".csv"}, res);
        });
    });
};

// 返回对话框内容
exports.dlg = function(req, res){
    var arg = share.getParam("输出对话框:", req, res, [PAGE.dlgfile]);
    if(!arg.passed)
       return;

    res.render( '<M%=module_name %M>/' + arg.dlgfile, {
        user : req.session.user,
        commons : require('./cagcommonsctl.js')
    });
};


// === 扩展的代码请加在这一行下面，方便以后升级模板的时候合并 ===





