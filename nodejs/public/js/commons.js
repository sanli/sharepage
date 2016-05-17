//sfmiscommons.js
/**
 * 扩展一些cagcommons独有的功能函数, 需要在sharepage.js之后载入
 */
!function ($P) {
    "use strict";

    var fn = $P.prototype;
    fn.getuser = function(fn, opt){
        opt = opt || { 
            asklogin : true,
            asktitle : "请先登录中华珍宝馆，随后这幅画会加入到您的收藏中"
        };
        if (PG.userinfo)
            return fn(null, PG.userinfo);
        $M.doquery('/whoami', {}, 
            { 
                successfn : function(data){
                    if(data.tourist){
                        PG.userinfo = data;
                        fn(null, PG.userinfo);    
                    }else if(opt.asklogin){
                        PG.asklogin(fn, { 
                            title : opt.asktitle
                        });
                    }else{
                        fn(null);
                    }
                },
                failfn: function(data){
                    fn(new Error(data));
                }
            });
    };

    fn.islogin = function(){
        return !!PG.userinfo;
    }

    fn.asklogin = function(fn, opt){
        opt = opt || { title : "登录到中华珍宝馆" };
        //弹出对话框
        $.showmodal('#loginDlg',  function(){
            if ($('#login-form').validate().form()){
                // save change
                var data = $('#login-form').getdata({checkboxAsBoolean : true});

                $('#login-form').spin();
                $M.doquery("/tourist/login", { data: data }
                    ,{  
                        successfn : function(result){
                            $('#login-form').spin('false');
                            fn(result.userinfo);
                            $('#loginDlg').modal('hide');
                        }, 
                        alertPosition : '#loginDlg .modal-body'
                    });
            }
        }, null, {  title : opt.title });
    }

    fn.loadCity = function( options ){
        options = options || { el : "#deptId"}
        var PG = this, 
            $el = $(options.el);
        $.getJSON("/cityDept.json", function(citys) {

            $el.each(function(idx, element){
                var $one = $(element);
                $.each(citys, function(i, city){
                    $one.append("<option value='"+city.deptId+"'>"+city.city+"</option>"); 
                });    
            });

            PG.getuser(function(err, user){
                if(err) return ;
                if(user && user.deptId){
                    $el.val(user.deptId);
                    if (user.deptId !=="1"){
                        $el.prop('disabled', 'disabled');
                    }
                }                  
            });
        });
    };

    fn.loadSysconf = function(fn, fail){
        $M.doquery('/sysconf/retrive', {}
            , { successfn : function(res){
                fn(res.doc);
            }, failfn : fail });
    };


    fn.doImportWithWebsocket = function(moduleName, opt){
        // 需要传递到服务器端的数据
        var remoteopt = opt.data || {
            user : user.login_name, 
            city : user.city,
            project_id : user.used_project && user.used_project.project_id,
            args_id : user.used_project && user.used_project.args_id,
        };
        // 输出验证内容到对话框
        function _taskOutput(output, isValideError, clearBeforeAppend){
            var $target = isValideError ? $('#valideMsgDiv') : $('#statusDiv');
            if(clearBeforeAppend){
                $target.empty();
            }
            $target.append(output+ "<br>");
            //$('#importDlg .modal-body').scrollTop($('#target').height());
        }

        function _doValidate(filename, siteType, fn){
            var d = dnode('/' + moduleName + '/ws', function(remote){
                _taskOutput("连接到服务器，并开始验证数据\n=======================================\n", false, true);
                _taskOutput("", true, true);
            var notpassed = 0, passed = 0;
                remote.validate( filename, remoteopt, 
                    function(passed, reason, record, index){
                        if(!passed){
                            notpassed ++;
                            _taskOutput("第" + index + "条[" + record + "]:未通过 错误原因：" + reason, true, false);
                        }else{
                            _taskOutput("第" + index + "条数据[" + record + "] 通过验证", false, false);
                        }
                    }, function(err, data){
                        _taskOutput('\n验证结束，一共验证数据' + data.count + '条' 
                            + (notpassed > 0 ? '其中错误:' + notpassed + '条，请修正错误后重新导入' : '全部通过，可以导入数据') , false, false);
                        d.end();
                        fn(err, notpassed, data.count);
                    });
            });
            d.on('end', function(){
                _taskOutput('\n断开到服务器的连接', false, false);
            });
            d.on('error', function(err){
                _taskOutput('\n执行错误:' + err.message, false, false);
            });
        };

        function _doImport(filename, siteType, projectId, fn,opts){
            var d = dnode('/' + moduleName + '/ws', function(remote){
                _taskOutput("连接到服务器，并开始导入数据\n=======================================\n", false, true);
                _taskOutput("", true, true);
            remote.import( filename, remoteopt, 
                function(record, index){
                    _taskOutput("第" + index + "条[" + record + "]", false, false);
                }, function(err, data){
                    if(!err){
                        _taskOutput('\n导入结束，一共导入数据' + data.count + '条', false, false);
                    }else{
                        _taskOutput('\n导入出错:' + err, false, false);
                    }
                    d.end();
                    fn(err, data);
                });
            });
            d.on('end', function(){
                _taskOutput('\n断开到服务器的连接', false, false);
            });
            d.on('error', function(err){
                _taskOutput('\n执行错误:' + err.message, false, false);
            });
        };

        var opt = $.extend({
            // 文件上传完成,预览并准备导入
            _onFileUploadSuccess : function(id, filename, uploadFileName){
                var dlg = $('#importDlg');
                dlg.data('filename', filename)
                    .data('fileid', id)
                    .data('uploadFileName', uploadFileName);
                dlg.find('.btn.btn-primary').attr('disabled', true);
                _doValidate(uploadFileName, PG.state.siteType, function(err, notpassed){
                    if(err){
                        return $.alert('#importDlg div.modal-body', '导入数据出错:' + errmsg);
                    }
                    if(notpassed === 0){
                        dlg.find('.btn.btn-primary').attr('disabled', false);
                    }
                });
            },
            // 确认导入
            _confirmImport : function(filename, data, fn){
                _doImport(filename, PG.state.siteType, data.projectId,fn,data.opts);
            },

            afterDlgShow : function(e){
                //PG.loadProject($('#importDlg select[data-sfcontrol=project]'));
            }
        },opt);

        $.showmodal('#importDlg', function(fn){
            var dlg = $('#importDlg');
            if ($('#import-form').validate().form()){
                //只能导入一次
                $('#importDlg').find('.btn.btn-primary').attr('disabled', true);
                var filename = dlg.data('uploadFileName'),
                    mfilename = dlg.data('muploadFileName'),
                    data = $('#import-form').getdata();
                    data.opts={'mfieldname':opt.mfieldname,'mfilename':mfilename};

                $("valideMsgDiv").spin();
                if(filename===undefined || filename===null || filename===""){
                   // 验证必填附件
                    $.alert('#importDlg div.modal-body', '导入数据出错:没有上传导入文件'); 
                    return false;
                }             
                opt._confirmImport(filename, data, function(err, data){
                        $("valideMsgDiv").spin("false");
                        if(!err){
                            dlg.modal('hide');
                            $.alert('#cellDiv', '成功导入数据 [' + data.count + "] 条");
                            Module.loadPageData(PG.state.cond, PG.state.page);
                            return fn();
                        }else{
                            $.alert('#importDlg div.modal-body', '导入数据出错:' + err);    
                            return fn(new Error('发生错误'));
                        }
                    });
                return false;
            }else{
                return fn(new Error('发生错误'));
            }
        },null,{ 
            title : opt.title || "导入数据", 
            remote : "websocket_import_dlg.html",
            filldata : function(e){
                opt.afterDlgShow && opt.afterDlgShow(e);
                $("#fileUploader").createUploader(opt._onFileUploadSuccess, {
                    validation: {
                      acceptFiles : 'text/csv',
                      allowedExtensions: ['csv']
                    }
                });
            }
        });
    }
}($P);


/**
 * 一些基本功能函数，做一些通用的页面操作,一般和页面上的某个元素互动
 * $.expandContent : 扩大或者缩小主操作区域
 */
(function ($) {
  "use strict";
  $.extend({
    // 扩大或者缩小主操作区域
    expandContent : function(expand){
      var $serviceCtlBar = $('#serviceCtlBar'),
          $mainContent = $('#mainContent'),
          $icon = $('#extendBtn i');

        if(expand === false){
            $serviceCtlBar.removeClass('span9').addClass('span12');
            $mainContent.removeClass('span9').addClass('span12');
            $icon.removeClass('icon-arrow-right')
                .closest('li').removeClass('active');
            return;
        }else if(expand === true){
            $serviceCtlBar.removeClass('span12').addClass('span9');
            $mainContent.removeClass('span12').addClass('span9');
            $icon.addClass('icon-arrow-right')
                .closest('li').addClass('active');
            return;
        }

        if($serviceCtlBar.hasClass('span9')){
            $serviceCtlBar.removeClass('span9').addClass('span12');
            $mainContent.removeClass('span9').addClass('span12');
            $icon.removeClass('icon-arrow-right')
                .closest('li').removeClass('active');
        }else{
            $serviceCtlBar.removeClass('span12').addClass('span9');
            $mainContent.removeClass('span12').addClass('span9');
            $icon.addClass('icon-arrow-right')
                .closest('li').addClass('active');
        }
    },

    //显示删除修改等控制条，加上了简单的动画
    showControlBlock : function($cell, editing, $showBtnGroup){
        var isEditing = editing === true || editing === 'true';
        if(isEditing){
            $cell.find('.action-ctl').addClass('show');
            setTimeout(function(){ 
                $cell.find('.action-ctl').addClass('in'); 
            }, 100); // 延后100毫秒，否则动画不能正常显示
        }else{
            $cell.find('.action-ctl').removeClass('show').removeClass('in');
        }

        if($showBtnGroup && ( $showBtnGroup.hasClass('active') != isEditing)) { 
            //重新设置按钮状态
            $showBtnGroup.button('toggle');
        }        
    },

    //显示查询控制条，加上了简单的动画
    showSearchBlock : function($searchPanel, searching, $searchBtnGroup){
        var show = (searching === true || searching === 'true');
        if(show){
            $searchPanel.addClass('show');
            setTimeout(function(){ $searchPanel.addClass('in'); }, 100); // 延后100毫秒
        }else{
            $searchPanel.removeClass('in').removeClass('show');  // 延后100毫秒
        };

        if($searchBtnGroup && ( $searchBtnGroup.hasClass('active') != show)) { 
            //重新设置按钮状态
            $searchBtnGroup.button('toggle');
        }
    },

    //显示查询控制条，加上了简单的动画
    processQuickSearch : function(cond, $el){
        var fieldstr = $el.data('sharepage-quicksearch');
        var fields = fieldstr.split(',');
        if(cond.quick_search_key){
            if(fields.length >= 1 ){
                cond['$or'] = _.map(fields, function(field){
                    var condobj = {};
                    condobj[field] = cond.quick_search_key;
                    return condobj;
                });
            }else if(fields.length === 1){
                cond[fieldstr] = cond.quick_search_key;
            }
            
            delete cond.quick_search_key;
        }
    },

    // 这是我的一个小彩蛋
    art_is_fun: function(hide){
        if(!hide){
            if($('#art-is-fun').length > 0){
                $.get('/art_is_fun', function(data){
                    $('#art-is-fun').addClass('in').text(data);
                });
            }
        }else{
            $('#art-is-fun').removeClass('in');
        }
        
    },

    // 格式输出一个压缩的时间
    formatDateTime : function(date){
        if(!date) return '';

        if(typeof(date) === 'string')
            date = new Date(date);

        var now = new Date(), str = [];
        //当日的流程显示时间，非当日流程显示日期
        if(date.toLocaleDateString() !== now.toLocaleDateString()){
            str.push(date.toLocaleDateString());
        }else{
            var m = date.getMinutes();
            str.push(date.getHours()+':'+ (m >= 10 ? m : "0" + m));    
        }

        return str.join(' ');
    },

    // 格式化显示经纬度
    // target : 跳转的目标点
    // opt.zoom : 缩放
    createFormatLnglat : function(target, opt){
        return function(data){
            var opt = opt || { zoom : 16 };

            if(data.longitude){
                var loc =data.longitude + ',' + data.latitude;    
            }else if(data.loc){
                var loc = data.loc.coordinates[0] + ',' + data.loc.coordinates[1];
            }else if(data.aggregate_loc){
                var loc = data.aggregate_loc.coordinates[0] + ',' + data.aggregate_loc.coordinates[1];
            }

            var href = target + '#' + 'center=' + loc + '&zoom=' + opt.zoom;
            return '<a href="' + href + '" target="_giswindow"><span class="glyphicon glyphicon-map-marker"></span> ' + loc + ' <span class="glyphicon glyphicon-share-alt"></span></a>';
        }
    },

  });
})(window.jQuery);



(function ($) {

    var ie = 'ActiveXObject' in window,
        ielt9 = ie && !document.addEventListener,

        // terrible browser detection to work around Safari / iOS / Android browser bugs
        ua = navigator.userAgent.toLowerCase(),
        webkit = ua.indexOf('webkit') !== -1,
        chrome = ua.indexOf('chrome') !== -1,
        phantomjs = ua.indexOf('phantom') !== -1,
        android = ua.indexOf('android') !== -1,
        android23 = ua.search('android [23]') !== -1,
        gecko = ua.indexOf('gecko') !== -1,

        mobile = typeof orientation !== undefined + '',
        msPointer = window.navigator && window.navigator.msPointerEnabled &&
                  window.navigator.msMaxTouchPoints && !window.PointerEvent,
        pointer = (window.PointerEvent && window.navigator.pointerEnabled && window.navigator.maxTouchPoints) ||
                  msPointer,
        retina = ('devicePixelRatio' in window && window.devicePixelRatio > 1) ||
                 ('matchMedia' in window && window.matchMedia('(min-resolution:144dpi)') &&
                  window.matchMedia('(min-resolution:144dpi)').matches),

        doc = document.documentElement,
        ie3d = ie && ('transition' in doc.style),
        webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()) && !android23,
        gecko3d = 'MozPerspective' in doc.style,
        opera3d = 'OTransition' in doc.style,
        any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d || opera3d) && !phantomjs;


    // PhantomJS has 'ontouchstart' in document.documentElement, but doesn't actually support touch.
    // https://github.com/Leaflet/Leaflet/pull/1434#issuecomment-13843151

    var touch = !window.L_NO_TOUCH && !phantomjs && (function () {

        var startName = 'ontouchstart';

        // IE10+ (We simulate these into touch* events in L.DomEvent and L.DomEvent.Pointer) or WebKit, etc.
        if (pointer || (startName in doc)) {
            return true;
        }

        // Firefox/Gecko
        var div = document.createElement('div'),
            supported = false;

        if (!div.setAttribute) {
            return false;
        }
        div.setAttribute(startName, 'return;');

        if (typeof div[startName] === 'function') {
            supported = true;
        }

        div.removeAttribute(startName);
        div = null;

        return supported;
    }());

    $.mybrowser = {
        ie: ie,
        ielt9: ielt9,
        webkit: webkit,
        gecko: gecko && !webkit && !window.opera && !ie,

        android: android,
        android23: android23,

        chrome: chrome,

        ie3d: ie3d,
        webkit3d: webkit3d,
        gecko3d: gecko3d,
        opera3d: opera3d,
        any3d: any3d,

        mobile: mobile,
        mobileWebkit: mobile && webkit,
        mobileWebkit3d: mobile && webkit3d,
        mobileOpera: mobile && window.opera,

        touch: touch,
        msPointer: msPointer,
        pointer: pointer,

        retina: retina
    };

    $.isMobile = function(){
        return $.mybrowser.mobile;
    }
}(jQuery));


+function ($) {
    'use strict';

    var ICONS = ['glyphicon-asterisk','glyphicon-plus','glyphicon-euro','glyphicon-eur','glyphicon-minus'
                ,'glyphicon-cloud','glyphicon-envelope','glyphicon-pencil','glyphicon-glass','glyphicon-music','glyphicon-search'
                ,'glyphicon-heart','glyphicon-star','glyphicon-star-empty','glyphicon-user','glyphicon-film','glyphicon-th-large'
                ,'glyphicon-th','glyphicon-th-list','glyphicon-ok','glyphicon-remove','glyphicon-zoom-in','glyphicon-zoom-out'
                ,'glyphicon-off','glyphicon-signal','glyphicon-cog','glyphicon-trash','glyphicon-home','glyphicon-file'
                ,'glyphicon-time','glyphicon-road','glyphicon-download-alt','glyphicon-download','glyphicon-upload','glyphicon-inbox'
                ,'glyphicon-play-circle','glyphicon-repeat','glyphicon-refresh','glyphicon-list-alt','glyphicon-lock','glyphicon-flag'
                ,'glyphicon-headphones','glyphicon-volume-off','glyphicon-volume-down','glyphicon-volume-up','glyphicon-qrcode'
                ,'glyphicon-barcode','glyphicon-tag','glyphicon-tags','glyphicon-book','glyphicon-bookmark','glyphicon-print'
                ,'glyphicon-camera','glyphicon-font','glyphicon-bold','glyphicon-italic','glyphicon-text-height','glyphicon-text-width'
                ,'glyphicon-align-left','glyphicon-align-center','glyphicon-align-right','glyphicon-align-justify','glyphicon-list'
                ,'glyphicon-indent-left','glyphicon-indent-right','glyphicon-facetime-video','glyphicon-picture','glyphicon-map-marker'
                ,'glyphicon-adjust','glyphicon-tint','glyphicon-edit','glyphicon-share','glyphicon-check','glyphicon-move'
                ,'glyphicon-step-backward','glyphicon-fast-backward','glyphicon-backward','glyphicon-play','glyphicon-pause'
                ,'glyphicon-stop','glyphicon-forward','glyphicon-fast-forward','glyphicon-step-forward','glyphicon-eject','glyphicon-chevron-left'
                ,'glyphicon-chevron-right','glyphicon-plus-sign','glyphicon-minus-sign','glyphicon-remove-sign','glyphicon-ok-sign','glyphicon-question-sign'
                ,'glyphicon-info-sign','glyphicon-screenshot','glyphicon-remove-circle','glyphicon-ok-circle','glyphicon-ban-circle','glyphicon-arrow-left'
                ,'glyphicon-arrow-right','glyphicon-arrow-up','glyphicon-arrow-down','glyphicon-share-alt','glyphicon-resize-full','glyphicon-resize-small'
                ,'glyphicon-exclamation-sign','glyphicon-gift','glyphicon-leaf','glyphicon-fire','glyphicon-eye-open','glyphicon-eye-close'
                ,'glyphicon-warning-sign','glyphicon-plane','glyphicon-calendar','glyphicon-random','glyphicon-comment','glyphicon-magnet','glyphicon-chevron-up','glyphicon-chevron-down'
                ,'glyphicon-retweet','glyphicon-shopping-cart','glyphicon-folder-close','glyphicon-folder-open','glyphicon-resize-vertical','glyphicon-resize-horizontal','glyphicon-hdd'
                ,'glyphicon-bullhorn','glyphicon-bell','glyphicon-certificate','glyphicon-thumbs-up','glyphicon-thumbs-down','glyphicon-hand-right','glyphicon-hand-left','glyphicon-hand-up'
                ,'glyphicon-hand-down','glyphicon-circle-arrow-right','glyphicon-circle-arrow-left','glyphicon-circle-arrow-up','glyphicon-circle-arrow-down','glyphicon-globe','glyphicon-wrench'
                ,'glyphicon-tasks','glyphicon-filter','glyphicon-briefcase','glyphicon-fullscreen','glyphicon-dashboard','glyphicon-paperclip','glyphicon-heart-empty','glyphicon-link'
                ,'glyphicon-phone','glyphicon-pushpin','glyphicon-usd','glyphicon-gbp','glyphicon-sort','glyphicon-sort-by-alphabet','glyphicon-sort-by-alphabet-alt','glyphicon-sort-by-order'
                ,'glyphicon-sort-by-order-alt','glyphicon-sort-by-attributes','glyphicon-sort-by-attributes-alt','glyphicon-unchecked','glyphicon-expand','glyphicon-collapse-down'
                ,'glyphicon-collapse-up','glyphicon-log-in','glyphicon-flash','glyphicon-log-out','glyphicon-new-window','glyphicon-record','glyphicon-save','glyphicon-open','glyphicon-saved'
                ,'glyphicon-import','glyphicon-export','glyphicon-send','glyphicon-floppy-disk','glyphicon-floppy-saved','glyphicon-floppy-remove','glyphicon-floppy-save','glyphicon-floppy-open'
                ,'glyphicon-credit-card','glyphicon-transfer','glyphicon-cutlery','glyphicon-header','glyphicon-compressed','glyphicon-earphone','glyphicon-phone-alt','glyphicon-tower'
                ,'glyphicon-stats','glyphicon-sd-video','glyphicon-hd-video','glyphicon-subtitles','glyphicon-sound-stereo','glyphicon-sound-dolby','glyphicon-sound-5-1','glyphicon-sound-6-1'
                ,'glyphicon-sound-7-1','glyphicon-copyright-mark','glyphicon-registration-mark','glyphicon-cloud-download','glyphicon-cloud-upload','glyphicon-tree-conifer','glyphicon-tree-deciduous'
                ,'glyphicon-cd','glyphicon-save-file','glyphicon-open-file','glyphicon-level-up','glyphicon-copy','glyphicon-paste','glyphicon-alert','glyphicon-equalizer','glyphicon-king'
                ,'glyphicon-queen','glyphicon-pawn','glyphicon-bishop','glyphicon-knight','glyphicon-baby-formula','glyphicon-tent','glyphicon-blackboard','glyphicon-bed','glyphicon-apple'
                ,'glyphicon-erase','glyphicon-hourglass','glyphicon-lamp','glyphicon-duplicate','glyphicon-piggy-bank','glyphicon-scissors','glyphicon-bitcoin','glyphicon-btc','glyphicon-xbt'
                ,'glyphicon-yen','glyphicon-jpy','glyphicon-ruble','glyphicon-rub','glyphicon-scale','glyphicon-ice-lolly','glyphicon-ice-lolly-tasted','glyphicon-education','glyphicon-option-horizontal'
                ,'glyphicon-option-vertical','glyphicon-menu-hamburger','glyphicon-modal-window','glyphicon-oil','glyphicon-grain','glyphicon-sunglasses','glyphicon-text-size','glyphicon-text-color'
                ,'glyphicon-text-background','glyphicon-object-align-top','glyphicon-object-align-bottom','glyphicon-object-align-horizontal','glyphicon-object-align-left','glyphicon-object-align-vertical'
                ,'glyphicon-object-align-right','glyphicon-triangle-right','glyphicon-triangle-left','glyphicon-triangle-bottom','glyphicon-triangle-top','glyphicon-console','glyphicon-superscript','glyphicon-subscript'
                ,'glyphicon-menu-left','glyphicon-menu-right','glyphicon-menu-down','glyphicon-menu-up'];
    // 图标下拉选择器
    // ======================
    var IconSelect = function (element, options) {
        var icons = _.map( ICONS, function(icon){
                    return ['<li data-option="' + icon + '">',
                              '<span class="glyphicon ' + icon + '" aria-hidden="true"></span>',
                            '</li>'].join('');
                }).join('');
        var div = '<div class="bs-glyphicons"><ul class="bs-glyphicons-list">' + icons + '</ul></div>';
        var that = this;
        var $element = $(element);
        this.$element = $element;
        $element.find('ul.dropdown-menu').html(div)
            .on('click', 'li[data-option]', function(e){
                e.preventDefault();
                var $tgt = $(e.target).closest('li'),
                    selectLabel = $tgt.text(),
                    selectValue = $tgt.data('option');

                that.val(selectValue);
            });
    };


    IconSelect.prototype.val = function ( value ) {
        this.$element.find('span.form-control').removeClass().addClass("form-control glyphicon " + (value ? value : ""));
        this.$element.data('value', value);
    };


    // MODAL PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return this.each(function () {
          var $this   = $(this)
          var data    = $this.data('sharepage.iconselect')
          var options = $.extend({}, $this.data(), typeof option == 'object' && option)

          if (!data) $this.data('sharepage.iconselect', (data = new IconSelect(this, options)))
          if (typeof option == 'string') data[option](_relatedTarget)
          else if (options.show) data.show(_relatedTarget)
        })
    }

    var old = $.fn.modal

    $.fn.iconselect             = Plugin
    $.fn.iconselect.Constructor = IconSelect
}(jQuery);


+function ($) {
    'use strict';

    // 模块下拉选择器
    // ======================
    var ModuleSelect = function (element, options) {
        var that = this;
        var $element = $(element);
        this.$element = $element;
        // select
        $element.on('click', 'li[data-option]', function(e){
            e.preventDefault();
            var $tgt = $(e.target).closest('li'),
                selectLabel = $tgt.text(),
                selectValue = $tgt.data('option');

            that.select(selectLabel, selectValue);
        });
    };

    ModuleSelect.prototype.select = function ( label, value ) {
        this.$element.find(':input').val(label);
        this.$element.data('value', value);
    };

    ModuleSelect.prototype.val = function ( value ) {
        var label = this.$element.find('li[data-option='+ value+'] a').text();
        this.select(label, value);
    };

    // MODAL PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return this.each(function () {
          var $this   = $(this)
          var data    = $this.data('sharepage.moduleselect')
          var options = $.extend({}, $this.data(), typeof option == 'object' && option)

          if (!data) $this.data('sharepage.moduleselect', (data = new ModuleSelect(this, options)))
          if (typeof option == 'string') data[option](_relatedTarget)
          else if (options.show) data.show(_relatedTarget)
        })
    }

    var old = $.fn.modal

    $.fn.moduleselect             = Plugin
    $.fn.moduleselect.Constructor = ModuleSelect
}(jQuery);


// Module的一些全局定义
$.extend($M, {
    ACTIONS : [
        { action_id : '1', action_name : '查询', icon : 'glyphicon-search'},
        { action_id : '2', action_name : '添加', icon : 'glyphicon-search'},
        { action_id : '3', action_name : '删除', icon : 'glyphicon-search'},
        { action_id : '4', action_name : '修改', icon : 'glyphicon-search'},
        { action_id : '5', action_name : '导入', icon : 'glyphicon-search'},
        { action_id : '6', action_name : '导出', icon : 'glyphicon-search'},
        { action_id : '7', action_name : '审核', icon : 'glyphicon-search'},
    ],

    getAction : function(id){
        return _.find($M.ACTIONS, function(act){
            return act.action_id === id.toString() ;
        });
    },

    getActionByName : function(name){
        return _.find($M.ACTIONS, function(act){
            return act.action_name === name ;
        });
    },

    // 
    SETOPT : { 
        checkboxAsBoolean : true , 
        // 如果需要使用非boolean值来设置checkbox，请实现对应的代码
        // checkboxSetter : function(v){ 
        //     // checkbox的值提取为一个int值, 选中为1，没选中为0
        //     return v === 1 ;
        // } 
    },

    // 
    GETOPT : { 
        checkboxAsBoolean : true , 
        // 如果需要使用非boolean值来设置checkbox，请实现对应的代码
        // checkboxGetter : function(v){ 
        //     // checkbox的值提取为一个int值, 选中为1，没选中为2
        //     return v ? 1 : 2 ;
        // } 
    },

    doChangePass: function(){
        $.showmodal('#changePass'
            , function(fn){
                if ($('#changepass-form').validate().form()){
                    // save change
                    var data = $('#changepass-form').getdata();
                    if(data.newpass != data.newpass1)
                        return $.alert( '#changePass .modal-body', '两次输入的密码不一致', 10000);
                    
                    //修改密码
                    $M.doquery("/updatepass"
                        ,{ newpassword: data.newpass, password : data.oldpass }
                        ,{ successfn : function(result){
                                $.alert( '#changePass .modal-body', '修改密码成功，下次登录才会正式生效', 10000);
                                $('#saveBtn').attr('disabled', true);
                                setTimeout(function(){
                                    fn();
                                },5000);
                            }, 
                            failfn : function(err) {
                                $.alert('#changePass .modal-body', err);
                                return fn(err);
                            }
                        });
                }else{
                    $.alert('#changePass .modal-body', '输入错误', 10000);
                    fn(new Error('输入错误'));
                }
            }, null, { 
            title : "修改密码", 
            remote : "/changepass.html",
            filldata : function(e){
                $('#changepass-form').clearall();
                $('#saveBtn').attr('disabled',  false);
            }
        });
    },

    myinfo: function(){
        $.showmodal('#myInfo'
            , function(fn){
                // after show myinfo
            }, null, { 
            title : "我的信息", 
            remote : "/myinfo.html",
            filldata : function(e){
                $('#myinfo-form').clearall();
                $('#myinfo-form').autofill(user);
            }
        });
    },

    // 判断当前用户对当前模块是否拥有权限
    hasRight : function(needright) {
        if(!needright) return false;
        
        var acllist = user.privilege[PG.module];
        if(!acllist){
            console.error('模块[' + PG.module + '](PG.module)，权限不存在，请检查用户的权限配置');
            return false;
        }

        var action = $M.getActionByName(needright);
        if(!action) return false;

        return !! _.find( acllist, function(right) {  return  right === action.action_id });
    },
});


+function ($) {
    'use strict';

    // 模块下拉选择器
    // ======================
    var ModuleSelect = function (element, options) {
        var that = this;
        var $element = $(element);
        this.$element = $element;
        // select
        $element.on('click', 'li[data-option]', function(e){
            e.preventDefault();
            var $tgt = $(e.target).closest('li'),
                selectLabel = $tgt.text(),
                selectValue = $tgt.data('option');

            that.select(selectLabel, selectValue);
        });
    };

    ModuleSelect.prototype.select = function ( label, value ) {
        this.$element.find(':input').val(label);
        this.$element.data('value', value);
    };

    ModuleSelect.prototype.val = function ( value ) {
        var label = this.$element.find('li[data-option='+ value+'] a').text();
        this.select(label, value);
    };

    // MODAL PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return this.each(function () {
          var $this   = $(this)
          var data    = $this.data('sharepage.moduleselect')
          var options = $.extend({}, $this.data(), typeof option == 'object' && option)

          if (!data) $this.data('sharepage.moduleselect', (data = new ModuleSelect(this, options)))
          if (typeof option == 'string') data[option](_relatedTarget)
          else if (options.show) data.show(_relatedTarget)
        })
    }

    $.fn.moduleselect             = Plugin
    $.fn.moduleselect.Constructor = ModuleSelect
}(jQuery);


// ================== 教研组选择器 ====================
(function($){
    // 通过输入的内容执行快速查询
    var QuickTypeSelect = function (element, options) {
        var $element = $(element);
        this.$element = $element;
        this.options = options;
        var prefetch = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace(['name','py']),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            identify: function(obj) { return obj.id; },
            sufficient: 1,
            prefetch: {
                url : options.url,
                cache : options.cache || true,
                thumbprint : options.thumbprint,
                // 缓存一个小时的数据
                ttl : options.ttl || 3600000, 
                transform: function(response){
                    var py = $.pingyin();
                    return _.map(response, function(obj){
                        obj.py = py.first(obj.name).toLowerCase();
                        return obj;
                    });
                }
            }
          });
        this.prefetch = prefetch;

        var datasource = function withDefaults(q, sync) {
            var _sync = function(suggestions){
                // 如果设置了过滤器，需要对数据进行过滤
                if(options.filter)
                    suggestions = options.filter(suggestions);
                sync(suggestions);           
            };

            if (q === '') {
                _sync(prefetch.all());
            }else {
              prefetch.search(q, _sync);
            }
        }
        this.datasource = datasource;

        $element.typeahead({
              hint: true,
              minLength: 0,
              highlight: true
        },{
            name: 'prefetch',
            limit : 100,
            display : 'name',
            source: datasource,
            templates : {
                notFound : '<span class="alert">符合输入的项目不存在，请修改输入内容，非选择直接输入的内容无效</span>',    
                header : '<span class="alert">请输入名称或(拼音简码)，上下键选择或Tab键补全，非选择直接输入的内容无效</span>', 
                suggestion: options.suggestion || function(context){ 
                    return '<div>' + context.name + '<span class="h5">(' + context.py + ')</span></div>' ;
                }
            }
        }).on('typeahead:select', function(e, item){
            var $tgt = $(e.target);
            $tgt.data('select-item', item);
            $element.trigger('selectitem', item);
        }).on('typeahead:autocomplete', function(e, item){
            var $tgt = $(e.target);
            $tgt.data('select-item', item);
            $element.trigger('selectitem', item);
        }).on('typeahead:change', function(e, val){
            var $tgt = $(e.target),
                item = $tgt.data('select-item');
            $tgt.typeahead('val', item ? item.name : '');
        });

        this.typeahead = typeahead;
    };

    QuickTypeSelect.prototype.select = function ( value ) {
        var item = this.prefetch.get(value);
        if(item.length === 1){
            var select = item[0];
            this.$element.data('select-item', select);
            this.$element.typeahead('val', select.name);
        }else{
            console.log('OrgID不存在:%s', value);
            this.$element.data('select-item', null);
            this.$element.typeahead('val', null);
        }
        return this.$element;
    };

    /**
     * 设置或者取得选中的值
     */
    QuickTypeSelect.prototype.val = function ( value ) {
        if(value === undefined){
            var item = this.$element.data('select-item')
            return item ? item.id : null;
        }else{
            this.select(value);
        }
    };

    /* 
     * 清除输入框中的内容
     */
    QuickTypeSelect.prototype.clear = function ( value ) {
        this.$element.data('select-item', null);
        this.$element.typeahead('val', null);
        return this.$element;
    };

    /*
     * 设置数据集合的过滤函数
     */
    QuickTypeSelect.prototype.filter = function ( filter ) {
        if(filter === undefined){
            this.options.filter = undefined;
        }else{
            this.options.filter = filter;
        }
        return this.$element;
    };

    QuickTypeSelect.prototype.add = function (data) {
        this.prefetch.add(data);
        return this.$element;
    }

    /*
     * 设置数据集合的过滤函数
     */
    QuickTypeSelect.prototype.destroy = function () {
        this.$element.typeahead('destroy');
        this.$element.data('sharepage.teacherselect', null);
        return this.$element;
    };    

    // 组织结构选择框
    $.fn.orgselect = function(option, _relatedTarget) {
        var $this   = $(this)
        var data    = $this.data('sharepage.orgselect')
        var options = $.extend({
            url : '/hlc/web/majororg/enums.json'
        }, { thumbprint : $this.data('thumbprint')}, typeof option == 'object' && option)

        if (!data) $this.data('sharepage.orgselect', (data = new QuickTypeSelect(this, options)))
        if (typeof option == 'string') return data[option](_relatedTarget);

        return $this;
    }

    // 教师选择框
    $.fn.teacherselect = function(option, _relatedTarget) {
        var param = user.school_id ? $.param({data : { cond : {  school_id : user.school_id }} }) : '';

        var $this   = $(this)
        var data    = $this.data('sharepage.teacherselect')
        var options = $.extend({
            url : '/hlc/web/teacher/enums.json?' + param,
            suggestion : function(context){ 
                return '<div>' + context.name + '<span class="h5">(' + context.py + ')-' 
                    + (context.school_name ? context.school_name : '未指定校区') + '</span></div>' ;
            }
        }, { thumbprint : $this.data('thumbprint') } , typeof option == 'object' && option)

        if (!data) $this.data('sharepage.teacherselect', (data = new QuickTypeSelect(this, options)))
        if (typeof option == 'string') return data[option](_relatedTarget);

        return $this;
    }

    // 班级选择框
    $.fn.classselect = function(option, _relatedTarget) {
        var param = user.school_id ? $.param({data : { cond : {  school_id : user.school_id }} }) : '';

        var $this   = $(this)
        var data    = $this.data('sharepage.classselect')
        var options = $.extend({
            url : '/hlc/web/class/enums.json?' + param,
            suggestion : function(context){ 
                lesson_schedule = ( context.lesson_schedule === 1 ? '每周' : '每月' ) + context.lesson_schedule_val + '上课';
                var x = '<div>' + context.name + '<span class="h5">(' + context.py + ') | 教师:'+ context.teacher_name +
                    ' | 开始日期:'+ context.startdate + '' + lesson_schedule +'</span></div>' ;
                return x ;
            }
        }, { thumbprint : $this.data('thumbprint')}, typeof option == 'object' && option)

        if (!data) $this.data('sharepage.classselect', (data = new QuickTypeSelect(this, options)))
        if (typeof option == 'string') return data[option](_relatedTarget);

        return $this;
    }  

    // 学生选择框
    $.fn.classroomselect = function(option, _relatedTarget) {
        var param = user.school_id ? $.param({data : { cond : {  school_id : user.school_id }} }) : '';

        var $this   = $(this)
        var data    = $this.data('sharepage.classroomselect')
        var options = $.extend({
            url : '/hlc/web/classroom/enums.json?' + param,
            suggestion : function(context){ 
                return '<div>' + context.name + '<span class="h5">(' + context.py + ')-'+ context.school_name +'</span></div>' ;
            }
        }, { thumbprint : $this.data('thumbprint')}, typeof option == 'object' && option)

        if (!data) $this.data('sharepage.classroomselect', (data = new QuickTypeSelect(this, options)))
        if (typeof option == 'string') return data[option](_relatedTarget);

        return $this;
    }   

    // 学生选择框
    $.fn.studentselect = function(option, _relatedTarget) {
        var param = user.school_id ? $.param({data : { cond : {  school_id : user.school_id }} }) : '';

        var $this   = $(this)
        var data    = $this.data('sharepage.studentselect')
        var options = $.extend({
            url : '/hlc/web/student/enums.json?' + param,
            suggestion : function(context){
                return '<div>' + context.name + '<span class="h5">(' + context.py + ')-'+ context.address +'</span></div>' ;
            }
        }, { thumbprint : $this.data('thumbprint')}, typeof option == 'object' && option)

        if (!data) $this.data('sharepage.studentselect', (data = new QuickTypeSelect(this, options)))
        if (typeof option == 'string') return data[option](_relatedTarget);

        return $this;
    }   
})(jQuery);


// ========================= 文件上传和预览插件 ==========================
// 文件上传基于 fineuploader，不是太好但可以用
// 预览基于文件读取，支持简单的编码转换，可以gbk转换为utf-8
(function($){
    $.fn.createUploader = function( onUploadSuccess, opt ) {
        opt = $.extend({ baseDir : ''
                        , uploadPath : 'upload'   
                        , title : "上传文件（csv格式）" 
                        , validation: {
                            /*acceptFiles : 'text/csv,image/*',
                            allowedExtensions: ['jpg','png','csv']*/
                          },
                      },opt);
        this.fineUploader({
          request: {
            endpoint: opt.baseDir + '/' + opt.uploadPath
          },
          multiple : true,
          text: {
            uploadButton: '<i class="glyphicon glyphicon-cloud-upload"></i>' + opt.title
          },
          validation: opt.validation,
          template: '<div class="col-sm-12">' +
                      '<pre class="qq-upload-drop-area span12"><span>{dragZoneText}</span></pre>' +
                      '<div class="qq-upload-button btn btn-success" style="width: auto;">{uploadButtonText}</div>' +
                      '<span class="qq-drop-processing"><span>{dropProcessingText}</span><span class="qq-drop-processing-spinner"></span></span>' +
                      '<ul class="qq-upload-list" style="margin-top: 10px; text-align: center;"></ul>' +
                    '</div>',
          classes: {
            success: 'alert alert-success',
            fail: 'alert alert-error'
          }
        }).on('complete',function(event, id, fileName, result){
            var uuid = $(event.target).fineUploader('getUuid', id),
                uploadFileName = uuid + '_' + fileName;
            if(result.success && onUploadSuccess)
                onUploadSuccess(id, fileName, uploadFileName, result);
        });
    };
    

    // 预览上传到服务器上的目录
    $.fn.previewTextFile = function(uploadFileName, opt){
        var opt = opt || { baseDir : '/upload/preview'
                            , previewPath : ''
                            , encode : 'gbk'},
            self = this;

        $M.doquery( 
            opt.baseDir + opt.previewPath, 
            { f : uploadFileName, encode: 'gbk' }, 
            { 
                successfn : function(content){
                    self.empty().html(content.data);
                }, 
                failfn: function(errmsg){
                    self.empty().html('预览文件错误：' + errmsg);
                }, alertPosition : '#cellDiv'   });
    };
})(jQuery);



// 文件上传基于 fineuploader，不是太好但可以用
// 预览基于文件读取，支持简单的编码转换，可以gbk转换为utf-8
(function($){
    // 接收上传文件，并提供预览
    function _onUploadFormFileSuccess($el, target, noRemove, container){
        noRemove = noRemove || false;
        return function(id, filename, state){
            var isPic = /(.jpg)|(.png)/.test(filename.toLowerCase()),
              fileurl = window.basePath + '/' + state.url  ;

            // 把刚才上传的文件加入到预览
            var thumbnail =[
                '<div class="file-block col-xs-6 col-md-3" data-filename="' + state.url + '" data-target="' + target + '">',
                noRemove ? '': '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span></button>' ,
                  '<div style="height: 160px;" class="thumbnail"><a href="' + fileurl + '" target="pic_window">',
                    isPic ? 
                        '<img src="/hlc/images/loading.png" class="lazy" data-original="' + fileurl + '" style="display: block;max-height: 180px;">' : 
                        '<h2 style="text-align:center;"><span class="glyphicon glyphicon-paperclip"></span></h2><h5 style="text-align: center;">' + filename + '</h5>',
                  '</a></div>',
                '</div>'
            ];
            $el.closest('div.panel')
                .find('div.panel-body')
                .append(thumbnail.join(''))
                .find('img.lazy')
                .lazyload({
                    container : container,
                    effect : "fadeIn",
                    skip_invisible : true
                });
        }
    }; 

    // 读取上传的文件
    $.fn.fillUploadFile = function(data, opt){
        opt = $.extend({}, { 
                multi : true
            }, opt),
        this.find('div.file-block').each(function(i, el){
            var $el = $(el),
                target = $el.data('target'),
                file = $el.data('filename');
            
            if(opt.multi){
                if(data[target]){
                    data[target].push(file);
                }else{
                    data[target] = [file];
                }    
            }else{
                data[target] = file;
            }
        });
    };

    // 创建一个支持上传多个文件的面板
    // @data  : site data 数据
    // @opt.files : 可选，文件列表，如果不传入，使用data[target]
    $.fn.uploadPanel = function(data, opt){
        opt = $.extend({}, { 
                container : '#moduleDlg',
                multi : true
            }, opt);

        // 清除现有图片
        this.find('div.file-block').remove();

        var $el = this.find('div.fileuploader'),
            target = $el.data('target'),
            files = opt.files || data[target],
            uploadopt = $.extend({}, { title : $el.data('title')  }, opt.uploader),
            picRender = _onUploadFormFileSuccess($el, target, false,opt.container);

        if(!$el.data('bind-uploader')){
          $el.createUploader( picRender, uploadopt);
          $el.data('bind-uploader', true )  
        }

        if(!Array.isArray(files)){
            files  = [files];
        }
        if(files){
            $.each(files, function(i, file){
              if(file)
                picRender(i, file.replace(/^.*_/,''), {
                    url : file
                });
            });
        }
    };

    $.fn.filePanel = function(data, opt){
        // 清除现有图片
        this.find('div.file-block').remove();
        

        var opt = opt || { container : '#moduleDlg' },
            $el = this,
            target = $el.data('target'),
            files = opt.files || data[target],
            picRender = _onUploadFormFileSuccess($el, target, true,opt.container);

        if(!Array.isArray(files)){
            files  = [files];
        }
        if(files){
            $.each(files, function(i, file){
                picRender(i, file.replace(/^.*_/,''), {
                    url : file
                });
            });
        }
    }
})(jQuery);

