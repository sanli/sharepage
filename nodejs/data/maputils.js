//maputils.js
var inspect = require('util').inspect,
	http = require('http'),
	isme = require('../sharepage.js').isme,
	async = require('async'),
	us = require('underscore');


// 从对象中提取loc对
function extractloc(data, opt){
	var opt = opt || { lngname : '经度', latname : '纬度'};

	var lng = parseFloat(data[opt.lngname]),
		lat = parseFloat(data[opt.latname]);
	if( isNaN(lng) || isNaN(lat) ){
		console.log('[WARN]无效的经纬度', inspect(data));
		return null;	
	} 
	return {
        "type" : "Point",
        "coordinates" : [ lng , lat ]
    };
}
exports.extractloc = extractloc;

// 自动转换对象中的'经度'，'纬度'字段为loc字段
function updateloc(data, opt){
	var opt = opt || { lngname : '经度', latname : '纬度'},
		lngname = opt.lngname,
		latname = opt.latname;
	// 更新字段中的loc字段
	if(data[lngname] && data[latname]){
        data.loc = maputils.extractloc(data.siteDataSnap);
    }

	// 更新siteDataSnap中涉及到的位置字段
    if(data.siteDataSnap && data.siteDataSnap[lngname] && data.siteDataSnap[latname]){
        data.siteDataSnap.loc = maputils.extractloc(data.siteDataSnap);
    }
}
exports.updateloc = updateloc;


// 预处理带有地理位置的字段，处理逻辑包括：
//   1. 如果data或者是data.siteDataSnap中包含loc , bdloc字段，则把coordinates的元素
//      转换为float，以插入数据库，建立索引
//
//   2. 如果字段只包含loc字段,没有包含bcloc字段，需要调用转换函数
function processLocField(data){
	if(!data) return;

	// 遍历整个对象，转换所有发现的loc和bdloc对象
	us.each(data, function(value, key){
		if(key === 'loc' || key === 'bdloc'){
			if(value.coordinates){
				value.coordinates = formulateCoordinate(value.coordinates);
			}
		}

		if( typeof value ==='object'){

			processLocField(value);
		}
			
			
	});
	return data;
}
exports.processLocField = processLocField;

function _checkNeedConvert(datalist, needConvertObjs){
	us.each(datalist, function(value, key){
		if (value !== null && value !== undefined)
		{
			if(value['loc'] && !value['bdloc']){
			    needConvertObjs.push(value);
			}
			if( typeof value ==='object' )
				_checkNeedConvert(value, needConvertObjs);
	    }
	});
}

function convertLocField(data, fn){
	if(!data) return fn(null, data);

	// 遍历整个对象，找到所有需要做转换的对象
	// 如果对象有loc属性，没有bdloc属性，就是需要转的
	var needConvertObjs = [];

	_checkNeedConvert([data], needConvertObjs);

	// 开始转换
	if(needConvertObjs.length === 0) return fn(null, data);
	async.each(needConvertObjs, function(needConvertObj, callback){
		var coord = needConvertObj.loc.coordinates;
		pointGPS2Baidu(coord[0], coord[1],function(err, bdloc){
			if(err){ 
				console.log('经纬度转换出错：%s' , err);
				return fn(err, data);
			}

			console.log("转换百度地址 %s -> %s", coord, bdloc);
			needConvertObj.bdloc = { type: 'Point', coordinates : bdloc};
			callback(null);
		});
	},function(err){
		fn(err, data);
	});
}
exports.convertLocField = convertLocField;


// 按照路径递归访问一个对象的嵌套属性
// 回调函数格式为: 
//     function(obj, parent, fieldname)
function accessValueByPath(data, path, fn){
	if(path.length === 0) return null;
	var obj = data, parent = null, fieldname = null;
	path.forEach(function(field){
		fieldname = field;
		parent = obj;
		obj = obj && obj[field];
	});
	fn(obj, parent, fieldname);
}

// 按照路径指定的地址转换所有的loc字段为bdloc字段
// paths格式如下 : ['loc', 'siteDataSnap.loc']
// TODO : 由于转换的loc有些是相同的地址，需要做一个loccache，避免重复转换地址
function convertLocFieldByPath(data, paths, fn){
	async.eachSeries(paths, function(path, callback){
		var fieldpath = path.split('.');
		accessValueByPath(data, fieldpath, function(obj, parent, fieldname){
			if(!obj) return callback();

			var coord = obj.coordinates;
			pointGPS2Baidu(coord[0], coord[1],function(err, bdloc){
				if(err){ 
					console.log('WARN: 经纬度转换出错：%s' , err);
					return callback();	
				} 

				parent.bdloc = { type: 'Point', coordinates : bdloc};
				callback();
			});
		});
	},function(err){
		fn(err, data);
	});
}
exports.convertLocFieldByPath = convertLocFieldByPath;	
/**
 * gps经纬度转换为百度经纬度
 */
function pointGPS2Baidu(lng, lat, fn){
	var url = 'http://api.map.baidu.com/ag/coord/convert?from=0&to=4&x='+ lng +'&y='+ lat;
	console.log(url);
	http.get(url, function(res){
		res.on('data', function (chunk) {
			try{
				var resobjs = JSON.parse(chunk),
		        	resobj = resobjs;	
			}catch(err){
				return fn(err);
			}
	        
	        if(Array.isArray(resobjs)){
	        	resobj = resobjs[0];
	        }	

	        if(resobj.error === 0){
	          var lngbuf = new Buffer(resobj.x, 'base64'),
	          	lngtmp = parseFloat(lngbuf.toString()),
	          	latbuf = new Buffer(resobj.y,'base64'),
	          	lattmp = parseFloat(latbuf.toString());
	          console.log("x:%s , y:%s", lngbuf.toString(), latbuf.toString());
	          var result = [  lngtmp ,  lattmp ];

	          fn(null, result);
	        }else{
	          fn(new Error('调用百度地址转换出错， result:' + chunk));
	        }
	    });
	    if(res.statusCode != 200)
	        console.log("Got err response: " + res.statusCode);
	}).on('error', function(e) {
      console.trace("baidu2gps转换坐标错误:" + e.message);
      fn(e);
  	});
}
exports.pointGPS2Baidu = pointGPS2Baidu;

/**
 * 百度地址转换成GPS地址
 * 方法:  
 *  1. lng, lat
 *  2. http://api.map.baidu.com/ag/coord/convert?from=2&to=4&mode=1&x=116.3786889372559&y=39.90762965106183 -- > lng1, lat1
 *  3. result = [ 2 * lng - lng1,  2 * lat - lat1 ]
 */
function pointBaidu2GPS(lng, lat, fn){
	var url = 'http://api.map.baidu.com/ag/coord/convert?from=0&to=4&mode=1&x='+ lng +'&y='+ lat;
	http.get(url, function(res){
		res.on('data', function (chunk) {
			try{
				var resobjs = JSON.parse(chunk),
		        	resobj = resobjs;	
			}catch(err){
				return fn(err);
			}
	        
	        if(Array.isArray(resobjs)){
	        	resobj = resobjs[0];
	        }	

	        if(resobj.error === 0){
	          var lngbuf = new Buffer(resobj.x, 'base64'),
	          	lngtmp = parseFloat(lngbuf.toString()),
	          	latbuf = new Buffer(resobj.y,'base64'),
	          	lattmp = parseFloat(latbuf.toString());
	          var result = [  2 * lng - lngtmp ,  2 * lat - lattmp ];

	          fn(null, result);
	        }else{
	          fn(new Error('调用百度地址转换出错， result:' + chunk));
	        }
	    });
	    if(res.statusCode != 200)
	        console.log("Got err response: " + res.statusCode);
	}).on('error', function(e) {
      console.trace("baidu2gps转换坐标错误:" + e.message);
      fn(e);
  	});
}
exports.pointBaidu2GPS = pointBaidu2GPS;


/**
 * 百度地址表示的loc对象装换为GPS地图表示的对象
 */
function baidu2gps(loc, fn){
	var result = { type : loc.type },
		coord = loc.coordinates;
	if(loc.type === 'Point'){
		pointBaidu2GPS(coord[0], coord[1], function(err, gpscoord){
			if(err){
				console.log("Baidu->GPS地址装换错误:%s err:%s", loc.toString(), err.message);
				result.coordinates = ['转换错误','转换错误'];
			}else{
				result.coordinates = gpscoord;
			}
				
			fn(err, result);
		});
	}else if(loc.type === "Polygon"){
		//多边形每一个元素是一条线，每一条线是一个点的数组
		var gpscoords = [];
		coord.forEach(function(line, idx){
			var gpsline = [];
			line.forEach(function(point, pidx){
				pointBaidu2GPS(point[0], point[1], function(err, gpscoord){
					if(err){
						console.log("Baidu->GPS地址装换错误:%s err:%s", loc.toString(), err.message);
						gpsline.push(['转换错误','转换错误']);
					}else{
						gpsline.push(gpscoord);
					}
					
					if(gpsline.length === line.length){
						gpscoords.push(gpsline);
						if(gpscoords.length === coord.length){
							// 转换完成，退出处理
							result.coordinates = gpscoords;
							fn(err, result);
						}
					}
				});
			});
		});
	}
}
exports.baidu2gps = baidu2gps;

//TODO : 需要移动到各自对应的dbobj文件中
// var dbs = [ 
// 	{ module : require('./sfsiteplandb.js').sfsiteplan },
// 	{ module : require('./sfsite_design_hzdb.js').sfsite_design_hz },
// 	{ module : require('./site_wydatadb').site_wydata },
// 	{ module : require('./wfsiteplandb.js').wfsiteplan, target : 'siteDataSnap' },
// 	{ module : require('./wfsite_design_hzdb.js').wfsite_design_hz, target : 'siteDataSnap' },
// 	{ module : require('./wfsite_investigation_hzdb.js').wfsite_investigation_hz, target : 'siteDataSnap' },
// 	{ module : require('../modules/jx_wfsite_plan_hz/jx_wfsite_plan_hzdb.js').jx_wfsite_plan_hz, target : 'siteDataSnap' }
// ];
// function autoConvertSites(){
// 	dbs.forEach(function(dbacc){
// 		// 查找所有没有转换loc的记录
// 		var db = dbacc.module;
// 		console.log("转换数据集:[%s] 地址", db);
// 		if(!dbacc.target){
// 			db.find({ 
// 				loc : { $exists : true }, 
// 				bdloc : { $exists : false}
// 			}, function(err, needConvertSites){
// 				//转换经纬度，失败的记录不做任何处理
// 				if(err) return console.log("查询未转换任务失败", e);
// 				if(needConvertSites.length === 0) return ;

// 				async.eachSeries(needConvertSites, function(site, callback){
// 					if(!site.loc) return callback();

// 					var coord = site.loc.coordinates;
// 					pointGPS2Baidu(coord[0], coord[1], function(err, bdloc){
// 						if(err){
// 							console.log('转换出错：%s' , err);
// 							return callback();	
// 						} 

// 						site.bdloc = { type: 'Point', coordinates : bdloc};
// 						site.save(function(err){
// 							if(!err)
// 								console.log('转换完成, _id:' + site._id);
// 							callback(err);
// 						});
// 					});
// 				}, function(err){
// 					if(err)
// 						console.log("转换数据集:[%s]出错:[%s]", db, err);
// 					else
// 						console.log("转换数据集:[%s]完成", db);
// 				});
// 			});	
// 		}else{
// 			db.find({ 
// 				'siteDataSnap.loc' : { $exists : true }, 
// 				'siteDataSnap.bdloc' : { $exists : false}
// 			}, function(err, needConvertSites){
// 				//转换经纬度，失败的记录不做任何处理
// 				if(err) return console.log("查询未转换任务失败", e);
// 				if(needConvertSites.length === 0) return ;

// 				console.log(needConvertSites);

// 				async.eachSeries(needConvertSites, function(site, callback){
// 					if(!site.siteDataSnap.loc) return callback();

// 					var coord = site.siteDataSnap.loc.coordinates;
// 					pointGPS2Baidu(coord[0], coord[1], function(err, bdloc){
// 						if(err){
// 							console.log('转换出错：%s' , err);
// 							return callback();	
// 						}

// 						db.update({_id: site._id}
// 								, {$set : {'siteDataSnap.bdloc' : { type: 'Point', coordinates : bdloc} }}
// 								, function(err){
// 										if(err) console.trace(err);

// 										console.log('转换完成, _id:' + site._id);
// 										callback(err);
// 								});
// 					});
// 				}, function(err){
// 					if(err)
// 						console.log("转换数据集:[%s]出错:[%s]", db, err);
// 					else
// 						console.log("转换数据集:[%s]完成", db);
// 				});
// 			});	
// 		}
// 	});
// };

function refreshConvertSites(){
	var module = require('./wfsiteplandb.js').wfsiteplan

	module.find({},function(err, sites){
		if(err) console.trace(err);

		async.eachSeries(sites, function(site, callback){
			var loc = extractloc(site.siteDataSnap);
			console.log(inspect(site.siteDataSnap));

			module.update({_id : site._id}
				,{ $set : { 'siteDataSnap.loc' : loc} }
				,function(err){
					if(err) {
						console.trace(err);
						return callback(err);
					}

					console.log("转换完成："+ site._id);
					callback(err);
				});
		}, function(err){
			if(err) return console.trace(err);
			console.log('全部处理完成');
		})
	});
}

function formulateCoordinate(locs){
	if(Array.isArray(locs[0])){
		return locs.map(function(loc){
			//return [parseFloat(loc[0]), parseFloat(loc[1])]
			return formulateCoordinate(loc);
		});
	}else{
		var loc = locs;
		return [parseFloat(loc[0]), parseFloat(loc[1])];
	}
}
exports.formulateCoordinate = formulateCoordinate;

// ========================= 下面是单元测试用的代码 ====================
var tester = {
	testPointBaidu2GPS: function(){
		var results = []
			start = new Date().getTime();
		for(i =0 ; i<= 99 ; i++){
			pointBaidu2GPS(116.3786889372559, 39.90762965106183, function(err, result){
				if(err) console.log("err:" + err.message);

				console.log(result);
				results.push(result);
				if(results.length === 100 ){
					console.log("total using:" +  ( new Date().getTime() - start ) );
					console.log("total using:" +  ( new Date().getTime() - start ) / 100 );
				}
			})	
		};
	},

	baidu2gps : function(argument) {
		baidu2gps({ 
			"type" : "Point", "coordinates" : [ 115.11701, 27.98331 ] 
		}, function(err, result) {
			if(err) console.log("err:" + err.message);

			console.log(result);
		})
	},

	testPointGPS2Baidu : function(){
		pointGPS2Baidu( 115.11461, 27.97666 , function(err, out){
			if(err) return console.trace(err);

			console.log("baidu:%s", inspect(out));
		});
	},

	testAutoConvert : function(){
		autoConvertSites();
	},

	testRefreshConvertSites : function(){
		refreshConvertSites();
	},

	// 刷新一张表中的所有地址
	doRefreshSiteBDloc : function(){

	},

	testConvertLocFieldByPath : function(){
		var loc =  { "type": "Point", "coordinates": [ 118.96671, 30.61506] } ;
		convertLocFieldByPath({ 
				loc : loc , 
				物理站址 : { loc : loc } ,
				物理站址_设计 : { rru : { loc : loc } }
			}, ['loc', '物理站址.loc', "物理站址_设计.rru.loc"]
			, function(err, data){
				if(err) console.trace(err);

				console.log(data);
			})
	},

	testProcessLocField : function(){
		var data = {
		"勘察BBU纬度": "26.87874",
		"勘察BBU经度": "114.02951",
		"loc":{"type":"Point","coordinates":['114.02951','26.87874']},
		"bdloc":{"type":"Point","coordinates":[114.000001,26.000001]},
		"物理站址_勘察": [{
		    "物理站址纬度": "26.87874",
		    "物理站址经度": "114.02951",
		    "loc":{"type":"Point","coordinates":[114.02951,26.87874]},
		    "bdloc":{"type":"Point","coordinates":[114.000001,26.000001]},
		     "rru": [
		      {
		        "RRU纬度": "26.87874",
		        "RRU经度": "114.02951",
		        "loc":{"type":"Point","coordinates":[114.02951,26.87874]},
		        "bdloc":{"type":"Point","coordinates":[114.000001,26.000001]}
		      },
		      {
		        "RRU纬度": "26.87874",
		        "RRU经度": "114.02951",
		        "loc":{"type":"Point","coordinates":['114.02951','26.87874']},
		        "bdloc":{"type":"Point","coordinates":['114.000001','26.000001']}
		      }
		    ]}
		]};
		console.log('转换之前:');
		console.log(data);
		processLocField(data);
		console.log('转换之后:');
		console.log(JSON.stringify(data));
	}
}

// ======================== tester =========================
if(isme(__filename)){
	if(process.argv.length > 2 ){
	    testfn = process.argv[2];
		console.log("run test:%s", testfn);

		tester[testfn]();
	}else{
		var testcmd = [];
		for(cmd in tester)
			testcmd.push(cmd);

		console.log('mongo.js '+ testcmd.join('|'));
	}
}
