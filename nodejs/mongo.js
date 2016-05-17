/**
 *  MongoDB 访问
 */

var Db = require('mongodb').Db,
  Collection = require('mongodb').Collection,
  Connection = require('mongodb').Connection,  
  Server = require('mongodb').Server,
  ObjectID = require('mongodb').ObjectID,
  http = require('http'),
  debug = require('util').debug,
  inspect = require('util').inspect
  lazy = require('lazy'), 
  fs = require('fs'),
  http = require('http'),
  conf = require('./config.js');

//使用mongoose访问MongoDB
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
mongoose.connect(conf.mongoURL ,{
  db: { native_parser: true, safe:true },
  server : { 
    socketOptions : { keepAlive: 1 } 
  }
});
var mdb = mongoose.connection;
// 连接断开后重连
mdb.on('error', function(err){
  console.error('[ERROR]: mongoose db error:%s', err);
});
mdb.on('open', function callback (err) {
	console.log("mongoose连接DB成功...");
});
mdb.on('close', function(){
  console.log('connection closed, should will reconnect soon');
});
exports.mongoose = mongoose;
exports.connecting = mdb;





