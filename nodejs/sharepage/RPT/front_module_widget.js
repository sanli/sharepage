//#!本文件由share.js自动产生, 命令行为: node share.js gen <$=module_name $> ..
/**
 * <M%=module_name %M>HTTP入口模块, 需要在主文件中添加map
 * var <M%=module_name %M> = require('./routes/<M%=module_name %M>').bindurl(app);
 */
// 模块的API函数，供在其他的地方访问模块中的各项功能
!function($){
    var Module = $.extend($M(), {

<$ if(options.widget.list){ $>
        // 页面载入的时候绑定各个事件
        bind : function(container){
            container = container || '#<$=module_name $>_listDlg div.modal-body';
            $container = $(container);

            $container.on('click','.pagination a', function(e){
                e.stopPropagation();
                e.preventDefault();
                var $a = $(e.target);
                var tgt = $a.attr('href'),
                    params = $.deparam(tgt.replace(/^#/,''));

                var state = $container.data('widget-state');
                    limit = state.page.limit
                    state.page.skip = params.skipto * limit;
                Module.listModules(state , {
                    inline : true, 
                    inlinecontainer : container
                });
            });

            //TODO : 加入其他的事件处理函数
            // ...
        },

        // 根据页面状态，载入数据
        //listModules: function(cond, page, sort, opt, fn){
        // state : {  cond : {} , page : { skip : 0 , limit : 20 } ,  sort : { 'id' : 1 } }
        listModules: function(state, opt, fn){
            opt = opt  || {
                // 是否inline显示列表
                inline : false,
                inlinecontainer : '',
                showPagebar : true
            }
            var container = opt.inline ? $(opt.inlinecontainer) : $('#<$=module_name $>_listDlg div.modal-body'),
                currentState = container.data('widget-state') || {
                    cond : { },
                    page : { skip: 0, limit: 20 },
                    sort : { 'id' : 1 }
                } ;
            state = $.extend(true, currentState, state);
            container.data('widget-state', state);

            function _listPage(cond, sort, page, fn){
                $M.doquery('/web/<$=module_name $>/list.do'
                    , { cond : cond, page: page, sort: sort} 
                    , { successfn : fn , alertPosition : '#<$=module_name $>_listDlg div.modal-body' });
            };

            function _showPagebar(cond, page, fn){
                $M.doquery('/web/<$=module_name $>/count.do'
                    , { cond: cond }
                    , { successfn : function(module){
                            var pagebarHtml = renderPagebar("pagebarTpl", module.count, page);
                            fn(pagebarHtml);
                        }, alertPosition : '#<$=module_name $>_listDlg div.modal-body' });
            };

            if(!opt.inline){
                $.showmodal('#<$=module_name $>_listDlg');
            }else{
                if(container.find('#<$=module_name $>_cellTable').length === 0){
                    container.empty().append($('#<$=module_name $>_listDlg #<$=module_name $>_cellDiv').clone());
                }
                container.spin();
            }
            // 加载数据表
            _listPage(state.cond, state.sort, state.page
                , function(module){
                    var $resultTarget = container.find('#<$=module_name $>_cellTable');
                    $M.fillResult($resultTarget, {
                        cells : module.docs,
                        tempId : '<$=module_name $>_cellTableTmpl',
                        sort: state.sort,
                    });
                    container.spin(false);
                    fn && fn();
                });

            // 加载分页条
            if(opt.enablePagebar){
                _showPagebar(state.cond, state.page
                    , function(html){
                        var $pagebar = $('#<$=module_name $>_pagebar');
                        $pagebar.empty().append(html);
                    });
            }
        },
<$ } $>

<$ if(options.widget.view){ $>
        viewModule : function(id , options){
            function _loadDataDetail(id, fn){
                $M.doquery('/web/<$=module_name $>/get.do', {id : id}
                    , { successfn : fn , alertPosition : '#<$=module_name $>_moduleViewDlg div.modal-body'});
            };

            //载入选中对象的具体数据
            $('#<$=module_name $>_module-form-view').clearall();
            _loadDataDetail(id, function(module){
                var data = module.doc;
                $('#<$=module_name $>_module-form-view').autofill(data);
                // TODO:autofill不能填充的数据在这里手工填充
                // ...

            });
            $.showmodal('#<$=module_name $>_moduleViewDlg');
        },
<$ } $>

        // ========================================================================
        //      功能函数 
        // ========================================================================
        // ========== 请尽量在这一行后面加入扩展代码，方便系统自动合并模版修改 ==========
        // ...
        

    });
    $M.<$=module_name $>api = Module;
}(jQuery);