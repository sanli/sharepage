
/*
 * GET home page.
 */
exports.index = function(req, res){
	res.redirect('/signin.html');
};

//TODO: remove soon
exports.main = function(req, res){
	res.render('mainpage.html', {
		conf : require('../config.js'),
	    user: req.session.user,
	    title: "首页",
	    page : 'main',
	    commons : require('./sfcommonsctl.js')
	});
};

// 返回对话框内容
var share = require('../sharepage');
var PAGE = {
    // dlg file
    dlgfile : {name: 'dlgfile', key: 'dlgfile', optional: false}
}
exports.dlg = function(req, res){
    var arg = share.getParam("输出对话框:", req, res, [PAGE.dlgfile]);
    if(!arg.passed)
       return;

    res.render(arg.dlgfile, {
        user : req.session.user,
        commons : require('./sfcommonsctl.js')
    });
};

//TODO: remove soon
exports.ongoing = function(req, res){
	res.render('ongoing.html', {
		conf : require('../config.js'),
	    user: req.session.user,
	    title: "正在建设中的页面",
	    page : 'main',
	    commons : require('./sfcommonsctl.js')
	});
};