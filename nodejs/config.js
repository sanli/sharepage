//config.js

/**
 * 开发状态配置文件
 */
var debug_config = {
	port : 4000,
	// 当前系统运行级别 debug / release
	target : 'debug',
	// 数据库连接
	mongoURL : "mongodb://localhost/PROJECT",
	// 使用mongodb session，不在需要skipSignin
	skipSignin : false,
	// 如果配置了redirect，将会把所有的访问重定向到新服务
	//redirect : "http://ltfc.net"
	express_log : 'dev'
};

/**
 * 发布状态配置文件
 */
var release_config = {
	port : 4000,
	// 当前系统运行级别 debug / release
	target : 'release',
	// 数据库连接
	mongoURL : "mongodb://localhost/PROJECT",
	// 是否跳过登录检测
	skipSignin : false ,
	// 如果配置了redirect，将会把所有的访问重定向到新服务
	// express_log
	express_log : 'default'
}
module.exports = debug_config;
// module.exports = release_config;
