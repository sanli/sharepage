/**
 * sfcommonsdb.js
 */
// 部门列表
exports.deptTypes = 
[{ name : "网络部", code : "WL"}, 
{ name : "工程部", code : "GC"}, 
{ name : "运维部", code : "YW"}, 
{ name : "设计院", code : "SJ"},
{ name : "单位", code : "DW"}];

var conf = require('../config.js');
function _getCitys(){
	var province = conf.province || '安徽',
		citys = cityMap[province];
	if( !citys )
		console.error('配置错误，设置的省(conf.province)没有定义:' + province);
	return citys;
}
var cityMap = {
	"安徽" : [{"city":"省级","code":"AH"},
		{"city":"安庆","code":"AQ"},
		{"city":"蚌埠","code":"BEB"},
		{"city":"亳州","code":"BOZ"},
		{"city":"池州","code":"CIZ"},
		{"city":"滁州","code":"CUZ"},
		{"city":"阜阳","code":"FUY"},
		{"city":"合肥","code":"HF"},
		{"city":"淮北","code":"HUB"},
		{"city":"淮南","code":"HUN"},
		{"city":"黄山","code":"HUS"},
		{"city":"六安","code":"LUA"},
		{"city":"马鞍山","code":"MAS"},
		{"city":"宿州","code":"SUZ"},
		{"city":"铜陵","code":"TOL"},
		{"city":"芜湖","code":"WUH"},
		{"city":"宣城","code":"XUC"}],
	"江西" : [{"city":"省级","code":"JX"},
		{ "city":"南昌", "code":"NC" },
		{ "city":"上饶", "code":"SR" },
		{ "city":"九江", "code":"JJ" },
		{ "city":"萍乡", "code":"PX" },
		{ "city":"新余", "code":"XY" },
		{ "city":"鹰潭", "code":"YT" },
		{ "city":"赣州", "code":"GZ" },
		{ "city":"宜春", "code":"YC" },
		{ "city":"景德镇", "code":"JDZ" },
		{ "city":"吉安", "code":"JA" },
		{ "city":"抚州", "code":"FZ" }],
	"新疆" : [{"city":"省级","code":"XJ"},
		{ "city":"乌鲁木齐", "code":"WLMQ" },
		{ "city":"克拉玛依", "code":"KLMY" },
		{ "city":"吐鲁番地区", "code":"TLF" },
		{ "city":"哈密地区", "code":"HM" },
		{ "city":"昌吉回族自治州", "code":"CJ" },
		{ "city":"博尔塔拉蒙古自治州", "code":"BETLM" },
		{ "city":"巴音郭楞蒙古自治州", "code":"BYGL" },
		{ "city":"阿克苏地区", "code":"AKS" },
		{ "city":"克孜勒苏柯尔克孜自治州", "code":"KZLSAEKZ" },
		{ "city":"喀什地区", "code":"KS" },
		{ "city":"和田地区", "code":"HT" },
		{ "city":"伊犁哈萨克自治州", "code":"YLHSK" },
		{ "city":"阿勒泰地区", "code":"ATL" },
		{ "city":"石河子", "code":"SHZ" },
		{ "city":"阿拉尔", "code":"ALE" },
		{ "city":"图木舒克", "code":"TMSK" },
		{ "city":"五家渠", "code":"WJQ" },
		{ "city":"塔城地区", "code":"TC" }]









}
// 城市列表
exports.citys = _getCitys();

exports.workflowStates = [
	{ name : '未结束', value : 'Ne(流程结束)'},
	{ name : '已结束', value : '流程结束'},
	{ name : '导入数据', value : '导入数据'},
	{ name : '修改数据', value : '修改数据'},
	{ name : '地市工程人员审核', value : '地市工程人员审核'},
	{ name : '地市网优人员审核', value : '地市网优人员审核'},
	{ name : '省公司网优人员审核', value : '省公司网优人员审核'},
	{ name : '流程结束', value : '流程结束'}
]