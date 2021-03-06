//#!本文件由share.js自动产生, 命令行为: node sharecli.js gen enum

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
    },

    // 模块名称
    module : 'enum',
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

        $('a.action-add').on('click', function(e){
            e.preventDefault();
            Module.createModule();
        });

        $('a.action-export').on('click', function(e){
            e.preventDefault();
            Module.exportData(e);
        });


        $('a.action-import').on('click', function(e){
            e.preventDefault();
            Module.onImportFile(e);
        });

        $('#importbtn').on('click', Module.onImportFile);
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
                    text: node.label,
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
        }); // ============= 实现数据导航功能 =============
    

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
        // 开启编辑模式
        $('#editingBtnGroup').click(function(e){
            e.preventDefault();
            var state = PG.state;
            // NOTE: 因为click事件发生时active状态还没有改变，所以hasClass('active')返回"false"
            // 所以这里不是一个bug
            state.editing = $('#editingBtnGroup').hasClass('active') ? 'false' : 'true';
            $.showControlBlock($('#cellDiv'), state.editing);
            PG.pushState(state, { triggerEvent : false });
        });
        // 预览数据
        $('#cellDiv').on('click', 'a.action-view', function(e){
            var id = $(e.target).closest('tr').data('id');
            Module.viewModule(id);
        });
        // 修改数据
        $('#cellDiv').on('click', 'a.action-edit', function(e){
            var id = $(e.target).closest('tr').data('id');
            Module.updateModule(id);
        });
        // 删除数据
        $('#cellDiv').on('click', 'a.action-remove', function(e){
            var id = $(e.target).closest('tr').data('id');
            console.log('delete, id:' + id);
            Module.deleteModule(id);
        });
        // 字段排序
        $('#cellDiv').on('click', 'a.sortlink', $M.createSortHander(PG));

        // 选中功能相关代码
        function _checkchanged(){
            var haveChecked = $('#cellDiv').find('td.action-checkbox :checked').length > 0;

            // TODO 在这里修改与选中相关的按钮状态

            if(haveChecked){
                $('a.action-batchdelete').closest('li').removeClass('disabled');
            }else{
                $('a.action-batchdelete').closest('li').addClass('disabled');
            }

        }
        $('#cellDiv').on('change', 'input.selectall', function(e){
            var v = $(e.target).prop('checked');
            $('#cellDiv').find('td.action-checkbox input').prop('checked', v);
            _checkchanged();
        });
        $('#cellDiv').on('change', 'td.action-checkbox input', _checkchanged);
        // ====== 选中功能相关代码结束 =======


        // 批量删除
        $('a.action-batchdelete').click(function(e){
            e.preventDefault();
            if($('#cellDiv').find('td.action-checkbox :checked').length > 0){
                var id = $('#cellDiv').find('td.action-checkbox :checked').map(function(v, box){
                    return $(box).closest('tr').data('id');
                }).toArray();
                Module.deleteModule(id);
                setTimeout(function(){
                    _checkchanged();
                }, 3000);
            }
        });

        // TODO : 扩展的事件处理函数请加在这一行的下面，方便今后推送模版改变内容
        // ....
    },
 
    //====================================================================================================================
    // 事件处理函数
    //====================================================================================================================
    //需要新建一个enum
    createModule: function(){
        function _createModule(condition, fn, fail){
            $M.doupdate('/sys/enum/create', condition, { successfn : fn , failfn: fail});
        };

        $('#module-form').clearall();
        //TODO : 创建不能自动创建的字段
        // ....

        $.showmodal('#moduleDlg', function(fn){
            if ($('#module-form').validate().form()){
                // save change
                var data = $('#module-form').getdata({checkboxAsBoolean : true});
                //TODO : 创建特殊字段getdata不能自动获取的数据在这里手工获取
                // ...
                    
                _createModule({ data: data }, function(result){
                    Module.loadPageData(PG.state.cond, PG.state.page);
                    fn();
                }, function(err){
                    $.alert('#moduleDlg .modal-body', err, 10000);
                    fn(err);
                });
            }else{
                fn(new Error('输入内容有错误'));
            }
        }, null , "创建新数据字典管理");
    },

    // 删除enum
    deleteModule: function(id, options){
        $.ask("删除对象","是否确认删除,删除后不能恢复？", function(){
            $M.dodelete('/sys/enum/delete'
                , { id : id }
                , { successfn : function(){
                        Module.loadPageData(PG.state.cond, PG.state.page);
                    }, alertPosition : '#cellDiv' });
        });
    },

    viewModule : function(id , options){
        //载入选中对象的具体数据
        $('#module-form-view').clearall();
        Module.loadDataDetail(id, function(module){
            var data = module.doc;
            $('#module-form-view').autofill(data);

            // TODO:autofill不能填充的数据在这里手工填充
            // ...
        });
        $.showmodal('#moduleViewDlg');
    },

    // 编辑enum信息
    updateModule: function(id, options){
        //载入选中对象的具体数据
        $('#module-form').clearall();
        $('#module-form').spin();
        Module.loadDataDetail(id, function(module){
            var data = module.doc;
            $('#module-form').spin(false);
            $('#module-form').autofill(data, $M.SETOPT);
            
            // TODO:autofill不能填充的数据在这里手工填充
            // ...
        });
        
        //弹出对话框
        $.showmodal('#moduleDlg', function(fn){
            if ($('#module-form').validate().form()){
                // save change
                var data = $('#module-form').getdata({checkboxAsBoolean : true});
                // TODO: getdata不能自动获取的数据在这里手工获取
                // ...

                Module.updateModuleInfo({ 
                    _id: id,
                    data: data 
                }, function(result){
                    Module.loadPageData(PG.state.cond, PG.state.page);
                    fn();
                }, function(err){
                    $.alert('#moduleDlg .modal-body', err, 10000);
                    fn(err);
                });
            }else{
                return fn(new Error('输入内容有错误'));
            }
        });
    },

    //导出当前的查询结果
    exportData : function(e){
        var type = PG.state.type,
            sort = PG.state.sort,
            cond = PG.state.cond,
            sortarg = {}
            $e = $(e.target);
        sortarg[sort.by] = sort.order;
        Module._processSearchCond(cond);
        $e.spin();
        $M.doquery('/sys/enum/export'
            , { type: type, cond : cond , sort: sortarg } 
            , { successfn : function(data){
                window.location.href = '/download?'+ $.param(data);
                $e.spin(false);
            } , alertPosition : '#cellDiv' });
    },


    //处理导入数据
    onImportFile : function(e){
        PG.doImportWithWebsocket('enum',{'title':'数据字典管理导入'});
        e.preventDefault();
    },

    // ========================================================================
    //      功能函数 
    // ========================================================================
    
    // listnavi
    listNavi : function(fn, fail){
        $M.doquery('/sys/enum/listnavi'
            , { } 
            , { successfn : fn , failfn : fail , alertPosition : '#cellDiv' });
    }, // ==== listnavi end =====
    
    // 根据查询条件和分页条件载入数据页面
    listPage : function(cond, sort, page, fn){
        $M.doquery('/sys/enum/list'
            , { cond : cond, page: page, sort: sort} 
            , { successfn : fn , alertPosition : '#cellDiv' });
    },

    showPagebar : function(cond, page, fn){
        $M.doquery('/sys/enum/count'
            , { cond: cond }
            , { successfn : function(module){
                    var pagebarHtml = renderPagebar("pagebarTpl", module.count, page);
                    fn(pagebarHtml);
                }, alertPosition : '#cellDiv' });
    },

    // 更新楼宇信息
    updateModuleInfo : function(condition, fn, fail){
        $M.doupdate('/sys/enum/update', condition, { successfn : fn , failfn: fail});
    },

    // 查询详细信息
    loadDataDetail : function(id, fn){
        $M.doquery('/sys/enum/get', {_id : id}
            , { successfn : fn , alertPosition : '#cellDiv'});
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