// importcvs.js
var Collection = require('mongodb').Collection,
  Connection = require('mongodb').Connection,
  ObjectID = require('mongodb').ObjectID,
  debug = require('util').debug,
  inspect = require('util').inspect,
  Data = require('../mongo.js'),
  DBOP = require('../mongo.js').DBOP,
  csv = require('csv'),
  http = require('http'),
  isme = require('../sharepage.js').isme,
  extend = require('node.extend'),
  iconv = require('iconv-lite'),
  maputils = require('./maputils'),
  _us = require('underscore');

// ============ CellDataImporter ===============
// 记录导入事件
exports.recordImportAction = function(deptId, snaptime, obj, fn){
    celldb.ImportAction.update( { /* deptId: deptId, */ snaptime: snaptime, type: obj.type }
        , obj, {upsert : true}, fn);
}


/*
// 基础导入器对象，特定对象实现需要提供几个基本方法的实现
opt : {
    // 从CSV行中创建对象 
    createObjByType : function(record){
        var result = {};
        record.forEach(function(field, index){
            var fieldname = fields[index];
        })
        return result ;
    },

    // 把创建好的对象保存到数据库 
    updateObject : function( obj, callback){
        var cellobj = extend({}, obj);
        Module.update( { _id: id, deptId : deptId } 
            , { $set : obj } , { upsert: true }
            , callback);
    }
}
*/
function Importer(filename, args, opt){
    var self = extend({ encodeFrom : 'gbk' , encodeTo: 'utf8' }, opt),
        ids = [],
        args = args || {};

    if(filename){
        if(self.encodeFrom !== self.encodeTo){
          var input = fs.createReadStream(filename).pipe(iconv.decodeStream('gbk'));  
        }else{
          var input = fs.createReadStream(filename);
        }
    }
    
    self.import = function(fn, stateUpdater){
        input.on('error', function(err){
            console.trace(err);
            fn(err);
        });

        csv()
        .from(input)
        .transform(function(record, index, callback){
            if(index === 0){
                //跳过表头行
                return callback();
            }
            // 输出导入状态
            // if(stateUpdater){
            //   stateUpdater(record, index);
            // }

            var obj = self.createObjByType(record, index);
            extend(obj, args);
            self.updateObject(obj, function(err, objId){
                    if(err) console.log(err);
                    ids.push(objId);
                    callback(err);
                }, index, stateUpdater);
        }, {parallel: 1})
        .on("end", function (count) {
            console.log("importcsvfile success filename:[%s]", filename);
            fn(null, count - 1, ids);
        })
        .on('error',function(err){
            console.log("importcsvfile error:" + err.message);
            fn(err);
        });
    };
    return self;
}
exports.Importer = Importer ;

// 导入单行数据
function LineImporter(args, opt){
    var self = extend({}, opt),
        args = args || {};

    // 导入数据
    self.import = function(data, fn){
        /*input.on('error', function(err){
            console.trace(err);
            fn(err);
        });*/
        // 数据需要是有效的
        try{
            var dataobj = JSON.parse(data);   
        }catch(e){
            return fn(e);
        }

        var obj = self.createobj( dataobj );
        //extend(obj, args);
        // 导入数据
        self.updateObject(obj, function(err, objId){
                if(err) console.log(err);
                fn(err);
            });
    };
    return self;
}
exports.LineImporter = LineImporter ;

// 一个没有实现的导入器，当调用这个导入器的时候，会返回异常
exports.createFakeDataImporter = function(filename, Module, fields, args){
    var self = Importer( filename, null, args );
    
    // 根据类型创建定义，从CSV文件的一行中创建对象
    self.import = function(fn, stateUpdater){
        fn(new Error('没有实现的数据导入器'));
    };
    return self;
}

// ==========================================================================================
// 导入验证器
// ==========================================================================================
var enumdb = require('../sys/enumdb');
// 数据验证工具
// filename : 数据文件
// fields : 字段定义，字段名 ＋ '*', *表示必填项
function createDataValidator( filename, fields, args, formatfn){
    var self = Importer( filename, {}, null ),
        formatfn = formatfn || function(obj){ obj.toString() };

    // 必填验证，如果传入的值不为空,返回true,否则返回false,并把错误内容写入context
    function _requirment(value){
        if(value) return [ true ];
        return [ false, '字段值不能为空'];
    };

    function _number(value){
        if(!value) return [true];
        if (!isNaN(value)){
            return parseFloat(value) >= 0 ? [true] : [false, '需要是有效的数字:大于0.'];
        }else{
            return  [false, '需要是有效的数字'];
        }
        //return isNaN(value) ? [false, '需要是有效的数字'] :  [true];
    };

    function _numberall(value){
        if(!value) return [true];
        return isNaN(value) ? [false, '需要是有效的数字'] :  [true];
    };

    // 数据字典验证，导入的值必须是枚举类型中的值
    function _createEnumChecker(enums){
        var posibles = enums.join(',');
        return function(v){
            if(!v) return [true];
            return enums.indexOf(v) < 0 ? [false, '值[' + v + ']无效，可能值:' + posibles ] : [ true ]
        }
    };

    // 城市验证，传入的值需要等于设定的city
    // 如果设定的city为省级，任何导入值都返回true
    function _createCityChecker(city){
        return function(v){
            if(city === '省级') return [true];
            if(v !== city  ) return [ false, '值[' + v + ']错误，必须为:[' + city + ']' ];
            return [true];
        }
    }

    var valideRules = {},
        fieldnames = [];
    self.valideRules = valideRules;
    self.fieldnames = fieldnames;

    fields.forEach(function(field, i){
        var rules = [],
            // 如果字段以'*', '#', '^' 结尾，则应用相应的检查规则
            tagrule = /([\*^#]*)$/;

        var tags = field.match(tagrule)[0],
            field = field.replace(tagrule, '');
                    
        // 非空测试
        if(tags.indexOf('*') >= 0){
            rules.push(_requirment);
        }

        // 如果字段以#结尾，则为数字字段
        if(tags.indexOf('#') >= 0){
            rules.push(_number);
        }

        // 如果字段以^结尾，则为数字字段
        if(tags.indexOf('^') >= 0){
            rules.push(_number);
        }

        // 数据字典测试
        if(args.enumname_prefix){
            var enums = enumdb.getEnum(args.enumname_prefix + '.' + field);
            if(enums){
                rules.push(_createEnumChecker(enums.map( enum1 => enum1.value )));
            }
        }

        // 设置城市字段
        if( (field === 'city') && args.city){
            rules.push(_createCityChecker(args.city));
        }

        // 设置特殊字段检查
        if(args.checkRules && args.checkRules[field]){
            rules.push(args.checkRules[field]);
        }
        fieldnames.push(field);
        valideRules[field] = rules;
    });

    // 根据类型创建定义，从CSV文件的一行中创建对象
    self.createObjByType = function(record, line){
        var result = extend({});

        record.forEach(function(field, index){
            var fieldname = fieldnames[index];
            field = field.trim();
            if(fieldname === 'city' && /.*市$/.test(field)){
              field = field.replace(/市$/, '');
            }
            result[fieldname] = field;
        });
        return result;
    };

    // 执行对象验证
    self.updateObject = function(obj, callback, index, stateUpdater){
        var context = [],
            keys = _us.keys(obj);

        if(keys.length !== fieldnames.length){
            stateUpdater( false
                , '字段个数不匹配,期望:' + fieldnames.length + ' 实际:' + keys.length
                , formatfn(obj), index);
            return callback();
        }

        keys.forEach(function(key, i){
            if(valideRules[key]){
                for(var ri = 0 ; ri <= valideRules[key].length - 1; ri++){
                    var rulefn = valideRules[key][ri],
                        chkres = rulefn(obj[key], obj);
                    if(!chkres[0]){
                        context.push( '[' + key +']' + chkres[1]);
                        break;
                    }
                }
            };
        });
        stateUpdater( context.length === 0, context.join(','), formatfn(obj), index);
        return callback();
    };
    return self;
};
exports.createDataValidator = createDataValidator;

//单行数据的验证工具，引用批量导入验证工具的规则完成验证
exports.createLineDataValidator = function(fields, args, formatfn){
    var self = LineImporter(args),
        helper = createDataValidator('', fields, args, formatfn),
        valideRules = helper.valideRules,
        fieldnames = helper.fieldnames;

        debugger;
        self.createobj = function(dataobj){
            return helper.createObjByType(dataobj,0);    
        }

        self.updateObject = function(obj, fn){
            var context = [],
            keys = _us.keys(obj);
            if(keys.length !== fieldnames.length){
                context.push('1,字段个数不匹配,期望:' + fieldnames.length + ' 实际:' + keys.length);
                return fn(new Error(context.join(';')));
            }

            keys.forEach(function(key, i){
                var msg = [];
                if(valideRules[key]){
                    for(var ri = 0 ; ri <= valideRules[key].length - 1; ri++){
                        var rulefn = valideRules[key][ri],
                            chkres = rulefn(obj[key], obj);
                        if(!chkres[0]){
                            msg.push( '[' + key +']' + chkres[1]);
                            break;
                        }
                    }
                    if(msg.length > 0) context.push( (i + 1) + ',' + msg.join(' ').replace(',', ''));
                };
            });
            fn( context.length === 0 ? null : new Error(context.join(';')));
        };
    return self;
}

//单行数据的验证工具，引用批量导入验证工具的规则完成验证(江西)
exports.createLineDataValidator_JX = function(fields, args, formatfn){
    var self = LineImporter(args),
        helper = createDataValidator('', fields, args, formatfn),
        valideRules = helper.valideRules,
        fieldnames = helper.fieldnames;

        debugger;
        self.createobj = function(dataobj){
            return helper.createObjByType(dataobj,0);    
        }

        self.updateObject = function(obj, fn){
            var context = [],
            keys = _us.keys(obj);
            if(keys.length !== fieldnames.length){
                context.push('1,字段个数不匹配,期望:' + fieldnames.length + ' 实际:' + keys.length);
                return fn(new Error(context.join(';')));
            }

            keys.forEach(function(key, i){
                var msg = [];
                if(valideRules[key]){
                    for(var ri = 0 ; ri <= valideRules[key].length - 1; ri++){
                        var rulefn = valideRules[key][ri],
                            chkres = rulefn(obj[key], obj);
                        if(!chkres[0]){
                            msg.push( '[' + key +']' + chkres[1]);
                            break;
                        }
                    }
                    if(msg.length > 0) context.push( (i + 1) + ',' + msg.join(' ').replace(',', ''));
                };
            });
            fn( context.length === 0 ? null : new Error(context.join('ˇ')));
        };
    return self;
}


// ========================= 下面是单元测试用的代码 ====================
var tester = {
    testFn : function(){
        //TODO 
    },
    testValidator : function(){
        var validator = createDataValidator(
            '/Users/sanli/Desktop/sfguihua/hz-plan-test_gbk.csv'
            ,['规划站点名称*', '网络类型*', '归属地市*', '区县*', '建设方式*', '天面建设方式*', '经度*', '纬度*'
              , '覆盖区域*', '覆盖场景', '交通场景', '建设需求类型', '天线挂高', '频段', '载频数', '小区数'
              , '天面类型', '备注']
            , {}
            ,function(data){ return data['规划站点名称']});

            validator.import(function(err, count, cellIds){
                if(err) {
                    console.trace("导入/验证宏站规划数据发生错误", err);
                };
                console.log('验证完成');
            },function(){
                console.log(arguments);
            });
    }
}


if( isme(__filename) ){
    if( process.argv.length > 2 ){
        testfn = process.argv[2];
        console.log("run test:%s", testfn);
        console.log("连接已建立");
        tester[testfn]();    
    }else{
        var testcmd = [];
        for( cmd in tester )
            testcmd.push(cmd);

        console.log('mongo.js '+ testcmd.join('|'));
    }
}