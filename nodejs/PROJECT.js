/**
 * Module dependencies.
 */
"use strict";
var express = require('express')
  , extend = require('node.extend')
  , http = require('http')
  , path = require('path')
  , Data = require('./mongo.js')
  , share = require('./sharepage.js')
  , logger = require('./logger.js')
  , inspect = require('util').inspect
  , conf = require('./config.js')
  , mongo = require('./mongo.js');

var app = express();
app.set('x-powered-by', false)
app.set('port', process.env.PORT || conf.port );
app.engine('.html', require('ejs').__express);
app.set('views', [__dirname + '/views']);
app.use(express.static(path.join(__dirname, 'public'), { maxAge : 31536000000 }));
//app.use(require('serve-favicon')(__dirname + '/public/favicon.ico'));
// 在正式产品环境中使用的时候可以打开日志，获取更多的访问信息
//app.use(require('morgan')('combined'));
app.use(require('compression')());

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true })) ;
app.use(bodyParser.json());

app.use(require('connect-multiparty')());

app.use(require('method-override')());
app.use(require('cookie-parser')('cag-h5-bala-bala'));

var session = require('express-session'),
    MongoStore = require('connect-mongo')(session);
// 每次访问URL都会导致一次session查询，每次修改session内容都会导致写入数据库
// 所以修改session内容需要谨慎考虑性能，请参考以下URL进行配置:
// https://www.npmjs.com/package/connect-mongo
app.use(session({ 
  secret: 'china-art-for-chinese-people', 
  saveUninitialized: true,
  resave: false,  // 避免重复的写入session
  cookie: { 
    maxAge: 31536000000 // cookie存活一年
  }, 
  store: new MongoStore({ 
    //instance: mongo.mongoose, 
    mongooseConnection: mongo.mongoose.connection,
    collection: 'sessions', 
    stringify : false,
    autoRemove: 'native',  // session失效时间和cookie一样长
    touchAfter: 24 * 3600, // 每隔1天才会自动刷新一次session到数据库
  }) 
}));

//处理未解决异常，开发阶段注释掉这一部分代码可以在抛出错误后立刻Crash，方便发现问题
//var errorhandler = require('errorhandler');
//app.configure('development', function(){
//  app.use(require('errorhandler')({log: errorNotification}));
//});
// function errorNotification(err, str, req) {
//   var title = '发生没有处理的错误: ' + req.method + ' ' + req.url
// }

// 注册全局服务
var upload = require('./routes/upload.js'),
    commons = require('./routes/commons.js');
share.bindurl(app, '/upload', { outType : 'page'}, upload.upload);
share.bindurl(app, '/upload/preview', { outType : 'page'}, upload.preview);
share.bindurl(app, '/download', { outType : 'page'}, commons.download);
require('./routes/index.js').bindurl(app);

// 注册系统基础管理模块
app.use(express.static(path.join(__dirname, 'sys/public')));
var x = app.get('views');
x.push( __dirname + '/sys/view');
app.set('views', x);
require('./sys/modulectl.js').bindurl(app);
require('./sys/userctl').bindurl(app);
require('./sys/rolectl').bindurl(app);
require('./sys/enumctl').bindurl(app);

// 系统通用服务注册
require('./sys/enumctl').bindurl(app);




var server = http.createServer(app).listen(app.get('port'), function(){
  // 如果使用log，放开下面的行
	require('./sys/enumctl.js').sock.install(server, '/enum/ws');
  console.log("启动web服务，在以下端口监听：" + app.get('port'));
});