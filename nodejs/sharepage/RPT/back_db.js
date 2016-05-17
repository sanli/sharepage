//#!本文件由share.js自动产生于<M%=new Date() %M>, 产生命令行为: node share.js gen <M%=module_name %M> CRUD ..
<M%
/*
  module_name : 模块名称，例如：“sysmodule”，“sysrole"
  module_desc : 模块简单描述，例如：“系统模块”，"系统权限"
*/ 
%M>
/**
 * <M%=module_name %M>数据库访问类
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

// === 基本数据结构定义，按照实际需求修改 ===

// TODO: 下面为Demo数据结构，请改成模块实际数据结构
var <M%=module_name %M> = new Schema({
    // ID字段在每个对象中会自动创建，除非需要自己创建_id,否者不要放开
    /* _id : Schema.Types.ObjectId, */
    // ---- 基本信息 ----
    // 名称
    moduleName : String,
    // 基本描述
    desc : String,
    // 模块相关文件
    files : [String],
    // 是否系统模块
    isSysModule : Boolean,
    // 模块是否启用
    isActive: Boolean,
    // 最后修改时间
    updateTime : Date
},  { collection: '<M%=module_name %M>' });

// 创建索引 
// TODO: 根据实际结构确定索引结构
<M%=module_name %M>.index({_id : 1})
    .index({moduleName : 1});
var <M%=module_name %M> = mongoose.model('<M%=module_name %M>', <M%=module_name %M> ),
    _Module = <M%=module_name %M> ;
exports.<M%=module_name %M>  = <M%=module_name %M>;


// 以下字段不用在列表查询的时候返回
// TODO:  需要修改为实际数据结构对应的字段
var defaultProjection = { updateTime : 0 };


// === 基本功能实现函数,一般不用修改 ===
// 创建对象
exports.create = function(data, fn){
  //判断模块名是否重复
  // TODO: 唯一性判断逻辑需要修改为实际业务需要
  _Module.find({ moduleName: data.moduleName}
    , function(err, items){
      if(err)
        return fn(err);

      if(items.length > 0)
        return fn(new Error('与现有<M%=module_desc %M>名称重复，不能创建'));

      var module = new _Module(data);
      _Module.create(module, function(err, newModule){
        if(err) console.log("新建<M%=module_name %M>出错 :" + err);
        fn(err, newModule);
      });
    });
};

// 更新对象
exports.update = function(_id, data, fn){
  //检查是否与现有重复
  // TODO: 唯一性判断逻辑需要修改为实际业务需要
  _Module.find({ moduleName: data.moduleName } 
    ,function(err, items){
      if(share.isConflict(items, _id))
        return fn(new Error('与现有<M%=module_name %M>名称重复，不能修改.'));

      _Module.findByIdAndUpdate(_id, {$set: data}, {new : false}, fn);
    });
};

//删除对象
exports.delete = function(_id, fn) {
    _Module.remove({ _id : _id } , fn);
}

// 查询数据，支持排序和分页
exports.list = function(cond, sort, page, fn){
    // 使用Aggregate查询数据
  _Module.find(cond, defaultProjection)
    .sort(sort)
    .skip(page.skip)
    .limit(page.limit)
    .exec(function(err, docs){
      if(err) console.trace("查询<M%=module_name %M>错误:", err);

      fn(err, docs);
    });
}

// 普通查询 TODO: 可能无用，可以移除
exports.query = function(cond, sort, fn){
    _Module.find(cond)
    .sort(sort)
    .exec(function(err, docs){
      if(err) console.trace("查询<M%=module_name %M>错误:", err);

      fn(err, docs);
    });
}

//返回某个查询的返回值数量，主要用于分页
exports.count = function(cond, fn){
  _Module.find(cond)
    .count(function(err, count){
      if(err) console.trace("统计<M%=module_name %M>数据量错误::", err);

      fn(err, count);
    });
}

//按照ID查询对象
exports.findById = function(_id, fn){
  _Module.findById(_id, function(err, doc){
    fn(err, doc ? doc.toObject() : {});
  });
}

// 按照条件查询返回一个第一个找到的对象
exports.findByCond = function(cond, fn){
  _Module.findOne(cond, function(err, doc){
    fn(err, doc ? doc.toObject() : null);
  });  
}

// =============================
// 通过CSV导入数据，需要导入数据的模块要修改一下的实现
// =============================
var imp = require('../data/imp.js');
function _createDataImporter( filename, Module, fields, args ){
    var self = imp.Importer( filename, Module, args );
    
    // 根据类型创建定义，从CSV文件的一行中创建对象
    self.createObjByType = function(record, line){
        var result = extend({}, args);
        record.forEach(function(field, index){
            var fieldname = fields[index];
            field = field.trim();
            if(fieldname === "地市"){
                result['city'] = field;  // 归属城市统一使用city代替
            }else{
              result[fieldname] = field;
            }
        });

        return result ;
    };

    // 替换或者是合并到新的基站数据中
    self.updateObject = function(obj, callback){
        // TODO: 修改主键和更新方法
        var select = { EnodeBID: obj.EnodeBID , city: obj.city },
            update = { $set : obj };
            // 导入数据到导入历史记录中
        Module.update( select, update , {upsert : true}, callback);
    };
    return self;
};

var cvsfield = ['EnodeBID', '地市', '区县'],
    cvsfield_validrule = ['EnodeBID*', '地市', '区县'];
exports.importCSV = function(filename, fn, updater, opts) {
    var args = opts;
    if(!fs.existsSync(filename)){
        return fn(new Error('数据文件:' + filename + ' 不存在'));
    }
    
    // 创建验证工具或者是导入工具
    var impfn = opts.verify 
      ? imp.createDataValidator(filename, cvsfield_validrule, extend({}, args, {
            //TODO : 修改模块名称
            module : '需求管理', table : '重点规划站点'
        }), function(data){ 
          return data['EnodeBID'];
        }) 
      : _createDataImporter(filename, _Module, cvsfield, args);
      
    imp.import(function(err, count, cellIds){
        if(err) {
            console.trace("导入<M%=module_name %M>出错", err);
            return fn(err)
        };

        return fn(err, count, cellIds);
    }, updater);
};
exports.cvsfield = cvsfield;


exports.createExporter = function(){
    //TODO : 修改导出字段名称
    var columns = ['唯一编号(sid)', '项目编号', '地市', '区县', '乡镇行政村名称', 'BBU规划编号', '勘察BBU机房名称'
      , '勘察BBU经度', '勘察BBU纬度', '站点类型', '规划物理站址编号', '勘察物理站址编号', '勘察物理站址名称'
      , '勘察原有网络', '勘察站址建设方式', '勘察主设备建设方式', '网络类型', '频段', '覆盖场景', '覆盖区域'
      , '交通场景', 'RRU站点名称', 'RRU经度', 'RRU纬度', 'RRU铁塔类型', 'RRU铁塔塔基距地面垂直高度'
      , 'RRU铁塔塔身高度', 'RRU天线挂高', 'RRU天线类型', 'RRU方位角', 'RRU归属小区名称', '天线拟安装平台'
      , '无线阻挡说明', '备注_勘察阶段'],
      datafields = ['sid', 'projectId', 'city', '区县', '乡镇行政村名称', 'BBU规划编号', '勘察BBU机房名称', '勘察BBU经度', '勘察BBU纬度'
      , '物理站址.站点类型', '物理站址.规划物理站址编号', '物理站址.勘察物理站址编号', '物理站址.勘察物理站址名称'
      , '物理站址.勘察原有网络', '物理站址.勘察站址建设方式', '物理站址.勘察主设备建设方式', '物理站址.网络类型', '物理站址.频段'
      , '物理站址.覆盖场景', '物理站址.覆盖区域', '物理站址.交通场景'
      , '物理站址_rru.RRU站点名称', '物理站址_rru.RRU经度', '物理站址_rru.RRU纬度', '物理站址_rru.RRU铁塔类型'
      , '物理站址_rru.RRU铁塔塔基距地面垂直高度', '物理站址_rru.RRU铁塔塔身高度', '物理站址_rru.RRU天线挂高', '物理站址_rru.RRU天线类型'
      , '物理站址_rru.RRU方位角', '物理站址_rru.RRU归属小区名称', '物理站址_rru.天线拟安装平台', '物理站址_rru.无线阻挡说明'
      , '备注_勘察阶段'];
    return {
        head : function(){
            return columns.join(',') + '\n';
        },
        data : function(data){
            var out = datafields.map(function(field){
                return share.getnest(data, field);
            });
            return '"' + out.join('","') + '"\n' ;
        }
    }
}
// =============== 扩展的代码请加在这一行下面，方便以后升级模板的时候合并 ===================



// ============================= 下面是单元测试用的代码 ================================
var isme = require('../sharepage.js').isme;
var tester = {
  testImportCSV: function(){
    exports.importCSV ("../uploads/td_tmpl.csv", 'td', function(err, cnt){
      if(err) return console.log("import err", err);
      console.log("import success, count:" + cnt );
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

    console.log('<M%=module_name %M>db.js '+ testcmd.join('|'));
  }
}

