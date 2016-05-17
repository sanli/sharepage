var cronJob = require('cron').CronJob
,conf = require('../config.js');


//每天凌晨一点启动计算任务
new cronJob('0 0 1 * * *', function(){
        console.log('开始需求满足报表计算...');
        // var analysis_requirementdb = require('./analysis_requirementdb.js');
        // var analysis_requirement_sfdb = require('./analysis_requirement_sfdb.js');
        var analysis_requirementdb = require(conf.requirementdb);
        var analysis_requirement_sfdb = require(conf.requirementsfdb);

        analysis_requirementdb.checkAllRequirement(function(err){
            if(err) return console.log('[%s] - 刷新需求满足状态出错：', Date());

            console.log('[%s] - 刷新需求满足状态完成', Date())
            analysis_requirementdb.requirementAggregateReport(function(err){
                if(err) return console.log('[%s] - 更新需求满足报表出错：', Date());
                console.log('[%s] - 更新需求满足报表完成', Date());
            });
        });
        analysis_requirement_sfdb.checkAllRequirement(function(err){
            if(err) return console.log('[%s] - 刷新室分需求满足状态出错：', Date());

            console.log('[%s] - 刷新室分需求满足状态完成', Date())
            analysis_requirement_sfdb.requirementSfAggregateReport(function(err){
                if(err) return console.log('[%s] - 更新室分需求满足报表出错：', Date());

                console.log('[%s] - 更新室分需求满足报表完成', Date());
            });
        });
        /*wfsite_design_hz.checkDesignPlanDistance(function(err) {
            if(err) return console.log('[%s] - 刷新宏站规划与设计经纬差出错：', Date());
            console.log('[%s] - 刷新室分需求满足状态完成', Date());
        });*/
    }, function(){
        console.log('日常计算任务结束');
    }, true);
if(!conf.isDev) {
    console.log('非开发环境启用宏站室分规划设计经纬差计算...');
    new cronJob('0 * * * *', function(){
        console.log('宏站室分规划设计经纬差计算开始...');
        
        var wfsite_design_hz = require('./wfsite_design_hzdb.js');
        var wfslave_design = require('./wfslave_designdb.js');
        wfsite_design_hz.checkDesignPlanDistance(function(err) {
            if(err) return console.log('[%s] - 宏站规划设计经纬差计算出错：', Date());
            console.log('[%s] - 宏站规划设计经纬差计算完成', Date());
        });

        wfslave_design.checkDesignPlanDistance(function(err) {
            if(err) return console.log('[%s] - 室分规划设计经纬差计算出错：', Date());
            console.log('[%s] - 室分规划设计经纬差计算完成', Date());
        });
    }, function(){
        console.log('宏站室分规划设计经纬差计算结束...');
    }, true);
}
else {
    console.log('开发环境不启用宏站室分规划设计经纬差计算...');
}




function daily_export_hz(){
    var zongzi_commons = require('../modules/jx_wfsite_design_hz/zongzi_commons.js');
    zongzi_commons.run_daily_export(function(err){
        if(err) console.log('执行宏站综资导出任务失败', err);
        else console.log('执行宏站综资导出任务完成');
    });
}

function daily_export_sf(){
    var zongzi_commons = require('../modules/jx_zongzi_sf/zongzi_commons_sf.js');
    zongzi_commons.run_daily_export(function(err){
        if(err) console.log('执行室分综资导出任务失败', err);
        else console.log('执行室分综资导出任务完成');
    });
}

function _export_log(msg){
    return function export_log(){
        console.log(msg);
    }    
}

//安徽综资反馈定时任务，每日两点
function daily_import_zongzi_feedback_ah(){
    var zongzi_commons = require('../modules/jx_wfsite_design_hz/zongzi_commons.js');
    zongzi_commons.daily_import_zongzi_feedback_ah(function(err){
        if(err) console.log('执行宏站综资导出任务失败', err);
        else console.log('执行宏站综资导出任务完成');
    });
}
// 每天凌晨1:00启动综资导出任务
new cronJob('00 00 01 * * *', daily_export_hz, _export_log('执行宏站综资导出'), true);
// 每天10:30启动综资导出任务
new cronJob('00 30 10 * * *', daily_export_hz, _export_log('执行宏站综资导出'), true);
// 每天凌晨15:30启动综资导出任务
new cronJob('00 30 15 * * *', daily_export_hz, _export_log('执行宏站综资导出'), true);
// 每天19:30启动综资导出任务
new cronJob('00 30 19 * * *', daily_export_hz, _export_log('执行宏站综资导出'), true);

// 每天凌晨1:00启动综资导出任务
new cronJob('00 00 01 * * *', daily_export_sf, _export_log('执行室分综资导出'), true);
// 每天10:30启动综资导出任务
new cronJob('00 30 10 * * *', daily_export_sf, _export_log('执行室分综资导出'), true);
// 每天凌晨15:30启动综资导出任务
new cronJob('00 30 15 * * *', daily_export_sf, _export_log('执行室分综资导出'), true);
// 每天19:30启动综资导出任务
new cronJob('00 30 19 * * *', daily_export_sf, _export_log('执行室分综资导出'), true);
//每天凌晨2:00执行安徽综资反馈导入任务
new cronJob('00 00 02 * * *', daily_import_zongzi_feedback_ah, _export_log('执行宏站综资导出'), true);

function daily_import_hz(){
    var zongzi_commons = require('../modules/jx_wfsite_design_hz/zongzi_commons.js');
    zongzi_commons.daily_import_zongzi_feedback(function(err){
        if(err) console.log('执行综资反馈信息导入任务失败', err);
        else console.log('执行综资反馈信息导入任务完成');
    });
}

function daily_import_sf(){
    var zongzi_commons = require('../modules/jx_zongzi_sf/zongzi_commons_sf.js');
    zongzi_commons.daily_import_zongzi_feedback(function(err){
        if(err) console.log('执行综资反馈信息导入任务失败', err);
        else console.log('执行综资反馈信息导入任务完成');
    });
}

// 每天凌晨5:00启动综资导入任务
new cronJob('00 00 05 * * *', daily_import_hz, _export_log('执行宏站综资反馈信息导入'), true);
// 每天凌晨11:15启动综资导入任务
new cronJob('00 15 11 * * *', daily_import_hz, _export_log('执行宏站综资反馈信息导入'), true);
// 每天凌晨16:15启动综资导入任务
new cronJob('00 15 16 * * *', daily_import_hz, _export_log('执行宏站综资反馈信息导入'), true);
// 每天凌晨16:15启动综资导入任务
new cronJob('00 15 20 * * *', daily_import_hz, _export_log('执行宏站综资反馈信息导入'), true);

// 每天凌晨5:00启动综资导入任务
new cronJob('00 00 05 * * *', daily_import_sf, _export_log('执行室分综资反馈信息导入'), true);
// 每天凌晨11:15启动综资导入任务
new cronJob('00 15 11 * * *', daily_import_sf, _export_log('执行室分综资反馈信息导入'), true);
// 每天凌晨16:15启动综资导入任务
new cronJob('00 15 16 * * *', daily_import_sf, _export_log('执行室分综资反馈信息导入'), true);
// 每天凌晨16:15启动综资导入任务
new cronJob('00 15 20 * * *', daily_import_sf, _export_log('执行室分综资反馈信息导入'), true);

console.log("设置定时任务完成");