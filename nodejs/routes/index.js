
'use strict';
var share = require('../sharepage.js')
    , express = require('express')
    , path = require('path')
    , sf = require('../config.js')
    , commons = require('./commons.js')
    , inspect = require('util').inspect
    , ObjectID = require('mongodb').ObjectID;


// 注册URL
exports.bindurl=function(app){
    share.bindurl(app, '/', { outType : 'page'}, exports.index);
    share.bindurl(app, '/main.html', { outType : 'page'}, exports.main);
	share.bindurl(app, '/index.html', { outType : 'page'}, exports.index);
	share.bindurl(app, '/signin.html', { needAuth : false, outType : 'page'}, exports.signin);
}

/*
 * GET home page.
 */
exports.index = function(req, res){
	res.redirect('/main.html');
};

/*
 * GET home page.
 */
exports.main = function(req, res){
    res.render('mainpage.html', {
        conf : require('../config.js'),
        user: req.session.user,
        commons : commons,
        opt : {
            title : "铁塔规划设计工具"
        }
    });
};


/*
 * GET home page.
 */
exports.signin = function(req, res){
	res.render('signin.html', {
		conf : require('../config.js'),
	    user: req.session.user,
	    commons : commons,
	    opt : {
            title : "sharepage-project"
        }
	});
};

