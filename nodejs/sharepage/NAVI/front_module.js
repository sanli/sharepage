//#!本文件由share.js自动产生于<$=new Date() $>, 产生命令行为: node share.js gen <$=module_name $>
<$
/**
 * CRUD/IO功能前端JS模板，支持以下功能：列表展示，查询，导入数据，导出数据
 */
$>
// Page状态对象
var PG = new $P({
    default :{
        // 查询条件
        cond : {},
        // 翻页条件
        page : { skip: 0, limit: 20 },
        // 排序字段
        sort : { by : 'id', order : 1 },
        editing : false,
        searching : false
    },

    bind: function(){
        this.bindhash();
        $(PG).on('statechange', Module.onPageStateChange);
    }
});

var Module = $.extend(new $M(), {
    // =========================================================================
    //  PageStateChage是功能的入口,一般由某个界面事件触发出状态改变，再由状态的改变，
    //  触发某个页面载入动作或者是重新渲染
    // =========================================================================
    onPageStateChange : function (){
        var state = PG.state;
        
        // 初始化页面各个控件的状态
        Module.applyPageState(state);
        // 载入数据
        Module.loadPageData(state.cond, state.page);
    },

    applyPageState : function(state){
        // 初始化查询条件
        $('#search-form').clearall().autofill(state.cond, { queryexp : true });
        $('#detail-search-form').clearall().autofill(state.cond, { queryexp : true });
    },

    // 处理查询条件
    _processSearchCond : function(cond){
        // TODO: 处理需要特殊处理的查询条件
        
    },

    // 根据页面状态，载入数据
    loadPageData: function(stateCond, page){
        $('#cellDiv').spin();
        var editing = PG.state.editing,
            searching = PG.state.searching,
            sort = PG.state.sort 
            sortarg = {},
            cond = $.extend({},stateCond);
        sortarg[sort.by] = sort.order;
        Module._processSearchCond(cond);
        $.showSearchBlock($('#searchPanel'), searching, $('#searchBtnGroup'));
        
        // 加载数据表
        Module.listPage(cond, sortarg, page
            , function(module){
                var $resultTarget = $('#cellTable');
                Module._cache = {};
                $.each(module.docs, function(i, doc){
                    Module._cache[doc.id] = doc;
                });

                $M.fillResult($resultTarget, {
                    cells : module.docs,
                    tempId : 'cellTableTmpl',
                    sort: sort,
                });
                $('#cellDiv').spin(false);
                $.showControlBlock($('#cellDiv'), editing, $('#editingBtnGroup'));                
            });

        // 加载分页条
        Module.showPagebar(cond, page
            , function(html){
                var $pagebar = $('#pagebar');
                $pagebar.empty().append(html);
            });
    },


    // 页面载入的时候绑定各个事件
    bind : function(){
        // 标题栏自动隐藏
        $('nav.sub-navbar').affix({ 
            offset: { top: 50 } 
        }).on('affix.bs.affix', function(e){
            $('#mainContent').addClass('affixed');
            $('div.main-navbar').addClass('moveout');
            $('nav.sub-navbar').removeClass('col-md-offset-2 col-md-10').addClass('col-md-12');
        }).on('affix-top.bs.affix', function(e){
            $('#mainContent').removeClass('affixed');
            $('div.main-navbar').removeClass('moveout');
            $('nav.sub-navbar').removeClass('col-md-12').addClass('col-md-offset-2 col-md-10');
        });

        $('#search-form').keypress(function(e){
            if (event.which == 13 ) {
                e.preventDefault();
                var search = $('#search-form').getdata({skipEmpty : true, queryexp : true});
                var state = $.extend({}, PG.state);
                state.cond = search;
                state.page.skip = 0;
                PG.pushState(state);
            };
        }).submit(function(e){
            e.preventDefault();
            var search = $('#search-form').getdata({skipEmpty : true, queryexp : true});
            var state = $.extend({}, PG.state);
            state.cond = search;
            state.page.skip = 0;
            PG.pushState(state);
        });

        // 详细条件查询
        $('#detailSearchBtn').click(function(e){
            var search = $('#detail-search-form').getdata({skipEmpty : true, queryexp : true});
            var state = $.extend({}, PG.state);
            state.cond = search;
            state.page.skip = 0;
            PG.pushState(state);
        });

        // ============= 实现数据导航功能 =============
        function _mapNaviTree( navis ){
            // TODO : 把导航内容转为树结构
            // treeview api : https://github.com/jonmiles/bootstrap-treeview
            if(!navis || navis.length === 0)
                return null;
            return _.map(navis, function(node){
                return {
                    text: node.toString(),
                    nodes : _mapNaviTree(node.subModuleList),
                    data : node
                }
            });
        };

        $('#navlist').spin();
        Module.listNavi(function(module){
            var docs = module.docs;
            $('#navlist').spin(false);
            $('#navlist').treeview({
                data : _mapNaviTree(docs)
            }).on('nodeSelected', function(event, naviNode){
                //TODO : 触发相应的查询操作
                var moudleId = naviNode.data.id;
                var state = $.extend(true, {}, PG.state);
                state.cond.parent_id = moudleId;
                PG.pushState(state);
            });
        }); 

        // 翻页
        $('#pagebar').on('click','.pagination a', function(e){
            e.preventDefault();
            var $a = $(e.target);
            var tgt = $a.attr('href'),
                params = $.deparam(tgt.replace(/^#/,''));
            var state = $.extend({}, PG.state),
                limit = state.page.limit
                state.page.skip = params.skipto * limit;
            PG.pushState(state);
        });
        // 开启查询模式
        $('#searchBtnGroup').click(function(e){
            var state = $.extend({},PG.state);
            // NOTE: 因为click事件发生时active状态还没有改变，所以hasClass('active')返回"false"
            // 所以这里不是一个bug
            state.searching = $('#searchBtnGroup').hasClass('active') ? 'false' : 'true';
            $.showSearchBlock($('#searchPanel'), state.searching);
            if(state.searching === 'false'){
                $('#search-form').clearall();
                $('#detail-search-form').clearall();
                state.cond = {};
            }
            PG.pushState(state, { triggerEvent : false });
        });
        // 字段排序
        $('#cellDiv').on('click', 'a.sortlink', $M.createSortHander(PG));

        // TODO : 扩展的事件处理函数请加在这一行的下面，方便今后推送模版改变内容
        // ....
    },
 
    //====================================================================================================================
    // 事件处理函数
    //====================================================================================================================
    // TODO : 加入事件处理

    
    // ========================================================================
    //      功能函数 
    // ========================================================================
    // listnavi
    listNavi : function(fn, fail){
        $M.doquery('<$=options.url $>/listnavi.do'
            , { } 
            , { successfn : fn , failfn : fail , alertPosition : '#cellDiv' });
    }, // ==== listnavi end =====
    
    // 根据查询条件和分页条件载入数据页面
    listPage : function(cond, sort, page, fn){
        $M.doquery('<$=options.url $>/list.do'
            , { cond : cond, page: page, sort: sort} 
            , { successfn : fn , alertPosition : '#cellDiv' });
    },

    showPagebar : function(cond, page, fn){
        $M.doquery('<$=options.url $>/count.do'
            , { cond: cond }
            , { successfn : function(module){
                    var pagebarHtml = renderPagebar("pagebarTpl", module.count, page);
                    fn(pagebarHtml);
                }, alertPosition : '#cellDiv' });
    }
    // ========== 请尽量在这一行后面加入扩展代码，方便系统自动合并模版修改 ==========

});

function init(){
    $M.expandSharepageMacro();
    $M.createSharepageControl();
    Module.bind();
    PG.bind();
    $(window).trigger('hashchange');
};

$(document).ready(init);