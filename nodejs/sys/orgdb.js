//#!本文件由share.js自动产生于Fri Sep 19 2014 17:10:46 GMT+0800 (CST), 产生命令行为: node share.js gen sysorg CRUD ..

/**
 * sysorg数据库访问类
 */
var inspect = require('util').inspect
  , ObjectID = require('mongodb').ObjectID
  , mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Data = require('../mongo.js')
  , share = require('../sharepage')
  , Helper = require('../mongo.js').Helper
  , extend = require('node.extend')
  , csv = require('csv') ;

// === 基本数据结构定义，按照实际需求修改 ===
/**
 * 部门类型：
 * 网络部  ： WL
 * 工程部  ： GC
 * 运维部  ： YW
 * 设计院  ： SJ
 */
var sys_sysorg = new Schema({
    // ID字段在每个对象中会自动创建，除非需要自己创建_id,否者不要放开
    /* _id : Schema.Types.ObjectId, */
    // ---- 基本信息 ----
    // 部门全称，包含上级部门，这是一个部门在系统中的唯一标识，不能重复
    // orgFullName ＝ 上级部门名称 + 部门名称
    orgFullName : String,
    // 上级部门名称
    parentFullName : String,
    // 部门名称，创建后不能修改
    orgName : String,
    // 部门编码
    code : String,
    // 基本描述
    desc : String,
    // 所属地市
    city : String,
    // 部门类型
    deptType : String,
    // 最后修改时间
    updateTime : Date
},  { collection: 'sys_sysorg' });

// 创建索引
sys_sysorg.index({_id : 1})
    .index({orgFullName : 1})
    .index({orgName : 1})
    .index({code : 1});
var sysorg = mongoose.model('sys_sysorg ', sys_sysorg ),
    _Module = sysorg ;
exports.sysorg  = sysorg;

// 以下字段不用在列表查询的时候返回
// TODO:  需要修改为实际数据结构对应的字段
var defaultProjection = { updateTime : 0 };


// === 基本功能实现函数,一般不用修改 ===
// 创建对象
exports.create = function(data, fn){
  //判断模块名是否重复
  // TODO: 唯一性判断逻辑需要修改为实际业务需要
  _Module.find({ orgFullName: data.orgFullName}
    , function(err, items){
      if(err)
        return fn(err);

      if(items.length > 0)
        return fn(new Error('与现有组织结构名称重复，不能创建'));

      var module = new _Module(data);
      _Module.create(module, function(err, newModule){
        if(err) console.log("新建sysorg出错 :" + err);

        invalide();
        fn(err, newModule);
      });
    });
};

// 更新对象
exports.update = function(_id, data, fn){
  //检查是否与现有重复
  // TODO: 唯一性判断逻辑需要修改为实际业务需要
  _Module.find({ orgFullName: data.orgFullName } 
    ,function(err, items){
      if(items.length > 0){
        items.forEach(function(building){
          if(building._id.toString() !== _id){
            return fn(new Error('与现有sysorg名称重复，不能修改'));            
          }
        });
      }

      invalide();
      _Module.findByIdAndUpdate(_id, {$set: data}, {new : false}, fn);
    });
};

//删除对象
exports.delete = function(_id, fn) {
    invalide();
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
      if(err) console.trace("查询sysorg错误:", err);

      fn(err, docs);
    });
}

// 普通查询 TODO: 可能无用，可以移除
exports.query = function(cond, sort, fn){
    _Module.find(cond)
    .sort(sort)
    .exec(function(err, docs){
      if(err) console.trace("查询sysorg错误:", err);

      fn(err, docs);
    });
}

//返回某个查询的返回值数量，主要用于分页
exports.count = function(cond, fn){
  _Module.find(cond)
    .count(function(err, count){
      if(err) console.trace("统计sysorg数据量错误::", err);

      fn(err, count);
    });
}

//按照ID查询对象
exports.findById = function(_id, fn){
  _Module.findById(_id, function(err, doc){
    fn(err, doc ? doc.toObject() : {});
  });
}

/**
 * 通过CSV导入数据
 */
exports.importCSV = function(filename, fn) {
    if(!fs.existsSync(filename)){
        return fn(new Error('数据文件:' + filename + ' 不存在'));
    }

    var createObjByType = function(fields, record){
      var result = {};
      record.forEach(function(field, index){
        var fieldname = fields[index];
        result[fieldname] = field;
      })
      return result ;
    };
    
    var importcsvfile = function(Module, fields, filename, fn){
        csv()
        .from(filename)
        .transform(function(record, index, callback){
            if(index === 0)
                return callback();

            var obj = createObjByType(fields, record);
            _Module.update( {cellid: obj.cellid} 
                , {$set : obj}
                , { upsert: true }
                , function(err){
                  callback();
                });
        }, {parallel: 1})
        .on("end", function (count) {
            console.log("importcsvfile success sysorg filename:" + filename);
            fn(null, count - 1);
        })
        .on('error',function(error){
            console.log("importcsvfile error:" + error.message);
            fn(error);
        });
    };
    importcsvfile(Module, fields, filename, fn);
};
// =============== 扩展的代码请加在这一行下面，方便以后升级模板的时候合并 ===================
// 返回所有用户角色，用于内部的角色查询和显示，会进行缓存，修改module是需要清楚Cache
var cachedGetAll = share._CreateCachedGetAllFn('sysorgdb.orgs', "getAllOrg", _Module, {}, { orgFullName : 1 }),
    invalide = cachedGetAll.invalide;
exports.getAllOrg = cachedGetAll.list;
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
      Data(function(){ 
        console.log("连接已建立");
        tester[testfn]();
      });   
    }
  }else{
    var testcmd = [];
    for(cmd in tester)
      testcmd.push(cmd);

    console.log('sysorgdb.js '+ testcmd.join('|'));
  }
}

