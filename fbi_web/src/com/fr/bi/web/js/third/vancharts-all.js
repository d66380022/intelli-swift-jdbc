/**
 * Created by eason on 15/12/25.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        //Allow using this built library as an AMD module
        //in another project. That other project will only
        //see this AMD call, not the internal modules in
        //the closure below.
        define([], factory);
    } else {
        //Browser globals case. Just assign the
        //result to a property on the global.
        root.VanCharts = factory();
    }
}(this, function () {
/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                    hasProp(waiting, depName) ||
                    hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());
define("almond", function(){});

/**
 * Created by eason on 15/5/4.
 */
define('Constants',[],function(){
    return {

        INSTANCES_KEY:'vancharts_index_',

        SELECT_ANIMATION:'select',

        //图表类型
        BAR_CHART:'bar',//条形图
        COLUMN_CHART:'column',//柱形图
        LINE_CHART:'line',//折线图
        AREA_CHART:'area',//面积图
        PIE_CHART:'pie',//饼图
        SCATTER_CHART:'scatter',//散点图
        BUBBLE_CHART:'bubble',//气泡图
        GAUGE_CHART:'gauge',//仪表盘
        RADAR_CHART:'radar',//雷达图

        //组件类型
        X_AXIS_COMPONENT:'xAxis',
        Y_AXIS_COMPONENT:'yAxis',
        VALUE_AXIS_COMPONENT:'value',
        CATEGORY_AXIS_COMPONENT:'category',
        DATE_AXIS_COMPONENT:'datetime',
        DATA_SHEET_COMPONENT:'dataSheet',
        LEGEND_COMPONENT:'legend',
        TITLE_COMPONENT:'title',
        AXIS_COMPONENT:'axis',
        TOOLTIP_COMPONENT:'tooltip',
        TOOLBAR_COMPONENT:'tools',
        ZOOM_COMPONENT:'zoom',
        RANGE_LEGEND_COMPONENT:'rangeLegend',

        VANCHART:'vanchart',

        //工具栏的icon类型
        MAX_ICON : 'vancharts-icon-max',
        MIN_ICON:'vancharts-icon-min',
        MENU_ICON : 'vancharts-icon-menu',
        REFRESH_ICON : 'vancharts-icon-refresh',
        DECREASE_ICON : 'vancharts-icon-decrease',
        INCREASE_ICON : 'vancharts-icon-increase',
        EXPORT_ICON : 'vancharts-icon-export',

        //线粗细相关的常量
        LINE_NONE: 0,
        LINE_THIN: 1,
        LINE_MEDIUM: 2,
        LINE_THICK:5,

        //位置相关的常量
        BOTTOM:'bottom',
        TOP:'top',
        LEFT:'left',
        RIGHT:'right',
        RIGHT_TOP:'right-top',

        //动画的方向
        LEFT_TO_RIGHT:'left-to-right',
        RIGHT_TO_LEFT:'right-to-right',
        BOTTOM_TO_TOP:'bottom-to-top',
        TOP_TO_BOTTOM:'top-to-botttom',

        //标记点类型
        NULL_MARKER:'null_marker',
        CIRCLE:'circle',
        SQUARE:'square',
        DIAMOND:'diamond',
        TRIANGLE:'triangle',

        CIRCLE_HOLLOW:'circle_hollow',
        SQUARE_HOLLOW:'square_hollow',
        DIAMOND_HOLLOW:'diamond_hollow',
        TRIANGLE_HOLLOW:'triangle_hollow',

        //图例的另外三种类型
        NORMAL_ICON:'normal-legend-icon',//一般的图例
        PIE_ICON:'pie-legend-icon',
        DONUT_ICON:'donut-legend-icon',
        BUBBLE_ICON:'bubble-legend-icon',
        SCATTER_ICON:'scatter-legend-icon',

        //虚线的类型
        DASH_TYPE:{
            Solid:'0,0',
            Dash:'8,6'
        },

        //玫瑰图的不同形状
        SAME_ARC : 'sameArc',//所有扇形弧长相同
        DIFFERENT_ARC : 'differentArc',//所有扇形弧长不相等

        //图的排序的状态
        DISORDER:'disorder',
        DESCENDING:'descending',
        ASCENDING:'ascending',

        //图的状态
        STATE_INIT:'init-state',//初始状态
        STATE_RESTORE_REFRESH:'restore-refresh-state',//缩放后的刷新状态
        STATE_CHANGE_DATA_REFRESH:'change-data-refresh-state',//自动刷新（数据变换）状态
        STATE_ZOOM_REFRESH:'zoom-refresh-state',//缩放状态

        //标签的位置
        OUTSIDE : 'outside',
        INSIDE : 'inside',
        CENTER:'center',

        //各种渲染器的名字
        VANCHART_SVG:'vanchart-svg-render',
        VANCHART_VML:'vanchart-vml-render',

        PIE_SVG:'pie-svg-render',
        PIE_VML:'pie-vml-render',

        BAR_SVG:'bar-svg-render',
        BAR_VML:'bar-vml-render',

        LINE_SVG:'line-svg-render',
        LINE_VML:'line-vml-render',

        AREA_SVG:'area-svg-render',
        AREA_VML:'area-vml-render',

        GAUGE_SVG:'gauge-svg-render',
        GAUGE_VML:'gauge-vml-render',

        RADAR_SVG:'radar-svg-render',
        RADAR_VML:'radar-vml-render',

        BUBBLE_SVG:'bubble-svg-render',
        BUBBLE_VML:'bubble-vml-render',

        SCATTER_SVG:'scatter-svg-render',
        SCATTER_VML:'scatter-vml-render',

        TITLE_SVG:'title-svg-render',
        TITLE_VML:'title-vml-render',
        LEGEND_SVG:'legend-svg-render',
        LEGEND_VML:'legend-vml-render',
        RANGE_LEGEND_SVG:'range-legend-svg-render',
        RANGE_LEGEND_VML:'range-legend-vml-render',
        TOOLBAR_SVG:'toolbar-svg-render',
        TOOLBAR_VML:'toolbar-vml-render',

        ZOOM_SVG:'zoom-svg-render',

        DATA_SHEET_SVG:'data-sheet-svg-render',
        DATA_SHEET_VML:'data-sheet-vml-render',

        AXIS_RENDER:'axis-render',
        CATEGORY_AXIS_SVG:'category-axis-svg-render',
        CATEGORY_AXIS_VML:'category-axis-vml-render',
        VALUE_AXIS_SVG:'value-axis-svg-render',
        VALUE_AXIS_VML:'value-axis-vml-render',
        DATE_AXIS_SVG:'date-axis-svg-render',
        DATE_AXIS_VML:'date-axis-vml-render',

        //样式的名字
        STYLE_GRADUAL:'gradual', //渐变

        //四种仪表盘的样式
        GAUGE_POINTER:'pointer',
        GAUGE_POINTER_SEMI:'pointer_semi',
        GAUGE_SLOT:'slot',
        GAUGE_THERMOMETER:'thermometer',
        GAUGE_RING:'ring',

        //仪表盘布局
        HORIZONTAL_LAYOUT:'horizontal',
        VERTICAL_LAYOUT:'vertical',

        //雷达图底边
        POLYGON_RADAR:'polygon',
        CIRCLE_RADAR:'circle',

        //数据监控
        MONITOR:'monitor',

        //size是通过气泡的半径还是面积表现出来
        SIZE_BY_AREA:'area',
        SIZE_BY_WIDTH:'width',

        TOOLTIP_CATEGORY_STYLE: '<span style="font-size:16px;font-family:Verdana;color:white;">',
        TOOLTIP_SERIES_STYLE: '<span style="font-size:14px;font-family:Verdana;color:white">',
        TOOLTIP_VALUE_STYLE: '<span style="font-size:14px;font-family:Verdana;font-weight:bold;color:white">'
    }

});
/**
 * Created by eason on 15/6/30.
 * some of the following methods are borrowed from zrender
 */

//Copyright (c) 2013, Baidu Inc.
//    All rights reserved.
//
//    Redistribution and use of this software in source and binary forms, with or
//    without modification, are permitted provided that the following conditions
//are met:
//
//    Redistributions of source code must retain the above copyright notice, this
//list of conditions and the following disclaimer.
//
//    Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//and/or other materials provided with the distribution.
//
//    Neither the name of Baidu Inc. nor the names of its contributors may be used
//to endorse or promote products derived from this software without specific
//prior written permission of Baidu Inc.
//
//    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
//ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
//ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
//SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

define('utils/ColorUtils',[],function(){
    var _nameColors = {
        aliceblue : '#f0f8ff',
        antiquewhite : '#faebd7',
        aqua : '#0ff',
        aquamarine : '#7fffd4',
        azure : '#f0ffff',
        beige : '#f5f5dc',
        bisque : '#ffe4c4',
        black : '#000',
        blanchedalmond : '#ffebcd',
        blue : '#00f',
        blueviolet : '#8a2be2',
        brown : '#a52a2a',
        burlywood : '#deb887',
        cadetblue : '#5f9ea0',
        chartreuse : '#7fff00',
        chocolate : '#d2691e',
        coral : '#ff7f50',
        cornflowerblue : '#6495ed',
        cornsilk : '#fff8dc',
        crimson : '#dc143c',
        cyan : '#0ff',
        darkblue : '#00008b',
        darkcyan : '#008b8b',
        darkgoldenrod : '#b8860b',
        darkgray : '#a9a9a9',
        darkgrey : '#a9a9a9',
        darkgreen : '#006400',
        darkkhaki : '#bdb76b',
        darkmagenta : '#8b008b',
        darkolivegreen : '#556b2f',
        darkorange : '#ff8c00',
        darkorchid : '#9932cc',
        darkred : '#8b0000',
        darksalmon : '#e9967a',
        darkseagreen : '#8fbc8f',
        darkslateblue : '#483d8b',
        darkslategray : '#2f4f4f',
        darkslategrey : '#2f4f4f',
        darkturquoise : '#00ced1',
        darkviolet : '#9400d3',
        deeppink : '#ff1493',
        deepskyblue : '#00bfff',
        dimgray : '#696969',
        dimgrey : '#696969',
        dodgerblue : '#1e90ff',
        firebrick : '#b22222',
        floralwhite : '#fffaf0',
        forestgreen : '#228b22',
        fuchsia : '#f0f',
        gainsboro : '#dcdcdc',
        ghostwhite : '#f8f8ff',
        gold : '#ffd700',
        goldenrod : '#daa520',
        gray : '#808080',
        grey : '#808080',
        green : '#008000',
        greenyellow : '#adff2f',
        honeydew : '#f0fff0',
        hotpink : '#ff69b4',
        indianred : '#cd5c5c',
        indigo : '#4b0082',
        ivory : '#fffff0',
        khaki : '#f0e68c',
        lavender : '#e6e6fa',
        lavenderblush : '#fff0f5',
        lawngreen : '#7cfc00',
        lemonchiffon : '#fffacd',
        lightblue : '#add8e6',
        lightcoral : '#f08080',
        lightcyan : '#e0ffff',
        lightgoldenrodyellow : '#fafad2',
        lightgray : '#d3d3d3',
        lightgrey : '#d3d3d3',
        lightgreen : '#90ee90',
        lightpink : '#ffb6c1',
        lightsalmon : '#ffa07a',
        lightseagreen : '#20b2aa',
        lightskyblue : '#87cefa',
        lightslategray : '#789',
        lightslategrey : '#789',
        lightsteelblue : '#b0c4de',
        lightyellow : '#ffffe0',
        lime : '#0f0',
        limegreen : '#32cd32',
        linen : '#faf0e6',
        magenta : '#f0f',
        maroon : '#800000',
        mediumaquamarine : '#66cdaa',
        mediumblue : '#0000cd',
        mediumorchid : '#ba55d3',
        mediumpurple : '#9370d8',
        mediumseagreen : '#3cb371',
        mediumslateblue : '#7b68ee',
        mediumspringgreen : '#00fa9a',
        mediumturquoise : '#48d1cc',
        mediumvioletred : '#c71585',
        midnightblue : '#191970',
        mintcream : '#f5fffa',
        mistyrose : '#ffe4e1',
        moccasin : '#ffe4b5',
        navajowhite : '#ffdead',
        navy : '#000080',
        oldlace : '#fdf5e6',
        olive : '#808000',
        olivedrab : '#6b8e23',
        orange : '#ffa500',
        orangered : '#ff4500',
        orchid : '#da70d6',
        palegoldenrod : '#eee8aa',
        palegreen : '#98fb98',
        paleturquoise : '#afeeee',
        palevioletred : '#d87093',
        papayawhip : '#ffefd5',
        peachpuff : '#ffdab9',
        peru : '#cd853f',
        pink : '#ffc0cb',
        plum : '#dda0dd',
        powderblue : '#b0e0e6',
        purple : '#800080',
        red : '#f00',
        rosybrown : '#bc8f8f',
        royalblue : '#4169e1',
        saddlebrown : '#8b4513',
        salmon : '#fa8072',
        sandybrown : '#f4a460',
        seagreen : '#2e8b57',
        seashell : '#fff5ee',
        sienna : '#a0522d',
        silver : '#c0c0c0',
        skyblue : '#87ceeb',
        slateblue : '#6a5acd',
        slategray : '#708090',
        slategrey : '#708090',
        snow : '#fffafa',
        springgreen : '#00ff7f',
        steelblue : '#4682b4',
        tan : '#d2b48c',
        teal : '#008080',
        thistle : '#d8bfd8',
        tomato : '#ff6347',
        turquoise : '#40e0d0',
        violet : '#ee82ee',
        wheat : '#f5deb3',
        white : '#fff',
        whitesmoke : '#f5f5f5',
        yellow : '#ff0',
        yellowgreen : '#9acd32'
    };

    var colorRegExp = /^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\))\s*$/i;

    function trim(color) {
        return String(color).replace(/\s+/g, '');
    }

    // 调整值区间
    function adjust(value, region) {
        if (value <= region[0]) {
            value = region[0];
        }
        else if (value >= region[1]) {
            value = region[1];
        }
        return value;
    }

    // 数组映射
    function map(array, fun) {
        if (typeof fun !== 'function') {
            throw new TypeError();
        }
        var len = array ? array.length : 0;
        for (var i = 0; i < len; i++) {
            array[i] = fun(array[i]);
        }
        return array;
    }

    /**
     * 把颜色转化成数组数据，用于计算
     * @param color 颜色
     */
    function getRGBAColorArray(color){
        if (_nameColors[color]) {
            color = _nameColors[color];
        }

        color = trim(color);

        if (/^#[\da-f]{3}$/i.test(color)) {
            color = parseInt(color.slice(1), 16);
            var r = (color & 0xf00) << 8;
            var g = (color & 0xf0) << 4;
            var b = color & 0xf;

            color = '#' + ((1 << 24) + (r << 4) + r + (g << 4) + g + (b << 4) + b).toString(16).slice(1);
        }

        var r = color.match(colorRegExp);

        var d;
        var a;
        var data = [];
        var rgb;

        if (r[2]) {
            // #rrggbb
            d = r[2].replace('#', '').split('');
            rgb = [ d[0] + d[1], d[2] + d[3], d[4] + d[5] ];
            data = map(rgb,
                function(c) {
                    return adjust(parseInt(c, 16), [ 0, 255 ]);
                }
            );
        } else if (r[4]) {
            // rgb rgba
            var rgba = (r[4]).split(',');
            a = rgba[3];
            rgb = rgba.slice(0, 3);
            data = map(
                rgb,
                function(c) {
                    c = Math.floor(
                        c.indexOf('%') > 0 ? parseInt(c, 0) * 2.55 : c
                    );
                    return adjust(c, [ 0, 255 ]);
                }
            );

            if (typeof a !== 'undefined') {
                data.push(adjust(parseFloat(a), [ 0, 1 ]));
            }
        }


        //统一rgba的格式
        if(data.length == 3){
            data.push(1);
        }

        return data;
    }

    function toColor(data, format){
        format = format || 'rgb';
        if (data && (data.length === 3 || data.length === 4)) {
            data = map(data,
                function(c) {
                    return c > 1 ? Math.ceil(c) : c;
                }
            );

            if (format.indexOf('hex') > -1) {
                return '#' + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + (+data[2])).toString(16).slice(1);
            }
            else if (format.indexOf('hs') > -1) {
                var sx = map(data.slice(1, 3),
                    function(c) {
                        return c + '%';
                    }
                );
                data[1] = sx[0];
                data[2] = sx[1];
            }

            if (format.indexOf('a') > -1) {
                if (data.length === 3) {
                    data.push(1);
                }
                data[3] = adjust(data[3], [ 0, 1 ]);
                return format + '(' + data.slice(0, 4).join(',') + ')';
            }

            return format + '(' + data.slice(0, 3).join(',') + ')';
        }
    }

    function getHighLightColor(color){
        var rgba = getRGBAColorArray(color);
        var tmp = [];
        for(var i = 0; i < 3; i++){
            var x = rgba[i];
            if(x <= 128){
                tmp.push(adjust(x-(255-x)*(255-2*x)/(2*x), [0,255]));
            }else{
                tmp.push(adjust(x+x*(2*x-255)/(2*(255-x)), [0,255]));
            }
        }

        var result = [];
        for(i = 0; i < 3; i++){
            result.push(0.65 * rgba[i] + 0.35 * tmp[i]);
        }

        if(rgba[3]) {
            result.push(rgba[3]);
            return toColor(result, 'rgba');
        }

        return toColor(result);
    }

    function getColorWithDivider(color, divider){
        var rgba = getRGBAColorArray(color);

        for(var i = 0; i < 3; i++){
            rgba[i] /= divider;
        }

        return toColor(rgba, 'rgba');
    }

    function getClickColor(color){

        var rgba = getRGBAColorArray(color);

        for(var i = 0; i < 3; i++){
            rgba[i] *= 0.95;
        }

        return toColor(rgba, 'rgba');
    }

    function mixColorWithAlpha(color, alpha){
        var rgba = getRGBAColorArray(color);
        rgba[3] = alpha;
        return toColor(rgba, 'rgba');
    }

    function mixColorWithHSB(color, detH, detS, detB){
        var rgba = getRGBAColorArray(color);

        var hsb = rgb2hsb(rgba[0], rgba[1], rgba[2]);

        hsb[0] += detH;
        hsb[1] += detS;
        hsb[2] += detB;

        var rgb = hsb2rgb(hsb[0], hsb[1], hsb[2]);

        return toColor(rgb, 'rgb');
    }

    function hsb2rgb(hue, saturation, brightness){

        saturation = Math.min(1, Math.max(0, saturation));

        brightness = Math.min(1, Math.max(0, brightness));

        var r = 0, g = 0, b = 0;
        if (saturation === 0) {
            r = g = b = brightness * 255.0 + 0.5;
        } else {
            var h = (hue - Math.floor(hue)) * 6.0;
            var f = h - Math.floor(h);
            var p = brightness * (1.0 - saturation);
            var q = brightness * (1.0 - saturation * f);
            var t = brightness * (1.0 - (saturation * (1.0 - f)));
            switch (Math.floor(h)) {
                case 0:
                    r = brightness * 255.0 + 0.5;
                    g = t * 255.0 + 0.5;
                    b = p * 255.0 + 0.5;
                    break;
                case 1:
                    r = q * 255.0 + 0.5;
                    g = brightness * 255.0 + 0.5;
                    b = p * 255.0 + 0.5;
                    break;
                case 2:
                    r = p * 255.0 + 0.5;
                    g = brightness * 255.0 + 0.5;
                    b = t * 255.0 + 0.5;
                    break;
                case 3:
                    r = p * 255.0 + 0.5;
                    g = q * 255.0 + 0.5;
                    b = brightness * 255.0 + 0.5;
                    break;
                case 4:
                    r = t * 255.0 + 0.5;
                    g = p * 255.0 + 0.5;
                    b = brightness * 255.0 + 0.5;
                    break;
                case 5:
                    r = brightness * 255.0 + 0.5;
                    g = p * 255.0 + 0.5;
                    b = q * 255.0 + 0.5;
                    break;
            }
        }
        var rgb = [];
        rgb.push(Math.floor(r));
        rgb.push(Math.floor(g));
        rgb.push(Math.floor(b));
        return rgb;
    }

    function rgb2hsb(r, g, b){

        var hue, saturation, brightness;

        var hsbvals = [3];
        var cmax = (r > g) ? r : g;
        if (b > cmax) {
            cmax = b;
        }
        var cmin = (r < g) ? r : g;
        if (b < cmin) {
            cmin = b;
        }

        brightness = cmax / 255.0;
        if (cmax !== 0) {
            saturation = (cmax - cmin) / cmax;
        }else{
            saturation = 0;
        }


        if (saturation === 0) {
            hue = 0;
        }else{
            var redc = (cmax - r) / (cmax - cmin);
            var greenc = (cmax - g) / (cmax - cmin);
            var bluec = (cmax - b) / (cmax - cmin);
            if (r == cmax) {
                hue = bluec - greenc;
            }
            else if (g == cmax) {
                hue = 2.0 + redc - bluec;
            }
            else {
                hue = 4.0 + greenc - redc;
            }
            hue = hue / 6.0;
            if (hue < 0) {
                hue = hue + 1.0;
            }
        }

        hsbvals[0] = hue;
        hsbvals[1] = saturation;
        hsbvals[2] = brightness;
        return hsbvals;
    }

    function getColorOpacity(color){
        var rgba = getRGBAColorArray(color);

        //透明度
        return rgba[3];
    }

    //没有a定义的话返回空
    function getColorOpacityWithoutDefault(color){

        return (color && typeof color == 'string' && (color.indexOf('rgba') != -1))
                                                    ? getColorOpacity(color) : undefined;

    }

    function colorToHex(color){
        return colorToHexAlpha(color).hex;
    }

    function colorToHexAlpha(color){
        var rgb = toColor(getRGBAColorArray(color), 'rgba');

        var rRgba = /rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(,([.\d]+))?\)/,
            r, g, b, a,
            rsa = rgb.replace(/\s+/g, "").match(rRgba);

        r = (+rsa[1]).toString(16);
        r = r.length === 1 ? "0" + r : r;
        g = (+rsa[2]).toString(16);
        g = g.length === 1 ? "0" + g : g;
        b = (+rsa[3]).toString(16);
        b = b.length === 1 ? "0" + b : b;
        a = (+(rsa[5] ? rsa[5] : 1)) * 100;

        return {hex: "#" + r + g + b, alpha: Math.ceil(a)};
    }

    return {
        mixColorWithHSB:mixColorWithHSB,
        getHighLightColor:getHighLightColor,
        getColorWithDivider:getColorWithDivider,
        mixColorWithAlpha:mixColorWithAlpha,
        getColorOpacity:getColorOpacity,
        getColorOpacityWithoutDefault:getColorOpacityWithoutDefault,
        colorToHex:colorToHex,
        colorToHexAlpha:colorToHexAlpha,
        getClickColor:getClickColor
    }

});
/**
 * Created by eason on 15/6/16.
 */

define('utils/QueryUtils',['require','./BaseUtils'],function(require){
    var BaseUtils = require('./BaseUtils');

    //从选项中读出指定属性
    function query(opt, optLocation){
        if(!opt || !optLocation){
            return;
        }

        optLocation = optLocation.split('.');
        for(var index = 0, length = optLocation.length; index < length; index++){
            opt = opt[optLocation[index]];

            //这里的opt可能为0,false等
            if(opt == undefined){
                return;
            }
        }

        return opt;
    }


    //从可能的属性列表里读optLocation的属性，前面的优先级高
    function queryList(optList, optLocation){
        if(!optList || !optList.length || !optLocation){
            return undefined;
        }

        for(var i = 0; i < optList.length; i++){
            var result = query(optList[i], optLocation);
            if(result != undefined){
                return result;
            }
        }
    }

    function merge(target, source, overwrite){
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                var targetProp = target[key];
                if (typeof targetProp == 'object') {

                    //target[key]不为对象时？
                    merge(target[key], source[key], overwrite);
                }else if(overwrite || !(key in target)){
                    target[key] = source[key];
                }
            }
        }
        return target;
    }


    //从list里合并需要的选项
    function mergeList(optList, optLocation){
        if(!optList || !optList.length || !optLocation){
            return undefined;
        }

        var result;
        for(var i = 0, length = optList.length; i < length; i++){
            var tmpOption = query(optList[i], optLocation);

            if(result == undefined){
                result = BaseUtils.clone(tmpOption);
            }else{
                merge(result, tmpOption);
            }
        }

        return result;
    }

    return {
        mergeList:mergeList,
        queryList:queryList,
        query:query,
        merge:merge
    };
});
/**
 * Created by eason on 15/5/18.
 * 各种注册了的组件
 */
define('ComponentLibrary',[],function(){
    var _registeredComponents = Object.create(null);

    /**
     * 根据名字获得组件的function
     * @param name 组件的名字
     */
    function get(name){
        return _registeredComponents[name];
    }

    /**
     * 注册某种组件类型
     * @param name 组件的名字
     * @param chart 组件的实现
     */
    function register(name, compnent){
        _registeredComponents[name] = compnent;
    }

    return {
        get:get,
        register:register
    }

});
/**
 * Created by eason on 15/5/4.
 * 注册了的图表的工厂,所有加载的图表模块都在这里注册
 */
define('ChartLibrary',[],function(){
    var _registeredCharts = {};

    /**
     * 根据名字获得某种图表类型的function
     * @param name 图表名字
     */
    function get(name){
        return _registeredCharts[name];
    }

    /**
     * 注册某种图表类型
     * @param name 图表的名字
     * @param chart 图表的实现
     */
    function register(name, chart){
        _registeredCharts[name] = chart;
    }

    return {
        get:get,
        register:register
    }
});
/**
 * Created by eason on 15/8/12.
 * 各种注册了的渲染器
 */

define('render/RenderLibrary',[],function(){
    var _registeredRender = Object.create(null);

    /**
     * 根据名字获得渲染器的function
     * @param name 渲染器的名字
     */
    function get(name){
        return _registeredRender[name];
    }

    function getRender(name, attrObj){
        var RenderFunction = get(name);
        if(RenderFunction){
            return new RenderFunction(attrObj);
        }
    }

    /**
     * 注册某种渲染器
     * @param name 渲染器的名字
     * @param chart 渲染器的实现
     */
    function register(name, compnent){
        _registeredRender[name] = compnent;
    }

    return {
        get:get,
        getRender:getRender,
        register:register
    }

});
/**
 * Created by eason on 15/8/13.
 */
define('render/RenderFactory',['require','./RenderLibrary','../Constants','../utils/BaseUtils'],function(require){

    var RenderLibrary = require('./RenderLibrary');

    var Constants = require('../Constants');

    var BaseUtils = require('../utils/BaseUtils');

    var SVG_MAP = {};

    SVG_MAP[Constants.VANCHART] = Constants.VANCHART_SVG;
    SVG_MAP[Constants.PIE_CHART] = Constants.PIE_SVG;
    SVG_MAP[Constants.BAR_CHART] = Constants.BAR_SVG;
    SVG_MAP[Constants.COLUMN_CHART] = Constants.BAR_SVG;
    SVG_MAP[Constants.LINE_CHART] = Constants.LINE_SVG;
    SVG_MAP[Constants.AREA_CHART] = Constants.AREA_SVG;
    SVG_MAP[Constants.GAUGE_CHART] = Constants.GAUGE_SVG;
    SVG_MAP[Constants.RADAR_CHART] = Constants.RADAR_SVG;
    SVG_MAP[Constants.BUBBLE_CHART] = Constants.BUBBLE_SVG;
    SVG_MAP[Constants.SCATTER_CHART] = Constants.SCATTER_SVG;

    SVG_MAP[Constants.TITLE_COMPONENT] = Constants.TITLE_SVG;
    SVG_MAP[Constants.LEGEND_COMPONENT] = Constants.LEGEND_SVG;
    SVG_MAP[Constants.TOOLBAR_COMPONENT] = Constants.TOOLBAR_SVG;
    SVG_MAP[Constants.X_AXIS_COMPONENT] = Constants.AXIS_RENDER;
    SVG_MAP[Constants.Y_AXIS_COMPONENT] = Constants.AXIS_RENDER;
    SVG_MAP[Constants.CATEGORY_AXIS_COMPONENT] = Constants.CATEGORY_AXIS_SVG;
    SVG_MAP[Constants.VALUE_AXIS_COMPONENT] = Constants.VALUE_AXIS_SVG;
    SVG_MAP[Constants.DATE_AXIS_COMPONENT] = Constants.DATE_AXIS_SVG;
    SVG_MAP[Constants.ZOOM_COMPONENT] = Constants.ZOOM_SVG;
    SVG_MAP[Constants.DATA_SHEET_COMPONENT] = Constants.DATA_SHEET_SVG;
    SVG_MAP[Constants.RANGE_LEGEND_COMPONENT] = Constants.RANGE_LEGEND_SVG;

    var VML_MAP = {};
    VML_MAP[Constants.VANCHART] = Constants.VANCHART_VML;
    VML_MAP[Constants.PIE_CHART] = Constants.PIE_VML;
    VML_MAP[Constants.BAR_CHART] = Constants.BAR_VML;
    VML_MAP[Constants.COLUMN_CHART] = Constants.BAR_VML;
    VML_MAP[Constants.LINE_CHART] = Constants.LINE_VML;
    VML_MAP[Constants.AREA_CHART] = Constants.AREA_VML;
    VML_MAP[Constants.GAUGE_CHART] = Constants.GAUGE_VML;
    VML_MAP[Constants.RADAR_CHART] = Constants.RADAR_VML;
    VML_MAP[Constants.BUBBLE_CHART] = Constants.BUBBLE_VML;
    VML_MAP[Constants.SCATTER_CHART] = Constants.SCATTER_VML;

    VML_MAP[Constants.TITLE_COMPONENT] = Constants.TITLE_VML;
    VML_MAP[Constants.LEGEND_COMPONENT] = Constants.LEGEND_VML;
    VML_MAP[Constants.TOOLBAR_COMPONENT] = Constants.TOOLBAR_VML;
    VML_MAP[Constants.X_AXIS_COMPONENT] = Constants.AXIS_RENDER;
    VML_MAP[Constants.Y_AXIS_COMPONENT] = Constants.AXIS_RENDER;
    VML_MAP[Constants.CATEGORY_AXIS_COMPONENT] = Constants.CATEGORY_AXIS_VML;
    VML_MAP[Constants.VALUE_AXIS_COMPONENT] = Constants.VALUE_AXIS_VML;
    VML_MAP[Constants.DATE_AXIS_COMPONENT] = Constants.DATE_AXIS_VML;
    VML_MAP[Constants.DATA_SHEET_COMPONENT] = Constants.DATA_SHEET_VML;
    VML_MAP[Constants.RANGE_LEGEND_COMPONENT] = Constants.RANGE_LEGEND_VML;

    function getRender(componentTpe, attrObj){

        var renderName = BaseUtils.isSupportSVG() ?
                                SVG_MAP[componentTpe] : VML_MAP[componentTpe];

        return RenderLibrary.getRender(renderName, attrObj);
    }

    return {
        getRender:getRender
    }

});
/**
 * Created by eason on 16/2/19.
 * 处理事件
 */

define('Handler',['require','./utils/BaseUtils','./Constants'],function(require){

    var MIN_DISTANCE = 5;

    var BaseUtils = require('./utils/BaseUtils');
    var Constants = require('./Constants');

    function Handler(vanchart){

        this.vanchart = vanchart;

        this._setDomEvents();
    }

    Handler.prototype = {

        _setDomEvents:function(){

            var parent = this.vanchart.dom;

            if(BaseUtils.hasTouch()){

                BaseUtils.addEvent(parent, 'touchstart', this._onContainerTouchStart.bind(this));

                BaseUtils.addEvent(parent, 'touchend', this._onContainerTouchEnd.bind(this));

            }else{

                BaseUtils.addEvent(parent, 'mousedown', this._onContainerMouseDown.bind(this));

                BaseUtils.addEvent(parent, 'mouseup', this._onContainerMouseUp.bind(this));

                BaseUtils.addEvent(parent, 'mousemove', this._onContainerMouseMove.bind(this));

                BaseUtils.addEvent(parent, 'mouseleave', this._onContainerMouseLeave.bind(this));
            }
        },

        trackerPointLeave:function(event){

            var point = this._getPointData(event);

            if(point){
                point.series.chart.cancelChosenState(point);
            }

            this._hideTooltip();

            if(point == this.vanchart.hoverPoint){
                this.vanchart.hoverPoint = null;
            }
        },

        trackerPointMove:function(event){
            this._showTooltip(event);
        },

        trackerPointEnter:function(event){
            var point = this._getPointData(event);
            this.updateHoverPoint(point, event);
        },

        trackerPointDown:function(){

            var point = this.vanchart.hoverPoint;

            if(point){
                point.series.chart.makeClickedState(point);
            }
        },

        trackerPointUp:function(event){

            var point = this.vanchart.hoverPoint;

            if(point){
                point.series.chart.cancelClickedState(point);
                point.onClick(event);
            }
        },

        trackerSeriesEnter:function(event){

            var series = this._getSeriesData(event);

            series.chart.makeSeriesChosenState(series);

            this.vanchart.hoverSeries = series;
        },

        trackerSeriesLeave:function(event){

            var series = this._getSeriesData(event);

            series.chart.cancelSeriesChosenState(series);
        },

        trackerPointTouchStart:function(event){

            event = event || window.event;
            var target = event.target || event.srcElement;

            var point = d3.select(target).datum();

            this.updateHoverPoint(point, event);

            this._showTooltip(event);

            event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true;
        },

        trackerPointTouchEnd:function(event){

            var point = this.vanchart.hoverPoint;

            if(point){
                point.onClick(event);
            }

            event = event || window.event;

            event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true;
        },

        //走到这边的都是没点到具体点的
        _onContainerTouchStart:function(event){

            var chart = this.vanchart;

            var dom = this.vanchart.getParentDom();
            var currentPos = BaseUtils.getMousePos(event, dom);
            var plotBounds = this.vanchart.getPlotBounds();

            if(BaseUtils.containsPoint(plotBounds,currentPos)){
                var series = chart.hoverPoint ? chart.hoverPoint.series : chart.hoverSeries;

                if(chart.series.length){
                    if(series){
                        series.chart.onContainerMouseMove(event);
                    }else{
                        chart.series[0].chart.onContainerMouseMove(event);
                    }
                }

                this._showTooltip(event);
            }

        },

        _onContainerTouchEnd:function(event){

            var point = this.vanchart.hoverPoint;

            if(point){
                point.onClick(event);
            }

        },

        updateHoverPoint:function(hoverPoint, event){

            if(hoverPoint && hoverPoint != this.vanchart.hoverPoint){

                if(this.vanchart.hoverPoint){
                    hoverPoint.series.chart.cancelChosenState(this.vanchart.hoverPoint);

                    if(this.vanchart.isMouseDown){
                        hoverPoint.series.chart.cancelClickedState(this.vanchart.hoverPoint);
                    }
                }

                this.vanchart.hoverPoint = hoverPoint;
                this.vanchart.hoverSeries = hoverPoint.series;

                hoverPoint.series.chart.makeChosenState(hoverPoint);

                if(this.vanchart.isMouseDown){
                    hoverPoint.series.chart.makeClickedState(hoverPoint);
                }

                this._showTooltip(event);
            }

        },

        _hideTooltip:function(){
            var tooltip = this.vanchart.components.tooltip;
            tooltip.hide();
        },

        //根据数据显示数据点提示
        _showTooltip:function(event){
            var tooltip = this.vanchart.components.tooltip;

            if(this.vanchart.hoverPoint){
                var d = this.vanchart.hoverPoint;
                var opt = d.tooltip;
                var tooltipDim  = tooltip.calculateTooltipDivDim(opt, d.tooltipText);
                var pos = d.series.chart.getTooltipPos(d, tooltipDim, event);
                tooltip.show(pos, opt, d.tooltipText);
            }
        },

        _onContainerMouseDown:function(event){

            var chart = this.vanchart;

            var dom = this.vanchart.getParentDom();
            var mousePos = BaseUtils.getMousePos(event, dom);
            var plotBounds = chart.getPlotBounds();

            chart.isMouseDown = true;
            chart.downPos = mousePos;

            if(this._supportCoordinateZoom() && BaseUtils.containsPoint(plotBounds, mousePos)){
                this.selectRect = this.vanchart.render.getRenderRoot().append('rect');
            }

            var point = chart.hoverPoint;
            var series = chart.hoverSeries;
            if(point && series){
                series.chart.makeClickedState(point);
            }

            if(series){
                series.chart.onContainerMouseDown(event);
            }

            var tooltip = this.vanchart.components.tooltip;
            tooltip.immediateHide();
        },

        _onContainerMouseUp:function(event){

            var chart = this.vanchart;
            var components = chart.components;

            if(this.selectRect){

                var upPos = BaseUtils.getMousePos(event, this.vanchart.getParentDom());

                if(chart.downPos && upPos){

                    if(BaseUtils.distance(chart.downPos, upPos) > MIN_DISTANCE){
                        chart.dealAxisZoom(chart.downPos, upPos);

                        if(components[Constants.TOOLBAR_COMPONENT]){
                            var toolbar = components[Constants.TOOLBAR_COMPONENT];
                            toolbar.showRefreshIconWhenZoom();
                        }
                    }
                }

                if(this.selectRect){
                    this.selectRect.remove();
                    this.selectRect = null;
                }
            }

            chart.isMouseDown = false;

            var series = chart.hoverSeries;
            var point = chart.hoverPoint;

            if(point && series){
                series.chart.cancelClickedState(point);
            }

            if(series){
                series.chart.onContainerMouseUp(event);
            }
        },

        _onContainerMouseLeave:function(){
            this._hideTooltip();
        },

        _onContainerMouseMove:function(event){

            var chart = this.vanchart;

            var dom = this.vanchart.getParentDom();
            var currentPos = BaseUtils.getMousePos(event, dom);
            var plotBounds = this.vanchart.getPlotBounds();

            if(this.selectRect){

                var options = this.vanchart.getOptions();
                var zoomType = options.zoom.zoomType;

                var x = Math.min(currentPos[0], chart.downPos[0]);
                var y = Math.min(currentPos[1], chart.downPos[1]);
                var width = Math.abs(currentPos[0] - chart.downPos[0]);
                var height = Math.abs(currentPos[1] - chart.downPos[1]);

                var isXZoom = zoomType.indexOf('x') != -1;
                var isYZoom = zoomType.indexOf('y') != -1;

                if(isXZoom && !isYZoom){
                    y = plotBounds.y;
                    height = plotBounds.height;
                }else if(isYZoom && !isXZoom){
                    x = plotBounds.x;
                    width = plotBounds.width;
                }

                this.selectRect.attr('x', x).attr('y', y)
                    .attr('width', width).attr('height', height)
                    .style({'fill':'rgba(69,114,167,0.25)'});

            }

            if(BaseUtils.containsPoint(plotBounds,currentPos)){
                var series = chart.hoverSeries;
                if(series && series.visible){
                    series.chart.onContainerMouseMove(event);
                }


                var option = this.vanchart.getOptions();
                if(option.plotOptions.large){

                    var chart = this.vanchart.getChart(Constants.BUBBLE_CHART) ||
                                        this.vanchart.getChart(Constants.SCATTER_CHART);

                    if(chart){
                        chart.onContainerMouseMove(event);
                    }

                }

            }
        },

        validClick:function(event){

            var dom = this.vanchart.getParentDom();

            var mousePos = BaseUtils.getMousePos(event, dom);

            if(this.vanchart.downPos){
                return BaseUtils.distance(this.vanchart.downPos, mousePos) < MIN_DISTANCE;
            }

            return true;
        },

        _getSeriesData:function(event){

            event = event || window.event;
            var target = event.target || event.srcElement;

            var data = BaseUtils.isSupportSVG() ? d3.select(target).datum() : target._data_;

            return data.lineData || data.series || data;
        },

        _getPointData:function(event){

            event = event || window.event;
            var target = event.target || event.srcElement;

            return BaseUtils.isSupportSVG() ? d3.select(target).datum() : target._data_;
        },

        _supportCoordinateZoom:function(){

            var option = this.vanchart.getOptions();

            var hoverPoint = this.vanchart.hoverPoint;

            if(hoverPoint && hoverPoint.series.chart.isUpdateWithForce()){
                return;
            }

            return BaseUtils.isSupportSVG() && option.zoom && option.zoom.zoomType;

        }
    };


    return Handler;
});
/**
 * Created by eason on 15/9/7.
 */

define('utils/Formatter',['require','./BaseUtils'],function(require){

    var BaseUtils = require('./BaseUtils');

    function format(cv, fmt){

        fmt = BaseUtils.getFormatterFunction(fmt);

        return fmt ? fmt.bind(cv)(cv) : cv;
    }

    return {
        format:format
    }

});
/**
 * Created by eason on 16/2/19.
 * 数据点的抽象
 */
define('component/Point',['require','../utils/QueryUtils','../utils/BaseUtils','../utils/ColorUtils','../utils/Formatter','../Constants'],function(require){

    var QueryUtils = require('../utils/QueryUtils');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Formatter = require('../utils/Formatter');
    var Constants = require('../Constants');

    var CATEGORY = 'CATEGORY';
    var SERIES = 'SERIES';
    var VALUE = 'VALUE';
    var PERCENT = 'PERCENT';

    var LABEL_GAP = 2;

    function Point(series, pointOption, index){
        if(series && pointOption){
            this.series = series;

            //排序以后的顺序根据初始状态的index确定
            this.index = index;

            this.pointOption = pointOption;

            this.updateClassName(index);

            this._init(pointOption);
        }
    }

    Point.prototype = {

        constructor:Point,

        _init:function(pointOption){

            var series = this.series;
            var chart = this.series.chart;

            var queryList = [pointOption, series.seriesOption, series.chart.option.plotOptions];

            var color = chart.getDefaultDataPointColor(this);

            //范围图例覆盖系列色
            var rangeLegend = chart.vanchart.getComponent(Constants.RANGE_LEGEND_COMPONENT);
            if(rangeLegend){
                var size = BaseUtils.pick(QueryUtils.queryList(queryList, 'size'), 0);

                size = chart.isForceBubble() ? pointOption.y : size;

                color = rangeLegend.getColorWithSize(size) || color;
            }

            color = QueryUtils.queryList(queryList, 'color') || color;
            color = series._getBandsColor(this) || color;

            var clickColor = ColorUtils.getClickColor(color);

            var dataLabels = QueryUtils.queryList(queryList, 'dataLabels');
            var tooltip = QueryUtils.queryList(queryList, 'tooltip');

            var value = series.valueAxis ? series.valueAxis.getValueFromData(pointOption) : pointOption.y;
            var isNull = value === '-';
            value = isNull ? 0 : value;//用于计算

            var category = (series.baseAxis && !series.chart.isForceBubble()) ? series.baseAxis.getValueFromData(pointOption, this.index) : BaseUtils.pick( pointOption.x, series.seriesOption.name);
            var seriesName = series.name;

            QueryUtils.merge(this, {
                value:value,
                y:value,
                y0:series.valueAxis ? series.valueAxis.getStartPosValue() : 0,

                //饼图要反过来
                category: (series.type == Constants.PIE_CHART || series.type == Constants.GAUGE_CHART) ? seriesName : category,
                seriesName:(series.type == Constants.PIE_CHART || series.type == Constants.GAUGE_CHART) ? category : seriesName,
                visible : BaseUtils.pick(pointOption.visible, true),

                isNull:isNull,
                style:series.style,
                color:color,
                clickColor:clickColor,
                hyperlink:QueryUtils.queryList(queryList, 'hyperlink'),
                jsonHyperlink:QueryUtils.queryList(queryList, 'jsonHyperlink'),
                click:QueryUtils.queryList(queryList, 'click'),
                borderWidth:QueryUtils.queryList(queryList, 'borderWidth') || 0,
                borderColor:QueryUtils.queryList(queryList, 'borderColor') || 'white',
                borderRadius:QueryUtils.queryList(queryList, 'borderRadius') || 0,
                image:QueryUtils.queryList(queryList, 'image'),
                imageWidth:QueryUtils.queryList(queryList, 'imageWidth') || 0,
                imageHeight:QueryUtils.queryList(queryList, 'imageHeight') || 0,
                dataLabels:isNull ? null : dataLabels,
                tooltip:tooltip,
                mouseOverColor:QueryUtils.queryList(queryList, 'mouseOverColor') || ColorUtils.getHighLightColor(color)
            }, true);

            chart.mergeDataPointAttributes(this);
        },

        updateClassName:function(index){
            this.className = 'vancharts-dataPoint-series' + this.series.index + 'point' + index;
        },

        setPercentage:function(percentage){

            this.percentage = percentage;

            //算晚百分比才能算具体的标签的内容
            if(this.dataLabels && this.dataLabels.enabled){
                QueryUtils.merge(this, this._calculateLabelInfo(this.dataLabels), true);
            }
        },

        _calculateLabelInfo:function(labelInfo){

            var dataLabels = labelInfo || {};
            var formatter =  dataLabels.formatter;
            var useHtml = dataLabels.useHtml;

            if(!formatter){
                return {};
            }

            var content = [];

            if(typeof formatter == 'object'){

                var label = formatter.identifier;

                if(label.indexOf(CATEGORY) != -1 || label.indexOf(SERIES) != -1){

                    var categoryString = Formatter.format(this.category, formatter.categoryFormat);
                    var seriesString = Formatter.format(this.seriesName, formatter.seriesFormat);

                    var text;
                    if(label.indexOf(CATEGORY) != -1 && label.indexOf(SERIES) != -1){
                        text = categoryString + ' ' + seriesString;
                    }else if(label.indexOf(CATEGORY) != -1){
                        text = categoryString;
                    }else{
                        text = seriesString;
                    }

                    var style = this.getCategorySeriesStyle(dataLabels);
                    var dim = BaseUtils.getTextDimension(text, style, useHtml);
                    content.push({
                        text:text,
                        style:style,
                        dim:dim
                    });

                }

                if(label.indexOf(VALUE) != -1 || label.indexOf(PERCENT) != -1){

                    var valueString = Formatter.format(this.value, formatter.valueFormat);

                    var percentString = Formatter.format(this.percentage, formatter.percentFormat);

                    var text = '';

                    if(label.indexOf(VALUE) != -1 && label.indexOf(PERCENT) != -1){
                        text = valueString + ' ' + percentString;
                    }else if(label.indexOf(VALUE) != -1){
                        text = valueString;
                    }else{
                        text = percentString;
                    }

                    var style = this.getValuePercentageStyle(dataLabels);
                    var dim = BaseUtils.getTextDimension(text, style, useHtml);
                    content.push({
                        text:text,
                        style:style,
                        dim:dim
                    });
                }

            }else{
                this.pushCustomLabelContent(formatter, dataLabels, useHtml, content);
            }

            var labelDim = this.calculateTextDim(content);

            return {
                labelContent:content,
                labelDim:labelDim
            };

        },

        pushCustomLabelContent:function(formatter, dataLabels, useHtml, content, defaultPosition){
            var text = BaseUtils.getFormatterFunction(formatter).call(this);
            var style = this.getValuePercentageStyle(dataLabels, defaultPosition);
            var dim = BaseUtils.getTextDimension(text, style, useHtml);

            if(dataLabels.useHtml){
                dim.width = isNaN(parseFloat(dataLabels.labelWidth)) ? dim.width : parseFloat(dataLabels.labelWidth);
                dim.height = isNaN(parseFloat(dataLabels.labelHeight)) ? dim.height : parseFloat(dataLabels.labelHeight);
            }

            content.push({
                text:text,
                style:style,
                dim:dim
            });
        },

        calculateTextDim:function(labelContent){

            var width = 0;
            var height = 0;

            if(labelContent && labelContent.length){

                for(var i = 0, count = labelContent.length; i < count; i++){
                    var dim = labelContent[i].dim;

                    width = Math.max(width, dim.width);

                    height += dim.height;
                }

                height += (count - 1) * LABEL_GAP;
            }

            return {
                width:width,
                height:height
            };
        },

        getCategorySeriesStyle:function(dataLabels, defaultPosition){

            if(dataLabels && dataLabels.style){
                return dataLabels.style;
            }

            var position = defaultPosition ||
                 (this.columnType ? Constants.INSIDE : (dataLabels.align || Constants.OUTSIDE));

            return {
                color:position == Constants.OUTSIDE ? this.series.color : '#ffffff',
                fontSize:'12px',
                fontFamily:'Verdana',
                fontWeight:'bold'
            }

        },

        getValuePercentageStyle:function(dataLabels, defaultPosition){

            if(dataLabels && dataLabels.style){
                return dataLabels.style;
            }

            var position = defaultPosition ||
                 (this.columnType ? Constants.INSIDE : (dataLabels.align || Constants.OUTSIDE));

            return {
                fontSize:'12px',
                fontFamily:'Verdana',
                textShadow:'1px 1px 1px rgba(0,0,0,0.15)',
                color: position == Constants.OUTSIDE ? this.series.color : '#ffffff'
            };
        },

        onMouseMove:function(event){

        },

        onClick:function(event){
            if(this.click){
                this.click.call(this, event);
            }else if(this.hyperlink){
                event = event || window.event;
                var hyperlink = this.hyperlink;

                if(hyperlink && window.FR){
                    FR.doHyperlink(event, (new Function("return " + hyperlink))(), true);
                }
            }

        },

        onMouseDown:function(event){

        },

        onMouseUp:function(event){

        }

    };

    return Point;


});

/**
 * Created by eason on 16/2/19.
 * 系列的抽象
 */
define('component/Series',['require','../utils/BaseUtils','../utils/QueryUtils','../Constants','./Point'],function(require){

    var BaseUtils = require('../utils/BaseUtils');
    var QueryUtils = require('../utils/QueryUtils');
    var Constants = require('../Constants');
    var Point = require('./Point');


    function Series(chart, seriesOption, index){

        this.chart = chart;

        this.index = index;

        this._init(seriesOption);
    }


    Series.prototype = {

        constructor:Series,

        _init:function(seriesOption){

            var vanchart = this.chart.vanchart;

            var option = this.chart.option;
            var plotOptions = option.plotOptions;

            var queryList = [seriesOption, plotOptions];

            this.seriesOption = seriesOption;

            this.name = BaseUtils.pick(seriesOption.name, ('Series' + this.index));

            this.className = 'vancharts-series-' + this.index;

            this.type = seriesOption.type || option.chartType;
            this.color = QueryUtils.queryList(queryList, 'color') || this.chart._getDefaultSeriesColor(this.index);
            this.visible = QueryUtils.queryList(queryList, 'visible');
            this.stack = QueryUtils.queryList(queryList, 'stack');
            this.stackByPercent = QueryUtils.queryList(queryList, 'stackByPercent');
            this.style = QueryUtils.queryList(queryList, 'style');
            this.trendLine = QueryUtils.queryList(queryList, 'trendLine');
            this.bands = QueryUtils.queryList(queryList, 'bands');

            var marker = BaseUtils.clone(QueryUtils.queryList(queryList, 'marker'));
            //ie暂时不支持图片
            if(marker && (!BaseUtils.isSupportSVG() || BaseUtils.isIE()) && BaseUtils.isImageMarker(marker.symbol)){
                marker.symbol = Constants.CIRCLE;
            }
            this.marker = marker;

            this.xAxis = vanchart.xAxis(QueryUtils.queryList(queryList, 'xAxis'));
            this.yAxis = vanchart.yAxis(QueryUtils.queryList(queryList, 'yAxis'));

            if(this.xAxis && this.yAxis){
                this.baseAxis = this._getBaseAxis();

                this.baseAxis.isBaseAxis = true;

                this.valueAxis = this._getValueAxis();
            }

            this.chart.mergeSeriesAttributes(this);

            this.points = [];
            this.visiblePoints = [];//为了饼图还是加上吧

            var rangeLegend = this.chart.vanchart.getComponent(Constants.RANGE_LEGEND_COMPONENT);
            var data = seriesOption.data;
            for(var i = 0, count = data.length; i < count; i++){
                var point = new Point(this, data[i], i);

                if(this._isValidPoint(rangeLegend, point)) {
                    this.points.push(point);

                    if(point.visible){
                        this.visiblePoints.push(point);
                    }
                }
            }
        },

        _isValidPoint: function (rangeLegend, point) {
            return !this._isBubbleAndNegative(point) && !this._isNullPoint(point) && !this._isOutRangeLegend(rangeLegend, point);
        },

        _isBubbleAndNegative: function (p) {
            var isBubble = p.series.type == Constants.BUBBLE_CHART;
            var isNegative = !p.displayNegative && p.size < 0;
            return isBubble && isNegative;
        },

        _isNullPoint: function (p) {
            var isBubbleNull = p.series.type == Constants.BUBBLE_CHART && (p.size == '-' || p.isNull);
            var isScatterNull = p.series.type == Constants.SCATTER_CHART && p.isNull;
            return isBubbleNull || isScatterNull;
        },

        _isOutRangeLegend: function (rangeLegend, p) {
            if(rangeLegend){
                return !rangeLegend.getColorWithSize(p.size);
            } else {
                return false;
            }
        },

        updateVisiblePoints:function(){

            var visiblePoints = [];

            this.points.forEach(function(point){
                if(point.visible){
                    visiblePoints.push(point);
                }
            });

            this.visiblePoints = visiblePoints;

        },

        //排序以后,根据排序的效果,需要更新className
        updateClassName:function(){

            if(this.baseAxis && this.baseAxis.type == Constants.CATEGORY_AXIS_COMPONENT){

                var categories = this.baseAxis.categories;

                var newPoints = [];

                this.points.forEach(function(point){

                    var newPoint = QueryUtils.merge(new Point(), point);

                    newPoint.updateClassName(BaseUtils.indexInArray(categories, point.category));

                    newPoints.push(newPoint);
                });

                this.points = newPoints;
            }

        },

        getDataPointCount:function(){
            return this.seriesOption.data.length;
        },

        getSeryTotalValue:function(){

            var total = 0;

            this.points.forEach(function(point){
                total += point.value;
            });

            return total;
        },

        getLocation:function(){

            return this.baseAxis ? this.baseAxis.getPosition() : Constants.BOTTOM;

        },

        isValueAxisBased:function(){
            var c_name = Constants.CATEGORY_AXIS_COMPONENT;
            return (this.xAxis && this.xAxis.type != c_name) && (this.yAxis && this.yAxis.type != c_name);
        },

        _getBaseAxis:function(){
            var c_name = Constants.CATEGORY_AXIS_COMPONENT;
            if(this.xAxis.type == c_name){
                return this.xAxis;
            }else if(this.yAxis.type == c_name){
                return this.yAxis;
            }else{
                return this.type == Constants.BAR_CHART ? this.yAxis : this.xAxis;
            }
        },

        _getValueAxis:function(){
            var c_name = Constants.CATEGORY_AXIS_COMPONENT;
            if(this.xAxis.type == c_name){
                return this.yAxis;
            }else if(this.yAxis.type == c_name){
                return this.xAxis;
            }else{
                return this.type == Constants.BAR_CHART ? this.xAxis : this.yAxis;
            }
        },

        //根据bands的定义获取颜色
        _getBandsColor:function(point){

            var bands = this.bands;

            if(bands){
                bands = BaseUtils.isArray(bands) ? bands : [bands];

                for(var i = 0, count = bands.length; i < count; i++){

                    var band = bands[i];

                    if(band.axis){

                        var axis = band.axis == 'x' ? this.xAxis : this.yAxis;
                        var value = axis.getValueFromData(point.pointOption);
                        var from = band.from;
                        var to = band.to;

                        if(axis.type == Constants.CATEGORY_AXIS_COMPONENT){
                            value = axis.indexOfLabel(value);
                            from = from ? axis.indexOfLabel(from) : from;
                            to = to ? axis.indexOfLabel(from) : to;
                        }

                        var largerThanFrom = BaseUtils.hasDefined(from) ? value >= from : true;
                        var smallerThanTo = BaseUtils.hasDefined(to) ? value <= to : true;

                        if(largerThanFrom && smallerThanTo){
                            return band.color;
                        }

                    }else{

                        var from = Math.min(band.from, band.to);
                        var to = Math.max(band.from, band.to);

                        if(point.value >= from && point.value < to){
                            return band.color;
                        }

                    }
                }

                if(BaseUtils.hasDefined(point.valueInDomain)){

                    for(var i = 0, len = bands.length; i < len; i++){

                        var band = bands[i];

                        var from = Math.min(band.from, band.to);
                        var to = Math.max(band.from, band.to);

                        if(point.valueInDomain >= from && point.valueInDomain <= to){
                            return band.color;
                        }
                    }
                }



            }
        },

        onMouseMove:function(event){

        },

        onClick:function(event){

        },

        onMouseDown:function(event){

        },

        onMouseUp:function(event){

        }
    };

    return Series;
});

/**
 * Created by eason on 15/8/17.
 */

define('render/LegendIconFactory',['require','../Constants'],function(require){

    var Constants = require('../Constants');

    var LegendPath = {};
    var LegendSize = {};

    LegendPath[Constants.PIE_ICON] = 'M15.795,7.943L7.909,12.5L0.205,8.052C1.756,5.333,4.68,3.5,8.032,3.5C11.338,3.5,14.23,5.287,15.795,7.943z';
    LegendSize[Constants.PIE_ICON] = {
        width:16,
        height:16
    };

    LegendPath[Constants.DONUT_ICON] = 'M8.945,11.107c1.671,0,3.181,0.684,4.269,1.786l4.271-4.271c-4.686-4.686-12.284-4.686-16.971,0l4.216,4.216C5.815,11.768,7.302,11.107,8.945,11.107z';
    LegendSize[Constants.DONUT_ICON] = {
        width:18,
        height:18
    };

    LegendPath[Constants.NORMAL_ICON] = 'M0,0L12,0L12,12L0,12Z';
    LegendSize[Constants.NORMAL_ICON] = {
        width:12,
        height:12
    };

    LegendPath[Constants.BUBBLE_ICON] = "M6,11.5c-1.47,0-2.851-0.572-3.889-1.611C1.072,8.851,0.5,7.47,0.5,6s0.572-2.851,1.611-3.889C3.149,1.072,4.53,0.5,6,0.5s2.851,0.572,3.889,1.611C10.928,3.149,11.5,4.53,11.5,6s-0.572,2.851-1.611,3.889C8.851,10.928,7.47,11.5,6,11.5z";
    LegendSize[Constants.BUBBLE_ICON] = {
        width:11,
        height:11
    };

    LegendPath[Constants.NULL_MARKER] = 'M1,8L1,8c0-0.552,0.448-1,1-1h12c0.552,0,1,0.448,1,1v0c0,0.552-0.448,1-1,1H2C1.448,9,1,8.552,1,8z';
    LegendSize[Constants.NULL_MARKER] = {
        width:16,
        height:16
    };

    LegendPath[Constants.CIRCLE] = 'M11,8c0,1.657-1.343,3-3,3S5,9.657,5,8s1.343-3,3-3S11,6.343,11,8z M14,7h-2.142C11.942,7.322,12,7.653,12,8s-0.058,0.678-0.142,1H14c0.552,0,1-0.448,1-1C15,7.448,14.552,7,14,7z M4,8c0-0.347,0.058-0.678,0.142-1H2C1.448,7,1,7.448,1,8c0,0.552,0.448,1,1,1h2.142C4.058,8.678,4,8.347,4,8z';
    LegendSize[Constants.CIRCLE] = {
        width:16,
        height:16
    };

    LegendPath[Constants.SCATTER_ICON + Constants.NORMAL_ICON] = 'M0,0L12,0L12,12L0,12Z';
    LegendSize[Constants.SCATTER_ICON + Constants.NORMAL_ICON] = {
        width:12,
        height:12
    };

    LegendPath[Constants.SCATTER_ICON + Constants.CIRCLE] = "M4,8C2.897,8,1.897,7.551,1.173,6.827S0,5.103,0,4s0.449-2.103,1.173-2.827S2.897,0,4,0s2.103,0.449,2.827,1.173S8,2.897,8,4S7.551,6.103,6.827,6.827S5.103,8,4,8";
    LegendSize[Constants.SCATTER_ICON + Constants.CIRCLE] = {
        width:8,
        height:8
    };

    LegendPath[Constants.SQUARE] = 'M11,11H5V5h6V11z M14,7h-2v2h2c0.552,0,1-0.448,1-1C15,7.448,14.552,7,14,7z M4,7H2C1.448,7,1,7.448,1,8c0,0.552,0.448,1,1,1h2V7z';
    LegendSize[Constants.SQUARE] = {
        width:16,
        height:16
    };
    LegendPath[Constants.SCATTER_ICON + Constants.SQUARE] = "M0,0h8c0,0,0,3.889,0,8C4,8,0,8,0,8V0z";
    LegendSize[Constants.SCATTER_ICON + Constants.SQUARE] = {
        width:8,
        height:8
    };

    LegendPath[Constants.DIAMOND] = 'M8,11L5,8l3-3l3,3L8,11z M14,7h-2.586l1,1l-1,1H14c0.552,0,1-0.448,1-1C15,7.448,14.552,7,14,7z M3.586,8l1-1H2C1.448,7,1,7.448,1,8c0,0.552,0.448,1,1,1h2.586L3.586,8z';
    LegendSize[Constants.DIAMOND] = {
        width:16,
        height:16
    };
    LegendPath[Constants.SCATTER_ICON + Constants.DIAMOND] = "M0,4.5L4.502,0l4.5,4.5c0,0,0,0-4.5,4.5C0,4.5,0,4.5,0,4.5z";
    LegendSize[Constants.SCATTER_ICON + Constants.DIAMOND] = {
        width:9,
        height:9
    };

    LegendPath[Constants.TRIANGLE] = 'M5,10l3-5.196L11,10H5z M14,7h-3.577l1.155,2H14c0.552,0,1-0.448,1-1C15,7.448,14.552,7,14,7z M5.577,7H2C1.448,7,1,7.448,1,8c0,0.552,0.448,1,1,1h2.423L5.577,7z';
    LegendSize[Constants.TRIANGLE] = {
        width:16,
        height:16
    };
    LegendPath[Constants.SCATTER_ICON + Constants.TRIANGLE] = "M4.5,0L9,8c0,0-4.617,0-9,0L4.5,0z";
    LegendSize[Constants.SCATTER_ICON + Constants.TRIANGLE] = {
        width:9,
        height:8
    };

    LegendPath[Constants.CIRCLE_HOLLOW] = 'M4.142,9H2C1.448,9,1,8.552,1,8c0-0.552,0.448-1,1-1h2.142C4.058,7.322,4,7.653,4,8S4.058,8.678,4.142,9zM14,7h-2.142C11.942,7.322,12,7.653,12,8s-0.058,0.678-0.142,1H14c0.552,0,1-0.448,1-1C15,7.448,14.552,7,14,7z M8,7C7.449,7,7,7.449,7,8s0.449,1,1,1s1-0.449,1-1S8.551,7,8,7 M8,5c1.657,0,3,1.343,3,3s-1.343,3-3,3S5,9.657,5,8S6.343,5,8,5L8,5z';
    LegendSize[Constants.CIRCLE_HOLLOW] = {
        width:16,
        height:16
    };
    LegendPath[Constants.SCATTER_ICON + Constants.CIRCLE_HOLLOW] = "M4,2c1.102,0,2,0.898,2,2S5.102,6,4,6S2,5.102,2,4S2.898,2,4,2 M4,0C1.791,0,0,1.791,0,4s1.791,4,4,4s4-1.791,4-4S6.209,0,4,0";
    LegendSize[Constants.SCATTER_ICON + Constants.CIRCLE_HOLLOW] = {
        width:8,
        height:8
    };

    LegendPath[Constants.SQUARE_HOLLOW] = 'M4,9H2C1.448,9,1,8.552,1,8c0-0.552,0.448-1,1-1h2V9z M14,7h-2v2h2c0.552,0,1-0.448,1-1C15,7.448,14.552,7,14,7z M9,7H7v2h2V7 M11,5v6H5V5H11L11,5z';
    LegendSize[Constants.SQUARE_HOLLOW] = {
        width:16,
        height:16
    };
    LegendPath[Constants.SCATTER_ICON + Constants.SQUARE_HOLLOW] = "M6,6H2V2h4V6z M8,0H0v8h8V0z";
    LegendSize[Constants.SCATTER_ICON + Constants.SQUARE_HOLLOW] = {
        width:8,
        height:8
    };

    LegendPath[Constants.DIAMOND_HOLLOW] = 'M4.157,9H2C1.448,9,1,8.552,1,8c0-0.552,0.448-1,1-1h2.157l-1,1L4.157,9z M14,7h-2.157l1,1l-1,1H14c0.552,0,1-0.448,1-1C15,7.448,14.552,7,14,7z M8,5.986L5.986,8L8,10.014L10.014,8L8,5.986 M8,4.571L11.429,8L8,11.429L4.571,8L8,4.571L8,4.571z';
    LegendSize[Constants.DIAMOND_HOLLOW] = {
        width:16,
        height:16
    };
    LegendPath[Constants.SCATTER_ICON + Constants.DIAMOND_HOLLOW] = "M2.121,4.999L5,2.121l2.878,2.878L5,7.879L2.121,4.999z M5,0L0,4.999L5,10l4.999-5.001L5,0z";
    LegendSize[Constants.SCATTER_ICON + Constants.DIAMOND_HOLLOW] = {
        width:10,
        height:10
    };

    LegendPath[Constants.TRIANGLE_HOLLOW] = 'M4.5,9H2C1.448,9,1,8.552,1,8s0.448-1,1-1h3.655L4.5,9z M14,7h-3.655L11.5,9H14c0.552,0,1-0.448,1-1S14.552,7,14,7z M8,6.938L6.232,10h3.536L8,6.938 M8,4.938L11.5,11h-7L8,4.938L8,4.938z';
    LegendSize[Constants.TRIANGLE_HOLLOW] = {
        width:16,
        height:16
    };
    LegendPath[Constants.SCATTER_ICON + Constants.TRIANGLE_HOLLOW] = "M5.001,3.34L7.402,7.5H2.598L5.001,3.34z M5.001,0.34L0,9h10L5.001,0.34z";
    LegendSize[Constants.SCATTER_ICON + Constants.TRIANGLE_HOLLOW] = {
        width:10,
        height:9
    };

    function getLegendIconPath(name){
        return LegendPath[name];
    }

    function getLegendIconSize(name){
        return LegendSize[name];
    }

    function hasIcon(name){
        return LegendPath[name];
    }


    return {
        getLegendIconPath:getLegendIconPath,
        getLegendIconSize:getLegendIconSize,
        hasIcon:hasIcon
    }
});
/**
 * Created by eason on 15/5/4.
 * 图表中所有可以显现的内容都作为一个组件
 */
define('component/Base',['require','../utils/BaseUtils','../Constants','../render/RenderFactory','../utils/QueryUtils','../utils/Formatter','../render/LegendIconFactory'],function(require){
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var RenderFactory = require('../render/RenderFactory');
    var QueryUtils = require('../utils/QueryUtils');
    var Formatter = require('../utils/Formatter');
    var LegendIconFactory = require('../render/LegendIconFactory');

    var LABEL_GAP = 2;
    var CATEGORY = 'CATEGORY';
    var SERIES = 'SERIES';
    var VALUE = 'VALUE';
    var PERCENT = 'PERCENT';

    var DEFAULT_MARKER_RADIUS = 4.5;

    function Base(vanchart, option, componentType){
        this.vanchart = vanchart;
        this.option = option;
        this.componentType = componentType;
        this.componentOption = option[componentType];

        //this.type在prototype里,主要是坐标轴value还是category
        this.render = RenderFactory.getRender(this.type || componentType, this);

        this.isFloat = false;
        this._needLayout = true;

        this._floatX = 0;
        this._floatY = 0;
        this.bounds = {x:0, y:0, width:0, height:0};
    }

    Base.prototype = {
        constructor:Base,

        refresh:function(option, componentOption){
            this._refreshOption(option, componentOption);
            this._refresh();
        },

        //确定占据的大小
        doLayout:function(){

        },

        //根据绘图区的位置确定组件的位置
        fixBoundsByPlot:function(){

        },

        initAttributesWithSeries:function(){

        },

        //现在只有坐标轴实现了下
        _refresh:function(){

        },

        remove:function(){
            if(this.render){
                this.render.remove();
            }
        },

        //指定componentOption的时候不从option属性取
        _refreshOption:function(newOption, componentOption){
            if(newOption){
                this.option = newOption;
                this.componentOption = componentOption ? componentOption : newOption[this.componentType];
                this._refreshFloatPosition();
            }
        },

        _refreshFloatPosition:function(){
            var componentOption = this.componentOption;
            if(componentOption){
                this.isFloat = componentOption.floating;
                this._floatX = this._getPercentValue(componentOption.x, this.vanchart.chartWidth());
                this._floatY = this._getPercentValue(componentOption.y, this.vanchart.chartHeight());
            }
        },

        groupDataByClassName:function(){

            return BaseUtils.pick(this.option.byClassName, true);

        },

        //在图形创建之前就要知道
        getMaxBubbleRadius:function(){

            var maxSize = 0;

            //配置的系列
            var series = this.vanchart.series;
            series.forEach(function(sery){
                if(sery.visible && sery.type == Constants.BUBBLE_CHART){
                    maxSize = Math.max(maxSize, sery.maxSize);
                }
            });

            return maxSize/2;
        },

        //默认的系列颜色
        _getDefaultSeriesColor:function(seriesIndex){
            var colors = this.option.colors;
            return colors[seriesIndex % colors.length];
        },

        _getLegendType:function(sery){

            var marker = sery.marker;

            if(sery.type == Constants.PIE_CHART){
                if(sery.innerRadius || (sery.innerRadius && parseFloat(sery.innerRadius) > 0)){
                    return Constants.DONUT_ICON;
                }else{
                    return Constants.PIE_ICON;
                }
            }else if(sery.type == Constants.RADAR_CHART){

                return sery.columnType ? Constants.NORMAL_ICON
                    : this._getLegendTypeFromMarker(marker, sery.type);

            }else if(sery.type == Constants.BUBBLE_CHART) {
                return Constants.BUBBLE_ICON;
            }else if(sery.type == Constants.SCATTER_CHART){
                return Constants.SCATTER_ICON + this._getLegendTypeFromMarker(marker, sery.type);
            }else {
                return this._getLegendTypeFromMarker(marker, sery.type);
            }
        },

        _getLegendTypeFromMarker:function(marker, seryType){

            if (marker && LegendIconFactory.hasIcon(marker.symbol)){
                return marker.symbol;
            }else if(this._isLineTypeSeries(seryType)){
                return Constants.NULL_MARKER;
            }else{
                return Constants.NORMAL_ICON
            }
        },

        _isLineTypeSeries:function(type){
            return type == Constants.LINE_CHART
                            || type == Constants.AREA_CHART
                                    || type == Constants.RADAR_CHART
                                        || type == Constants.SCATTER_CHART;
        },

        //用百分比表示或者数字表示的值
        _getPercentValue:function(value, total){
            if(value){
                value += '';
                if(value.indexOf('%') != -1){
                    value = parseFloat(value) * total / 100;
                }
                return parseFloat(value);
            }
            return 0;
        },

        _setComponentBounds:function(position, usedSize){
            if(this.isFloat){
                this._updateFloatBounds(position, usedSize);
            }else{
                this._updateComponentBounds(position, usedSize);
            }
        },

        _updateFloatBounds:function(position, usedSize){
            usedSize = Math.ceil(usedSize);

            var originBounds = this.vanchart.getPlotBounds();

            var x = this._floatX;
            var y = this._floatY;

            var width = originBounds.x + originBounds.width - x;
            var height = originBounds.y + originBounds.height - y;

            switch (position){
                case Constants.TOP:
                    this.bounds = {x:x, y:y, width:width, height:usedSize};
                    break;
                case Constants.BOTTOM:
                    this.bounds = {x:x, y:y, width:width, height:usedSize};
                    break;
                case Constants.LEFT:
                    this.bounds = {x:x, y:y, width:usedSize, height:height};
                    break;
                case Constants.RIGHT_TOP:
                case Constants.RIGHT:
                    this.bounds = {x:x, y:y, width:usedSize, height:height};
                    break
            }

        },

        /**
         * 从原始区域裁减出一块区域以后作为组件区域，并且更新原始区域
         * @param position{string} 位置
         * @para usedSize 占据的大小
         * @private
         */
        _updateComponentBounds:function(position, usedSize){
            usedSize = Math.ceil(usedSize);

            var originBounds = this.vanchart.getPlotBounds();
            var x = originBounds.x;
            var y = originBounds.y;
            var width = originBounds.width;
            var height = originBounds.height;

            switch (position){
                case Constants.TOP:
                    this.bounds = {x:x, y:y, width:width, height:usedSize};
                    break;
                case Constants.BOTTOM:
                    this.bounds = {x:x, y:y+height-usedSize, width:width, height:usedSize};
                    break;
                case Constants.LEFT:
                    this.bounds = {x:x, y:y, width:usedSize, height:height};
                    break;
                case Constants.RIGHT_TOP:
                case Constants.RIGHT:
                    this.bounds = {x:x+width-usedSize, y:y, width:usedSize, height:height};
                    break
            }
            this.vanchart.setPlotBounds(originBounds);

            this._clipPlotBounds(position, usedSize);
        },

        _clipPlotBounds:function(position, usedSize){

            usedSize = Math.ceil(usedSize);

            var originBounds = this.vanchart.getPlotBounds();
            var x = originBounds.x;
            var y = originBounds.y;
            var width = originBounds.width;
            var height = originBounds.height;

            switch (position){
                case Constants.TOP:
                    originBounds = {x:x, y:y+usedSize, width:width, height:height - usedSize};
                    break;
                case Constants.BOTTOM:
                    originBounds = {x:x, y:y, width:width, height:height - usedSize};
                    break;
                case Constants.LEFT:
                    originBounds = {x:x+usedSize, y:y, width:width-usedSize, height:height};
                    break;
                case Constants.RIGHT_TOP:
                case Constants.RIGHT:
                    originBounds = {x:x, y:y, width:width-usedSize, height:height};
                    break
            }
            this.vanchart.setPlotBounds(originBounds);
        },

        _getBackgroundColor:function(){

            var opt = this.option;

            var plotColor = (typeof opt.plotBackgroundColor == 'string');

            var chartColor = (typeof opt.backgroundColor == 'string');

            return plotColor ? opt.plotBackgroundColor : (chartColor ? opt.backgroundColor : 'white');
        },

        getPosition:function(){
            return this.componentOption.position;
        },

        isHorizontal:function(){
            return this.componentOption.position == Constants.TOP
                || this.componentOption.position == Constants.BOTTOM;
        },

        getMousePos:function(event){

            var el = this.vanchart.getParentDom();

            return BaseUtils.getMousePos(event, el);
        },

        isLargeMode:function(){
            return this.option.plotOptions.large;
        },

        _maxHeight:function(){
            var maxHeight = this.vanchart.chartHeight();

            if(this.componentOption.maxHeight){
                return this._getPercentValue(this.componentOption.maxHeight, maxHeight);
            }

            return maxHeight;
        },

        _maxWidth:function(){
            var maxWidth = this.vanchart.chartWidth();

            if(this.componentOption.maxWidth){
                return this._getPercentValue(this.componentOption.maxWidth, maxWidth);
            }

            return maxWidth;
        },

        //每种类型都在一行
        _calculateSingleLineLabelContent:function(formatter, data){

            if(!formatter){
                return '';
            }

            if(typeof formatter == 'object'){
                var content = '';
                var label = formatter.identifier;
                var categoryString = Formatter.format(data.category, formatter.categoryFormat);
                var seriesString = Formatter.format(data.seriesName, formatter.seriesFormat);

                if(label.indexOf(CATEGORY) != -1 || label.indexOf(SERIES) != -1){
                    if(label.indexOf(CATEGORY) != -1 && label.indexOf(SERIES) != -1){
                        content += (categoryString + ' ' + seriesString);
                    }else if(label.indexOf(CATEGORY) != -1){
                        content += categoryString;
                    }else{
                        content += seriesString;
                    }
                }

                if(label.indexOf(VALUE) != -1 || label.indexOf(PERCENT) != -1){

                    if(!BaseUtils.isEmpty(content)){
                        content += ':';
                    }

                    var valueString = Formatter.format(data.value, formatter.valueFormat);
                    var percentString = Formatter.format(data.percentage, formatter.percentFormat);

                    if(label.indexOf(VALUE) != -1 && label.indexOf(PERCENT) != -1){
                        content += (valueString + ' ' + percentString);
                    }else if(label.indexOf(VALUE) != -1){
                        content += valueString;
                    }else{
                        content += percentString;
                    }
                }
                return content;
            }else{
                return BaseUtils.getFormatterFunction(formatter).call(data);
            }

        },

        _createMultiLineLabelContent:function(formatter, data){
            if(!formatter){
                return [];
            }

            if(typeof formatter == 'object'){
                var content = [];

                var label = formatter.identifier;
                var categoryString = Formatter.format(data.category, formatter.categoryFormat);
                var seriesString = Formatter.format(data.seriesName, formatter.seriesFormat);
                var valueString = Formatter.format(data.value, formatter.valueFormat);
                var percentString = Formatter.format(data.percentage, formatter.percentFormat);

                if(label.indexOf(CATEGORY) != -1){
                    content.push(categoryString);
                }

                if(label.indexOf(SERIES) != -1){
                    content.push(seriesString)
                }

                if(label.indexOf(VALUE) != -1){
                    content.push(valueString);
                }

                if(label.indexOf(PERCENT) != -1){
                    content.push(percentString);
                }

                return content;
            }else{
                return [BaseUtils.getFormatterFunction(formatter).call(data)];
            }

        },

        _getTickContent:function(tick, formatter){

            if(!formatter){
                return tick;
            }

            return Formatter.format(tick, formatter);
        },

        getLabelGap:function(){
            return LABEL_GAP;
        },

        getDefaultMarkerRadius:function(){
            return DEFAULT_MARKER_RADIUS;
        },

        getPlotBounds:function(){
            return this.vanchart.getPlotBounds();
        },

        getChartBounds:function(){
            return this.vanchart.getChartBounds();
        },

        getVanchartRender:function(){
            return this.vanchart.getRender();
        },

        getRender:function(){
            return this.render;
        },

        getParentDom:function(){
            return this.vanchart.getParentDom();
        },

        getTooltipComponent:function(){
            return this.vanchart.components.tooltip;
        }

    };

    return Base;
});
/**
 * Created by eason on 15/5/4.
 * 标题组建，包括图表标题和坐标轴标题
 */
define('component/Title',['require','./Base','../utils/BaseUtils','../Constants','../ComponentLibrary'],function(require){
    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    var LINE_GAP_PERCENT = 0.2;
    var PADDING = 5;

    function Title(vanchart, option, componentType){
        Base.call(this, vanchart, option, componentType);

        this.refresh(option);
    }

    Title.prototype = {
        constructor:Title,

        doLayout:function(){

            var cfg = this.componentOption;

            var leftBounds = this.vanchart.getPlotBounds();

            var toolbarWidth = this.vanchart.getToolbarWidth();

            var maxWidth = leftBounds.width - PADDING * 2 - toolbarWidth;

            var maxHeight = this._maxHeight();

            var textDim = BaseUtils.getTextDimension(cfg.text, cfg.style, cfg.useHtml);

            var textUseHeight = textDim.height;
            var textUseWidth = textDim.width;

            //如果用html解析则在html里设置换行
            if(!cfg.useHtml && textUseWidth > maxWidth){
                var lines = Math.ceil(textUseWidth / maxWidth);
                var lineGap = textUseHeight * LINE_GAP_PERCENT;
                textUseHeight = textUseHeight * lines + lineGap * (lines - 1);
            }

            if(textUseHeight === 0 || textUseHeight === 0){
                this._setComponentBounds(Constants.TOP, 0);
            } else {
                textUseHeight = cfg.maxHeight ? Math.min(maxHeight, textUseHeight + 2 * PADDING) : (textUseHeight + 2 * PADDING);

                this._setComponentBounds(Constants.TOP, textUseHeight);

                if (this.isFloat) {
                    this.bounds.width = textUseWidth + 2 * PADDING + 1;
                }
            }
        },

        getPadding:function(){
            return PADDING;
        },

        getLineGapPercent:function(){
            return LINE_GAP_PERCENT;
        },

        translateX:function(width){
            this.render.translateX(width);
        }
    };

    BaseUtils.inherit(Title, Base);
    require('../ComponentLibrary').register(Constants.TITLE_COMPONENT, Title);
    return Title;
});
/**
 * Created by eason on 15/8/7.
 */
//管理标签位置
define('utils/BoundsManager',['require','./BaseUtils'],function(require){

    var BaseUtils = require('./BaseUtils');

    function BoundsManager(){
        this.addedBounds = [];
    }

    BoundsManager.prototype = {

        constructor:BoundsManager,

        addBounds:function(bounds){
            this.addedBounds.push(bounds);
        },

        isOverlapped:function(bounds){
            for (var i = 0, len = this.addedBounds.length; i < len; i++){
                if (BaseUtils.rectangleOverlapped(bounds, this.addedBounds[i])){
                    return true;
                }
            }
            return false;
        },

        isEmpty:function(){
            return this.addedBounds.length == 0;
        }

    };

    return BoundsManager;
});
/**
 * Created by eason on 15/6/24.
 */
//
//Copyright (c) 2014 Ga?tan Renaudeau
//
//Permission is hereby granted, free of charge, to any person
//obtaining a copy of this software and associated documentation
//files (the "Software"), to deal in the Software without
//restriction, including without limitation the rights to use,
//    copy, modify, merge, publish, distribute, sublicense, and/or sell
//copies of the Software, and to permit persons to whom the
//Software is furnished to do so, subject to the following
//conditions:
//
//    The above copyright notice and this permission notice shall be
//included in all copies or substantial portions of the Software.
//
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
//OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
//    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
//OTHER DEALINGS IN THE SOFTWARE.

define('utils/BezierEasing',[],function(){
    var global = this;

    // These values are established by empiricism with tests (tradeoff: performance VS precision)
    var NEWTON_ITERATIONS = 4;
    var NEWTON_MIN_SLOPE = 0.001;
    var SUBDIVISION_PRECISION = 0.0000001;
    var SUBDIVISION_MAX_ITERATIONS = 10;

    var kSplineTableSize = 11;
    var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

    var float32ArraySupported = 'Float32Array' in global;

    function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
    function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
    function C (aA1)      { return 3.0 * aA1; }

    // Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
    function calcBezier (aT, aA1, aA2) {
        return ((A(aA1, aA2)*aT + B(aA1, aA2))*aT + C(aA1))*aT;
    }

    // Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
    function getSlope (aT, aA1, aA2) {
        return 3.0 * A(aA1, aA2)*aT*aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
    }

    function binarySubdivide (aX, aA, aB, mX1, mX2) {
        var currentX, currentT, i = 0;
        do {
            currentT = aA + (aB - aA) / 2.0;
            currentX = calcBezier(currentT, mX1, mX2) - aX;
            if (currentX > 0.0) {
                aB = currentT;
            } else {
                aA = currentT;
            }
        } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
        return currentT;
    }

    function BezierEasing (mX1, mY1, mX2, mY2) {
        // Validate arguments
        if (arguments.length !== 4) {
            throw new Error("BezierEasing requires 4 arguments.");
        }
        for (var i=0; i<4; ++i) {
            if (typeof arguments[i] !== "number" || isNaN(arguments[i]) || !isFinite(arguments[i])) {
                throw new Error("BezierEasing arguments should be integers.");
            }
        }
        if (mX1 < 0 || mX1 > 1 || mX2 < 0 || mX2 > 1) {
            throw new Error("BezierEasing x values must be in [0, 1] range.");
        }

        var mSampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);

        function newtonRaphsonIterate (aX, aGuessT) {
            for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
                var currentSlope = getSlope(aGuessT, mX1, mX2);
                if (currentSlope === 0.0) return aGuessT;
                var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
                aGuessT -= currentX / currentSlope;
            }
            return aGuessT;
        }

        function calcSampleValues () {
            for (var i = 0; i < kSplineTableSize; ++i) {
                mSampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
            }
        }

        function getTForX (aX) {
            var intervalStart = 0.0;
            var currentSample = 1;
            var lastSample = kSplineTableSize - 1;

            for (; currentSample != lastSample && mSampleValues[currentSample] <= aX; ++currentSample) {
                intervalStart += kSampleStepSize;
            }
            --currentSample;

            // Interpolate to provide an initial guess for t
            var dist = (aX - mSampleValues[currentSample]) / (mSampleValues[currentSample+1] - mSampleValues[currentSample]);
            var guessForT = intervalStart + dist * kSampleStepSize;

            var initialSlope = getSlope(guessForT, mX1, mX2);
            if (initialSlope >= NEWTON_MIN_SLOPE) {
                return newtonRaphsonIterate(aX, guessForT);
            } else if (initialSlope === 0.0) {
                return guessForT;
            } else {
                return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
            }
        }

        var _precomputed = false;
        function precompute() {
            _precomputed = true;
            if (mX1 != mY1 || mX2 != mY2)
                calcSampleValues();
        }

        var f = function (aX) {
            if (!_precomputed) precompute();
            if (mX1 === mY1 && mX2 === mY2) return aX; // linear
            // Because JavaScript number are imprecise, we should guarantee the extremes are right.
            if (aX === 0) return 0;
            if (aX === 1) return 1;
            return calcBezier(getTForX(aX), mY1, mY2);
        };

        f.getControlPoints = function() { return [{ x: mX1, y: mY1 }, { x: mX2, y: mY2 }]; };

        var args = [mX1, mY1, mX2, mY2];
        var str = "BezierEasing("+args+")";
        f.toString = function () { return str; };

        //var css = "cubic-bezier("+args+")";
        //f.toCSS = function () {?return css; };

        return f;
    }

    // CSS mapping
    BezierEasing.css = {
        "ease":        BezierEasing(0.25, 0.1, 0.25, 1.0),
        "linear":      BezierEasing(0.00, 0.0, 1.00, 1.0),
        "ease-in":     BezierEasing(0.42, 0.0, 1.00, 1.0),
        "ease-out":    BezierEasing(0.00, 0.0, 0.58, 1.0),
        "ease-in-out": BezierEasing(0.42, 0.0, 0.58, 1.0),
        "swing":       BezierEasing(0.02, 0.01,0.47, 1.0),
        "ease-in-quart":BezierEasing(0.895, 0.03, 0.685, 0.22),
        "ease-out-back":BezierEasing(0.175, 0.885, 0.32, 1.275)
    };

    return BezierEasing;
});
/**
 * Created by eason on 15/6/18.
 */
define('component/BaseAxis',['require','../Constants','../utils/BaseUtils','../utils/QueryUtils','../utils/Formatter','../utils/BoundsManager','./Base','../utils/BezierEasing'],function(require){
    var Constants = require('../Constants');
    var BaseUtils = require('../utils/BaseUtils');
    var QueryUtils = require('../utils/QueryUtils');
    var Formatter = require('../utils/Formatter');
    var BoundsManager = require('../utils/BoundsManager');

    var Base = require('./Base');
    var BezierEasing = require('../utils/BezierEasing');

    var LABEL_LINE_GAP = 3;
    var TICK_LENGTH = 5;
    var TITLE_LABEL_GAP = 5;

    var TICK_COUNT = 5;
    var RADAR_TICK_COUNT = 4;
    var MIN_MAX_GAP = 100;

    var PADDING = 5;

    var ARROW_SIZE = 15;

    function BaseAxis(vanchart, option, componentType){
        Base.call(this, vanchart, option, componentType);
        this.scale = null;
        this.lastScale = null;

        this.tickLabelLength = 0;

        this.tickData = [];
        this.minorTickData = [];
        this.usedTickData = [];
    }

    BaseAxis.prototype = {
        constructor:BaseAxis,

        doLayout:function(){
            this._updateAxisBounds();
        },

        _updateAxisBounds:function(){

            var axisOption = this.componentOption;

            this.tickLabelLength = this._getTickLabelLength();

            var axisTileLength = this._getAxisTitleLength() + TITLE_LABEL_GAP;

            var usedSize = this.tickLabelLength + axisTileLength;

            var startSize = 0, endSize = 0;

            var isHorizontal = this.isHorizontal();

            if(this.tickData && this.tickData.length > 1){
                var t_s, t_e;
                if(this.isAxisReversed()){
                    t_s = this.tickData[this.tickData.length - 1].tickDim;
                    t_e = this.tickData[0].tickDim;
                }else{
                    t_s = this.tickData[0].tickDim;
                    t_e = this.tickData[this.tickData.length - 1].tickDim;
                }
                startSize = isHorizontal ? t_s.width : t_s.height;
                endSize = isHorizontal ? t_e.width : t_s.height
            }

            if(isHorizontal){
                usedSize = axisOption.maxHeight ? Math.min(this._maxHeight(), usedSize) : usedSize;
            }else{
                usedSize = axisOption.maxWidth ? Math.min(this._maxWidth(), usedSize) : usedSize;
            }

            //没有定义具体位置的时候
            if(axisOption.onZero){

                var otherAxis = this.componentType == Constants.X_AXIS_COMPONENT ?
                                                            Constants.Y_AXIS_COMPONENT : Constants.X_AXIS_COMPONENT;

                otherAxis = this.vanchart[otherAxis]();

                axisOption.position = otherAxis.isHorizontal() ? Constants.RIGHT : Constants.BOTTOM;

                isHorizontal = axisOption.position == Constants.BOTTOM;

                this._updateFloatBounds(axisOption.position, usedSize);

            }else if(this.getRender()){
                this._setComponentBounds(axisOption.position, usedSize);
            }

            var plotBounds = this.vanchart.getPlotBounds();
            var chartWidth = this.vanchart.chartWidth();
            var chartHeight = this.vanchart.chartHeight();

            if(isHorizontal){

                var leftDet =  Math.round(startSize/2) + PADDING;
                var rightDet =  Math.round(endSize/2) + PADDING;

                this._clipPlotBounds(Constants.LEFT, Math.max(leftDet - plotBounds.x, 0));
                this._clipPlotBounds(Constants.RIGHT, Math.max(rightDet - (chartWidth - plotBounds.x - plotBounds.width), 0));

            }else{

                var topDet = Math.round(endSize/2);

                var bottomDet = Math.round(startSize/2);
                bottomDet = Math.max(bottomDet - (chartHeight - plotBounds.y - plotBounds.height), 0);

                this._clipPlotBounds(Constants.TOP, topDet);
                this._clipPlotBounds(Constants.BOTTOM, bottomDet);
            }
        },

        dealOnZero:function(){

            var cfg = this.componentOption;

            if(cfg.onZero){

                var axisIndex = cfg.onZero === true ? 0 : cfg.onZero;

                var relyOn = this.componentType == Constants.X_AXIS_COMPONENT ?
                    Constants.Y_AXIS_COMPONENT : Constants.X_AXIS_COMPONENT;

                relyOn = this.vanchart.getComponent(relyOn).getAxis(axisIndex);

                var pos = relyOn.scale(0);
                var plotBounds = this.vanchart.getPlotBounds();

                var x, y, width, height;
                if(this.isHorizontal()){
                    x = plotBounds.x;
                    y = pos + plotBounds.y;
                    width = plotBounds.width;
                    height = this.bounds.height;
                }else{
                    x = pos + plotBounds.x;
                    y = plotBounds.y;
                    width = this.bounds.width;
                    height = plotBounds.height;
                }

                this.bounds = {
                    x:x,
                    y:y,
                    width:width,
                    height:height
                };

            }
        },

        //坐标轴的标签占据的大小
        _getTickLabelLength:function(){

            var axisOption = this.componentOption;

            var tickLength = axisOption.tickPadding || LABEL_LINE_GAP;

            if(axisOption.enableTick){
                tickLength += axisOption.tickLength || TICK_LENGTH;
            }

            var isHorizontal = this.isHorizontal();

            var maxLabelLength  = 0;
            if(axisOption.showLabel && this.tickData.length){
                this.tickData.forEach(function(t){
                    var labelDim = t.tickDim;
                    maxLabelLength = Math.max(maxLabelLength, isHorizontal ? labelDim.height : labelDim.width);
                });
            }

            return tickLength + maxLabelLength;
        },

        //不考虑step和自动间隔
        _updateOriginTickData:function(){
            var labels = this._getTickValues();
            var axisOption = this.componentOption;
            var formatter = axisOption.formatter;

            this.tickData = [];
            for(var i = 0, len = labels.length; i < len; i++){
                var tickValue = labels[i];
                var tickContent = this._getTickContent(tickValue, formatter);
                var labelDim = BaseUtils.getTextDimensionWithRotation(tickContent, axisOption.labelStyle,
                    axisOption.useHtml, axisOption.labelRotation);

                if(axisOption.useHtml){
                    labelDim.width = isNaN(parseFloat(axisOption.labelWidth)) ? labelDim.width : parseFloat(axisOption.labelWidth);
                    labelDim.height = isNaN(parseFloat(axisOption.labelHeight)) ? labelDim.height : parseFloat(axisOption.labelHeight);
                }

                this.tickData.push({
                    tickValue:tickValue,
                    tickContent:tickContent,
                    tickDim:labelDim
                });
            }
        },

        //确定scale以后计算内容,改变scale的话要重新计算originTickData
        _calculateTickData:function(){

            this._updateTickContent();

            //只有分类轴会走这边
            var startIndex = this._getStartIndex();
            var endIndex = this._getEndIndex() + 1;

            this.usedTickData = [];
            for(var i = startIndex; i < endIndex; i++){
                this.usedTickData.push(this.tickData[i]);
            }

            this.minorTickData = [];
            if(this.componentOption.enableMinorTick && this.usedTickData.length){
                this.type == Constants.CATEGORY_AXIS_COMPONENT ? this._updateCategoryMinorTickData() : this._updateValueMinorTickData();
            }
        },

        _getAxisTitleLength:function(){
            var title = this.componentOption.title;
            var usedSize = 0;
            if(title){
                var dim = BaseUtils.getTextDimensionWithRotation(title.text, title.style, title.useHtml, title.rotation);
                usedSize = this.isHorizontal() ? dim.height : dim.width;
            }
            return usedSize;
        },

        //坐标轴占据的空间
        getAxisTitleBounds:function(){

            var bounds = this.bounds;

            var tickLength = this.tickLabelLength;

            var position = this.componentOption.position;

            var x = bounds.x;
            var y = bounds.y;
            var width = bounds.width;
            var height = bounds.height;

            switch (position){
                case Constants.LEFT:
                    width -= tickLength;
                    break;

                case Constants.BOTTOM:
                    y += tickLength;
                    height -= tickLength;
                    break;

                case Constants.RIGHT:
                    x += tickLength;
                    width -= tickLength;
                    break;

                case Constants.TOP:
                    height -= tickLength;
                    break;
            }

            return {
                x:x,
                y:y,
                width:width,
                height:height
            }
        },

        _updateRange:function(){
            this.scale.rangeRound(this._getRange());
        },

        //边界确定以后,更新domain
        _updateDomainWhenSizeFixed:function(){

        },

        _getRange:function(){
            var plotBounds = this.vanchart.getPlotBounds();
            var cfg = this.componentOption;

            if(this.isHorizontal()){
                return cfg.reversed ? [plotBounds.width, 0] : [0, plotBounds.width];
            }else{
                return cfg.reversed ? [0, plotBounds.height] : [plotBounds.height, 0];
            }
        },

        _preCalculatePlotLines:function(){
            var plotLines = this.componentOption.plotLines || [];
            var position = this.componentOption.position;
            var plotBounds = this.vanchart.getPlotBounds();
            var scale = this.scale;
            var isDate = this.type == Constants.DATE_AXIS_COMPONENT ;

            var result = [];

            plotLines.forEach(function(d){

                var pos = scale(isDate ? BaseUtils.object2date(d.value) : d.value) + (scale.rangeBand ? scale.rangeBand()/2 : 0);
                var startPos;
                var endPos;

                pos = BaseUtils.lineSubPixelOpt(pos, d.width);

                switch (position){
                    case Constants.TOP:
                    case Constants.BOTTOM:
                        startPos = {x:pos, y:0};
                        endPos = {x:pos, y:plotBounds.height};
                        break;
                    case Constants.LEFT:
                    case Constants.RIGHT:
                        startPos = {x:0, y:pos};
                        endPos = {x:plotBounds.width, y:pos}
                        break;
                }

                var textX, textY, text, style;
                textX = textY = 0, text = '', style = {};

                var minX = Math.min(startPos.x, endPos.x);
                var maxX = Math.max(startPos.x, endPos.x);
                var minY = Math.min(startPos.y, endPos.y);
                var maxY = Math.max(startPos.y, endPos.y);

                if(scale.rangeBand){
                    if(position == Constants.TOP || position == Constants.BOTTOM){
                        if(minX < 0 || maxX > plotBounds.width){
                            return;
                        }
                    }else{
                        if(minY < 0 || maxY > plotBounds.height){
                            return;
                        }
                    }

                }

                if(d.label && d.label.text && d.label.style){
                    style = d.label.style;
                    text = d.label.text;
                    var align = d.label.align;
                    var textDim = BaseUtils.getTextDimension(text, style, d.label.useHtml);

                    if(d.label.useHtml){
                        textDim.width = BaseUtils.pick(d.label.labelWidth, textDim.width);
                        textDim.height = BaseUtils.pick(d.label.labelHeight, textDim.height);
                    }

                    switch (align){
                        case Constants.TOP:
                            textX = minX - textDim.width;
                            textY = minY;
                            break;
                        case Constants.BOTTOM:
                            textX = minX - textDim.width;
                            textY = maxY - textDim.height;
                            break;
                        case Constants.LEFT:
                            textX = minX;
                            textY = minY - textDim.height - LABEL_LINE_GAP;
                            break;
                        case Constants.RIGHT:
                            textX = maxX - textDim.width;
                            textY = minY - textDim.height - LABEL_LINE_GAP;
                            break;
                    }
                }

                result.push({
                    color: d.color,
                    startPos:startPos,
                    endPos:endPos,
                    width: d.width,
                    dataArray:Constants.DASH_TYPE[d.dashStyle],

                    text:text,
                    textDim:textDim,
                    style:style,
                    textX:textX,
                    textY:textY
                });
            });

            return result;
        },

        _preCalculatePlotBands:function(){

            var plotBands = this._getPlotBands();
            var scale = this.scale;
            var isRangeBand = !!scale.rangeBand;
            var rangeBand = isRangeBand ? scale.rangeBand() : 0;

            var result = [];
            var plotBounds = this.vanchart.getPlotBounds();
            var self = this;

            var domain = this.scale.domain();

            plotBands.forEach(function(d){

                var from = d.from;
                var to = d.to;

                if(self.type != Constants.CATEGORY_AXIS_COMPONENT){
                    from = Math.max(Math.min(d.from, d.to), domain[0]);
                    to = Math.min(Math.max(d.from, d.to), domain[1]);
                }

                var t_f = scale(from);
                var t_t = scale(to);

                from = Math.min(t_f, t_t);
                to = Math.max(t_f, t_t);

                to += rangeBand;

                var x = 0, y = 0, width = plotBounds.width, height = plotBounds.height;
                var gap = Math.abs(to - from);

                if(self.isHorizontal()){
                    x = Math.max(0, from);
                    width = Math.min(width, gap);
                }else{
                    y = Math.max(0, from);
                    height = Math.min(height, gap);
                }
                result.push({x:x, y:y, width:width, height:height, color: d.color});
            });

            return result;
        },

        _getPlotBands:function(){

            var plotBands = this.componentOption.plotBands;
            var scale = this.scale;
            var isRangeBand = !!scale.rangeBand;

            if(typeof plotBands == 'string'){

                var color = plotBands;
                plotBands = [];

                var labels = this._getTickValuesWithEndValue();

                var endIndex = isRangeBand ? -1 : 0;

                for(var index = labels.length - 1; index > endIndex; index -= 2){
                    plotBands.push({
                        color:color,
                        from:isRangeBand ? labels[index] : labels[index - 1],
                        to:labels[index]
                    });
                }

            }else{

                plotBands = plotBands || [];

                var result = [];

                for(var i = 0, count = plotBands.length; i < count; i++){

                    var t_bands = plotBands[i];

                    if(BaseUtils.hasDefined(t_bands.from) && BaseUtils.hasDefined(t_bands.to)){
                        result.push(t_bands);
                    }

                }

                plotBands = result;
            }

            return plotBands;

        },

        //考虑tickFormat的作用
        _getTickValues:function(){
            return [];
        },

        _getTickInterval:function(){

            //考虑一开始的区间不满一个tick
            if(this.valueList.length > 2){
                return BaseUtils.accAdd(this.valueList[2], -this.valueList[1]);
            }else{
                return BaseUtils.accAdd(this.valueList[1], -this.valueList[0])
            };

        },

        _getTickValuesWithEndValue:function(){
            return this._getTickValues();
        },

        //画的时候计算自定义标签间隔等
        getTickData:function(){
            return this.usedTickData;
        },

        getMaxTickWidth:function(){
            var maxWidth = 0;

            this.usedTickData.forEach(function(data){

                maxWidth = Math.max(maxWidth, data.tickDim.width);

            });
            return maxWidth;
        },

        getTickHeight:function(){

            if(this.componentOption.labelStyle){
                return BaseUtils.getTextHeight(this.componentOption.labelStyle);
            }

            return 0;

        },

        getMinorTickData:function(){
            return this.minorTickData;
        },

        //todo 这个方法要删掉
        getMainTickData:function(){

            var cfg = this.componentOption;

            var update = !cfg.log && !this.byPercent && this.type == Constants.VALUE_AXIS_COMPONENT;

            if(update){

                var interval = this._getTickInterval();

                if(this.usedTickData.length > 3){

                    var secondMin = this.usedTickData[1].tickValue;

                    var secondMax = this.usedTickData[this.usedTickData.length - 2].tickValue;

                    var startIndex = 0;
                    var endIndex = this.usedTickData.length;

                    if(BaseUtils.hasDefined(cfg.min) && BaseUtils.accAdd(secondMin, -interval) < cfg.min){
                        startIndex += 1;
                    }

                    if(BaseUtils.hasDefined(cfg.max) && BaseUtils.accAdd(secondMax, interval) > cfg.max){
                        endIndex -= 1;
                    }

                    var mainTickData = [];
                    for(var i = startIndex; i < endIndex; i++){
                        mainTickData.push(this.usedTickData[i]);
                    }

                    return mainTickData;
                }

            }

            return this.getTickData();
        },

        _updateCategoryMinorTickData:function(){
            var minorTickLength = Math.round(this.getTickLength() / 5);
            var endIndex = this.usedTickData.length;
            endIndex = this.scale.rangeBand ? endIndex : endIndex - 1;
            for(var i = 0; i < endIndex; i++){
                var startPos = this.usedTickData[i].tickPos;
                for(var j = 1; j < 5; j++){
                    this.minorTickData.push(
                        startPos + minorTickLength * j
                    );
                }
            }
        },

        _updateValueMinorTickData:function(){

            var cfg = this.componentOption;
            var interval = this._getTickInterval();
            var minorInterval = cfg.minorTickInterval ? cfg.minorTickInterval : interval / 5;

            for(var i = 0, count = this.usedTickData.length; i < count - 1; i++){

                var start = this.usedTickData[i].tickValue;

                var end = this.usedTickData[i + 1].tickValue;

                var isDate = (start instanceof Date && end instanceof Date);

                start = isDate ? BaseUtils.date2int(start) : start;
                end = isDate ? BaseUtils.date2int(end) : end;

                if(i == 0){
                    for(var value = BaseUtils.accAdd(end, -minorInterval); value > start; value = BaseUtils.accAdd(value, -minorInterval)){
                        this.minorTickData.push(isDate ? BaseUtils.int2date(value) : value);
                    }
                }else{
                    for(var value = BaseUtils.accAdd(start,minorInterval); value < end; value = BaseUtils.accAdd(value, minorInterval)){
                        this.minorTickData.push(isDate ? BaseUtils.int2date(value) : value);
                    }
                }
            }

            var endValue = this.tickData[this.tickData.length - 1].tickValue;
            var maxValue = this.scale.domain()[1];

            var isDate = (endValue instanceof Date) && (maxValue instanceof Date);
            endValue = isDate ? BaseUtils.date2int(endValue) : endValue;
            maxValue = isDate ? BaseUtils.date2int(maxValue) : maxValue;

            if(endValue < maxValue){
                for(var value = endValue + minorInterval; value <= maxValue; value += minorInterval){
                    this.minorTickData.push(isDate ? BaseUtils.int2date(value) : value);
                }
            }
        },

        _updateTickContent:function(){
            var axisOption = this.componentOption;
            var scale = this.scale;

            var det = scale.rangeBand ? scale.rangeBand()/2 : 0;
            this.tickData.forEach(function(t){
                t.tickPos = scale(t.tickValue);
                t.tickLabelPos = t.tickPos + det;
            });

            if(!axisOption.showLabel){
                this.tickData.forEach(function(t){
                    t.tickContent = '';
                })
            }else if(axisOption.step){
                var index = 0;
                this.tickData.forEach(function(t){
                    if(index++ % axisOption.step){
                        t.tickContent = '';
                    }
                });
            }else{
                var manager = new BoundsManager();
                var isHorizontal = this.isHorizontal();

                var testStep = 1;
                var longestStep = 1;

                this.tickData.forEach(function(t){

                    var pos = isHorizontal ? {x:scale(t.tickValue), y:0} : {x:0, y:scale(t.tickValue)};
                    var bounds = BaseUtils.makeBounds(pos, t.tickDim);

                    if(manager.isOverlapped(bounds)){

                        testStep++;
                        longestStep = Math.max(longestStep, testStep);

                    }else{
                        testStep = 1;
                        manager.addBounds(bounds);
                    }
                });

                var index = 0;
                this.tickData.forEach(function(t){
                    if(index++ % longestStep){
                        t.tickContent = '';
                    }
                });
            }
        },

        _getStartIndex:function(){
            return BaseUtils.pick(this.componentOption.startIndex, 0);
        },

        _getEndIndex:function(){
            return BaseUtils.pick(this.componentOption.endIndex, this.tickData.length - 1);
        },

        _getOriginDet:function(){
            var plotOrigin = this._getPlotOriginPoint();
            var axisOrigin = this._getAxisOriginPoint();
            return {x:plotOrigin.x - axisOrigin.x, y:plotOrigin.y - axisOrigin.y};
        },

        //坐标轴如果靠近plotBounds的话的原点位置，考虑多个坐标轴的的时候
        _getPlotOriginPoint:function(){
            var plotBounds = this.vanchart.getPlotBounds();
            var position = this.componentOption.position;
            var x,y;

            switch(position){
                case Constants.TOP:
                    x = plotBounds.x;
                    y = plotBounds.y;
                    break;

                case Constants.BOTTOM:
                    x = plotBounds.x;
                    y = plotBounds.y + plotBounds.height;
                    break;

                case Constants.LEFT:
                    x = plotBounds.x;
                    y = plotBounds.y;
                    break;

                case Constants.RIGHT:
                    x = plotBounds.x + plotBounds.width;
                    y = plotBounds.y;
                    break;
            }

            return {x:x, y:y};
        },

        _getAxisOriginPoint:function(){
            var axisBounds = this.bounds;
            var position = this.componentOption.position;
            var x,y;

            switch(position){
                case Constants.TOP:
                    x = axisBounds.x;
                    y = axisBounds.y + axisBounds.height;
                    break;

                case Constants.BOTTOM:
                    x = axisBounds.x;
                    y = axisBounds.y;
                    break;

                case Constants.LEFT:
                    x = axisBounds.x + axisBounds.width;
                    y = axisBounds.y;
                    break;

                case Constants.RIGHT:
                    x = axisBounds.x;
                    y = axisBounds.y;
                    break;
            }

            return {x:x, y:y};
        },

        getTickScale:function(){
            return this.scale;
        },

        axisZoom:function(downPos, upPos){

        },

        _initZoomStatus:function(){

        },

        isAxisReversed:function(){
            return this.componentOption.reversed;
        },

        isOnZero:function(){
            return this.componentOption.onZero;
        },

        getLineWidth:function(){
            return this.componentOption.lineWidth;
        },

        showArrow:function(){
            return this.componentOption.showArrow;
        },

        getTitleLabelGap:function(){
            return TITLE_LABEL_GAP;
        },

        getAxisIndex:function(){
            return this.componentOption.axisIndex;
        },

        //普通的值轴
        _calculateValueNiceDomain:function(minValue, maxValue, fixedMin, fixedMax, zoomFix){

            var fromZero = this.type == Constants.VALUE_AXIS_COMPONENT;

            var axisOption = this.componentOption;

            minValue = fromZero ? Math.min(0, minValue) : minValue;

            minValue = BaseUtils.hasDefined(fixedMin) ? fixedMin : minValue;
            maxValue = BaseUtils.hasDefined(fixedMax) ? fixedMax : maxValue;

            if(minValue >= maxValue){
                minValue = fromZero ? Math.min(0, maxValue) : maxValue;
                maxValue = minValue + MIN_MAX_GAP;
            }

            var tickInterval = axisOption.tickInterval || this._linearTickInterval(minValue, maxValue);

            var domain = this._linearNiceDomain(minValue, maxValue, tickInterval);
            minValue = BaseUtils.hasDefined(fixedMin) ? fixedMin : domain[0];
            maxValue = BaseUtils.hasDefined(fixedMax) ? fixedMax : domain[1];

            if(minValue >= maxValue){
                minValue = fromZero ? Math.min(0, maxValue) : maxValue;
                maxValue = minValue + MIN_MAX_GAP;
            }

            var start = domain[0];

            if(BaseUtils.hasDefined(fixedMin)){

                var test;

                while((test = BaseUtils.accAdd(start, -tickInterval)) > fixedMin){
                    start = test;
                }

                while(start < fixedMin){
                    start = BaseUtils.accAdd(start, tickInterval);
                }
            }

            this.valueList = [];

            for(; start <= maxValue; start = BaseUtils.accAdd(start, tickInterval)){
                this.valueList.push(start);
            }

            this.lastScale = this.scale && this.scale.copy();

            this.scale = this.scale ?
                this.scale.domain([minValue, maxValue]) : d3.scale.linear().domain([minValue, maxValue]);

            return {minValue: minValue, maxValue: maxValue};
        },

        _linearTickInterval:function(minValue, maxValue, m){

            m = m || this._getDefaultTickCount();
            var span = maxValue - minValue;
            var step = Math.pow(10, Math.floor(Math.log(span / m) / Math.LN10));
            var err = m / span * step;

            if (err <= .15) step *= 10; else if (err <= .35) step *= 5; else if (err <= .75) step *= 2;

            return step;
        },

        _linearNiceDomain:function(minValue, maxValue, tickInterval){

            minValue = BaseUtils.accMul(Math.floor(minValue / tickInterval), tickInterval);

            maxValue = BaseUtils.accMul(Math.ceil(maxValue / tickInterval), tickInterval);

            return [minValue, maxValue];
        },

        _getDefaultTickCount:function(){
            return this.option.chartType == Constants.RADAR_CHART ? RADAR_TICK_COUNT : TICK_COUNT;
        },

        _isSeriesVisible:function(sery){
            var plotOptions = this.option.plotOptions;
            return BaseUtils.pick(QueryUtils.queryList([sery, plotOptions], 'visible'), true);
        },

        //gauge,radar的时候不用画
        getRender:function(){

            var chartType = this.option.chartType;

            if(chartType !== Constants.GAUGE_CHART
                            && chartType != Constants.RADAR_CHART && !this.option.plotOptions.force){
                return this.render;
            }

        }
    };

    BaseUtils.inherit(BaseAxis, Base);

    return BaseAxis;
});
/**
 * Created by eason on 15/5/18.
 * 分类轴的定义
 */
define('component/CategoryAxis',['require','./Base','./BaseAxis','../utils/BaseUtils','../Constants','../ComponentLibrary'],function(require){
    var Base = require('./Base');
    var BaseAxis = require('./BaseAxis');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function CategoryAxis(vanchart, option, axisOption, componentType){
        BaseAxis.call(this, vanchart, option, componentType);
        this.isRangePoints = false;
        this.refresh(option, axisOption);
    }

    CategoryAxis.prototype = {
        constructor:CategoryAxis,

        type:Constants.CATEGORY_AXIS_COMPONENT,

        initAttributesWithSeries:function(){

            var axisOption = this.componentOption;

            var series = this.vanchart.series;
            var stored = {};
            var isBaseAxis = this.isBaseAxis;
            var categories = axisOption.categories || this.categories || [];

            categories.forEach(function(category){
                stored[category] = true;
            });

            var hasArea = false, hasBar = false;

            for(var i = 0, len = series.length; i < len; i++){

                var sery = series[i];

                var byAxis = this.componentType == Constants.X_AXIS_COMPONENT ? sery.xAxis : sery.yAxis;

                if(byAxis == this){
                    sery.points.forEach(function(point){
                        var label =  isBaseAxis ? point.category : point.value;
                        if(BaseUtils.hasDefined(label) && !stored[label]){
                            categories.push(label);
                            stored[label] = true;
                        }
                    });
                    if(sery.type == Constants.AREA_CHART){
                        hasArea = true;
                    } else if (sery.type == Constants.BAR_CHART || sery.type == Constants.COLUMN_CHART) {
                        hasBar = true;
                    }
                }
            }

            this.isRangePoints = !hasBar && hasArea;

            this.categories = categories;

            this.scale = d3.scale.ordinal().domain(this.categories);

            this._updateOriginTickData();
        },

        updateCategories:function(newCategories){

            this.categories = newCategories;

            this.scale.domain(newCategories);

            this._updateOriginTickData();
        },

        _updateIndex:function(start, end){
            this.componentOption.startIndex = start;
            this.componentOption.endIndex = end;
        },

        getCategoryCount:function(){
            return this.categories.length;
        },

        indexOfLabel:function(label){
            return BaseUtils.indexInArray(this.categories, label);
        },

        getTickLength:function(){

            var domain = this.scale.domain();

            var range = this.scale.rangeExtent();

            var cateLength = Math.abs(range[1] - range[0]);

            if(this.isRangePoints && domain.length <= 1){
                return cateLength;
            }

           return  this.isRangePoints ? cateLength / (domain.length - 1) : this.scale.rangeBand();
        },

        _updateRange:function(){
            this.updateAxisScale(this._getStartIndex(), this._getEndIndex());
        },

        getValueFromData:function(datum, dIndex){

            var categories = this.componentOption.categories;

            var valueIndex = this.componentType == Constants.X_AXIS_COMPONENT ? 0 : 1;

            var valueKey = this.componentType == Constants.X_AXIS_COMPONENT ? 'x' : 'y';

            var cateory = BaseUtils.isArray(datum) ? datum[valueIndex] : datum[valueKey];

            return BaseUtils.hasDefined(cateory) ? cateory : categories[dIndex];
        },

        //考虑tickFormat的作用
        _getTickValues:function(){
            return this.scale.domain();
        },

        getCategories:function(){
            return this.scale.domain();
        },

        axisZoom:function(downPos, upPos){

            var startPos, endPos;

            var plotBounds = this.vanchart.getPlotBounds();

            //坐标轴是横向的
            if(this.isHorizontal()){
                startPos = Math.min(downPos[0], upPos[0]) - plotBounds.x;
                endPos = Math.max(downPos[0], upPos[0]) - plotBounds.x;
            }else{
                startPos = Math.min(downPos[1], upPos[1]) - plotBounds.y;
                endPos = Math.max(downPos[1], upPos[1]) - plotBounds.y;
            }

            var domain = this.scale.domain();
            var range = this.scale.rangeExtent();

            range = this._getRangeWithMinMax(range[0], range[1]);

            var tmpScale = d3.scale.quantize().domain(range).range(domain);

            var start = BaseUtils.indexInArray(this.categories, tmpScale(startPos));
            var end = BaseUtils.indexInArray(this.categories, tmpScale(endPos));

            this.updateAxisScale(Math.min(start, end), Math.max(start, end));
        },

        updateAxisScale:function(start, end){
            var domain = this.scale.domain();

            if(start != -1 && end != -1){

                var tmp = [];

                for(var index = start; index <= end; index++){
                    tmp.push(domain[index]);
                }

                this._updateIndex(start, end);

                var plotRange = this._getRange();

                var rangeBands;
                if(this.isRangePoints){
                    rangeBands = Math.abs(plotRange[0] - plotRange[1]) / Math.max(tmp.length - 1, 1);
                }else{
                    rangeBands = Math.abs(plotRange[0] - plotRange[1]) / tmp.length
                }

                var minValue = Math.min(plotRange[0], plotRange[1]);
                var maxValue = Math.max(plotRange[0], plotRange[1]);
                var t_s = start;
                var t_e = end;
                if(this.isAxisReversed()){
                    var totalCount = this.categories.length - 1;
                    t_s = Math.min(totalCount - start, totalCount - end);
                    t_e = Math.max(totalCount - start, totalCount - end);
                }

                if(this.isHorizontal()){
                    minValue -= t_s * rangeBands;
                    maxValue += (this.categories.length - t_e - 1) * rangeBands;
                }else{
                    minValue -= (this.categories.length - t_e - 1) * rangeBands;
                    maxValue += t_s * rangeBands;
                }

                var range = this._getRangeWithMinMax(minValue, maxValue);

                this.isRangePoints ? this.scale.rangePoints(range) : this.scale.rangeBands(range);

                this._updateOriginTickData();
                this._calculateTickData();
            }

        },

        _getRangeWithMinMax:function(min, max){
            var cfg = this.componentOption;

            if(this.isHorizontal()){
                return cfg.reversed ? [max, min] : [min, max];
            }else{
                return cfg.reversed ? [min, max] : [max, min];
            }
        },

        _initZoomStatus:function(){
            var zoom = this.vanchart.getComponent(Constants.ZOOM_COMPONENT);
            if(zoom && zoom.zoomToolEnabled() && BaseUtils.isSupportSVG()){

                if(this.vanchart.isInitOrRestoreState()){

                    var start = 0;
                    var end = this.categories.length - 1;

                    var zoomTool = zoom.componentOption.zoomTool;

                    if(zoomTool.from && BaseUtils.indexInArray(this.categories, zoomTool.from) != -1){
                        start = BaseUtils.indexInArray(this.categories, zoomTool.from);
                    }

                    if(zoomTool.to && BaseUtils.indexInArray(this.categories, zoomTool.to) != -1){
                        end = BaseUtils.indexInArray(this.categories, zoomTool.to);
                    }

                    this.updateAxisScale(Math.min(start, end), Math.max(start, end));

                }else{
                    this.updateAxisScale(this._getStartIndex(), this._getEndIndex());
                }
            }
        }
    };

    BaseUtils.inherit(CategoryAxis, BaseAxis);

    require('../ComponentLibrary').register(Constants.CATEGORY_AXIS_COMPONENT, CategoryAxis);
    return CategoryAxis;
});
/**
 * Created by eason on 15/5/18.
 * 值轴的定义
 */
define('component/ValueAxis',['require','./Base','./BaseAxis','../utils/BaseUtils','../utils/QueryUtils','../Constants','../Constants','../ComponentLibrary'],function(require){
    var Base = require('./Base');
    var BaseAxis = require('./BaseAxis');
    var BaseUtils = require('../utils/BaseUtils');
    var QueryUtils = require('../utils/QueryUtils');
    var Constants = require('../Constants');
    var Constants = require('../Constants');

    function ValueAxis(vanchart, option, axisOption, componentType){
        BaseAxis.call(this, vanchart, option, componentType);
        this.originalDomain = null;
        this.refresh(option, axisOption);
    }

    ValueAxis.prototype = {
        constructor:ValueAxis,

        type:Constants.VALUE_AXIS_COMPONENT,

        initAttributesWithSeries:function(){

            this._hasInited = true;

            //确定是不是byPercent
            var series = this.vanchart.series;
            this.byPercent = false;
            for(var i = 0,len = series.length; i < len && !this.byPercent; i++){
                var sery = series[i];

                var byAxis = this.componentType == Constants.X_AXIS_COMPONENT ? sery.xAxis : sery.yAxis;

                if(byAxis == this && sery.visible){
                    this.byPercent = sery.stackByPercent && !this.isBaseAxis;
                }
            }

            var minMax = this._calculateMinMaxValue();

            var axisOption = this.componentOption;

            this.originalDomain =
                this._calculateNiceDomain(minMax.minValue, minMax.maxValue, axisOption.min, axisOption.max);

            this._updateOriginTickData();
        },

        _updateDomainWhenSizeFixed:function(){

            var maxRadius = this.getMaxBubbleRadius();

            if(maxRadius && this.type == Constants.VALUE_AXIS_COMPONENT && this._hasInited){

                this._hasInited = false;

                var scale = this.scale;

                var domain = scale.domain();
                var range = scale.range();

                var minMax = this._calculateMinMaxValue();

                var maxRadiusNumber = Math.abs(maxRadius * (domain[0] - domain[1])/(range[1] - range[0]));

                var min = minMax.minValue - maxRadiusNumber;
                var max = minMax.maxValue + maxRadiusNumber;

                var axisOption = this.componentOption;

                this.originalDomain = this._calculateNiceDomain(min, max, axisOption.min, axisOption.max);

                this._updateOriginTickData();
            }

        },

        _calculateNiceDomain:function(minValue, maxValue, fixedMin, fixedMax, zoomFix){

            var axisOption = this.componentOption;

            if(axisOption.log && axisOption.log != 1){
                return this._calculateLogNiceDomain(minValue, maxValue);
            }else if(this.byPercent){
                return this._calculatePercentValueDomain();
            }else{
                return this._calculateValueNiceDomain(minValue, maxValue, fixedMin, fixedMax, zoomFix);
            }

        },

        _calculateLogNiceDomain:function(minValue, maxValue, ignoreMinMax){
            var axisOption = this.componentOption;

            var logBase = axisOption.log;

            var tickInterval = parseInt(BaseUtils.pick(axisOption.tickInterval, 1));

            this.valueList = [];

            minValue = minValue >= 1 ? 1 : minValue;
            minValue = minValue <= 0 ? 1 : minValue;

            minValue = ignoreMinMax ? minValue : BaseUtils.pick(axisOption.min, minValue);
            maxValue = ignoreMinMax ? maxValue : BaseUtils.pick(axisOption.max, maxValue);

            minValue = Math.pow(logBase, Math.floor(BaseUtils.log(logBase, minValue)));
            maxValue = Math.pow(logBase, Math.ceil(BaseUtils.log(logBase, maxValue)));


            this.scale = this.scale ? this.scale.domain([minValue, maxValue])
                                    : d3.scale.log().base(logBase).domain([minValue, maxValue]);

            var i = 0;
            while(minValue * Math.pow(logBase, i) <= maxValue){
                this.valueList.push(minValue * Math.pow(logBase, i));
                i += tickInterval;
            }

            return {minValue: minValue, maxValue: maxValue};
        },

        _calculatePercentValueDomain:function(){

            var axisOption = this.componentOption;

            var min = BaseUtils.pick(axisOption.min, 0);

            var max = BaseUtils.pick(axisOption.max, 1);

            var interval = BaseUtils.pick(axisOption.tickInterval, 0.25);

            this.valueList = [];

            for(var start = min; start <= max; start = BaseUtils.accAdd(start, interval)){
                this.valueList.push(start);
            }

            this.scale = this.scale ?
                this.scale.domain([min, max]) : d3.scale.linear().domain([min, max]);

            return {minValue: min, maxValue: max};
        },

        //从数据中计算最大最小值
        _calculateMinMaxValue:function(){

            var minValue = Number.MAX_VALUE;
            var maxValue = -minValue;
            var emptyData = true;

            var series = this.vanchart.series;
            var dataMap = {};

            for(var i = 0, len = series.length; i < len; i++){
                var sery = series[i];

                var byAxis = this.componentType == Constants.X_AXIS_COMPONENT ? sery.xAxis : sery.yAxis;

                if(byAxis == this && sery.visible){
                    this._getSeriesValue(dataMap, sery);
                }
            }

            for(var key in dataMap){
                var data = dataMap[key];
                for(var j = 0, dataCount = data.length; j < dataCount; j++){
                    if(!isNaN(data[j])){
                        minValue = Math.min(minValue, data[j]);
                        maxValue = Math.max(maxValue, data[j]);

                        emptyData = false;
                    }
                }
            }

            if(emptyData){
                minValue = 0;
                maxValue = 100;
            }

            return {
                minValue:minValue,
                maxValue:maxValue
            };
        },

        //获取系列的值，如果是堆积的话获取系列的和
        _getSeriesValue:function(dataMap, sery){

            var seriesName = sery.name || '';

            var isBaseAxis = this.isBaseAxis;

            if(BaseUtils.hasNotDefined(sery.stack) || isBaseAxis){
                dataMap[seriesName] = dataMap[seriesName] || [];

                sery.points.forEach(function(point){
                    dataMap[seriesName].push(isBaseAxis ? point.category : point.value);
                });

            }else{
                var PK = sery.stack + 'STACK_POSITIVE';
                var NK = sery.stack + 'STACK_NEGATIVE';
                dataMap[PK] = dataMap[PK] || [];
                dataMap[NK] = dataMap[NK] || [];

                sery.points.forEach(function(point, i){

                    var value = isBaseAxis ? point.category : point.value;

                    if(value > 0){
                        if(dataMap[PK][i] != null && dataMap[PK][i] != undefined){
                            dataMap[PK][i] += value;
                        }else{
                            dataMap[PK][i] = value;
                        }
                    }else{
                        if(dataMap[NK][i] != null && dataMap[NK][i] != undefined){
                            dataMap[NK][i] += value;
                        }else{
                            dataMap[NK][i] = value;
                        }
                    }

                });
            }
        },

        //'-'符号表示空值
        getValueFromData:function(datum){
            var valueIndex = this.componentType == Constants.X_AXIS_COMPONENT ? 0 : 1;
            var valueKey = this.componentType == Constants.X_AXIS_COMPONENT ? 'x' : 'y';

            var value = BaseUtils.isArray(datum) ? datum[valueIndex] : datum[valueKey];

            value = BaseUtils.pick(value, datum);

            value = +value;
            return isNaN(value) ? '-' : value;
        },

        //考虑有正负值的时候的0值对齐的功能
        getStartPos:function(){
            return this.scale(this.getStartPosValue());
        },

        getStartPosValue:function(){

            var axisOption = this.componentOption;

            return axisOption.log && axisOption.log != 1 ? 1 : 0;
        },

        getOriginalDomain: function () {
            return this.originalDomain;
        },

        //考虑tickFormat的作用
        _getTickValues:function(){
            return this.valueList;
        },

        _getTickValuesWithEndValue:function(){

            var result = BaseUtils.clone(this.valueList);

            var max = this.scale.domain()[1];

            if(result.length && result[result.length - 1] < max){
                result.push(max);
            }

            return result;
        },

        axisZoom:function(downPos, upPos){

            var startPos, endPos;

            var plotBounds = this.vanchart.getPlotBounds();

            //坐标轴是横向的
            if(this.isHorizontal()){
                startPos = Math.min(downPos[0], upPos[0]) - plotBounds.x;
                endPos = Math.max(downPos[0], upPos[0]) - plotBounds.x;

                startPos = Math.max(startPos, 0);
                endPos = Math.min(endPos, plotBounds.width);
            }else{
                startPos = Math.min(downPos[1], upPos[1]) - plotBounds.y;
                endPos = Math.max(downPos[1], upPos[1]) - plotBounds.y;

                startPos = Math.max(startPos, 0);
                endPos = Math.min(endPos, plotBounds.height);
            }

            var startValue = this.scale.invert(startPos);
            var endValue = this.scale.invert(endPos);

            this.updateAxisScale(Math.min(startValue, endValue), Math.max(startValue, endValue), true);
        },

        updateAxisScale:function(min, max, zoomFix){

            var cfg = this.componentOption;

            //值轴为底轴的时候,固定最大最小值才有效
            this._calculateNiceDomain(min, max, this.isBaseAxis ? min : cfg.min, this.isBaseAxis ? max : cfg.max, zoomFix && this.isBaseAxis);

            this._updateOriginTickData();

            this._calculateTickData();
        },

        _initZoomStatus:function(){
            var zoom = this.vanchart.getComponent(Constants.ZOOM_COMPONENT);
            if(zoom && zoom.zoomToolEnabled() && BaseUtils.isSupportSVG() && this.isBaseAxis){
                if(this.vanchart.isInitOrRestoreState()){

                    var revisedDomain = zoom.getRevisedDomain();

                    var domain = this.scale.domain();

                    var from = domain[0];

                    var to = domain[1];

                    if(revisedDomain.from){
                        from = parseFloat(revisedDomain.from);
                    }

                    if(revisedDomain.to){
                        to = parseFloat(revisedDomain.to);
                    }

                    this.updateAxisScale(from, to);
                }

            }
        }
    };

    BaseUtils.inherit(ValueAxis, BaseAxis);

    require('../ComponentLibrary').register(Constants.VALUE_AXIS_COMPONENT, ValueAxis);
    return ValueAxis;
});
/**
 * Created by eason on 15/11/2.
 */
define('component/DateAxis',['require','./Base','./BaseAxis','../utils/BaseUtils','../Constants','../utils/Formatter','../ComponentLibrary'],function(require){

    var Base = require('./Base');
    var BaseAxis = require('./BaseAxis');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var Formatter = require('../utils/Formatter');
    var TICK_COUNT = 5;

    var DAY = 1000 * 60 * 60 * 24;
    var MONTH = DAY * 31;
    var YEAR = 365 * MONTH;

    function DateAxis(vanchart, option, axisOption, componentType){
        BaseAxis.call(this, vanchart, option, componentType);
        this.refresh(option, axisOption);
    }

    DateAxis.prototype = {
        constructor:DateAxis,

        type:Constants.DATE_AXIS_COMPONENT,

        initAttributesWithSeries:function(){

            this.scale = d3.time.scale();

            var minMax = this._calculateMinMaxValue();

            var min = minMax.minValue;
            var max = minMax.maxValue;

            var cfg = this.componentOption;

            var domain = this._calculateValueNiceDomain(min, max, cfg.min, cfg.max);

            min = BaseUtils.int2date(domain.minValue);

            max = BaseUtils.int2date(domain.maxValue);

            this.originalDomain = {minValue:min, maxValue:max};

            this.scale = this.scale ?
                this.scale.domain([min, max]) : d3.time.scale().domain([min, max]);

            this._calculateDateFormat();

            this._updateOriginTickData();

            this._calculateTickData();
        },

        getOriginalDomain: function () {
            return this.originalDomain;
        },

        _calculateDateFormat:function(){
            var tickInterval = this._getTickInterval();

            var format = 'Dyyyy-MM-dd';

            if(tickInterval < DAY){
                format = 'Dyyyy-M-d H:mm'
            }else if(tickInterval < MONTH){
                format = 'Dyyyy-M-d'
            }else{
                format = 'Dyyyy-MM'
            }

            this.dateFormat = format;
        },

        _getTickContent:function(tick, formatter){

            if(!formatter || formatter == "function(){return arguments[0]}"){
                //todo 换成d3的格式
                var tmpFormat = this.dateFormat;
                formatter = function(){return window.FR ? FR.contentFormat(arguments[0], tmpFormat) : arguments[0]}
            }

            return Formatter.format(tick, formatter)
        },

        _getTickValues:function(){
            var result = [];
            this.valueList.forEach(function(date){
                result.push(BaseUtils.int2date(date));
            });

            return result;
        },

        _calculateMinMaxValue:function(){

            var minValue = Math.ceil(Number.MAX_VALUE);
            var maxValue = -minValue;

            var axisOption = this.componentOption;
            var series = this.option.series;
            var hasData = false;

            for(var i = 0, len = series.length; i < len; i++){
                var sery = series[i];
                var usedIndex = sery[this.componentType] || 0;
                if(usedIndex == axisOption.axisIndex && this._isSeriesVisible(sery)){
                    var data = sery.data;
                    for(var i = 0,len = data.length; i < len; i++){
                        var value = this.getValueFromData(data[i]);

                        if(value.getTime){
                            hasData = true;
                            value = BaseUtils.date2int(value);
                            minValue = Math.min(minValue, value);
                            maxValue = Math.max(maxValue, value);
                        }

                    }
                }
            }

            if(!hasData){
                minValue = maxValue = (new Date()).getTime();
            }

            maxValue = minValue >= maxValue ? minValue + 1000 : maxValue;

            return {
                minValue:minValue,
                maxValue:maxValue
            };
        },

        getValueFromData:function(datum){
            var valueIndex = this.componentType == Constants.X_AXIS_COMPONENT ? 0 : 1;
            var valueKey = this.componentType == Constants.X_AXIS_COMPONENT ? 'x' : 'y';

            var value = BaseUtils.isArray(datum) ? datum[valueIndex] : datum[valueKey];

            return BaseUtils.object2date(value);
        },

        axisZoom:function(downPos, upPos){

            var startPos, endPos;

            var plotBounds = this.vanchart.getPlotBounds();

            //坐标轴是横向的
            if(this.isHorizontal()){
                startPos = Math.min(downPos[0], upPos[0]) - plotBounds.x;
                endPos = Math.max(downPos[0], upPos[0]) - plotBounds.x;
            }else{
                startPos = Math.min(downPos[1], upPos[1]) - plotBounds.y;
                endPos = Math.max(downPos[1], upPos[1]) - plotBounds.y;
            }

            var startValue = this.scale.invert(startPos);
            var endValue = this.scale.invert(endPos);

            startValue = BaseUtils.date2int(startValue);
            endValue = BaseUtils.date2int(endValue);

            var min = Math.min(startValue, endValue);
            var max = Math.max(startValue, endValue);

            this._updateDomain(min, max, true);
        },

        //min, max是毫秒数
        _updateDomain:function(min, max, zoomFix){

            var domain = this._calculateValueNiceDomain(min, max, min, max, zoomFix);

            var minValue = BaseUtils.int2date(domain.minValue);

            var maxValue = BaseUtils.int2date(domain.maxValue);

            this.scale = this.scale ?
                this.scale.domain([minValue, maxValue]) : d3.time.scale().domain([minValue, maxValue]);

            this._calculateDateFormat();

            this._updateOriginTickData();

            this._calculateTickData();
        },

        updateAxisScale:function(minValue, maxValue, zoomFix){

            minValue = BaseUtils.date2int(minValue);

            maxValue = BaseUtils.date2int(maxValue);

            this._updateDomain(minValue, maxValue, zoomFix);
        },

        _initZoomStatus:function(){
            var zoom = this.vanchart.getComponent(Constants.ZOOM_COMPONENT);
            if(zoom && zoom.zoomToolEnabled() && BaseUtils.isSupportSVG() && this.isBaseAxis){
                if(this.vanchart.isInitOrRestoreState()){

                    var revisedDomain = zoom.getRevisedDomain();

                    var domain = this.scale.domain();

                    var from = BaseUtils.date2int(domain[0]);

                    var to = BaseUtils.date2int(domain[1]);

                    if(revisedDomain.from){
                        from = BaseUtils.object2date(revisedDomain.from);
                        from = BaseUtils.date2int(from);
                    }

                    if(revisedDomain.to){
                        to = BaseUtils.object2date(revisedDomain.to);
                        to = BaseUtils.date2int(to);
                    }

                    this._updateDomain(from, to);
                }

            }
        }
    };

    BaseUtils.inherit(DateAxis, BaseAxis);

    require('../ComponentLibrary').register(Constants.DATE_AXIS_COMPONENT, DateAxis);
    return DateAxis;

});
/**
 * Created by eason on 15/8/16.
 */

define('utils/LabelDivManager',['require','./BaseUtils','./ColorUtils','./BezierEasing'],function(require){

    var BaseUtils = require('./BaseUtils');
    var ColorUtils = require('./ColorUtils');
    var BezierEasing = require('./BezierEasing');

    var DEFAULT_KEY = 'div-label-key'

    function LabelDivManager(dom){
        this.dom = dom;
        this.labelList = {};
    }


    LabelDivManager.prototype = {
        constructor:LabelDivManager,

        //bounds是绝对坐标
        addLabel:function(label, posOrDim, style, key){

            key = key || DEFAULT_KEY;

            if(!this.labelList[key]){
                this.labelList[key] = [];
            }

            var labelArray = this.labelList[key];

            var div = document.createElement('div');
            div.innerHTML = label;

            div.style.position = 'absolute';
            div.style.left = posOrDim.x + 'px';
            div.style.top = posOrDim.y + 'px';
            div.style.overflow = 'hidden';
            div.style.whiteSpace = 'nowrap';

            if(BaseUtils.hasDefined(posOrDim.width) && BaseUtils.hasDefined(posOrDim.height)){
                div.style.width = posOrDim.width + 'px';
                div.style.height = posOrDim.height + 'px';
            }

            for(var fontStyle in style){
                //ie789的color属性只能是16进制的值
                if(fontStyle == 'color' && !BaseUtils.isSupportSVG()){
                    div.style.color = ColorUtils.colorToHex(style.color);
                }else {
                    div.style[fontStyle] = style[fontStyle];
                }

            }

            this.dom.appendChild(div);
            labelArray.push(div);

            return div;
        },


        addLabelWidthBounds:function(label, bounds, style, key){

            var div = this.addLabel(label, bounds, style, key);

            div.style.width = bounds.width + 'px';
            div.style.height = bounds.height + 'px';

            return div;
        },

        clearLabels:function(key){
            key = key || DEFAULT_KEY;

            var labelArray = this.labelList[key] || [];

            for(var i = 0, len = labelArray.length; i < len; i++){
                this.dom.removeChild(labelArray[i]);
            }

            this.labelList[key] = [];
        },

        //删除所有层级的div标签
        clearAllLabels:function(){
            for(var key in this.labelList){
                this.clearLabels(key);
            }
        },

        translateLabelsHorizontal:function(transX, key){

            key = key || DEFAULT_KEY;
            var labelArray = this.labelList[key] || [];

            for(var i = 0, len = labelArray.length; i < len; i++){
                var label = labelArray[i];
                var left = parseFloat(label.style.left);
                left += transX;

                if(BaseUtils.isSupportSVG()){

                    d3.select(label)
                        .transition()
                        .ease(BezierEasing.css.swing)
                        .duration(300)
                        .style('left', left + 'px')

                }else{
                    label.style.left = left + 'px';
                }
            }
        }
    }


    return LabelDivManager;

});
/**
 * Created by eason on 16/3/23.
 */

define('render/CanvasRender',['require','../utils/BaseUtils','../Constants'],function(require){

    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');


    function CanvasRender(dom, vanchart){

        this._init(dom, vanchart)
    }

    CanvasRender.prototype = {

        constructor:CanvasRender,

        _init:function(dom, vanchart){

            var plotBounds = vanchart.getPlotBounds();

            this.width = plotBounds.width;
            this.height = plotBounds.height;

            this.dom = this._createCanvas(dom, plotBounds);
            this.ctx = this.dom.getContext("2d");
        },

        _createCanvas:function(dom, plotBounds){

            var canvas = document.createElement('canvas');
            var width = plotBounds.width;
            var height = plotBounds.height;

            canvas.style.position = 'absolute';
            canvas.style.left = plotBounds.x + 'px';
            canvas.style.top = plotBounds.y + 'px';
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            canvas.width = width;
            canvas.height = height;

            canvas.onselectstart = function(){return false};
            canvas.style['-webkit-user-select'] = 'none';
            canvas.style['user-select'] = 'none';
            canvas.style['-webkit-touch-callout'] = 'none';

            dom.appendChild(canvas);

            //excanvas
            window.vmlCanvasManager && vmlCanvasManager.initElement(canvas);

            return canvas;
        },

        clearAll:function(){
            this.ctx.clearRect(0, 0, this.width, this.height);
        },

        addBubbleSeries:function(series){
            var ctx = this.ctx;
            ctx.save();

            for(var i = 0, len = series.points.length; i < len; i++){
                var point = series.points[i];

                if(point.visible){

                    ctx.fillStyle = point.color;
                    ctx.globalAlpha = point.fillColorOpacity;

                    ctx.beginPath();
                    ctx.arc(point.posX, point.posY, point.radius, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }

            ctx.restore();
        },

        addScatterSeries:function(series){
            var ctx = this.ctx;
            ctx.save();
            for(var i = 0, len = series.points.length; i < len; i++){
                var point = series.points[i];
                if(point.visible){
                    var markerType = point.marker.symbol;
                    var radius =  point.marker.radius || 4.5;
                    var color = point.marker.fillColor || point.color;

                    ctx.translate(point.posX, point.posY);
                    ctx.fillStyle = color;
                    ctx.strokeStyle = color;
                    ctx.globalAlpha = point.fillColorOpacity;

                    this._drawMarker(ctx, markerType, radius);

                    ctx.translate(-point.posX, -point.posY);
                }
            }
            ctx.restore();
        },

        addSeries:function(series){

            series.chart.componentType == Constants.SCATTER_CHART ?
                                        this.addScatterSeries(series) : this.addBubbleSeries(series);
        },

        _drawMarker:function(ctx, markerType, R){

            if(markerType.indexOf(Constants.CIRCLE) != -1){

                ctx.beginPath();
                ctx.arc(0, 0, R, 0, 2 * Math.PI);

            }else if(markerType.indexOf(Constants.SQUARE) != -1){

                ctx.beginPath();
                ctx.moveTo(-R, -R);
                ctx.lineTo(R, -R);
                ctx.lineTo(R, R);
                ctx.lineTo(-R, R);
                ctx.closePath();

            }else if(markerType.indexOf(Constants.DIAMOND) != -1){

                R = R * 2 / Math.sqrt(2);
                ctx.beginPath();
                ctx.moveTo(-R, 0);
                ctx.lineTo(0, -R);
                ctx.lineTo(R, 0);
                ctx.lineTo(0, R);
                ctx.closePath();

            }else if(markerType.indexOf(Constants.TRIANGLE) != -1){

                ctx.beginPath();
                ctx.moveTo(-R, R/Math.sqrt(3));
                ctx.lineTo(0, -(2 * Math.sqrt(3) / 3) * R);
                ctx.lineTo(R, R/Math.sqrt(3));
                ctx.closePath();

            }else{

                ctx.beginPath();
                ctx.arc(0, 0, R, 0, 2 * Math.PI);

            }

            if(markerType.indexOf('hollow') == -1){
                //满填充
                ctx.fill();
            }else{
                ctx.fillStyle = 'white';
                ctx.lineWidth = 2;

                ctx.fill();
                ctx.stroke();
            }

        }
    };



    return CanvasRender;
});

/**
 * Created by eason on 15/8/13.
 */

define('render/BaseRender',['require','../utils/BaseUtils','../utils/LabelDivManager','../utils/ColorUtils','../Constants','./CanvasRender'],function(require){

    var BaseUtils = require('../utils/BaseUtils');
    var LabelDivManager = require('../utils/LabelDivManager');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');
    var CanvasRender = require('./CanvasRender');

    var MARKER_G = 'markerG';
    var MARKER = 'markerPath';
    var MARKER_STROKE = 'markerStrokePath';
    var MIN_MARKER_R = 2;

    function BaseRender(component){
        this.component = component;

        if(component && component.getParentDom){
            this.labelDivManager = new LabelDivManager(component.getParentDom());
        }

        this.drawLabelTimeOut = {};
    }

    BaseRender.prototype = {
        constructor:BaseRender,

        render:function(){

        },

        _createHorizontalLinearGradient:function(defs, id, startColor, endColor){
            this._createLinearGradient(defs, id, startColor, endColor, true);
        },

        _createVerticalLinearGradient:function(defs, id, startColor, endColor){
            this._createLinearGradient(defs, id, startColor, endColor, false);
        },

        _createLinearGradient:function(defs, id, startColor, endColor, isHorizontal){

            var  x2 = '0%', y2 = '0%';

            isHorizontal ? x2 = '100%' : y2 = '100%';

            var gradient = defs.append('linearGradient')
                .attr('x1', '0%').attr('y1', '0%')
                .attr('x2', x2).attr('y2', y2)
                .attr("id", id);

            gradient.append("stop").attr("offset", '0%').style("stop-color", startColor);

            gradient.append('stop').attr('offset', '100%').style('stop-color', endColor);
        },


        _createDropShadowFilter:function(defs, id, dx, dy, alpha, deviation){
            var dropFilter = defs.append('filter')
                .attr('id', id)
                .attr('x', '-50%')
                .attr('y', '-50%')
                .attr('width', '200%')
                .attr('height', '200%');

            dropFilter
                .append('feOffset')
                .attr('in', 'SourceAlpha')
                .attr('dx', dx)
                .attr('dy', dy)
                .attr('result', 'offOut');

            dropFilter
                .append('feColorMatrix')
                .attr('in', 'offOut')
                .attr('type', 'matrix')
                .attr('values', '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 '+alpha+' 0')
                .attr('result', 'matrixOut');

            dropFilter
                .append('feGaussianBlur')
                .attr('in', 'matrixOut')
                .attr('stdDeviation', deviation)
                .attr('result', 'blurOut');

            dropFilter
                .append('feBlend')
                .attr('in', 'SourceGraphic')
                .attr('in2', 'blurOut')
                .attr('mode', 'normal');
        },

        _createInnerShadowFilter:function(defs, id, dx, dy, alpha, deviation){

            var innerFilter = defs.append('filter')
                .attr('id', id)
                .attr('x', '-50%')
                .attr('y', '-50%')
                .attr('width', '200%')
                .attr('height', '200%');

            innerFilter.append('feComponentTransfer')
                .attr('in', 'SourceAlpha')
                .append('feFuncA')
                .attr('type', 'table')
                .attr('tableValues', '1 0');

            innerFilter.append('feGaussianBlur')
                .attr('stdDeviation', deviation);

            innerFilter.append('feOffset')
                .attr('dx', dx)
                .attr('dy', dy)
                .attr('result', 'offsetblur');

            innerFilter.append('feFlood')
                .attr('flood-color', 'black')
                .attr('flood-opacity', alpha)
                .attr('result', 'color');

            innerFilter.append('feComposite')
                .attr('in2', 'offsetblur')
                .attr('operator', 'in');

            innerFilter.append('feComposite')
                .attr('in2', 'SourceAlpha')
                .attr('operator', 'in');

            var merge = innerFilter.append('feMerge');
            merge.append('feMergeNode').attr('in', 'SourceGraphic');
            merge.append('feMergeNode');
        },

        _createVmlMarker:function(paper, point, position){

            var plotBounds = this.component.getPlotBounds();

            var defaultRadius = this.component.getDefaultMarkerRadius();
            var radius =  point.marker.radius;

            if(BaseUtils.hasDefined(radius) && radius < MIN_MARKER_R){
                return {};
            }

            radius = radius || defaultRadius;


            if(BaseUtils.outsideRect(plotBounds, BaseUtils.makeBounds(position, [radius, radius]))){
                return {};
            }

            var markerType = point.marker.symbol;
            var isNullMarker = markerType == Constants.NULL_MARKER;
            var backgroundColor = this.component._getBackgroundColor();

            var markerRadius = this._isHollowMarker(markerType) ? radius - 1 : radius;
            var opacity = ColorUtils.getColorOpacityWithoutDefault(point.marker.fillColor);
            opacity = BaseUtils.hasDefined(opacity) ? opacity : point.fillColorOpacity;

            var marker = paper.path(this._getMarkerPath(markerType, markerRadius))
                .attr({
                    'fill':(this._isHollowMarker(markerType) || isNullMarker) ? backgroundColor : point.marker.fillColor,
                    'fill-opacity':isNullMarker ? 0 : opacity,
                    'stroke':point.marker.fillColor,
                    'stroke-width':this._isHollowMarker(markerType) ? 2 : 0
                })
                .transform(BaseUtils.makeTranslate(position));

            var strokeMarker;
            if(this.component.type == Constants.LINE_CHART){
                strokeMarker = paper.path(this._getMarkerPath(markerType, radius + 1))
                    .attr({
                        'stroke-width':isNullMarker ? 0 : 2,
                        'stroke': backgroundColor,
                        'fill':'none'
                    })
                    .transform(BaseUtils.makeTranslate(position));
            }

            marker.node._data_ = point;
            this.addShapeEventHandler(marker);

            return {
                marker:marker,
                strokeMarker:strokeMarker
            }
        },

        _getMarkerGroupClass:function(d){
            return d.className + ' ' + MARKER_G;
        },

        _createSvgMarker:function(updateS){
            var self = this;
            var defaultRadius = this.component.getDefaultMarkerRadius();
            var backgroundColor = this.component._getBackgroundColor();

            updateS.enter().append('g')
                .attr('class', function(d){
                    return self._getMarkerGroupClass(d);
                })
                .filter(function(d){
                    var radius = d.marker.radius;
                    return d.visible && (BaseUtils.hasNotDefined(radius) || radius >= MIN_MARKER_R);
                })
                .each(function(data){

                    if(data.isNull){
                        return;
                    }

                    var markerG = d3.select(this);
                    var markerType = data.marker.symbol;
                    var isNullMarker = markerType == Constants.NULL_MARKER;

                    if(BaseUtils.isImageMarker(markerType)){
                        //创建图片的标记点
                        self._createImageMarker(markerType, function(width, height){
                            var width = data.marker.width || width;
                            var height = data.marker.height || height;
                            data.marker.width = width;
                            data.marker.height = height;

                            markerG
                                .append('image')
                                .attr('preserveAspectRatio', 'none')
                                .attr('xlink:href', markerType)
                                .attr('x', -width/2)
                                .attr('y', -height/2)
                                .attr('width', width)
                                .attr('height', height);
                        });
                    }else{
                        markerG
                            .append('path')
                            .attr('class', MARKER)
                            .attr('d', function(d){
                                var radius =  d.marker.radius || defaultRadius;

                                if(self._isHollowMarker(markerType))
                                    radius -= 1;

                                return self._getMarkerPath(markerType, radius);
                            })
                            .style('fill', function(d){
                                return self._isHollowMarker(markerType) ? backgroundColor : d.marker.fillColor;
                            })
                            .style('fill-opacity', isNullMarker ? 0 : function (d) {
                                return d.fillColorOpacity;
                            })
                            .style('stroke', function(d){
                                return d.marker.fillColor;
                            })
                            .style('stroke-width', function(){
                                return self._isHollowMarker(markerType) ? 2 : 0;
                            });

                        if(self.component.type == Constants.LINE_CHART){
                            markerG
                                .append('path')
                                .attr('class', MARKER_STROKE)
                                .attr('d', function(d){
                                    var radius =  d.marker.radius || defaultRadius;
                                    return self._getMarkerPath(markerType, radius + 1);
                                })
                                .style('stroke-width', isNullMarker ? 0 : 2)
                                .style('stroke', backgroundColor)
                                .style('fill', 'none')
                        }
                    }

                    self.addShapeEventHandler(markerG);
                });
        },

        _createImageMarker:function(src, callBack){
            var img = new Image();
            img.onload = function() {
                callBack(this.width, this.height);
            };
            img.src = src;
        },

        _getMarkerClass:function(){
            return MARKER_G;
        },

        _makeVmlMarkerChosenState:function(d){

            var markerType = d.marker.symbol;
            var radius =  d.marker.radius || this.component.getDefaultMarkerRadius();
            var pathR = this._isHollowMarker(markerType) ? radius - 1 : radius;
            var backgroundColor = this.component._getBackgroundColor();

            var makerSet = this.getElementByData(d);

            if(!makerSet || !makerSet.marker){
                return;
            }

            var marker = makerSet.marker;
            var strokeMarker = makerSet.strokeMarker;

            marker.attr({
                'path':this._getMarkerPath(markerType, pathR + 2),
                'fill':!this._isHollowMarker(markerType) ? d.marker.fillColor : backgroundColor,
                'fill-opacity':1
            });

            if(strokeMarker){
                strokeMarker.attr({
                    'path':this._getMarkerPath(markerType, radius + 3)
                });
            }
        },

        _cancelVmlMarkerChosenState:function(d){

            var markerType = d.marker.symbol;
            var isNullMarker = markerType == Constants.NULL_MARKER;
            var radius =  d.marker.radius || this.component.getDefaultMarkerRadius();
            var pathR = this._isHollowMarker(markerType) ? radius - 1 : radius;
            var backgroundColor = this.component._getBackgroundColor();

            var makerSet = this.getElementByData(d);

            if(!makerSet || !makerSet.marker){
                return;
            }

            var marker = makerSet.marker;
            var strokeMarker = makerSet.strokeMarker;

            marker.attr({
                'path':this._getMarkerPath(markerType, pathR),
                'fill':(this._isHollowMarker(markerType) || isNullMarker) ? backgroundColor : d.marker.fillColor,
                'fill-opacity':isNullMarker ? 0 : 1
            });

            if(strokeMarker){
                strokeMarker.attr({
                    'path':this._getMarkerPath(markerType, radius + 1),
                    'stroke-width': isNullMarker ? 0 : 2
                });
            }

        },

        _makeMarkerClickedState:function(parentS, d){
            var markerG = parentS.select('g.' + d.className);

            var backgroundColor = this.component._getBackgroundColor();
            var markerFillColor = d.marker.fillColor;

            backgroundColor = ColorUtils.getClickColor(backgroundColor);
            markerFillColor = ColorUtils.getClickColor(markerFillColor);

            var markerType = d.marker.symbol;

            markerG
                .select('path.' + MARKER)
                .style('fill',  this._isHollowMarker(markerType) ? backgroundColor : markerFillColor)
                .style('stroke', markerFillColor);

            markerG
                .select('path.' + MARKER_STROKE).style('stroke', backgroundColor);
        },

        _cancelMarkerClickedState:function(parentS, d){

            var markerG = parentS.select('g.' + d.className);

            var backgroundColor = this.component._getBackgroundColor();
            var markerFillColor = d.marker.fillColor;

            var markerType = d.marker.symbol;

            markerG
                .select('path.' + MARKER)
                .style('fill',  this._isHollowMarker(markerType) ? backgroundColor : markerFillColor)
                .style('stroke', markerFillColor);

            markerG
                .select('path.' + MARKER_STROKE).style('stroke', backgroundColor);

        },

        _makeMarkerChosenState:function(parentS, d, addSize, animationTime){
            addSize = addSize || 2;
            animationTime = animationTime || 0;

            var markerType = d.marker.symbol;
            var radius =  d.marker.radius || this.component.getDefaultMarkerRadius();
            var isNullMarker = markerType == Constants.NULL_MARKER;

            var pathR = radius;
            var backgroundColor = ColorUtils.getHighLightColor(this.component._getBackgroundColor());
            var markerHighlightColor = ColorUtils.getHighLightColor(d.marker.fillColor);

            var self = this;

            if(this._isHollowMarker(markerType))
                pathR -= 1;


            var markerG = parentS.select('g.' + d.className);

            if(markerG){
                markerG
                    .select('path.' + MARKER)
                    .style('fill', !this._isHollowMarker(markerType) ? markerHighlightColor : backgroundColor)
                    .style('fill-opacity', isNullMarker ? 1 : BaseUtils.pick(d.fillColorOpacity, 1))
                    .interrupt(Constants.SELECT_ANIMATION)
                    .transition(Constants.SELECT_ANIMATION)
                    .duration(animationTime)
                    .ease('ease-out-expo')
                    .attr('d', self._getMarkerPath(markerType, isNullMarker ? pathR : (pathR + addSize)))
                    ;

                markerG
                    .select('path.' + MARKER_STROKE)
                    .attr('d', self._getMarkerPath(markerType, isNullMarker ? radius : (radius + 3)))
                    .style('stroke-width', 2);

                var image = markerG.select('image');
                if(!image.empty()){
                    var width = d.marker.width + 4;
                    var height = d.marker.height + 4;
                    image
                        .attr('x', -width/2)
                        .attr('y', -height/2)
                        .attr('width', width)
                        .attr('height', height)
                }
            }

        },

        _cancelMarkerChosenState:function(parentS, d){

            var backgroundColor = this.component._getBackgroundColor();

            var markerType = d.marker.symbol;
            var isNullMarker = markerType == Constants.NULL_MARKER;
            var radius =  d.marker.radius || this.component.getDefaultMarkerRadius();
            var self = this;

            var pathR = radius;
            if(this._isHollowMarker(markerType))
                pathR -= 1;

            var markerG = parentS.select('g.' + d.className);
            if(markerG){

                //stop animation
                markerG
                    .select('path.' + MARKER)
                    .interrupt(Constants.SELECT_ANIMATION)
                    .transition(Constants.SELECT_ANIMATION);

                markerG
                    .select('path.' + MARKER)
                    .attr('d', self._getMarkerPath(markerType, pathR))
                    .style('fill', self._isHollowMarker(markerType) ? backgroundColor : d.marker.fillColor)
                    .style('fill-opacity', isNullMarker ? 0 : BaseUtils.pick(d.fillColorOpacity, 1));

                markerG
                    .select('path.' + MARKER_STROKE)
                    .attr('d', function(){
                        return self._getMarkerPath(markerType, radius + 1);
                    })
                    .style('stroke-width', isNullMarker ? 0 : 2);

                var image = markerG.select('image');
                if(!image.empty()){
                    var width = d.marker.width;
                    var height = d.marker.height;
                    image
                        .interrupt()
                        .attr('x', -width/2)
                        .attr('y', -height/2)
                        .attr('width', width)
                        .attr('height', height);
                }
            }
        },

        _renderDivLabels:function(points, transX, transY, key){

            var plotBounds = this.component.getPlotBounds();

            var isPieChart = this.component.componentType == Constants.PIE_CHART;

            for(var i = 0, len = points.length; i < len; i++){
                var p = points[i];
                if(p.visible && p.dataLabels && p.dataLabels.enabled && p.dataLabels.useHtml && p.labelPos && p.labelContent.length){

                    var labelX = p.labelPos.x + transX;
                    var labelY = p.labelPos.y + transY;
                    var labelContent = p.labelContent;

                    //ie低版本字体会出现大小
                    for(var index = 0, count = labelContent.length; index < count; index++){

                        var label = labelContent[index];

                        var labelDim = label.dim;

                        var pos = {x:labelX, y:labelY};

                        if(!BaseUtils.outsideRect(plotBounds, BaseUtils.makeBounds(pos, labelDim))){
                            var div = this.labelDivManager.addLabel(label.text, BaseUtils.makeBounds(pos, labelDim) , label.style, key);
                        }

                        labelY += (labelDim.height + this.component.getLabelGap());
                    }


                }
            }
        },

        _removeSvgDataLabels:function(parentG, key){

            parentG.selectAll('text').remove();
            parentG.selectAll('path').remove();

            this.labelDivManager.clearLabels(key);
        },


        _updateChartBodyTranslate:function(GlyphArray, supportAnimation, animationTime) {
            var plotBounds = this.component.getPlotBounds();
            var clipID = this.component.vanchart.getBodyClipID();

            GlyphArray.forEach(function (Glyph) {
                Glyph
                    .attr('clip-path', "url(#" + clipID +")")
                    .transition()
                    .duration(supportAnimation ? animationTime : 0)
                    .ease('back-out')
                    .attr('transform', 'translate('+plotBounds.x+','+plotBounds.y+')');

            });
        },

        _drawNormalChartLabels: function (parentG, delay) {
            var seriesS = this.component.getVisibleChartData();

            var plotBounds = this.component.getPlotBounds();

            var allPoints = [];
            seriesS.forEach(function(sery){
                allPoints = allPoints.concat(sery.points);
            });

            var validPoints = [];
            var tmpBounds = BaseUtils.makeBounds(0, 0, plotBounds.width, plotBounds.height);
            allPoints.forEach(function(point){
                if(point.labelPos && point.labelDim){

                    var x = point.labelPos.x + point.labelDim.width/2;
                    var y = point.labelPos.y + point.labelDim.height/2;

                    if(BaseUtils.containsPoint(tmpBounds, [x, y])){
                        validPoints.push(point);
                    }
                }
            });

            this._drawSvgDataLabels(parentG, validPoints, plotBounds.x, plotBounds.y, delay);
        },

        _drawSvgDataLabels:function(parentG, points, transX, transY, delay, key){

            delay = delay || 0;

            key = key || 'default-label-key';

            clearTimeout(this.drawLabelTimeOut[key]);

            var self = this;

            this._removeSvgDataLabels(parentG, key);

            this.drawLabelTimeOut[key] = setTimeout(function(){
                parentG
                    .style('opacity', 0)
                    .selectAll('text')
                    .data(points)
                    .enter()
                    .append('text')
                    .filter(function(d){
                        return d.visible
                            && d.labelPos
                            && d.dataLabels
                            && d.dataLabels.enabled
                            && !d.dataLabels.useHtml ;
                    })
                    .each(function(d){

                        var labelContent = d.labelContent;

                        var centerX = d.labelPos.x + d.labelDim.width/2;

                        var startY = d.labelPos.y;

                        for(var i = 0, count = labelContent.length; i < count; i++){
                            var label = labelContent[i];

                            var labelDim = label.dim;
                            var labelText = label.text;
                            var labelStyle = label.style;

                            d3.select(this)
                                .append('tspan')
                                .attr('x', centerX)
                                .attr('y', startY + labelDim.height/2)
                                .attr('dy', '.32em')
                                .attr("text-anchor", "middle")
                                .text(labelText)
                                .call(BaseUtils.setTextStyle, labelStyle);

                            startY += (labelDim.height + self.component.getLabelGap());
                        }
                    });

                parentG
                    .transition('linear')
                    .duration(400)
                    .style('opacity', 1);

                self._renderDivLabels(points, transX, transY, key);

                if(self.component.componentType == Constants.PIE_CHART || self.component.componentType == Constants.BUBBLE_CHART){

                    //饼图气泡图标签 加。
                    self.addShapeEventHandler(parentG.selectAll('text').filter(function(d){
                        return d.dataLabels && d.dataLabels.align != Constants.OUTSIDE;
                    }));

                    parentG
                        .selectAll('path').data(points)
                        .enter()
                        .append('path')
                        .filter(function(d){
                            return d.visible
                                && d.labelPos
                                && d.dataLabels
                                && d.dataLabels.enabled
                                && d.dataLabels.align == Constants.OUTSIDE;
                        })
                        .attr('d', function(d){
                            var startPos = d.labelPos.startPos;
                            var midPos = d.labelPos.midPos;
                            var endPos = d.labelPos.endPos;

                            return 'M' + startPos.x + ',' + startPos.y
                                + 'L' + midPos.x + ',' + midPos.y
                                + 'L' + endPos.x + ',' + endPos.y;
                        })
                        .style('fill', 'none')
                        .style('stroke', function(d){
                            return d.dataLabels.connectorColor || d.color;
                        })
                        .style('stroke-width', function(d){
                            return d.dataLabels.connectorWidth || 0;
                        });
                }

            }, delay);
        },

        _drawTitleWithHtml:function(cfg, bounds, reservedWidth){
            var style = BaseUtils.clone(cfg.style);

            var padding = this.component.getPadding();
            style.textAlign = cfg.align || 'left';

            var usedBounds = {
                x:bounds.x + padding,
                y:bounds.y + padding,
                width:bounds.width - 2 * padding - reservedWidth,
                height:bounds.height - 2 * padding
            };

            this.labelDivManager.addLabelWidthBounds(cfg.text, usedBounds, style);
        },

        _renderVmlBackground: function (parentSet, paper, option, bounds) {
            if(option.shadow){
                var borderWidth = option.borderWidth || 0;

                var det = borderWidth % 2 == 0 ? 0.5 : 0;

                var width = [5, 3, 1];
                var opacity = [0.05, 0.1, 0.15];
                for(var i = 0; i < 3; i++){
                    parentSet.push(
                        paper.rect(bounds.x + det, bounds.y + det, bounds.width, bounds.height)
                            .attr({
                                fill: 'none',
                                stroke: 'rgb(0,0,0)',
                                'stroke-opacity':opacity[i],
                                'stroke-width': width[i],
                                'rx': option.borderRadius,
                                'ry': option.borderRadius
                            })
                            .transform('t1,1')
                    );
                }

                parentSet.push(
                    paper.rect(bounds.x, bounds.y, bounds.width, bounds.height)
                        .attr({
                            fill: 'white',
                            stroke: 'none',
                            'rx': option.borderRadius,
                            'ry': option.borderRadius
                        }));
            }

            parentSet.push(
                paper.rect(bounds.x, bounds.y, bounds.width, bounds.height)
                    .attr('class', 'legend-background')
                    .attr('rx', option.borderRadius)
                    .attr('ry', option.borderRadius)
                    .attr('fill', this._getRaphaelFill(option.backgroundColor))
                    .attr('fill-opacity', this._getFillOpacity(option.backgroundColor))
                    .attr('stroke', option.borderColor)
                    .attr('stroke-width', option.borderWidth)
            );
        },

        _renderSvgBackground:function(parentG, option, bounds, gradualID){

            if(bounds.width <= 0 || bounds.height <= 0){
                return;
            }

            if(option.backgroundColor && parentG.select('defs').empty()){
                this._createGradualDefs(parentG, option.backgroundColor, gradualID);
            }

            var borderWidth = option.borderWidth || 0;
            var borderBounds = BaseUtils.rectSubPixelOpt(0, 0, bounds.width, bounds.height, borderWidth);

            if(option.shadow){

                var det =  BaseUtils.lineSubPixelOpt(0, borderWidth);

                var width = [5, 3, 1];
                var opacity = [0.05, 0.1, 0.15];

                var shadowRect = parentG.selectAll('rect.shadow').data(width);
                shadowRect.enter().append('rect').attr('class', 'shadow');
                shadowRect.attr('x', det).attr('y', det)
                    .attr('width', bounds.width).attr('height', bounds.height)
                    .attr('rx', option.borderRadius).attr('ry', option.borderRadius)
                    .attr('transform', 'translate(1, 1)')
                    .style('fill', 'none').style('stroke', 'black')
                    .style('stroke-width', function(d){return d})
                    .style('stroke-opacity', function(d, i){return opacity[i]});

                var background = parentG.selectAll('rect.shadowBackground').data([0]);
                background.enter().append('rect').attr('class', 'shadowBackground');

                background
                    .attr('x', borderBounds.x)
                    .attr('y', borderBounds.y)
                    .attr('width', borderBounds.width)
                    .attr('height', borderBounds.height)
                    .attr('rx', option.borderRadius)
                    .attr('ry', option.borderRadius)
                    .style('fill', 'white');
            }

            var background = parentG.selectAll('rect.background').data([0]);
            background.enter().append('rect').attr('class', 'background');

            background
                .attr('x', borderBounds.x)
                .attr('y', borderBounds.y)
                .attr('width', borderBounds.width)
                .attr('height', borderBounds.height)
                .attr('rx', option.borderRadius)
                .attr('ry', option.borderRadius)
                .style('fill', option.backgroundColor ? (typeof option.backgroundColor == 'string' ? option.backgroundColor : "url(#" + gradualID + ")") : 'none')
                .style('stroke', option.borderColor)
                .style('stroke-width', option.borderWidth);
        },

        _createGradualDefs:function(gElement, color, ID){
            if(color){
                if(typeof color == 'object'){
                    var linearGradient = gElement
                        .append('defs')
                        .append('linearGradient')
                        .attr('id', ID)
                        .attr('x1', color.x1)
                        .attr('y1', color.y1)
                        .attr('x2', color.x2)
                        .attr('y2', color.y2);

                    linearGradient.append('stop')
                        .attr('offset', '0%')
                        .style('stop-color', color.startColor);

                    linearGradient.append('stop')
                        .attr('offset', '100%')
                        .style('stop-color', color.endColor);
                }
            }
        },

        //可能是渐变色
        _getRaphaelFill:function(color){
            if(color){

                if(typeof color == 'string'){
                    return color;
                }else{
                    //渐变色
                    var angle = 0;
                    var start = parseFloat(color.x1);
                    var end = parseFloat(color.x2);

                    if(color.x1 == color.x2){
                        angle = 270;
                        start = parseFloat(color.y1) * 100;
                        end = parseFloat(color.y2) * 100;
                    }

                    return angle + '-' + color.startColor + ':' + start + '-' + color.endColor + ':' + end;

                }
            }

            return 'none';
        },

        _drawVmlDataLabels:function(paper, labelSet, points, transX, transY){

            var plotBounds = this.component.getPlotBounds();

            var labelPoints = [];
            for(var i = 0, len = points.length; i < len; i++){

                var point = points[i];

                if(point && point.visible && point.dataLabels && point.dataLabels.enabled && point.labelPos){

                    var labelAbsPos = {
                        x:point.labelPos.x + transX,
                        y:point.labelPos.y + transY
                    };

                    if(BaseUtils.containsPoint(plotBounds, labelAbsPos)){
                        labelPoints.push(point);
                    }
                }
            }

            for(var i = 0, len = labelPoints.length; i < len; i++){
                var point = labelPoints[i];

                var labelContent  = point.labelContent;
                var wholeLabelDim = point.labelDim;

                var labelX = point.labelPos.x + transX;
                var labelY = point.labelPos.y + transY;

                //ie低版本字体会出现大小
                for(var index = 0, count = labelContent.length; index < count; index++){

                    var label = labelContent[index];

                    var labelDim = label.dim;

                    var midGap = (wholeLabelDim.width - labelDim.width)/2;
                    midGap = Math.max(0, midGap);

                    this.labelDivManager.addLabel(label.text, BaseUtils.makeBounds({x:labelX + midGap, y:labelY}, labelDim), label.style, point.category);

                    labelY += (labelDim.height + this.component.getLabelGap());
                }

                if(point.dataLabels.align == Constants.OUTSIDE && this.component.componentType == Constants.PIE_CHART){

                    var startPos = point.labelPos.startPos;
                    var midPos = point.labelPos.midPos;
                    var endPos = point.labelPos.endPos;

                    var leadLine = paper.path(
                        'M' + BaseUtils.dealFloatPrecision(startPos.x) + ',' + BaseUtils.dealFloatPrecision(startPos.y)
                        + 'L' + BaseUtils.dealFloatPrecision(midPos.x) + ',' + BaseUtils.dealFloatPrecision(midPos.y)
                        + 'L' + BaseUtils.dealFloatPrecision(endPos.x) + ',' + BaseUtils.dealFloatPrecision(endPos.y))
                        .transform(('t' + transX + ',' + transY))
                        .attr('fill', 'none')
                        .attr('stroke', point.dataLabels.connectorColor || point.color)
                        .attr('stroke-width', point.dataLabels.connectorWidth || 0);

                    labelSet.push(leadLine);

                }

            }

        },

        _isHollowMarker:function(markerType){
            return markerType.indexOf('hollow') != -1 && markerType != Constants.NULL_MARKER;
        },

        _getMarkerPath:function(markerType, R){
            switch(markerType){
                case Constants.NULL_MARKER:
                case Constants.CIRCLE:
                case Constants.CIRCLE_HOLLOW:
                    return d3.svg.arc().outerRadius(R)({startAngle:0, endAngle:2 * Math.PI});

                case Constants.SQUARE:
                case Constants.SQUARE_HOLLOW:
                    var leftTop = -R + ',' + -R;
                    var rightTop = R + ',' + -R;
                    var rightBottom = R + ',' + R;
                    var leftBottom = -R + ',' + R;
                    return 'M' + leftTop + 'L' + rightTop + 'L' + rightBottom + 'L' + leftBottom + 'Z';

                case Constants.DIAMOND:
                case Constants.DIAMOND_HOLLOW:
                    R = R * 2 / Math.sqrt(2);

                    var left = -R + ',' + 0;
                    var top = 0 + ',' + -R;
                    var right = R + ',' + 0;
                    var bottom = 0 + ',' + R;
                    return 'M' + left + 'L' + top + 'L' + right + 'L' + bottom + 'Z';

                case Constants.TRIANGLE:
                case Constants.TRIANGLE_HOLLOW:

                    var left = -R + ',' + R/Math.sqrt(3);
                    var top = 0 + ',' + -(2 * Math.sqrt(3) / 3) * R;
                    var right = R + ',' + R/Math.sqrt(3);

                    return 'M' + left + 'L' + top + 'L' + right + 'Z';
            }
        },

        //用path来构造line
        _getLinePath:function(p1, p2){
            return 'M' + this._dealWithFloat(p1[0]) + ',' + this._dealWithFloat(p1[1])
                            + 'L' + this._dealWithFloat(p2[0]) + ',' + this._dealWithFloat(p2[1]);
        },

        _dealWithFloat:function(v){
            return Math.abs(v) < 1e-6 ? 0 : v;
        },

        _getFillOpacity:function(color){
            if(color && typeof color == 'string'){
                return ColorUtils.getColorOpacity(color);
            }

            return 1;
        },

        removeDivLabels:function(){
            if(this.labelDivManager){
                this.labelDivManager.clearAllLabels();
            }
        },

        addSeriesEventHandler:function(shapeS){

            var self = this;

            if(BaseUtils.isSupportSVG() && shapeS.each){
                shapeS.each(function(){
                    self._addSingleSeriesEventHandler(this);
                })
            }else{
                this._addSingleSeriesEventHandler(shapeS.node);
            }

        },

        _addSingleSeriesEventHandler:function(el){

            var handler = this.component.vanchart.handler;

            BaseUtils.addEvent(el, 'mouseenter', handler.trackerSeriesEnter.bind(handler));

            BaseUtils.addEvent(el, 'mouseleave', handler.trackerSeriesLeave.bind(handler));
        },

        addShapeEventHandler:function(shapeS){

            var self = this;

            if(BaseUtils.isSupportSVG()){
                shapeS.each(function(){
                    self._addSingleShapeEventHandler(this);
                })
            }else{
                this._addSingleShapeEventHandler(shapeS.node);
            }

        },

        _addSingleShapeEventHandler:function(el){

            var handler = this.component.vanchart.handler;

            if(BaseUtils.hasTouch()){

                BaseUtils.addEvent(el, 'touchstart', handler.trackerPointTouchStart.bind(handler));

                BaseUtils.addEvent(el, 'touchend', handler.trackerPointTouchEnd.bind(handler));

            }else{
                BaseUtils.addEvent(el, 'mouseenter', handler.trackerPointEnter.bind(handler));

                BaseUtils.addEvent(el, 'mouseleave', handler.trackerPointLeave.bind(handler));

                BaseUtils.addEvent(el, 'mousemove', handler.trackerPointMove.bind(handler));

                BaseUtils.addEvent(el, 'mousedown', handler.trackerPointDown.bind(handler));

                BaseUtils.addEvent(el, 'mouseup', handler.trackerPointUp.bind(handler));
            }
        },

        _canvasRender:function(){

            var dom = this.component.vanchart.getParentDom();
            var plotBounds = this.component.getPlotBounds();

            if(!this._canvas){
                this._canvas = new CanvasRender(dom, this.component.vanchart);
            }

            this._canvas.clearAll();

            var data = this.component.getVisibleChartData();

            for(var i = 0, len = data.length; i < len; i++){
                this._canvas.addSeries(data[i], plotBounds);
            }

        },

        remove:function(){

        },

        //数据点形状的数据，移动到标签上的时候触发选中
        makeChosenState:function(d){

        },

        //数据点形状的数据，移动出到标签上的时候取消选中
        cancelChosenState:function(d){

        },

        makeClickedState:function(d){

        },

        cancelClickedState:function(d){

        },

        onDragStart:function(){

        },

        onDrag:function(){

        },

        onDragEnd:function(){

        }
    };

    return BaseRender;
});
/**
 * Created by eason on 15/9/25.
 */
define('render/AxisRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function AxisRender(axis){

        BaseRender.call(this, axis);

        this.axis = axis;
    }

    AxisRender.prototype = {
        constructor:AxisRender,

        render:function(){
            var axisRenders = this.axis.getAxisRender();

            for(var i = 0, len = axisRenders.length; i < len ; i++){
                axisRenders[i].render();
            }

        },

        dataChangeRender:function(){
            var axisRenders = this.axis.getAxisRender();

            for(var i = 0, len = axisRenders.length; i < len ; i++){
                axisRenders[i].dataChangeRender();
            }
        },

        monitorRender:function(){
            var axisRenders = this.axis.getAxisRender();

            for(var i = 0, len = axisRenders.length; i < len ; i++){
                axisRenders[i].monitorRender();
            }
        }

    };

    BaseUtils.inherit(AxisRender, BaseRender);
    require('./RenderLibrary').register(Constants.AXIS_RENDER, AxisRender);

    return AxisRender;

});
/**
 * Created by eason on 15/5/15.
 * 坐标轴组建的定义
 */
define('component/Axis',['require','./Base','../utils/BaseUtils','../Constants','./CategoryAxis','./ValueAxis','./DateAxis','../render/AxisRender','../ComponentLibrary'],function(require){

    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    var CategoryAxis = require('./CategoryAxis');
    var ValueAxis = require('./ValueAxis');
    var DateAxis = require('./DateAxis');

    require('../render/AxisRender');

    function Axis(vanchart, option, componentType){
        Base.call(this, vanchart, option, componentType);
        this._axisList = [];
        this.refresh(option);
    }

    Axis.prototype = {
        constructor:Axis,

        _refresh:function(){

            var option = this.option;
            var axisOption = this.componentOption;
            if(!BaseUtils.isArray(axisOption)){
                axisOption  = [axisOption];
            }

            //最终生成的坐标轴数应该和新的option一样
            var len = axisOption.length;

            for(var axisIndex = len; axisIndex < this._axisList.length; axisIndex++){
                this._axisList[axisIndex].remove();
                this._axisList[axisIndex] = null;
            }

            this._axisList.length = len;

            for(var axisIndex = len - 1; axisIndex >= 0; axisIndex--){

                //增加一个坐标轴序号的标记
                axisOption[axisIndex].axisIndex = axisIndex;

                if(this._axisList[axisIndex] && this._axisList[axisIndex].type != axisOption[axisIndex].type){
                    this._axisList[axisIndex].remove();
                    this._axisList[axisIndex] = null;
                }

                if(this._axisList[axisIndex]){
                    this._axisList[axisIndex].refresh(option, axisOption[axisIndex]);
                }else{
                    var axisType =  axisOption[axisIndex].type || Constants.VALUE_AXIS_COMPONENT;

                    var AxisClass;
                    if(axisType == Constants.VALUE_AXIS_COMPONENT){
                        AxisClass = ValueAxis;
                    }else if(axisType == Constants.CATEGORY_AXIS_COMPONENT){
                        AxisClass = CategoryAxis;
                    }else if(axisType == Constants.DATE_AXIS_COMPONENT){
                        AxisClass = DateAxis;
                    }

                    this._axisList[axisIndex] = new AxisClass(this.vanchart, this.option, axisOption[axisIndex], this.componentType);
                }
            }
        },

        fixBoundsByPlot:function(){

            var plotBounds = this.vanchart.getPlotBounds();

            var map = {};

            for(var i = 0, axisCount = this._axisList.length; i < axisCount; i++){

                var axis = this._axisList[i];

                var position = axis.getPosition();

                map[position] = map[position] || [];

                map[position].push(axis);
            }

            for(var position in map){

                var axisList = map[position];
                var isHorizontal = position == Constants.TOP || position == Constants.BOTTOM;

                for(var i = 0, count = axisList.length; i < count; i++){

                    var axis = axisList[i];

                    var baseBounds = i == 0 ? plotBounds : axisList[i - 1].bounds;

                    var axisBounds = axis.bounds;

                    if(isHorizontal){

                        var y = position == Constants.TOP ? baseBounds.y - axisBounds.height : baseBounds.y + baseBounds.height;
                        axis.bounds = BaseUtils.makeBounds(baseBounds.x, y, baseBounds.width, axisBounds.height);

                    }else{

                        var x = position == Constants.LEFT ? baseBounds.x - axisBounds.width : baseBounds.x + baseBounds.width;
                        axis.bounds = BaseUtils.makeBounds(x, baseBounds.y, axisBounds.width, baseBounds.height);
                    }

                    axis._updateRange();

                    axis._updateDomainWhenSizeFixed();

                    axis._calculateTickData();

                    axis._initZoomStatus();
                }
            }

        },

        initAttributesWithSeries:function(){
            var axisCount = this._axisList.length;
            for(var i = axisCount - 1; i >= 0; i--){
                this._axisList[i].initAttributesWithSeries();
            }
        },

        doLayout:function(){

            var axisCount = this._axisList.length;
            for(var i = axisCount - 1; i >= 0; i--){
                this._axisList[i].doLayout();
            }
        },

        getAxis:function(axisIndex){
            return this._axisList[axisIndex];
        },

        axisZoom:function(downPos, upPos){
            this._axisList.forEach(function(axis){
                axis.axisZoom(downPos, upPos);
            });
        },

        //处理0值对齐
        dealOnZero:function(){
            this._axisList.forEach(function(axis){

                if(axis.isOnZero()){

                    axis.dealOnZero();

                    axis._updateRange();

                    axis._calculateTickData();

                    axis._initZoomStatus();
                }
            });
        },

        getAllAxis:function(){
            return this._axisList;
        },

        getAxisRender:function(){

            var axisRenders = [];

            this._axisList.forEach(function(axis){
                var axisRender = axis.getRender();
                if(axisRender){
                    axisRenders.push(axisRender);
                }
            });

            return axisRenders;
        }
    };

    BaseUtils.inherit(Axis, Base);
    require('../ComponentLibrary').register(Constants.AXIS_COMPONENT, Axis);

    return Axis;
});
/**
 * Created by eason on 15/5/4.
 * 图例
 */
define('component/Legend',['require','./Base','../utils/BaseUtils','../Constants','../utils/QueryUtils','../render/LegendIconFactory','../ComponentLibrary'],function(require){
    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var QueryUtils = require('../utils/QueryUtils');
    var LegendIconFactory = require('../render/LegendIconFactory');

    var PADDING = 10;
    var GAP = 8;
    var BUTTON_HEIGHT = 12;
    var BUTTON_WIDTH = 52;
    var LINE_GAP = 4;
    var HORIZONTAL_GAP = 16;

    function Legend(vanchart, option, componentType){
        //垂直方向
        this.hasEnoughSpace = true;

        this.verticalAlign = 0;

        Base.call(this, vanchart, option, componentType);
        this.refresh(option);
    }

    Legend.prototype = {
        constructor:Legend,

        initAttributesWithSeries:function(){

            this.items = [];

            this._updateLegendItems();
        },

        doLayout:function(){

            var usedSize = this._getLegendSize();

            this._setComponentBounds(this.componentOption.position || Constants.RIGHT_TOP, usedSize);

            this._resetLegendBounds();

            this._calculateVerticalPages();

            if(!this.hasEnoughSpace){
                var buttonWidth = BUTTON_WIDTH + 2 * PADDING;

                var moreSpace = Math.max(buttonWidth - this.bounds.width, 0);

                this.vanchart.bounds.width -= moreSpace;

                this.bounds.width += moreSpace;
                this.bounds.x -= moreSpace;

                this.verticalAlign = moreSpace/2;
            }
        },

        _updateLegendItems:function(){

            var series = this.vanchart.series;

            var pieSeries = [];
            var namedSeries = {};

            var legend = this;

            series.forEach(function(sery){

                if(sery.type == Constants.PIE_CHART){
                    pieSeries.push(sery);
                }else{

                    var item = {color:sery.color, itemName:sery.name, visible:sery.visible};

                    legend._mergeCommonLegendAttr(sery, item);

                    namedSeries[sery.name] = true;

                    legend.items.push(item);
                }
            });

            var pieItems = [];
            pieSeries.forEach(function(pieSery){

                var points = pieSery.points;

                for(var i = 0, len = points.length; i < len; i++){

                    var point = points[i];

                    if(!(namedSeries[point.seriesName])){

                        var item = {color:point.color, itemName:point.seriesName, visible:point.visible, pieDataIndex:point.index};

                        legend._mergeCommonLegendAttr(pieSery, item);

                        namedSeries[point.seriesName] = true;

                        pieItems.push(item);
                    }
                }
            });

            pieItems.sort(function(a, b){return a.pieDataIndex - b.pieDataIndex});

            this.items = this.items.concat(pieItems);
        },

        _calculateVerticalPages:function(){

            var position = this.componentOption.position || Constants.RIGHT;
            this.pages = [];

            if(position == Constants.TOP || position == Constants.BOTTOM){
                return;
            }

            var height = this.bounds.height;

            var preHeight = this.getPreHeight(this.items.length);

            if(preHeight <= height){
                this.hasEnoughSpace = true;
                return;
            }

            this.hasEnoughSpace = false;

            var pageIndex = 0;
            var startIndex = 0;
            var preHeight = 0;
            for(var itemIndex = 0, itemCount = this.items.length; itemIndex < itemCount; itemIndex++){

                var pageHeight = preHeight;
                preHeight = this.getPreHeight(startIndex, itemIndex + 1);

                if(preHeight > height){
                    pageIndex++;
                    startIndex = itemIndex;
                    this.bounds.height = pageHeight + BUTTON_HEIGHT;
                }

                this.pages[pageIndex] = this.pages[pageIndex] || [];
                this.pages[pageIndex].push(this.items[itemIndex]);
            }
        },

        _mergeCommonLegendAttr:function(sery, item){
            var cfg = this.componentOption;
            var hiddenColor = cfg.hiddenColor;
            var hoverColor = cfg.hoverColor || cfg.style.color;

            QueryUtils.merge(item, {
                series:sery,
                hiddenColor:hiddenColor,
                hoverColor:hoverColor,
                legendIconType:this._getLegendType(sery),
                lineIndex:0//记录下如果换行的行号
            }, true);

        },

        _getLegendSize:function(){
            var cfg = this.componentOption;
            var position = cfg.position || Constants.RIGHT;
            var padding = PADDING * 2;

            if(position == Constants.TOP || position == Constants.BOTTOM){

                var legendSize = this._getTopAndBottomLegendSize() + padding;

                var maxHeight = this._maxHeight();

                return (cfg.maxHeight && legendSize > maxHeight) ? maxHeight : legendSize;

            }else{

                var legendSize = this._getLeftAndRightLegendSize() + padding;

                //预测下能否放下
                var usedHeight = this.getPreHeight() + PADDING;
                var chartHeight = this.vanchart.getPlotBounds().height;
                if(usedHeight < chartHeight){
                    legendSize = Math.max(legendSize, BUTTON_WIDTH);
                }

                var maxWidth = this._maxWidth();

                return (cfg.maxWidth && legendSize > maxWidth) ? maxWidth : legendSize;
            }
        },

        _getLeftAndRightLegendSize:function(){
            this.maxLabelWidth = 0;
            this.maxLabelHeight = 0;

            this.maxIconWidth = 0;
            this.maxIconHeight = 0;

            for(var i = 0, len = this.items.length; i < len; i++){
                var labelDim = BaseUtils.getTextDimension(this.items[i].itemName, this.componentOption.style, true);
                this.maxLabelWidth = Math.max(this.maxLabelWidth, labelDim.width);
                this.maxLabelHeight = Math.max(this.maxLabelHeight, labelDim.height);

                var iconDim = LegendIconFactory.getLegendIconSize(this.items[i].legendIconType);
                this.maxIconWidth = Math.max(this.maxIconWidth, iconDim.width);
                this.maxIconHeight = Math.max(this.maxIconHeight, iconDim.height);
            }

            return PADDING * 2 + this.maxIconWidth + GAP + this.maxLabelWidth;
        },

        _getTopAndBottomLegendSize:function(){

            this.lineHeight = [];//换行的画记录每一行的高度

            var plotBonds = this.vanchart.getPlotBounds();

            var offeredWidth = plotBonds.width - 4 * PADDING;

            var usedWidth = 0;
            var maxLineHeight = 0;
            var lineIndex = 0;

            for(var i = 0, len = this.items.length; i < len; i++){

                var item = this.items[i];

                var iconSize = LegendIconFactory.getLegendIconSize(item.legendIconType);
                var labelDim = BaseUtils.getTextDimension(item.itemName, this.componentOption.style, true);

                var iconWidth = iconSize.width + GAP + labelDim.width;

                if(usedWidth + iconWidth < offeredWidth){
                    item.lineIndex = lineIndex;
                    maxLineHeight = Math.max(maxLineHeight, labelDim.height, iconSize.height);
                    usedWidth += iconWidth + HORIZONTAL_GAP;
                }else{
                    this.lineHeight.push(maxLineHeight);
                    lineIndex++;

                    item.lineIndex = lineIndex;
                    usedWidth = iconWidth;
                    maxLineHeight = Math.max(labelDim.height, iconSize.height);
                }

                if(i == len - 1){
                    this.lineHeight.push(maxLineHeight);
                }
            }

            var totalHeight = 0;
            this.lineHeight.forEach(function(d){
                totalHeight += (d + PADDING);
            });

            this.maxLineIndex = this.lineHeight.length - 1;

            if(this.componentOption.maxHeight){
                var maxHeight = this._maxHeight();

                this.maxLineIndex = -1;

                totalHeight = 0;

                while(totalHeight < maxHeight && this.maxLineIndex < this.lineHeight.length - 1){
                    var nextLineHeight = totalHeight + this.lineHeight[this.maxLineIndex + 1] + PADDING;
                    if(nextLineHeight < maxHeight){
                        totalHeight = nextLineHeight;
                        this.maxLineIndex++;
                    }else{
                        break;
                    }
                }
            }

            return  totalHeight;
        },

        _resetLegendBounds:function(){

            var position = this.componentOption.position;

            if(position == Constants.LEFT || position == Constants.RIGHT || position == Constants.RIGHT_TOP){

                //右或者右上方的时候剪掉可能占据的工具栏的高度
                if(position == Constants.RIGHT || position == Constants.RIGHT_TOP){
                    var toolbarHeight = this.vanchart.getToolbarHeight();
                    this.bounds.y += toolbarHeight;
                    this.bounds.height -= toolbarHeight;
                }

                var x = this.bounds.x + PADDING;
                var y = this.bounds.y + PADDING;
                var height = this.bounds.height - PADDING * 2;
                var width = this.bounds.width - PADDING * 2;

                var usedHeight = this.getPreHeight();

                usedHeight = Math.min(usedHeight, height);

                y += Math.round((height - usedHeight) / 2);

                if(position == Constants.RIGHT_TOP || this.isFloat){
                    this.bounds.height = usedHeight;
                }else{
                    this.bounds = {x:x, y:y, width:width, height:usedHeight};
                }

            }else{

                var x = this.bounds.x + PADDING;
                var y = this.bounds.y + PADDING;
                var height = this.bounds.height - PADDING * 2;
                var width = this.bounds.width - PADDING * 2;

                var usedWidth = width;
                //小于一行的时候区域比计算的要小
                if(this.lineHeight.length == 1){

                    usedWidth = PADDING * 2;
                    for(var i = 0, len = this.items.length; i < len; i++) {

                        var item = this.items[i];

                        var iconSize = LegendIconFactory.getLegendIconSize(item.legendIconType);
                        var labelDim = BaseUtils.getTextDimension(item.itemName, this.componentOption.style, true);

                        usedWidth += (iconSize.width + labelDim.width + GAP);
                    }

                    usedWidth += HORIZONTAL_GAP * (this.items.length - 1);

                    x += (width - usedWidth) / 2;
                }

                this.bounds = {x:x, y:y, width:usedWidth, height:height};

                if(position == Constants.BOTTOM) {
                    var zoomComponent = this.vanchart.getComponent(Constants.ZOOM_COMPONENT);
                    if (zoomComponent && zoomComponent.zoomToolEnabled()) {
                        this.bounds.y += zoomComponent.bounds.height;
                    }
                }
            }
        },

        getLegendItems:function(){
            if(this.isHorizontal()){

                var items = [];

                var maxLineIndex = this.maxLineIndex;

                this.items.forEach(function(item){
                    if(item.lineIndex <= maxLineIndex){
                        items.push(item);
                    }
                });

                return items;

            }else{
                return this.items;
            }
        },

        getLineHeight:function(){
            return this.lineHeight;
        },

        getPadding:function(){
            return PADDING;
        },

        getGap:function(){
            return GAP;
        },

        getHorizontalGap:function(){
            return HORIZONTAL_GAP;
        },

        getPreHeight:function(){

            var startIndex = 0;
            var endIndex = this.items.length;

            if(arguments.length == 1){
                endIndex = arguments[0];
            }else if(arguments.length == 2){
                startIndex = arguments[0];
                endIndex = arguments[1];
            }

            var height = PADDING;
            var labelHeight = this.maxLabelHeight;

            for(var i = startIndex; i < endIndex; i++){
                var item = this.items[i];
                var iconSize = LegendIconFactory.getLegendIconSize(item.legendIconType);
                height += (Math.max(iconSize.height, labelHeight) + LINE_GAP)
            }

            return Math.floor(height);
        },

        getVerticalItemHeight:function(index){
            var height = PADDING;
            var labelHeight = this.maxLabelHeight;

            var item = this.items[index];
            var iconSize = LegendIconFactory.getLegendIconSize(item.legendIconType);
            height += (Math.max(iconSize.height, labelHeight) + LINE_GAP);

            return height;
        },

        getHorizontalItemWidth:function(index){
            var item = this.items[index];
            var cfg = this.componentOption;

            var iconSize = LegendIconFactory.getLegendIconSize(item.legendIconType);
            var labelDim = BaseUtils.getTextDimension(item.itemName, cfg.style, true);

            return iconSize.width + GAP + labelDim.width + HORIZONTAL_GAP;
        },

        getHorizontalItemsWidth:function(items){

            var cfg = this.componentOption;
            var usedWidth = 0;

            for(var i = 0, len = items.length; i < len; i++) {

                var item = items[i];

                var iconSize = LegendIconFactory.getLegendIconSize(item.legendIconType);
                var labelDim = BaseUtils.getTextDimension(item.itemName, cfg.style, true);

                usedWidth += (iconSize.width + labelDim.width + GAP);
            }

            usedWidth += HORIZONTAL_GAP * (items.length - 1);

            return usedWidth;
        },

        getHorizontalLineItems:function(){
            var lineItems = [];
            for(var i = 0, len = this.items.length; i < len; i++){
                var item = this.items[i];
                if(item.lineIndex <= this.maxLineIndex){
                    lineItems[item.lineIndex] = lineItems[item.lineIndex] || [];
                    lineItems[item.lineIndex].push(item);
                }
            }

            return lineItems;
        },

        getVerticalPages:function(){
            return this.pages;
        },

        hasEnoughVerticalSpace:function(){
            return this.hasEnoughSpace;
        },

        getButtonHeight:function(){
            return BUTTON_HEIGHT;
        }

    };

    BaseUtils.inherit(Legend, Base);
    require('../ComponentLibrary').register(Constants.LEGEND_COMPONENT, Legend);
    return Legend;
});
/**
 * Created by eason on 15/7/3.
 * reused and modified tooltip component from echarts
 */
//Copyright (c) 2013, Baidu Inc.
//    All rights reserved.
//
//    Redistribution and use of this software in source and binary forms, with or
//    without modification, are permitted provided that the following conditions
//are met:
//
//    Redistributions of source code must retain the above copyright notice, this
//list of conditions and the following disclaimer.
//
//    Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//and/or other materials provided with the distribution.
//
//    Neither the name of Baidu Inc. nor the names of its contributors may be used
//to endorse or promote products derived from this software without specific
//prior written permission of Baidu Inc.
//
//    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
//ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
//ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
//SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

define('component/Tooltip',['require','./Base','../utils/BaseUtils','../Constants','../utils/ColorUtils','../ComponentLibrary'],function(require){

    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var ColorUtils = require('../utils/ColorUtils');

    var DEFAULT_DURATION = 0.4;

    function Tooltip(vanchart, option, componentType){
        Base.call(this, vanchart, option, componentType);
        this.refresh(option);
    }

    Tooltip.prototype = {

        constructor:Tooltip,

        _gCssText: 'position:absolute;display:block;border-style:solid;white-space:nowrap;z-index:1;-webkit-user-select:none;-moz-user-select:none;-o-user-select:none;user-select:none;',

        _style: function (opt) {
            if (!opt) {
                return '';
            }
            var cssText = [];
            if (opt.animation && !opt.follow) {
                var transitionText = 'left ' + DEFAULT_DURATION + 's,'
                    + 'top ' + DEFAULT_DURATION + 's';
                cssText.push(
                    'transition:' + transitionText
                );
                cssText.push(
                    '-moz-transition:' + transitionText
                );
                cssText.push(
                    '-webkit-transition:' + transitionText
                );
                cssText.push(
                    '-o-transition:' + transitionText
                );
            }

            if(opt.style){
                var fontStyle = BaseUtils.cssNormalization(opt.style);

                for(var styleName in fontStyle){
                    if(styleName == 'color'){
                        cssText.push(styleName + ':' + ColorUtils.colorToHex(fontStyle[styleName]));
                    }else{
                        cssText.push(styleName + ':' + fontStyle[styleName]);
                    }
                }
            }

            if (opt.backgroundColor) {
                if(typeof opt.backgroundColor == 'string'){
                    if(BaseUtils.isSupportSVG()){
                        cssText.push('background-Color:' + opt.backgroundColor);
                    }else{
                        var hexAlpha = ColorUtils.colorToHexAlpha(opt.backgroundColor);
                        cssText.push('background-Color:' + hexAlpha.hex);
                        cssText.push('filter:alpha(opacity=' + hexAlpha.alpha + ')')
                    }
                }else if(typeof opt.backgroundColor == 'object'){

                    var color = opt.backgroundColor;
                    var startColor = ColorUtils.colorToHex(color.startColor);
                    var endColor = ColorUtils.colorToHex(color.endColor);

                    var start = 'left';

                    var startPos = 'left top';
                    var endPos = 'right top';
                    var type = 1;

                    if(color.x1 == color.x2){
                        start = 'top';

                        startPos = 'left top';
                        endPos = 'left bottom';

                        type = 0;
                    }

                    cssText.push('background: -ms-linear-gradient(' + start + ', '+ startColor +', '+ endColor +')');

                    cssText.push('background-image: -moz-linear-gradient(' + start + ', '+ startColor +', '+ endColor +')');

                    cssText.push('background-image: -webkit-gradient(linear, '+startPos+', '+endPos+', color-stop(0, '+ startColor +'), color-stop(1, '+ endColor+'))');

                    cssText.push('filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='+startColor + ', endColorstr='+endColor+', GradientType='+type+')');
                }
            }

            if (opt.borderWidth != null) {
                cssText.push('border-width:' + opt.borderWidth + 'px');
            }

            if (opt.borderColor != null) {
                cssText.push('border-color:' + opt.borderColor);
            }

            if (opt.borderRadius != null) {
                cssText.push(
                    'border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-moz-border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-webkit-border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-o-border-radius:' + opt.borderRadius + 'px'
                );
            }

            if(opt.shadow){
                cssText.push('box-shadow:1px 1px 2px rgba(0,0,0,0.2)');
            }

            var padding = opt.padding;
            if (padding != null && padding != undefined) {
                padding = BaseUtils.reformCssArray(padding);
                cssText.push(
                    'padding:' + padding[0] + 'px '
                    + padding[1] + 'px '
                    + padding[2] + 'px '
                    + padding[3] + 'px'
                );
            }

            cssText = cssText.join(';') + ';';

            return cssText;
        },

        doLayout:function(){
            if(!this._tDom){
                var dom = this.vanchart.dom;

                this._tDom = document.createElement('div');

                this._tDom.onselectstart = function() {
                    return false;
                };

                this._tDom.style.position = 'absolute';

                dom.appendChild(this._tDom);

                this._tooltipHideTick = null;
            }
        },

        remove:function(){
            if(this._tDom){
                var dom = this.vanchart.dom;
                dom.removeChild(this._tDom);
            }
        },

        show:function(pos, opt, tooltipText){

            if(pos && opt && tooltipText && !this.vanchart.isMouseDown){
                clearTimeout(this._tooltipHideTick);

                this._tDom.innerHTML = tooltipText;

                this._tDom.style.cssText = this._gCssText
                    + this._style(opt)
                    + 'left:' + pos[0] + 'px;top:' + pos[1] + 'px;';
            }

            //�ƶ��˵����ݵ���ʾû�в����Ļ�������ʾ3s
            if(BaseUtils.hasTouch()){
                this._tooltipHideTick = setTimeout(function(){
                    this._tDom.style.display = 'none';
                }.bind(this), 3000);
            }
        },

        hide:function(){

            clearTimeout(this._tooltipHideTick);

            this._tooltipHideTick = setTimeout(function(){
                this._tDom.style.display = 'none';
            }.bind(this), 400);

        },

        immediateHide:function(){
            this._tDom.style.display = 'none';
        },

        calculateTooltipDivDim:function(opt, tooltipText){

            opt = opt || '';

            var body = document.getElementsByTagName("body")[0];
            var testDiv = document.createElement('div');
            testDiv.innerHTML = tooltipText;
            testDiv.style.cssText = this._gCssText + this._style(opt) + 'visibility:hidden;';
            body.appendChild(testDiv);
            var width = testDiv.offsetWidth;
            var height = testDiv.offsetHeight;
            body.removeChild(testDiv);
            return {
                width:width,
                height:height
            };
        }

    };

    BaseUtils.inherit(Tooltip, Base);
    require('../ComponentLibrary').register(Constants.TOOLTIP_COMPONENT, Tooltip);
    return Tooltip;
});
//Copyright (c) 2013 The New York Times
//
//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
//    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE

define('utils/ExportUtils',['require','./BaseUtils'],function(require) {

    var BaseUtils = require('./BaseUtils');

    var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

    window.URL = (window.URL || window.webkitURL);

    var body = document.body;

    var prefix = {
        xmlns: "http://www.w3.org/2000/xmlns/",
        xlink: "http://www.w3.org/1999/xlink",
        svg: "http://www.w3.org/2000/svg"
    };

    function cleanup() {
        var crowbarElements = document.querySelectorAll(".svg-export");

        [].forEach.call(crowbarElements, function(el) {
            el.parentNode.removeChild(el);
        });
    }


    function getSources(svg) {

        var styles =  "" ;

        svg.setAttribute("version", "1.1");

        var defsEl = document.createElement("defs");

        svg.insertBefore(defsEl, svg.firstChild);

        var styleEl = document.createElement("style")
        defsEl.appendChild(styleEl);
        styleEl.setAttribute("type", "text/css");

        svg.removeAttribute("xmlns");
        svg.removeAttribute("xlink");

        if (!svg.hasAttributeNS(prefix.xmlns, "xmlns")) {
            svg.setAttributeNS(prefix.xmlns, "xmlns", prefix.svg);
        }

        if (!svg.hasAttributeNS(prefix.xmlns, "xmlns:xlink")) {
            svg.setAttributeNS(prefix.xmlns, "xmlns:xlink", prefix.xlink);
        }

        var source = (new XMLSerializer()).serializeToString(svg).replace('</style>', '<![CDATA[' + styles + ']]></style>');

        return [doctype + source];
    }

    function toSvg(svgNode, config) {

        cleanup();

        var source = getSources(svgNode);

        var fileName = config.fileName;

        var url = window.URL.createObjectURL(new Blob(source, { "type" : "text\/xml" }));

        var a = document.createElement("a");
        body.appendChild(a);
        a.setAttribute("class", "svg-export");
        a.setAttribute("download", fileName + ".svg");
        a.setAttribute("href", url);
        a.style["display"] = "none";
        a.click();

        setTimeout(function() {
            window.URL.revokeObjectURL(url);
        }, 10);
    }

    function toImage(svgNode, config, chartDim){
        toSvg(svgNode, config, chartDim);
    }

    return {
        toImage:toImage
    };
});
/**
 * Created by eason on 15/8/24.
 */

define('render/ToolbarIconSvgRender',['require','../utils/BaseUtils','../Constants','../utils/ExportUtils'],function(require){

    //icon的几种状态
    var SELECTED = 'selected';
    var HOVER = 'hover';

    //icon的几种背景颜色
    var OPEN_NOMAL = 'rgba(0,0,0,0.05)';
    var OPEN_HOVER = 'rgba(0,0,0,0.1)';
    var OPEN_SELECTED = 'rgba(0,0,0,0.1)';

    var CLOSED_NORMAL = 'rgba(0,0,0,0.0)';
    var CLOSED_HOVER = 'rgba(0,0,0,0.05)';
    var CLOSED_SELECTED = 'rgba(0,0,0,0.1)';

    var RECT_R = 2;

    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var ExportUtils = require('../utils/ExportUtils');

    function ToolbarIconSvgRender(toolbarIcon, toolbar){
        this.toolbarIcon = toolbarIcon;
        this.toolbar = toolbar;
    }

    ToolbarIconSvgRender.prototype = {
        constructor:ToolbarIconSvgRender,

        render:function(toolBarG){

            var iconSize = this.toolbar.getIconSize();
            var pos = this.toolbarIcon.getIconPos();
            var isVisible = this.toolbarIcon.visible;

            this.iconG = toolBarG
                .append('g')
                .attr('transform', 'translate('+ pos.x +','+ pos.y +')')
                .attr('visibility', isVisible ? 'visible' : 'hidden');

            this.iconG.append('rect')
                .attr('width', iconSize)
                .attr('height', iconSize)
                .attr('rx', RECT_R)
                .attr('ry', RECT_R)
                .style('fill', this._isOpen() ? OPEN_NOMAL : CLOSED_NORMAL);

            this._createIcon();

            this._addListeners();
        },

        _iconAnimation:function(moveIndex, delay, visible){

            var iconG = this.iconG;
            var pos = this.toolbarIcon.getIconPos();

            setTimeout(function(){

                if(visible){
                    iconG.attr('visibility', 'visible');
                }

                var moveDet = 4 * moveIndex;

                var leftX = pos.x - moveDet;

                iconG
                    .transition()
                    .ease('circle-out')
                    .duration(100)
                    .attr('transform', 'translate('+ leftX +','+ pos.y +')')
                    .transition()
                    .ease('circle-in')
                    .duration(100)
                    .attr('transform', 'translate('+ pos.x +','+ pos.y +')')
                    .each('end', function(){
                        d3.select(this).attr('visibility', visible ? 'visible' : 'hidden')
                    });

                iconG.select('rect')
                    .style('fill', visible ? CLOSED_NORMAL : OPEN_NOMAL)
                    .transition()
                    .ease('linear')
                    .duration(200)
                    .style('fill', visible ? OPEN_NOMAL : CLOSED_NORMAL);

                iconG.select('g')
                    .style('opacity', visible ? 0 : 1)
                    .transition()
                    .ease('linear')
                    .duration(200)
                    .style('opacity', visible ? 1 : 0);

            }, delay);

        },

        backToOrigin:function(){
            var pos = this.toolbarIcon.getIconPos();
            this.iconG.attr('transform', 'translate('+ pos.x +','+ pos.y +')');
        },

        showIcon:function(){
            if(arguments.length){
                this._iconAnimation(arguments[0], arguments[1], true);
            }else{
                this.iconG.attr('visibility', 'visible');
            }

        },

        hideIcon:function(){
            if(arguments.length){
                this._iconAnimation(arguments[0], arguments[1], false);
            }else{
                this.iconG.attr('visibility', 'hidden');
            }
        },

        refreshMove:function(left, right){

            var pos = this.toolbarIcon.getIconPos();

            var translate = d3.transform(this.iconG.attr('transform')).translate;

            var currentX = translate[0];

            var leftPos = currentX - left;
            var rightPos = leftPos + right;

            this.iconG
                .transition()
                .ease('circle-out')
                .duration(220)
                .attr('transform', 'translate('+ leftPos +','+ pos.y +')')
                .transition()
                .ease('circle-in')
                .duration(220)
                .attr('transform', 'translate('+ rightPos +','+ pos.y +')');
        },

        refreshMoveWithoutAnimation:function(left, right){

            var pos = this.toolbarIcon.getIconPos();
            var translate = d3.transform(this.iconG.attr('transform')).translate;

            var currentX = translate[0];

            var rightPos = currentX - left + right;

            this.iconG
                .attr('transform', 'translate('+ rightPos +','+ pos.y +')');

        },

        _isOpen:function(){
            return this.toolbar.isOpen;
        },

        _addListeners:function(){
            var iconG = this.iconG;
            var self = this;

            var toolBar = this.toolbar;
            var vanchart = toolBar.vanchart;
            var toolBarOption = toolBar.componentOption;
            var dom = toolBar.vanchart.getParentDom();
            var svgRoot = this.toolbar.getVanchartRender().getRenderRoot();

            var icon = this.toolbarIcon;
            var refreshIcon = toolBar.getRefreshIcon();

            var chartDim = {width:vanchart.chartWidth(), height:vanchart.chartHeight()};


            iconG
                .style('cursor', 'pointer')
                .on('click', function(){
                    switch (icon.iconType){
                        case Constants.REFRESH_ICON:
                            vanchart.refreshRestore();
                            refreshIcon.hideIcon();
                            break;
                        case Constants.INCREASE_ICON:
                            icon.iconType = Constants.DECREASE_ICON;
                            iconG.select('path').attr('d', icon.getDecreaseIconPath());
                            vanchart.refreshIncreaseOrder();
                            refreshIcon.showIcon();
                            break;
                        case Constants.DECREASE_ICON:
                            icon.iconType = Constants.INCREASE_ICON;
                            iconG.select('path').attr('d', icon.getIncreaseIconPath());
                            vanchart.refreshDecreaseOrder();
                            refreshIcon.showIcon();
                            break;
                        case Constants.EXPORT_ICON:
                            ExportUtils.toImage(svgRoot.node(), toolBarOption['toImage'], chartDim);
                            break;
                        case Constants.MAX_ICON:
                            BaseUtils.showLightBox(toolBar.option);
                            break;
                        case Constants.MIN_ICON:
                            BaseUtils.hideLightBox(dom);
                            break;
                        case Constants.MENU_ICON:
                            toolBar.showOrHide();
                            break;
                    }
                })
                .on('mouseenter', function(){

                    iconG.select('rect').style('fill', self._isOpen() ? OPEN_HOVER : CLOSED_HOVER);

                })
                .on('mouseleave', function(){

                    iconG.select('rect').style('fill', self._isOpen() ? OPEN_NOMAL : CLOSED_NORMAL);

                })

        },

        _createIcon:function(){
            var iconG = this.iconG;

            var icon = this.toolbarIcon;
            var iconType = icon.iconType;

            switch (iconType){
                case Constants.REFRESH_ICON:
                    iconG.append('path')
                        .attr('d', icon.getRefreshIconPath())
                        .style('fill', '#FF9933');
                    break;
                case Constants.INCREASE_ICON:
                    iconG.append('path')
                        .attr('d', icon.getIncreaseIconPath())
                        .style('fill', '#33CCFF');
                    break;
                case Constants.DECREASE_ICON:
                    iconG.append('path')
                        .attr('d', icon.getDecreaseIconPath())
                        .style('fill', '#33CCFF');
                    break;
                case Constants.EXPORT_ICON:
                    iconG.append('path')
                        .attr('d', icon.getExportIconPath())
                        .style('fill', '#6666CC');
                    break;
                case Constants.MAX_ICON:
                    iconG.append('path')
                        .attr('d', icon.getMaxIconPath())
                        .style('fill', '#33CC66');
                    break;
                case Constants.MIN_ICON:
                    iconG.append('path')
                        .attr('d', icon.getMinIconPath())
                        .style('fill', '#33CC66');
                    break;
                case Constants.MENU_ICON:
                    iconG.append('path')
                        .attr('d', icon.getMenuIconPath())
                        .style('stroke-width', 2)
                        .style('stroke', '#AAAAAA');
                    break;
            }
        }
    };

    return ToolbarIconSvgRender;

});
/**
 * Created by eason on 15/8/24.
 */

define('render/ToolbarIconVmlRender',['require','../utils/BaseUtils','../Constants','../utils/ExportUtils'],function(require){

    //icon的几种状态
    var SELECTED = 'selected';
    var HOVER = 'hover';

    //icon的几种背景颜色
    var OPEN_NOMAL = 'rgb(0,0,0)';
    var OPEN_NORMAL_OPACITY = 0.05;

    var OPEN_HOVER = 'rgb(0,0,0)';
    var OPEN_HOVER_OPACITY = 0.1;

    var CLOSED_NORMAL = 'rgb(0,0,0)';
    var CLOSED_NORMAL_OPACITY = 0;

    var CLOSED_HOVER = 'rgb(0,0,0)';
    var CLOSED_HOVER_OPACITY = 0.05;

    var RECT_R = 2;

    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var ExportUtils = require('../utils/ExportUtils');

    function ToolbarIconVmlRender(toolbarIcon, toolbar){
        this.toolbarIcon = toolbarIcon;
        this.toolbar = toolbar;
        this.currentPos = [];
    }

    ToolbarIconVmlRender.prototype = {
        constructor:ToolbarIconVmlRender,

        render:function(paper){

            var toolbarPos = this.toolbar.getToolbarPos();
            var pos = this.toolbarIcon.getIconPos();
            var x = pos.x + toolbarPos.x;
            var y = pos.y + toolbarPos.y;

            this.currentPos = [x, y];

            var iconSize = this.toolbar.getIconSize();
            var isVisible = this.toolbarIcon.visible;

            this.itemSet = paper.set();

            this.background = paper.rect(0, 0, iconSize, iconSize)
                .attr('fill', this._isOpen() ? OPEN_NOMAL : CLOSED_NORMAL)
                .attr('fill-opacity', this._isOpen() ? OPEN_NORMAL_OPACITY : CLOSED_NORMAL_OPACITY)
                .attr('rx', RECT_R)
                .attr('ry', RECT_R)
                .attr('stroke-width', 0);

            this.foreground = paper.path().attr(this._getIconStyle());

            this.itemSet.push(this.background);
            this.itemSet.push(this.foreground);

            this.itemSet.transform('t' + x + ',' + y);

            if(!isVisible){
                this.itemSet.hide();
            }

            this._addListeners();
        },

        _getIconStyle:function(){
            var icon = this.toolbarIcon;
            var iconType = icon.iconType;
            switch (iconType){
                case Constants.REFRESH_ICON:
                    return {
                        path:icon.getRefreshIconPath(),
                        fill:'#FF9933',
                        'stroke-width':0
                    };
                case Constants.INCREASE_ICON:
                    return {
                        path:icon.getIncreaseIconPath(),
                        fill:'#33CCFF',
                        'stroke-width':0
                    };
                case Constants.DECREASE_ICON:
                    return {
                        path:icon.getDecreaseIconPath(),
                        fill:'#33CCFF',
                        'stroke-width':0
                    };
                case Constants.EXPORT_ICON:
                    return {
                        path:icon.getExportIconPath(),
                        fill:'#6666CC',
                        'stroke-width':0
                    };
                case Constants.MAX_ICON:
                    return {
                        path:icon.getMaxIconPath(),
                        fill:'#33CC66',
                        'stroke-width':0
                    };
                case Constants.MIN_ICON:
                    return {
                        path:icon.getMinIconPath(),
                        fill:'#33CC66',
                        'stroke-width':0
                    };
                case Constants.MENU_ICON:
                    return {
                        path:icon.getMenuIconPath(),
                        'stroke-width':2,
                        stroke:'#AAAAAA',
                        fill:'none'
                    };
            }
        },

        _addListeners:function(){
            var iconG = this.iconG;
            var self = this;

            var toolBar = this.toolbar;
            var toolBarOption = toolBar.componentOption;
            var dom = toolBar.vanchart.getParentDom();
            var paper = this.toolbar.getVanchartRender().getRenderRoot();

            var icon = this.toolbarIcon;
            var vanchart = toolBar.vanchart;
            var refreshIcon = toolBar.getRefreshIcon();

            var chartDim = {width:vanchart.chartWidth(), height:vanchart.chartHeight()};

            this.itemSet.forEach(function(comp){

                var self = this;

                comp.attr('cursor', 'pointer');

                comp.click(function(){
                    switch (icon.iconType){
                        case Constants.REFRESH_ICON:
                            vanchart.refreshRestore();
                            refreshIcon.hideIcon();
                            break;
                        case Constants.INCREASE_ICON:
                            icon.iconType = Constants.DECREASE_ICON;
                            self.foreground.attr('path', icon.getDecreaseIconPath());
                            vanchart.refreshIncreaseOrder();
                            refreshIcon.showIcon();
                            break;
                        case Constants.DECREASE_ICON:
                            icon.iconType = Constants.INCREASE_ICON;
                            self.foreground.attr('path', icon.getIncreaseIconPath());
                            vanchart.refreshDecreaseOrder();
                            refreshIcon.showIcon();
                            break;
                        case Constants.EXPORT_ICON:
                            ExportUtils.toImage(paper, toolBarOption['toImage'], chartDim);
                            break;
                        case Constants.MAX_ICON:
                            BaseUtils.showLightBox(toolBar.option);
                            break;
                        case Constants.MIN_ICON:
                            BaseUtils.hideLightBox(dom);
                            break;
                        case Constants.MENU_ICON:
                            toolBar.showOrHide();
                            break;
                    }
                });

                comp.mouseover(function(){

                    self.background
                        .attr('fill', self._isOpen() ? OPEN_HOVER : CLOSED_HOVER)
                        .attr('fill-opacity', self._isOpen ? OPEN_HOVER_OPACITY: CLOSED_HOVER_OPACITY);

                });

                comp.mouseout(function(){

                    self.background
                        .attr('fill', self._isOpen() ? OPEN_NOMAL : CLOSED_NORMAL)
                        .attr('fill-opacity', self._isOpen() ? OPEN_NORMAL_OPACITY : CLOSED_NORMAL_OPACITY);

                });

            }, this);

        },

        _isOpen:function(){
            return this.toolbar.isOpen;
        },

        showIcon:function(){
            this.itemSet.show();
        },

        hideIcon:function(){
            this.itemSet.hide();
        },

        refreshMove:function(left, right){

            var det = right - left;
            this.currentPos[0] += det;

            var x = this.currentPos[0];
            var y = this.currentPos[1];

            this.itemSet.transform('t' + x + ',' + y);
        },

        refreshMoveWithoutAnimation:function(left, right){
            this.refreshMove(left, right);
        },

        backToOrigin:function(){
            var toolbarPos = this.toolbar.getToolbarPos();
            var pos = this.toolbarIcon.getIconPos();
            var x = pos.x + toolbarPos.x;
            var y = pos.y + toolbarPos.y;
            this.currentPos = [x, y];
            this.itemSet.transform('t' + x + ',' + y);
        }
    };

    return ToolbarIconVmlRender;

});
/**
 * Created by eason on 15/8/24.
 */

define('component/ToolbarIcon',['require','./Base','../utils/BaseUtils','../Constants','../utils/ExportUtils','../render/ToolbarIconSvgRender','../render/ToolbarIconVmlRender'],function(require){

    //icon的几种状态
    var SELECTED = 'selected';
    var HOVER = 'hover';

    //icon的几种背景颜色
    var OPEN_NOMAL = 'rgba(0,0,0,0.05)';
    var OPEN_HOVER = 'rgba(0,0,0,0.1)';
    var OPEN_SELECTED = 'rgba(0,0,0,0.1)';

    var CLOSED_NORMAL = 'rgba(0,0,0,0.0)';
    var CLOSED_HOVER = 'rgba(0,0,0,0.05)';
    var CLOSED_SELECTED = 'rgba(0,0,0,0.1)';

    var RECT_R = 2;

    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var ExportUtils = require('../utils/ExportUtils');

    var SvgRender = require('../render/ToolbarIconSvgRender');
    var VmlRender = require('../render/ToolbarIconVmlRender');

    function ToolbarIcon(iconType, toolbar, pos, visible){
        this.iconType = iconType;
        this.toolbar = toolbar;
        this.visible = visible;
        this.pos = pos;
        this.iconG = null;
        this.iconRender = BaseUtils.isSupportSVG() ? new SvgRender(this, toolbar) : new VmlRender(this, toolbar);
    }

    ToolbarIcon.prototype = {
        constructor:ToolbarIcon,

        render:function(toolBarG){
            this.iconRender.render(toolBarG);
        },

        showIcon:function(){
            if(arguments.length){
                this.iconRender.showIcon(arguments[0], arguments[1]);
            }else{
                this.iconRender.showIcon();
            }
            this.visible = true;
        },

        hideIcon:function(index, delay){
            if(arguments.length){
                this.iconRender.hideIcon(arguments[0], arguments[1]);
            }else{
                this.iconRender.hideIcon();
            }
            this.visible = false;

            if(!this.toolbar.isOpen && this.iconType == Constants.REFRESH_ICON){
                this.iconRender.backToOrigin();
            }
        },

        refreshMove:function(left, right){
            this.iconRender.refreshMove(left, right);
        },

        refreshMoveWithoutAnimation:function(left, right){
            this.iconRender.refreshMoveWithoutAnimation(left, right);
        },

        getIconPos:function(){
            return this.pos;
        },

        getMaxIconPath:function(){
            return 'M24,8v6.5L21.5,12l-3,3L17,13.5l3-3L17.5,8H24z M15,18.5l-3,3l2.5,2.5H8v-6.5l2.5,2.5l3-3L15,18.5z';
        },

        getMinIconPath:function(){
            return 'M15,17v6.5L12.5,21l-3,3L8,22.5l3-3L8.5,17H15z M24,9.5l-3,3l2.5,2.5H17V8.5l2.5,2.5l3-3L24,9.5z';
        },

        getIncreaseIconPath:function(){
            return 'M8,20h16v2H8V20z M10,16h2v3h-2V16z M13,14h2v5h-2V14z M16,12h2v7h-2V12z M19,9h2v10h-2V9z';
        },

        getDecreaseIconPath:function(){
            return 'M8,20h16v2H8V20z M10,9h2v10h-2V9z M13,12h2v7h-2V12z M16,15h2v4h-2V15z M19,16h2v3h-2V16z';
        },

        getExportIconPath:function(){
            return 'M22,8H8v16h16V10L22,8z M16,10h2v4h-2V10z M22,22H10V10h1v5h9v-5h1.171L22,10.829V22z';
        },

        getRefreshIconPath:function(){
            return 'M21.656,10.344C20.209,8.896,18.209,8,16,8c-3.43,0-6.354,2.158-7.492,5.19l1.873,0.703C11.234,11.619,13.428,10,16,10c1.657,0,3.156,0.672,4.243,1.757L18,14h6V8L21.656,10.344z M16,22c-1.657,0-3.156-0.671-4.243-1.757L14,18H8v6l2.344-2.344C11.791,23.104,13.791,24,16,24c3.43,0,6.354-2.158,7.492-5.19l-1.873-0.703C20.766,20.381,18.572,22,16,22z';
        },

        getMenuIconPath:function(){
            return 'M8,10L24,10 M8,15L24,15 M8,20L24,20';
        }

    };

    return ToolbarIcon;
});
/**
 * Created by eason on 15/7/27.
 * 工具栏组建
 */
define('component/Toolbar',['require','./Base','../utils/BaseUtils','../Constants','../utils/ExportUtils','./ToolbarIcon','../ComponentLibrary'],function(require){
    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var ExportUtils = require('../utils/ExportUtils');
    var ToolbarIcon = require('./ToolbarIcon');

    var ICON_SIZE = 32;
    var ICON_GAP = 1;
    var DEFAULT_GAP = 5;

    function Toolbar(vanchart, option, componentType){
        Base.call(this, vanchart, option, componentType);
        this.menuIcon = null;
        this.refreshIcon = null;
        this.pos = {x:0, y:0};
        this.toolbarIcons = [];
        this.refresh(option);
        this.isOpen = !this.componentOption.hidden;
    }

    Toolbar.prototype = {
        constructor:Toolbar,

        doLayout:function(){

            var option = this.componentOption;

            if(!option.enabled || !this._needLayout){
                return;
            }

            //工具栏只需要布局一次
            this._needLayout = false;

            this.toolbarIcons = [];
            this.pos = {x:0, y:0};

            var icons = [Constants.REFRESH_ICON];
            this._registerIcons('sort', Constants.INCREASE_ICON, icons);

            //ie678不支持前台导出
            if(BaseUtils.isSupportSVG() && !BaseUtils.isIE()){
                this._registerIcons('toImage', Constants.EXPORT_ICON, icons);
            }

            this._registerIcons('fullScreen', Constants.MAX_ICON, icons);
            this._registerIcons('exitFullScreen', Constants.MIN_ICON, icons);

            if(this.componentOption.hidden){
                icons.push(Constants.MENU_ICON);
            }

            var GAP = ICON_SIZE + ICON_GAP;
            var size = icons.length * GAP + DEFAULT_GAP;

            var startX = this.vanchart.chartWidth() - size;

            this.pos = {x:startX, y:DEFAULT_GAP};
            var isOpen = !this.componentOption.hidden;
            for(var iconIndex = 0, len = icons.length; iconIndex < len; iconIndex++){
                var pos = {x:iconIndex * GAP, y:0};
                var type = icons[iconIndex];

                if(type == Constants.MENU_ICON){
                    this.menuIcon = new ToolbarIcon(type, this, pos, true);
                }else if(type == Constants.REFRESH_ICON){
                    this.refreshIcon = new ToolbarIcon(type, this, pos, false);
                }else{
                    this.toolbarIcons.push(new ToolbarIcon(type, this, pos, isOpen));
                }
            }
        },

        _registerIcons:function(iconKey, iconType, icons){
            var option = this.componentOption;
            if(option[iconKey] && option[iconKey].enabled){
                icons.push(iconType);
            }
        },

        getToolbarPos:function(){
            return this.pos;
        },

        getToolbarIcons:function(){
            return this.toolbarIcons;
        },

        getRefreshIcon:function(){
            return this.refreshIcon;
        },

        showRefreshIconWhenZoom:function(){

            if(!this.refreshIcon.visible){

                if(this.menuIcon){

                    if(this.isOpen){
                        this.refreshIcon.showIcon();
                    }else{

                        this.refreshIcon.showIcon();

                        var toolbarIcons = this.toolbarIcons;
                        var iconSize = toolbarIcons.length;

                        var refreshIcon = this.refreshIcon;

                        var left = 4 * (iconSize + 1) ;
                        var right = 4 * (iconSize + 1) + 33 * iconSize;

                        if(refreshIcon.visible){
                            refreshIcon.refreshMoveWithoutAnimation(left, right);
                        }

                    }

                }else{
                    this.refreshIcon.showIcon();
                }

            }

        },

        showOrHide:function(){
            this.isOpen ? this.render.hide() : this.render.show();

            this.isOpen = !this.isOpen;

            this.toolbarIcons.forEach(function(icon){
                icon.visible = this.isOpen;
            });

            var GAP = ICON_SIZE + ICON_GAP;
            //默认加上刷新按钮的
            var width = this.toolbarIcons.length * GAP + GAP;
            if(this.isOpen){
                width = -width;
            }

            var title = this.vanchart.getComponent(Constants.TITLE_COMPONENT);

            if(title && !title.isFloat){
                //横向平移
                title.translateX(width);
            }

        },

        getIconSize:function(){
            return ICON_SIZE;
        },

        getToolbarWidth:function(){
            //每个控件
            var GAP = ICON_SIZE + ICON_GAP;

            var width = DEFAULT_GAP;

            //刷新按钮的位置始终空出来
            if(this.refreshIcon){
                width += GAP;
            }

            //不收缩的时候没有菜单
            if(this.menuIcon && this.menuIcon.visible){
                width += GAP;
            }

            if(this.isOpen){
                width += this.toolbarIcons.length * GAP;
            }

            return width;
        },

        getToolbarHeight:function(){
            return ICON_SIZE;
        }

    };

    BaseUtils.inherit(Toolbar, Base);
    require('../ComponentLibrary').register(Constants.TOOLBAR_COMPONENT, Toolbar);
    return Toolbar;
});
/**
 * Created by eason on 15/10/12.
 */

define('render/ZoomBarRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function ZoomBarRender(zoomBar){
        BaseRender.call(this, zoomBar);
        this.zoomBar = zoomBar;
    }

    ZoomBarRender.prototype = {
        constructor:ZoomBarRender,

        render:function(){

            if(!this.zoomBar.zoomToolEnabled() || this._zoomG){
                return ;
            }

            var bounds = this.zoomBar.bounds;
            var svgRoot = this.zoomBar.getVanchartRender().getRenderRoot();

            this._zoomG = svgRoot
                .append('g')
                .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ')');

            this._initUnitLength();

            var startX = this.zoomBar.getStartX();
            var endX = this.zoomBar.getEndX();

            this._zoomG.append('g')
                .call(this._createLines.bind(this));

            this.leftRect = this._zoomG.append('g').call(this._createSideRect.bind(this), startX, true);

            this.rightRect = this._zoomG.append('g').call(this._createSideRect.bind(this), endX, false);

            this.innerRect = this._zoomG.append('g').call(this._createInnerRect.bind(this), startX, endX);

            this.leftButton = this._zoomG.append('g').call(this._createButton.bind(this), startX, true);

            this.rightButton = this._zoomG.append('g').call(this._createButton.bind(this), endX, false);

            var buttonWidth = this.zoomBar.getZoomBarWidth();
            var height = this.zoomBar.getZoomBarHeight();

            this.l_bounds = {
                x:startX,
                y:0,
                width:buttonWidth,
                height:height
            };

            this.r_bounds = {
                x:endX - buttonWidth,
                y:0,
                width:buttonWidth,
                height:height
            };

            this.c_bounds = {
                x:startX + buttonWidth,
                y:0,
                width:endX - startX - 2*buttonWidth,
                height:height
            };

            this._addEventListeners(svgRoot);
        },

        remove:function(){
            if(this._zoomG){
                this._zoomG.remove();
                this._zoomG = null;
            }
        },

        _initUnitLength:function(){
            var axis = this.zoomBar.vanchart.xAxis();

            if(axis.type == Constants.CATEGORY_AXIS_COMPONENT){
                var bounds = this.zoomBar.bounds;
                var categories = axis.getCategories();
                this.unitLength = categories.length ? bounds.width/categories.length : bounds.width;
            }else{
                this.unitLength = 1;
            }
        },

        _addEventListeners:function(svgRoot){

            var self = this;

            svgRoot
                .on('mousedown.zoom', function(){

                    var downPos = d3.mouse(self._zoomG.node());

                    if(BaseUtils.containsPoint(self.l_bounds, downPos)){
                        this.tartget = self.leftButton;
                    }else if(BaseUtils.containsPoint(self.r_bounds, downPos)){
                        this.tartget = self.rightButton;
                    }else if(BaseUtils.containsPoint(self.c_bounds, downPos)){
                        this.tartget = self.innerRect;
                    }

                    if(this.tartget){
                        this.downX = downPos[0];
                        this.initX = d3.transform(this.tartget.attr('transform')).translate[0];
                        self._zoomG.style('cursor', 'ew-resize');
                        self._initStartEndIndex();
                    }
                })
                .on('mousemove.zoom', function(){

                    if(this.tartget){

                        var component = this.tartget.attr('class');

                        switch (component){

                            case Constants.LEFT:
                                if(self.zoomBar.resizable()){
                                    self._leftButtonMove(this.downX, this.initX);
                                }
                                break;

                            case Constants.RIGHT:
                                if(self.zoomBar.resizable()){
                                    self._rightButtonMove(this.downX, this.initX);
                                }
                                break;

                            case Constants.CENTER:
                                self._centerRectMove(this.downX);
                                break;
                        };

                        self._zoomRefresh();
                    }

                })
                .on('mouseup.zoom', function(){

                    if(this.tartget){
                        this.tartget = null;
                        self._updateBounds();

                        var axis = self.zoomBar.vanchart.xAxis();
                        if(axis){
                            axis.render.render();
                        }

                    }

                });

        },

        _leftButtonMove:function(downX, initX){

            var barWidth = this.zoomBar.getZoomBarWidth();

            var minTransX = 0;

            var maxTransX = d3.transform(this.rightButton.attr('transform')).translate[0] - barWidth;

            var currentX = d3.mouse(this._zoomG.node())[0];

            var transX = initX + currentX - downX;

            transX = Math.max(Math.min(transX, maxTransX), minTransX);

            this.leftButton.attr('transform', 'translate(' + transX + ',0)');
            this.leftRect.select('rect').attr('width', transX);

            this.innerRect.selectAll('line').attr('x1', transX + barWidth);
            this.innerRect.select('rect')
                .attr('x', transX + barWidth)
                .attr('width', maxTransX - transX);
        },

        _rightButtonMove:function(downX, initX){
            var barWidth = this.zoomBar.getZoomBarWidth();

            var minTransX = d3.transform(this.leftButton.attr('transform')).translate[0] + barWidth;

            var maxTransX = this.zoomBar.getBoundsEndX() - barWidth;

            var currentX = d3.mouse(this._zoomG.node())[0];

            var transX = initX + currentX - downX;

            transX = Math.max(Math.min(transX, maxTransX), minTransX);

            this.rightButton.attr('transform', 'translate(' + transX + ',0)');
            this.rightRect.select('rect')
                .attr('x', transX + barWidth)
                .attr('width', this.zoomBar.getBoundsEndX() - (transX + barWidth));

            this.innerRect.selectAll('line').attr('x2', transX);
            this.innerRect.select('rect').attr('width', transX - minTransX);
        },

        _centerRectMove:function(downX){

            var endX = this.zoomBar.getBoundsEndX();
            var barWidth = this.zoomBar.getZoomBarWidth();

            var currentX = d3.mouse(this._zoomG.node())[0];


            var detX = currentX - downX;

            if(this.l_bounds.x + detX >=0 && this.r_bounds.x + this.r_bounds.width + detX <= endX){

                var l_transX = this.l_bounds.x + detX;

                this.leftButton.attr('transform', 'translate(' + l_transX + ',0)');

                this.leftRect.select('rect').attr('width', l_transX);

                var r_transX = this.r_bounds.x + detX;
                this.rightButton.attr('transform', 'translate(' + r_transX + ',0)');
                this.rightRect.select('rect')
                    .attr('x', r_transX + barWidth)
                    .attr('width', this.zoomBar.getBoundsEndX() - (r_transX + barWidth));


                this.innerRect.selectAll('line')
                    .attr('x1', l_transX + barWidth)
                    .attr('x2', r_transX);

                this.innerRect.select('rect')
                    .attr('x', l_transX + barWidth)
            }
        },

        _initStartEndIndex:function(){
            var l_transX = d3.transform(this.leftButton.attr('transform')).translate[0];
            var r_transX = d3.transform(this.rightButton.attr('transform')).translate[0];

            this.initStart = this._getIndexByPosition(l_transX);
            this.initEnd = this._getIndexByPosition(r_transX);
        },

        _getIndexByPosition:function(x){

            if(this.xScale.rangeBand){
                var axis = this.zoomBar.vanchart.xAxis();
                var categories = axis.getCategories();
                return axis.isAxisReversed() ? categories.length - 1 - Math.floor(x/this.unitLength) : Math.floor(x/this.unitLength);
            }else{
                return this.xScale.invert(x);
            }
        },

        _zoomRefresh:function(){

            var l_transX = d3.transform(this.leftButton.attr('transform')).translate[0];
            var r_transX = d3.transform(this.rightButton.attr('transform')).translate[0];

            var startIndex = this._getIndexByPosition(l_transX);
            var endIndex = this._getIndexByPosition(r_transX);

            if(this.initStart != startIndex || this.initEnd != endIndex){

                var axis = this.zoomBar.vanchart.xAxis();

                axis.updateAxisScale(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex), true);

                var vanchart = this.zoomBar.vanchart;
                vanchart.currentOption.state = Constants.STATE_ZOOM_REFRESH;

                vanchart.layoutComponentsAndCharts();

                this.initStart = startIndex;
                this.initEnd = endIndex;
            }

        },

        _updateBounds:function(){

            var l_transX = d3.transform(this.leftButton.attr('transform')).translate[0];
            var r_transX = d3.transform(this.rightButton.attr('transform')).translate[0];

            var barWidth = this.zoomBar.getZoomBarWidth();

            this.l_bounds.x = l_transX;
            this.r_bounds.x = r_transX;

            this.c_bounds.x = l_transX + barWidth;
            this.c_bounds.width = r_transX - l_transX - barWidth;
        },

        _createSideRect:function(g, startX, isLeft){

            var barHeight = this.zoomBar.getZoomBarHeight();

            var x, width;

            if(isLeft){
                x = 0;
                width = startX;
            }else{
                x = startX;
                width = this.zoomBar.bounds.width - startX;
            }

            g.append('rect')
                .attr('x', x)
                .attr('y', 0)
                .attr('width', width)
                .attr('height', barHeight)
                .style('fill', 'rgba(220,221,221,0.4)');

        },

        _createInnerRect:function(g, startX, endX){

            var barWidth = this.zoomBar.getZoomBarWidth();
            var barHeight = this.zoomBar.getZoomBarHeight();

            g.attr('class', Constants.CENTER);

            g.append('rect')
                .attr('x', startX + barWidth)
                .attr('y', 0)
                .attr('width', endX - startX - 2 * barWidth)
                .attr('height', barHeight)
                .style('fill', 'rgba(255,255,255,0)');

            g.append('line')
                .attr('x1', startX + barWidth)
                .attr('y1', 0)
                .attr('x2', endX - barWidth)
                .attr('y2', 0);

            g.append('line')
                .attr('x1', startX + barWidth)
                .attr('y1', barHeight)
                .attr('x2', endX - barWidth)
                .attr('y2', barHeight);

            g.selectAll('line')
                .style({
                    fill:'none',
                    stroke:'#29ABE2',
                    'stroke-width':1
                });

        },

        //缩放底边上的线
        _createLines:function(g){

            var bounds = this.zoomBar.bounds;

            var axis = this.zoomBar.vanchart.xAxis();

            this.xScale = this.zoomBar._getAxisScale();

            var xScale = this.xScale;

            var series = this.zoomBar.option.series;
            var usedSeries = [];
            series.forEach(function(sery){
                if(!sery.xAxis){
                    usedSeries.push(sery);
                }
            });

            var lines = [];

            var minValueY = Number.MAX_VALUE;
            var maxValueY = Number.MIN_VALUE;

            usedSeries.forEach(function(sery){

                var points = [];

                lines.push(points);

                var dCount = sery.data.length;

                for (var dIndex = 0; dIndex < dCount; dIndex++) {
                    var datum = sery.data[dIndex];
                    var point = {
                        x:axis.getValueFromData(datum),
                        y:BaseUtils.pick(datum.y, datum)
                    };

                    if(isNaN(+point.y)){
                        continue;
                    }

                    points.push(point);

                    minValueY = Math.min(minValueY, point.y);
                    maxValueY = Math.max(maxValueY, point.y);
                }
            });

            minValueY = minValueY >= 0 ? 0 : minValueY;

            var det = xScale.rangeBand ? xScale.rangeBand()/2 : 0;

            var yScale = d3.scale.linear().domain([minValueY, maxValueY]).range([bounds.height, 0]);

            lines.forEach(function(points){

                points.forEach(function(point){
                    point.x = xScale(point.x) + det;
                    point.y = yScale(point.y);
                })

            });

            lines.forEach(function(points){

                points.sort(function(a, b){
                    return a.x - b.x;
                })

            });

            var lineSvg = d3.svg.line()
                .interpolate("linear")
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; });

            g.selectAll('path')
                .data(lines)
                .enter()
                .append('path')
                .attr('d', function(points){
                    return lineSvg(points);
                })
                .style({
                    fill:'none',
                    stroke:'black',
                    'stroke-width':1
                });
        },

        _createButton:function(g, startX, isLeft){

            startX = isLeft ? startX : startX - this.zoomBar.getZoomBarWidth();

            g.attr('transform', 'translate(' + startX + ',' + '0)')
                .attr('class', isLeft ? Constants.LEFT : Constants.RIGHT);

            g.append('path')
                .attr('d', isLeft ? 'M4,30h6V0L4,0C1.791,0,0,1.791,0,4v22C0,28.209,1.791,30,4,30z' : 'M6,30H0V0h6c2.209,0,4,1.791,4,4v22C10,28.209,8.209,30,6,30z')
                .style('fill', '#29ABE2');

            g.append('line')
                .attr('x1', 3)
                .attr('y1', 11)
                .attr('x2', 3)
                .attr('y2', 18);

            g.append('line')
                .attr('x1', 7)
                .attr('y1', 11)
                .attr('x2', 7)
                .attr('y2', 18);

            g.selectAll('line')
                .style({
                    fill: '#FFFFFF',
                    stroke: '#7ADAF4',
                    'stroke-width': 2,
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'stroke-miterlimit': 10
                });
        }
    };


    BaseUtils.inherit(ZoomBarRender, BaseRender);
    require('./RenderLibrary').register(Constants.ZOOM_SVG, ZoomBarRender);
});
/**
 * Created by eason on 15/10/12.
 */
define('component/ZoomBar',['require','../render/ZoomBarRender','./Base','../utils/BaseUtils','../Constants','../ComponentLibrary'],function(require){

    require('../render/ZoomBarRender');

    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    //缩放控件默认的高度
    var HEIGHT = 30;
    var WIDTH = 10;

    function ZoomBar(vanchart, option, componentType){

        Base.call(this, vanchart, option, componentType);

        this.refresh(option);
    }

    ZoomBar.prototype = {
        constructor:ZoomBar,

        doLayout:function(){

            if(this.zoomToolEnabled()){
                this._setComponentBounds(Constants.BOTTOM, HEIGHT);
            }

        },

        fixBoundsByPlot:function(){

            var plotBounds = this.vanchart.getPlotBounds();

            var zoomY = plotBounds.y + plotBounds.height;

            var xAxisComponent = this.vanchart.getComponent(Constants.X_AXIS_COMPONENT);

            if(xAxisComponent && xAxisComponent._axisList.length){
                xAxisComponent._axisList.forEach(function(axis){

                    if(axis.getPosition() == Constants.BOTTOM){

                        zoomY = Math.max(zoomY, axis.bounds.y + axis.bounds.height);
                    }

                })
            }

            this.bounds = BaseUtils.makeBounds(plotBounds.x, zoomY, plotBounds.width, HEIGHT);
        },

        // ensure they are within the axis
        getRevisedDomain: function () {
            var revisedDomain = {
                from: this.componentOption.zoomTool.from,
                to: this.componentOption.zoomTool.to
            };

            var axis = this.vanchart.xAxis();
            if (axis.type === Constants.VALUE_AXIS_COMPONENT) {

                var tmp = [+this.componentOption.zoomTool.from, +this.componentOption.zoomTool.to];

                revisedDomain.from = Math.min.apply(null, tmp);
                revisedDomain.to = Math.max.apply(null, tmp);

                var axisDomain = axis.getOriginalDomain();

                revisedDomain.from =
                    Math.max(revisedDomain.from, axisDomain.minValue);
                revisedDomain.to =
                    Math.min(revisedDomain.to, axisDomain.maxValue);
            }

            return revisedDomain;
        },

        zoomToolEnabled:function(){
            var axis = this.option.xAxis;
            if(axis){
                axis = axis[0] || axis;
            }

            return this.componentOption
                && this.componentOption.zoomTool
                && this.componentOption.zoomTool.visible
                && !this.option.dataSheet
                && !this.option.plotOptions.force
                && axis;
        },

        resizable:function(){

            return this.componentOption
                && this.componentOption.zoomTool
                && this.componentOption.zoomTool.resize;

        },

        getZoomBarWidth:function(){
            return WIDTH;
        },

        getZoomBarHeight:function(){
            return HEIGHT;
        },

        _getAxisScale:function(){

            var axis = this.vanchart.xAxis();

            var scale = axis.scale.copy();

            if (axis.type == Constants.CATEGORY_AXIS_COMPONENT) {
                scale.rangeBand ? scale.rangeBands(axis._getRange()) : scale.range(axis._getRange());
            } else {
                var domain = axis.getOriginalDomain();
                scale.domain([domain.minValue, domain.maxValue]);
            }
            return scale;

        },

        getStartX:function(){
            var revisedDomain = this.getRevisedDomain();
            var startX = 0;

            var scale = this._getAxisScale();

            if(revisedDomain.from && !revisedDomain.to){
                startX = scale(revisedDomain.from);
                startX = isNaN(startX) ? 0 : startX;
            }else if(revisedDomain.from && revisedDomain.to){
                return this._getMinX();
            }

            return startX;
        },

        getEndX:function(){

            var revisedDomain = this.getRevisedDomain();
            var endX = this.bounds.width;
            var scale = this._getAxisScale();

            if(revisedDomain.to && !revisedDomain.from){
                endX = scale(revisedDomain.to) + (scale.rangeBand ? scale.rangeBand() : 0);
                endX = isNaN(endX) ? this.bounds.width : endX;
            }else if(revisedDomain.to && revisedDomain.from){
                return this._getMaxX();
            }

            return endX;
        },

        _getMinX:function(){
            var revisedDomain = this.getRevisedDomain();

            if(revisedDomain.from && revisedDomain.to){

                var scale = this._getAxisScale();

                var x1 = scale(revisedDomain.from);
                var x2 = scale(revisedDomain.to);

                var result = Math.min(x1, x2);

                return isNaN(result) ? 0 : result;
            }
        },

        _getMaxX:function(){
            var revisedDomain = this.getRevisedDomain();

            if(revisedDomain.from && revisedDomain.to){

                var scale = this._getAxisScale();

                var x1 = scale(revisedDomain.from);
                var x2 = scale(revisedDomain.to);

                var result = Math.max(x1, x2) + (scale.rangeBand ? scale.rangeBand() : 0);

                return  isNaN(result) ?  this.bounds.width : result;
            }
        },

        getBoundsEndX:function(){
            return this.bounds.width;
        }

    };

    BaseUtils.inherit(ZoomBar, Base);
    require('../ComponentLibrary').register(Constants.ZOOM_COMPONENT, ZoomBar);
    return ZoomBar;

});
/**
 * Created by eason on 15/5/4.
 * 数据表
 */
define('component/DataSheet',['require','./Base','../utils/BaseUtils','../utils/Formatter','../Constants','../render/LegendIconFactory','../ComponentLibrary'],function(require){

    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Formatter = require('../utils/Formatter');
    var Constants = require('../Constants');
    var LegendIconFactory = require('../render/LegendIconFactory');

    var PADDING_GAP = 4;
    var ICON_GAP = 2;
    var MAX_ICON_SIZE = 18;

    var STYLE = { color : "#666666", fontSize: "14px", fontFamily:"Verdana"};


    function DataSheet(vanchart, option, componentType){
        Base.call(this, vanchart, option, componentType);

        this.refresh(option);
    }

    DataSheet.prototype = {
        constructor:DataSheet,

        /**
         *数据表的对象要先于坐标轴存在，但是大小需要最后确定
         */
        doLayout:function(){

            this.remove();

            var plotBounds = this.vanchart.getPlotBounds();
            var leftDet =  Math.round(this.getSeriesNameLength());
            this._clipPlotBounds(Constants.LEFT, Math.max(leftDet - plotBounds.x, 0));

            this._setComponentBounds(Constants.BOTTOM, this.getDataSheetHeight());
        },

        fixBoundsByPlot:function() {

            var plotBounds = this.vanchart.getPlotBounds();

            this.bounds = {
                x: plotBounds.x - this.maxSeriesWidth,
                y: plotBounds.y + plotBounds.height,
                width: this.maxSeriesWidth + plotBounds.width,
                height: this.sheetHeight
            };

        },
                //最长的系列名
        getSeriesNameLength:function(){

            this.seriesNames = [];
            this.maxSeriesLine = [];

            var series = this.option.series;

            var style = this._seriesStyle();

            var limitedWidth = this.vanchart.getChartBounds().width / 4 - (MAX_ICON_SIZE + ICON_GAP * 2);

            var maxWidth = 0;

            var iconSize = 0;

            for(var sIndex = 0, sCount = series.length; sIndex < sCount; sIndex++){
                this.maxSeriesLine[sIndex] = 0;

                var sery = series[sIndex];
                var width = BaseUtils.getTextDimension(sery.name, style, false).width + PADDING_GAP * 2;

                if(width > limitedWidth){

                    var s_names = BaseUtils.splitText(sery.name, style, limitedWidth, PADDING_GAP);

                    this.maxSeriesLine[sIndex] = s_names.length;

                    this.seriesNames.push(s_names);

                    maxWidth = limitedWidth;
                }else{
                    this.maxSeriesLine[sIndex] = 1;

                    this.seriesNames.push([sery.name]);

                    maxWidth = Math.max(width, maxWidth);
                }

                var iconType = this._getLegendType(sIndex);

                iconSize = Math.max(iconSize, LegendIconFactory.getLegendIconSize(iconType).width);
            }

            this.maxSeriesWidth = Math.ceil(maxWidth + ICON_GAP * 2 + iconSize);

            return  this.maxSeriesWidth + PADDING_GAP;
        },

        getDataSheetHeight:function(){

            this.maxCateLine = 0;
            this.categoryNames = [];
            this.values = [];
            this.maxValueLine = [];

            var axis = this.vanchart.xAxis();

            var categories = axis.getCategories();

            if(axis.isAxisReversed()){
                categories = BaseUtils.clone(categories).reverse();
            }

            var cateStyle = this._categoryStyle();

            var unitLength = this.vanchart.getPlotBounds().width / categories.length;

            var self = this;

            categories.forEach(function(category){

                var sCateName = BaseUtils.splitText(category, cateStyle, unitLength, PADDING_GAP);

                self.maxCateLine = Math.max(self.maxCateLine, sCateName.length);

                self.categoryNames.push(sCateName);

            });

            var valueStyle = this._valueStyle();
            var format = this.componentOption.formatter;

            var series = this.vanchart.series;

            for(var sIndex = 0, sCount = series.length; sIndex < sCount; sIndex++){
                var seryValue = [];
                this.values.push(seryValue);

                this.maxValueLine[sIndex] = 0;

                var sery = series[sIndex];

                for(var dIndex = 0, len = sery.points.length; dIndex < len; dIndex++){

                    var point = sery.points[dIndex];
                    var value = point.value;

                    var f_value = point.isNull ? '-' : this._getTickContent(value, format);
                    var sValue = BaseUtils.splitText(f_value, valueStyle, unitLength, PADDING_GAP);

                    seryValue[BaseUtils.indexInArray(categories, point.category)] = sValue;

                    this.maxValueLine[sIndex] = Math.max(this.maxValueLine[sIndex], sValue.length);
                }
            }


            //开始计算高度
            var cateHeight = this.getCategoryHeight();

            var valueHeight = 0;

            for(var sIndex = 0, sCount = series.length; sIndex < sCount; sIndex++){
                valueHeight += this.getSeriesHeight(sIndex);
            }

            this.sheetHeight = Math.ceil(cateHeight + valueHeight);

            return this.sheetHeight
        },

        _categoryStyle:function(){
            return this.option.xAxis.labelStyle || this.option.xAxis[0].labelStyle || STYLE;
        },

        _seriesStyle:function(){
            return this.option.legend ? this.option.legend.style : STYLE;
        },

        _valueStyle:function(){
            return this.componentOption.style;
        },

        getCategoryHeight:function(){

            var cateStyle = this._categoryStyle();

            return PADDING_GAP * 2
                        + this.maxCateLine * BaseUtils.getTextHeight(cateStyle)
                                            + (this.maxCateLine - 1) * PADDING_GAP

        },

        getSeriesHeight:function(sIndex){

            var seriesLineHeight = BaseUtils.getTextHeight(this._seriesStyle());
            var valueLineHeight = BaseUtils.getTextHeight(this._valueStyle());

            var s_count = this.maxSeriesLine[sIndex];
            var s_height = PADDING_GAP * 2 + s_count * seriesLineHeight + (s_count - 1) * PADDING_GAP;

            var v_count = this.maxValueLine[sIndex];
            var v_height = PADDING_GAP * 2 + v_count * valueLineHeight + (v_count - 1) * PADDING_GAP;

            return Math.max(s_height, v_height);
        },

        getMaxSeriesWidth:function(){
            return this.maxSeriesWidth;
        },

        getTextPadding:function(){
            return PADDING_GAP;
        }

    };

    BaseUtils.inherit(DataSheet, Base);
    require('../ComponentLibrary').register(Constants.DATA_SHEET_COMPONENT, DataSheet);
    return DataSheet;
});
/**
 * Created by Mitisky on 16/3/21.
 */
define ('component/RangeLegend',['require','./Base','../utils/BaseUtils','../Constants','../utils/ColorUtils','../utils/QueryUtils','../utils/Formatter','../ComponentLibrary'],function(require){
    var Base = require('./Base');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var ColorUtils = require('../utils/ColorUtils');
    var QueryUtils = require('../utils/QueryUtils');
    var Formatter = require('../utils/Formatter');

    var PADDING = 10;

    var WIDTH = 15;
    var HEIGHT = 100;
    var BAR_WIDTH = 15;
    var BAR_HEIGHT = 10;
    var BAR_TEXT_GAP = 5;
    var ITEM_WIDTH = 25;
    var ITEM_GAP = 2;

    function RangeLegend(vanchart, option, componentType){
        Base.call(this, vanchart, option, componentType);
        this.refresh(option);
    }

    RangeLegend.prototype = {
        constructor: RangeLegend,

        _refresh: function () {
            this._mergeAttr();
        },

        doLayout: function () {

            if(this.isIntervalLegend){
                this._setItemsPoints();
            }

            //占用绘图区的宽或者高或者没有
            var usedSize = this._calculateUsedSize();
            this._setComponentBounds(this.componentOption.position || Constants.RIGHT_TOP, usedSize);

            this._calculateRangeLegendFinalBounds(usedSize);

        },
        
        _mergeAttr: function () {
            if(this.vanchart.isZoomRefreshState()){
                return;
            }
            var range = this.componentOption.range;
            var self = this;

            this.isIntervalLegend = BaseUtils.isArray(range);

            if(this.isIntervalLegend) {
                var hiddenColor = this.componentOption.hiddenColor;
                var hoverColor = this.componentOption.hoverColor;
                var formatter = this.componentOption.formatter;
                this.items = [];
                range.forEach(function(band){
                    var label = self._getIntervalLabelContent(band.from, band.to, formatter);
                    self.items.push(
                        {
                            from: band.from,
                            to: band.to,
                            color: band.color,
                            label: label,
                            points: [],
                            visible: true,
                            hiddenColor: hiddenColor,
                            hoverColor: hoverColor
                        }
                    )
                });

                this.items.sort(function (itemA, itemB) {
                    var itemAMin = Math.min(itemA.from, itemA.to);
                    var itemBMin = Math.min(itemB.from, itemB.to);
                    return self.isHorizontal() ? itemAMin - itemBMin : itemBMin - itemAMin;
                });

            } else {
                this.min = BaseUtils.pick(range.min, 0);
                this.max = BaseUtils.pick(range.max, 100);
                this.valueAndColors = range.color;
                this.valueAndColors.sort(function(d1, d2){
                    return d1[0] - d2[0];
                });
                var valueArray = [];
                var colorArray = [];
                for(var i = 0, len = this.valueAndColors.length; i < len; i ++ ){
                    valueArray[i] = this.valueAndColors[i][0];
                    colorArray[i] = this.valueAndColors[i][1];
                }

                this.valueScale = d3.scale.linear()
                    .domain([this.min, this.max])
                    .range([0, 1]);

                this.colorScale = d3.scale.linear()
                    .domain(valueArray)
                    .range(colorArray);
            }
        },

        _getIntervalLabelContent:function(from, to, formatter){
            if(!formatter){
                return from + '-' + to;
            }

            return Formatter.format({'from':from,'to':to}, formatter);
        },

        _getGradientMinLabelContent: function () {
            return this._getGradientLabelWithFormatter(this.min);
        },

        _getGradientMaxLabelContent: function () {
            return this._getGradientLabelWithFormatter(this.max);
        },

        _getGradientLabelWithFormatter: function (value) {
            var formatter = this.componentOption.formatter;
            if(!formatter){
                return value;
            }

            return Formatter.format(value, formatter);
        },

        getValueAndColors: function () {
            return this.valueAndColors;
        },

        getGradientLabelContent: function (value) {
            return this._getGradientLabelWithFormatter(this._gradientScale(value));
        },

        _gradientScale: function (value) {
            var unit = BaseUtils.accDiv(BaseUtils.accAdd(this.max, -this.min), HEIGHT);
            value = BaseUtils.accMul(unit, this.isHorizontal() ? value : (HEIGHT - value));
            value = BaseUtils.accAdd(value, this.min);
            return value;
        },

        getColorWithSize: function (size) {
            if(this.isIntervalLegend){
                var item = this._getPointItem(size);
                if(item) {
                    return item.color;
                } else {
                    return null;
                }
            } else {
                if (size >= this.min && size <= this.max) {
                    return this.colorScale(this.valueScale(size));
                } else {
                    return null;
                }
            }
        },

        _setItemsPoints: function () {
            var self = this;
            var seriesS = this.vanchart.series;
            seriesS.forEach(function (sery) {
                var pointS = sery.points;
                pointS.forEach(function (point) {
                    var size = point.size;
                    var item = self._getPointItem(size);
                    if(item) {
                        item.points.push(point);
                    }
                })
            })
        },

        _getPointItem:function(size){
            for(var i = 0, len = this.items.length; i < len; i++){
                var item = this.items[i];
                var min = Math.min(item.from, item.to);
                var max = Math.max(item.from, item.to);

                if(size >= min && size <= max){
                    return item;
                }
            }
        },

        _calculateUsedSize: function () {
            var cfg = this.componentOption;
            var position = cfg.position || Constants.RIGHT;
            var size = PADDING * 4;

            if(position == Constants.TOP || position == Constants.BOTTOM){

                var maxLimitSize = this._maxHeight();

                size += this.isIntervalLegend ? this._calculateIntervalTopAndBottomSize()
                    : this._calculateGradientTopAndBottomSize();


                return cfg.maxHeight ? Math.min(size, maxLimitSize) : size;

            }else{
                var maxLimitSize = this._maxWidth();

                size += this.isIntervalLegend ? this._calculateIntervalLeftAndRightSize()
                    : this._calculateGradientLeftAndRightSize();

                return cfg.maxWidth ? Math.min(size, maxLimitSize) : size;
            }
        },

        _calculateGradientTopAndBottomSize: function () {
            var height = WIDTH + BAR_WIDTH + BAR_TEXT_GAP;
            var d = BaseUtils.getTextDimension(this._getGradientMinLabelContent(), this.componentOption.style);
            return height + d.height;
        },

        _calculateGradientLeftAndRightSize: function () {
            var width = WIDTH + BAR_WIDTH + BAR_TEXT_GAP;
            var d1 = BaseUtils.getTextDimension(this._getGradientMinLabelContent(), this.componentOption.style);
            var d2 = BaseUtils.getTextDimension(this._getGradientMaxLabelContent(), this.componentOption.style);
            return width + Math.max(d1.width, d2.width);
        },

        _calculateIntervalTopAndBottomSize: function () {
            var height = WIDTH + BAR_TEXT_GAP * 2;
            var d = BaseUtils.getTextDimension("0", this.componentOption.style);
            return height + d.height * 2;
        },

        _calculateIntervalLeftAndRightSize : function () {
            var width = 0;
            var style = this.componentOption.style;
            this.items.forEach(function (item) {
                var labelDim = BaseUtils.getTextDimension(item.label, style);
                width = Math.max(width, labelDim.width);
            });
            return width + WIDTH + BAR_TEXT_GAP;
        },

        _calculateRangeLegendFinalBounds: function () {
            var cfg = this.componentOption;
            var position = cfg.position || Constants.RIGHT;

            var temp = PADDING * 2;

            if(position == Constants.TOP || position == Constants.BOTTOM){
                temp += this.isIntervalLegend ? this._calculateIntervalTopAndBottomFinalSize()
                    : this._calculateGradientTopAndBottomFinalSize();
                temp = Math.max(this.bounds.width - temp, 0);
                this.bounds.x += temp/2;
                this.bounds.width -= temp;
            }else if(position == Constants.LEFT || position == Constants.RIGHT){
                temp += this.isIntervalLegend ? this._calculateIntervalLeftAndRightFinalSize()
                    : this._calculateGradientLeftAndRightFinalSize();
                temp = Math.max(this.bounds.height - temp, 0);
                this.bounds.y += temp/2;
                this.bounds.height -= temp;
            } else if(position == Constants.RIGHT_TOP) {
                temp += this.isIntervalLegend ? this._calculateIntervalLeftAndRightFinalSize()
                    : this._calculateGradientLeftAndRightFinalSize();
                this.bounds.height = temp;
            }

            if(!this.isFloat){
                var gap = this.componentOption.borderWidth + PADDING * 2;
                this.bounds.x += gap/2;
                this.bounds.y += gap/2;
                this.bounds.width -= gap;
                this.bounds.height -= gap;

                if(position == Constants.BOTTOM) {
                    var zoomComponent = this.vanchart.getComponent(Constants.ZOOM_COMPONENT);
                    if (zoomComponent && zoomComponent.zoomToolEnabled()) {
                        this.bounds.y += zoomComponent.bounds.height;
                    }
                }

                if(position == Constants.RIGHT || position == Constants.RIGHT_TOP){
                    var toolbarHeight = this.vanchart.getToolbarHeight();
                    this.bounds.y += toolbarHeight;
                    this.bounds.height -= toolbarHeight;
                }
            }
        },

        _calculateGradientTopAndBottomFinalSize: function() {
            var d1 = BaseUtils.getTextDimension(this._getGradientMinLabelContent(), this.componentOption.style);
            var d2 = BaseUtils.getTextDimension(this._getGradientMaxLabelContent(), this.componentOption.style);
            var gap = Math.max(d1.width, d2.width, BAR_HEIGHT);
            return HEIGHT + gap * 2;
        },

        _calculateGradientLeftAndRightFinalSize: function () {
            var d = BaseUtils.getTextDimension(this._getGradientMinLabelContent(), this.componentOption.style);
            var gap = Math.max(d.height/2, BAR_HEIGHT/2);
            gap *= 2;
            return HEIGHT + gap * 2;
        },

        _calculateIntervalTopAndBottomFinalSize: function () {
            var len = this.items.length;
            if(len > 0){
                var d1 = BaseUtils.getTextDimension(this.items[0].label, this.componentOption.style);
                var d2 = BaseUtils.getTextDimension(this.items[len - 1].label, this.componentOption.style);
                var gap = Math.max(0, d1.width - ITEM_WIDTH, d2.width - ITEM_WIDTH);
                return len * ITEM_WIDTH + (len - 1) * ITEM_GAP + gap;
            }
            return 0;
        },

        _calculateIntervalLeftAndRightFinalSize: function () {
            var len = this.items.length;
            if(len > 0){
                var d1 = BaseUtils.getTextDimension(this.items[0].label, this.componentOption.style);
                var d2 = BaseUtils.getTextDimension(this.items[len - 1].label, this.componentOption.style);
                var gap = Math.max(0, d1.height - ITEM_WIDTH, d2.height - ITEM_WIDTH);
                return len * ITEM_WIDTH + (len - 1) * ITEM_GAP + gap;
            }
            return 0;
        },

        getTopBarPath: function () {
            return 'M7.236,10H13c1.105,0,2-0.895,2-2V2c0-1.105-0.895-2-2-2L2.618,0C1.875,0,1.391,0.782,1.724,1.447l3.724,7.447C5.786,9.572,6.479,10,7.236,10z';
        },

        getBottomBarPath: function () {
            return 'M7.236,0L13,0c1.105,0,2,0.895,2,2v6c0,1.105-0.895,2-2,2H2.618c-0.743,0-1.227-0.782-0.894-1.447l3.724-7.447C5.786,0.428,6.479,0,7.236,0z';
        },

        getLeftBarPath: function () {
            return 'M0,7.236V13c0,1.105,0.895,2,2,2h6c1.105,0,2-0.895,2-2V2.618c0-0.743-0.782-1.227-1.447-0.894L1.106,5.447C0.428,5.786,0,6.479,0,7.236z';
        },

        getRightBarPath: function () {
            return 'M10,7.236V13c0,1.105-0.895,2-2,2H2c-1.105,0-2-0.895-2-2L0,2.618c0-0.743,0.782-1.227,1.447-0.894l7.447,3.724C9.572,5.786,10,6.479,10,7.236z';
        },

        refreshPoints: function (min, max) {
            var minSize = this._gradientScale(min);
            var maxSize = this._gradientScale(max);
            var vanChart = this.vanchart;
            var change = false;

            vanChart.series.forEach(function (sery) {
                sery.points.forEach(function (point) {
                    var temp = point.visible;
                    point.visible = (point.size >= minSize && point.size <= maxSize) || (point.size >= maxSize && point.size <= minSize);
                    change = change || temp != point.visible;
                });
            });

            if(change) {
                vanChart.renderOnlyCharts();
            }
        }

    };

    BaseUtils.inherit(RangeLegend, Base);
    require('../ComponentLibrary').register(Constants.RANGE_LEGEND_COMPONENT, RangeLegend);
    return RangeLegend;

});

/**
 * Created by eason on 15/7/17.
 * 用来记录所有默认的config
 */
define('theme/config',['require','../Constants'],function(require){

    var Constants = require('../Constants');

    var config = {};

    config[Constants.PIE_CHART] = {
    };

    config[Constants.COLUMN_CHART] = {

        xAxis:{
            type:'category',
            position:'bottom',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            enableMinorTick:true,
            showLabel:true,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,

            tickPadding:6,
            gridLineWidth:0,
            gridLineColor:'#cccccc',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        },

        yAxis:{
            type:'value',
            position:'left',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            enableMinorTick:false,
            showLabel:true,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,

            tickPadding:6,
            gridLineWidth:1,
            gridLineColor:'#dddddd',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        }

    };

    config[Constants.BAR_CHART] = {

        xAxis:{
            type:'value',
            position:'bottom',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            enableMinorTick:true,
            showLabel:true,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,

            tickPadding:6,
            gridLineWidth:0,
            gridLineColor:'#cccccc',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        },

        yAxis:{
            type:'category',
            position:'left',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            enableMinorTick:false,
            showLabel:true,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,

            tickPadding:6,
            gridLineWidth:1,
            gridLineColor:'#dddddd',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        }
    };

    config[Constants.LINE_CHART] = config[Constants.AREA_CHART] = {

        plotOptions:{
            large:false,

            marker:{
                symbol:'null_marker'
            },

            dataLabels:{
                "enabled": false,
                "align": "outside"
            }
        },

        xAxis:{
            type:'category',
            position:'bottom',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            showLabel:true,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,
            tickPadding:6,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            gridLineWidth:0,
            gridLineColor:'#cccccc',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        },

        yAxis:{
            type:'value',
            position:'left',

            minorTickLength:2,
            lineWidth:0,
            lineColor:'#cccccc',
            enableTick:true,
            showLabel:true,

            tickColor:'#cccccc',
            tickWidth:2,
            tickLength:4,
            tickPadding:3,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            gridLineWidth:1,
            gridLineColor:'#dddddd',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:function(d){return d}
        }
    };

    config[Constants.GAUGE_CHART] = {

        legend:{

            enabled:false

        },

        yAxis:{
            type:'value',
            showLabel:true,
            step:1,

            enableTick:true,
            tickColor:'#BBBBBB',
            tickWidth:1,

            enableMinorTick:true,
            minorTickColor:'#e2e2e2',
            minorTickWidth:1,

            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'10px'
            }

        },

        pointer:{

            tickStyle:{
                color:'#BBBBBB',
                fontSize:'8px',
                fontFamily:'Verdana'
            },

            tickWidth:1,
            tickColor:'#666666',
            minorTickWidth:1,
            minorTickColor:'#FCFCFC',

            seriesLabel:{
                enabled:true,
                align:Constants.BOTTOM,
                useHtml:false,
                style:{
                    color:'#333333',
                    fontSize:'14px',
                    fontFamily:'Verdana'
                },
                formatter:{
                    identifier: "${CATEGORY}"
                }
            },

            valueLabel:{
                enabled:true,
                useHtml:false,
                backgroundColor:'#F5F5F7',
                style:{
                    color:'#333333',
                    fontSize:'11px',
                    fontFamily:'Verdana'
                },
                formatter:{
                    identifier: "${SERIES}${VALUE}",
                    valueFormat: d3.format('.2')
                }
            },

            needle:'#E5715A',
            hinge:'#656B6D',
            hingeBackgroundColor:'#DCF2F9',
            paneBackgroundColor:'#FCFCFC'
        },

        slot:{
            percentageLabel:{
                enabled:true,
                useHtml:false,
                style:{
                    fontSize:'36px',
                    fontFamily:'Verdana',
                    fontWeight:'bold',
                    textShadow:'0px 2px 0px rgba(0,0,0,0.08)'
                },

                formatter:{
                    identifier: "${PERCENT}",
                    percentFormat: d3.format('.2%')
                }
            },

            valueLabel:{
                enabled:true,
                useHtml:false,
                style:{
                    color:'#666666',
                    fontSize:'14px',
                    fontFamily:'Verdana'
                },
                formatter:{
                    identifier: "${CATEGORY}${VALUE}",
                    valueFormat: d3.format('.2')
                }
            },

            needle:'#ffffff',
            slotBackgroundColor:'#eeeeee'
        },

        thermometer:{

            percentageLabel:{
                enabled:true,

                useHtml:false,

                align:'left',

                style:{
                    color:'#333333',
                    fontSize:'12px',
                    fontFamily:'Verdana',
                    fontWeight:'bold'
                },

                formatter:{
                    identifier: "${PERCENT}",
                    percentFormat: d3.format('.2%')
                }
            },

            valueLabel:{
                enabled:true,

                useHtml:false,

                align:'left',

                style:{
                    color:'#bababa',
                    fontSize:'12px',
                    fontFamily:'Verdana'
                },

                formatter:{
                    identifier: "${CATEGORY}${VALUE}",
                    valueFormat: d3.format('.2')
                }

            },

            needle:'#ffffff',
            slotBackgroundColor:'#eeeeee',
            thermometerLayout:'vertical'
        },

        ring:{

            percentageLabel:{
                enabled:true,

                useHtml:false,

                style:{
                    fontSize:'24px',
                    fontFamily:'Verdana',
                    fontWeight:'bold'
                },

                formatter:{
                    identifier: "${PERCENT}",
                    percentFormat: d3.format('.2%')
                }

            },

            valueLabel:{
                enabled:true,

                useHtml:false,

                style:{
                    color:'#777777',
                    fontSize:'12px',
                    fontFamily:'Verdana'
                },

                formatter:{
                    identifier: "${CATEGORY}${VALUE}",
                    valueFormat: d3.format('.2')
                }
            },

            clockwise:false,
            paneBackgroundColor:'#eeeeee',
            innerPaneBackgroundColor:'#f4f4f4'
        }
    };

    config[Constants.RADAR_CHART] = {

        plotOptions:{
            columnType:false,
            marker:{
                symbol:'null_marker'
            },

            borderWidth:1,

            borderColor:'white',

            lineWidth:1
        },

        xAxis:{
            type:'category',

            step:1,

            position:'bottom',

            showLabel:true,

            formatter:"function(){return arguments[0]}",

            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'9pt'
            }
        },

        yAxis:{
            type:'value',

            step:1,

            position:'left',

            lineWidth:1,

            lineColor:'#cccccc',

            showLabel:true,

            gridLineWidth:1,
            gridLineColor:'#dddddd',

            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'9pt'
            },
            formatter:"function(){return arguments[0]}"
        }

    };

    config[Constants.SCATTER_CHART] = {
        legend:{
            enabled:false
        },

        xAxis:{
            type:'value',
            position:'bottom',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            enableMinorTick:true,
            showLabel:true,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,

            tickPadding:6,
            gridLineWidth:0,
            gridLineColor:'#cccccc',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        },

        yAxis:{
            type:'value',
            position:'left',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            enableMinorTick:false,
            showLabel:true,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,

            tickPadding:6,
            gridLineWidth:1,
            gridLineColor:'#dddddd',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        }

    };

    config[Constants.BUBBLE_CHART] = {
        legend:{
            enabled:false
        },

        xAxis:{
            type:'value',
            position:'bottom',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            enableMinorTick:true,
            showLabel:true,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,

            tickPadding:6,
            gridLineWidth:0,
            gridLineColor:'#cccccc',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        },

        yAxis:{
            type:'value',
            position:'left',

            lineWidth:1,
            lineColor:'#cccccc',
            enableTick:true,
            enableMinorTick:false,
            showLabel:true,

            minorTickColor:'#cccccc',
            minorTickWidth:1,
            minorTickLength:2,

            tickColor:'#cccccc',
            tickWidth:1,
            tickLength:4,

            tickPadding:6,
            gridLineWidth:1,
            gridLineColor:'#dddddd',
            labelStyle:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'16px'
            },
            formatter:"function(){return arguments[0]}"
        }

    };


    return config;
});
/**
 * Created by eason on 15/6/15.
 * 默认主题
 */
define('theme/default',[],function(){

    var config = {
        colors:['#63b2ee','#76da91','#f8cb7f','#f89588','#7cd6cf','#9192ab','#7898e1','#efa666','#eddd86','#9987ce'],

        plotOptions:{

            visible:true,

            dataLabels:{
                enabled:false
            }

        },

        tooltip:{
            enabled:true
        },

        tools:{
            enabled:true,
            "hidden": false
        },

        legend:{
            hiddenColor:'#cccccc',
            hoverColor:'green',
            style:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'14px'
            },
            position:'right'
        },

        rangeLegend:{
            hiddenColor:'#cccccc',
            hoverColor:'green',
            style:{
                color:'#666666',
                fontFamily:'Verdana',
                fontSize:'14px'
            },
            position:'right',
            enabled:false
        },

        backgroundColor:null,
        backgroundImage:null,
        borderColor:  '#CCCCCC',
        borderWidth: 0,
        borderRadius: 0,
        shadow: false,

        plotBackgroundColor:null,
        plotBackgroundImage:null,
        plotBorderColor:  '#CCCCCC',
        plotBorderWidth: 0,
        plotBorderRadius: 0,
        plotShadow: false
    };

    return config;
});
/**
 * Created by eason on 15/6/17.
 */
define('VanChart',['require','./utils/BaseUtils','./utils/QueryUtils','./ComponentLibrary','./ChartLibrary','./Constants','./render/RenderFactory','./Handler','./component/Series','./component/Title','./component/Axis','./component/CategoryAxis','./component/ValueAxis','./component/DateAxis','./component/Legend','./component/Tooltip','./component/Toolbar','./component/ZoomBar','./component/DataSheet','./component/RangeLegend','./theme/config','./theme/default'],function(require){

    var BaseUtils = require('./utils/BaseUtils');
    var QueryUtils = require('./utils/QueryUtils');

    var ComponentLibrary = require('./ComponentLibrary');
    var ChartLibrary = require('./ChartLibrary');
    var Constants = require('./Constants');
    var RenderFactory = require('./render/RenderFactory');
    var Handler = require('./Handler');
    var Series = require('./component/Series');

    var COMPONENTS = [Constants.TITLE_COMPONENT, Constants.TOOLBAR_COMPONENT, Constants.LEGEND_COMPONENT
        ,Constants.RANGE_LEGEND_COMPONENT,Constants.Y_AXIS_COMPONENT, Constants.X_AXIS_COMPONENT,
        Constants.ZOOM_COMPONENT, Constants.DATA_SHEET_COMPONENT,Constants.TOOLTIP_COMPONENT
    ];

    var PADDING = 5;

    //默认加载所有组件
    require('./component/Title');
    require('./component/Axis');
    require('./component/CategoryAxis');
    require('./component/ValueAxis');
    require('./component/DateAxis');
    require('./component/Legend');
    require('./component/Tooltip');
    require('./component/Toolbar');
    require('./component/ZoomBar');
    require('./component/DataSheet');
    require('./component/RangeLegend');

    function VanChart(option, dom, vancharts){

        option.state = Constants.STATE_INIT;

        this.ID_PREFIX = dom.getAttribute(Constants.INSTANCES_KEY) + vancharts.charts.length;
        this.dom = dom;
        this.dom.style.cssText += '-ms-user-select:none;-webkit-user-select:none;-moz-user-select:none;-o-user-select:none;user-select:none;';
        this.dom.onselectstart = this.dom.ondrag = function(){
            return false;
        };
        this.vancharts = vancharts;

        this.handler = new Handler(this);
        this.render = RenderFactory.getRender(Constants.VANCHART, this);

        //组件
        this.width = this._getDomWidth();
        this.height = this._getDomHeight();

        this.components = {};
        this.charts = {};

        //这两个变量不应该出现在这里
        this.series = [];

        this.refresh(option);
    }

    VanChart.prototype = {
        constructor:VanChart,

        componentType:Constants.VANCHART,

        //外部调用接口，传入新的配置
        refresh:function(option){
            this._init(option);

            this._refreshOptions();
        },

        refreshRestore:function(){

            this.currentOption = BaseUtils.clone(this.restoreOption);

            this.currentOption.state = Constants.STATE_RESTORE_REFRESH;

            this._refreshOptions();

        },

        isInitOrRestoreState: function () {
            return this.currentOption.state == Constants.STATE_INIT || this.currentOption.state == Constants.STATE_RESTORE_REFRESH;
        },

        isChangeDataState: function () {
            return this.currentOption.state == Constants.STATE_CHANGE_DATA_REFRESH;
        },

        isZoomRefreshState: function () {
            return this.currentOption.state == Constants.STATE_ZOOM_REFRESH;
        },

        dealAxisZoom:function(downPos, upPos){
            var bubble = this.getChart(Constants.BUBBLE_CHART);

            if(bubble && bubble.isForceBubble()){

                var isUpdateWithForce = bubble.isUpdateWithForce();

                if(isUpdateWithForce){
                    bubble.render.force.stop();
                }

                var plotBounds = this.getPlotBounds();

                var minX = Math.min(downPos[0], upPos[0]) - plotBounds.x;
                var minY = Math.min(downPos[1], upPos[1]) - plotBounds.y;

                var detX = Math.abs(downPos[0] - upPos[0]);
                var detY = Math.abs(downPos[1] - upPos[1]);

                var scale = Math.min(plotBounds.width/detX, plotBounds.height/detY);

                var wWidth = plotBounds.width / scale;
                var wHeight = plotBounds.height / scale;

                var shiftX = (plotBounds.width - wWidth)/2 - minX;
                var shiftY = (plotBounds.height - wHeight)/2 - minY;

                var series = bubble.getVisibleChartData();

                series.forEach(function(sery){

                    sery.points.forEach(function(point){

                        point.radius *= scale;

                        var x = point.x + shiftX;
                        var y = point.y + shiftY;

                        x -= plotBounds.width/2;
                        y -= plotBounds.height/2;

                        point.x = x * scale + plotBounds.width/2 - shiftX;
                        point.y = y * scale + plotBounds.height/2 - shiftY;

                        if(!isUpdateWithForce){
                            point.posX = point.x;
                            point.posY = point.y;
                        }

                        if(point.labelContent && point.labelDim){

                            var radius = point.radius;
                            if((point.labelDim.width > 2 * radius) || (point.labelDim.height > 2 * radius)){
                                point.labelPos = null;
                            }else{

                                point.labelPos = {
                                    x:-point.labelDim.width/2 + (isUpdateWithForce ? 0 : point.posX),
                                    y:-point.labelDim.height/2 + (isUpdateWithForce ? 0 : point.posY)
                                }
                            }
                        }
                    })
                });


                bubble.render.scaleRender();

            }else{
                this.currentOption.state = Constants.STATE_ZOOM_REFRESH;
                var zoomType = this.currentOption.zoom.zoomType;

                if(this.components.xAxis && zoomType.indexOf('x') != -1){
                    this.components.xAxis.axisZoom(downPos, upPos);
                }

                if(this.components.yAxis && zoomType.indexOf('y') != -1){
                    this.components.yAxis.axisZoom(downPos, upPos);
                }

                this.layoutComponentsAndCharts();
            }
        },

        refreshIncreaseOrder:function(){

            this.currentOption.orderType = Constants.ASCENDING;

            for(var chart in this.charts){
                this.charts[chart].orderData();
            }

            this.layoutComponentsAndCharts();
        },

        refreshDecreaseOrder:function(){

            this.currentOption.orderType = Constants.DESCENDING;

            for(var chart in this.charts){
                this.charts[chart].orderData();
            }

            this.layoutComponentsAndCharts();
        },

        //走这边的话要重画缩放控件
        _refreshOptions:function(){

            this.series = [];//置空

            var option = this.currentOption;

            //先构建组件的对象,主要是构建坐标轴
            var ComponentClass, componentType, component;
            for(var i = 0; i < COMPONENTS.length; i++){
                componentType = COMPONENTS[i];
                component = this.components[componentType];
                if(option[componentType]){
                    if(component){
                        component.refresh(option);
                    }else if(this._isComponentEnabled(option[componentType])){
                        //新建component
                        ComponentClass  = ComponentLibrary.get(
                            /Axis/.test(componentType) ? Constants.AXIS_COMPONENT : componentType);
                        component = new ComponentClass(this, option, componentType);
                        this.components[componentType] = component;
                    }
                }else if(component){
                    component.remove();
                    this.components[componentType] = null;
                    delete this.components[componentType];
                }
            }

            //先确定构成图的种类
            var chartType = option.chartType || Constants.LINE_CHART;
            var ChartClass;
            for(var i = 0, len = option.series.length; i < len; i++){
                var sery = option.series[i];
                var seryChartType = sery.type || chartType;
                ChartClass = ChartLibrary.get(seryChartType);
                if(ChartClass){
                    var chart = this.charts[seryChartType];

                    if(chart){
                        chart.refresh(option)
                    }else{
                        chart = new ChartClass(this, option, seryChartType);
                        this.charts[seryChartType] = chart;
                    }

                    this.series.push(new Series(chart, sery, i));
                }
            }

            this.bounds = BaseUtils.makeBounds(PADDING, PADDING, this.width - 2 * PADDING, this.height - 2 * PADDING);

            var zoom = this.components[Constants.ZOOM_COMPONENT];
            if(zoom){
                zoom.doLayout();
                zoom.remove();
            }

            this.plotBounds = this.bounds;

            this.refreshComponentsAndSeries();
        },

        refreshComponentsAndSeries:function(){

            for(var component in this.components){
                this.components[component].initAttributesWithSeries();
            }

            this.layoutComponentsAndCharts()
        },


        layoutComponentsAndCharts:function(){

            this.bounds = BaseUtils.clone(this.plotBounds);

            for(var component in this.components){
                if(component != Constants.ZOOM_COMPONENT){
                    this.components[component].doLayout();
                }
            }


            //坐标轴,数据表,缩放控件要根据绘图区的区域来确定边界
            var components = this.components;
            [Constants.Y_AXIS_COMPONENT, Constants.X_AXIS_COMPONENT, Constants.ZOOM_COMPONENT, Constants.DATA_SHEET_COMPONENT]
                .forEach(function(cName){

                    var component = components[cName];

                    if(component){
                        component.fixBoundsByPlot();
                    }
                });

            //处理0值对齐的坐标轴的位置
            [Constants.Y_AXIS_COMPONENT, Constants.X_AXIS_COMPONENT]
                .forEach(function(cName){
                    var component = components[cName];
                    if(component){
                        component.dealOnZero();
                    }
                });

            for(var chart in this.charts){
                this.charts[chart].doLayout();
            }

            this.render.render();
        },

        _init:function(option){

            option.series = (option.series && option.series.length) ? option.series : [{}];//保证series不为空

            option.series.forEach(function(sery){
                sery.data = sery.data || [];
            });

            //坐标轴可能是数组
            this.themeConfig = this._normalizeOption(this._mergeThemeConfig(option), option);

            this.restoreOption = QueryUtils.merge(BaseUtils.clone(option), this.themeConfig, false);

            //处理
            if(this.restoreOption.plotOptions.columnType && this.restoreOption.chartType == Constants.RADAR_CHART){
                this.restoreOption.series.forEach(function(sery){
                    sery.stack = Constants.RADAR_CHART;
                })
            }

            if(this.restoreOption.chartType == Constants.SCATTER_CHART
                || this.restoreOption.chartType == Constants.BUBBLE_CHART){

                var sort = this.restoreOption.tools.sort || {};
                sort.enabled = false;
            }

            this.currentOption = BaseUtils.clone(this.restoreOption);
        },

        renderOnlyCharts:function() {

            var bubble = this.getChart(Constants.BUBBLE_CHART);
            if(bubble && bubble.isUpdateWithForce()) {
                bubble.render.force.stop();
            }

            for(var chart in this.charts){
                this.charts[chart].doLayout();
            }

            var charts = this.getChartRenders();
            charts.forEach(function(render){
                render.filterRender();
            });

            if(!BaseUtils.isSupportSVG()){
                var components = this.components;

                COMPONENTS.forEach(function(type){
                    if(components[type]){
                        var component = components[type];
                        if(component.isFloat){
                            var render = component.getRender();
                            if(render){
                                render.render();
                            }
                        }
                    }
                });
            }
        },

        _getDomWidth:function(){
            var root = this.dom;
            var stl = root.currentStyle || document.defaultView.getComputedStyle(root);
            return ((root.clientWidth || parseInt(stl.width, 10)) - parseInt(stl.paddingLeft, 10) - parseInt(stl.paddingRight, 10)).toFixed(0) - 0;
        },

        _getDomHeight:function(){
            var root = this.dom;
            var stl = root.currentStyle || document.defaultView.getComputedStyle(root);
            return ((root.clientHeight || parseInt(stl.height, 10)) - parseInt(stl.paddingTop, 10) - parseInt(stl.paddingBottom, 10)).toFixed(0) - 0;
        },

        _normalizeOption:function(themeConfig, option){

            themeConfig = BaseUtils.clone(themeConfig);

            if(option.xAxis){

                if(!BaseUtils.isArray(option.xAxis)){
                    option.xAxis = [option.xAxis];
                }

                var result = [];
                for(var i = 0, len = option.xAxis.length; i < len; i++){
                    result.push(BaseUtils.clone(themeConfig.xAxis))
                }
                themeConfig.xAxis = result;
            }else{
                option.xAxis = themeConfig.xAxis;
            }

            if(option.yAxis){

                if(!BaseUtils.isArray(option.yAxis)){
                    option.yAxis = [option.yAxis];
                }

                var result = [];
                for(var i = 0, len = option.yAxis.length; i < len; i++){
                    result.push(BaseUtils.clone(themeConfig.yAxis))
                }
                themeConfig.yAxis = result;

            }else{
                option.yAxis = themeConfig.yAxis;
            }

            return themeConfig;

        },

        //默认配置，主题配置的组合
        _mergeThemeConfig:function(option){
            var defaultConfig = require('./theme/config');
            var themeConfig = require('./theme/default');

            var chartTypes = [];
            if(option.chartType)
                chartTypes.push(option.chartType);

            for(var i = 0, len = option.series.length; i < len; i++){
                var type = option.series[i].type;
                if(type){
                    chartTypes.push(option.series[i].type);
                }
            }

            var result = {};

            for(var i = 0, len = chartTypes.length; i < len; i++){
                QueryUtils.merge(result, defaultConfig[chartTypes[i]], true);
            }

            QueryUtils.merge(result, themeConfig, true);

            return result;
        },

        _isComponentEnabled:function(componentOption){
            if(BaseUtils.hasDefined(componentOption.enabled)){
                return componentOption.enabled;
            }
            return true;
        },

        getPlotBackgroundOption:function(){
            var option = this.currentOption;
            return {
                color:option.plotBackgroundColor,
                image:option.plotBackgroundImage,
                borderColor:option.plotBorderColor,
                borderWidth:option.plotBorderWidth,
                borderRadius:option.plotBorderRadius,
                plotShadow:option.plotShadow
            }
        },

        getChartBackgroundOption:function(){
            var option = this.currentOption;

            return {
                color:option.backgroundColor,
                image:option.backgroundImage,
                borderColor:option.borderColor,
                borderWidth:option.borderWidth,
                borderRadius:option.borderRadius,
                chartShadow:option.shadow
            }

        },

        getTrendLineOption:function(){

            var trendLines = [];
            var series = this.series;

            for(var i = 0, len = series.length; i < len; i++){
                var sery = series[i];

                var trendLine = sery.trendLine;

                //堆积的系列用趋势线没意义吧
                if(!trendLine || !sery.visible){
                    continue;
                }

                var XY = sery.chart.getTrendLineXYValues(sery);
                var xValues = XY[0];
                var yValues = XY[1];
                var location = XY[2];

                if(xValues.length <= 1){
                    continue;
                }

                var x1,x2,y1,y2;

                if(location == Constants.TOP || location == Constants.BOTTOM){
                    var leastSquaresCoeff = this._leastSquares(XY[0], XY[1]);

                    x1 = xValues[0];
                    y1 = leastSquaresCoeff[0] * x1 + leastSquaresCoeff[1];
                    x2 = xValues[xValues.length - 1];
                    y2 = leastSquaresCoeff[0] * x2 + leastSquaresCoeff[1];
                }else{

                    var leastSquaresCoeff = this._leastSquares(XY[1], XY[0]);

                    y1 = yValues[0];
                    x1 = leastSquaresCoeff[0] * y1 + leastSquaresCoeff[1];
                    y2 = yValues[yValues.length - 1];
                    x2 = leastSquaresCoeff[0] * y2 + leastSquaresCoeff[1];
                }

                trendLines.push({
                    x1:x1,
                    y1:y1,
                    x2:x2,
                    y2:y2,
                    trendLine:trendLine
                })
            }

            return trendLines;
        },

        _leastSquares:function(xValues, yValues){
            var reduceSumFunc = function(prev, cur) { return prev + cur; };

            var xBar = xValues.reduce(reduceSumFunc) * 1.0 / xValues.length;
            var yBar = yValues.reduce(reduceSumFunc) * 1.0 / yValues.length;

            var ssXX = xValues.map(function(d) { return Math.pow(d - xBar, 2); })
                .reduce(reduceSumFunc);

            var ssYY = yValues.map(function(d) { return Math.pow(d - yBar, 2); })
                .reduce(reduceSumFunc);

            var ssXY = xValues.map(function(d, i) { return (d - xBar) * (yValues[i] - yBar); })
                .reduce(reduceSumFunc);

            var slope = ssXY / ssXX;
            var intercept = yBar - (xBar * slope);

            return [slope, intercept];
        },

        getParentDom:function(){
            return this.dom;
        },

        chartWidth:function(){
            return this.width;
        },

        chartHeight:function(){
            return this.height;
        },

        setPlotBounds:function(newBounds){
            this.bounds = newBounds;
        },

        getPlotClipBounds:function(){

            var x = 0;
            var y = 0;
            var width = this.bounds.width;
            var height = this.bounds.height;

            var locationMap = {};
            var all = [];
            if(this.components.xAxis){
                all = all.concat(this.components.xAxis.getAllAxis());
            }

            if(this.components.yAxis){
                all = all.concat(this.components.yAxis.getAllAxis());
            }

            all.forEach(function(axis){
                var position = axis.getPosition();
                if(!axis.isOnZero() && !locationMap[position]){
                    locationMap[position] = axis.getLineWidth();
                }
            });

            y = locationMap[Constants.TOP] ? Math.ceil(locationMap[Constants.TOP]/2) : 0;
            height -= y;
            height = locationMap[Constants.BOTTOM] ? height - Math.ceil(locationMap[Constants.BOTTOM]/2 - 0.5) : height;

            x = locationMap[Constants.LEFT] ? Math.ceil(locationMap[Constants.LEFT]/2) : 0;
            width -= x;
            width = locationMap[Constants.RIGHT] ? width - Math.ceil(locationMap[Constants.RIGHT]/2) : width;

            return {
                x:x,
                y:y,
                width:width,
                height:height
            };

        },

        getPlotBounds:function(){
            return this.bounds;
        },

        getChartBounds:function(){
            return BaseUtils.makeBounds(0, 0, this.width, this.height);
        },

        xAxis:function(axisIndex){
            if(!axisIndex){
                axisIndex = 0;
            }
            var axis = this.components.xAxis;
            return axis ? axis.getAxis(axisIndex) : null;
        },

        yAxis:function(axisIndex){
            if(!axisIndex){
                axisIndex = 0;
            }
            var axis = this.components.yAxis;
            return axis ? axis.getAxis(axisIndex) : null;
        },

        getRender:function(){
            return this.render;
        },

        getChartRenders:function(){

            var chartArray = BaseUtils.objectToArray(this.charts);

            var order = {
                'area':0,
                'column':1,
                'line':2
            };

            chartArray.sort(function(a, b){

                var valueA = order[a.componentType];
                var valueB = order[b.componentType];
                valueA = BaseUtils.hasDefined(valueA) ? valueA : 3;
                valueB = BaseUtils.hasDefined(valueB) ? valueB : 3;

                return valueA - valueB;
            });

            var renders = [];
            chartArray.forEach(function(chart){
                var render = chart.getRender();
                if(render){
                    renders.push(render);
                }
            });

            return renders;
        },

        getComponentRenders:function(){
            var renders = [];

            var components = this.components;

            COMPONENTS.forEach(function(type){
                if(components[type]){
                    var render = components[type].getRender();
                    if(render){
                        renders.push(render);
                    }
                }
            });

            return renders;
        },

        getFixedComponentRenders:function(){

            var renders = [];
            var components = this.components;

            COMPONENTS.forEach(function(type){
                if(components[type]){
                    var component = components[type];
                    if(!component.isFloat){
                        var render = component.getRender();
                        if(render){
                            renders.push(render)
                        }
                    }

                }
            });

            return renders;
        },

        getFloatComponentRenders:function(){
            var renders = [];
            var components = this.components;

            COMPONENTS.forEach(function(type){
                if(components[type]){
                    var component = components[type];
                    if(component.isFloat){
                        var render = component.getRender();
                        if(render){
                            renders.push(render)
                        }
                    }
                }
            });

            return renders;
        },

        getToolbarWidth:function(){
            if(this.components[Constants.TOOLBAR_COMPONENT]){
                return this.components[Constants.TOOLBAR_COMPONENT].getToolbarWidth();
            }
            return 0;
        },

        //没有标题，并且图例在右上方的时候把工具栏的高度空出来
        getToolbarHeight:function(){
            var title = this.components[Constants.TITLE_COMPONENT];
            if(this.components[Constants.TOOLBAR_COMPONENT] && (!title || title.isFloat) ){
                return this.components[Constants.TOOLBAR_COMPONENT].getToolbarHeight();
            }
            return 0;
        },

        getComponent:function(type){
            return this.components[type];
        },

        getChart:function(type){
            return this.charts[type];
        },

        getIDPrefix:function(){
            return this.ID_PREFIX;
        },

        getBodyClipID:function(){
            return 'bodyClip' + this.getIDPrefix();
        },

        getOptions:function(){
            return this.currentOption;
        },

        remove:function(){
            this.render.remove();

            if(this.components[Constants.TOOLTIP_COMPONENT]){
                this.components[Constants.TOOLTIP_COMPONENT].remove();
            }
        }
    };

    return VanChart;
});
/**
 * Created by eason on 15/5/15.
 * 管里当前产生的所有
 */
define('VanCharts',['require','./utils/BaseUtils','./Constants','./VanChart'],function(require){

    var BaseUtils = require('./utils/BaseUtils');
    var Constants = require('./Constants');
    var VanChart = require('./VanChart');

    var _baseIndex = 0;

    var _instances = Object.create(null);

    function init(dom){
        var instanceKey = dom.getAttribute(Constants.INSTANCES_KEY);
        if(!instanceKey){
            instanceKey = Constants.INSTANCES_KEY + _baseIndex++;
            dom.setAttribute(Constants.INSTANCES_KEY, instanceKey);
        }

        if(_instances[instanceKey]){
            //key对应的实例已经存在的话先删掉
            var svgRoot = _instances[instanceKey].svgRoot;
            if(svgRoot){
                svgRoot.remove();
            }
        }else{
            var vanCharts = new VanCharts(dom);
            _instances[instanceKey] = vanCharts;
        }

        return _instances[instanceKey];
    }

    function VanCharts(dom){
        this.dom = dom;
        this.charts = [];
    }

    VanCharts.prototype = {
        constructor:VanCharts,

        setOptions:function(options){
            if(!BaseUtils.isArray(options)){
                options = [options];
            }
            this.options = options;

            for(var i = 0, len = options.length; i < len; i++){
                this.charts.push(new VanChart(options[i], this.dom, this));
            }
        },

        resize:function(options){

            this.clear();

            this.charts = [];

            options = options || this.options;
            this.options = options;

            this.setOptions(options);
        },

        setData:function(options){

            if(BaseUtils.isSupportSVG()){
                this.charts.forEach(function(chart){
                    options.state = Constants.STATE_CHANGE_DATA_REFRESH;
                    chart.refresh(options);
                });
            }else{
                this.resize(options);
            }
        },

        clear:function(){

            for(var i = 0, len = this.charts.length; i < len; i++){
                this.charts[i].remove();
                this.charts[i] = null;
            }
        }
    };

    return {
        init:init
    };
});
/**
 * Created by eason on 15/5/4.
 * 一些最常用的工具方法
 */
define('utils/BaseUtils',['require','./ColorUtils','../Constants','VanCharts'],function(require){

    var ColorUtils = require('./ColorUtils');
    var Constants = require('../Constants');

    var styleToCss = {
        color:'fill',
        font:'font',
        fontFamily:'font-family',
        fontSize:'font-size',
        fontStretch:'font-stretch',
        fontStyle:'font-style',
        fontVariant:'font-variant',
        fontWeight:'font-weight',
        letterSpacing:'letter-spacing',
        lineHeight:'line-height',
        quotes:'quotes',
        textAlign:'text-align',
        textDecoration:'text-decoration',
        textIndent:'text-indent',
        textShadow:'text-shadow',
        textTransform:'text-transform',
        whiteSpace:'white-space',
        wordSpacing:'word-spacing',
        padding:'padding'
    };

    /**
     * 构造两个function的继承
     * @param clazz 源类
     * @param baseClazz 基类
     */
    function inherit(clazz, baseClazz){
        var clazzPrototype = clazz.prototype;

        function TMP() {}
        TMP.prototype = baseClazz.prototype;
        clazz.prototype = new TMP();

        for (var prop in clazzPrototype) {
            clazz.prototype[prop] = clazzPrototype[prop];
        }
        clazz.constructor = clazz;
    }

    /**
     * pick参数里第一个不为null和undefined的值
     * @returns {*}
     */
    function pick(){
        var arg, length = arguments.length;
        for (var i = 0; i < length; i++) {
            arg = arguments[i];
            if (typeof arg !== 'undefined' && arg !== null) {
                return arg;
            }
        }
        return null;
    }

    /**
     * 判断对象是否是数组
     * @param value 对象
     * @returns {boolean} 是否是数组
     */
    function isArray(value){
        return Object.prototype.toString.apply(value) === '[object Array]';
    }

    /**
     * 将具有length属性的对象转成数组
     * @param sequence 对象
     */
    function toArray(sequence){
        return Array.prototype.slice.call(sequence);
    }

    function setTextStyle(textS, style){
        style = cssNormalization(style);
        for(var attr in style){
            textS.style(attr, style[attr]);
        }
    }

    /**
     * 返回字体是fontSize(有单位，px,em)
     * @param fontSize
     */
    function getTextDimension(text, style, useHtml){
        text = pick(text, "");
        var div = document.createElement("div");
        document.body.appendChild(div);

        div.style.visibility = "hidden";
        div.style.whiteSpace = "nowrap";
        div.style.position = 'absolute';

        var fontSize = '12px';

        for(var property in style){
            if(typeof(style[property]) != "function" && property != 'color'){
                div.style[property] = style[property];
            }

            if(property == 'fontSize'){
                fontSize = style[property];
            }
        }

        if(fontSize.indexOf('pt') != -1){
            fontSize = parseFloat(fontSize) * 4 / 3;
        }else{
            fontSize = parseFloat(fontSize);
        }

        div.innerHTML = text;
        //fireFox下面innerText的话offsetWidth为0
        //useHtml ? span.innerHTML = text : span.innerText = text;
        var width = div.offsetWidth || 0;
        var height = div.offsetHeight || 0;

        document.body.removeChild(div);

        return {width:width, height:height};
    }

    function getTextHeight(style){

        var fontSize = style.fontSize || '12px';

        return fontSize.indexOf('pt') != -1 ? parseFloat(fontSize) * 4 / 3 : parseFloat(fontSize);
    }


    function splitText(text, style, offeredSize, padding){

        if(!text){
            return '';
        }

        text += '';

        padding = padding || 0;

        offeredSize -= 2*padding;

        var result = [];

        var startIndex = 0;
        var textCount = text.length;

        while(startIndex < textCount){
            var i = startIndex;
            while(getTextDimension(text.substring(i, startIndex + 1), style, false).width < offeredSize){
                startIndex++;
                if(startIndex >= textCount){
                    break;
                }
            }

            if(i == startIndex){
                //这里的情况是一个字符都放不下
                return [];
            }else{
                result.push(text.substring(i, startIndex));
            }

        }

        return result;
    }

    function getTextDimensionWithRotation(text, style, useHtml, rotation){

        var dim = getTextDimension(text, style, useHtml);
        var angle = Math.abs(toRadian(rotation || 0));

        var width = dim.width * Math.cos(angle) + dim.height * Math.sin(angle);
        var height = dim.width * Math.sin(angle) + dim.height * Math.cos(angle);

        return {
            width:width,
            height:height
        }

    }

    function clone(source) {
        if (typeof source == 'object' && source !== null) {
            var result = source;
            if (isArray(source)) {
                result = [];
                for (var i = 0, len = source.length; i < len; i++) {
                    result[i] = clone(source[i]);
                }
            }else{
                result = {};
                for (var key in source) {
                    if (source.hasOwnProperty(key)) {
                        result[key] = clone(source[key]);
                    }
                }
            }
            return result;
        }

        return source;
    }

    //style对象的表示方法转css表示
    function cssNormalization(style){
        var result = {};
        for(var attr in style){
            if(styleToCss[attr]){
                result[styleToCss[attr]] = style[attr];
            }

            if(attr == 'color'){
                result.color = style[attr];
            }

            //转px
            if(attr == 'fontSize'){
                var fontSize = style[attr];
                if(fontSize.indexOf('pt') != -1){
                    fontSize = parseFloat(fontSize) * 4 / 3;
                    result['font-size'] = fontSize + 'px';
                }
            }
        }
        return result;
    }

    /**
     * css类属性数组补全，如padding，margin等~
     */
    function reformCssArray(p) {
        if (p instanceof Array) {
            switch (p.length + '') {
                case '4':
                    return p;
                case '3':
                    return [p[0], p[1], p[2], p[1]];
                case '2':
                    return [p[0], p[1], p[0], p[1]];
                case '1':
                    return [p[0], p[0], p[0], p[0]];
                case '0':
                    return [0, 0, 0, 0];
            }
        }
        else {
            return [p, p, p, p];
        }
    }

    function lineSubPixelOpt(xOry, lineWidth){
        return lineWidth % 2 == 0 ? Math.round(xOry) : Math.round(xOry - 0.5) + 0.5;
    }

    function rectSubPixelOpt(x,y,width,height,lineWidth){
        lineWidth = lineWidth || 0;
        x = lineSubPixelOpt(x, lineWidth);
        y = lineSubPixelOpt(y, lineWidth);
        width = Math.round(width);
        height = Math.round(height);
        return {x:x, y:y, width:width, height:height};
    }

    function addArray(targetArray, sourceArray){

        var result = [];

        if(targetArray && targetArray.length){
            for(var i = 0, len = targetArray.length; i < len; i++){
                result.push(targetArray[i]);
            }
        }

        if(sourceArray && sourceArray.length){
            for(var i = 0, len = sourceArray.length; i < len; i++){
                result.push(sourceArray[i]);
            }
        }

        return result;
    }

    function toFront(el){
        if(el && el.parentNode){
            el.parentNode.appendChild(el);
        }
    }

    function toBack(el){
        if(el && el.parentNode){
            el.parentNode.insertBefore(el,el.parentNode.firstChild);
        }
    }

    function toFrontOfAll(el){
        el.ownerSVGElement.appendChild(el);
    }

    function toBackOfAll(el){
        el.ownerSVGElement.appendChild(el,el.ownerSVGElement.firstChild);
    }

    //一定是在同一个坐标原点下
    function containsRect(biggerOne, smallOne){

        return biggerOne.x <= smallOne.x
                    && biggerOne.y <= smallOne.y
                    && biggerOne.x + biggerOne.width >= smallOne.x + smallOne.width
                    && biggerOne.y + biggerOne.height >= smallOne.y + smallOne.height;

    }

    function rectangleOverlapped(aBounds, bBounds){
        if (!aBounds|| !bBounds) {
            return false;
        }
        var minx = Math.max(aBounds.x, bBounds.x);
        var miny = Math.max(aBounds.y, bBounds.y);
        var maxx = Math.min(aBounds.x + aBounds.width, bBounds.x + bBounds.width);
        var maxy = Math.min(aBounds.y + aBounds.height, bBounds.y + bBounds.height);
        return (minx <= maxx && miny <= maxy);
    }

    function outsideRect(biggerOne, smallOne){

        return !containsRect(biggerOne, smallOne) && !rectangleOverlapped(biggerOne, smallOne);

    }

    function containsPoint(rect, point){
        var x = pick(point.x || point[0]);

        var y = pick(point.y || point[1]);

        return rect.x < x && rect.x + rect.width > x
                && rect.y < y && rect.y + rect.height > y;
    }

    function isSupportSVG(){
        return !!(window.SVGSVGElement);
    }

    function makeValueInRange(min, max, value){

        var rMin = Math.min(min, max);
        var rMax = Math.max(min, max);
        var gap = rMax - rMin;

        while(value < rMin){
            value += gap;
        }

        while(value > rMax){
            value -= gap;
        }

        return value;
    }

    function getValueInDomain(value, domain){

        return Math.min(Math.max(value, domain[0]), domain[1]);

    }

    function toRadian(degree){
        return Math.PI * (degree / 180);
    }

    function toDegree(radian){
        return radian * 180 / Math.PI;
    }

    //设计器那边传过来的formatter函数是字符串
    function getFormatterFunction(formatter){

        if(formatter == null || formatter == undefined){
            return null;
        }

        if(typeof formatter == 'string'){
            return (new Function("return "+ formatter))()
        }

        return formatter;
    }

    function clone(obj) {
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;

        // Handle Date
        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle Array
        if (obj instanceof Array) {
            var copy = [];
            for (var i = 0, len = obj.length; i < len; ++i) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        if(obj instanceof String){
            return new String(obj);
        }

        // Handle Object
        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }
    }

    function isEmpty(value){
        var result = value === "" || value === null || value === undefined;
        return result;
    }

    function isNull(v){
        return v == undefined || v == null
    }

    function showLightBox(options){

        var VanCharts = require('VanCharts');

        var body = document.getElementsByTagName("body")[0];

        var boxDiv = document.createElement('div');
        boxDiv.style.position = 'fixed';
        boxDiv.style.display = 'inline';
        boxDiv.style.top = '0px';
        boxDiv.style.left = '0px';
        boxDiv.style.width = '100%';
        boxDiv.style.height = '100%';
        boxDiv.style.zIndex = 330;
        if(isSupportSVG()){
            boxDiv.style.background = 'rgba(0,0,0,0.3)';
        }else{
            boxDiv.style.backgroundColor = 'black';
            boxDiv.style.filter = 'alpha(opacity=30)'
        }

        body.appendChild(boxDiv);

        var myWidth = boxDiv.clientWidth;
        var myHeight = boxDiv.clientHeight;

        var width = 970;
        var height = 600;

        var left = (myWidth - 970) / 2;
        var top = (myHeight - 600) / 2;


        var container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.display = 'inline';
        container.style.top = top + 'px';
        container.style.left = left + 'px';
        container.style.width = width + 'px';
        container.style.height = height + 'px';

        if(isSupportSVG()){
            container.style.background = 'white';
            container.style.boxShadow = '0px 4px 50px rgba(0,0,0,0.5)';
        }else{
            container.style.backgroundColor = 'white';
            boxDiv.style.filter = 'alpha(opacity=100)';
        }

        boxDiv.appendChild(container);

        boxDiv.onclick = function(e){
            body.removeChild(boxDiv);
        };

        container.onclick = function(e){
            e = e || window.event;
            if (e.stopPropagation){
                e.stopPropagation();
            }else{
                e.cancelBubble = true
            };
        }

        var vanCharts = VanCharts.init(container);
        var newOptions = clone(options);

        newOptions.tools.exitFullScreen = newOptions.tools.fullScreen;
        newOptions.tools.fullScreen = null;

        vanCharts.setOptions(newOptions);
    }

    function hideLightBox(container){
        var parent = container.parentNode;

        if(parent.parentNode){
            parent.parentNode.removeChild(parent);
        }

    }

    function isIE() { //ie?
        if (!!window.ActiveXObject || "ActiveXObject" in window)
            return true;
        else
            return false;
    }

    function hasNotDefined(value){
        return value == null || value == undefined;
    }

    function hasDefined(value){
        return !hasNotDefined(value);
    }

    function indexInArray(array, value){
        if(!array.length){
            return -1;
        }

        for(var i = 0, len = array.length; i < len; i++){
            if(array[i] == value){
                return i;
            }
        }

        return -1;
    }

    function makeBounds(){

        var x = 0, y = 0, width = 0, height = 0;

        if(arguments.length == 2){

            var pos = arguments[0];
            var dim = arguments[1];

            x = pick(pos.x, pos[0]);
            y = pick(pos.y, pos[1]);

            width = pick(dim.width, dim[0]);
            height = pick(dim.height, dim[1]);

        }else if(arguments.length == 4){

            x = arguments[0];
            y = arguments[1];

            width = arguments[2];
            height = arguments[3];
        }

        return {
            x:x,
            y:y,
            width:width,
            height:height
        };

    }

    function distance(p1, p2){
        var x1 = pick(p1.x, p1[0]);
        var y1 = pick(p1.y, p1[1]);

        var x2 = pick(p2.x, p2[0]);
        var y2 = pick(p2.y, p2[1]);

        var detX = x1 - x2;
        var detY = y1 - y2;

        return Math.sqrt(detX * detX + detY * detY);
    }

    function isEmptyBounds(bounds){
        return bounds.width <= 0 || bounds.height <= 0;
    }

    function log(logBase, value){
        return Math.log(value) / Math.log(logBase);
    }

    function accAdd(arg1, arg2) {
        var r1 = 0;
        var r2 = 0;
        try {
            r1 = arg1.toString().split('.')[1].length;
        }
        catch(e) {}
        try {
            r2 = arg2.toString().split('.')[1].length;
        }
        catch(e) {}

        var m = Math.pow(10, Math.max(r1, r2));
        return (Math.round(arg1 * m) + Math.round(arg2 * m)) / m;
    }

    function accDiv(arg1,arg2){
        var s1 = arg1.toString();
        var s2 = arg2.toString();
        var m = 0;
        try {
            m = s2.split('.')[1].length;
        }
        catch(e) {}
        try {
            m -= s1.split('.')[1].length;
        }
        catch(e) {}

        return (s1.replace('.', '') - 0) / (s2.replace('.', '') - 0) * Math.pow(10, m);
    }

    function accMul(arg1,arg2) { 

        var m = 0, s1 = arg1.toString(), s2 = arg2.toString(); 

        try{ 
            m += s1.split(".")[1].length 
        } 
        catch(e){} 
        try{ 
            m += s2.split(".")[1].length 
        } 
        catch(e){}  
        return Number(s1.replace(".",""))*Number(s2.replace(".",""))/Math.pow(10,m) ;
    }


    function objectToArray(object){
        var result = [];
        for(var key in object){
            result.push(object[key]);
        }
        return result;
    }

    function date2int(date){

        if(typeof date == 'string'){
            date = new Date(Date.parse(date.replace(/-|\./g, "/")));
        }

        var baseDate = new Date("1970/01/01");

        if(typeof date == typeof(0)){
            return date;
        }else{
            return date.getTime() - baseDate.getTime();
        }

    }

    function int2date(milliseconds){

        var baseDate = new Date("1970/01/01");

        milliseconds = milliseconds || 0;

        return new Date(milliseconds + baseDate.getTime());
    }

    function object2date(obj){

        var date = obj;

        if(typeof date == 'string'){
            date = new Date(Date.parse(date.replace(/-|\./g, "/")));
        }else if(typeof date == typeof(0)){
            date = new Date(date)
        }

        return date;
    }

    function makeTranslate(pos){
        var x = pick(pos.x, pos[0]);
        var y = pick(pos.y, pos[1]);

        return isSupportSVG() ? 'translate(' + x + ',' + y + ')' : 't' + x + ',' + y;
    }

    function isImageMarker(markerType){
        var ALL_SYMBOLS = Constants.NULL_MARKER + Constants.CIRCLE + Constants.SQUARE + Constants.DIAMOND + Constants.TRIANGLE
            + Constants.CIRCLE_HOLLOW + Constants.SQUARE_HOLLOW + Constants.DIAMOND_HOLLOW + Constants.TRIANGLE_HOLLOW;

        return ALL_SYMBOLS.indexOf(markerType) == -1;
    }

    function isNullMarker(marker){
        return marker.symbol == Constants.NULL_MARKER;
    }

    function getDefaultMarkerSymbol(seriesIndex){
        var ALL_SYMBOLS = [Constants.CIRCLE, Constants.CIRCLE_HOLLOW, Constants.SQUARE, Constants.SQUARE_HOLLOW,
            Constants.DIAMOND, Constants.DIAMOND_HOLLOW, Constants.TRIANGLE, Constants.TRIANGLE_HOLLOW];

        return ALL_SYMBOLS[seriesIndex%ALL_SYMBOLS.length];
    }

    function addEvent(el, type, fn){

        if(el.attachEvent){
            el.attachEvent('on' + type, fn);
        }else if (el.addEventListener){
            el.addEventListener(type, fn, false);
        }

    }

    function removeEvent(el, type, fn){

        if (el.removeEventListener) {
            el.removeEventListener(type, fn, false);
        } else if (el.attachEvent) {
            el.detachEvent('on' + type, fn);
        }

    }

    function dealFloatPrecision(v){
        return Math.abs(v) < 1e-6 ? 0 : v;
    }

    function getMousePos(event, el){

        event = event || window.event;

        event = event.touches ?  (event.touches.length ? event.touches.item(0) : event.changedTouches[0]) : event;

        var docElem = document.documentElement,
            box = el.getBoundingClientRect();

        var top = box.top  + (window.pageYOffset || docElem.scrollTop)  - (docElem.clientTop  || 0);
        var left = box.left + (window.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0);

        var chartX, chartY;
        if (event.pageX == undefined) {
            chartX = Math.max(event.x, event.clientX - left);
            chartY = event.y;
        } else {
            chartX = event.pageX - left;
            chartY = event.pageY - top;
        }

        return [chartX, chartY];
    }

    function hasTouch(){
        var doc = window.document;
        return doc && doc.documentElement.ontouchstart !== undefined;
    }

    return {
        getMousePos:getMousePos,
        makeTranslate:makeTranslate,
        inherit:inherit,
        clone:clone,
        date2int:date2int,
        int2date:int2date,
        object2date:object2date,
        log:log,
        accAdd:accAdd,
        accDiv:accDiv,
        accMul:accMul,
        dealFloatPrecision:dealFloatPrecision,
        isEmpty:isEmpty,
        isEmptyBounds:isEmptyBounds,
        objectToArray:objectToArray,
        pick:pick,
        isNull:isNull,
        getTextDimension:getTextDimension,
        getTextHeight:getTextHeight,
        splitText:splitText,
        getTextDimensionWithRotation:getTextDimensionWithRotation,
        isArray:isArray,
        indexInArray:indexInArray,
        cssNormalization:cssNormalization,
        reformCssArray:reformCssArray,
        rectSubPixelOpt:rectSubPixelOpt,
        lineSubPixelOpt:lineSubPixelOpt,
        addArray:addArray,
        toFront:toFront,
        toBack:toBack,
        toFrontOfAll:toFrontOfAll,
        toBackOfAll:toBackOfAll,
        containsRect:containsRect,
        rectangleOverlapped:rectangleOverlapped,
        outsideRect:outsideRect,
        containsPoint:containsPoint,
        isSupportSVG:isSupportSVG,
        setTextStyle:setTextStyle,
        makeValueInRange:makeValueInRange,
        getValueInDomain:getValueInDomain,
        toRadian:toRadian,
        toDegree:toDegree,
        getFormatterFunction:getFormatterFunction,
        showLightBox:showLightBox,
        hideLightBox:hideLightBox,
        isIE:isIE,
        hasTouch:hasTouch,
        hasNotDefined:hasNotDefined,
        hasDefined:hasDefined,
        distance:distance,
        makeBounds:makeBounds,
        isImageMarker:isImageMarker,
        isNullMarker:isNullMarker,
        getDefaultMarkerSymbol:getDefaultMarkerSymbol,
        addEvent:addEvent,
        removeEvent:removeEvent
    };

});
/**
 * Created by eason on 15/5/15.
 * 定义所有图表都有的属性
 */
define('chart/BaseChart',['require','../utils/BaseUtils','../utils/QueryUtils','../utils/ColorUtils','../component/Base','../Constants','../component/Series','../utils/Formatter'],function(require){

    var BaseUtils = require('../utils/BaseUtils');
    var QueryUtils = require('../utils/QueryUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Base = require('../component/Base');
    var Constants = require('../Constants');
    var Series = require('../component/Series');
    var Formatter = require('../utils/Formatter');

    var SERIES = '{SERIES}';
    var X = '{X}';
    var Y = '{Y}';
    var SIZE = '{SIZE}';

    var CATEGORY = 'CATEGORY';
    var SERIES = 'SERIES';
    var VALUE = 'VALUE';
    var PERCENT = 'PERCENT';

    //折线图和面积图计算延时
    function calculateT(det){
        return det < 0.5 ? Math.sqrt(det/2) : 1 - Math.sqrt(2 - 2*det)/2;
    }

    function BaseChart(vanchart, option, chartType){
        Base.call(this, vanchart, option, chartType);
    }

    BaseChart.prototype = {
        constructor:BaseChart,

        //根据分类的位置确定各个方向上需要的系列
        _buildLocationMap:function(){

            var p2s = {};//位置到系列数组
            var series = this.vanchart.series;

            //封装series
            for(var seriesIndex = 0; seriesIndex < series.length; seriesIndex++){

                var sery = series[seriesIndex];

                if(sery.chart == this){
                    var baseAxis = sery.baseAxis;
                    var location = baseAxis.getPosition();
                    var axisIndex = baseAxis.getAxisIndex();

                    p2s[location] = p2s[location] || [];
                    p2s[location][axisIndex] = p2s[location][axisIndex] || [];

                    if(sery.visible){
                        p2s[location][axisIndex].push(sery);
                    }
                }
            }

            var stackMap = {};
            var location2Series = {};//上下左右对应的系列数组

            for(var position in p2s){
                var locationMap = [];

                var seriesArray = p2s[position] || [];

                //同一个方向有多个坐标轴
                for(var axisIndex = 0; axisIndex < seriesArray.length; axisIndex++) {

                    var seriesAxis = seriesArray[axisIndex];

                    if(seriesAxis && seriesAxis.length) {
                        var barIndex = 0;
                        for(var index = 0; index < seriesAxis.length; index++){

                            var sery = seriesAxis[index];

                            var key = sery.name;
                            if(sery.stack != null && sery.stack != undefined){
                                key = sery.stack + '';
                            }

                            if(stackMap[key] != null && stackMap[key] != undefined){
                                locationMap[axisIndex][stackMap[key]].push(sery);
                            }else{
                                stackMap[key] = barIndex;
                                locationMap[axisIndex] = locationMap[axisIndex] || [];
                                locationMap[axisIndex][barIndex] = [sery];
                                barIndex++;
                            }
                        }
                    }
                }

                //locationMap里可能会出现空
                var tmp = [];
                locationMap.forEach(function(sameAxis){
                    if(sameAxis){
                        tmp.push(sameAxis);
                    }
                });

                location2Series[position] = tmp;
            }

            return location2Series;
        },

        _calculateValueBasedPercentageAndTooltip:function(locationMap){

            for(var i = 0, len = locationMap.length; i < len; i++){

                var stackedSeries = locationMap[i];

                var stackedMap = {};

                for(var j = 0, count = stackedSeries.length; j < count; j++){

                    var points = stackedSeries[j].points;

                    for(var dIndex = 0, dCount = points.length; dIndex < dCount; dIndex++){
                        var point = points[dIndex];
                        var category = point.category;
                        stackedMap[category] = stackedMap[category] || [];
                        stackedMap[category].push(point);
                    }
                }


                for(var category in stackedMap){

                    var points = stackedMap[category];

                    this._dealStackedPoints(points);
                }
            }
        },

        _calculateCategoryBasedPercentageAndTooltip:function(locationMap){

            var unstackedSeries = [];

            for(var i = 0, len = locationMap.length; i < len; i++){
                var stackedSeries = locationMap[i];
                if(stackedSeries.length){
                    var sery = stackedSeries[0];
                    var stack = sery.stack || sery.stackByPercent;
                    stack ? this.dealStackedSeries(stackedSeries) : unstackedSeries.push(stackedSeries[0]);
                }
            }

            this.dealStackedSeries(unstackedSeries);
        },

        //处理堆积的点或者不堆积的其他的点
        _dealStackedPoints:function(points){
            this._calculatePercentage(points);

            this._mergeTooltipAttributes(points);

            this._calculateStackedValue(points);
        },



        dealStackedSeries:function(stackedSeries){

            var pointsInCate = [];

            for(var i = 0, len = stackedSeries.length; i < len; i++){
                var points = stackedSeries[i].points;

                for(var j = 0, count = points.length; j < count; j++){
                    pointsInCate[j] = pointsInCate[j] || [];

                    pointsInCate[j].push(points[j]);
                }
            }

            var chart = this;
            pointsInCate.forEach(function(points){
                chart._dealStackedPoints(points);
            });

        },

        mergeSeriesAttributes:function(sery){

        },

        mergeDataPointAttributes:function(){

        },

        getDefaultDataPointColor:function(dataPoint){
            var colors = this.option.colors;
            return colors[dataPoint.series.index % colors.length];
        },

        _hideTooltip:function(){
            var tooltip = this.getTooltipComponent();
            tooltip.hide();
        },

        _mergeMarkerAttributes:function(point){

            var pointOption = point.pointOption;
            var seriesOption = point.series.seriesOption;

            var queryList = [pointOption, seriesOption, this.option.plotOptions];
            var marker = BaseUtils.clone(QueryUtils.queryList(queryList, 'marker'));

            //ie暂时不支持图片
            if((!BaseUtils.isSupportSVG() || BaseUtils.isIE()) && BaseUtils.isImageMarker(marker.symbol)){
                marker = BaseUtils.clone(marker);
                marker.symbol = Constants.CIRCLE;
            }

            var baseAxis = point.series.baseAxis;

            var axisReversed = baseAxis.isAxisReversed();

            var dCount = point.series.getDataPointCount();
            var dIndex = point.index;

            //标记点的颜色取的顺序：colors配色、plotOptions的标记点的颜色、范围图例、条件属性系列配色、条件属性系列标记点颜色、条件属性数据点的配色、条件属性数据点的标记点的配色
            marker.fillColor = this.getDefaultDataPointColor(point);
            if(BaseUtils.hasDefined(this.option.plotOptions.marker)){
                marker.fillColor = this.option.plotOptions.marker.fillColor || marker.fillColor;
            }
            var rangeLegend = this.vanchart.getComponent(Constants.RANGE_LEGEND_COMPONENT);
            if(rangeLegend){
                marker.fillColor = rangeLegend.getColorWithSize(this.isForceBubble() ? point.y : point.size) || marker.fillColor;
            }
            marker.fillColor = seriesOption.color || marker.fillColor;
            if(BaseUtils.hasDefined(seriesOption.marker)) {
                marker.fillColor = seriesOption.marker.fillColor || marker.fillColor;
            }
            marker.fillColor = pointOption.color || marker.fillColor;
            if(BaseUtils.hasDefined(pointOption.marker)) {
                marker.fillColor = pointOption.marker.fillColor || marker.fillColor;
            }

            QueryUtils.merge(point, {
                marker:marker,
                delay:calculateT((axisReversed ? (dCount - dIndex - 1) : dIndex)/ dCount) * 800
            });
        },

        getTooltipPos:function(datum, divDim, event){

            if(!datum || !datum.tooltip){
                return;
            }

            var tooltip = datum.tooltip || datum.data.tooltip;
            var svgRoot = this.getVanchartRender().getRenderRoot();

            var leftTopPos;
            if(tooltip.follow){
                var pos = event ? this.getMousePos(event) : d3.mouse(svgRoot.node());

                leftTopPos = [pos[0] + 10, pos[1] + 10];
            }else{
                leftTopPos = this._getFixedPos(datum, divDim);
            }

            //调整位置
            var chartBounds = this.vanchart.getChartBounds();
            var top = chartBounds.y;
            var bottom = chartBounds.y + chartBounds.height;
            var left = chartBounds.x;
            var right = chartBounds.x + chartBounds.width;

            var x = leftTopPos[0];
            var y = leftTopPos[1];

            if(x < left){
                x += (left - x);
            }else if(x + divDim.width > right){
                x -= (x + divDim.width - right);
            }

            if(y < top){
                y += (top - y);
            }else if(y + divDim.height > bottom){
                y -= (y + divDim.height - bottom);
            }

            return [x, y];
        },

        _getArcPoint:function(r, radian){
            return [r * Math.sin(radian), -r * Math.cos(radian)]
        },

        isSupportAnimation:function(){
            var plotOptions = this.option.plotOptions;
            if(plotOptions){
                return !!plotOptions.animation;
            }
            return false;
        },

        _calculatePercentage:function(points){
            var total = 0;
            points.forEach(function(d){
                total += Math.abs(d.value);
            });

            total = total > 0 ? total : 1;
            points.forEach(function(point){
                point.setPercentage(Math.abs(point.value) / total);
            });
        },

        _calculateStackedValue:function(points){

            //todo remove this
            if(this.componentType == Constants.BUBBLE_CHART){
                return;
            }

            if(points && points.length){

                var byPercent = points[0].series.stackByPercent;
                var stack = points[0].series.stack || byPercent;

                var preSumP = 0;
                var preSumN = 0;

                for(var i = 0, count = points.length; i < count; i++){

                    var point = points[i];

                    if(stack){
                        var usedValue = byPercent ? point.percentage : point.value;

                        point.y = usedValue;

                        if(usedValue >= 0){
                            point.y0 = preSumP;
                            preSumP += usedValue;
                        }else{
                            point.y0 = preSumN;
                            preSumN += usedValue;
                        }
                    }else{
                        var valueAxis = point.series.valueAxis;
                        point.y = byPercent ? point.percentage : point.value;
                        point.y0 = valueAxis ? valueAxis.getStartPosValue() : 0;
                    }
                }
            }
        },

        isForceBubble:function(){
            return this.option.plotOptions.force;
        },

        isUpdateWithForce:function(){
            return this.isForceBubble() && BaseUtils.isSupportSVG() && this.isSupportAnimation();
        },

        getNormalTrendLineXYValues:function(sery){

            var xValues = [];
            var yValues = [];

            sery.points.sort(function(p1, p2){
                return p1.x - p2.x;
            });

            sery.points.forEach(function(point){

                if(!point.isNull){
                    xValues.push(point.x);
                    yValues.push(point.y);
                }

            });

            return [xValues, yValues, Constants.BOTTOM];
        },

        getBubbleTrendLineXYValues:function(sery){

            var xValues = [];
            var yValues = [];

            sery.points.sort(function(p1, p2){
                return p1.posX - p2.posX;
            });

            sery.points.forEach(function(point){

                if(!point.isNull){
                    xValues.push(point.posX);
                    yValues.push(point.posY);
                }

            });

            return [xValues, yValues, Constants.BOTTOM];
        },

        makeChosenState:function(d){
            if(this.render){
                this.render.makeChosenState(d);
            }
        },

        cancelChosenState:function(d){
            if(this.render){
                this.render.cancelChosenState(d);
            }
        },

        makeClickedState:function(d){
            if(this.render){
                this.render.makeClickedState(d);
            }
        },

        cancelClickedState:function(d){
            if(this.render){
                this.render.cancelClickedState(d);
            }
        },

        onContainerMouseUp:function(){

        },

        onContainerMouseDown:function(){

        },

        getClosestPoint:function(){

        },

        makeSeriesChosenState:function(){

        },

        cancelSeriesChosenState:function(){

        },

        onContainerMouseMove:function(event){

            var pos = this.getMousePos(event);

            var plotBounds = this.getPlotBounds();

            var nearbyPoint = this.getClosestPoint(pos);

            if(BaseUtils.containsPoint(plotBounds, pos) && nearbyPoint){
                event = event || window.event;

                this.vanchart.handler.updateHoverPoint(nearbyPoint, event);
            }
        },

        //默认是按照分类总值来排序
        orderData:function(){

            var orderType = this.option.orderType;

            var location2Series = this._buildLocationMap();

            for(var location in location2Series){

                var locationMap = location2Series[location];

                for(var index = locationMap.length - 1; index >= 0; index--){

                    var sameAxisLocationMap = locationMap[index];

                    if(sameAxisLocationMap && sameAxisLocationMap.length && sameAxisLocationMap[0].length){

                        var sery = sameAxisLocationMap[0][0];
                        var cateAxis = sery.baseAxis;

                        //排序是按照分类的总和排序,底轴是横轴排序无意义
                        if(cateAxis.type != Constants.CATEGORY_AXIS_COMPONENT){
                            continue;
                        }

                        var totalValue = {};

                        for(var i = 0, len = sameAxisLocationMap.length; i < len; i++){

                            var stackedArray = sameAxisLocationMap[i];

                            for(var j = 0, count = stackedArray.length; j < count; j++){
                                var sery = stackedArray[j];

                                for(var dataIndex = 0, dataCount = sery.points.length; dataIndex < dataCount; dataIndex++){

                                    var point = sery.points[dataIndex];

                                    if(BaseUtils.hasNotDefined(totalValue[point.category])){
                                        totalValue[point.category] = 0;
                                    }

                                    totalValue[point.category] += point.value;
                                }
                            }
                        }

                        //得到每个每类上的总值以后进行排序
                        var categories = [];
                        for(var category in totalValue){
                            categories.push({
                                key:category,
                                value:totalValue[category]
                            });
                        }

                        categories.sort(function(a, b){
                            return orderType == Constants.ASCENDING ? a.value - b.value : b.value - a.value;
                        });

                        var newCategories = [];
                        categories.forEach(function(a){
                            newCategories.push(a.key);
                        });

                        cateAxis.updateCategories(newCategories);


                        //更新className
                        for(var i = 0, len = sameAxisLocationMap.length; i < len; i++){

                            var stackedArray = sameAxisLocationMap[i];

                            for(var j = 0, count = stackedArray.length; j < count; j++){
                                var sery = stackedArray[j];
                                sery.updateClassName();
                            }
                        }


                    }
                }
            }
        },

        getVisibleChartData:function(){

            var data = [];

            var series = this.vanchart.series;

            for(var i = 0, len = series.length; i < len; i++){
                var sery = series[i];

                if(this._isVisibleSeries(sery)){
                    data.push(series[i]);
                }
            }

            //考虑到堆积的效果才要排序
            var needSort = this.componentType == Constants.RADAR_CHART
                                || this.componentType == Constants.BAR_CHART
                                            || this.componentType == Constants.COLUMN_CHART;


            return needSort ? data.sort(function(a, b){return b.index - a.index;}) : data;
        },

        _isVisibleSeries:function(sery){
            return sery.type == this.componentType && sery.visible;
        },

        getChartData:function(){

            var data = [];

            var series = this.vanchart.series;

            for(var i = 0, len = series.length; i < len; i++){

                if(series[i].type == this.componentType){
                    data.push(series[i]);
                }
            }

            return data;
        },

        _getSeriesInterpolate: function (seriesOption, plotOptions) {
            var step = seriesOption.step;
            var curve = seriesOption.curve;

            if(!(step || curve)){
                step = step === false ? false : plotOptions.step;
                curve = curve === false ? false : plotOptions.curve;
            }

            var interpolate = 'linear';
            if(step){
                interpolate = 'step-after'
            }else if(curve){
                interpolate = 'cardinal';
            }
            return interpolate;
        },

        _getLineSvg: function (interpolate) {
            return  d3.svg.line()
                .interpolate(interpolate)
                .x(function (d) {
                    return d.x;
                })
                .y(function (d) {
                    return d.y;
                })
                .defined(function (d) {
                    return !d.isNull;
                });
        },

        _getAreaSvg: function (interpolate) {
            return d3.svg.area()
                .interpolate(interpolate)
                .x(function (d) {
                    return d.x;
                })
                .y0(function(d){
                    return d.y0;
                })
                .y1(function (d) {
                    return d.y;
                })
                .defined(function(d){
                    return !d.isNull;
                });
        },


        _calculateBubbleLabelInfo:function(point, dataLabels, defaultPosition){
            dataLabels = dataLabels || {};
            var formatter = dataLabels.formatter;
            var useHtml = dataLabels.useHtml;
            if(!formatter){
                return {};
            }

            var content = [];
            if(typeof formatter == 'object'){

                var identifier = formatter.identifier;

                if(identifier.indexOf(SERIES) != -1){
                    var seriesString = Formatter.format(point.seriesName, formatter.seriesFormat);
                    var seriesStyle = point.getCategorySeriesStyle(dataLabels, defaultPosition);
                    var seriesDim = BaseUtils.getTextDimension(seriesString, seriesStyle, useHtml);

                    content.push({
                        text:seriesString,
                        style:seriesStyle,
                        dim:seriesDim
                    });
                }

                if(identifier.indexOf(X) != -1 || identifier.indexOf(Y) != -1 || identifier.indexOf(SIZE) != -1){
                    var text = this._getXYSizeString(point, formatter, identifier);
                    var style = point.getValuePercentageStyle(dataLabels, defaultPosition);
                    var dim = BaseUtils.getTextDimension(text, style, useHtml);

                    content.push({
                        text:text,
                        style:style,
                        dim:dim
                    });
                }

            }else{
                point.pushCustomLabelContent(formatter, dataLabels, useHtml, content, defaultPosition);
            }

            var labelDim = point.calculateTextDim(content);

            QueryUtils.merge(point, {
                labelContent: content,
                labelDim: labelDim
            }, true);
        },

        _getXYSizeString:function(point, formatter, identifier) {
            var xString = Formatter.format(point.category, formatter.xFormat);
            var yString = Formatter.format(point.value, formatter.yFormat);
            var sizeString = point.size == '-' ? '-' : Formatter.format(point.size, formatter.sizeFormat);

            var text = '';

            if(identifier.indexOf(X) != -1 || identifier.indexOf(Y) != -1){
                text = '(';
                if(identifier.indexOf(X) != -1){
                    text += xString;
                    if(identifier.indexOf(Y) != -1){
                        text = text + ',' + yString;
                    }
                    text += ')';
                } else {
                    text += yString;
                    text += ')';
                }
                text += ' ';
            }

            if(identifier.indexOf(SIZE) != -1 && sizeString != '-'){
                text += sizeString;
            }
            return text;
        },

        _mergeTooltipAttributes:function(points){
            for(var i = 0, len = points.length; i < len; i++){
                var point = points[i];
                this.mergeSinglePointTooltipAttr(point, points);
            }
        },

        mergeSinglePointTooltipAttr:function(point, points){
            var tooltip = point.tooltip;

            point.tooltipText = tooltip && tooltip.enabled ? this._calculateTooltipContent(tooltip, point, points) : null;
            point.points = points;
        },

        _calculateTooltipContent:function(tooltip, data, points){

            var formatter = tooltip.formatter;

            if(!formatter){
                return "";
            }

            if(typeof formatter == 'object'){

                var style = tooltip.style;
                var label = formatter.identifier;
                var self = this;

                var content = '';

                if(tooltip.shared){
                    content += this._createCategoryLine(data, label, style, formatter);

                    points.forEach(function(point){

                        content += '<span style="font-size:12px; color: ' + point.color + '">'+'&#9679  '+'</span>';

                        content += self._createSeriesLine(point, label, style, formatter);

                        content += '<br />';
                    });
                }else{
                    content += this._createCategoryLine(data, label, style, formatter);
                    content += self._createSeriesLine(data, label, style, formatter);
                }
                return content;
            }else{
                return BaseUtils.getFormatterFunction(formatter).call(data);
            }
        },

        _createCategoryLine:function(data, label, style, formatter){
            if(data.series.chart.componentType == Constants.BUBBLE_CHART && !this.isForceBubble()){

                return this._createBubbleTooltipSeriesLine(data, label, style, formatter);

            }else{
                var content = '';

                if(label.indexOf(CATEGORY) != -1){

                    var categoryString = Formatter.format(data.category, formatter.categoryFormat);

                    content += (style ? '<span>' : Constants.TOOLTIP_CATEGORY_STYLE) + categoryString +'</span>';

                    content += '<br />';
                }

                return content;
            }
        },

        _createSeriesLine:function(data, label, style, formatter){

            if(data.series.chart.componentType == Constants.BUBBLE_CHART && !this.isForceBubble()){

                return this._createBubbleTooltipXYSizeLine(data, label, style, formatter);

            }else{

                var content = '';
                var seriesString = Formatter.format(data.seriesName, formatter.seriesFormat);
                var valueString = Formatter.format(data.value, formatter.valueFormat);
                var percentString = Formatter.format(data.percentage, formatter.percentFormat);

                if(label.indexOf(SERIES) != -1 && !BaseUtils.isEmpty(seriesString)){

                    if(label.indexOf(VALUE) != -1 || label.indexOf(PERCENT) != -1){
                        seriesString += ':';
                    }

                    content += (style ? '<span >' : Constants.TOOLTIP_SERIES_STYLE) + seriesString +'</span>';
                }

                if(label.indexOf(VALUE) != -1 && label.indexOf(PERCENT) != -1){
                    content += (style ? '<span>' : Constants.TOOLTIP_VALUE_STYLE) + valueString + '  ' + percentString + '</span>';
                }else if(label.indexOf(VALUE) != -1){
                    content += (style ? '<span>' : Constants.TOOLTIP_VALUE_STYLE) + valueString + '</span>';
                }else if(label.indexOf(PERCENT) != -1){
                    content += (style ? '<span>' : Constants.TOOLTIP_VALUE_STYLE) + percentString +'</span>';
                }

                return content;
            }

        },

        //提示的第一行：气泡的系列
        _createBubbleTooltipSeriesLine:function(data, label, style, formatter){
            var content = '';

            if(label.indexOf(SERIES) != -1){

                var seriesString = Formatter.format(data.seriesName, formatter.seriesFormat);

                content += (style ? '<span >' : Constants.TOOLTIP_SERIES_STYLE) + seriesString +'</span>';

                content += '<br />';
            }

            return content;
        },

        //提示的第二行：气泡的X、Y、SIZE
        _createBubbleTooltipXYSizeLine:function(data, label, style, formatter){

            var content = '';
            if(label.indexOf(X) != -1 || label.indexOf(Y) != -1 || label.indexOf(SIZE) != -1) {
                var text = this._getXYSizeString(data, formatter, label);
                content += (style ? '<span>' : Constants.TOOLTIP_VALUE_STYLE) + text + '</span>';
            }

            return content;
        }

    };

    BaseUtils.inherit(BaseChart, Base);

    return BaseChart;
});
/**
 * Created by eason on 15/7/13.
 */

define('chart/Pie',['require','../Constants','../utils/BaseUtils','./BaseChart','../utils/QueryUtils','../utils/BoundsManager','../ChartLibrary'],function(require){

    var RIGHT_TOP = 'right-top';
    var RIGHT_BOTTOM = 'right-bottom';
    var LEFT_TOP = 'left-top';
    var LEFT_BOTTOM = 'left-bottom';

    var CIRCLE = 2 * Math.PI;
    var HOVER_PERCENT = 1.1;
    var MAGIC_DET = 3;//很奇怪的3px

    var STEP = Math.PI / 180;

    var LINE_LABEL_GAP = 2;

    var DECREASE = [0.75,0.7,0.65,0.6,0.55];

    var Constants = require('../Constants');
    var BaseUtils = require('../utils/BaseUtils');
    var BaseChart = require('./BaseChart');
    var QueryUtils = require('../utils/QueryUtils');
    var BoundsManager = require('../utils/BoundsManager');

    function Pie(vanchart, option, chartType){
        BaseChart.call(this, vanchart, option, chartType);
        this.refresh(option);
    }

    Pie.prototype = {
        constructor:Pie,

        mergeSeriesAttributes:function(series){

            var queryList = [series.seriesOption, this.option.plotOptions];

            var innerRadius = QueryUtils.queryList(queryList, 'innerRadius') || 0;

            if(parseFloat(innerRadius) == 0){
                innerRadius = 0;
            }

            var center = QueryUtils.queryList(queryList, 'center');

            var startAngle = QueryUtils.queryList(queryList, 'startAngle') || 0;
            var endAngle = QueryUtils.queryList(queryList, 'endAngle') || 360;

            if(startAngle > endAngle){
                startAngle -= 360;
            }else if(startAngle == endAngle){
                startAngle = 0;
                endAngle = 360;
            }

            var roseType = QueryUtils.queryList(queryList, 'roseType');
            var rotatable = QueryUtils.queryList(queryList, 'rotatable');
            var radius = QueryUtils.queryList(queryList, 'radius') ;
            var style = this.option.style;

            QueryUtils.merge(series, {
                center:center,
                radius:radius,
                innerRadius:innerRadius,
                startAngle:startAngle,
                endAngle:endAngle,
                roseType:roseType,
                rotatable:rotatable,
                style:style
            }, true);

        },

        mergeDataPointAttributes:function(point){

            QueryUtils.merge(point,{
                visible:BaseUtils.pick(point.pointOption.visible, true),
                rotate:0
            }, true);

        },

        doLayout:function(){

            var series = this.getVisibleChartData();
            var plotOptions = this.option.plotOptions;
            var self = this;

            series.forEach(function(sery){

                //重置radius属性
                sery.radius = QueryUtils.queryList([sery.seriesOption, plotOptions], 'radius');

                self._dealStackedPoints(sery.visiblePoints);

                var pieLayout = d3.layout.pie()
                    .value(function(d){
                        return sery.roseType == Constants.SAME_ARC ? 1 : Math.abs(d.value);
                    })
                    .startAngle(BaseUtils.toRadian(sery.startAngle))
                    .endAngle(BaseUtils.toRadian(sery.endAngle))
                    .sort(null);

                var pieData = pieLayout(sery.visiblePoints);
                pieData.forEach(function(slice){
                    var point = slice.data;
                    point.startAngle = isNaN(slice.startAngle) ? 0 : slice.startAngle;
                    point.endAngle = isNaN(slice.endAngle) ? 0: slice.endAngle;
                });
            });

            var series = this.getVisibleChartData();
            var plotBounds = this.vanchart.getPlotBounds();

            var seriesBounds = this._calculateSeriesBounds();

            for(var i = 0, len = series.length; i < len; i++){
                var sery = series[i];
                var bounds = seriesBounds[sery.name];
                var radius = 0;
                var centerX = 0;
                var centerY = 0;

                if(bounds == 'fixed'){
                    var centerX = series[i].center[0];
                    var centerY = series[i].center[1];

                    if(series[i].center[0].indexOf('%') != -1){
                        centerX = this._getPercentValue(series[i].center[0], this.vanchart.chartWidth());
                        centerY = this._getPercentValue(series[i].center[1], this.vanchart.chartHeight());
                    }

                    if(sery.radius){
                        radius = sery.radius / 2;
                    }else{
                        //自定义了位置但是没自定义大小
                        var left = centerX - plotBounds.x;
                        var right = plotBounds.x + plotBounds.width - centerX;
                        var top = centerY - plotBounds.y;
                        var bottom = plotBounds.y + plotBounds.height - centerY;
                        radius = Math.min(left, right, top, bottom);
                    }

                    centerX -= plotBounds.x;
                    centerY -= plotBounds.y;
                }else{
                    radius = Math.min(bounds.width/2, bounds.height/2);
                    centerX = bounds.x + bounds.width/2;
                    centerY = bounds.y + bounds.height/2;
                }

                QueryUtils.merge(sery,{
                    bounds:bounds,
                    radius:radius,
                    centerX:centerX,
                    centerY:centerY
                }, true);

                //计算标签的位置,并且更新半径
                this._calculateLabelPos(sery);
            }
        },

        _getFixedPos:function(datum, divDim){

            var plotBounds = this.getPlotBounds();

            var pieConfig = datum.series;

            var translateX = pieConfig.centerX;
            var translateY = pieConfig.centerY;

            var centerAngle = this.getCenterAngle(datum);
            var radius = datum.radius * HOVER_PERCENT;

            var centerX = radius * Math.sin(centerAngle) + translateX + plotBounds.x;
            var centerY = radius * Math.cos(centerAngle + Math.PI) + translateY + plotBounds.y;

            if(centerAngle < Math.PI / 2){
                centerY -= divDim.height;
            }else if(centerAngle >= Math.PI && centerAngle < 3 * Math.PI / 2){
                centerX -= divDim.width;
            }else if(centerAngle >= 3 * Math.PI / 2 && centerAngle < CIRCLE){
                centerY -= divDim.height;
                centerX -= divDim.width;
            }

            return [centerX, centerY];
        },

        recalculateLabelPos:function(pieConfig, rotate){

            var points = pieConfig.visiblePoints;

            for(var i = 0, len = points.length; i < len; i++){
                points[i].labelPos = null;
                points[i].rotate = rotate;
            }

            var outPoints = [];
            var inPoints = [];

            for(var i = 0, len = points.length; i < len; i++){
                var point = points[i];
                var dataLabels = point.dataLabels;
                if(dataLabels && dataLabels.enabled){
                    dataLabels.align == Constants.OUTSIDE ? outPoints.push(point) : inPoints.push(point);
                }
            }

            this._calculateOutsideLabelBounds(outPoints, pieConfig, true);
            this._calculateLeadLineStartPos(outPoints);
            this._calculateInsideLabelBounds(inPoints, pieConfig);
        },

        _calculateLabelPos:function(pieConfig){

            var roseType = pieConfig.roseType;
            var points = pieConfig.visiblePoints;

            var outPoints = [];
            var inPoints = [];

            for(var i = 0, len = points.length; i < len; i++){
                var point = points[i];
                var dataLabels = point.dataLabels;
                if(dataLabels && dataLabels.enabled){
                    dataLabels.align == Constants.OUTSIDE ? outPoints.push(point) : inPoints.push(point);
                }
            }

            //这步会改变半径
            this._calculateOutsideLabelBounds(outPoints, pieConfig);

            //有标签在里面,没有标签在外面或者不显示标签
            if((inPoints.length && !outPoints.length) || (!inPoints.length && !outPoints.length)){
                pieConfig.radius = pieConfig.radius / HOVER_PERCENT - MAGIC_DET;
            }

            //内径可能是半径的占比
            this._calculateInnerRadius(pieConfig);

            //玫瑰图根据最后的半径值来确定不同扇形的半径
            if(roseType){
                var points = pieConfig.visiblePoints;
                var radiusGap = pieConfig.radius - pieConfig.innerRadius;
                var maxValue = 0;
                points.forEach(function(d){
                    maxValue = Math.max(maxValue, Math.abs(d.value));
                });

                var sizePerValue = radiusGap / maxValue;

                //maxValue为0之类的情况
                if(isNaN(sizePerValue) || !isFinite(sizePerValue)){
                    sizePerValue = 0;
                }

                points.forEach(function(d){
                    d.radius = pieConfig.innerRadius + sizePerValue * Math.abs(d.value);
                })
            }else{
                var usedR = pieConfig.radius;
                pieConfig.visiblePoints.forEach(function(d){
                    d.radius = usedR;
                });
            }

            this._calculateLeadLineStartPos(outPoints);

            //确定半径以后计算标签在内的标签
            this._calculateInsideLabelBounds(inPoints, pieConfig);
        },

        _calculateInnerRadius:function(pieConfig){
            var innerRadius = pieConfig.innerRadius;

            var radius = pieConfig.radius;

            if(typeof innerRadius == 'string'){
                if(innerRadius.indexOf('%') != -1){
                    innerRadius = parseFloat(innerRadius) * radius / 100;
                }else{
                    innerRadius = parseFloat(innerRadius);
                }
            }

            pieConfig.innerRadius = innerRadius;

            var points = pieConfig.visiblePoints;

            points.forEach(function(d){
                d.innerRadius = innerRadius;
            });

        },

        _calculateLeadLineStartPos:function(outPoints){

            var self = this;
            outPoints.forEach(function(arcPoint){

                var radius = arcPoint.radius;
                var centerAngle = self.getCenterAngle(arcPoint);

                if(arcPoint.labelPos){
                    arcPoint.labelPos.startPos = {
                        x:(radius + 1)*Math.sin(centerAngle),
                        y: (radius + 1) * Math.cos(centerAngle + Math.PI)
                    }
                }

            });
        },

        _calculateOutsideLabelBounds:function(outPoints, pieConfig, isRecalculate){
            if(!outPoints.length){
                return ;
            }

            //清空计算结果
            outPoints.forEach(function(arc){
                arc.labelPos = null;
            });

            isRecalculate = isRecalculate || false;

            //先划分区域
            var rightTop = [];
            var rightBottom = [];
            var leftTop = [];
            var leftBottom = [];

            for(var i = 0, len = outPoints.length; i < len; i++){
                var point = outPoints[i];

                var center = this.getCenterAngle(point);

                if(center < Math.PI / 2){
                    rightTop.push(point)
                }else if(center >= Math.PI / 2 && center < Math.PI){
                    rightBottom.push(point);
                }else if(center >= Math.PI && center < 3 * Math.PI /2){
                    leftBottom.push(point);
                }else{
                    leftTop.push(point);
                }
            }

            isRecalculate ? this._calculateArcR(pieConfig, rightTop, rightBottom, leftTop, leftBottom)
                                        :this._initCalculateArcR(pieConfig, rightTop, rightBottom, leftTop, leftBottom);
        },

        _initCalculateArcR:function(pieConfig, rightTop, rightBottom, leftTop, leftBottom){
            var originR = pieConfig.radius;
            var usedR = originR * 0.5;

            var bounds = pieConfig.bounds;
            var dim = {width:bounds.width/2, height:bounds.height/2};

            //半径的下界都不能放下的话
            if(!this._testIfAllHorizontalFit(usedR, dim, rightTop, rightBottom, leftTop, leftBottom)){
                pieConfig.radius = usedR;

                //计算位置
                this._testIfAllFit(usedR, dim, rightTop, rightBottom, leftTop, leftBottom)

                return;
            }

            for(var i = 0, len = DECREASE.length; i < len; i++){
                usedR = originR * DECREASE[i];

                if(this._testIfAllFit(usedR, dim, rightTop, rightBottom, leftTop, leftBottom)){
                    pieConfig.radius = usedR;
                    return;
                }
            }

            this._testIfAllFit(usedR, dim, rightTop, rightBottom, leftTop, leftBottom, true);
            pieConfig.radius = usedR;
        },

        _calculateArcR:function(pieConfig, rightTop, rightBottom, leftTop, leftBottom){
            var usedR = pieConfig.radius;
            var bounds = pieConfig.bounds;
            var dim = {width:bounds.width/2, height:bounds.height/2};

            this._testIfAllFit(usedR, dim, rightTop, rightBottom, leftTop, leftBottom, true);
        },

        _testIfAllHorizontalFit:function(usedR, dim, rightTop, rightBottom, leftTop, leftBottom){
            var tmpRightTop = this._ignoreMinArcLabel(usedR, rightTop);
            var tmpRightBottom = this._ignoreMinArcLabel(usedR, rightBottom);
            var tmpLeftTop = this._ignoreMinArcLabel(usedR, leftTop);
            var tmpLeftBottom = this._ignoreMinArcLabel(usedR, leftBottom);

            var rightTop = this._testIfHorizontalFit(rightTop, tmpRightTop, usedR, dim, RIGHT_TOP);
            var rightBottom = this._testIfHorizontalFit(rightBottom, tmpRightBottom, usedR, dim, RIGHT_BOTTOM);
            var leftTop = this._testIfHorizontalFit(leftTop, tmpLeftTop, usedR, dim, LEFT_TOP);
            var leftBottom = this._testIfHorizontalFit(leftBottom, tmpLeftBottom, usedR, dim, LEFT_BOTTOM);

            return rightTop && rightBottom && leftTop && leftBottom;
        },

        _testIfHorizontalFit:function(arcPoints, usedR, dim, location){

            var outerR = usedR * 1.2;
            var hWidth = usedR * 0.1;
            var allLabelBounds = BaseUtils.makeBounds(-dim.width, dim.height, dim.width * 2, dim.height * 2);

            for(var i = 0, len = arcPoints.length; i < len; i++){

                var point = arcPoints[i];

                var labelDim = point.labelDim;

                var centerAngle = this.getCenterAngle(point);

                var centerX = outerR * Math.sin(centerAngle);

                var centerY = outerR * Math.cos(centerAngle + Math.PI);

                var bounds = this._getLabelBounds(location, centerX, centerY, hWidth, labelDim);

                if(bounds.x < allLabelBounds.x || (bounds.x + bounds.width > allLabelBounds.x + allLabelBounds.width)){
                    return false;
                }
            }

            return true;
        },

        _testIfAllFit:function(usedR, dim, rightTop, rightBottom, leftTop, leftBottom, forceFloat){

            var tmpRightTop = this._ignoreMinArcLabel(usedR, rightTop);
            var tmpRightBottom = this._ignoreMinArcLabel(usedR, rightBottom);
            var tmpLeftTop = this._ignoreMinArcLabel(usedR, leftTop);
            var tmpLeftBottom = this._ignoreMinArcLabel(usedR, leftBottom);

            var rightTop = this._testIfFit(rightTop, tmpRightTop, usedR, dim, RIGHT_TOP, forceFloat);
            var rightBottom = this._testIfFit(rightBottom, tmpRightBottom, usedR, dim, RIGHT_BOTTOM, forceFloat);
            var leftTop = this._testIfFit(leftTop, tmpLeftTop, usedR, dim, LEFT_TOP, forceFloat);
            var leftBottom = this._testIfFit(leftBottom, tmpLeftBottom, usedR, dim, LEFT_BOTTOM, forceFloat);

            return rightTop && rightBottom && leftTop && leftBottom;
        },

        _testIfFit:function(totalPoints, arcPoints, usedR, dim, location, forceFloat){

            return (totalPoints.length == arcPoints.length && !forceFloat) ? this._testFixedPositionIfFit(arcPoints, usedR, dim, location)
                                    :this._testFloatPositionIfFit(arcPoints, usedR, dim, location)

        },

        _testFixedPositionIfFit:function(arcPoints, usedR, dim, location){

            var manager = new BoundsManager();

            var outerR = usedR * 1.2;
            var hWidth = usedR * 0.1;
            var allLabelBounds = BaseUtils.makeBounds(-dim.width, -dim.height, dim.width * 2, dim.height * 2);

            for(var i = 0, len = arcPoints.length; i < len; i++){

                var point = arcPoints[i];

                var labelDim = point.labelDim;

                var centerAngle = this.getCenterAngle(point);

                var centerX = outerR * Math.sin(centerAngle);

                var centerY = outerR * Math.cos(centerAngle + Math.PI);

                var bounds = this._getLabelBounds(location, centerX, centerY, hWidth, labelDim);

                if(manager.isOverlapped(bounds) || !BaseUtils.containsRect(allLabelBounds, bounds)){
                    return false;
                }else{
                    manager.addBounds(bounds);

                    var midPos = {x:centerX, y:centerY};
                    var endPos;
                    if(location == RIGHT_TOP || location == RIGHT_BOTTOM){
                        endPos = {x:centerX + hWidth, y:centerY};
                    }else{
                        endPos = {x:centerX - hWidth, y:centerY};
                    }
                    point.labelPos = {
                        x:bounds.x,
                        y:bounds.y,

                        midPos:midPos,
                        endPos:endPos
                    };
                }
            }

            return true;
        },

        _testFloatPositionIfFit:function(arcPoints, usedR, dim, location){

            var fromStart = this._findNiceBoundsFromStartAngle(arcPoints, usedR, dim, location);

            if(!fromStart){

                arcPoints.forEach(function(arc){
                    arc.labelPos = null;
                });

                return this._findNiceBoundsFromEndAngle(arcPoints, usedR, dim, location);
            }

            return fromStart;
        },

        _findNiceBoundsFromStartAngle:function(arcPoints, usedR, dim, location){
            return this._findNiceBounds(true, arcPoints, usedR, dim, location);
        },

        _findNiceBoundsFromEndAngle:function(arcPoints, usedR, dim, location){
            return this._findNiceBounds(false, arcPoints, usedR, dim, location);
        },

        _findNiceBounds:function(isAngleIncrease, arcPoints, usedR, dim, location){

            var outerR = usedR * 1.2;
            var hWidth = usedR * 0.1;

            var manager = new BoundsManager();
            var angleRange = this._getStartAndEndAngle(location);

            var allLabelBounds = this._getPossibleLabelBoundsByLocation(dim, location);


            var searchEnd = isAngleIncrease ? angleRange.endAngle : angleRange.startAngle;
            var step = isAngleIncrease ? STEP : -STEP;


            var found = true;
            for(var i = 0, len = arcPoints.length; i < len && found; i++){

                var pointIndex = isAngleIncrease ? i : len - i - 1;

                var point = arcPoints[pointIndex];

                var labelDim = point.labelDim;

                var centerAngle = this.getCenterAngle(point);

                var centerX = outerR * Math.sin(centerAngle);

                var centerY = outerR * Math.cos(centerAngle + Math.PI);

                var bounds = this._getLabelBounds(location, centerX, centerY, hWidth, labelDim);

                if(manager.isOverlapped(bounds) || !BaseUtils.containsRect(allLabelBounds, bounds)){
                    found = false;
                    for(var angle = centerAngle + step; (isAngleIncrease ? angle < searchEnd : angle > searchEnd); angle += step){

                        centerX = outerR * Math.sin(angle);
                        centerY = outerR * Math.cos(angle + Math.PI);

                        bounds = this._getLabelBounds(location, centerX, centerY, hWidth, labelDim);

                        if(!manager.isOverlapped(bounds) && BaseUtils.containsRect(allLabelBounds, bounds)){
                            found = true;
                            break;
                        }
                    }
                }

                if(found){

                    var midPos = {x:centerX, y:centerY};
                    var endPos;
                    if(location == RIGHT_TOP || location == RIGHT_BOTTOM){
                        endPos = {x:centerX + hWidth, y:centerY};
                    }else{
                        endPos = {x:centerX - hWidth, y:centerY};
                    }

                    manager.addBounds(bounds);
                    point.labelPos = {
                        x:bounds.x,
                        y:bounds.y,

                        midPos:midPos,
                        endPos:endPos
                    };
                }
            }

            return found;
        },

        _getStartAndEndAngle:function(location){
            switch (location){
                case RIGHT_TOP:
                    return {startAngle:0, endAngle:Math.PI/2};
                case RIGHT_BOTTOM:
                    return {startAngle:Math.PI/2, endAngle:Math.PI};
                case LEFT_BOTTOM:
                    return {startAngle:Math.PI, endAngle:3 * Math.PI / 2};
                case LEFT_TOP:
                    return {startAngle:3 * Math.PI / 2, endAngle: 2 * Math.PI};
            }
        },

        _getLabelBounds:function(location, centerX, centerY, hWidth, labelDim){
            var x,y;
            if(location == RIGHT_TOP || location == RIGHT_BOTTOM){
                x = centerX + hWidth + LINE_LABEL_GAP;
            }else{
                x = centerX - hWidth - LINE_LABEL_GAP - labelDim.width;
            }

            y = centerY - labelDim.height/2;

            return {x:x, y:y, width:labelDim.width, height:labelDim.height};
        },

        getCenterAngle:function(point){
            var centerAngle = point.rotate + (point.startAngle + point.endAngle) / 2 ;
            return BaseUtils.makeValueInRange(0, 2*Math.PI, centerAngle);
        },

        //相对于圆心的标签可占用大小的坐标
        _getPossibleLabelBoundsByLocation:function(dim, location){
            var x , y;
            var width = dim.width;
            var height = dim.height;

            switch (location){
                case RIGHT_TOP:
                    x = 0;
                    y = -height;
                    break;
                case RIGHT_BOTTOM:
                    x = y = 0;
                    break;
                case LEFT_BOTTOM:
                    x = -width;
                    y = 0;
                    break;
                case LEFT_TOP:
                    x = -width;
                    y = -height;
                    break;
            }

            return {x:x, y:y, width:width, height:height};
        },

        //从高度判断是否能够放下标签
        _ignoreMinArcLabel:function(radius, arcs){

            var totalHeight = 0;

            for(var i = 0, len = arcs.length; i < len; i++){
                var labelDim = arcs[i].labelDim;
                totalHeight += labelDim.height;
            }

            //高度不够，需要省略一些标签
            if(radius < totalHeight){

                var det = totalHeight - radius;

                arcs.sort(function(a, b){
                    return a.value - b.value;
                });

                for(var i = 0, len = arcs.length; i < len; i++){
                    if(det < 0){
                        break;
                    }
                    var labelHeight = arcs[i].labelDim.height;
                    det -= labelHeight;
                }

                arcs = arcs.slice(i, arcs.length);
            }

            arcs.sort(function(a, b){
                var startA = a.startAngle;
                var startB = b.startAngle;

                if(startA < startB){
                    return -1;
                }else if(startA > startB){
                    return 1;
                }else{
                    return 0;
                }
            });

            return arcs;
        },

        //算出来的bounds都是相对于centerX和centerY
        _calculateInsideLabelBounds:function(inPoints, pieConfig){
            var innerRadius = pieConfig.innerRadius;

            for(var i = 0, len = inPoints.length; i < len; i++){
                var point = inPoints[i];
                var radius = point.radius;

                var centerAngle = this.getCenterAngle(point);

                var tmpR = innerRadius + (radius - innerRadius) / 2;

                var center = this._getArcPoint(tmpR, centerAngle);

                var x = center[0] - point.labelDim.width/2;
                var y = center[1] - point.labelDim.height/2;

                point.labelPos = {x:x, y:y};
            }
        },

        //计算每个系列的边界
        _calculateSeriesBounds:function(){
            var series = this.getVisibleChartData();
            var plotBounds = this.vanchart.getPlotBounds();
            var seriesBounds = {};

            var usedSize = 0;
            var fixedSize = 0;
            for(var i = 0, len = series.length; i < len; i++){
                if(!series[i].center && series[i].radius){
                    usedSize += (series[i].radius || 0) * 2;
                    fixedSize++;
                }
            }

            //平均半径
            var averageRadius = plotBounds.width / Math.max(1, series.length - fixedSize);
            averageRadius /= 2;

            var leftBounds = {x:0, y:0, width:plotBounds.width, height:plotBounds.height};
            for(var i = 0, len = series.length; i < len; i++){
                if(series[i].center){
                    seriesBounds[series[i].name] = 'fixed';
                }else{
                    var size = (series[i].radius || averageRadius) * 2;
                    seriesBounds[series[i].name] = {
                        x:leftBounds.x,
                        y:leftBounds.y,
                        width:size,
                        height:leftBounds.height
                    };

                    leftBounds.x += size;
                    leftBounds.width -= size;
                }
            }

            return seriesBounds;
        },

        orderData:function(){
            var series = this.getVisibleChartData();
            var chart = this;
            series.forEach(function(sery){

                sery.points.sort(function(sliceA, sliceB){

                    var valueA = sliceA.value;

                    var valueB = sliceB.value;

                    return chart.option.orderType == Constants.ASCENDING ? valueA - valueB : valueB - valueA;
                });

                sery.updateVisiblePoints();
            });

            this.option.byClassName = false;
        },

        onContainerMouseMove:function(event){

            if(this.dragTarget){

                var pos = this.getMousePos(event);

                this.render.onDrag(this.dragTarget, pos);
            }

        },

        onContainerMouseUp:function(event){

            if(this.dragTarget){
                var pos = this.getMousePos(event);

                this.render.onDragEnd(this.dragTarget, pos);

                this.dragTarget = null;
            }

            if(this.vanchart.hoverPoint){
                this.cancelClickedState(this.vanchart.hoverPoint);
            }
        },

        onContainerMouseDown:function(event){

            this.dragTarget = null;

            var pos = this.getMousePos(event);

            var plotBounds = this.getPlotBounds();

            var x = pos[0] - plotBounds.x;
            var y = pos[1] - plotBounds.y;

            var series = this.getVisibleChartData();
            series.forEach(function(config){
                if(BaseUtils.containsPoint(config.bounds, [x,y]) && config.rotatable){
                    this.dragTarget = config;
                }
            }.bind(this));

            if(this.dragTarget){
                this.render.onDragStart(this.dragTarget, pos);
            }

            if(this.vanchart.hoverPoint){
                this.makeClickedState(this.vanchart.hoverPoint);
            }
        },

        getDefaultDataPointColor:function(dataPoint){
            var colors = this.option.colors;
            return colors[dataPoint.index % colors.length];
        }
    };

    BaseUtils.inherit(Pie, BaseChart);

    require('../ChartLibrary').register(Constants.PIE_CHART, Pie);
});
/**
 * Created by eason on 15/5/4.
 */
define('chart/Bar',['require','./BaseChart','../utils/BaseUtils','../Constants','../utils/QueryUtils','../utils/BoundsManager','../ChartLibrary','../ChartLibrary'],function(require){
    var BaseChart = require('./BaseChart');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var QueryUtils = require('../utils/QueryUtils');
    var BoundsManager = require('../utils/BoundsManager');

    var TOOLTIP_GAP = 1;
    var LABEL_GAP = 3;
    var MIN_BAR_SIZE = 2;

    function Bar(vanchart, option, chartType){
        BaseChart.call(this, vanchart, option, chartType);

        this.refresh(option);
    }

    Bar.prototype = {
        constructor:Bar,

        doLayout:function(){

            //每个方向上的柱子
            var locations2Series = this._buildLocationMap();

            for(var location in locations2Series){

                var location2Series = locations2Series[location];

                for(var i = 0, count = location2Series.length; i < count; i++) {

                    var sameAxisSeries = location2Series[i];

                    if(sameAxisSeries && sameAxisSeries.length) {

                        this._buildBars(sameAxisSeries);

                    }

                }
            }

            this._calculateLabelPos();
        },

        getTrendLineXYValues:function(sery){

            var xValues = [];
            var yValues = [];

            var points = sery.points;
            var isHorizontal = sery.baseAxis.isHorizontal();
            var valueAxis = sery.valueAxis;

            var bars = [];

            for(var i = 0, len = points.length; i < len; i++){
                var barShape = points[i];
                if(!barShape.isNull){
                    bars.push(barShape);
                }
            }

            bars.sort(function(a, b){

                return isHorizontal ? a.x - b.x : a.y - b.y;

            });

            bars.forEach(function(barShape){
                var x, y;

                if(isHorizontal){
                    x = barShape.x + barShape.width / 2;
                    y = valueAxis.isAxisReversed() ? barShape.y + barShape.height : barShape.y;
                }else{
                    x = valueAxis.isAxisReversed() ? barShape.x : barShape.x + barShape.width;
                    y = barShape.y + barShape.height/2;
                }

                xValues.push(x);
                yValues.push(y);
            });

            return [xValues, yValues, sery.baseAxis.getPosition()];
        },

        //创建水平或者垂直方向上的柱子
        _buildBars:function(locationMap){

            var sery = locationMap[0][0];

            var valueBased = sery.isValueAxisBased();

            valueBased ? this._calculateValueBasedPercentageAndTooltip(locationMap)
                                                        : this._calculateCategoryBasedPercentageAndTooltip(locationMap);


            var barSize = valueBased ? this._getValueBasedBarSize(locationMap):this._getBarSize(locationMap);

            var centerPos = barSize.centerPos;
            var barWidth = barSize.barWidth;

            var categoryAxis = locationMap[0][0].baseAxis;
            var isHorizontal = categoryAxis.getPosition() == Constants.LEFT
                || categoryAxis.getPosition() == Constants.RIGHT;

            for(var i = 0, len = locationMap.length; i < len; i++){
                var stackedSeries = locationMap[i];

                for(var j = 0, count = stackedSeries.length; j < count; j++){

                    var sery = stackedSeries[j];

                    for(var dIndex = 0, dCount = sery.points.length; dIndex < dCount; dIndex++){

                        var point = sery.points[dIndex];

                        var pos = categoryAxis.scale(point.category) + centerPos[i] - barWidth[i][j] / 2;

                        var valueAxis = point.series.valueAxis;

                        var value = point.y;
                        var preSum = point.y0;

                        var prePos = valueAxis.scale(preSum);
                        var currentPos = valueAxis.scale(value + preSum);
                        var barHeight = Math.abs(currentPos - prePos);

                        var strokeWidth = point.borderWidth;

                        var x = isHorizontal ? Math.min(prePos, currentPos) : pos;
                        var y = isHorizontal ? pos : Math.min(prePos, currentPos);
                        var width = isHorizontal ? barHeight : barWidth[i][j];
                        var height = isHorizontal ? barWidth[i][j] : barHeight;

                        width = Math.max(width, 0);
                        height = Math.max(height,0);

                        var tmpBar = BaseUtils.rectSubPixelOpt(x,y,width,height,strokeWidth);

                        QueryUtils.merge(point,
                            QueryUtils.merge(tmpBar,{
                                location:categoryAxis.getPosition(),
                                startPos:valueAxis.getStartPos(),
                                direction:this.getAnimationDirection(valueAxis, value)
                            },true),
                            true);
                    }
                }
            }
        },

        getAnimationDirection:function(valueAxis, value){

            var isPositive = value >= 0;

            if(valueAxis.isHorizontal()){
                return isPositive ^ valueAxis.isAxisReversed() ? Constants.LEFT_TO_RIGHT : Constants.RIGHT_TO_LEFT;
            }else{
                return isPositive ^ valueAxis.isAxisReversed() ? Constants.BOTTOM_TO_TOP : Constants.TOP_TO_BOTTOM;
            }
        },

        _getFixedPos:function(datum, divDim){

            var location = datum.location;

            var plotBounds = this.getPlotBounds();

            var x,y;
            if(location == Constants.TOP || location == Constants.BOTTOM){
                //柱形图
                x = plotBounds.x + datum.x + datum.width + TOOLTIP_GAP;
                y = plotBounds.y + datum.y;
            }else{
                //条形图
                x = plotBounds.x + datum.x + datum.width - divDim.width;
                y = plotBounds.y + datum.y + datum.height + TOOLTIP_GAP;
            }

            return [x, y];
        },

        mergeSeriesAttributes:function(sery){

            var seriesOption = [sery.seriesOption, this.option.plotOptions];

            QueryUtils.merge(sery, {
                width:QueryUtils.queryList(seriesOption, 'width')
            });

        },

        _getTotalDataPointCount:function(){

            var series = this.getVisibleChartData();
            var count = 0;
            for(var i = 0, len = series.length; i < len; i++){
                count += series[i].points.length;
            }

            return Math.max(count, 1);
        },

        _getValueBasedBarSize:function(locationMap){

            var baseAxis = locationMap[0][0].baseAxis;

            var count = this._getTotalDataPointCount();

            //处理柱子的大小
            var total = baseAxis.isHorizontal() ? baseAxis.bounds.width : baseAxis.bounds.height;
            var fixedBarWidth = this.fixedBarWidth ? this.fixedBarWidth : (total / count / 3);
            fixedBarWidth = Math.max(fixedBarWidth, MIN_BAR_SIZE);

            //缓存第一次计算的值
            this.fixedBarWidth = fixedBarWidth;

            var centerPos = [], barWidth = [];

            for(var i = 0, count = locationMap.length; i < count; i++){
                centerPos.push(0);

                for(var j = 0, len = locationMap[i].length; j < len; j++){

                    var sery = locationMap[i][j];

                    barWidth[i] = barWidth[i] || [];

                    barWidth[i].push(sery.width ? sery.width : Math.max(fixedBarWidth, MIN_BAR_SIZE));
                }
            }

            return {
                centerPos:centerPos,
                barWidth:barWidth
            }

        },

        _getBarSize:function(locationMap){

            var barCount = locationMap.length;

            var categoryAxis = locationMap[0][0].baseAxis;

            var tickLength = categoryAxis.getTickLength();

            var categoryGap = this.option.plotOptions.categoryGap || '20%';
            var gap = this.option.plotOptions.gap || '20%';

            categoryGap = this._getPercentValue(categoryGap, tickLength);

            var defaultWidth = (tickLength - categoryGap) / barCount;

            var start = categoryGap / 2;
            var centerPos = [];
            for(var i = 0; i < barCount; i++){
                centerPos.push(start + defaultWidth * (i + 0.5));
            }

            gap = this._getPercentValue(gap, defaultWidth);
            defaultWidth -= gap;

            var barWidth = [];
            for(var i = 0; i < barCount; i++){
                for(var j = 0, len = locationMap[i].length; j < len; j++){

                    var sery = locationMap[i][j];

                    barWidth[i] = barWidth[i] || [];

                    barWidth[i].push(sery.width ? sery.width : Math.max(defaultWidth, MIN_BAR_SIZE));
                }
            }

            return {
                centerPos:centerPos,
                barWidth:barWidth
            }
        },

        //计算标签的位置
        _calculateLabelPos:function(){
            var manager = new BoundsManager();
            var series = this.getVisibleChartData();
            var chart = this;

            series.forEach(function(sery){

                sery.points.forEach(function(point){

                    var dataLabels = point.dataLabels;
                    if(dataLabels && dataLabels.enabled){

                        if(dataLabels.align){
                            point.labelPos = chart._calculateAlignLabelPos(point, dataLabels.align);
                            manager.addBounds(BaseUtils.makeBounds(point.labelPos, point.labelDim));

                        }else{

                            var order = [Constants.CENTER, Constants.INSIDE, Constants.OUTSIDE];
                            for(var index = 0, len = order.length; index < len; index++){
                                var align = order[index];
                                var pos = chart._calculateAlignLabelPos(point, align);
                                if(!manager.isOverlapped(BaseUtils.makeBounds(pos, point.labelDim)) || align == Constants.OUTSIDE){
                                    point.labelPos = pos;
                                    manager.addBounds(BaseUtils.makeBounds(pos, point.labelDim));
                                    break;
                                }
                            }
                        }
                    }
                });

            });
        },

        _calculateAlignLabelPos:function(point, align){

            var labelDim = point.labelDim;

            var isVertical = point.location == Constants.TOP || point.location == Constants.BOTTOM;

            var isPositive = point.value >= 0;

            var sery = point.series;
            var valueAxis = sery.valueAxis;

            isPositive = isPositive ^ valueAxis.isAxisReversed();

            var centerX = point.x + point.width/2;
            var centerY = point.y + point.height/2;

            var x,y;

            switch (align){
                case Constants.CENTER:

                    x = centerX - labelDim.width/2;
                    y = centerY - labelDim.height/2;

                    break;
                case Constants.INSIDE:

                    if(isVertical){
                        x = centerX - labelDim.width/2;

                        y = isPositive ?
                        point.y + LABEL_GAP : point.y + point.height - LABEL_GAP - labelDim.height;

                    }else{

                        y = centerY - labelDim.height/2;

                        x = isPositive ?
                        point.x + point.width - LABEL_GAP - labelDim.width : point.x + LABEL_GAP;

                    }

                    break;
                case Constants.OUTSIDE:

                    if(isVertical){
                        x = centerX - labelDim.width/2;
                        y = isPositive ?
                        point.y - LABEL_GAP - labelDim.height : point.y + point.height + LABEL_GAP;
                    }else{

                        y = centerY - labelDim.height/2;

                        x = isPositive ?
                        point.x + point.width + LABEL_GAP : point.x - LABEL_GAP - labelDim.width;
                    }

                    break;
            }

            return {
                x:x,
                y:y
            }
        },

        getInitBarAttribute:function(d){

            var direction = d.direction || Constants.BOTTOM_TO_TOP;

            var left2right = {x: d.startPos, y: d.y, width: 0, height: d.height};
            var left2rightEnd = {x: d.startPos, y: d.y, width:d.x + d.width - d.startPos, height: d.height};

            var right2left = {x: d.startPos, y: d.y, width: 0, height: d.height};
            var right2leftEnd = {x: d.x, y: d.y, width: d.startPos - d.x, height: d.height};

            var bottom2top = {x: d.x, y: d.startPos, width: d.width, height: 0};
            var bottom2topEnd = {x: d.x, y: d.y, width: d.width, height: d.startPos - d.y};

            var top2bottom = {x: d.x, y: d.startPos, width: d.width, height: 0};
            var top2bottomEnd = {x: d.x, y: d.startPos, width: d.width, height: d.y + d.height - d.startPos};

            switch (direction){

                case Constants.BOTTOM_TO_TOP:
                    return  {
                        init:bottom2top,
                        end:bottom2topEnd
                    };

                case Constants.TOP_TO_BOTTOM:
                    return {
                        init:top2bottom,
                        end:top2bottomEnd
                    };

                case Constants.LEFT_TO_RIGHT:
                    return {
                        init:left2right,
                        end:left2rightEnd
                    };

                case Constants.RIGHT_TO_LEFT:
                    return {
                        init:right2left,
                        end:right2leftEnd
                    };

            };
        }

    };

    BaseUtils.inherit(Bar, BaseChart);

    require('../ChartLibrary').register(Constants.BAR_CHART, Bar);
    require('../ChartLibrary').register(Constants.COLUMN_CHART, Bar);

    return Bar;
});
/**
 * Created by eason on 15/7/17.
 */

define('chart/Line',['require','../Constants','../utils/BaseUtils','../utils/QueryUtils','./BaseChart','../ChartLibrary'],function(require){

    var Constants = require('../Constants');
    var BaseUtils = require('../utils/BaseUtils');
    var QueryUtils = require('../utils/QueryUtils');
    var BaseChart = require('./BaseChart');

    var DEFAULT_AREA_ALPHA = 0.35;

    var LABEL_GAP = 2;

    function Line(vanchart, option, chartType){
        BaseChart.call(this, vanchart, option, chartType);
        this.refresh(option);
    }

    Line.prototype = {
        constructor:Line,

        type:Constants.LINE_CHART,

        doLayout:function(){

            var locations2Series = this._buildLocationMap();

            for(var location in locations2Series){

                var location2Series = locations2Series[location];

                for(var i = location2Series.length - 1; i >= 0; i--) {

                    var sameAxisSeries = location2Series[i];

                    if(sameAxisSeries && sameAxisSeries.length) {

                        this._buildLines(sameAxisSeries);

                    }
                }
            }

            this._calculateLabelPos();
        },

        _buildLines:function(locationMap) {

            var large = this.option.plotOptions.large;

            var sery = locationMap[0][0];

            sery.isValueAxisBased() ? this._calculateValueBasedPercentageAndTooltip(locationMap)
                                        : this._calculateCategoryBasedPercentageAndTooltip(locationMap);

            var chart = this;
            for(var i = 0, count = locationMap.length; i < count; i++){
                var stackedSeries = locationMap[i];

                stackedSeries.forEach(function(series){

                    series.dataBands = chart._calculateDataBands(series);

                    var baseAxis = series.baseAxis;
                    var valueAxis = series.valueAxis;

                    var isHorizontal = series.location == Constants.LEFT || series.location == Constants.RIGHT;

                    series.points.forEach(function(point){
                        chart._positionFix(point, baseAxis, valueAxis, isHorizontal);
                    });

                    if(series.connectNulls){

                        var newPoints = [];

                        series.points.forEach(function(point){

                            if(!point.isNull){
                                newPoints.push(point);
                            }

                        });

                        series.points = newPoints;
                    }
                    if(large){
                        var xMap = {};
                        var yMap = {};
                        var largePoints = [];

                        series.points.forEach(function(point){

                            if(!xMap[point.x] || !yMap[point.y]){

                                largePoints.push(point);

                                xMap[point.x] = true;
                                yMap[point.y] = true;
                            }
                        });

                        largePoints.sort(function(pointA, pointB){
                            return pointA.x - pointB.x;
                        });

                        series.points = largePoints;

                    }else{

                        series.points.sort(function(pointA, pointB){
                            return pointA.x - pointB.x;
                        });
                    }

                });
            }
        },

        _positionFix:function(point, baseAxis, valueAxis, isHorizontal){

            var det = baseAxis.scale.rangeBand ? baseAxis.scale.rangeBand()/2 : 0;
            var t1 = Math.round(baseAxis.scale(point.category) + det);
            var t2 = valueAxis.scale(point.y + point.y0);
            var t3 = valueAxis.scale(point.y0);

            if(isHorizontal){
                point.y = t1;
                point.x = t2;
                point.x0 = t3;
            }else{
                point.x = t1;
                point.y = t2;
                point.y0 = t3;
            }
        },

        mergeDataPointAttributes:function(point){
            this._mergeMarkerAttributes(point);
        },

        mergeSeriesAttributes:function(lineSery){

            var plotOptions = this.option.plotOptions;
            var seriesOption = lineSery.seriesOption;

            //系列的一些属性
            var queryList = [seriesOption, plotOptions];
            var connectNulls = BaseUtils.pick(QueryUtils.queryList(queryList, 'connectNulls'), true);
            var lineWidth = QueryUtils.queryList(queryList, 'lineWidth') || 0;
            var color = QueryUtils.queryList(queryList, 'color') || this._getDefaultSeriesColor(lineSery.index);

            var fillColor = QueryUtils.queryList(queryList, 'fillColor');
            fillColor = fillColor ? (fillColor === true ? color : fillColor) : (fillColor === false ? '' : color);

            var fillColorOpacity = BaseUtils.pick(QueryUtils.queryList(queryList, 'fillColorOpacity') , DEFAULT_AREA_ALPHA);
            var stack = QueryUtils.queryList(queryList, 'stack');

            var interpolate = this._getSeriesInterpolate(seriesOption, plotOptions);
            var lineSvg = this._getLineSvg(interpolate);
            var areaSvg = this._getAreaSvg(interpolate);

            var points = [];

            QueryUtils.merge(lineSery,
                {
                    lineWidth: lineWidth,
                    color: color,
                    fillColor:fillColor,
                    fillColorOpacity:fillColorOpacity,
                    connectNulls:connectNulls,
                    lineSvg: lineSvg,
                    areaSvg:areaSvg,
                    points: points,
                    isStack:!!stack
                }
            );
        },

        _calculateDataBands:function(lineSery){

            var plotBounds = this.getPlotBounds();

            var dColor = lineSery.color;
            var dFillColor = lineSery.fillColor;
            var dFillColorOpacity = lineSery.fillColorOpacity;

            var bands = QueryUtils.queryList([lineSery.seriesOption, this.option.plotOptions], 'bands');

            var clipID = this.vanchart.getIDPrefix() + lineSery.className;

            var valueAxis = lineSery.valueAxis;

            var resultRanges = [];
            resultRanges.push({
                x:0,
                y:0,
                width:plotBounds.width,
                height:plotBounds.height,
                color:dColor,
                fillColor:dFillColor,
                fillColorOpacity:dFillColorOpacity,
                lineData:lineSery,
                clipID:clipID + '-1'
            });

            if(!bands){
                return resultRanges;
            }

            if(!BaseUtils.isArray(bands)){
                bands = [bands];
            }

            for(var i = 0, len = bands.length; i < len; i++){

                var x = 0, y = 0;
                var width = plotBounds.width;
                var height = plotBounds.height;

                var domain = valueAxis.scale.domain();

                var from = Math.max(domain[0], bands[i].from);
                var to = Math.min(domain[1], bands[i].to);

                from = valueAxis.scale(from);
                to = valueAxis.scale(to);

                var color = bands[i].color || dColor;
                var fillColor = bands[i].fillColor || dFillColor;
                var fillColorOpacity = bands[i].fillColorOpacity || dFillColorOpacity;

                if(valueAxis.isHorizontal()){
                    x = Math.min(from, to);
                    width = Math.abs(from - to);
                }else{
                    y = Math.min(from, to);
                    height = Math.abs(from - to);
                }

                resultRanges.push({
                    x:x,
                    y:y,
                    height:height,
                    width:width,
                    color:color,
                    lineData:lineSery,
                    fillColor:fillColor,
                    fillColorOpacity:fillColorOpacity,
                    clipID:clipID + i
                });
            }

            return resultRanges;
        },

        _getFixedPos:function(datum){

            var radius = datum.marker.radius || this.getDefaultMarkerRadius();

            var plotBounds = this.getPlotBounds();

            var x = plotBounds.x + datum.x + radius;
            var y = plotBounds.y + datum.y + radius;

            return [x, y];
        },

        _calculateLabelPos:function(){

            var lineData = this.getVisibleChartData();

            lineData.forEach(function(lineData){

                lineData.points.forEach(function(point){
                    var dataLabels = point.dataLabels;
                    if(dataLabels && dataLabels.enabled){
                        point.labelPos = {
                            x: point.x - point.labelDim.width/2,
                            y:point.y  - LABEL_GAP - point.labelDim.height
                        };
                    }
                });

            });
        },

        getTrendLineXYValues:function(sery){
            return this.getNormalTrendLineXYValues(sery);
        },

        getClosestPoint:function(pos){

            var selectedPoint;
            var minDistance = Number.MAX_VALUE;

            var lineData = this.vanchart.hoverSeries;

            var plotBounds = this.getPlotBounds();

            if(lineData && lineData.points){
                lineData.points.forEach(function(point){
                    var dis = Math.abs(point.x + plotBounds.x - pos[0]);
                    if(dis < minDistance && !point.isNull){
                        selectedPoint = point;
                        minDistance = dis;
                    }
                });
            }else{

                var series = this.vanchart.series;

                series.forEach(function(sery){

                    if(sery.points){
                        sery.points.forEach(function(point){
                            var dis = Math.abs(point.x + plotBounds.x - pos[0]);
                            if(dis < minDistance && !point.isNull){
                                selectedPoint = point;
                                minDistance = dis;
                            }
                        });
                    }
                });
            }

            return selectedPoint;
        }
    };

    BaseUtils.inherit(Line, BaseChart);

    require('../ChartLibrary').register(Constants.LINE_CHART, Line);

    return Line;
});
/**
 * Created by eason on 15/7/17.
 */

define('chart/Area',['require','../Constants','../utils/BaseUtils','./Line','../ChartLibrary'],function(require){

    var Constants = require('../Constants');
    var BaseUtils = require('../utils/BaseUtils');
    var Line = require('./Line');

    function Area(vanchart, option, chartType){
        Line.call(this, vanchart, option, chartType);
    }

    Area.prototype = {
        constructor:Area,

        type:Constants.AREA_CHART
    };

    BaseUtils.inherit(Area, Line);
    require('../ChartLibrary').register(Constants.AREA_CHART, Area);

    return Area;

});
/**
 * Created by eason on 15/12/2.
 */
define('chart/Gauge',['require','../Constants','../utils/BaseUtils','../utils/ColorUtils','./BaseChart','../utils/QueryUtils','../utils/BoundsManager','../ChartLibrary'],function(require){

    var Constants = require('../Constants');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var BaseChart = require('./BaseChart');
    var QueryUtils = require('../utils/QueryUtils');
    var BoundsManager = require('../utils/BoundsManager');

    //默认半径大小
    var DEFAULT_RADIUS = 100;
    var DEFAULT_PADDING = 5;

    var TICK_SIZE = 6;
    var TICK_LABEL_GAP = 4;
    var THERMOMETER_R = 5;

    var HORIZONTAL_GAP = 0.8;
    var VERTICAL_GAP = 0.3;
    var LINE_GAP = 0.3;

    function Gauge(vanchart, option, chartType){
        BaseChart.call(this, vanchart, option, chartType);
        this.refresh(option);
    }

    Gauge.prototype = {
        constructor:Gauge,

        doLayout:function(){

            var plotOptions = this.option.plotOptions;
            var layout = plotOptions.layout || Constants.HORIZONTAL_LAYOUT;

            var series = this.getVisibleChartData();
            var self = this;
            series.forEach(function(sery){

                //重置radius属性
                sery.radius = QueryUtils.queryList([sery.seriesOption, plotOptions], 'radius');

                var yAxis = sery.yAxis;
                var domain = yAxis.scale.domain();
                var defaultBands = self._getDefaultBands([sery.seriesOption, plotOptions], domain);

                sery.bands = BaseUtils.addArray(sery.bands, defaultBands);

                sery.points.forEach(function(point){
                    point.valueInDomain = BaseUtils.getValueInDomain(point.value, domain);

                    point.color = sery._getBandsColor(point) || point.color;

                    var queryList = [point.pointOption, sery.seriesOption, sery.chart.option.plotOptions];

                    point.mouseOverColor = QueryUtils.queryList(queryList, 'mouseOverColor') || ColorUtils.getHighLightColor(point.color);
                    point.clickColor = ColorUtils.getClickColor(point.color);
                });

                //过滤空值
                var points = sery.points;
                var result = [];
                for(var i = 0, len = points.length; i < len; i++){
                    if(!points[i].isNull){
                        result.push(points[i]);
                    }
                }
                sery.points = result;

                self._dealStackedPoints(sery.points);
            });

            this._dealGaugeLabels();

            this._fixCenterAndSize(layout);
        },

        mergeSeriesAttributes:function(series){

            var plotOptions = this.option.plotOptions;

            var queryList = [series.seriesOption, plotOptions];

            var style = QueryUtils.queryList(queryList, 'style') || Constants.GAUGE_POINTER;
            var themeConfig = this.vanchart.themeConfig;
            var styleConfig = themeConfig[style] || themeConfig[Constants.GAUGE_POINTER];
            var seriesLabel = QueryUtils.queryList(queryList, 'seriesLabel') || {};
            var valueLabel = QueryUtils.queryList(queryList, 'valueLabel') || {};
            var percentageLabel = QueryUtils.queryList(queryList, 'percentageLabel') || {};
            var needle = QueryUtils.queryList(queryList, 'needle');
            var hinge = QueryUtils.queryList(queryList, 'hinge');
            var clockwise = QueryUtils.queryList(queryList, 'clockwise');
            var hingeBackgroundColor = QueryUtils.queryList(queryList, 'hingeBackgroundColor');
            var paneBackgroundColor = QueryUtils.queryList(queryList, 'paneBackgroundColor');
            var slotBackgroundColor = QueryUtils.queryList(queryList, 'slotBackgroundColor');
            var innerPaneBackgroundColor = QueryUtils.queryList(queryList, 'innerPaneBackgroundColor');
            var thermometerLayout = QueryUtils.queryList(queryList, 'thermometerLayout');

            var bands = QueryUtils.queryList(queryList, 'bands') || [];

            QueryUtils.merge(series,
                {
                    style : style,
                    bands:bands,
                    center : QueryUtils.queryList(queryList, 'center'),
                    radius : QueryUtils.queryList(queryList, 'radius'),
                    seriesLabel : QueryUtils.merge(seriesLabel, styleConfig.seriesLabel),
                    valueLabel : QueryUtils.merge(valueLabel, styleConfig.valueLabel),
                    percentageLabel : QueryUtils.merge(percentageLabel, styleConfig.percentageLabel),
                    needle : needle || styleConfig.needle,
                    hinge : hinge || styleConfig.hinge,
                    thermometerLayout:thermometerLayout || styleConfig.thermometerLayout,
                    clockwise:BaseUtils.pick(clockwise, styleConfig.clockwise),
                    hingeBackgroundColor : hingeBackgroundColor || styleConfig.hingeBackgroundColor,
                    paneBackgroundColor : paneBackgroundColor || styleConfig.paneBackgroundColor,
                    slotBackgroundColor: slotBackgroundColor || styleConfig.slotBackgroundColor,
                    innerPaneBackgroundColor: innerPaneBackgroundColor || styleConfig.innerPaneBackgroundColor
                }
            );
        },

        _getDefaultBands:function(queryList, domain){

            var color = QueryUtils.queryList(queryList, 'color');
            var bands = [];

            if(color){
                bands.push({
                    from:domain[0],
                    to:domain[1],
                    color:color
                });
            }else{
                var min = domain[0];
                var max = domain[1];
                var band = BaseUtils.accDiv((max - min), 3);
                var fStop = BaseUtils.accAdd(min, band);
                var sStop = BaseUtils.accAdd(fStop, band);
                var colors = this.option.colors;

                bands = [
                    {
                        from:min,
                        to:fStop,
                        color:colors[0]
                    },
                    {
                        from:fStop,
                        to:sStop,
                        color:colors[1]
                    },
                    {
                        from:sStop,
                        to:max,
                        color:colors[2]
                    }];
            }

            return bands;
        },

        _calculatePercentage:function(points){

            if(points.length){

                var yAxis = points[0].series.yAxis;

                var minMax = yAxis.scale.domain();

                points.forEach(function(point){

                    point.percentage = (point.value - minMax[0]) / (minMax[1] - minMax[0]);

                });

            }

        },

        _dealGaugeLabels:function(){

            var self = this;

            var gaugeData = this.getVisibleChartData();

            gaugeData.forEach(function(singleGauge){

                var style = singleGauge.style;

                //分类标签
                if(style == Constants.GAUGE_POINTER || style == Constants.GAUGE_POINTER_SEMI){

                    singleGauge.seriesLabelContent = '';
                    singleGauge.seriesLabelDim = {width:0, height:0};

                    if(singleGauge.seriesLabel && singleGauge.seriesLabel.enabled && singleGauge.points[0]){

                        var style = singleGauge.seriesLabel.style;

                        var labelInfo = singleGauge.points[0]._calculateLabelInfo(singleGauge.seriesLabel);

                        var labelContent = labelInfo.labelContent;
                        var labelDim = labelInfo.labelDim;

                        singleGauge.seriesLabelContent = labelContent[0] ? labelContent[0].text : '';
                        singleGauge.seriesLabelStyle = style;
                        singleGauge.seriesLabelDim = labelDim;
                    }

                }else{
                    //百分比
                    singleGauge.percentageLabelContent = '';
                    singleGauge.percentageLabelDim = {width:0, height:0};

                    if(singleGauge.percentageLabel && singleGauge.percentageLabel.enabled && singleGauge.points[0]){

                        var labelStyle = BaseUtils.clone(singleGauge.percentageLabel.style);

                        if(!labelStyle.color){
                            labelStyle.color = singleGauge.points[0].color;
                        }

                        var labelInfo = singleGauge.points[0]._calculateLabelInfo(singleGauge.percentageLabel);
                        var labelContent = labelInfo.labelContent;
                        var labelDim = labelInfo.labelDim;

                        singleGauge.percentageLabelContent = labelContent[0] ? labelContent[0].text : '';
                        singleGauge.percentageLabelStyle = labelStyle;
                        singleGauge.percentageLabelDim = labelDim;
                    }

                }

                singleGauge.valueLabelContent = '';
                singleGauge.valueLabelDim = {width:0, height:0};

                if(singleGauge.valueLabel && singleGauge.valueLabel.enabled){
                    singleGauge.valueLabelContent = self._fixValueLabelContent(singleGauge);
                }

            });

        },

        _fixValueLabelContent:function(gauge){

            var valueLabel = gauge.valueLabel;
            var style = valueLabel.style;
            var useHtml = valueLabel.useHtml;
            var formatter = valueLabel.formatter;

            var valueLabelContent = [];

            if(gauge.style == Constants.GAUGE_POINTER
                || gauge.style == Constants.GAUGE_POINTER_SEMI
                    || gauge.style == Constants.GAUGE_RING
                        || gauge.style == Constants.GAUGE_THERMOMETER){
                for(var i = 0, len = gauge.points.length; i < len; i++){
                    var point = gauge.points[i];
                    var labelContent = this._calculateSingleLineLabelContent(formatter, point);
                    var labelDim = BaseUtils.getTextDimension(labelContent, style, useHtml);

                    valueLabelContent.push({
                        labelContent:labelContent,
                        labelDim:labelDim,
                        labelStyle:style
                    });
                }
            }else if(gauge.points[0]){
                var labelContent = this._createMultiLineLabelContent(formatter, gauge.points[0]);
                var labelStyle = valueLabel.style;
                for(var i = 0, len = labelContent.length; i < len; i++){
                    valueLabelContent.push({
                        labelContent:labelContent[i],
                        labelStyle:labelStyle,
                        labelDim:BaseUtils.getTextDimension(labelContent[i], labelStyle, useHtml)
                    });
                }
            }

            return valueLabelContent;
        },

        orderData:function(){

            var series = this.vanchart.series;

            var chart = this;

            series.sort(function(seryA, seryB){

                var totalA = seryA.getSeryTotalValue();

                var totalB = seryB.getSeryTotalValue();

                return chart.option.orderType == Constants.ASCENDING ? totalA - totalB : totalB - totalA;

            });
        },

        _getColorFromBands:function(value, bands){

            if(bands && bands.length){

                for(var i = 0, len = bands.length; i < len; i++){

                    var band = bands[i];

                    var min = Math.min(band.from, band.to);
                    var max = Math.max(band.from, band.to);

                    if(value >= min && value <= max){
                        return band.color;
                    }
                }
            }

        },

        _fixCenterAndSize:function(layout){

            var gaugeData = this.getVisibleChartData();

            //确定圆心位置的算作悬浮元素,给默认的大小
            for(var i = 0, len = gaugeData.length; i < len; i++){
                var singleGauge = gaugeData[i];

                if(singleGauge.center){
                    var centerX = singleGauge.center[0];
                    var centerY = singleGauge.center[1];

                    if(centerX.indexOf('%') != -1){
                        centerX = this._getPercentValue(centerX, this.vanchart.chartWidth());
                    }

                    if(centerY.indexOf('%') != -1){
                        centerY = this._getPercentValue(centerY, this.vanchart.chartHeight());
                    }

                    singleGauge.centerX = centerX;
                    singleGauge.centerY = centerY;
                    singleGauge.radius = singleGauge.radius || DEFAULT_RADIUS;
                }
            }

            layout == Constants.HORIZONTAL_LAYOUT ?
                            this._dealHorizontalLayout() : this._dealVerticalLayout();


            //确定边界以后确定圆心位置
            var self = this;
            gaugeData.forEach(function(singleGauge){

                if(!singleGauge.center){

                    var style = singleGauge.style;

                    switch (style){
                        case Constants.GAUGE_POINTER:
                            self._fixPointerCenter(singleGauge);
                            break;

                        case Constants.GAUGE_POINTER_SEMI:
                            self._fixPointerSemiCenter(singleGauge);
                            break;

                        case Constants.GAUGE_SLOT:
                            self._fixSlotCenter(singleGauge);
                            break;

                        case Constants.GAUGE_THERMOMETER:
                            self._fixThermometerCenter(singleGauge);
                            break;

                        case Constants.GAUGE_RING:
                            self._fixRingCenter(singleGauge);
                            break;

                    }
                }

            });
        },

        _fixPointerCenter:function(gauge){

            var bounds = gauge.bounds;
            var labelHeight = 20 + gauge.seriesLabelDim.height;

            var usedHeight = bounds.height - labelHeight;

            var align = gauge.seriesLabel.align || Constants.BOTTOM;

            var centerX = bounds.x + bounds.width/2;
            var centerY = bounds.y + bounds.height/2;
            var radius = Math.min(bounds.width, usedHeight)/2 - DEFAULT_PADDING;

            if(align == Constants.BOTTOM){

                if(centerY + radius + labelHeight > bounds.y + bounds.height){

                    var gap = bounds.height - (radius * 2 + labelHeight);

                    if(gap >= 0){
                        centerY = bounds.y + radius + gap / 2;
                    }
                }

            }else{

                if(centerY - radius - labelHeight < bounds.y){

                    var gap = bounds.height - (radius * 2 + labelHeight);

                    if(gap >= 0){
                        centerY = bounds.y + radius + labelHeight + gap / 2;
                    }

                }
            }


            if(gauge.seriesLabelContent){
                var dim = gauge.seriesLabelDim;

                gauge.seriesLabelPos = {
                    x: -dim.width/2,
                    y:align == Constants.BOTTOM ? (radius+20) : (-radius-20-dim.height)
                }
            }

            if(gauge.valueLabelContent){
                var yAxis = gauge.yAxis;
                var axisOption = yAxis.componentOption;
                var domain = yAxis.scale.domain();
                var scale = d3.scale.linear().domain(domain)
                                        .range([BaseUtils.toRadian(-150), BaseUtils.toRadian(150)]);
                var tickHeight = BaseUtils.getTextHeight(axisOption.labelStyle);

                var startY = 0.16 * radius + tickHeight/2;
                var labelR = (1 - 0.05 - 0.1) * radius;
                var endY = labelR * Math.cos(Math.PI/6) - 2 * tickHeight;

                this._dealValueLabelContent(gauge, radius, scale, startY, endY);
            }

            gauge.centerX = centerX;
            gauge.centerY = centerY;
            gauge.radius = radius;
        },

        _getPointerTickBoundsManager:function(yAxis, radius, scale, tickHeight){

            var manager = new BoundsManager();

            var labelR = (1 - 0.05 - 0.1 - 0.01) * radius;

            var tickData = yAxis.getTickData();

            var gap = tickHeight * 0.5;

            var self = this;

            tickData.forEach(function(tick){

                var center = self._getPointerTickCenter(tick, labelR, scale);

                manager.addBounds({
                    x:center.x - tick.tickDim.width/2 - gap,
                    y:center.y - tick.tickDim.height/2 - gap,
                    width:tick.tickDim.width + gap,
                    height:tick.tickDim.height + gap
                })
            });

            var minorTickData = yAxis.getMinorTickData();

            var minorTickR = (1 - 0.05 - 0.1) * radius;
            var minorTickSize = 0.1 * radius;

            minorTickData.forEach(function(minorTickValue){

                var radian = scale(minorTickValue);

                var point = self._getArcPoint(minorTickR, radian);

                var x, y;
                if(radian < Math.PI){
                    //右边
                    x = point[0];
                    y = point[1];

                }else{
                    //左边
                    x = point[0] - minorTickSize;
                    y = point[1];
                }

                manager.addBounds({
                    x:x,
                    y:y,
                    width:minorTickSize,
                    height:minorTickSize
                });
            });

            return manager;
        },

        //指针仪表盘刻度标签相对于圆心的标签中心的位置
        _getPointerTickCenter:function(tick, labelR, scale){

            var radian = scale(tick.tickValue);

            var joinPoint = this._getArcPoint(labelR, radian);
            var x = joinPoint[0];
            var y = joinPoint[1];

            var tickDim = tick.tickDim;

            var angle = Math.atan(tickDim.width / tickDim.height);

            var labelCenterX, labelCenterY;
            if(Math.abs(radian) < angle){

                var gap = tickDim.height/2;
                labelCenterX = x + gap * x / y;
                labelCenterY = y + gap;

            }else if(radian >= angle && radian <= (Math.PI - angle)){//右

                var gap = tickDim.width/2;
                labelCenterX = x - gap;
                labelCenterY = y - gap * y / x;

            }else if(radian >= angle - Math.PI && radian <= -angle){//左

                var gap = tickDim.width/2;
                labelCenterX = x + gap;
                labelCenterY = y + gap * y / x;

            }else{
                //下
                var gap = tickDim.height/2;
                labelCenterX = x - gap * x / y;
                labelCenterY = y - gap;
            }

            return {
                x:labelCenterX,
                y:labelCenterY
            }

        },

        _fixPointerSemiCenter:function(gauge){

            var bounds = gauge.bounds;
            var labelHeight = 20 + gauge.seriesLabelDim.height;
            var align = gauge.seriesLabel.align;

            var usedHeight = bounds.height - labelHeight;
            var radius = Math.min(bounds.width/2, usedHeight/1.14) - DEFAULT_PADDING;

            var centerX = bounds.x + bounds.width/2;
            var centerY = bounds.y + bounds.height/2 + radius / 2;

            if(align == Constants.BOTTOM){

                if(centerY + 0.14 * radius + labelHeight > bounds.y + bounds.height){

                    var gap = bounds.height - (radius * 1.14 + labelHeight);

                    if(gap >= 0){
                        centerY = bounds.y + radius + gap / 2;
                    }
                }

            }else{

                if(centerY - radius - labelHeight < bounds.y){

                    var gap = bounds.height - (radius * 1.14 + labelHeight);

                    if(gap >= 0){
                        centerY = bounds.y + radius + labelHeight + gap / 2;
                    }

                }
            }


            if(gauge.seriesLabelContent){
                var dim = gauge.seriesLabelDim;

                gauge.seriesLabelPos = {
                    x: -dim.width/2,
                    y:align == Constants.BOTTOM ? (radius * 0.14 + 20) : (-radius-20-dim.height)
                }
            }

            if(gauge.valueLabelContent){

                var yAxis = gauge.yAxis;
                var axisOption = yAxis.componentOption;
                var domain = yAxis.scale.domain();
                var scale = d3.scale.linear().domain(domain)
                    .range([BaseUtils.toRadian(-90), BaseUtils.toRadian(90)]);

                var tickHeight = BaseUtils.getTextHeight(axisOption.labelStyle);
                var labelR = (1 - 0.05 - 0.1) * radius;
                var startY = -(labelR  - 2 * tickHeight);
                var endY = -(0.11 * radius + tickHeight/2);

                this._dealValueLabelContent(gauge, radius, scale, startY, endY);
            }

            gauge.centerX = centerX;
            gauge.centerY = centerY;
            gauge.radius = radius;
        },

        _dealValueLabelContent:function(gauge, radius, scale, startY, endY){
            var yAxis = gauge.yAxis;
            var axisOption = yAxis.componentOption;
            var tickHeight = BaseUtils.getTextHeight(axisOption.labelStyle);
            var valueLabelStyle = gauge.valueLabel.style;
            var useHtml = gauge.valueLabel.useHtml;
            var valueLabelHeight = BaseUtils.getTextHeight(valueLabelStyle);

            var boundsManager = this._getPointerTickBoundsManager(yAxis, radius, scale, tickHeight);

            var count = gauge.valueLabelContent.length;

            var totalHeight = endY - startY;

            count = Math.min(Math.floor((totalHeight - valueLabelHeight/2)/(3 * valueLabelHeight/2)), count);
            count = Math.max(0, count);

            //只显示count个标签
            gauge.valueLabelContent.length = count;

            var totalHeight = valueLabelHeight * count + (count - 1) * valueLabelHeight/2;

            startY = (endY - startY - totalHeight)/2 + startY;

            var valueBackgroundY = startY - valueLabelHeight/2;
            var valueBackgroundX = Number.MAX_VALUE;

            for(var i = 0; i < count; i++){
                var singleLabel = gauge.valueLabelContent[i];

                var x = -singleLabel.labelDim.width/2;

                var tmpX = Math.min(x - valueLabelHeight/4, valueBackgroundX);

                var tmpBounds = {
                    x:tmpX,
                    y:valueBackgroundY,
                    width:2 * Math.abs(tmpX),
                    height:startY + valueLabelHeight * (1 + LINE_GAP) - valueBackgroundY
                };

                var singleLabelContent = singleLabel.labelContent;
                var hasClipped = false;
                while(boundsManager.isOverlapped(tmpBounds) && singleLabelContent.length){
                    singleLabelContent = singleLabelContent.substr(0, Math.floor(singleLabelContent.length * 0.9));
                    var tmpDim = BaseUtils.getTextDimension(singleLabelContent + '...', valueLabelStyle, useHtml);
                    x = -tmpDim.width/2;

                    tmpX = Math.min(x - valueLabelHeight/4, valueBackgroundX);

                    tmpBounds = {
                        x:tmpX,
                        y:valueBackgroundY,
                        width:2 * Math.abs(tmpX),
                        height:startY + valueLabelHeight * (1 + LINE_GAP) - valueBackgroundY
                    };

                    hasClipped = true;
                }

                if(hasClipped){
                    singleLabel.labelContent = singleLabelContent + '...';
                    singleLabel.labelDim = BaseUtils.getTextDimension(singleLabel.labelContent, valueLabelStyle, useHtml);
                    x = -singleLabel.labelDim.width/2;
                    tmpX = Math.min(x - valueLabelHeight/4, valueBackgroundX);
                }

                singleLabel.labelPos = {
                    x:x,
                    y:startY
                };

                startY += valueLabelHeight * (1 + LINE_GAP);

                valueBackgroundX = tmpX;
            }

            gauge.valueLabelBackground = {
                x:valueBackgroundX,
                y:valueBackgroundY,
                width:2 * Math.abs(valueBackgroundX),
                height:totalHeight + valueLabelHeight
            };
        },

        _fixSlotCenter:function(gauge){

            var bounds = gauge.bounds;

            var radius = Math.min(bounds.width/2, bounds.height/2);

            //刻度槽的宽度是0.16倍的半径
            radius = radius/1.08 - DEFAULT_PADDING;

            var centerX = bounds.x + bounds.width/2;
            var centerY = bounds.y + bounds.height/2;

            if(gauge.percentageLabelContent && gauge.valueLabelContent){

                gauge.percentageLabelPos = {
                    x:-gauge.percentageLabelDim.width/2,
                    y:-gauge.percentageLabelDim.height * (1 + LINE_GAP)
                };

                var startY = 0;
                for(var i = 0, count = gauge.valueLabelContent.length; i < count; i++){

                    var valueLabel = gauge.valueLabelContent[i];

                    valueLabel.labelPos = {
                        x:-valueLabel.labelDim.width/2,
                        y:startY
                    };

                    startY += (valueLabel.labelDim.height * (1 + LINE_GAP))
                }

            }else if(gauge.percentageLabelContent){

                gauge.percentageLabelPos = {
                    x:-gauge.percentageLabelDim.width/2,
                    y:-gauge.percentageLabelDim.height/2
                };

            }else if(gauge.valueLabelContent){

                var labelHeight = BaseUtils.getTextHeight(gauge.valueLabel.style);
                var labelCount = gauge.valueLabelContent.length;

                var totalHeight = labelHeight * labelCount + labelHeight * (labelCount - 1) / 2;

                var startY = - totalHeight / 2;

                for(var i = 0; i < labelCount; i++){

                    var valueLabel = gauge.valueLabelContent[i];

                    valueLabel.labelPos = {
                        x:-valueLabel.labelDim.width/2,
                        y:startY
                    };
                    startY += (labelHeight * (1 + LINE_GAP));
                }
            }

            gauge.centerX = centerX;
            gauge.centerY = centerY;
            gauge.radius = radius;

        },

        _fixThermometerCenter:function(gauge){

            var para = gauge.thermometerLayout == Constants.HORIZONTAL_LAYOUT ?
                            this._fixHorizontalThermometerCenter(gauge) : this._fixVerticalThermometerCenter(gauge);

            var centerX = para.centerX;
            var centerY = para.centerY;
            var radius = para.radius;
            var showValueLabel = gauge.valueLabelContent ? gauge.valueLabelContent[0] : null;

            if(gauge.percentageLabelContent){
                gauge.percentageLabelPos.x -= centerX;
                gauge.percentageLabelPos.y -= centerY;

                //与底边对齐
                gauge.percentageLabelPos.y = Math.min(gauge.percentageLabelPos.y, radius - gauge.percentageLabelDim.height);
            }

            if(showValueLabel){
                showValueLabel.labelPos.x -= centerX;
                showValueLabel.labelPos.y -= centerY;

                var gap = (radius - showValueLabel.labelDim.height) - showValueLabel.labelPos.y;

                //与底边对齐
                if(gap < 0){
                    showValueLabel.labelPos.y += gap;

                    if(gauge.percentageLabelContent){
                        gauge.percentageLabelPos.y += gap;
                    }
                }
            }

            gauge.centerX = centerX;
            gauge.centerY = centerY;
            gauge.radius = radius;
        },

        _fixHorizontalThermometerCenter:function(gauge){

            var bounds = gauge.bounds;

            var percentageLabel = gauge.percentageLabel;
            var valueLabel = gauge.valueLabel;
            var yAxis = gauge.yAxis;
            var showValueLabel = gauge.valueLabelContent ? gauge.valueLabelContent[0] : null;

            var centerX, centerY, radius;

            var totalHeight = this._getThermometerSize(gauge);

            centerX = bounds.x + bounds.width/2;
            radius = bounds.width/2 - yAxis.getMaxTickWidth() - DEFAULT_PADDING;

            var startY = bounds.y + (bounds.height - totalHeight)/2;

            if(gauge.percentageLabelContent || showValueLabel){
                if(gauge.percentageLabelContent && showValueLabel
                    && percentageLabel.align == Constants.TOP && valueLabel.align == Constants.TOP){

                    gauge.percentageLabelPos = {
                        x: -gauge.percentageLabelDim.width/2 + centerX,
                        y:startY
                    };

                    startY += (gauge.percentageLabelDim.height * (1 + LINE_GAP));

                    showValueLabel.labelPos = {
                        x: -showValueLabel.labelDim.width/2 + centerX,
                        y:startY
                    };

                    startY += (showValueLabel.labelDim.height * (1 + HORIZONTAL_GAP));

                }else{

                    if(gauge.percentageLabelContent && percentageLabel.align == Constants.TOP){


                        gauge.percentageLabelPos = {
                            x: -gauge.percentageLabelDim.width/2 + centerX,
                            y:startY
                        };

                        startY += (gauge.percentageLabelDim.height * (1 + HORIZONTAL_GAP));
                    }

                    if(showValueLabel && valueLabel.align == Constants.TOP){

                        showValueLabel.labelPos = {
                            x: -showValueLabel.labelDim.width/2 + centerX,
                            y:startY
                        };

                        startY += (showValueLabel.labelDim.height * (1 + HORIZONTAL_GAP));
                    }
                }
            }

            startY += (yAxis.getTickHeight() + TICK_LABEL_GAP + TICK_SIZE + TICK_LABEL_GAP + THERMOMETER_R * 2);

            centerY = startY - 5;

            if(gauge.percentageLabelContent || showValueLabel){

                if(gauge.percentageLabelContent && showValueLabel
                    && percentageLabel.align == Constants.BOTTOM && valueLabel.align == Constants.BOTTOM){
                    startY += (gauge.percentageLabelDim.height * HORIZONTAL_GAP);

                    gauge.percentageLabelPos = {
                        x: -gauge.percentageLabelDim.width/2 + centerX,
                        y:startY
                    };

                    startY += (gauge.percentageLabelDim.height * (1 + LINE_GAP));

                    showValueLabel.labelPos = {
                        x: -showValueLabel.labelDim.width/2 + centerX,
                        y:startY
                    };

                }else{

                    if(gauge.percentageLabelContent && percentageLabel.align == Constants.BOTTOM){

                        startY += (gauge.percentageLabelDim.height * HORIZONTAL_GAP);

                        gauge.percentageLabelPos = {
                            x: -gauge.percentageLabelDim.width/2 + centerX,
                            y:startY
                        };

                    }

                    if(showValueLabel && valueLabel.align == Constants.BOTTOM){

                        startY += (showValueLabel.labelDim.height * HORIZONTAL_GAP);

                        showValueLabel.labelPos = {
                            x: -showValueLabel.labelDim.width/2 + centerX,
                            y:startY
                        };

                    }
                }

            }

            return {
                centerX:centerX,
                centerY:centerY,
                radius:radius
            }
        },

        _fixVerticalThermometerCenter:function(gauge){

            var centerX, centerY, radius;

            var bounds = gauge.bounds;

            var percentageLabel = gauge.percentageLabel;
            var valueLabel = gauge.valueLabel;
            var yAxis = gauge.yAxis;

            var point = gauge.points[0] || {};
            var domain = yAxis.scale.domain();
            var showValueLabel = gauge.valueLabelContent ? gauge.valueLabelContent[0] : null;

            //纵向布局
            var totalWidth = this._getThermometerSize(gauge);

            var startX = bounds.x + (bounds.width - totalWidth)/2;
            centerY = bounds.y + bounds.height/2;

            radius = bounds.height/2 - yAxis.getTickHeight() - DEFAULT_PADDING;

            var scale = d3.scale.linear().domain(domain).range([radius, -radius]);
            var labelY = centerY + scale(point.valueInDomain);

            if(gauge.percentageLabelDim){
                labelY -= gauge.percentageLabelDim.height/3;//差不多居中的位置
            }

            if(gauge.percentageLabelContent || showValueLabel){

                if(gauge.percentageLabelContent && showValueLabel
                    && percentageLabel.align == Constants.LEFT && valueLabel.align == Constants.LEFT){

                    startX += Math.max(gauge.percentageLabelDim.width, showValueLabel.labelDim.width);

                    gauge.percentageLabelPos = {
                        x:startX - gauge.percentageLabelDim.width,
                        y:labelY
                    };

                    showValueLabel.labelPos = {
                        x:startX - showValueLabel.labelDim.width,
                        y:labelY + gauge.percentageLabelDim.height * (1 + LINE_GAP)
                    };

                    startX += LINE_GAP * Math.max(gauge.percentageLabelDim.height, showValueLabel.labelDim.height);

                }else{

                    if(gauge.percentageLabelContent && percentageLabel.align == Constants.LEFT){

                        gauge.percentageLabelPos = {
                            x:startX,
                            y:labelY
                        };

                        startX += (gauge.percentageLabelDim.width + LINE_GAP * gauge.percentageLabelDim.height);
                    }

                    if(showValueLabel && valueLabel.align == Constants.LEFT){

                        showValueLabel.labelPos = {
                            x:startX,
                            y:labelY
                        };

                        startX += (showValueLabel.labelDim.width + LINE_GAP * showValueLabel.labelDim.height);
                    }
                }
            }

            centerX = startX + THERMOMETER_R;

            startX += (THERMOMETER_R * 2 + TICK_LABEL_GAP + TICK_SIZE + TICK_LABEL_GAP + yAxis.getMaxTickWidth());

            if(gauge.percentageLabelContent || showValueLabel){
                if(gauge.percentageLabelContent && showValueLabel
                    && percentageLabel.align == Constants.RIGHT && valueLabel.align == Constants.RIGHT){

                    startX += LINE_GAP * Math.max(gauge.percentageLabelDim.height, showValueLabel.labelDim.height);

                    gauge.percentageLabelPos = {
                        x:startX,
                        y:labelY
                    };

                    showValueLabel.labelPos = {
                        x:startX,
                        y:labelY + gauge.percentageLabelDim.height * (1 + LINE_GAP)
                    };

                }else{

                    if(gauge.percentageLabelContent && percentageLabel.align == Constants.RIGHT){
                        gauge.percentageLabelPos = {
                            x:startX + LINE_GAP * gauge.percentageLabelDim.height,
                            y:labelY
                        };
                    }

                    if(showValueLabel && valueLabel.align == Constants.RIGHT){

                        showValueLabel.labelPos = {
                            x:startX + LINE_GAP * showValueLabel.labelDim.height,
                            y:labelY
                        };

                    }
                }
            }

            return {
                centerX:centerX,
                centerY:centerY,
                radius:radius
            }
        },

        _fixRingCenter:function(gauge){

            var bounds = gauge.bounds;

            var radius = Math.min(bounds.width/2, bounds.height/2) - DEFAULT_PADDING;
            var centerX = bounds.x + bounds.width/2;
            var centerY = bounds.y + bounds.height/2;

            var totalHeight = 0;
            var valueLabel = gauge.valueLabelContent ? gauge.valueLabelContent[0] : null;
            if(gauge.percentageLabelContent && valueLabel){
                totalHeight = gauge.percentageLabelDim.height * (1 + LINE_GAP) + valueLabel.labelDim.height;
            }else if(gauge.percentageLabelContent){
                totalHeight = gauge.percentageLabelDim.height;
            }else if(valueLabel){
                totalHeight = valueLabel.labelDim.height;
            }

            var startY = -totalHeight/2;

            if(gauge.percentageLabelContent){
                gauge.percentageLabelPos = {
                    x: -gauge.percentageLabelDim.width/2,
                    y:startY
                };

                startY += gauge.percentageLabelDim.height * (1 + LINE_GAP);
            }

            if(valueLabel){
                valueLabel.labelPos = {
                    x:-valueLabel.labelDim.width/2,
                    y:startY
                };
            }

            gauge.centerX = centerX;
            gauge.centerY = centerY;
            gauge.radius = radius;
        },

        _dealHorizontalLayout:function(){

            //先要判断是否都是纵向布局的试管,是的话平均分
            var isEqualThermometer = true;

            var usedSize = 0;
            var fixedSize = 0;

            var gaugeData = this.getVisibleChartData();

            gaugeData.forEach(function(singleGauge){
                if(!singleGauge.center){

                    if(singleGauge.style != Constants.GAUGE_THERMOMETER
                        || singleGauge.thermometerLayout == Constants.HORIZONTAL_LAYOUT){

                        if(singleGauge.radius){
                            usedSize += (singleGauge.radius * 2);
                            fixedSize++;
                        }else{
                            isEqualThermometer = false;
                        }

                    }

                }
            });

            if(!isEqualThermometer){
                var self = this;
                gaugeData.forEach(function(singleGauge){

                    if(!singleGauge.center
                        && singleGauge.style == Constants.GAUGE_THERMOMETER
                        && singleGauge.thermometerLayout == Constants.VERTICAL_LAYOUT){

                        usedSize += (self._getThermometerSize(singleGauge));
                        fixedSize ++;

                    }
                });
            }

            //平均半径
            var plotBounds = this.vanchart.getPlotBounds();
            var averageRadius = plotBounds.width / Math.max(1, gaugeData.length - fixedSize);
            averageRadius /= 2;

            var leftBounds = {
                x:0,
                y:0,
                width:plotBounds.width,
                height:plotBounds.height
            };

            for(var i = 0, len = gaugeData.length; i < len; i++){

                var singleGauge = gaugeData[i];

                if(!singleGauge.center){

                    var size = 0;

                    if(singleGauge.style == Constants.GAUGE_THERMOMETER){

                        if(singleGauge.thermometerLayout == Constants.HORIZONTAL_LAYOUT){

                            size = (singleGauge.radius || averageRadius) * 2;

                            singleGauge.bounds = {
                                x:leftBounds.x,
                                y:leftBounds.y,
                                width:size,
                                height:leftBounds.height
                            };

                            leftBounds.x += size;
                            leftBounds.width -= size;

                        }else{

                            if(isEqualThermometer){
                                size = averageRadius * 2;
                            }else{
                                size = this._getThermometerSize(singleGauge);
                            }

                            var height = singleGauge.radius ? singleGauge.radius * 2 : leftBounds.height;

                            height = Math.min(height, leftBounds.height);

                            singleGauge.bounds = {
                                x:leftBounds.x,
                                y:leftBounds.y,
                                width:size,
                                height:height
                            };

                            leftBounds.x += size;
                            leftBounds.width -= size;
                        }

                    }else{

                        size = (singleGauge.radius || averageRadius) * 2;

                        singleGauge.bounds = {
                            x:leftBounds.x,
                            y:leftBounds.y,
                            width:size,
                            height:leftBounds.height
                        };

                        leftBounds.x += size;
                        leftBounds.width -= size;
                    }
                }
            }
        },

        _dealVerticalLayout:function(){

            var isEqualThermometer = true;

            var usedSize = 0;
            var fixedSize = 0;

            var gaugeData = this.getVisibleChartData();

            gaugeData.forEach(function(singleGauge){
                if(!singleGauge.center){

                    if(singleGauge.style != Constants.GAUGE_THERMOMETER
                        || singleGauge.thermometerLayout == Constants.VERTICAL_LAYOUT){

                        if(singleGauge.radius){
                            usedSize += (singleGauge.radius * 2);
                            fixedSize++;
                        }else{
                            isEqualThermometer = false;
                        }

                    }

                }
            });

            if(!isEqualThermometer){
                var self = this;
                gaugeData.forEach(function(singleGauge){

                    if(!singleGauge.center
                        && singleGauge.style == Constants.GAUGE_THERMOMETER
                        && singleGauge.thermometerLayout == Constants.HORIZONTAL_LAYOUT){

                        usedSize += (self._getThermometerSize(singleGauge));
                        fixedSize ++;
                    }
                });
            }

            //平均半径
            var plotBounds = this.vanchart.getPlotBounds();
            var averageRadius = plotBounds.height / Math.max(1, gaugeData.length - fixedSize);
            averageRadius /= 2;

            var leftBounds = {
                x:0,
                y:0,
                width:plotBounds.width,
                height:plotBounds.height
            };

            for(var i = 0, len = gaugeData.length; i < len; i++){

                var singleGauge = gaugeData[i];

                if(!singleGauge.center){

                    var size = 0;

                    if(singleGauge.style == Constants.GAUGE_THERMOMETER){

                        if(singleGauge.thermometerLayout == Constants.VERTICAL_LAYOUT){

                            size = (singleGauge.radius || averageRadius) * 2;

                            singleGauge.bounds = {
                                x:leftBounds.x,
                                y:leftBounds.y,
                                width:leftBounds.width,
                                height:size
                            };

                            leftBounds.y += size;
                            leftBounds.height -= size;

                        }else{

                            if(isEqualThermometer){
                                size = averageRadius * 2;
                            }else{
                                size = this._getThermometerSize(singleGauge);
                            }

                            var width = singleGauge.radius ? singleGauge.radius * 2 : leftBounds.width;

                            width = Math.min(width, leftBounds.width);

                            singleGauge.bounds = {
                                x:leftBounds.x,
                                y:leftBounds.y,
                                width:width,
                                height:size
                            };

                            leftBounds.y += size;
                            leftBounds.height -= size;
                        }

                    }else{

                        size = (singleGauge.radius || averageRadius) * 2;

                        singleGauge.bounds = {
                            x:leftBounds.x,
                            y:leftBounds.y,
                            width:leftBounds.width,
                            height:size
                        };

                        leftBounds.y += size;
                        leftBounds.height -= size;
                    }
                }
            }

        },

        //试管仪表盘占据的大小,不算间隔
        _getThermometerSize:function(gauge){

            var showValueLabel = gauge.valueLabelContent ? gauge.valueLabelContent[0] : null;
            var percentageLabel = gauge.percentageLabel;
            var valueLabel = gauge.valueLabel;
            var yAxis = gauge.yAxis;

            if(gauge.thermometerLayout == Constants.HORIZONTAL_LAYOUT){

                var totalHeight = 0;

                if(gauge.percentageLabelContent && showValueLabel){
                    if(percentageLabel.align == valueLabel.align){
                        totalHeight += (gauge.percentageLabelDim.height + showValueLabel.labelDim.height);
                        totalHeight += LINE_GAP * gauge.percentageLabelDim.height;

                        totalHeight += HORIZONTAL_GAP * (valueLabel.align == Constants.TOP
                                ? showValueLabel.labelDim.height : gauge.percentageLabelDim.height);
                    }
                }else if(gauge.percentageLabelContent){
                    totalHeight += (1 + HORIZONTAL_GAP) * gauge.percentageLabelDim.height;
                }else if(showValueLabel){
                    totalHeight += (1 + HORIZONTAL_GAP) * showValueLabel.labelDim.height;
                }

                totalHeight += (THERMOMETER_R * 2 + TICK_LABEL_GAP + TICK_SIZE + TICK_LABEL_GAP + yAxis.getTickHeight());

                return totalHeight;

            }else{

                var totalWidth = 0;
                if(gauge.percentageLabelContent && showValueLabel){
                    if(percentageLabel.align == valueLabel.align){
                        totalWidth += Math.max(gauge.percentageLabelDim.width, showValueLabel.labelDim.width);
                        totalWidth += VERTICAL_GAP * Math.max(gauge.percentageLabelDim.height, showValueLabel.labelDim.height);
                    }else{
                        totalWidth += (gauge.percentageLabelDim.width + showValueLabel.labelDim.width);
                        totalWidth += VERTICAL_GAP * (gauge.percentageLabelDim.height + showValueLabel.labelDim.height);
                    }
                }else if(gauge.percentageLabelContent){
                    totalWidth += (gauge.percentageLabelDim.width + VERTICAL_GAP * gauge.percentageLabelDim.height);
                }else if(showValueLabel){
                    totalWidth += (showValueLabel.labelDim.width + VERTICAL_GAP * showValueLabel.labelDim.height);
                }

                totalWidth += yAxis.getMaxTickWidth();

                totalWidth += (THERMOMETER_R * 2 + TICK_LABEL_GAP + TICK_SIZE + TICK_LABEL_GAP);

                return totalWidth;
            }

            return DEFAULT_RADIUS;
        },

        _getFixedPos:function(datum, divDim){

            var gauge = datum.series || datum;

            var style = gauge.style;
            var thermometerLayout = gauge.thermometerLayout;

            var plotBounds = this.getPlotBounds();

            switch (style){
                case Constants.GAUGE_POINTER:
                case Constants.GAUGE_SLOT:
                case Constants.GAUGE_RING:

                    var x = plotBounds.x + gauge.centerX + gauge.radius + 10;
                    var y = plotBounds.y + gauge.centerY - divDim.height/2;

                    return [x, y];

                case Constants.GAUGE_POINTER_SEMI:
                    var x = plotBounds.x + gauge.centerX - divDim.width/2;
                    var y = plotBounds.y + gauge.centerY + 0.14 * gauge.radius + 10;

                    return [x, y];
                case Constants.GAUGE_THERMOMETER:

                    var x, y;

                    if(thermometerLayout == Constants.HORIZONTAL_LAYOUT){
                        x = plotBounds.x + gauge.centerX - divDim.width/2;
                        var baseY = plotBounds.y + gauge.centerY;
                        y = baseY + THERMOMETER_R + 10;

                        if(gauge.percentageLabelContent && gauge.percentageLabel.align == Constants.BOTTOM){
                            y = baseY + gauge.percentageLabelPos.y + gauge.percentageLabelDim.height + 10;
                        }

                        if(gauge.valueLabelContent && gauge.valueLabel.align == Constants.BOTTOM){
                            var valueLabel = gauge.valueLabelContent[0];
                            y = baseY + valueLabel.labelPos.y + valueLabel.labelDim.height + 10;
                        }

                    }else{

                        y = plotBounds.y + gauge.centerY - divDim.height/2;

                        var tickWidth = gauge.yAxis.getMaxTickWidth();

                        var baseX = plotBounds.x + gauge.centerX;
                        x = baseX + THERMOMETER_R + TICK_LABEL_GAP + TICK_SIZE + TICK_LABEL_GAP + tickWidth + 10;

                        if(gauge.percentageLabelContent && gauge.percentageLabel.align == Constants.RIGHT){

                            x = baseX + gauge.percentageLabelPos.x + gauge.percentageLabelDim.width + 10;
                        }

                        if(gauge.valueLabelContent && gauge.valueLabel.align == Constants.RIGHT){
                            var valueLabel = gauge.valueLabelContent[0];
                            x = Math.max(x, baseX + valueLabel.labelPos.x + valueLabel.labelDim.width + 10)
                        }
                    }

                    return [x, y];
            }
        },

        //雷达图的系列只有一个点,并且不能为空
        _isVisibleSeries:function(sery){
            return sery.type == this.componentType && sery.visible && sery.points.length && !sery.points[0].isNull;
        },

        _supportContainerEvent:function(){

            var style = this.option.plotOptions.style;

            return style != Constants.GAUGE_POINTER && style != Constants.GAUGE_POINTER_SEMI;
        },

        _findGauge:function(event){
            var gaugeData = this.getVisibleChartData();
            var pos = this.getMousePos(event);
            var plotBounds = this.getPlotBounds();
            pos[0] -= plotBounds.x;
            pos[1] -= plotBounds.y;

            for(var i = 0, len = gaugeData.length; i < len; i++){
                var gauge = gaugeData[i];
                if(BaseUtils.containsPoint(gauge.bounds, pos)){
                    return gauge;
                }
            }
        },

        makeSeriesChosenState:function(gauge){

            this.makeChosenState(gauge.points[0]);

            this.vanchart.hoverPoint = gauge.points[0];

        },

        cancelSeriesChosenState:function(gauge){

            this.cancelChosenState(gauge.points[0]);

        }

        //
        //onContainerMouseDown:function(event){
        //
        //    var gauge = this._findGauge(event);
        //
        //    if(gauge){
        //        this.render.makeClickedState(gauge);
        //    }
        //},
        //
        //onContainerMouseUp:function(event){
        //
        //    var gauge = this._findGauge(event);
        //
        //    if(gauge){
        //        this.render.cancelClickedState(gauge);
        //    }
        //
        //},
        //


    };

    BaseUtils.inherit(Gauge, BaseChart);
    require('../ChartLibrary').register(Constants.GAUGE_CHART, Gauge);

    return Gauge;

});
/**
 * Created by eason on 15/12/31.
 */
define('chart/Radar',['require','./BaseChart','../utils/BaseUtils','../Constants','../utils/QueryUtils','../utils/BoundsManager','../ChartLibrary'],function(require){

    var BaseChart = require('./BaseChart');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var QueryUtils = require('../utils/QueryUtils');
    var BoundsManager = require('../utils/BoundsManager');

    var DELAY = 200;
    var PADDING_GAP = 10;
    var LABEL_BORDER_GAP = 8;

    var TOP = 'radar-top';
    var BOTTOM = 'radar-bottom';
    var LEFT = 'radar-left';
    var RIGHT = 'radar-right';

    function Radar(vanchart, option, chartType){
        BaseChart.call(this, vanchart, option, chartType);
        
        this.lastScale = null;
        
        this.refresh(option);
    }

    Radar.prototype = {

        constructor:Radar,

        doLayout:function(){

            var locations2Series = this._buildLocationMap();

            for(var location in locations2Series){

                var location2Series = locations2Series[location];

                for(var i = location2Series.length - 1; i >= 0; i--) {

                    var sameAxisSeries = location2Series[i];

                    if(sameAxisSeries && sameAxisSeries.length) {

                        this._buildRadarSeries(sameAxisSeries);

                    }
                }
            }

            if(this.center && this.radius){
                var x = this.center[0] - this.radius;
                var y = this.center[1] - this.radius;
                this.vanchart.setPlotBounds(BaseUtils.makeBounds(x, y, this.radius * 2, this.radius * 2));
            }
        },

        mergeDataPointAttributes:function(point){
            this._mergeMarkerAttributes(point);
            point.columnType = this.isColumnType();
        },

        mergeSeriesAttributes:function(series){

            var plotOptions = this.option.plotOptions;

            var columnType = BaseUtils.pick(plotOptions.columnType, false);

            var queryList = [series.seriesOption, plotOptions];

            var connectNulls = BaseUtils.pick(QueryUtils.queryList(queryList, 'connectNulls'), true);

            var lineWidth = QueryUtils.queryList(queryList, 'lineWidth') || 0;

            var fillColor = QueryUtils.queryList(queryList, 'fillColor');
            var lineColor = QueryUtils.queryList(queryList, 'color') || this._getDefaultSeriesColor(series.index);

            fillColor = fillColor ? (fillColor === true ? lineColor : fillColor) : '';

            var fillColorOpacity = BaseUtils.pick(QueryUtils.queryList(queryList, 'fillColorOpacity'), (columnType ? 1 : 0.15)) ;

            QueryUtils.merge(series,{
                lineWidth:lineWidth,
                lineColor:lineColor,
                columnType:columnType,
                connectNulls:connectNulls,
                fillColor:fillColor,
                fillColorOpacity:fillColorOpacity
            });
        },

        _buildRadarSeries:function(locationMap){

            this._calculateCategoryBasedPercentageAndTooltip(locationMap);

            var tSery = locationMap[0][0];
            var baseAxis = tSery.baseAxis;
            var valueAxis = tSery.valueAxis;

            this._fixRadarCenterAndRadius(baseAxis, valueAxis);

            var self = this;

            for(var i = 0, count = locationMap.length; i < count; i++){
                var stackedSeries = locationMap[i];

                stackedSeries.forEach(function(series){

                    //先排序
                    series.points.sort(function(pointA, pointB){
                        return self.cateScale(pointA.category) - self.cateScale(pointB.category);
                    });

                    series.points.forEach(function(point){
                        var preSum = point.y0;

                        point.y0 = self.valueScale(preSum);

                        point.y = self.valueScale(point.y + preSum);

                        point.radian = self.cateScale(point.category) * self.piece;

                        point.pos = self._getArcPoint(point.y, point.radian);

                        if(point.dataLabels && point.dataLabels.enabled){
                            series.columnType ? self._calculateColumnTypeLabelPos(point) : self._calculatePolygonTypeLabelPos(point);
                        }
                    });

                    series.pathSegment = self._getPathSegment(series.points, series.connectNulls);
                });
            }
        },

        _calculateColumnTypeLabelPos:function(point){

            var position = this._getRadarPosition(point.category);
            var pos = this._getArcPoint(point.y - LABEL_BORDER_GAP, point.radian);
            var labelDim = point.labelDim;

            switch (position){
                case TOP:

                    point.labelPos = {
                        x:-labelDim.width/2,
                        y:pos[1]
                    };

                    break;

                case RIGHT:

                    point.labelPos = {
                        x:pos[0] - labelDim.width,
                        y:pos[1] - labelDim.height/2
                    };
                    break;

                case BOTTOM:

                    point.labelPos = {
                        x:-labelDim.width/2,
                        y:pos[1] - labelDim.height
                    };

                    break;

                case LEFT:

                    point.labelPos = {
                        x:pos[0],
                        y:pos[1] - labelDim.height/2
                    };

                    break
            }
        },

        _calculatePolygonTypeLabelPos:function(point){

            var position = this._getRadarPosition(point.category);
            var pos = this._getArcPoint(point.y + LABEL_BORDER_GAP, point.radian);
            var labelDim = point.labelDim;

            switch (position){
                case TOP:

                    point.labelPos = {
                        x:-labelDim.width/2,
                        y:pos[1] - labelDim.height
                    };

                    break;

                case RIGHT:

                    point.labelPos = {
                        x:pos[0],
                        y:pos[1] - labelDim.height/2
                    };
                    break;

                case BOTTOM:

                    point.labelPos = {
                        x:-labelDim.width/2,
                        y:pos[1]
                    };

                    break;

                case LEFT:

                    point.labelPos = {
                        x:pos[0] - labelDim.width,
                        y:pos[1] - labelDim.height/2
                    };

                    break
            }

        },

        getAxisLineData:function(){

            var points = [];

            var categories = this.cateScale.domain();
            var self = this;

            categories.forEach(function(category){

                var radian = self.cateScale(category) * self.piece;

                var r = self.radius;

                points.push(self._getArcPoint(r, radian));

            });

            points = points.length ? points : [self._getArcPoint(this.radius, 0)];

            return points;
        },

        _getGridData:function(value, reversed, scale){
            
            var valueScale = scale || this.valueScale;

            var type = this.option.plotOptions.type || Constants.POLYGON_RADAR;

            var self = this;

            if(type == Constants.POLYGON_RADAR){

                var points = [];

                var categories = this.cateScale.domain();

                categories.forEach(function(category){

                    var radian = self.cateScale(category) * self.piece;

                    var r = valueScale(value);

                    points.push(self._getArcPoint(r, radian));

                });

                if(reversed){
                    points.reverse();
                }

                return points;

            }else{
                return valueScale(value);
            }
        },

        _getGridPathByData:function(data){

            if(BaseUtils.isArray(data)){

                var path = "";

                if(data.length){
                    for(var i = 0, count = data.length; i < count; i++){

                        var mOrl = i ? 'L' : 'M';

                        path += (mOrl + BaseUtils.dealFloatPrecision(data[i][0]) + "," + BaseUtils.dealFloatPrecision(data[i][1]));
                    }

                    path += 'Z';
                }

                return path;

            }else{

                var arc = d3.svg.arc().startAngle(0).endAngle(2 * Math.PI).innerRadius(0);

                return arc.outerRadius(data)();
            }

        },

        _getGridPath:function(value, reversed){

            var data = this._getGridData(value, reversed);

            return this._getGridPathByData(data);
        },

        _getRadarColumnPath:function(innerRadius, radius, radian){

            var halfSize = this.piece * 0.375;

            var startRadian = radian - halfSize;

            var endRadian = radian + halfSize;

            var arc = d3.svg.arc()
                .innerRadius(innerRadius).outerRadius(radius)
                .startAngle(startRadian).endAngle(endRadian);

            return arc();
        },

        _getPathSegment:function(dataPoints, connectNulls){

            var pathSeg = [];

            var tmp = [];

            if(connectNulls){

                pathSeg.push(tmp);

                dataPoints.forEach(function(dataPoint){

                    if(!dataPoint.isNull){
                        tmp.push(dataPoint.pos);
                    }

                });
            }else{

                var startIndex = 0;
                var count = dataPoints.length;

                for(var index = count - 1; index > 0; index--){

                    var current = dataPoints[index];
                    var pre = dataPoints[index - 1];

                    if(!current.isNull && pre.isNull){
                        startIndex = index;
                    }
                }

                for(var index = 0; index < count; index++){

                    var dataPoint = dataPoints[(index + startIndex) % count];

                    if(dataPoint.isNull && tmp.length){

                        if(tmp.length > 1){
                            pathSeg.push(tmp)
                        };

                        tmp = [];
                    }else{
                        tmp.push(dataPoint.pos);
                    }

                }

                if(tmp.length){
                    pathSeg.push(tmp);
                }
            }

            return pathSeg;
        },

        _getRadarSeriesFillPath:function(pathSeg, connectNulls){
            return this._getRadarSeriesPath(pathSeg, connectNulls, true);
        },

        _getRadarSeriesStrokePath:function(pathSeg, connectNulls){
            return this._getRadarSeriesPath(pathSeg, connectNulls, false);
        },

        _getRadarSeriesPath:function(pathSeg, connectNulls, toCenter){

            var path = '';
            var tmp = [];
            if(pathSeg.length == 1){

                tmp = pathSeg[0];

                var fullShape = tmp.length == this.baseAxis.getCategoryCount() || connectNulls;

                toCenter = (!fullShape && toCenter);

                path = toCenter ? 'M0,0' : '';

                for(var i = 0, count = tmp.length; i < count; i++){

                    var mOrl = (i || toCenter) ? 'L' : 'M';

                    path += (mOrl + BaseUtils.dealFloatPrecision(tmp[i][0]) + "," + BaseUtils.dealFloatPrecision(tmp[i][1]));
                }

                path += (fullShape || toCenter) ? 'Z' : '';

            }else{
                pathSeg.forEach(function(tmp){

                    path += toCenter ? 'M0,0' : '';

                    tmp.forEach(function(pos){
                        path += ('L' + BaseUtils.dealFloatPrecision(pos[0]) + "," + BaseUtils.dealFloatPrecision(pos[1]));
                    });

                    path += toCenter ? 'Z' : '';
                });
            }

            return path;
        },

        _getRadarPlotBandsPath:function(from, to){

            var type = this.option.plotOptions.type || Constants.POLYGON_RADAR;

            if(type == Constants.POLYGON_RADAR){
                return this._getGridPath(Math.min(from, to)) + this._getGridPath(Math.max(from, to), true)
            }else{
                var arc = d3.svg.arc().startAngle(0).endAngle(2 * Math.PI);
                return arc.innerRadius(this.valueScale(Math.min(from, to)))
                                    .outerRadius(this.valueScale(Math.max(from, to)))();
            }

        },

        //处理雷达图半径和圆心,同时确定分类标签
        _fixRadarCenterAndRadius:function(baseAxis, valueAxis){

            //存一下
            this.baseAxis = baseAxis;
            this.valueAxis = valueAxis;

            var categories = baseAxis.categories;
            this.cateScale = d3.scale.ordinal().domain(categories).rangePoints([0, categories.length-1]);
            this.piece = (Math.PI * 2) / Math.max(categories.length, 1);

            var plotBounds = this.getPlotBounds();
            var radius;
            this.categoryLabel = BaseUtils.clone(baseAxis.tickData);

            if(baseAxis.componentOption.showLabel){
                radius = Math.min(plotBounds.width, plotBounds.height) * 2 / 6;

                if(!this._testUseMinRadius(radius)){
                    radius = this._findNiceRadius();

                    this._testUseMinRadius(radius);
                }

            }else{
                this.categoryLabel = [];
                radius = Math.min(plotBounds.width/2, plotBounds.height/2) - PADDING_GAP;
            }

            this.radius = radius;
            this.center = [plotBounds.width/2 + plotBounds.x, plotBounds.height/2 + plotBounds.y];

            this.lastScale = this.valueScale && this.valueScale.copy();
            
            this.valueScale = valueAxis.scale.copy().rangeRound([0, this.radius]);
        },

        _testUseMinRadius:function(minRadius){

            var plotBounds = this.getPlotBounds();

            var testBounds = {
                x:-plotBounds.width/2,
                y:-plotBounds.height/2,
                width:plotBounds.width,
                height:plotBounds.height
            };

            var useMinRadius = false;
            var labelStyle = this.baseAxis.componentOption.labelStyle;
            var useHtml = this.baseAxis.componentOption.useHtml;

            var lineHeight = BaseUtils.getTextHeight(labelStyle);

            for(var i = 0, count = this.categoryLabel.length; i < count; i++){

                var tick = this.categoryLabel[i];
                var labelBounds = this._getCateLabelBounds(minRadius, tick);

                if(!BaseUtils.containsRect(testBounds, labelBounds)){

                    if(!useHtml){

                        var category = tick.tickValue;
                        var index = this.cateScale(category);
                        var arcPoint = this._getArcPoint(minRadius + PADDING_GAP, index * this.piece);
                        var position = this._getRadarPosition(category);

                        var maxLabelSize, usedSize;
                        if(position == TOP || position == BOTTOM){
                            maxLabelSize = plotBounds.height/2 - minRadius - PADDING_GAP;
                            usedSize = maxLabelSize - 2 * PADDING_GAP;
                        }else{
                            maxLabelSize = plotBounds.width/2 - Math.abs(arcPoint[0]);
                            usedSize = maxLabelSize;
                        }

                        var content = BaseUtils.splitText(tick.tickContent, labelStyle, maxLabelSize);

                        tick.tickContent = content;

                        tick.tickDim = {
                            width: usedSize,
                            height: content.length * lineHeight + (content.length - 1) * lineHeight * 0.3
                        };

                        this._getCateLabelBounds(minRadius, tick);
                    }

                    useMinRadius = true;
                }

            }

            return useMinRadius;
        },

        _getRadarPosition:function(category){

            var index = this.cateScale(category);
            var domain = this.cateScale.domain();
            var midIndex = domain.length / 2;

            if(index == 0){
                return TOP;
            }else if(index > 0 && index < midIndex){
                return RIGHT;
            }else if(index == midIndex){
                return BOTTOM;
            }else if(index > midIndex){
                return LEFT;
            }

        },

        _getCateLabelBounds:function(radius, cateTick){

            var category = cateTick.tickValue;
            var tickDim = cateTick.tickDim;
            var index = this.cateScale(category);
            var arcPoint = this._getArcPoint(radius + PADDING_GAP, index * this.piece);
            var pos;

            var position = this._getRadarPosition(category);

            switch (position){

                case TOP:

                    pos = {
                        x:-tickDim.width/2,
                        y:-radius - tickDim.height * 0.65 - PADDING_GAP
                    };

                    break;

                case RIGHT:

                    pos = {
                        x:arcPoint[0],
                        y:arcPoint[1] - tickDim.height/2
                    };

                    break;

                case BOTTOM:

                    pos = {
                        x:-tickDim.width/2,
                        y:radius + PADDING_GAP
                    };

                    break;

                case LEFT:

                    pos = {
                        x:arcPoint[0] - tickDim.width,
                        y:arcPoint[1] - tickDim.height/2
                    };

                    break;
            }

            cateTick.tickPos = pos;
            return BaseUtils.makeBounds(pos, tickDim);
        },

        _findNiceRadius:function(){

            var plotBounds = this.getPlotBounds();

            var halfWidth = plotBounds.width/2;
            var halfHeight = plotBounds.height/2;

            var minRadius = Math.min(halfWidth, halfHeight);

            var domain = this.cateScale.domain();
            var self = this;

            this.categoryLabel.forEach(function(cateTick){
                if(cateTick.tickContent){

                    var category = cateTick.tickValue;
                    var tickDim = cateTick.tickDim;

                    var midIndex = domain.length / 2;
                    var index = self.cateScale(category);

                    var testRadius = (halfWidth - tickDim.width)/Math.abs(Math.sin(index * self.piece));


                    var radius = (index == 0 || index == midIndex) ? (halfHeight - tickDim.height) : testRadius;

                    minRadius = Math.min(minRadius, radius);
                }
            });

            return minRadius - PADDING_GAP;
        },

        getRadarCenter:function(){
            return this.center;
        },

        getBaseAxis:function(){
            return this.baseAxis;
        },

        getValueAxis:function(){
            return this.valueAxis;
        },

        getRadarPlotBands:function(){

            var plotBands = this.valueAxis._getPlotBands();

            var result = [];

            var self = this;

            plotBands.forEach(function(d){
                result.push({
                    path: self._getRadarPlotBandsPath(d.from, d.to),
                    color: d.color
                });
            });

            return result;
        },

        getRadarPlotLines:function(){

            var plotLines = this.valueAxis.componentOption.plotLines || [];
            var self = this;

            var result = [];
            plotLines.forEach(function(d){

                var text, style, align;
                if(d.label && d.label.text && d.label.style){
                    text = d.label.text;
                    style = d.label.style;
                    align = d.label.align;
                }

                result.push({
                    color: d.color,
                    value: d.value,
                    width: d.width,
                    dataArray:Constants.DASH_TYPE[d.dashStyle],
                    text:text,
                    baseY:-self.valueScale(d.value),
                    textAnchor:align == Constants.LEFT ? 'end' : 'start',
                    style:style
                });
            });

            return result;
        },

        isColumnType:function(){

            var plotOptions = this.option.plotOptions;

            return BaseUtils.pick(plotOptions.columnType, false);
        },

        getInitRadius:function(){
            return this.valueScale(this.valueAxis.getStartPosValue());
        },

        _getInitPathSegment:function(pathSeg){
            var init = [];
            pathSeg.forEach(function(seg){
                var tmp = [];
                init.push(tmp);

                seg.forEach(function(){
                    tmp.push([0,0])
                })
            });

            return init;
        },

        _getFixedPos:function(datum, divDim){

            var x, y;

            if(datum.columnType){

                var radius = datum.y;
                var centerAngle = datum.radian;

                x = radius * Math.sin(centerAngle) + this.center[0];
                y = radius * Math.cos(centerAngle + Math.PI) + this.center[1];

                if(centerAngle < Math.PI / 2){
                    y -= divDim.height;
                }else if(centerAngle >= Math.PI && centerAngle < 3 * Math.PI / 2){
                    x -= divDim.width;
                }else if(centerAngle >= 3 * Math.PI / 2 && centerAngle < Math.PI * 2){
                    y -= divDim.height;
                    x -= divDim.width;
                }

            }else{
                var radius = datum.marker.radius || this.getDefaultMarkerRadius();
                x = this.center[0] + datum.pos[0] + radius;
                y = this.center[1] + datum.pos[1] + radius;
            }

            return [x, y];
        },

        getClosestPoint:function(pos){

            if(this.isColumnType()){
                return;
            }

            var selectedPoint;
            var minDistance = Number.MAX_VALUE;
            var lineData = this.vanchart.hoverSeries;
            var center = this.center;

            if(lineData){
                lineData.points.forEach(function(point){

                    var markerPos = point.pos;

                    var detX = markerPos[0] + center[0] - pos[0];
                    var detY = markerPos[1] + center[1] - pos[1];
                    var dis = Math.sqrt(detX * detX + detY * detY);

                    if(dis < minDistance && !point.isNull){
                        selectedPoint = point;
                        minDistance = dis;
                    }
                });
            }else{
                var series = this.vanchart.series;

                series.forEach(function(sery){

                    if(sery.points){
                        sery.points.forEach(function(point){

                            var markerPos = point.pos;

                            var detX = markerPos[0] + center[0] - pos[0];
                            var detY = markerPos[1] + center[1] - pos[1];
                            var dis = Math.sqrt(detX * detX + detY * detY);

                            if(dis < minDistance && !point.isNull){
                                selectedPoint = point;
                                minDistance = dis;
                            }
                        });
                    }
                });
            }

            return selectedPoint;
        }
    };


    BaseUtils.inherit(Radar, BaseChart);
    require('../ChartLibrary').register(Constants.RADAR_CHART, Radar);
    return Radar;
});
/**
 * Created by Mitisky on 16/3/14.
 */
define('chart/Bubble',['require','./BaseChart','../utils/BaseUtils','../Constants','../utils/QueryUtils','../utils/ColorUtils','../ChartLibrary'],function(require){
    var BaseChart = require('./BaseChart');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var QueryUtils = require('../utils/QueryUtils');
    var ColorUtils = require('../utils/ColorUtils');

    var DEFAULT_BUBBLE_ALPHA = 0.7;
    var BUBBLES_SHOW_TIME = 800;
    var NEGATIVE_COLOR = 'rgb(138, 138, 138)';

    function Bubble(vanchart, option, chartType){
        BaseChart.call(this, vanchart, option, chartType);

        this.refresh(option);
    }

    Bubble.prototype = {
        constructor: Bubble,

        doLayout:function(){

            var series = this.getVisibleChartData();

            //力学气泡图的时候计算百分比和标签内容
            if(this.isForceBubble()){
                this.dealStackedSeries(series);
            }

            var allPoints = [];

            var minSize = Number.MAX_VALUE;//所有数据的最大最小值
            var maxSize = -minSize;
            var minSizeArray = [];//每个系列数据的最大最小值
            var maxSizeArray = [];
            var self = this;
            series.forEach(function(sery, i) {
                if (sery.points.length > 0) {
                    var seriesMinSize = Number.MAX_VALUE;//当前系列数据的最大最小值
                    var seriesMaxSize = -seriesMinSize;
                    for(var index = 0, len = sery.points.length; index < len; index++){
                        var point = sery.points[index];
                        var pointS = point.size;
                        if(pointS < 0){
                            if(point.displayNegative){
                                pointS = Math.abs(pointS);
                                if(sery.chart.option.legend.enabled) {
                                    self._setNegativeColorAttr(point, sery);
                                }
                            } else {
                                continue;
                            }
                        }
                        seriesMaxSize = Math.max(seriesMaxSize, pointS);
                        seriesMinSize = Math.min(seriesMinSize, pointS);
                    }
                    minSize = Math.min(minSize, seriesMinSize);
                    maxSize = Math.max(maxSize, seriesMaxSize);
                    minSizeArray[i] = seriesMinSize;
                    maxSizeArray[i] = seriesMaxSize;

                    allPoints = allPoints.concat(sery.points);
                }
            });

            this._calculatePointSize(series, minSizeArray, maxSizeArray, minSize, maxSize);

            this._calculateBubblePosition(series, allPoints);

            allPoints.forEach(function(point){
                self._calculatePointLabelAndTooltip(point);
            });

        },

        _calculateBubblePosition:function(series, allPoints){

            this.isForceBubble() ? this._calculateForceBubblePosition(series, allPoints)
                                                : this._calculateNormalBubblePosition(series, allPoints);
        },

        _calculateNormalBubblePosition:function(series, allPoints){

            series.forEach(function(sery){
                var baseAxis = sery.baseAxis;
                var valueAxis = sery.valueAxis;

                sery.points.forEach(function(point){

                    var det = baseAxis.scale.rangeBand ? baseAxis.scale.rangeBand()/2 : 0;
                    var t1 = Math.round(baseAxis.scale(point.category) + det);
                    var t2 = valueAxis.scale(point.value + point.y0);

                    QueryUtils.merge(point, {
                        posX: t1,
                        posY: t2
                    }, true);
                })
            });

            if(this.isSupportAnimation()) {

                allPoints.sort(function (pointA, pointB) {
                    return pointB.radius - pointA.radius;
                });

                var len = allPoints.length;
                if (len > 0) {
                    var unitTime = BUBBLES_SHOW_TIME / len;
                    allPoints.forEach(function (point, i) {

                        QueryUtils.merge(point, {
                            delayTime: unitTime * i
                        }, true);

                    });
                }
            }

        },

        _calculateForceBubblePosition:function(series, nodes){
            var maxRadius = 0;
            var plotBounds = this.getPlotBounds();
            var size = [plotBounds.width, plotBounds.height];

            series.forEach(function(sery){
                var cluster;
                sery.points.forEach(function(point){
                    cluster = cluster || point;
                    cluster = point.radius > cluster.radius ? point : cluster;
                    maxRadius = Math.max(maxRadius, point.radius);
                });

                sery.cluster = cluster;
            });

            //ie下需要模拟计算
            if(this.isUpdateWithForce()){
                return;
            }

            d3.layout.pack().sort(null)
                .size(size)
                .children(function(d) {
                    return d.values;
                })
                .value(function(d) {
                    return d.radius * d.radius;
                })
                .nodes({values: d3.nest()
                    .key(function(d) { return d.seriesName; })
                    .entries(nodes)});

            //模拟集聚的过程
            var start = 0.1, end = 0.005;
            var padding = 2, clusterPadding = 2;
            var paddingAlpha = 0.5;
            var gravity = 0.02;
            var friction = 0.9;

            //set px,py
            nodes.forEach(function(point){
                point.px = point.x;
                point.py = point.y;
            });

            for(var alpha = start; alpha >= end; alpha -= (alpha > 0.07 ? 0.001 : 0.0005)){

                var n = nodes.length, i, o, k, x, y;

                if (k = alpha * gravity) {
                    x = size[0] / 2;
                    y = size[1] / 2;
                    i = -1;
                    if (k) while (++i < n) {
                        o = nodes[i];
                        o.x += (x - o.x) * k;
                        o.y += (y - o.y) * k;
                    }
                }
                i = -1;
                while (++i < n) {
                    o = nodes[i];
                    o.x -= (o.px - (o.px = o.x)) * friction;
                    o.y -= (o.py - (o.py = o.y)) * friction;
                }

                nodes.forEach(function(d){
                    //集聚
                    var cluster = d.series.cluster;

                    if (cluster && cluster != d){
                        var x = d.x - cluster.x,
                            y = d.y - cluster.y,
                            l = Math.sqrt(x * x + y * y),
                            r = d.radius + cluster.radius;
                        if (l != r) {
                            l = (l - r) / l * alpha;
                            d.x -= x *= l;
                            d.y -= y *= l;
                            cluster.x += x;
                            cluster.y += y;
                        }
                    }});

                for(var i = 0; i < n; i++){
                    var d = nodes[i];

                    for(var j = 0; j < n; j++){
                        var point = nodes[j];

                        if (point !== d) {
                            var x = d.x - point.x,
                                y = d.y - point.y,
                                l = Math.sqrt(x * x + y * y),
                                r = d.radius + point.radius + (d.series.cluster === point.series.cluster ? padding : clusterPadding);
                            if (l < r) {
                                l = (l - r) / l * paddingAlpha;
                                d.x -= x *= l;
                                d.y -= y *= l;
                                point.x += x;
                                point.y += y;
                            }
                        }
                    }
                }
            }

            nodes.forEach(function(point){
                point.posX = point.x;
                point.posY = point.y;
            })
        },


        //包括半径、位置、标签、数据点提示
        _calculatePointSize:function(series, minSizeArray, maxSizeArray, minSize, maxSize) {

            series.forEach(function(sery, i) {
                if (sery.points.length > 0) {
                    var seriesMaxDiameter = sery.maxSize;
                    var seriesMinDiameter = sery.minSize;
                    var sizeByArea = sery.sizeBy == Constants.SIZE_BY_AREA;
                    //系列条件属性设置最大最小半径，则气泡半径根据该系列最大最小size计算
                    var sizeBySeriesMinMax = BaseUtils.hasDefined(sery.seriesOption.minSize) && BaseUtils.hasDefined(sery.seriesOption.maxSize);
                    var seriesMaxSize = sizeBySeriesMinMax ? maxSizeArray[i] : maxSize;
                    var seriesMinSize = sizeBySeriesMinMax ? minSizeArray[i] : minSize;

                    var unit = 0;
                    if(seriesMaxSize != seriesMinSize){
                        unit = sizeByArea ? (seriesMaxDiameter * seriesMaxDiameter - seriesMinDiameter * seriesMinDiameter) / (seriesMaxSize - seriesMinSize)
                        : (seriesMaxDiameter - seriesMinDiameter ) / (seriesMaxSize - seriesMinSize);
                    }

                    sery.points.forEach(function(point) {
                        var temp = unit * (Math.abs(point.size) - seriesMinSize);
                        var diameter = sizeByArea ? Math.sqrt(seriesMinDiameter * seriesMinDiameter + temp)
                            : seriesMinSize + temp;
                        if(point.pointOption.minSize && point.pointOption.maxSize){
                            diameter = point.pointOption.minSize;
                        }
                        diameter = (point.size < 0 && !point.displayNegative) ? 0 : diameter;
                        point.radius = diameter/2;
                    });
                }
            });
        },

        _setNegativeColorAttr:function(point, sery){
            point.color = NEGATIVE_COLOR;
            point.clickColor = ColorUtils.getClickColor(NEGATIVE_COLOR);
            var queryList = [point.pointOption, sery.seriesOption, sery.chart.option.plotOptions];
            point.mouseOverColor = QueryUtils.queryList(queryList, 'mouseOverColor') || ColorUtils.getHighLightColor(NEGATIVE_COLOR);
        },

        _calculatePointLabelAndTooltip:function(point){

            var withForce = this.isUpdateWithForce();

            if(this.isForceBubble()){
                //力学气泡图
                if(point.labelContent && point.labelDim){

                    var radius = point.radius;
                    if((point.labelDim.width > 2 * radius) || (point.labelDim.height > 2 * radius)){
                        point.labelPos = null;
                    }else{

                        var posX = withForce ? 0 : point.posX;
                        var posY = withForce ? 0 : point.posY;

                        point.labelPos = {
                            x:-point.labelDim.width/2 + posX,
                            y:-point.labelDim.height/2 + posY
                        }
                    }

                }

            }else{
                var dataLabels = point.dataLabels;
                if(dataLabels && dataLabels.enabled) {

                    this._calculateBubbleLabelInfo(point, dataLabels, Constants.INSIDE);

                    this._calculateLabelPos(point);
                }
            }

            this.mergeSinglePointTooltipAttr(point);
        },

        _calculateLabelPos:function(point) {
            var labelDim = point.labelDim;
            var x = point.posX - labelDim.width/2;
            var y = point.posY - labelDim.height/2;
            var labelPos = {
                x: x,
                y: y
            };
            QueryUtils.merge(point, {
                labelPos: labelPos
            }, true);
        },

        getTrendLineXYValues:function(sery){
            return this.getBubbleTrendLineXYValues(sery);
        },

        _getFixedPos:function(datum){
            var radius = datum.radius || 0;

            var plotBounds = this.getPlotBounds();

            var x = this.isForceBubble() ? datum.x : datum.posX;
            var y = this.isForceBubble() ? datum.y : datum.posY;

            var x = plotBounds.x + x + radius;
            var y = plotBounds.y + y + radius;

            return [x, y];
        },

        mergeDataPointAttributes:function(point){
            var queryList = [point.pointOption, point.series.seriesOption, this.option.plotOptions];
            var fillColorOpacity = BaseUtils.pick(QueryUtils.queryList(queryList, 'fillColorOpacity'), DEFAULT_BUBBLE_ALPHA);
            var size = BaseUtils.pick(QueryUtils.queryList(queryList, 'size'), 0);

            var isForceBubble = this.isForceBubble();

            QueryUtils.merge(point, {
                fillColorOpacity: fillColorOpacity,
                x:point.category,
                y:point.value,
                size: isForceBubble ? (point.isNull ? '-' : point.value) : size, //力学气泡图没有size的值
                shadow: QueryUtils.queryList(queryList, 'shadow'),
                displayNegative: QueryUtils.queryList(queryList, 'displayNegative'),
                delayTime:0
            }, true);

            if(isForceBubble){
                point.x = undefined;
                point.y = undefined;
            }
        },

        mergeSeriesAttributes:function(sery) {

            var queryList = [sery.seriesOption, this.option.plotOptions];

            QueryUtils.merge(sery,{
                sizeBy: QueryUtils.queryList(queryList, 'sizeBy'),
                maxSize: QueryUtils.queryList(queryList, 'maxSize'),
                minSize: QueryUtils.queryList(queryList, 'minSize'),
                shadow: QueryUtils.queryList(queryList, 'shadow'),
                displayNegative: QueryUtils.queryList(queryList, 'displayNegative')
            });
        },

        getClosestPoint:function(pos){

            var series = this.getVisibleChartData();

            var plotBounds = this.getPlotBounds();

            for(var sIndex = series.length - 1; sIndex >= 0; sIndex--){
                var sery = series[sIndex];

                for(var pIndex = sery.points.length - 1; pIndex >= 0; pIndex--){

                    var point = sery.points[pIndex];

                    var detX = point.posX + plotBounds.x - pos[0];

                    var detY = point.posY + plotBounds.y - pos[1];

                    var len = Math.sqrt(detX * detX + detY * detY);

                    if(len <= point.radius){
                        return point;
                    }
                }
            }
        }

    };

    BaseUtils.inherit(Bubble, BaseChart);

    require('../ChartLibrary').register(Constants.BUBBLE_CHART, Bubble);

    return Bubble;
});

/**
 * Created by Mitisky on 16/3/24.
 */
define('chart/Scatter',['require','./BaseChart','../utils/BaseUtils','../utils/ColorUtils','../Constants','../utils/QueryUtils','../ChartLibrary'],function (require) {
    var BaseChart = require('./BaseChart');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');
    var QueryUtils = require('../utils/QueryUtils');

    var POINTS_SHOW_TIME = 800;
    var DEFAULT_SCATTER_ALPHA = 1;
    var LABEL_GAP = 2;

    function Scatter(vanchart, option, chartType){
        BaseChart.call(this, vanchart, option, chartType);

        this.refresh(option);
    }

    Scatter.prototype = {
        constructor: Scatter,

        doLayout: function () {
            var self = this;
            var series = this.getVisibleChartData();
            var allPoints = [];

            series.forEach(function(sery) {
                if (sery.points.length > 0) {
                    var baseAxis = sery.baseAxis;
                    var valueAxis = sery.valueAxis;
                    sery.points.forEach(function(point) {
                        //这句是必要的，点击图例点原地消失
                        if(point.visible) {
                            var det = baseAxis.scale.rangeBand ? baseAxis.scale.rangeBand() / 2 : 0;
                            var x = Math.round(baseAxis.scale(point.category) + det);
                            var y = valueAxis.scale(point.value + point.y0);

                            QueryUtils.merge(point, {
                                posX: x,
                                posY: y
                            }, true);

                            self._calculatePointLabelAndTooltip(point);
                        }
                    });
                    allPoints = allPoints.concat(sery.points);

                    sery.points.sort(function (pA, pB) {
                        return pA.posX - pB.posX;
                    });
                }
            });

            this._calculatePointDelayTime(allPoints);
        },

        _calculatePointDelayTime:function(allPoints) {
            if(this.isSupportAnimation()) {
                var len = allPoints.length;

                if (len > 0) {
                    allPoints.forEach(function (point, i) {
                        var delayTime = d3.ease('exp-in-out')(i/len) * POINTS_SHOW_TIME;
                        QueryUtils.merge(point, {
                            delayTime: delayTime
                        }, true);

                    });
                }
            }
        },

        _calculatePointLabelAndTooltip:function(point){

            var dataLabels = point.dataLabels;
            if(dataLabels && dataLabels.enabled) {
                this._calculateBubbleLabelInfo(point, dataLabels, Constants.OUTSIDE);

                this._calculateLabelPos(point);
            }

            this.mergeSinglePointTooltipAttr(point);

        },

        _calculateLabelPos:function(point) {
            var labelDim = point.labelDim;
            var labelPos = {
                x: point.posX - labelDim.width/2,
                y: point.posY  - LABEL_GAP - labelDim.height
            };
            QueryUtils.merge(point, {
                labelPos: labelPos
            }, true);
        },

        getTrendLineXYValues:function(sery){
            return this.getBubbleTrendLineXYValues(sery);
        },

        _createCategoryLine:function(data, label, style, formatter){
            return this._createBubbleTooltipSeriesLine(data, label, style, formatter);
        },

        _createSeriesLine:function(data, label, style, formatter){
            return this._createBubbleTooltipXYSizeLine(data, label, style, formatter);
        },

        _getFixedPos:function(datum){
            var radius = datum.marker.radius || this.getDefaultMarkerRadius();

            var plotBounds = this.getPlotBounds();

            var x = plotBounds.x + datum.posX + radius;
            var y = plotBounds.y + datum.posY + radius;

            return [x, y];
        },

        mergeDataPointAttributes:function(point){
            var queryList = [point.pointOption, point.series.seriesOption, this.option.plotOptions];
            var fillColorOpacity = BaseUtils.pick(QueryUtils.queryList(queryList, 'fillColorOpacity'), DEFAULT_SCATTER_ALPHA);

            if(point.color){
                fillColorOpacity = BaseUtils.pick(ColorUtils.getColorOpacityWithoutDefault(point.color), fillColorOpacity);
            }

            var size = BaseUtils.pick(QueryUtils.queryList(queryList, 'size'), 0);

            QueryUtils.merge(point, {
                fillColorOpacity: fillColorOpacity,
                x:point.category,
                y:point.value,
                size: size
            }, true);

            //放在最后原因：会用到size
            this._mergeMarkerAttributes(point);
            if(BaseUtils.isNullMarker(point.marker)){
                point.marker.symbol = BaseUtils.getDefaultMarkerSymbol(point.series.index);
            }
        },

        mergeSeriesAttributes:function(sery){
            if(BaseUtils.isNullMarker(sery.marker)){
                sery.marker.symbol = BaseUtils.getDefaultMarkerSymbol(sery.index);
            }

            var plotOptions = this.option.plotOptions;
            var seriesOption = sery.seriesOption;
            var queryList = [seriesOption, plotOptions];

            var lineWidth = QueryUtils.queryList(queryList, 'lineWidth') || 0;
            var interpolate = this._getSeriesInterpolate(seriesOption, plotOptions);
            var lineSvg = d3.svg.line()
                .interpolate(interpolate)
                .x(function (d) {
                    return d.posX;
                })
                .y(function (d) {
                    return d.posY;
                })
                .defined(function (d) {
                    return !d.isNull;
                });

            QueryUtils.merge(sery,
                {
                    lineWidth: lineWidth,
                    lineSvg: lineSvg,
                    interpolate:interpolate
                }
            );
        },

        getClosestPoint:function(pos){

            var series = this.getVisibleChartData();

            var plotBounds = this.getPlotBounds();

            for(var sIndex = series.length - 1; sIndex >= 0; sIndex--){
                var sery = series[sIndex];

                for(var pIndex = sery.points.length - 1; pIndex >= 0; pIndex--){

                    var point = sery.points[pIndex];

                    var detX = point.posX + plotBounds.x - pos[0];

                    var detY = point.posY + plotBounds.y - pos[1];

                    var len = Math.sqrt(detX * detX + detY * detY);

                    var radius =  point.marker.radius || 4.5;

                    if(len <= radius){
                        return point;
                    }
                }
            }
        }
    };

    BaseUtils.inherit(Scatter, BaseChart);

    require('../ChartLibrary').register(Constants.SCATTER_CHART, Scatter);

    return Scatter;
});

/**
 * Created by eason on 15/8/13.
 */

define('render/PieSvgRender',['require','./BaseRender','../utils/BaseUtils','../utils/ColorUtils','../Constants','../utils/BezierEasing','./RenderLibrary'],function(require){

    var PATH_G = 'path-g';
    var LABEL_G = 'label-g';
    var PIE_G = 'pie-g';

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');
    var Bezier = require('../utils/BezierEasing');

    var HOVER_PERCENT = 1.1;

    var ANIMATION_TIME = 1000;
    var EASE = 'bounce';

    var SORT_EASE = Bezier.css.swing;
    var SORT_TIME = 400;

    var START_STOP = 'start-gradual-stop';
    var END_STOP = 'end-gradual-stop';

    function PieSvgRender(pie){
        BaseRender.call(this, pie);
        this.pie = pie;
        this.lastData = {};//当前展示的数据，用来计算弧度偏移
    }

    PieSvgRender.prototype = {

        constructor:PieSvgRender,

        render:function(){

            var plotBounds = this.pie.getPlotBounds();
            var svgRoot = this.pie.getVanchartRender().getRenderRoot();

            if(!this._bodyG){
                this._bodyG = svgRoot.append('g');
            }

            this._bodyG.attr('transform', BaseUtils.makeTranslate(plotBounds));

            var self = this;

            var pieData = this.pie.getVisibleChartData();

            var pieUpdate = this._bodyG.selectAll('g.' + PIE_G)
                                            .data(pieData, function(d){return d.className;});

            pieUpdate
                .attr('transform', function(d){return BaseUtils.makeTranslate([d.centerX, d.centerY])})
                .each(function(d){

                    var pieG = d3.select(this);

                    self._updateDefs(pieG.select('defs'), d);

                    self._updateSlices(pieG.select('g.' + PATH_G), d);

                    self._drawLabel(pieG.select('g.' + LABEL_G), d, ANIMATION_TIME);

                    self._updateLastData(d.category, d.visiblePoints);
                });

            var newPie = pieUpdate.enter()
                .append('g')
                .attr('class', function(d){
                    return PIE_G + ' ' + d.className;
                });

            pieUpdate.exit().remove();

            newPie.each(function(d){

                var pieG = d3.select(this)
                                .attr('transform', BaseUtils.makeTranslate([d.centerX, d.centerY]));

                pieG.append('defs');

                pieG.append('g').attr('class', PATH_G);

                pieG.append('g').attr('class', LABEL_G);

                self._updateDefs(pieG.select('defs'), d);

                self._updateSlices(pieG.select('g.' + PATH_G), d, true);

                self._drawLabel(pieG.select('g.' + LABEL_G), d, ANIMATION_TIME);

                self._updateLastData(d.category, d.visiblePoints);
            });

        },

        _updateDefs:function(defs, config){

            if(!config.style){
                return;
            }

            if(config.style == Constants.STYLE_GRADUAL){

                var self = this;
                var points = config.visiblePoints;
                var grads = defs.selectAll("radialGradient").data(points, function(d){
                    return d.className;
                });

                var newSlice = grads.enter().append('radialGradient');
                newSlice.append('stop').attr('class', START_STOP);
                newSlice.append('stop').attr('class', END_STOP);

                grads
                    .attr("gradientUnits", "userSpaceOnUse")
                    .attr("cx", "0%")
                    .attr("cy", "0%")
                    .attr("r", function(d){
                        return d.radius + 'px';
                    })
                    .attr("id", function(d){
                        return  self._getGradualID(d);
                    });

                grads.select("stop." + START_STOP)
                    .attr("offset", function(d){
                        return (d.series.innerRadius / d.radius) * 100 + '%';
                    })
                    .style("stop-color", function(d){
                        return ColorUtils.getColorWithDivider(d.color, 0.8);
                    });

                grads.select("stop." + END_STOP)
                    .attr("offset", "100%")
                    .style("stop-color", function(d){
                        return d.color;
                    });
            }
        },

        _updateSlices:function(pathG, config, initPie){
            var arc = d3.svg.arc().innerRadius(config.innerRadius);
            var points = config.visiblePoints;

            var initStartAngel = Math.PI * config.startAngle / 180;
            var initEndAngle = Math.PI * config.endAngle / 180;

            var self = this;

            var slices;

            if(this.pie.groupDataByClassName()){
                slices = pathG.selectAll('path').data(points, function(d){return d.className});
            }else{
                slices = pathG.selectAll('path').data(points);
            }

            var rotate = d3.transform(pathG.attr('transform')).rotate;
            this.pie.recalculateLabelPos(config, BaseUtils.toRadian(rotate));

            var exitSlice = slices.exit();
            var supportAnimation = this.pie.isSupportAnimation();

            var emptyExitS = exitSlice.empty() && slices.enter().empty();

            if(supportAnimation){
                exitSlice
                    .transition()
                    .ease(EASE)
                    .duration(ANIMATION_TIME)
                    .attrTween("d", function (d) {

                        //需要消失的系列
                        var dataIndex = this._dataIndex_;
                        var radius = this._current_.radius;

                        var currentArc;
                        if(dataIndex == 0){
                            currentArc = {startAngle: initStartAngel, endAngle: initStartAngel, radius: radius};
                        }else if(dataIndex >= points.length){
                            currentArc = {startAngle: initEndAngle, endAngle: initEndAngle, radius: radius};
                        }else{

                            var preArc = points[dataIndex - 1];
                            if(preArc.lastShape){
                                var preGap = Math.abs(preArc.lastShape.endAngle - preArc.endAngle);
                                var startAngle = d.startAngle + preGap;
                                currentArc = {startAngle: startAngle, endAngle: startAngle, radius: radius};
                            }else{
                                //没有前一个arc的话直接创建
                                currentArc = {startAngle: d.startAngle, endAngle: d.startAngle, radius: d.radius}
                            }
                        }

                        var interpolate = d3.interpolate(this._current_ , currentArc);

                        return function (t) {
                            return arc.outerRadius(d.radius)(interpolate(t));
                        };
                    })
                    .remove();
            }else{
                exitSlice.remove();
            }

            self.addShapeEventHandler(slices.enter().append("path"));

            var animationTime = (emptyExitS && !initPie) ? SORT_TIME : ANIMATION_TIME;
            var easeFunc = (emptyExitS && !initPie) ? SORT_EASE : EASE;

            slices.each(function(d){

                this._dataIndex_ = d.index;


                var slice = d3.select(this)
                    .attr('class', d.className)
                    .style("fill", self._getFill(d))
                    .style('stroke', d.borderColor)
                    .style('stroke-width', d.borderWidth);

                if(supportAnimation){
                    slice
                        .transition()
                        .ease(easeFunc)
                        .duration(animationTime)
                        .attrTween("d", function (d) {

                            var currentArc = this._current_;

                            if(initPie){
                                currentArc = {startAngle: initStartAngel, endAngle: initStartAngel, radius:d.radius};
                            }else if(!currentArc){

                                var index = d.index;

                                if(index == 0){
                                    currentArc = {startAngle: initStartAngel, endAngle: initStartAngel, radius:d.radius};
                                }else if(index >= points.length - 1){
                                    currentArc = {startAngle: initEndAngle, endAngle: initEndAngle, radius:d.radius};
                                }else{
                                    var preArc = points[index - 1];

                                    if(preArc.lastShape){
                                        var preGap = Math.abs(preArc.lastShape.endAngle - preArc.endAngle);
                                        var startAngle = d.startAngle + preGap;
                                        currentArc = {startAngle: startAngle, endAngle: startAngle, radius: d.radius};
                                    }else{
                                        //没有前一个arc的话直接创建
                                        currentArc = {startAngle: d.startAngle, endAngle: d.startAngle, radius: d.radius}
                                    }

                                }

                            }

                            var interpolate = d3.interpolate(currentArc, self._getArcData(d));

                            this._current_ = interpolate(1);

                            return function (t) {
                                var tmp = interpolate(t);
                                return arc.outerRadius(tmp.radius)(tmp);
                            };
                        });
                }else{

                    slice.attr('d', function(d){
                        this._current_ = self._getArcData(d);
                        return arc.outerRadius(d.radius)(this._current_);
                    })

                }

            });
        },

        _drawLabel:function(labelG, config, delay){

            delay = delay || 0;
            delay = this.pie.isSupportAnimation() ? delay : 0;

            var plotBounds = this.pie.getPlotBounds();
            var transX = config.centerX + plotBounds.x;
            var transY = config.centerY + plotBounds.y;

            this._drawSvgDataLabels(labelG, config.visiblePoints, transX, transY, delay, config.name);
        },

        onDragStart:function(target, initPos){

            var pieG = this._bodyG.select('g.' + target.className);

            var labelG = pieG.select('g.' + LABEL_G);
            var pathG = pieG.select('g.' + PATH_G);

            //旋转的时候把标签和牵引线隐藏
            this._removeSvgDataLabels(labelG, target.category);

            this.initPos = initPos;
            this.initRotate = d3.transform(pathG.attr('transform')).rotate;
        },

        _getPositionInPie:function(absPos, target){

            var plotBounds = this.pie.getPlotBounds();

            var x = absPos[0] - plotBounds.x - target.centerX;

            var y = absPos[1] - plotBounds.y - target.centerY;

            return [x, y];
        },

        onDrag:function(target, currentPos){

            var pieG = this._bodyG.select('g.' + target.className);

            var pathG = pieG.select('g.' + PATH_G);

            var startAngle = this._getAngle(this._getPositionInPie(this.initPos, target), [0,0]);

            var newAngle = this._getAngle(this._getPositionInPie(currentPos, target), [0,0]);

            var rotate = newAngle - startAngle + this.initRotate;

            pathG.attr("transform", "rotate(" + rotate + "," + 0 + "," + 0 + ")");

        },

        onDragEnd:function(target){

            var pieG = this._bodyG.select('g.' + target.className);

            var labelG = pieG.select('g.' + LABEL_G);
            var pathG = pieG.select('g.' + PATH_G);

            var rotate = d3.transform(pathG.attr('transform')).rotate;

            this.pie.recalculateLabelPos(target, BaseUtils.toRadian(rotate));

            this._drawLabel(labelG, target);
        },

        _getFill:function(d){

            var gradient = this._bodyG.select('#' + this._getGradualID(d));

            gradient.select("stop." + START_STOP)
                .style("stop-color", ColorUtils.getColorWithDivider(d.color, 0.9));

            gradient.select("stop." + END_STOP).style("stop-color", d.color);

            return d.style == Constants.STYLE_GRADUAL ? "url(#" + this._getGradualID(d) + ")": d.color;
        },

        _getClickedFill:function(d){

            var gradient = this._bodyG.select('#' + this._getGradualID(d));

            gradient.select("stop." + START_STOP)
                .style("stop-color", ColorUtils.getColorWithDivider(d.clickColor, 0.9));

            gradient.select("stop." + END_STOP).style("stop-color", d.clickColor);

            return d.style == Constants.STYLE_GRADUAL ? "url(#" + this._getGradualID(d) + ")": d.clickColor;
        },

        _getMouseOverFill:function(d){
            var gradient = this._bodyG.select('#' + this._getGradualID(d));

            gradient.select("stop." + START_STOP)
                .style("stop-color", ColorUtils.getColorWithDivider(d.mouseOverColor, 0.9));

            gradient.select("stop." + END_STOP).style("stop-color", d.mouseOverColor);

            return d.style == Constants.STYLE_GRADUAL ? "url(#" + this._getGradualID(d) + ")": d.mouseOverColor;
        },

        _getGradualID:function(d){
            return d.className + this.pie.vanchart.getIDPrefix();
        },

        _getArcData:function(d){
            return {
                startAngle: d.startAngle,
                endAngle: d.endAngle,
                radius: d.radius
            };
        },

        _getAngle:function(current, center){
            return Math.atan2(current[1] - center[1], current[0] - center[0]) / (Math.PI / 180);
        },

        _updateLastData:function(category, points){
            var oldData = this.lastData[category];

            this.lastData[category] = points;

            if(oldData){

                var dataMap = {};
                for(var i = 0, len = oldData.length; i < len; i++){
                    var oldPoint = oldData[i];

                    var key = this.pie.groupDataByClassName() ? oldPoint.className : oldPoint.index;

                    dataMap[key] = oldPoint;
                }

                //给每个新的数据绑定之前的值
                for(var i = 0, len = points.length; i < len; i++){
                    var newPoint = points[i];

                    var key = this.pie.groupDataByClassName() ? newPoint.className : newPoint.index;

                    var oldArc = dataMap[key];
                    if(oldArc){
                        newPoint.lastShape = this._getArcData(oldArc);
                    }
                }
            }
        },

        makeClickedState:function(d){
            var element = this._getElementByData(d);
            if(element){
                element.style('fill', this._getClickedFill(d));
            }
        },

        cancelClickedState:function(d){
            var element = this._getElementByData(d);
            if(element){
                element.style('fill', this._getMouseOverFill(d));
            }
        },

        //数据点形状的数据，移动到标签上的时候触发选中
        makeChosenState:function(d){

            var element = this._getElementByData(d);

            if(element){

                var self = this;

                var pathNode = element.node();
                clearTimeout(pathNode.cancelChosenTimeout);

                var arc = d3.svg.arc().innerRadius(d.series.innerRadius);

                if(pathNode && !pathNode.isChosen){
                    element
                        .style('fill', function(d){
                            return self._getMouseOverFill(d);
                        })
                        .transition().ease("elastic").duration(800)
                        .attrTween("d", function (d) {
                            var outerRadius = d.radius;
                            var interpolate = d3.interpolate(outerRadius, outerRadius * 1.1);
                            var arcData = self._getArcData(d);

                            return function (t) {
                                return arc.outerRadius(interpolate(t))(arcData);
                            };

                        });

                    pathNode.isChosen = true;
                }
            }

        },

        _getElementByData:function(point){
            return this._bodyG.select('.' + point.className);

        },

        //数据点形状的数据，移动出到标签上的时候取消选中
        cancelChosenState:function(d){

            var element = this._getElementByData(d);

            if(element){

                var arc = d3.svg.arc().innerRadius(d.series.innerRadius);

                var self = this;
                var pathNode = element.node();

                if(!pathNode || !pathNode.isChosen){
                    return;
                }

                clearTimeout(pathNode.cancelChosenTimeout);

                pathNode.cancelChosenTimeout = setTimeout(function(){
                    if(pathNode.isChosen){
                        element
                            .style('fill', function(d){
                                return self._getFill(d);
                            })
                            .transition()
                            .ease("elastic").duration(600)
                            .attrTween("d", function (d) {
                                var outerRadius = d.radius;
                                var interpolate = d3.interpolate(outerRadius * HOVER_PERCENT, outerRadius);
                                var arcData = self._getArcData(d);
                                return function (t) {
                                    return arc.outerRadius(interpolate(t))(arcData);
                                };
                            });

                        pathNode.isChosen = false;
                    }
                },50);

            }

        }
    };

    BaseUtils.inherit(PieSvgRender, BaseRender);

    require('./RenderLibrary').register(Constants.PIE_SVG, PieSvgRender);

    return PieSvgRender;
});
/**
 * Created by eason on 15/9/24.
 */

define('render/BarSvgRender',['require','./BaseRender','../utils/BaseUtils','../Constants','../utils/ColorUtils','../utils/BezierEasing','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var ColorUtils = require('../utils/ColorUtils');
    var BezierEasing = require('../utils/BezierEasing');

    var INIT_ANIMATION_TIME = 400;
    var EXIT_ANIMATION_TIME = 150;
    var UPDATE_ANIMATION_TIME = 250;

    var CHOSEN_STROKE_WIDTH = 6;

    var START_GRADUAL_CLASS = 'start-gradual-class';
    var END_GRADUAL_CLASS = 'end-gradual-class';

    var BAR_SERIES_GROUP = 'bar-seires-group';

    function BarSvgRender(bar){
        BaseRender.call(this, bar);
        this.bar = bar;
    }

    BarSvgRender.prototype = {
        constructor:BarSvgRender,

        render:function(){
            var svgRoot = this.bar.getVanchartRender().getRenderRoot();

            if(!this._bodyG){
                this._bodyG = svgRoot.append('g');

                this._labelG = svgRoot.append('g');
                this._updateChartBodyTranslate([this._bodyG, this._labelG]);
            } else {
                this._updateChartBodyTranslate([this._bodyG, this._labelG], this.bar.isSupportAnimation(), UPDATE_ANIMATION_TIME);
            }

            var barData = this.bar.getVisibleChartData();

            var barSeriesS = this._bodyG
                .selectAll('g.' + BAR_SERIES_GROUP)
                .data(barData, function(d){return d.className});

            this._dropSeries(barSeriesS);

            this._updateSeries(barSeriesS);

            this._createSeries(barSeriesS);

            this._drawNormalChartLabels(this._labelG);
        },

        _dropSeries:function(seriesS){

            var exitSeries = seriesS.exit();

            var supportAnimation = this.bar.isSupportAnimation();

            exitSeries.each(function(){

                d3.select(this)
                    .selectAll('rect')
                    .transition()
                    .duration(supportAnimation ? EXIT_ANIMATION_TIME : 0)
                    .ease('linear')
                    .attrTween('y', function(d){

                        var y = d.y;
                        var height = d.height;
                        var bottomY = y + height;

                        return function(t){
                            var currentH = height * (1 - d3.ease('back')(t));
                            return bottomY - currentH + 'px';
                        }
                    })
                    .attrTween('height', function(d){
                        var height = d.height;

                        return function(t){
                            return height * (1 - d3.ease('back')(t)) + 'px';
                        }
                    })
                    .remove();
            });
        },

        _updateSeries:function(seriesS){

            var lastEmptySize = BaseUtils.pick(this.emptySeries, 0);
            this.emptySeries = seriesS.exit().size();

            var chart = this;

            seriesS.each(function(d){

                var barG = d3.select(this);

                chart._updateDefs(d.points, barG.select('defs'), d.getLocation());

                var barS = barG.selectAll('rect').data(d.points, function(d){return d.className;});

                var updateDelay = lastEmptySize < chart.emptySeries ? EXIT_ANIMATION_TIME : 0;
                var createDelay = lastEmptySize > chart.emptySeries ? UPDATE_ANIMATION_TIME : 0;

                barS.empty() ? chart._crateInitialBarElement(barS, createDelay)
                                                    : chart._updateBarTransition(barS, updateDelay);

                //这两步是自动刷新的时候可能出现的
                if(!barS.enter().empty()){
                    chart._crateInitialBarElement(barS, updateDelay + UPDATE_ANIMATION_TIME);
                }

                barS.exit().remove();

            });
        },

        _createSeries:function(seriesS){

            var newSeriesG = seriesS.enter().append('g').attr('class', BAR_SERIES_GROUP);

            var chart = this;

            newSeriesG.each(function(d){

                var barG = d3.select(this);

                chart._updateDefs(d.points, barG.append('defs'), d.getLocation());

                var barS = barG.selectAll('rect').data(d.points, function(d){return d.className;});

                barS.call(chart._crateInitialBarElement.bind(chart));
            });

        },

        _updateDefs:function(points, defs, location){

            var self = this;

            if(this.bar.option.style){
                var grads = defs.selectAll("linearGradient")
                    .data(points, function(d){
                        return d.className;
                    });

                var x1, y1, x2, y2;
                x1 = y1 = x2 = y2 = '0%';
                switch (location){
                    case Constants.TOP:
                        y1 = '100%';
                        break;
                    case Constants.BOTTOM:
                        y2 = '100%';
                        break;
                    case Constants.LEFT:
                        x1 = '100%';
                        break;
                    case Constants.RIGHT:
                        x2 = '100%';
                        break;
                }

                grads.enter()
                    .append('linearGradient')
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr('x2', x2)
                    .attr('y2', y2)
                    .attr("id", function(d){
                        return self._getGradualID(d);
                    });

                grads.append("stop")
                    .attr("offset", '0%')
                    .attr('class', START_GRADUAL_CLASS)
                    .style("stop-color", function(d){
                        return ColorUtils.getColorWithDivider(d.color, 0.9);
                    });

                grads.append("stop")
                    .attr("offset", "100%")
                    .attr('class', END_GRADUAL_CLASS)
                    .style("stop-color", function(d){
                        return d.color;
                    });
            }

            var imagePoints = [];
            points.forEach(function(point){
                if(point.image){
                    imagePoints.push(point);

                    if(point.image){
                        imagePoints.push(point);

                        switch (point.location){
                            case Constants.BOTTOM:
                                point.imageX = point.x;
                                point.imageY = point.y + point.height % point.imageHeight;
                                break;

                            case Constants.TOP:
                            case Constants.LEFT:
                                point.imageX = point.x;
                                point.imageY = point.y;
                                break;

                            case Constants.RIGHT:
                                point.imageX = point.x + point.width % point.imageWidth;
                                point.imageY = point.y;
                                break;
                        }
                    }

                }
            });

            var patterns = defs
                .selectAll('pattern')
                .data(imagePoints, function(d){
                    return d.className;
                });

            var enter = patterns
                .enter()
                .append('pattern');

            enter.append('image');

            patterns
                .attr('x', function(d){return d.imageX})
                .attr('y', function(d){return d.imageY})
                .attr('width', function(d){return d.imageWidth})
                .attr('height', function(d){return d.imageHeight})
                .attr('patternUnits', 'userSpaceOnUse')
                .attr('id', function(d){return self._getImageID(d)})
                .select('image')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', function(d){return d.imageWidth})
                .attr('height', function(d){return d.imageHeight})
                .attr('xlink:href', function(d){return d.image});

        },

        _getGradualID:function(d){
            var IDPrefix = this.bar.vanchart.getIDPrefix();
            return 'gradual' + d.className + IDPrefix;
        },

        _getImageID:function(d){
            var IDPrefix = this.bar.vanchart.getIDPrefix();
            return 'image' + d.className + IDPrefix;
        },

        _getFillWidthColor:function(d, color){

            var gradient = this._bodyG.select('#' + this._getGradualID(d));
            gradient.select("stop." + START_GRADUAL_CLASS)
                .style("stop-color", ColorUtils.getColorWithDivider(color, 0.9));

            gradient.select("stop." + END_GRADUAL_CLASS)
                .style("stop-color", color);

            var style = this.bar.option.style;
            var gradualID = "url(#" + this._getGradualID(d) + ")";
            var imageID = "url(#" + this._getImageID(d) + ")";

            return d.image ? imageID : (style == Constants.STYLE_GRADUAL ? gradualID : color);
        },

        _getMouseOverFill:function(d){
            return this._getFillWidthColor(d, d.mouseOverColor);
        },

        _getFill:function(d){
            return this._getFillWidthColor(d, d.color);
        },

        _getClickedFill:function(d){
            return this._getFillWidthColor(d, d.clickColor);
        },

        _crateInitialBarElement:function(selection, delay){

            delay = delay || 0;

            var self = this;

            var enterSelection = selection.enter().append('rect');

            //创建的时候加监听
            this.addShapeEventHandler(enterSelection);

            var supportAnimation = this.bar.isSupportAnimation();

            enterSelection
                .each(function(d){

                    var barChangeInfo = self.bar.getInitBarAttribute(d);

                    var initBar = supportAnimation ? barChangeInfo.init : d;
                    var endBar = barChangeInfo.end;

                    var bar = d3.select(this);

                    self._setInitBarAttributes(bar, d, initBar);

                    if(supportAnimation && d.width > 0 && d.height > 0){

                        bar
                            .transition()
                            .ease(BezierEasing.css.swing)
                            .duration(INIT_ANIMATION_TIME)
                            .delay(delay)
                            .attr('x', endBar.x)
                            .attr('y', endBar.y)
                            .attr('width', endBar.width)
                            .attr('height', endBar.height)
                            .each('end', function(){
                                bar
                                    .attr('x', d.x)
                                    .attr('y', d.y)
                                    .attr('width', d.width)
                                    .attr('height', d.height);
                            });

                    }else{

                        bar
                            .attr('x', d.x)
                            .attr('y', d.y)
                            .attr('width', d.width)
                            .attr('height', d.height);

                    }
                });
        },

        _setInitBarAttributes:function(barSelection, d, initBar){

            barSelection
                .attr('class', d.className)
                .attr('x', initBar.x)
                .attr('y', initBar.y)
                .attr('width', initBar.width)
                .attr('height', initBar.height)
                .attr('rx', d.borderRadius)
                .attr('ry', d.borderRadius)
                .style({
                    'fill': this._getFill(d),
                    'stroke': d.borderColor,
                    'stroke-width': d.borderWidth
                })
                .each(function(){
                    this._current_ = {x: d.x, y: d.y, width: d.width, height: d.height};
                });
        },

        //已经显示的系列的动画
        _updateBarTransition:function(barS, delay){

            var supportAnimation = this.bar.isSupportAnimation();
            var self = this;
            var delay = delay || 0;

            if(supportAnimation){
                barS
                    .each(function(d){
                        var lastBar = this._current_ || {x: d.x, y: d.y, width: d.width, height: d.height};
                        this._current_ = {x: d.x, y: d.y, width: d.width, height: d.height};

                        d3.select(this)
                            .transition()
                            .duration(UPDATE_ANIMATION_TIME)
                            .delay(delay)
                            .ease('linear')
                            .attrTween('x',function(){
                                return function(t){
                                    return lastBar.x + (d.x - lastBar.x)*BezierEasing.css.swing(t) + 'px';
                                }
                            })
                            .attrTween('y',function(){
                                return function(t){
                                    return lastBar.y + (d.y - lastBar.y)*BezierEasing.css.swing(t) + 'px';
                                }
                            })
                            .attrTween('width',function(){
                                return function(t){
                                    return lastBar.width + (d.width - lastBar.width)*BezierEasing.css.swing(t) + 'px';
                                }
                            })
                            .attrTween('height',function(){
                                return function(t){
                                    return lastBar.height + (d.height - lastBar.height)*BezierEasing.css.swing(t) + 'px';
                                }
                            });
                    });
            }else{
                barS.each(function(d){
                    self._setInitBarAttributes(d3.select(this), d, d);
                });
            }

        },

        _getElementByData:function(point){
            return this._bodyG.select('.' + point.className);
        },

        //数据点形状的数据，移动到标签上的时候触发选中
        makeChosenState:function(d){

            this._getElementByData(d)
                .style('stroke', d.mouseOverColor)
                .style('fill', this._getMouseOverFill(d))
                .style('stroke-width', d.borderWidth)
                .style('stroke-opacity', 0.35)
                .interrupt(Constants.SELECT_ANIMATION)
                .transition(Constants.SELECT_ANIMATION)
                .duration(100)
                .ease('ease-out-in')
                .style('stroke-width', CHOSEN_STROKE_WIDTH);
        },

        //数据点形状的数据，移动出到标签上的时候取消选中
        cancelChosenState:function(d){

            var element = this._getElementByData(d);

            element
                .interrupt(Constants.SELECT_ANIMATION)
                .transition(Constants.SELECT_ANIMATION);

            element
                .style('fill', this._getFill(d))
                .style('stroke', d.borderColor)
                .style('stroke-opacity', 1)
                .style('stroke-width', d.borderWidth);

        },

        makeClickedState:function(d){
            this._getElementByData(d)
                .style('fill', this._getClickedFill(d));

        },

        cancelClickedState:function(d){

            this._getElementByData(d)
                .style('fill', this._getMouseOverFill(d));

        }
    };


    BaseUtils.inherit(BarSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.BAR_SVG, BarSvgRender);
});
/**
 * Created by eason on 15/11/6.
 */
define('render/LineSvgRender',['require','./BaseRender','../utils/BaseUtils','../utils/ColorUtils','../Constants','../utils/QueryUtils','../utils/BezierEasing','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');

    var QueryUtils = require('../utils/QueryUtils');
    var Bezier = require('../utils/BezierEasing');

    var LINE_G_CLASS = 'lineGroupG';
    var AREA_G_CLASS = 'areaGroupG';

    var MARKER_G_CLASS = 'markerGroupG';
    var PATH_G = 'pathG';
    var AREA_G = 'areaG';

    var CLASS = 'class';

    var LINE_SHOW_TIME = 800;
    var LINE_MONITOR_TIME = 500;
    var LINE_UPDATE_TIME = 250;

    var CHOSEN_AREA_ALPHA = 0.65;

    function LineSvgRender(line){
        BaseRender.call(this, line);
        this.line = line;
    }

    LineSvgRender.prototype = {
        constructor:LineSvgRender,
        render:function(){

            var svgRoot = this.line.getVanchartRender().getRenderRoot();

            if(!this._bodyG){
                this._bodyG = svgRoot.append('g');
                this._defsG = this._bodyG.append('g');
                this._areaG = this._bodyG.append('g');
                this._lineG = this._bodyG.append('g');
                this._labelG = this._bodyG.append('g');
                this._updateChartBodyTranslate([this._bodyG]);
            } else {
                this._updateChartBodyTranslate([this._bodyG], this.line.isSupportAnimation(), LINE_UPDATE_TIME);
            }

            this._updateLineSeries();

            this._drawNormalChartLabels(this._labelG, this.line.isSupportAnimation() ? LINE_SHOW_TIME : 0);
        },

        //animationTime, easeFunc是对update状态的线组
        _updateLineSeries:function(animationTime, easeFunc){

            var g = this._updateDataBinding();
            var defsG = g.defsG;
            var areaG = g.areaG;
            var lineG = g.lineG;

            animationTime = this.line.isSupportAnimation() ? (animationTime || LINE_UPDATE_TIME) : 0;

            easeFunc = easeFunc || Bezier.css.swing;

            //退场的折线删除
            defsG.exit().remove();
            lineG.exit().remove();
            areaG.exit().remove();

            defsG
                .selectAll('clipPath')
                .select('rect')
                .transition()
                .ease(easeFunc)
                .duration(animationTime)
                .attr('x', function(d){
                    return d.x;
                })
                .attr('y', function(d){
                    return d.y;
                })
                .attr('width', function(d){
                    return d.width;
                })
                .attr('height', function(d){
                    return d.height;
                });

            areaG
                .selectAll('path')
                .filter(function(d){
                    return d.lineData.isStack;
                })
                .transition()
                .ease(easeFunc)
                .duration(animationTime)
                .attr('d', function(d){
                    var lineData = d.lineData;
                    return lineData.areaSvg(lineData.points);
                })
                .each('end', function(){
                    d3.select(this)
                        .attr('d', function(d){
                            var lineData = d.lineData;
                            return lineData.areaSvg(lineData.points);
                        });
                });

            lineG
                .select('g.' + PATH_G)
                .selectAll('path')
                .transition()
                .ease(easeFunc)
                .duration(animationTime)
                .attr('d', function(d){
                    var lineData = d.lineData;
                    return lineData.lineSvg(lineData.points);
                })
                .each('end', function(){
                    d3.select(this)
                        .attr('d', function(d){
                            var lineData = d.lineData;
                            return lineData.lineSvg(lineData.points);
                        });
                });

            lineG
                .select('g.' + AREA_G)
                .selectAll('path')
                .filter(function(d){
                    return !d.lineData.isStack;
                })
                .transition()
                .ease(easeFunc)
                .duration(animationTime)
                .attr('d', function(d){
                    var lineData = d.lineData;
                    return lineData.areaSvg(lineData.points);
                })
                .each('end', function(){
                    d3.select(this)
                        .attr('d', function(d){
                            var lineData = d.lineData;
                            return lineData.areaSvg(lineData.points);
                        });
                });


            var self = this;
            lineG.each(function(d){

                var markers = d3.select(this)
                    .select('g.' + MARKER_G_CLASS)
                    .selectAll('g').data(d.points);

                markers
                    .transition()
                    .ease(easeFunc)
                    .duration(animationTime)
                    .attr('transform', function(d){
                        return 'translate(' + d.x + ',' + d.y + ')';
                    })
                    .each('end', function(d){

                        var markerG = d3.select(this);

                        markerG
                            .attr('transform', function(){
                                return 'translate(' + d.x + ',' + d.y + ')';
                            });

                        d.elWrapper = markerG;

                    });

                markers.exit().remove();

                d3.select(this)
                    .transition()
                    .delay(animationTime)
                    .each('end', function(){

                        markers.call(self._createSvgMarker.bind(self))
                            .attr('transform', function(d) {
                                return 'translate(' + d.x + ',' + d.y + ')';
                            });

                    });

            });

            //新建折线
            this._createNewLineSeries(g);
        },

        _updateDataBinding:function(){

            var lines = this.line.getVisibleChartData();

            var lineG = this._lineG
                .selectAll('g.' + LINE_G_CLASS)
                .data(lines, function(d){return d.className});

            var areaG = this._areaG
                .selectAll('g.' + AREA_G_CLASS)
                .data(lines, function(d){return d.className});

            var defsG = this._defsG
                .selectAll('defs')
                .data(lines, function(d){
                    return d.className;
                });

            defsG
                .selectAll('clipPath')
                .data(function(d){
                    return d.dataBands;
                });

            areaG
                .selectAll('path')
                .data(function(d){
                    return d.dataBands;
                });

            lineG.select('g.' + PATH_G)
                .selectAll('path')
                .data(function(d){
                    return d.dataBands;
                });

            lineG.select('g.' + AREA_G)
                .selectAll('path')
                .data(function(d){
                    return d.dataBands;
                });

            return {
                defsG:defsG,
                areaG:areaG,
                lineG:lineG
            };
        },

        _createNewLineSeries:function(g){

            var g = this._updateDataBinding();
            var defsG = g.defsG;
            var areaG = g.areaG;
            var lineG = g.lineG;
            var self = this;

            var animationTime = this.line.isSupportAnimation() ? LINE_SHOW_TIME : 0;

            defsG
                .enter()
                .append('defs')
                .selectAll('clipPath')
                .data(function(d){
                    return d.dataBands;
                })
                .enter()
                .append('clipPath')
                .attr('id', function(d){
                    return d.clipID;
                })
                .append('rect')
                .attr('x', function(d){
                    return d.x;
                })
                .attr('y', function(d){
                    return d.y;
                })
                .attr('width', 0)
                .attr('height', function(d){
                    return d.height;
                })
                .transition()
                .ease('quad-in-out')
                .duration(animationTime)
                .attr('width', function(d){
                    return d.width;
                });

            if(this.line.type == Constants.AREA_CHART){

                var enterArea = areaG.enter();

                enterArea
                    .append('g')
                    .attr('class', function(d){
                        return AREA_G_CLASS + ' ' + (d.className);
                    })
                    .selectAll('path')
                    .data(function(d){
                        return d.dataBands;
                    })
                    .enter()
                    .append('path')
                    .filter(function(d){
                        return d.lineData.isStack;
                    })
                    .style('fill', function(d){
                        return d.fillColor;
                    })
                    .style('fill-opacity', function(d){
                        return d.fillColorOpacity;
                    })
                    .style('stroke', 'none')
                    .attr('d', function(d){
                        var lineData = d.lineData;
                        return lineData.areaSvg(lineData.points);
                    })
                    .attr('clip-path', function(d){
                        return "url(#"  + d.clipID +")";
                    });

                this.addSeriesEventHandler(enterArea);
            }

            var enterG = lineG.enter()
                .append('g')
                .attr('class', function(d){
                    return LINE_G_CLASS + ' ' + (d.className);
                });

            enterG.append('g')
                .attr('class', PATH_G)
                .selectAll('path')
                .data(function(d){
                    return d.dataBands;
                })
                .enter()
                .append('path')
                .style('fill', 'none')
                .style('stroke', function(d){
                    return d.color;
                })
                .style('stroke-width', function(d){
                    return d.lineData.lineWidth;
                })
                .attr('d', function(d){
                    var lineData = d.lineData;
                    return lineData.lineSvg(lineData.points);
                })
                .attr('clip-path', function(d){
                    return "url(#"  + d.clipID +")";
                });

            this.addSeriesEventHandler(enterG);

            if(this.line.type == Constants.AREA_CHART){
                enterG.append('g')
                    .attr('class', AREA_G)
                    .selectAll('path')
                    .data(function(d){
                        return d.dataBands;
                    })
                    .enter()
                    .append('path')
                    .filter(function(d){
                        return !d.lineData.isStack;
                    })
                    .style('fill', function(d){
                        return d.fillColor;
                    })
                    .style('fill-opacity', function(d){
                        return d.fillColorOpacity;
                    })
                    .style('stroke', 'none')
                    .attr('d', function(d){
                        var lineData = d.lineData;
                        return lineData.areaSvg(lineData.points);
                    })
                    .attr('clip-path', function(d){
                        return "url(#"  + d.clipID +")";
                    });
            }

            if(this.line.isSupportAnimation()){
                enterG
                    .append('g')
                    .attr('class', MARKER_G_CLASS)
                    .selectAll('g')
                    .data(function(d){ return d.points; })
                    .call(this._createSvgMarker.bind(this))
                    .attr('transform', function(d){
                        return 'translate('+ d.x +','+ d.y +') scale(0.01)';
                    })
                    .transition()
                    .delay(function(d){return d.delay})
                    .duration(150)
                    .ease('ease-out-in')
                    .attr('transform', function(d){
                        return 'translate('+ d.x +','+ d.y +') scale(1.5)';
                    })
                    .transition()
                    .duration(150)
                    .ease('ease-out-in')
                    .attr('transform', function(d){
                        return 'translate('+ d.x +','+ d.y +') scale(1)';
                    });
            }else{
                enterG
                    .append('g')
                    .attr('class', MARKER_G_CLASS)
                    .selectAll('g')
                    .data(function(d){return d.points;})
                    .call(this._createSvgMarker.bind(this))
                    .attr('transform', function(d){
                        return 'translate('+ d.x +','+ d.y +')';
                    });
            }
        },

        _createImageMarker:function(src, callBack){
            var img = new Image();
            img.onload = function() {
                callBack(this.width, this.height);
            };
            img.src = src;
        },

        getElementByData:function(d){
            return this._lineG.select('g.' + d.className);
        },

        makeClickedState:function(d){

            this._makeMarkerClickedState(this._lineG, d);

            this._lineG
                .select('g.' + (d.series.className))
                .select('g.' + AREA_G)
                .selectAll('path')
                .style('fill', function(d){
                    return ColorUtils.getClickColor(d.fillColor);
                });

            this._areaG
                .select('g.' + (d.series.className))
                .selectAll('path')
                .style('fill', function(d){
                    return ColorUtils.getClickColor(d.fillColor);
                });
        },

        cancelClickedState:function(d){

            this._cancelMarkerClickedState(this._lineG, d);

            this._lineG
                .select('g.' + (d.series.className))
                .select('g.' + AREA_G)
                .selectAll('path')
                .style('fill', function(d){
                    return ColorUtils.getHighLightColor(d.fillColor);
                });

            this._areaG
                .select('g.' + (d.series.className))
                .select('g.' + PATH_G)
                .selectAll('path')
                .style('fill', function(d){
                    return ColorUtils.getHighLightColor(d.fillColor);
                });

        },

        makeChosenState:function(d){
            this._makeMarkerChosenState(this._lineG, d);

            this._lineG
                .select('g.' + (d.series.className))
                .select('g.' + AREA_G)
                .selectAll('path')
                .transition(Constants.SELECT_ANIMATION)
                .duration(100)
                .ease('swing')
                .style('fill', function(d){
                    return ColorUtils.getHighLightColor(d.fillColor);
                })
                .style('fill-opacity', CHOSEN_AREA_ALPHA);

            this._lineG
                .select('g.' + (d.series.className))
                .select('g.' + PATH_G)
                .selectAll('path')
                .transition(Constants.SELECT_ANIMATION)
                .duration(100)
                .ease('swing')
                .style('stroke', function(d){
                    return ColorUtils.getHighLightColor(d.color);
                })
                .style('stroke-width', function(d){
                    return d.lineData.lineWidth + 1;
                });

            BaseUtils.toFront(this._lineG.select('g.' + (d.series.className)).node());

            this._areaG
                .select('g.' + (d.series.className))
                .selectAll('path')
                .transition(Constants.SELECT_ANIMATION)
                .duration(100)
                .ease('swing')
                .style('fill', function(d){
                    return ColorUtils.getHighLightColor(d.fillColor);
                })
                .style('fill-opacity', CHOSEN_AREA_ALPHA);
        },

        cancelChosenState:function(d){
            this._cancelMarkerChosenState(this._lineG, d);

            this._lineG
                .select('g.' + (d.series.className))
                .select('g.' + AREA_G)
                .selectAll('path')
                .transition(Constants.SELECT_ANIMATION)
                .duration(100)
                .ease('swing')
                .style('fill', function(d){
                    return d.fillColor;
                })
                .style('fill-opacity', function(d){
                    return d.fillColorOpacity;
                });

            this._lineG
                .select('g.' + (d.series.className))
                .select('g.' + PATH_G)
                .selectAll('path')
                .transition(Constants.SELECT_ANIMATION)
                .duration(100)
                .ease('swing')
                .style('stroke', function(d){
                    return d.color;
                })
                .style('stroke-width', function(d){
                    return d.lineData.lineWidth;
                });

            this._areaG
                .select('g.' + (d.series.className))
                .selectAll('path')
                .transition(Constants.SELECT_ANIMATION)
                .duration(100)
                .ease('swing')
                .style('fill', function(d){
                    return d.fillColor;
                })
                .style('fill-opacity', function(d){
                    return d.fillColorOpacity;
                });
        }
    };


    BaseUtils.inherit(LineSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.LINE_SVG, LineSvgRender);

    return LineSvgRender;

});
/**
 * Created by eason on 15/11/6.
 */
define('render/AreaSvgRender',['require','../utils/BaseUtils','../Constants','./LineSvgRender','./RenderLibrary'],function(require){

    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var LineSvgRender = require('./LineSvgRender');


    function AreaSvgRender(area){
        LineSvgRender.call(this, area);
        this.area = area;
    }

    AreaSvgRender.prototype = {

        constructor:AreaSvgRender
    };

    BaseUtils.inherit(AreaSvgRender, LineSvgRender);

    require('./RenderLibrary').register(Constants.AREA_SVG, AreaSvgRender);
});
/**
 * Created by eason on 15/12/2.
 */

define('render/GaugeSvgRender',['require','../utils/BaseUtils','../utils/ColorUtils','../Constants','./BaseRender','./RenderLibrary'],function(require){

    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');
    var BaseRender = require('./BaseRender');

    var ANIMATION_TIME = 1000;
    var THERMOMETER_R = 5;
    var MAGIC_DET = 0.001;
    var EASE_TYPE = 'quad-out';

    var GAUGE = 'gauge-class';

    var POINTER_HINGE_BACKGROUND = 'pointer-hinge-background';
    var POINTER_HINGE = 'pointer-hinge';
    var SLOT_BACKGROUND = 'slot-background';
    var THERMOMETER_BACKGROUND = 'thermometer-background';
    var RING_INNER_BACKGROUND = 'ring-inner-background';
    var RING_INNER_STROKE = 'ring-inner-stroke';
    var RING_OUTER_STROKE = 'ring-outer-stroke';
    var RING_ARC_PATH = 'ring-arc-path';

    var NEEDLE = 'gauge-needle';
    var BACKGROUND = 'gauge-background';
    var GAUGE_LABEL = 'gauge-label';
    var GAUGE_AXIS = 'gauge-axis';

    function GaugeSvgRender(gauge){
        BaseRender.call(this, gauge);
        this.gauge = gauge;
    }


    GaugeSvgRender.prototype = {
        constructor:GaugeSvgRender,

        render:function(){

            var plotBounds = this.gauge.getPlotBounds();
            var svgRoot = this.gauge.getVanchartRender().getRenderRoot();

            this._bodyG = this._bodyG || svgRoot.append('g');
            this._bodyG.attr('transform', 'translate('+plotBounds.x+','+plotBounds.y+')');
            this._bodyG.select('defs').remove();
            this._createDefs();

            this.labelDivManager.clearAllLabels();

            var data = this.gauge.getVisibleChartData();

            var gaugeS = this._bodyG
                .selectAll('g.' + GAUGE).data(data)
                .attr('class', function(d){
                    return GAUGE + ' ' + d.className;
                });

            gaugeS
                .call(this._updateGauge.bind(this))
                .transition()
                .duration(ANIMATION_TIME)
                .ease(EASE_TYPE)
                .attr('transform', function(d){
                    return 'translate(' + d.centerX + ',' + d.centerY + ')';
                });

            gaugeS
                .enter()
                .append('g')
                .attr('class', function(d){
                    return GAUGE + ' ' + d.className;
                })
                .attr('transform', function(d){
                    return 'translate(' + Math.round(d.centerX) + ',' + Math.round(d.centerY) + ')';
                })
                .call(this._createGauge.bind(this));
        },

        _createDefs:function(){
            var defs= this._bodyG.append('defs');

            this._createVerticalLinearGradient(defs, this._getRingGradualID(), '#ffffff', '#dddddd');
            this._createVerticalLinearGradient(defs, this._getRingClickedGradualID(), '#dddddd', '#ffffff');

            var self = this;
            var gaugeData = this.gauge.getVisibleChartData();
            gaugeData.forEach(function(gauge){

                var point = gauge.points[0];

                if(!point){
                    return;
                }

                if(gauge.style == Constants.GAUGE_THERMOMETER){
                    var endColor = point.color;
                    var startColor = ColorUtils.mixColorWithHSB(endColor, 0, -0.1, 0.1);

                    var endColorClicked = ColorUtils.getColorWithDivider(endColor, 1/0.95);
                    var startColorClicked = ColorUtils.mixColorWithHSB(endColor, 0, -0.1, 0.1);

                    var endColorMouseOver = ColorUtils.getColorWithDivider(point.mouseOverColor, 1/0.95);
                    var startColorMouseOver = ColorUtils.mixColorWithHSB(point.mouseOverColor, 0, -0.1, 0.1);

                    if(gauge.thermometerLayout == Constants.HORIZONTAL_LAYOUT){

                        self._createHorizontalLinearGradient(defs, self._getThermometerGradualID(gauge), startColor, endColor);
                        self._createHorizontalLinearGradient(defs, self._getThermometerClickedGradualID(gauge), startColorClicked, endColorClicked);
                        self._createHorizontalLinearGradient(defs,  self._getThermometerMouseOverGradualID(gauge), startColorMouseOver, endColorMouseOver)

                    }else{

                        self._createVerticalLinearGradient(defs, self._getThermometerGradualID(gauge), endColor, startColor);
                        self._createVerticalLinearGradient(defs, self._getThermometerClickedGradualID(gauge), endColorClicked, startColorClicked);
                        self._createVerticalLinearGradient(defs,  self._getThermometerMouseOverGradualID(gauge), endColorMouseOver, startColorMouseOver)

                    }
                }else if(gauge.style == Constants.GAUGE_POINTER || gauge.style == Constants.GAUGE_POINTER_SEMI){

                    self._createDropShadowFilter(defs, self._getPointerDropShadowID(), 0, 2, 0.1, 2);
                    self._createInnerShadowFilter(defs, self._getPointerInnerShadowID(), 0, 2, 0.1, 2);

                }else if(gauge.style == Constants.GAUGE_SLOT){
                    self._createDropShadowFilter(defs, self._getSlotDropShadowID(), 0, 2, 0.05, 0);
                    self._createInnerShadowFilter(defs, self._getSlotInnerShadowID(), 0, 2, 0.05, 0);
                }

            });
        },

        _removeGaugeLabels:function(gaugeG){
            var labelG = gaugeG.select('g.' + GAUGE_LABEL);

            labelG.selectAll('text').remove();
            labelG.selectAll('rect').remove();
        },

        _createGauge:function(gaugeG){

            var self = this;

            gaugeG.each(function(d){

                var style = d.style;
                var gSelection = d3.select(this);

                self.addSeriesEventHandler(gSelection);

                switch (style){
                    case Constants.GAUGE_POINTER:
                        gSelection.append('path').attr('class', BACKGROUND);
                        gSelection.append('path').attr('class', POINTER_HINGE_BACKGROUND);
                        gSelection.append('g').attr('class', GAUGE_LABEL);
                        gSelection.append('g').attr('class', GAUGE_AXIS);
                        gSelection.append('g').attr('class', NEEDLE);
                        gSelection.append('path').attr('class', POINTER_HINGE);

                        self._createPointerCircle(gSelection, d);
                        break;

                    case Constants.GAUGE_POINTER_SEMI:
                        gSelection.append('path').attr('class', BACKGROUND);
                        gSelection.append('path').attr('class', POINTER_HINGE_BACKGROUND);
                        gSelection.append('g').attr('class', GAUGE_LABEL);
                        gSelection.append('g').attr('class', GAUGE_AXIS);
                        gSelection.append('g').attr('class', NEEDLE);
                        gSelection.append('path').attr('class', POINTER_HINGE);
                        self._createPointerSemi(gSelection, d);
                        break;

                    case Constants.GAUGE_SLOT:
                        gSelection.append('path').attr('class', BACKGROUND);
                        gSelection.append('path').attr('class', SLOT_BACKGROUND);
                        gSelection.append('circle').attr('class', NEEDLE);
                        gSelection.append('g').attr('class', GAUGE_LABEL);

                        self._createSlot(gSelection, d);
                        break;

                    case Constants.GAUGE_THERMOMETER:

                        gSelection.append('line').attr('class', BACKGROUND);
                        gSelection.append('line').attr('class', THERMOMETER_BACKGROUND);
                        gSelection.append('circle').attr('class', NEEDLE);
                        gSelection.append('g').attr('class', GAUGE_AXIS);
                        gSelection.append('g').attr('class', GAUGE_LABEL);

                        self._createThermometer(gSelection, d);
                        break;

                    case Constants.GAUGE_RING:
                        gSelection.append('path').attr('class', BACKGROUND);
                        gSelection.append('path').attr('class', RING_ARC_PATH);
                        gSelection.append('path').attr('class', RING_INNER_BACKGROUND);
                        gSelection.append('path').attr('class', RING_INNER_STROKE);
                        gSelection.append('path').attr('class', RING_OUTER_STROKE);
                        gSelection.append('g').attr('class', GAUGE_LABEL);

                        self._createRing(gSelection, d);
                        break;
                }

            });
        },

        _updateGauge:function(gaugeG){
            var self = this;

            gaugeG.each(function(d){

                var style = d.style;
                var gSelection = d3.select(this);

                self._removeGaugeLabels(gSelection);

                switch (style){
                    case Constants.GAUGE_POINTER:
                        self._createPointerCircle(gSelection, d);
                        break;

                    case Constants.GAUGE_POINTER_SEMI:
                        self._createPointerSemi(gSelection, d);
                        break;

                    case Constants.GAUGE_SLOT:
                        self._createSlot(gSelection, d);
                        break;

                    case Constants.GAUGE_THERMOMETER:
                        self._createThermometer(gSelection, d);
                        break;

                    case Constants.GAUGE_RING:
                        self._createRing(gSelection, d);
                        break;
                }

            });

        },

        _createPointerCircle:function(gaugeG, d){
            this._createPointer(gaugeG, d, 180, 150, 0.16, 0.07);
        },

        _createPointerSemi:function(gaugeG, d){
            this._createPointer(gaugeG, d, 98, 90, 0.11, 0.055);
        },

        _createPointer:function(gaugeG, d, baseAngle, scaleAngle, hBackground, hinge){

            var circle = d3.svg.arc().startAngle(0).endAngle(2 * Math.PI).innerRadius(0);

            var arc = d3.svg.arc().startAngle(BaseUtils.toRadian(-baseAngle))
                                        .endAngle(BaseUtils.toRadian(baseAngle))
                                                .innerRadius(0).outerRadius(d.radius).toCenter(false);

            var domain = d.yAxis.scale.domain();
            var scale = d3.scale.linear().domain(domain)
                     .range([BaseUtils.toRadian(-scaleAngle), BaseUtils.toRadian(scaleAngle)]);

            gaugeG
                .select('path.' + BACKGROUND)
                .attr('d', arc())
                .style('fill', d.paneBackgroundColor)
                .style('fill-opacity', ColorUtils.getColorOpacity(d.paneBackgroundColor))

            this._addFilter(gaugeG.select('path.' + BACKGROUND), this._getPointerDropShadowID());

            //枢纽背景
            circle.outerRadius(hBackground * d.radius);
            gaugeG
                .select('path.' + POINTER_HINGE_BACKGROUND)
                .attr('d', circle())
                .style('fill', d.hingeBackgroundColor)
                .style('fill-opacity', ColorUtils.getColorOpacity(d.hingeBackgroundColor));

            this._addFilter(gaugeG.select('path.' + POINTER_HINGE_BACKGROUND), this._getPointerInnerShadowID());

            this._drawGaugeLabels(gaugeG, d);

            this._drawPointerTicks(gaugeG, d, scale);

            this._drawPointerArrow(gaugeG, d, scale);

            //枢纽
            circle.outerRadius(hinge * d.radius);
            gaugeG
                .select('path.' + POINTER_HINGE)
                .attr('d', circle())
                .style('fill', d.hinge)
                .style('fill-opacity', ColorUtils.getColorOpacity(d.hinge));

            this._addFilter(gaugeG.select('path.' + POINTER_HINGE), this._getPointerDropShadowID());
        },

        _drawPointerArrow:function(gaugeG, d, scale){

            var pointerG = gaugeG.select('g.' + NEEDLE);

            var self = this;
            var domain = scale.domain();

            var arrows = pointerG
                .selectAll('path').data(d.points);

            arrows
                .enter().append('path').call(this.addShapeEventHandler.bind(this));

            arrows.exit().remove();

            arrows.each(function(point){

                var pointer = d3.select(this);

                var rotate = self._getRotate(pointer);

                var initRadian = self.gauge.isSupportAnimation() ? scale(domain[0]) : scale(point.valueInDomain);

                var endRadian = scale(point.valueInDomain);

                var endDegree = BaseUtils.toDegree(endRadian - initRadian);

                pointer
                    .attr('d', self._getArrowPath(d.radius, initRadian))
                    .style('fill', d.needle)
                    .style('fill-opacity', ColorUtils.getColorOpacity(d.needle))
                    .transition()
                    .duration(ANIMATION_TIME)
                    .ease(EASE_TYPE)
                    .attrTween('transform', function(){

                        var interpolate = d3.interpolate(rotate, endDegree);

                        return function(t){
                            return "rotate(" + interpolate(t) + ")";
                        }
                    });

                self._addFilter(pointer, self._getPointerDropShadowID(), ANIMATION_TIME)
            });
        },


        //todo iie10直接加阴影会导致指针不显示
        _addFilter:function(selection, filterID, delay){
            delay = delay || 0;
            delay += 100;
            setTimeout(function(){
                if(selection){
                    selection.style("filter", 'url(#'+ filterID +')')
                }
            }, delay)
        },

        _getRotate:function(selectionG){

            var transform = selectionG.attr('transform');

            if(transform){
                var startIndex = transform.indexOf('(');
                if(startIndex != -1){
                    return parseFloat(transform.substr(startIndex + 1));
                }
            }

            return 0;

        },

        _getArrowPath:function(radius, initRadian){

            var p0 = this._getArcPoint(0.9 * radius, initRadian);

            var p1 = this._getArcPoint(0.02 * radius, initRadian + Math.PI/2);

            var p2 = this._getArcPoint(0.02 * radius, initRadian - Math.PI/2);

            return 'M' + p0[0] + ',' + p0[1] + 'L' + p1[0] + ',' + p1[1] + 'L' + p2[0] + ',' + p2[1] + 'Z';

        },

        _drawPointerTicks:function(gaugeG, d, scale){

            var axisG = gaugeG.select('g.' + GAUGE_AXIS);

            var tickData = d.yAxis.getTickData();

            var axisOption = d.yAxis.componentOption;
            var labelStyle = axisOption.labelStyle;
            var useHtml = axisOption.useHtml;

            var minorTickData = d.yAxis.getMinorTickData();

            var self = this;

            var tickR = (1 - 0.05) * d.radius;
            var labelR = (1 - 0.05 - 0.1 - 0.01) * d.radius;

            var bands = d.bands;
            var plotBounds = this.gauge.getPlotBounds();
            var transX = plotBounds.x + d.centerX;
            var transY = plotBounds.y + d.centerY;

            var tick = axisG.selectAll("g.tick").data(tickData, function(d){
                return scale(d.tickValue);
            });

            tick.exit().remove();

            var enterTick = tick.enter().append('g').attr('class', 'tick');
            enterTick.append('text');
            enterTick.append('line');

            tick.each(function(tickD){

                var tickG = d3.select(this);

                var radian = scale(tickD.tickValue);
                var start = self._getArcPoint(tickR, radian);
                var end = self._getArcPoint(tickR - 0.1 * d.radius, radian);

                var color = self.gauge._getColorFromBands(tickD.tickValue, bands);

                tickG
                    .select('line')
                    .attr('x1', start[0])
                    .attr('y1', start[1])
                    .attr('x2', end[0])
                    .attr('y2', end[1])
                    .attr('stroke', color);

                var center = self.gauge._getPointerTickCenter(tickD, labelR, scale);

                if(useHtml){

                    var labelPos = {
                        x:transX + center.x - tickD.tickDim.width/2,
                        y:transY + center.y - tickD.tickDim.height/2
                    };
                    self.labelDivManager.addLabel(tickD.tickContent, labelPos, labelStyle);

                }else{
                    tickG
                        .select('text')
                        .attr('x', center.x)
                        .attr('y', center.y)
                        .attr('dy', '.35em')
                        .attr("text-anchor", "middle")
                        .text(tickD.tickContent)
                        .call(BaseUtils.setTextStyle, labelStyle);
                }

            });

            var minorTick = axisG.selectAll("line.minorTick")
                .data(minorTickData, function(d){return scale(d);});

            minorTick.enter().append('line').attr('class', 'minorTick');

            minorTick.exit().remove();

            minorTick.each(function(value){

                var radian = scale(value);
                var start = self._getArcPoint(tickR, radian);
                var end = self._getArcPoint(tickR - 0.05 * d.radius, radian);

                var color = self.gauge._getColorFromBands(value, bands);

                d3.select(this)
                    .attr('x1', start[0])
                    .attr('y1', start[1])
                    .attr('x2', end[0])
                    .attr('y2', end[1])
                    .attr('stroke', color);
            });

        },

        _getArcPoint:function(r, radian){
            return [r * Math.sin(radian), -r * Math.cos(radian)]
        },

        _createSlot:function(gaugeG, d){

            var arc = d3.svg.arc().startAngle(BaseUtils.toRadian(-135))
                .endAngle(BaseUtils.toRadian(135))
                .innerRadius(0).outerRadius(d.radius)
                .toCenter(false).closePath(false);

            var circle = d3.svg.arc().startAngle(BaseUtils.toRadian(-135))
                .endAngle(BaseUtils.toRadian(135))
                .innerRadius(0).outerRadius(d.radius)
                .toCenter(false).closePath(false);

            var domain = d.yAxis.scale.domain();
            var scale = d3.scale.linear().domain(domain)
                .range([BaseUtils.toRadian(-135), BaseUtils.toRadian(135)]);

            var point = d.points[0];

            if(!point){
                return;
            }

            var initRadian = scale(domain[0]);
            var endRadian = scale(point.valueInDomain);
            var startStroke = this.gauge._getColorFromBands(domain[0], d.bands);
            var endStroke = point.color;

            var lastRotate = this._getRotate(gaugeG.select('circle.' + NEEDLE));

            var lastStroke = gaugeG.select('path.' + SLOT_BACKGROUND).attr('lastStroke');
            startStroke = BaseUtils.isEmpty(lastStroke) ? startStroke : lastStroke;

            if(!this.gauge.isSupportAnimation()){
                initRadian = endRadian;
                startStroke = endStroke;
            }

            gaugeG
                .select('path.' + BACKGROUND)
                .attr('d', circle())
                .style({
                    'fill':'none',
                    'stroke': d.slotBackgroundColor,
                    'stroke-linecap':'round',
                    'stroke-width': d.radius * 0.16
                });

            this._addFilter(gaugeG.select('path.' + BACKGROUND), this._getSlotInnerShadowID());

            gaugeG
                .select('path.' + SLOT_BACKGROUND)
                .attr('lastStroke', endStroke)
                .style({
                    'fill':'none',
                    'stroke': ColorUtils.colorToHex(startStroke),
                    'stroke-linecap':'round',
                    'stroke-width': d.radius * 0.16
                })
                .transition()
                .duration(ANIMATION_TIME)
                .ease(EASE_TYPE)
                .attrTween('d', function(){

                    var interpolate = d3.interpolate(initRadian + BaseUtils.toRadian(lastRotate), endRadian);

                    return function(t){
                        return arc.endAngle(interpolate(t))();
                    }
                })
                .style('stroke', ColorUtils.colorToHex(endStroke));

            //白色指针
            var cP = this._getArcPoint(d.radius, initRadian);
            gaugeG
                .select('circle.' + NEEDLE)
                .attr('cx', cP[0])
                .attr('cy', cP[1])
                .attr('r', 0.048 * d.radius)
                .style('fill', d.needle)
                .style('fill-opacity', ColorUtils.getColorOpacity(d.needle))
                .transition()
                .duration(ANIMATION_TIME)
                .ease(EASE_TYPE)
                .attrTween('transform', function(){

                    var interpolate = d3.interpolate(lastRotate, BaseUtils.toDegree(endRadian - initRadian));

                    return function(t){
                        return "rotate(" + interpolate(t) + ")";
                    }
                });

            this._addFilter(gaugeG.select('circle.' + NEEDLE), this._getSlotDropShadowID(), ANIMATION_TIME);

            this._drawGaugeLabels(gaugeG, d);
        },

        _createThermometer:function(gaugeG, d){

            var domain = d.yAxis.scale.domain();
            var point = d.points[0];

            if(!point){
                return;
            }

            var valueInDomain = point.valueInDomain;
            var color = point.color;
            var radius = d.radius;
            var scale = d3.scale.linear()
                .domain(domain).range([-radius, radius]);

            var x1 = 'x1', y1 = 'y1', x2 = 'x2', y2 = 'y2';
            var cx = 'cx', cy = 'cy';

            var endX = scale(valueInDomain);
            var initX = -radius;

            if(d.thermometerLayout == Constants.VERTICAL_LAYOUT){
                x1 = 'y1'; y1 = 'x1'; x2 = 'y2'; y2 = 'x2';
                cx = 'cy'; cy = 'cx';
                initX = radius;
                endX = scale.range([radius, -radius])(valueInDomain);
            }

            gaugeG.select('line.' + BACKGROUND)
                .attr(x1, -radius)
                .attr(y1, 0)
                .attr(x2, radius)
                .attr(y2, 0)
                .style({
                    'fill':'none',
                    'stroke': d.slotBackgroundColor,
                    'stroke-width':THERMOMETER_R * 2,
                    'stroke-linecap':'round'
                });

            if(this.gauge.isSupportAnimation()){

                var lastX = gaugeG.select('line.' + THERMOMETER_BACKGROUND).attr(x2) || initX;
                lastX = parseFloat(lastX);

                gaugeG
                    .select('line.' + THERMOMETER_BACKGROUND)
                    .attr(x1, initX)
                    .attr(y1, 0)
                    .attr(x2, lastX)
                    .attr(y2, MAGIC_DET)
                    .style({
                        stroke:"url(#" + this._getThermometerGradualID(d) + ")",
                        'stroke-width':THERMOMETER_R * 2,
                        'stroke-linecap':'round'
                    })
                    .transition()
                    .duration(ANIMATION_TIME)
                    .ease(EASE_TYPE)
                    .attr(x2, endX);

                gaugeG
                    .select('circle.' + NEEDLE)
                    .attr(cx, lastX)
                    .attr(cy, 0)
                    .attr('r', THERMOMETER_R * 0.9)
                    .style({
                        'fill': d.needle,
                        'fill-opacity':ColorUtils.getColorOpacity(d.needle),
                        'stroke-width': THERMOMETER_R * 0.6,
                        'stroke':ColorUtils.mixColorWithHSB(color, 0, 0.1, -0.1)
                    })
                    .transition()
                    .duration(ANIMATION_TIME)
                    .ease(EASE_TYPE)
                    .attr(cx, endX);
            }else{
                gaugeG
                    .select('line.' + THERMOMETER_BACKGROUND)
                    .attr(x1, initX)
                    .attr(y1, 0)
                    .attr(x2, endX)
                    .attr(y2, MAGIC_DET)
                    .style({
                        stroke:"url(#" + this._getThermometerGradualID(d) + ")",
                        'stroke-width':THERMOMETER_R * 2,
                        'stroke-linecap':'round'
                    });

                gaugeG
                    .select('circle.' + NEEDLE)
                    .attr(cx, endX)
                    .attr(cy, 0)
                    .attr('r', THERMOMETER_R * 0.9)
                    .style({
                        'fill': d.needle,
                        'fill-opacity':ColorUtils.getColorOpacity(d.needle),
                        'stroke-width': THERMOMETER_R * 0.6,
                        'stroke':ColorUtils.mixColorWithHSB(color, 0, 0.1, -0.1)
                    });
            }

            this._drawGaugeLabels(gaugeG, d);
            this._drawThermometerTicks(gaugeG, d, scale);
        },

        _drawThermometerTicks:function(gaugeG, d, scale){

            var axisG = gaugeG.select('g.' + GAUGE_AXIS);

            var tickData = d.yAxis.getTickData();

            var axisOption = d.yAxis.componentOption;
            var labelStyle = axisOption.labelStyle;
            var useHtml = axisOption.useHtml;

            var plotBounds = this.gauge.getPlotBounds();
            var transX = plotBounds.x + d.centerX;
            var transY = plotBounds.y + d.centerY;

            var minorTickData = d.yAxis.getMinorTickData();

            var x1 = 'x1', y1 = 'y1', x2 = 'x2', y2 = 'y2';
            var dx = 'dx';
            var x = 'x', y = 'y';

            var startY = -9, endY = -15, endMinorY = -13;
            var textAnchor = 'middle', textY = -19;
            var detX = '0em';

            if(d.thermometerLayout == Constants.VERTICAL_LAYOUT){
                x1 = 'y1'; y1 = 'x1'; x2 = 'y2'; y2 = 'x2';
                dx = 'dy';
                x = 'y'; y = 'x';
                startY = 9; endY = 15; endMinorY = 13;
                textAnchor = 'start'; textY = 19;
                detX = '.35em';
            }

            var tickS = axisG.selectAll("g.tick").data(tickData, function(d){
                return scale(d.tickValue);
            });

            tickS.exit().remove();

            var enterTick = tickS.enter().append('g').attr('class', 'tick');
            enterTick.append('text');
            enterTick.append('line');

            var self = this;

            tickS.each(function(tick) {

                var tickG = d3.select(this);
                var posX = scale(tick.tickValue);


                posX = BaseUtils.lineSubPixelOpt(posX,1);

                tickG
                    .select('line')
                    .attr(x1, posX)
                    .attr(y1, startY)
                    .attr(x2, posX)
                    .attr(y2, endY)
                    .style('stroke', axisOption.tickColor)
                    .style('stork-width', axisOption.tickWidth);

                if (useHtml) {
                    var labelPos;
                    if (d.thermometerLayout == Constants.HORIZONTAL_LAYOUT) {

                        labelPos = {
                            x: transX + posX - tick.tickDim.width / 2,
                            y: transY + textY - tick.tickDim.height
                        }

                    } else {

                        labelPos = {
                            x: transX + textY,
                            y: transY + posX - tick.tickDim.height / 2
                        }

                    }

                    self.labelDivManager.addLabel(tick.tickContent, labelPos, labelStyle);
                }else{
                    tickG
                        .select('text')
                        .attr(x, posX)
                        .attr(y, textY)
                        .attr("text-anchor", textAnchor)
                        .attr(dx, detX)
                        .text(tick.tickContent)
                        .call(BaseUtils.setTextStyle, labelStyle);
                }


            });

            var minorTick = axisG.selectAll("line.minorTick")
                .data(minorTickData, function(d){return scale(d);});

            minorTick.enter().append('line').attr('class', 'minorTick');

            minorTick.exit().remove();

            minorTick.each(function(value){

                var posX = scale(value);

                posX = BaseUtils.lineSubPixelOpt(posX,1);

                d3.select(this)
                    .attr(x1, posX)
                    .attr(y1, startY)
                    .attr(x2, posX)
                    .attr(y2, endMinorY)
                    .style('stroke', axisOption.minorTickColor)
                    .style('stork-width', axisOption.minorTickWidth);
            });
        },

        _createRing:function(gaugeG, d){

            var circle = d3.svg.arc()
                .startAngle(0).endAngle(2 * Math.PI)
                .innerRadius(0).outerRadius(d.radius);

            var arc = d3.svg.arc().startAngle(0)
                            .innerRadius(0).outerRadius(d.radius);

            var domain = d.yAxis.scale.domain();
            var point = d.points[0];

            if(!point){
                return;
            }

            var arcPercentage = Math.max(point.percentage, 0);
            var endRadian = 2 * Math.PI * arcPercentage * (d.clockwise ? 1 : -1);
            var startFill = this.gauge._getColorFromBands(domain[0], d.bands);
            var endFill = point.color;
            var innerR = d.radius * 0.8;
            var outerStrokeR = innerR + 2;
            var innerStrokeR = innerR - 1.5;

            gaugeG
                .select('path.' + BACKGROUND)
                .attr('d', circle())
                .style({
                    'fill':d.paneBackgroundColor,
                    'fill-opacity':ColorUtils.getColorOpacity(d.paneBackgroundColor)
                });

            if(this.gauge.isSupportAnimation()){

                var arcPath = gaugeG.select('path.' + RING_ARC_PATH);
                var lastRadian = arcPath.attr('lastRadian');
                if(BaseUtils.isEmpty(lastRadian)){
                    lastRadian = 0;
                }else{
                    startFill = arcPath.style('fill');
                    lastRadian = parseFloat(lastRadian);
                }

                arcPath
                    .style('fill', ColorUtils.colorToHex(startFill))
                    .style('fill-opacity', ColorUtils.getColorOpacity(startFill))
                    .transition()
                    .duration(ANIMATION_TIME)
                    .ease(EASE_TYPE)
                    .style('fill', ColorUtils.colorToHex(endFill))
                    .style('fill-opacity', ColorUtils.getColorOpacity(endFill))
                    .attrTween('d', function(){

                        var interpolate = d3.interpolate(lastRadian, endRadian);

                        return function(t){
                            return arc.endAngle(interpolate(t))();
                        }
                    })
                    .attr('lastRadian', endRadian);
            }else{
                gaugeG
                    .select('path.' + RING_ARC_PATH)
                    .style('fill', endFill)
                    .style('fill-opacity', ColorUtils.getColorOpacity(endFill))
                    .attr('d', arc.endAngle(endRadian)());
            }

            gaugeG
                .select('path.' + RING_INNER_BACKGROUND)
                .attr('d', circle.outerRadius(innerR)())
                .style('fill', d.innerPaneBackgroundColor)
                .style('fill-opacity', ColorUtils.getColorOpacity(d.innerPaneBackgroundColor));

            gaugeG
                .select('path.' + RING_OUTER_STROKE)
                .attr('d', circle.outerRadius(outerStrokeR))
                .style({
                    'fill': 'none',
                    'stroke':'#000000',
                    'stroke-opacity':0.05,
                    'stroke-width':4
                });

            gaugeG
                .select('path.' + RING_INNER_STROKE)
                .attr('d', circle.outerRadius(innerStrokeR))
                .style({
                    'fill': 'none',
                    'stroke':"url(#" + this._getRingGradualID() + ")",
                    'stroke-width':3
                });


            this._drawGaugeLabels(gaugeG, d);
        },

        _drawGaugeLabels:function(gaugeG, d){
            var labelG = gaugeG.select('g.' + GAUGE_LABEL);

            if(d.seriesLabelContent){
                this._drawLabel(labelG, d.seriesLabelContent, d.seriesLabelPos, d.seriesLabelDim,
                                                            d.seriesLabelStyle, d, d.seriesLabel.useHtml);
            }

            if(d.percentageLabelContent){
                this._drawLabel(labelG, d.percentageLabelContent, d.percentageLabelPos, d.percentageLabelDim,
                                                    d.percentageLabelStyle, d, d.percentageLabel.useHtml);
            }

            if(d.valueLabelContent && d.valueLabelContent.length){

                //指针类型的仪表盘值标签后面有背景
                if(d.valueLabelBackground){
                    labelG
                        .append('rect')
                        .attr('x', d.valueLabelBackground.x)
                        .attr('y', d.valueLabelBackground.y)
                        .attr('width', d.valueLabelBackground.width)
                        .attr('height', d.valueLabelBackground.height)
                        .attr('rx', d.radius * 0.02)
                        .attr('ry', d.radius * 0.02)
                        .style({
                            fill: d.valueLabel.backgroundColor,
                            'fill-opacity': ColorUtils.getColorOpacity(d.valueLabel.backgroundColor)
                        });

                    this._addFilter(labelG, this._getPointerInnerShadowID());
                }

                for(var i = 0, len = d.valueLabelContent.length; i < len; i++){
                    var valueLabel = d.valueLabelContent[i];
                    this._drawLabel(labelG, valueLabel.labelContent, valueLabel.labelPos, valueLabel.labelDim,
                                                    valueLabel.labelStyle, d, d.valueLabel.useHtml);
                }

            }

        },

        _drawLabel:function(pSelection, labelContent, labelPos, labelDim, labelStyle, gauge, useHtml){

            if(!labelPos){
                return;
            }

            if(useHtml){
                var plotBounds = this.gauge.getPlotBounds();
                var centerX = gauge.centerX;
                var centerY = gauge.centerY;

                labelPos = {
                    x:labelPos.x + centerX + plotBounds.x,
                    y:labelPos.y + centerY + plotBounds.y
                };

                this.labelDivManager.addLabel(labelContent, labelPos, labelStyle);

            }else{
                pSelection
                    .append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.85em')
                    .attr('x', labelPos.x + labelDim.width/2)
                    .attr('y', labelPos.y)
                    .text(labelContent)
                    .call(BaseUtils.setTextStyle, labelStyle);
            }
        },

        _getPointerInnerShadowID:function(){
            return this.gauge.vanchart.getIDPrefix() + Constants.GAUGE_POINTER + 'innerShadow';
        },

        _getPointerDropShadowID:function(){
            return this.gauge.vanchart.getIDPrefix() + Constants.GAUGE_POINTER + 'dropShadow';
        },

        _getSlotDropShadowID:function(){
            return this.gauge.vanchart.getIDPrefix() + Constants.GAUGE_SLOT + 'dropShadow';
        },

        _getSlotInnerShadowID:function(){
            return this.gauge.vanchart.getIDPrefix() + Constants.GAUGE_SLOT + 'innerShadow';
        },

        _getRingGradualID:function(){
            return this.gauge.vanchart.getIDPrefix() + Constants.GAUGE_RING;
        },

        _getRingClickedGradualID:function(){
            return this.gauge.vanchart.getIDPrefix() + Constants.GAUGE_RING + 'clicked';
        },

        _getThermometerGradualID:function(d){
            return this.gauge.vanchart.getIDPrefix() + d.className;
        },

        _getThermometerClickedGradualID:function(d){
            return this.gauge.vanchart.getIDPrefix() + d.className + 'clicked';
        },

        _getThermometerMouseOverGradualID:function(d){
            return this.gauge.vanchart.getIDPrefix() + d.className + 'mouseover';
        },

        makeChosenState:function(d){

            var style = this.gauge.option.plotOptions.style;
            var gauge = d.series;
            var gaugeG = this._bodyG.select('g.' + gauge.className);

            switch (style){
                case Constants.GAUGE_POINTER:
                case Constants.GAUGE_POINTER_SEMI:

                    break;
                case Constants.GAUGE_RING:

                    gaugeG
                        .select('path.' + RING_ARC_PATH)
                        .style('fill', d.mouseOverColor);

                    break;
                case Constants.GAUGE_SLOT:

                    var backgroundColor = ColorUtils.getHighLightColor(d.color);
                    var needleColor = ColorUtils.getHighLightColor(gauge.needle);

                    gaugeG
                        .select('path.' + SLOT_BACKGROUND)
                        .style('stroke', ColorUtils.colorToHex(backgroundColor));

                    gaugeG.select('circle.' + NEEDLE).style('fill', needleColor);

                    break;
                case Constants.GAUGE_THERMOMETER:

                    gaugeG
                        .select('line.' + THERMOMETER_BACKGROUND)
                        .style('stroke', "url(#" + this._getThermometerMouseOverGradualID(gauge) + ")");

                    gaugeG
                        .select('circle.' + NEEDLE)
                        .style('stroke', ColorUtils.getHighLightColor(d.color))
                        .style('fill', ColorUtils.getHighLightColor(gauge.needle));

                    break;
            }

        },

        cancelChosenState:function(d){

            var style = this.gauge.option.plotOptions.style;
            var gauge = d.series;
            var gaugeG = this._bodyG.select('g.' + gauge.className);

            switch (style){
                case Constants.GAUGE_POINTER:
                case Constants.GAUGE_POINTER_SEMI:

                    break;
                case Constants.GAUGE_RING:

                    gaugeG
                        .select('path.' + RING_ARC_PATH)
                        .style('fill', d.color);

                    break;
                case Constants.GAUGE_SLOT:

                    gaugeG
                        .select('path.' + SLOT_BACKGROUND)
                        .style('stroke', ColorUtils.colorToHex(d.color));

                    gaugeG.select('circle.' + NEEDLE).style('fill', gauge.needle);

                    break;
                case Constants.GAUGE_THERMOMETER:

                    gaugeG
                        .select('line.' + THERMOMETER_BACKGROUND)
                        .style('stroke', "url(#" + this._getThermometerGradualID(gauge) + ")");

                    gaugeG
                        .select('circle.' + NEEDLE)
                        .style('stroke', d.color)
                        .style('fill', gauge.needle);

                    break;
            }

        },

        makeClickedState:function(d){

            var gauge = d.series;
            var style = this.gauge.option.plotOptions.style;
            var gaugeG = this._bodyG.select('g.' + gauge.className);
            var circle = d3.svg.arc().startAngle(0).endAngle(2 * Math.PI).innerRadius(0);

            switch (style){
                case Constants.GAUGE_POINTER:
                case Constants.GAUGE_POINTER_SEMI:

                    var hBackground = style == Constants.GAUGE_POINTER ? 0.16 : 0.11;
                    var hinge = style == Constants.GAUGE_POINTER ? 0.07 : 0.055;

                    circle.outerRadius(hBackground * d.series.radius * 1.25);
                    gaugeG.select('path.' + POINTER_HINGE_BACKGROUND).attr('d', circle());

                    //枢纽
                    circle.outerRadius(hinge * d.series.radius * 1.25);
                    gaugeG.select('path.' + POINTER_HINGE).attr('d', circle());

                    break;
                case Constants.GAUGE_RING:

                    gaugeG
                        .select('path.' + RING_INNER_STROKE)
                        .style('stroke', "url(#" + this._getRingClickedGradualID() + ")");

                    gaugeG.select('path.' + RING_ARC_PATH).style('fill', d.clickColor);

                    break;
                case Constants.GAUGE_SLOT:

                    var backgroundColor = ColorUtils.getColorWithDivider(d.color, 1/0.95);
                    var needleColor = ColorUtils.getColorWithDivider(gauge.needle, 1/0.95);

                    gaugeG
                        .select('path.' + SLOT_BACKGROUND)
                        .style('stroke', ColorUtils.colorToHex(backgroundColor));

                    gaugeG.select('circle.' + NEEDLE).style('fill', needleColor);

                    break;
                case Constants.GAUGE_THERMOMETER:

                    gaugeG
                        .select('line.' + THERMOMETER_BACKGROUND)
                        .style('stroke', "url(#" + this._getThermometerClickedGradualID(gauge) + ")");

                    gaugeG
                        .select('circle.' + NEEDLE)
                        .style('stroke', ColorUtils.getClickColor(d.color))
                        .style('fill', ColorUtils.getClickColor(gauge.needle));

                    break;
            }

        },

        cancelClickedState:function(d){

            var gauge = d.series;
            var style = this.gauge.option.plotOptions.style;
            var gaugeG = this._bodyG.select('g.' + gauge.className);
            var circle = d3.svg.arc().startAngle(0).endAngle(2 * Math.PI).innerRadius(0);

            switch (style){
                case Constants.GAUGE_POINTER:
                case Constants.GAUGE_POINTER_SEMI:

                    var hBackground = style == Constants.GAUGE_POINTER ? 0.16 : 0.11;
                    var hinge = style == Constants.GAUGE_POINTER ? 0.07 : 0.055;

                    circle.outerRadius(hBackground * d.series.radius);
                    gaugeG.select('path.' + POINTER_HINGE_BACKGROUND).attr('d', circle());

                    //枢纽
                    circle.outerRadius(hinge * d.series.radius);
                    gaugeG.select('path.' + POINTER_HINGE).attr('d', circle());

                    break;
                case Constants.GAUGE_RING:

                    gaugeG.select('path.' + RING_INNER_STROKE)
                        .style('stroke', "url(#" + this._getRingGradualID() + ")");

                    gaugeG.select('path.' + RING_ARC_PATH)
                        .style('fill', d.mouseOverColor);

                    break;
                case Constants.GAUGE_SLOT:

                    var backgroundColor = ColorUtils.getHighLightColor(d.color);
                    var needleColor = ColorUtils.getHighLightColor(gauge.needle);

                    gaugeG
                        .select('path.' + SLOT_BACKGROUND)
                        .style('stroke', ColorUtils.colorToHex(backgroundColor));

                    gaugeG.select('circle.' + NEEDLE).style('fill', needleColor);

                    break;
                case Constants.GAUGE_THERMOMETER:

                    gaugeG
                        .select('line.' + THERMOMETER_BACKGROUND)
                        .style('stroke', "url(#" + this._getThermometerMouseOverGradualID(gauge) + ")");

                    gaugeG
                        .select('circle.' + NEEDLE)
                        .style('stroke', ColorUtils.getHighLightColor(d.color))
                        .style('fill', ColorUtils.getHighLightColor(gauge.needle));

                    break;
            }

        }
    };

    BaseUtils.inherit(GaugeSvgRender, BaseRender);

    require('./RenderLibrary').register(Constants.GAUGE_SVG, GaugeSvgRender);
});
/**
 * Created by eason on 15/12/31.
 */
define('render/RadarSvgRender',['require','./BaseRender','../utils/BaseUtils','../utils/LabelDivManager','../utils/ColorUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var LabelDivManager = require('../utils/LabelDivManager');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');

    var CATEGORY_TEXT = 'category-axis-tick-text';
    var VALUE_TEXT = 'value-axis-tick-text';
    var GRID_LINE = 'axis-grid-line';
    var PLOT_BANDS = 'plot-bands';
    var PLOT_LINES = 'plot-lines';
    var VALUE_LINE = 'value-axis-line';
    var CATEGORY_LINE = 'category-axis-line';

    var RADAR_SERIES = 'radar-series';

    var SERIES_STROKE = 'series-stroke';
    var SERIES_FILL = 'series-fill';

    var COLUMN = 'radar-column';

    var ANIMATION_TIME = 500;
    var EASE = 'back-out';

    var EXIT_TIME = 500;
    var EXIT_EASE = 'exp-out';

    var AXIS_TIME = 300;

    var VALUE_TICK_GAP = 2;

    function RadarSvgRender(radar){
        BaseRender.call(this, radar);
        this.divManager = new LabelDivManager(radar.getParentDom());
        this.radar = radar;
    }

    RadarSvgRender.prototype = {

        constructor:RadarSvgRender,

        render:function(){

            var svgRoot = this.radar.getVanchartRender().getRenderRoot();

            if(this._axisG){
                var animationTime = this.radar.isSupportAnimation() ? ANIMATION_TIME : 0;
                this._axisG.transition().ease('linear').duration(animationTime).call(this._drawRadarAxis.bind(this));
            }else{
                this._axisG = svgRoot.append('g');
                this._axisG.call(this._initRadarAxis.bind(this));
            }

            if(!this._bodyG){
                this._bodyG = svgRoot.append('g');
                this._bodyG.append('defs').append('clipPath').attr('id', this._getRadarClipID());
            }

            this._updateTransform();

            this._drawRadarSeries();
        },

        _updateTransform:function(){

            var radarCenter = this.radar.getRadarCenter();

            var maxValue = this.radar.valueScale.domain()[1];

            var clipPath = this._bodyG.select('#' + this._getRadarClipID());

            clipPath.select('path').remove();

            clipPath.append('path').attr('d', this.radar._getGridPath(maxValue));

            this._bodyG.attr('transform', BaseUtils.makeTranslate(radarCenter));
            this._axisG.attr('transform', BaseUtils.makeTranslate(radarCenter));
        },

        _drawRadarSeries:function(){

            var radarData = this.radar.getVisibleChartData();

            var updateS = this._bodyG.selectAll('.' + RADAR_SERIES)
                                    .data(radarData, function(d){return d.className});

            this._deleteRadarSeries(updateS);

            this._updateRadarSeries(updateS);

            this._createRadarSeries(updateS);

            this._drawLabel(this.radar.isSupportAnimation() ? ANIMATION_TIME : 0);
        },

        _deleteRadarSeries:function(updateS){

            var exitS = updateS.exit();

            this.radar.isColumnType() ? this._deleteColumnTypeSeries(exitS)
                                                    : this._deletePolygonTypeSeries(exitS);
        },

        _deleteColumnTypeSeries:function(exitS){

            var exitTime = this.radar.isSupportAnimation() ? EXIT_TIME : 0;

            var self = this;
            exitS.each(function(d){
                var seriesG = d3.select(this);
                seriesG
                    .selectAll('path.' + COLUMN)
                    .transition()
                    .duration(exitTime)
                    .ease(EXIT_EASE)
                    .attrTween('d', function(d){

                        var interpolate = d3.interpolate(d.y, d.y0);

                        return function(t){
                            return self.radar._getRadarColumnPath(d.y0, interpolate(t), d.radian);
                        }

                    })
                    .each('end', function(){
                        d3.select(this).remove();
                    });
            });

        },

        _deletePolygonTypeSeries:function(exitS){

            var self = this;

            var markerClass = this._getMarkerClass();

            var exitTime = this.radar.isSupportAnimation() ? EXIT_TIME : 0;

            exitS.each(function(){

                var seriesG = d3.select(this);

                seriesG
                    .select('path.' + SERIES_STROKE)
                    .transition()
                    .duration(exitTime)
                    .ease(EXIT_EASE)
                    .attrTween('d', function(d){

                        var initPathSeg = self.radar._getInitPathSegment(d.pathSegment);
                        var interpolate  = d3.interpolateArray(d.pathSegment, initPathSeg);

                        return function(t){
                            return self.radar._getRadarSeriesStrokePath(interpolate(t), d.connectNulls);
                        };

                    })
                    .each('end', function(){
                        d3.select(this).remove();
                    });

                seriesG
                    .select('path.' + SERIES_FILL)
                    .transition()
                    .duration(exitTime)
                    .ease(EXIT_EASE)
                    .attrTween('d', function(d){

                        var initPathSeg = self.radar._getInitPathSegment(d.pathSegment);
                        var interpolate  = d3.interpolateArray(d.pathSegment, initPathSeg);

                        return function(t){
                            return self.radar._getRadarSeriesFillPath(interpolate(t), d.connectNulls);
                        };

                    })
                    .each('end', function(){
                        d3.select(this).remove();
                    });

                seriesG
                    .selectAll('g.' + markerClass)
                    .transition()
                    .duration(exitTime)
                    .ease(EXIT_EASE)
                    .attr('transform', function(){
                        return BaseUtils.makeTranslate([0,0]) + 'scale(0)';
                    })
                    .each('end', function(){
                        d3.select(this).remove();
                    });
            });

        },

        _updateRadarSeries:function(updateS){
            this.radar.isColumnType() ? this._updateColumnTypeSeries(updateS)
                                                : this._updatePolygonTypeSeries(updateS);
        },

        _updateColumnTypeSeries:function(updateS){

            var self = this;

            updateS.each(function(d){

                var columnS = d3.select(this).selectAll('path.' + COLUMN).data(d.points);

                columnS.exit().remove();

                columnS.call(self._createColumn.bind(self));

                columnS.each(function(d){
                    d3.select(this)
                        .transition()
                        .duration(EXIT_TIME)
                        .ease(EXIT_EASE)
                        .attrTween('d', function(d){

                            var innerRadius = BaseUtils.pick(this._innerRadius_, d.y0);
                            var outerRadius = BaseUtils.pick(this._outerRadius_, d.y);

                            var innerInterpolate = d3.interpolate(innerRadius, d.y0);
                            var outerInterpolate = d3.interpolate(outerRadius, d.y);

                            this._innerRadius_ = d.y0;
                            this._outerRadius_ = d.y;

                            return function(t){

                                var iR = innerInterpolate(t);
                                var oR = outerInterpolate(t);
                                return self.radar._getRadarColumnPath(iR, oR, d.radian);

                            }
                        });
                });

            });

        },

        _updatePolygonTypeSeries:function(updateS){

            var self = this;

            var markerClass = this._getMarkerClass();

            var animationTime = this.radar.isSupportAnimation() ? ANIMATION_TIME : 0;

            updateS.each(function(d){

                var seriesG = d3.select(this);

                if(seriesG.select('path.' + SERIES_STROKE).empty()){
                    self._createPolygonStroke(seriesG, d);
                }else{
                    seriesG.select('path.' + SERIES_STROKE)
                        .transition()
                        .duration(animationTime)
                        .ease(EASE)
                        .attrTween('d', function(d){

                            var useLastPathSeg = !!this._pathSegment_;

                            if(useLastPathSeg && this._pathSegment_.length == d.pathSegment.length){
                                var last = this._pathSegment_;
                                for(var i = 0, count = last.length; i < count && useLastPathSeg; i++){
                                    if(last[i].length != d.pathSegment[i].length){
                                        useLastPathSeg = false;
                                    }
                                }
                            }

                            var initPathSeg = useLastPathSeg ? this._pathSegment_ : self.radar._getInitPathSegment(d.pathSegment);

                            var interpolate  = d3.interpolateArray(initPathSeg, d.pathSegment);

                            this._pathSegment_ = d.pathSegment;

                            return function(t){
                                return self.radar._getRadarSeriesStrokePath(interpolate(t), d.connectNulls);
                            };

                        });
                }

                if(seriesG.select('path.' + SERIES_FILL).empty()){
                    self._createPolygonFill(seriesG, d);
                }else{
                    seriesG.select('path.' + SERIES_FILL)
                        .transition()
                        .duration(animationTime)
                        .ease(EASE)
                        .attrTween('d', function(d){

                            var initPathSeg = this._pathSegment_ ?
                                this._pathSegment_ : self.radar._getInitPathSegment(d.pathSegment);

                            var interpolate  = d3.interpolateArray(initPathSeg, d.pathSegment);

                            this._pathSegment_ = d.pathSegment;

                            return function(t){
                                return self.radar._getRadarSeriesFillPath(interpolate(t), d.connectNulls);
                            };

                        });
                }


                var markers = seriesG.selectAll('g.' + markerClass)
                                        .data(function(d){return d.points;});

                markers.exit().remove();

                markers.call(self._createSvgMarker.bind(self));

                markers
                    .transition()
                    .duration(animationTime)
                    .ease(EASE)
                    .attr('transform', function(d){return BaseUtils.makeTranslate(d.pos)});

            });

        },

        _createRadarSeries:function(updateS){

            var enterS = updateS.enter().append('g')
                .attr('class', function(d){return d.className + ' ' + RADAR_SERIES})
                .attr('clip-path', "url(#" + this._getRadarClipID() +")");

            this.radar.isColumnType() ? this._createColumnTypeSeries(enterS) : this._createPolygonTypeSeries(enterS);
        },

        _createColumnTypeSeries:function(enterS){

            var self = this;

            enterS.each(function(d){

                d3.select(this)
                    .selectAll('path.' + COLUMN)
                    .data(d.points)
                    .call(self._createColumn.bind(self))
                    .transition()
                    .duration(self.radar.isSupportAnimation() ? ANIMATION_TIME : 0)
                    .ease(EASE)
                    .attrTween('d', function(d){

                        var initR = self.radar.getInitRadius();
                        var interpolate = d3.interpolate(initR, d.y);

                        this._innerRadius_ = d.y0;
                        this._outerRadius_ = d.y;

                        return function(t){
                            return self.radar._getRadarColumnPath(initR, interpolate(t), d.radian);
                        }

                    })
                    .each('end', function(d){
                        d3.select(this)
                            .attr('d', self.radar._getRadarColumnPath(d.y0, d.y, d.radian))
                    });

            });

        },

        _createPolygonStroke:function(gElement, d){

            var self = this;
            var supportAnimation = this.radar.isSupportAnimation();
            var para = supportAnimation ? 1 : 0;

            var strokePath = gElement.selectAll('path.' + SERIES_STROKE).data([d]);

            strokePath.enter()
                .append('path')
                .attr('class', SERIES_STROKE)
                .style({
                    'fill':'none',
                    'stroke': d.lineColor,
                    'stroke-width': d.lineWidth
                })
                .transition()
                .duration(ANIMATION_TIME * para)
                .ease(EASE)
                .attrTween('d', function(d){
                    var initSeg = self.radar._getInitPathSegment(d.pathSegment);
                    var interpolate  = d3.interpolateArray(initSeg, d.pathSegment);

                    this._pathSegment_ = d.pathSegment;

                    return function(t){
                        return self.radar._getRadarSeriesStrokePath(interpolate(t), d.connectNulls);
                    };
                });

            this.addSeriesEventHandler(strokePath);
        },

        _createPolygonFill:function(gElement, d){

            var self = this;
            var supportAnimation = this.radar.isSupportAnimation();
            var para = supportAnimation ? 1 : 0;

            if(d.fillColor && d.fillColorOpacity){

                var fillPath = gElement.selectAll('path.' + SERIES_FILL).data([d]);

                fillPath.enter()
                    .append('path')
                    .attr('class', SERIES_FILL)
                    .style({
                        'fill': d.fillColor,
                        'fill-opacity': d.fillColor ? d.fillColorOpacity : 0
                    })
                    .transition()
                    .duration(ANIMATION_TIME * para)
                    .ease(EASE)
                    .attrTween('d', function(d){
                        var initSeg = self.radar._getInitPathSegment(d.pathSegment);
                        var interpolate  = d3.interpolateArray(initSeg, d.pathSegment);

                        this._pathSegment_ = d.pathSegment;

                        return function(t){
                            return self.radar._getRadarSeriesFillPath(interpolate(t), d.connectNulls);
                        };
                    });

                this.addSeriesEventHandler(fillPath);
            }

        },

        _createPolygonTypeSeries:function(enterS){

            var self = this;

            var markerClass = this._getMarkerClass();

            var supportAnimation = this.radar.isSupportAnimation();
            var para = supportAnimation ? 1 : 0;

            enterS.each(function(d){

                var gElement = d3.select(this);

                self._createPolygonStroke(gElement, d);

                self._createPolygonFill(gElement, d);

                gElement
                    .selectAll('g.' + markerClass)
                    .data(d.points)
                    .call(self._createSvgMarker.bind(self))
                    .attr('transform', function(){
                        return BaseUtils.makeTranslate([0,0]) + 'scale(0.01)'
                    })
                    .transition()
                    .duration(ANIMATION_TIME * para)
                    .ease(EASE)
                    .attr('transform', function(d){
                        return BaseUtils.makeTranslate(d.pos) + 'scale(1)';
                    })

            });
        },

        _createColumn:function(updateS){

            var newColumn = updateS.enter();

            newColumn
                .append('path')
                .attr('class', function(d){
                    return COLUMN + ' ' + d.className;
                })
                .style('fill', function (d) {
                    return d.color;
                })
                .style('fill-opacity', function(d){
                    return d.fillColorOpacity;
                })
                .style('stroke', function(d){
                    return d.borderColor;
                })
                .style('stroke-width', function(d){
                    return d.borderWidth;
                })
                .call(this.addShapeEventHandler.bind(this));
        },

        _drawLabel:function(delay){

            var radarData = this.radar.getVisibleChartData();

            var allPoints = [];
            radarData.forEach(function(data){
                allPoints = allPoints.concat(data.points);
            });

            var center = this.radar.getRadarCenter();

            if(!this._labelG){
                this._labelG = this._bodyG.append('g');
            }

            this._drawSvgDataLabels(this._labelG, allPoints, center[0], center[1], delay);
        },

        _initRadarAxis:function(g){
            this._drawPlotBands(g);

            this._drawPlotLines(g);

            this._drawGridLine(g);

            this._drawAxisLine(g);

            this._drawTickLabel(g);
        },

        _drawRadarAxis:function(g){

            if(!this.radar.getVisibleChartData().length){
                return;
            }

            this._initRadarAxis(g);
        },

        _drawPlotBands:function(g){

            var plotBands = this.radar.getRadarPlotBands();

            g.each(function(){

                var bands = d3.select(this)
                    .selectAll('path.' + PLOT_BANDS).data(plotBands);

                bands.exit().remove();

                bands.enter().append('path').attr('class', PLOT_BANDS);

                d3.transition(bands)
                    .attr('d', function(d){
                        return d.path;
                    })
                    .style('fill', function(d){
                        return d.color;
                    })

            });

        },

        _drawPlotLines:function(g){

            var plotLines = this.radar.getRadarPlotLines();
            var self = this;

            g.each(function(){

                var lines = d3.select(this)
                    .selectAll('.' + PLOT_LINES).data(plotLines);

                lines.exit().remove();

                var lineEnter = lines.enter().append('g').attr('class', PLOT_LINES);
                lineEnter.append('path');
                lineEnter.append('text');

                d3.transition(lines.select('path'))
                    .attr('d', function(d){
                        return  self.radar._getGridPath(d.value);
                    })
                    .style('fill', 'none')
                    .style('stroke', function(d){
                        return d.color;
                    })
                    .style('stroke-width', function(d){
                        return d.width;
                    })
                    .style('stroke-dasharray', function(d){
                        return d.dataArray;
                    });

                d3.transition(lines.select('text'))
                    .text(function(d){
                        return d.text;
                    })
                    .attr('y', function(d){
                        return d.baseY;
                    })
                    .attr('text-anchor', function(d){
                        return d.textAnchor;
                    })
                    .each(function(d){
                        d3.select(this)
                            .call(BaseUtils.setTextStyle, d.style);
                    });
            });


        },

        _drawGridLine:function(g){

            var valueAxis = this.radar.getValueAxis();
            var lastScale = this.radar.lastScale || this.radar.valueScale;
            var cfg = valueAxis.componentOption;
            var ticks = valueAxis.getTickData();
            var gridLineColor = cfg.gridLineColor;
            var gridLineWidth = cfg.gridLineWidth;

            var self = this;

            g.each(function(){

                // prepare ticks data
                var gridLines = d3.select(this)
                    .selectAll('path.' + GRID_LINE)
                    .data(ticks, function(d){return d.tickValue;});

                if (!gridLineWidth) {

                    gridLines.remove();

                } else {
                    // enter
                    gridLines.enter()
                        .append('path')
                        .attr('class', GRID_LINE)
                        .attr('d', function(d) {
                            this._currentPos_ = self.radar._getGridData(d.tickValue, false, lastScale);
                            return self.radar._getGridPathByData(this._currentPos_);
                        })
                        .style({
                            fill:'none',
                            'stroke':gridLineColor,
                            'stroke-width':gridLineWidth,
                            'opacity': 1
                        });

                    // transition
                    var transition = d3.transition(gridLines)
                        .style('opacity', 1);

                    // add attrTween fun
                    if (!transition.attrTween) {
                        transition
                            .attr('d', function(d) {
                                this._currentPos_ = self.radar._getGridData(d.tickValue);
                                return self.radar._getGridPathByData(this._currentPos_);
                            });
                    } else {
                        transition
                            .attrTween('d', function(d) {
                                var prePos = this._currentPos_;
                                this._currentPos_ = self.radar._getGridData(d.tickValue);
                                var interpolate = d3.interpolate(prePos, this._currentPos_);

                                return function (t) {
                                    return self.radar._getGridPathByData(interpolate(t));
                                };
                            })
                    }

                    // exit
                    var gridExit = d3.transition(gridLines.exit())
                        .style('opacity', 0)
                        .remove();

                    if (gridExit.attrTween) {
                        gridExit
                            .attrTween('d', function(d) {
                                var prePos = this._currentPos_;
                                this._currentPos_ = self.radar._getGridData(d.tickValue);
                                var interpolate = d3.interpolate(prePos, this._currentPos_);

                                return function(t) {
                                    return self.radar._getGridPathByData(interpolate(t));
                                };
                            })
                    }
                }
            });

        },

        _drawAxisLine:function(g){
            var valueAxis = this.radar.getValueAxis();
            var cfg = valueAxis.componentOption;
            var lineWidth = cfg.lineWidth;
            var lineColor = cfg.lineColor;

            var axisLineData = this.radar.getAxisLineData();

            g.each(function(){

                var axisLine = d3.select(this).selectAll('line.' + VALUE_LINE).data(axisLineData);

                if(lineWidth){
                    axisLine.exit().remove();
                    axisLine.enter().append('line').attr('class', VALUE_LINE);

                    d3.transition(axisLine)
                        .attr('x2', function(d){
                            return d[0];
                        })
                        .attr('y2', function(d){
                            return d[1];
                        })
                        .style({
                            'stroke':lineColor,
                            'stroke-width':lineWidth
                        });
                }else{
                    axisLine.remove();
                }

            });

            var baseAxis = this.radar.getBaseAxis();
            var categoryLineWidth = baseAxis.componentOption.lineWidth;
            var categoryLineColor = baseAxis.componentOption.lineColor;
            var maxValue = valueAxis.scale.domain()[1];
            var self = this;

            g.each(function(){

                var categoryLine = d3.select(this).selectAll('path.' + CATEGORY_LINE).data([0]);

                if(categoryLineWidth){

                    categoryLine.enter().append('path').attr('class', CATEGORY_LINE);

                    d3.transition(categoryLine)
                        .attr('d', function(){
                            return self.radar._getGridPath(maxValue);
                        })
                        .style({
                            fill:'none',
                            'stroke':categoryLineColor,
                            'stroke-width':categoryLineWidth
                        });

                }else{
                    categoryLine.remove();
                }

            });

        },

        _drawValueTickLabel:function(g){

            var valueAxis = this.radar.getValueAxis();
            var cfg = valueAxis.componentOption;
            var ticks = BaseUtils.clone(valueAxis.getTickData());

            //最大值标签不显示
            ticks.length = Math.max(ticks.length - 1, 0);

            var labelStyle = cfg.labelStyle;
            var labelRotation = cfg.labelRotation;
            var useHtml = cfg.useHtml;
            var valueScale = this.radar.valueScale;
            var lastScale = this.radar.lastScale || valueScale;

            if(useHtml && !labelRotation){

                var center = this.radar.getRadarCenter();

                for(var i = 0, len = ticks.length; i < len; i++){

                    var tick = ticks[i];

                    var x = -tick.tickDim.width - VALUE_TICK_GAP + center[0];
                    var y = -valueScale(tick.tickValue)-tick.tickDim.height + center[1];

                    this.divManager.addLabel(tick.tickContent, {x:x, y:y}, labelStyle);
                }

            }else{

                g.each(function(){

                    var valueText = d3.select(this)
                        .selectAll('text.' + VALUE_TEXT)
                        .data(ticks, function(d){return d.tickValue;});

                    if(cfg.showLabel){
                        valueText.exit().remove();
                        valueText.enter().append('text').attr('class', VALUE_TEXT)
                            .attr('x', -VALUE_TICK_GAP)
                            .attr('y', function(d){
                                return -lastScale(d.tickValue);
                            })
                            .attr('transform', function(d){
                                return 'rotate(' + labelRotation + ' 0 0)';
                            });

                        valueText.call(BaseUtils.setTextStyle, labelStyle);

                        d3.transition(valueText)
                            .text(function(d){return d.tickContent;})
                            .attr('y', function(d){
                                return -valueScale(d.tickValue);
                            })
                            .style('text-anchor', 'end')
                    }else{
                        valueText.remove();
                    }

                });
            }
        },

        _drawCategoryTickLabel:function(g){

            var baseAxis = this.radar.getBaseAxis();
            var cfg = baseAxis.componentOption;

            var labelStyle = cfg.labelStyle;
            var labelRotation = cfg.labelRotation || 0;
            var useHtml = cfg.useHtml;

            var ticks = this.radar.categoryLabel;
            var lineHeight = BaseUtils.getTextHeight(labelStyle);

            if(useHtml && !labelRotation){

                var center = this.radar.getRadarCenter();

                for(var i = 0, len = ticks.length; i < len; i++){

                    var tick = ticks[i];

                    var x = tick.tickPos.x + center[0];
                    var y = tick.tickPos.y + center[1];

                    this.divManager.addLabel(tick.tickContent, {x:x, y:y}, labelStyle);
                }

            }else{
                g.each(function(){
                    d3.select(this).selectAll('text.' + CATEGORY_TEXT).remove();

                    var cateText = d3.select(this).selectAll('text.' + CATEGORY_TEXT).data(ticks);

                    if(cfg.showLabel){

                        cateText.enter().append('text')
                            .attr('class', CATEGORY_TEXT)
                            .call(BaseUtils.setTextStyle, labelStyle);

                        cateText.each(function(d){

                            var tickContent = d.tickContent;

                            if(BaseUtils.isArray(tickContent)){

                                var dx = d.tickPos.x < 0 ? d.tickDim.width : 0;
                                var textAnchor = d.tickPos.x < 0 ? 'end' : 'start';

                                for(var i = 0, len = tickContent.length; i < len; i++){

                                    if(i == 0){

                                        d3.select(this)
                                            .append('tspan')
                                            .text(tickContent[i])
                                            .attr('x', dx + d.tickPos.x)
                                            .attr('y', 0.85 * lineHeight + d.tickPos.y)
                                            .attr('text-anchor', textAnchor);

                                    }else{

                                        d3.select(this)
                                            .append('tspan')
                                            .text(tickContent[i])
                                            .attr('x', dx + d.tickPos.x)
                                            .attr('y', 0.85 * lineHeight + i * (1.3 * lineHeight) + d.tickPos.y)
                                            .attr('text-anchor', textAnchor);

                                    }
                                }

                                if(labelRotation){

                                    var rx = d.tickPos.x + d.tickDim.width/2;
                                    var ry = d.tickPos.y + d.tickDim.height/2;

                                    d3.select(this)
                                        .attr('transform', 'rotate(' + labelRotation + ' ' + rx + ',' + ry + ')');
                                }

                            }else{

                                var rx = d.tickPos.x + d.tickDim.width/2;

                                var ry = d.tickPos.y + d.tickDim.height/2;

                                var normalDim = BaseUtils.getTextDimension(tickContent, labelStyle, useHtml);

                                d3.select(this)
                                    .text(tickContent)
                                    .attr('x', rx - normalDim.width/2)
                                    .attr('y', ry - normalDim.height/2)
                                    .attr('text-anchor', 'start')
                                    .attr('dy', '.85em')
                                    .attr('transform', 'rotate(' + labelRotation + ' ' + rx + ',' + ry + ')');

                            }

                        });
                    }
                });
            }

        },

        _drawTickLabel:function(g){

            this.divManager.clearAllLabels();

            this._drawValueTickLabel(g);

            this._drawCategoryTickLabel(g);
        },

        makeClickedState:function(d){

            if(d.columnType){

                this._bodyG.select('path.' + d.className).style('fill', d.clickColor);

            }else{
                this._makeMarkerClickedState(this._bodyG, d);

                this._bodyG.select('g.' + d.series.className)
                    .select('path.' + SERIES_FILL)
                    .style('fill', ColorUtils.getClickColor(d.series.fillColor))
            }

        },

        cancelClickedState:function(d){

            if(d.columnType){

                this._bodyG.select('path.' + d.className).style('fill', d.mouseOverColor);

            }else{

                this._cancelMarkerClickedState(this._bodyG, d);

                this._bodyG.select('g.' + d.series.className)
                    .select('path.' + SERIES_FILL)
                    .style('fill', ColorUtils.getHighLightColor(d.series.fillColor))

            }
        },

        makeChosenState:function(d){

            if(d.columnType){
                this._bodyG.select('path.' + d.className)
                    .style('stroke', d.mouseOverColor)
                    .style('fill', d.mouseOverColor)
                    .style('stroke-width', d.borderWidth)
                    .style('stroke-opacity', 0.35)
                    .interrupt()
                    .transition()
                    .duration(100)
                    .ease('ease-out-in')
                    .style('stroke-width', 6);
            }else{
                this._makeMarkerChosenState(this._bodyG, d);

                this._bodyG.select('g.' + d.series.className)
                    .select('path.' + SERIES_FILL)
                    .style('fill', ColorUtils.getHighLightColor(d.series.fillColor));

                BaseUtils.toFront(this._bodyG.select('g.' + (d.series.className)).node());
            }

        },

        cancelChosenState:function(d){

            if(d.columnType){

                this._bodyG.select('path.' + d.className)
                    .interrupt()
                    .transition()
                    .style('fill', d.color)
                    .style('stroke', d.borderColor)
                    .style('stroke-opacity', 1)
                    .style('stroke-width', d.borderWidth);

            }else{
                this._cancelMarkerChosenState(this._bodyG, d);

                this._bodyG.select('g.' + d.series.className)
                    .select('path.' + SERIES_FILL)
                    .style('fill', d.series.fillColor)
            }
        },

        _getRadarClipID:function(){
            return 'radarClip' + this.radar.vanchart.getIDPrefix();
        }

    };

    BaseUtils.inherit(RadarSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.RADAR_SVG, RadarSvgRender);

});
/**
 * Created by Mitisky on 16/3/14.
 */
define('render/BubbleSvgRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){
    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    var BUBBLE_INIT_TIME = 500;
    var BUBBLE_UPDATE_TIME = 500;
    var BUBBLE_EXIT_TIME = 300;
    var BUBBLE_CHOSEN_TIME = 200;
    var BUBBLES_SHOW_TIME = 800;

    var CHOSEN_STROKE_WIDTH = 6;

    var BUBBLE_SERIES_GROUP = 'bubble-series-group';
    var BUBBLE_SHADOW_ID = 'bubble-shadow-id';
    var FORCE_BUBBLE_GROUP = 'force-bubble-group';

    function BubbleSvgRender(bubble){
        BaseRender.call(this, bubble);
        this.bubble = bubble;
    }

    BubbleSvgRender.prototype = {
        constructor:BubbleSvgRender,

        render:function(){
            this.bubble.isLargeMode() ? this._canvasRender() : this._svgRender();
        },

        _svgRender:function() {
            this.bubble.isUpdateWithForce() ? this._renderForceBubbles() : this._renderNormalBubbles();
        },

        _createForceBubbleDivLabel:function(visiblePoints){

            var self = this;

            var plotBounds = self.bubble.getPlotBounds();

            var validPoints = [];

            visiblePoints.forEach(function(point){
                if(point.labelPos && point.dataLabels.useHtml){
                    point.labelPos = {
                        x:-point.labelDim.width/2 + point.x,
                        y:-point.labelDim.height/2 + point.y
                    };
                    validPoints.push(point)
                }

            });

            self._renderDivLabels(visiblePoints, plotBounds.x, plotBounds.y);
        },

        _renderForceBubbles:function(){

            //准备node数据
            var bubbleData = this.bubble.getVisibleChartData();
            var nodes = [];
            var maxRadius = 0, padding = 2, clusterPadding = 2;

            bubbleData.forEach(function(sery){
                sery.points.forEach(function(point){
                    if(point.visible){
                        nodes.push(point);
                        point.px = undefined;
                        point.py = undefined;
                        maxRadius = Math.max(maxRadius, point.radius);
                    }
                })
            });

            var svgRoot = this.bubble.getVanchartRender().getRenderRoot();
            var clipID = this.component.vanchart.getBodyClipID();
            var plotBounds = this.component.getPlotBounds();
            var self = this;

            if(!this._bodyG) {
                this._bodyG = svgRoot.append('g');
                this._createDefs();
            }

            this._bodyG
                .attr('transform', 'translate('+plotBounds.x+','+plotBounds.y+')')
                .attr('clip-path', "url(#" + clipID +")");

            var bubbleS = this._bodyG
                .selectAll('g.' + FORCE_BUBBLE_GROUP)
                .data(nodes, function(d){return d.className;});

            bubbleS.each(function(d){

                var circle = d3.transform(d3.select(this)
                                    .attr('transform')).translate;

                d.x = circle[0];
                d.y = circle[1];
            });

            if(this.force){
                this.force.stop();
            }

            var force = d3.layout.force()
                .nodes(nodes)
                .size([plotBounds.width, plotBounds.height])
                .gravity(.05)
                .charge(0)
                .on("tick", tick)
                .on('start', function(){
                    self.labelDivManager.clearAllLabels();
                })
                .on('end', function(){
                    self._createForceBubbleDivLabel(nodes);
                })
                .start();

            this.force = force;

            var exitBubbles = bubbleS.exit();
            exitBubbles.each(function(){

                d3.select(this)
                    .transition()
                    .duration(BUBBLE_EXIT_TIME)
                    .ease('back-in')
                    .each(function(){

                        d3.transition(d3.select(this).select('circle'))
                            .attrTween("r", function(d) {
                                var i = d3.interpolate(d.radius, 0);
                                return function(t) { return i(t); };
                            });

                    })
                    .remove();

            });

            bubbleS
                .call(this.force.drag)
                .each(function(d){

                    var g = d3.select(this);

                    g.select('circle')
                        .transition()
                        .duration(750)
                        .attrTween("r", function(d) {
                            var currentR = d3.select(this).attr('r');
                            var i = d3.interpolate(currentR, d.radius);
                            return function(t) { return d.radius = i(t); };
                        })
                        .each('end', function(d){
                            self._createForceLabel(d, d3.select(this.parentNode));
                        });

                    g.select('text').remove();
                });

            this._createNewForceBubble(bubbleS, true);

            function tick(e) {

                bubbleS
                    .each(cluster(10 * e.alpha * e.alpha))
                    .each(collide(.5));

                bubbleS.each(function(){
                    var g = d3.select(this);
                    var scale = BaseUtils.pick(d3.transform(g.attr("transform")).scale, 1);
                    g
                        .attr('transform', function(d){
                            return 'translate(' + d.x + ',' + d.y + ')' + 'scale(' + scale + ')';
                        })
                });
            }

            // Move d to be adjacent to the cluster node.
            function cluster(alpha) {
                return function(d) {
                    var cluster = d.series.cluster;
                    if (!cluster || cluster === d) return;
                    var x = d.x - cluster.x,
                        y = d.y - cluster.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + cluster.radius;
                    if (l != r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        cluster.x += x;
                        cluster.y += y;
                    }
                };
            }

            // Resolves collisions between d and all other circles.
            function collide(alpha) {
                var quadtree = d3.geom.quadtree(nodes);
                return function(d) {
                    var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
                        nx1 = d.x - r,
                        nx2 = d.x + r,
                        ny1 = d.y - r,
                        ny2 = d.y + r;
                    quadtree.visit(function(quad, x1, y1, x2, y2) {
                        if (quad.point && (quad.point !== d)) {
                            var x = d.x - quad.point.x,
                                y = d.y - quad.point.y,
                                l = Math.sqrt(x * x + y * y),
                                r = d.radius + quad.point.radius + (d.series.cluster === quad.point.series.cluster ? padding : clusterPadding);
                            if (l < r) {
                                l = (l - r) / l * alpha;
                                d.x -= x *= l;
                                d.y -= y *= l;
                                quad.point.x += x;
                                quad.point.y += y;
                            }
                        }
                        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                    });
                };
            }
        },

        _createNewForceBubble:function(bubbleS, animation){

            var self = this;

            var plotBounds = this.component.getPlotBounds();
            var cX = plotBounds.width/2;
            var cY = plotBounds.height/2;

            var newForceGroup = bubbleS.enter().append('g').attr('class', function(d){
                return FORCE_BUBBLE_GROUP + ' ' + d.className;
            });

            newForceGroup
                .attr('transform', function(d){
                    var x = BaseUtils.isEmpty(d.x) ? cX : d.x;
                    var y = BaseUtils.isEmpty(d.y) ? cY : d.y;
                    return 'translate(' + x + ',' + y + ')'
                })
                .call(this.force.drag)
                .append('circle')
                .style('fill', function(d){
                    return d.color;
                })
                .style('fill-opacity', function(d){
                    return d.fillColorOpacity
                })
                .each(function(d){
                    self._addFilter(d, d3.select(this), 0);
                });

            this.addShapeEventHandler(newForceGroup);

            newForceGroup
                .select('circle')
                .transition().duration(animation ? 750 : 0)
                .delay(function(d, i) { return i * 5; })
                .attrTween("r", function(d) {
                    var i = d3.interpolate(0, d.radius);
                    return function(t) { return d.radius = i(t); };
                })
                .each('end', function(d){
                    self._createForceLabel(d, d3.select(this.parentNode));
                });
        },

        _createForceLabel:function(d, gElement){

            if(d.labelPos && d.labelDim && !d.dataLabels.useHtml){

                var labelContent = d.labelContent;

                var centerX = d.labelPos.x + d.labelDim.width/2;

                var startY = d.labelPos.y;

                var text = gElement.append('text').style('opacity', 0);

                for(var i = 0, count = labelContent.length; i < count; i++){
                    var label = labelContent[i];

                    var labelDim = label.dim;
                    var labelText = label.text;
                    var labelStyle = label.style;

                    text
                        .append('tspan')
                        .attr('x', centerX)
                        .attr('y', startY + labelDim.height/2)
                        .attr('dy', '.32em')
                        .attr("text-anchor", "middle")
                        .text(labelText)
                        .call(BaseUtils.setTextStyle, labelStyle);
                    startY += (labelDim.height + this.component.getLabelGap());
                }

                text.transition('linear')
                    .duration(400)
                    .style('opacity', 1)

            }
        },

        _renderNormalBubbles:function(){
            var svgRoot = this.bubble.getVanchartRender().getRenderRoot();
            var supportAnimation = this.bubble.isSupportAnimation();

            if(!this._bodyG) {
                this._bodyG = svgRoot.append('g');
                this._labelG = svgRoot.append('g');
                this._createDefs();
                this._updateChartBodyTranslate([this._bodyG, this._labelG]);
            } else {
                this._updateChartBodyTranslate([this._bodyG, this._labelG], supportAnimation, BUBBLE_UPDATE_TIME);
            }

            var labelDelayTime = BUBBLE_EXIT_TIME;
            labelDelayTime += BUBBLES_SHOW_TIME;

            var bubbleData = this.bubble.getVisibleChartData();

            var bubbleSeriesS = this._bodyG
                .selectAll('g.' + BUBBLE_SERIES_GROUP)
                .data(bubbleData, function(d){return d.className});

            this._dropSeries(bubbleSeriesS.exit(), supportAnimation);

            this._updateSeries(bubbleSeriesS, supportAnimation);

            this._createSeries(bubbleSeriesS, supportAnimation);

            this._drawNormalChartLabels(this._labelG, supportAnimation ? labelDelayTime : 0);
        },

        scaleRender:function(){
            if(this.bubble.isUpdateWithForce()){
                var bubbleData = this.bubble.getVisibleChartData();
                var nodes = [];
                bubbleData.forEach(function(sery){
                    sery.points.forEach(function(point){
                        if(point.visible){
                            nodes.push(point);
                        }
                    })
                });

                var self = this;

                var bubbleS = this._bodyG
                    .selectAll('g.' + FORCE_BUBBLE_GROUP)
                    .data(nodes, function(d){return d.className;});

                bubbleS
                    .transition()
                    .duration(BUBBLE_UPDATE_TIME)
                    .ease('back-out')
                    .attr('transform', function(d){
                        return 'translate('+ d.x + ',' + d.y +')';
                    })
                    .each('start', function(){
                        self.labelDivManager.clearAllLabels();
                    })
                    .each('end', function(){
                        self._createForceBubbleDivLabel(nodes);
                    });


                bubbleS.each(function(d){

                    var g = d3.select(this);

                    g.select('circle').attr('r', d.radius);

                    if(d.labelPos && g.select('text').empty()){
                        self._createForceLabel(d, g);
                    }

                });
            }else{
                this.render();
            }
        },

        filterRender: function () {
            if(this.bubble.isLargeMode()){
                this._canvasRender();
            }else if(this.bubble.isUpdateWithForce()){

                var bubbleData = this.bubble.getVisibleChartData();
                var nodes = [];
                bubbleData.forEach(function(sery){
                    sery.points.forEach(function(point){
                        if(point.visible){
                            nodes.push(point);
                        }
                    })
                });

                this.labelDivManager.clearAllLabels();
                this._createForceBubbleDivLabel(nodes);

                var bubbleS = this._bodyG
                    .selectAll('g.' + FORCE_BUBBLE_GROUP)
                    .data(nodes, function(d){return d.className;});

                bubbleS.each(function(){
                    var g = d3.select(this);

                    var translate = d3.transform(g.attr('transform')).translate;

                    g.attr('transform', BaseUtils.makeTranslate(translate) + 'scale(1)');
                });


                bubbleS.exit().each(function(){

                    var g = d3.select(this);

                    var translate = d3.transform(g.attr('transform')).translate;

                    g.attr('transform', BaseUtils.makeTranslate(translate) + 'scale(0.01)');
                });

            }else{
                this._drawNormalChartLabels(this._labelG, 0);

                this._bodyG.selectAll('path')
                    .filter(function(d){return d.visible})
                    .attr('transform', function (d) {
                        return 'translate('+d.posX+','+ d.posY+')';
                    })
                    .attr('d', function(d){
                        return d3.svg.arc().outerRadius(d.radius)({startAngle:0, endAngle:2 * Math.PI})});

                this._bodyG.selectAll('path')
                    .filter(function(d){return !d.visible})
                    .attr('transform', function (d) {
                        return 'translate('+d.posX+','+ d.posY+')';
                    })
                    .attr('d', d3.svg.arc().outerRadius(0)({startAngle:0, endAngle:2 * Math.PI}))
            }

        },

        _createDefs:function(){

            var defs = this._bodyG.append('defs');

            this._createDropShadowFilter(defs, this._getFilterID(), 0, 0, 0.2, 2);
        },

        _getFilterID:function(){

            return this.bubble.vanchart.getIDPrefix() + BUBBLE_SHADOW_ID;;

        },

        _addFilter:function(d, bubble, delay){
            var self = this;
            if(d.shadow) {
                delay = delay || 0;
                delay += 200;
                setTimeout(function () {
                    if (bubble) {
                        bubble.style("filter", 'url(#' + self._getFilterID() + ')')
                    }
                }, delay)
            }
        },

        //系列消失动画
        _dropSeries:function(exitSeries, supportAnimation){

            exitSeries.each(function(){
                d3.select(this)
                    .selectAll('path')
                    .transition()
                    .duration(supportAnimation ? BUBBLE_EXIT_TIME : 0)
                    .ease('back-in')
                    .attr('d', d3.svg.arc().outerRadius(0)({startAngle:0, endAngle:2 * Math.PI}))
                    .remove();
            });
        },

        _updateSeries:function(bubbleSeries, supportAnimation){

            var isChangeData = this.bubble.vanchart.isChangeDataState();

            var self = this;
            bubbleSeries.each(function(d){

                var bubbles = d3.select(this)
                    .selectAll('path')
                    .data(d.points, function(d){return d.className;});

                if(isChangeData){

                    bubbleSeries.each(function(){
                        var bubbles = d3.select(this).selectAll('path');

                        bubbles
                            .transition()
                            .duration(supportAnimation ? BUBBLE_EXIT_TIME : 0)
                            .ease('back-in')
                            .attr('d', d3.svg.arc().outerRadius(0)({startAngle:0, endAngle:2 * Math.PI}))
                            .each('end', function(d){
                                d3.select(this)
                                    .attr('transform', 'translate('+d.posX+','+ d.posY+')')
                                    .transition()
                                    .ease('back-in')
                                    .duration(supportAnimation ? BUBBLE_EXIT_TIME : 0)
                                    .attr('d', d3.svg.arc().outerRadius(d.radius)({startAngle:0, endAngle:2 * Math.PI}))
                            });
                    });

                }else{
                    self._updateBubbles(bubbles, supportAnimation);
                };

                bubbles.exit().remove();
                self._createBubbles(bubbles, supportAnimation);
            });
        },

        //系列重现动画
        _createBubbles:function(bubbles, supportAnimation) {
            var bubbleG = bubbles.enter().append('path');
            var self = this;
            bubbleG.each(function(d){

               var bubble = d3.select(this);

                bubble
                    .attr('class', d.className)
                    .attr('transform', 'translate('+d.posX+','+ d.posY+')')
                    .attr('d', d3.svg.arc().outerRadius(0)({startAngle:0, endAngle:2 * Math.PI}))
                    .style('fill', d.color)
                    .style('fill-opacity', d.fillColorOpacity)
                    .transition()
                    .ease('back-out')
                    .duration(supportAnimation ? BUBBLE_EXIT_TIME : 0)
                    .attr('d', d3.svg.arc().outerRadius(d.radius)({startAngle:0, endAngle:2 * Math.PI}));

                self._addFilter(d, bubble, supportAnimation ? BUBBLE_EXIT_TIME : 0);
            });

            self.addShapeEventHandler(bubbles);
        },

        //系列消失或重现时，其他系列位置、大小动画.
        _updateBubbles:function(bubbles, supportAnimation) {
            bubbles
                .filter(function(d){return d.visible})
                .each(function(d){

                d3.select(this)
                    .transition()
                    .duration(supportAnimation ? BUBBLE_UPDATE_TIME : 0)
                    .ease('back-out')
                    .attr('d', function(d){
                        return d3.svg.arc().outerRadius(d.radius)({startAngle:0, endAngle:2 * Math.PI});
                    })
                    .attr('transform', 'translate('+ d.posX+','+ d.posY+')');
            });
        },

        //初始化
        _createSeries:function(bubbleSeries, supportAnimation) {
            var newSeriesG = bubbleSeries.enter().append('g').attr('class', BUBBLE_SERIES_GROUP);

            var self = this;
            newSeriesG.each(function(d){

                var bubbles = d3.select(this)
                    .selectAll('path')
                    .data(d.points, function(d){return d.className;});

                var bubbleG = bubbles.enter().append('path');

                bubbleG
                    .filter(function(d){return d.visible})
                    .each(function(d){

                   var bubble = d3.select(this);

                    bubble
                        .attr('class', d.className)
                        .attr('transform', 'translate('+d.posX+','+ d.posY+')')
                        .attr('d', d3.svg.arc().outerRadius(0)({startAngle:0, endAngle:2 * Math.PI}))
                        .style('fill', d.color)
                        .style('fill-opacity', d.fillColorOpacity)
                        .transition()
                        .delay(supportAnimation ? d.delayTime : 0)
                        .ease('bounce')
                        .duration(supportAnimation ? BUBBLE_INIT_TIME : 0)
                        .attr('d', d3.svg.arc().outerRadius(d.radius)({startAngle:0, endAngle:2 * Math.PI}));

                    self._addFilter(d, bubble, supportAnimation ? (BUBBLE_INIT_TIME + d.delayTime) : 0);
                });

                self.addShapeEventHandler(bubbles);
            });
        },

        _getElementByData:function(point){
            var element = this._bodyG.select('.' + point.className);
            return this.bubble.isForceBubble() && this.bubble.isUpdateWithForce() ? element.select('circle') : element;
        },

        makeChosenState:function(d){
            if(this.bubble.isLargeMode()){
                return;
            }

            this._getElementByData(d)
                .style('stroke', d.mouseOverColor)
                .style('stroke-width', 0)
                .style('stroke-opacity', 0.35)
                .style('fill', d.mouseOverColor)
                .interrupt(Constants.SELECT_ANIMATION)
                .transition(Constants.SELECT_ANIMATION)
                .duration(BUBBLE_CHOSEN_TIME)
                .ease('back-out')
                .style('stroke-width', CHOSEN_STROKE_WIDTH);
        },

        cancelChosenState:function(d){
            if(this.bubble.isLargeMode()){
                return;
            }

            this._getElementByData(d)
                .style('fill', d.color)
                .style('fill-opacity', d.fillColorOpacity)
                .interrupt(Constants.SELECT_ANIMATION)
                .transition(Constants.SELECT_ANIMATION)
                .style('stroke-width', 0);
        },

        makeClickedState:function(d){
            if(this.bubble.isLargeMode()){
                return;
            }

            this._getElementByData(d)
                .style('fill', d.clickColor);
        },

        cancelClickedState:function(d){
            if(this.bubble.isLargeMode()){
                return;
            }

            this._getElementByData(d)
                .style('fill', d.mouseOverColor);
        }

    };

    BaseUtils.inherit(BubbleSvgRender, BaseRender);

    require('./RenderLibrary').register(Constants.BUBBLE_SVG, BubbleSvgRender);

    return BubbleSvgRender;
});
/**
 * Created by Mitisky on 16/3/24.
 */
define('render/ScatterSvgRender',['require','./BaseRender','../utils/BaseUtils','../utils/ColorUtils','../Constants','./RenderLibrary'],function (require) {
    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');

    var SCATTER_SHOW_TIME = 800;
    var SCATTER_INIT_TIME = 300;
    var SCATTER_UPDATE_TIME = 500;

    var SCATTER_SERIES_GROUP = 'scatter-series-group';
    var SCATTER_SERIES_LINE_CLASS = 'scatter-series-line-class';

    function ScatterSvgRender(scatter){
        BaseRender.call(this, scatter);
        this.scatter = scatter;
    }

    ScatterSvgRender.prototype = {
        constructor: ScatterSvgRender,

        render:function(){
            this.scatter.isLargeMode() ? this._canvasRender() : this._svgRender();
        },

        _svgRender:function(){

            var svgRoot = this.scatter.getVanchartRender().getRenderRoot();
            var labelDelayTime = SCATTER_INIT_TIME;
            var supportAnimation = this.scatter.isSupportAnimation();

            if(!this._bodyG) {
                this._bodyG = svgRoot.append('g');
                this._labelG = svgRoot.append('g');
                labelDelayTime += SCATTER_SHOW_TIME;
                this._updateChartBodyTranslate([this._bodyG, this._labelG]);
            } else {
                this._updateChartBodyTranslate([this._bodyG, this._labelG], supportAnimation, SCATTER_UPDATE_TIME);
            }

            var scatterData = this.scatter.getVisibleChartData();

            var scatterSeriesS = this._bodyG
                .selectAll('g.' + SCATTER_SERIES_GROUP)
                .data(scatterData, function(d){return d.className});

            this._dropSeries(scatterSeriesS.exit(), supportAnimation);

            this._updateSeries(scatterSeriesS, supportAnimation);

            this._createSeries(scatterSeriesS, supportAnimation);

            this._drawNormalChartLabels(this._labelG, supportAnimation ? labelDelayTime : 0);
        },

        filterRender: function () {
            if(this.scatter.isLargeMode()){
                this._canvasRender();
            }else{
                this._drawNormalChartLabels(this._labelG, 0);

                this._bodyG.selectAll('g.' + SCATTER_SERIES_GROUP)
                    .each(function () {
                        d3.select(this)
                            .selectAll('g')
                            .filter(function(d){return d.visible})
                            .attr('transform', function(d){
                                return 'translate('+ d.posX +','+ d.posY +') scale(1)';
                            });

                        d3.select(this)
                            .selectAll('g')
                            .filter(function(d){return !d.visible})
                            .attr('transform', function(d){
                                return 'translate('+ d.posX +','+ d.posY +') scale(0)';
                            });
                    });
            }
        },

        //系列消失动画
        _dropSeries:function(exitSeries, supportAnimation){

            exitSeries.each(function(){
                d3.select(this)
                    .selectAll('g')
                    .transition()
                    .duration(supportAnimation ? SCATTER_INIT_TIME : 0)
                    .ease('back-in')
                    .attr('transform', function(d){
                        return 'translate('+ d.posX +','+ d.posY +') scale(0)';
                    })
                    .remove();

                d3.select(this)
                    .selectAll('path.' + SCATTER_SERIES_LINE_CLASS)
                    .remove();
            });
        },

        _updateSeries:function(scatterSeriesS, supportAnimation){

            var isChangeData = this.scatter.vanchart.isChangeDataState();

            var self = this;
            scatterSeriesS.each(function(d){
                var parentG = d3.select(this);

                var points = parentG
                    .selectAll('g')
                    .data(d.points, function(d){return d.className;});

                if(isChangeData){
                    //自动刷新动画
                    parentG.selectAll('path.' + SCATTER_SERIES_LINE_CLASS).remove();

                    points
                        .transition()
                        .duration(supportAnimation ? SCATTER_INIT_TIME : 0)
                        .ease('back-in')
                        .attr('transform', function(d){
                            return 'translate('+ d.posX +','+ d.posY +') scale(0)';
                        })
                        .remove();

                    setTimeout(function () {
                        parentG
                            .selectAll('g')
                            .data(d.points, function(d){return d.className;})
                            .call(self._createSvgMarker.bind(self))
                            .filter(function(d){return d.visible})
                            .attr('transform', function(d){
                                return 'translate('+ d.posX +','+ d.posY +') scale(0.01)';
                            })
                            .transition()
                            .duration(supportAnimation ? SCATTER_INIT_TIME : 0)
                            .ease('back-out')
                            .attr('transform', function(d){
                                return 'translate('+ d.posX +','+ d.posY +') scale(1)';
                            });

                        self._createSeriesLine(parentG, d, supportAnimation ? SCATTER_INIT_TIME : 0);
                    }, SCATTER_INIT_TIME);
                }else{
                    if(points.empty()){
                        //点击图例系列重现
                        self._createSeriesLine(parentG, d, supportAnimation ? SCATTER_INIT_TIME : 0);

                        points
                            .call(self._createSvgMarker.bind(self))
                            .filter(function(d){return d.visible})
                            .attr('transform', function(d){
                                return 'translate('+ d.posX +','+ d.posY +') scale(0.01)';
                            })
                            .transition()
                            .duration(supportAnimation ? SCATTER_INIT_TIME : 0)
                            .ease('back-out')
                            .attr('transform', function(d){
                                return 'translate('+ d.posX +','+ d.posY +') scale(1)';
                            });
                    } else {
                        //点击图例其他系列移动
                        points
                            .filter(function(d){return d.visible})
                            .transition()
                            .duration(supportAnimation ? SCATTER_UPDATE_TIME : 0)
                            .ease('back-out')
                            .attr('transform', function(d){
                                return 'translate('+ d.posX +','+ d.posY +') scale(1)';
                            });
                        parentG.select('path.' + SCATTER_SERIES_LINE_CLASS)
                            .transition()
                            .duration(supportAnimation ? SCATTER_UPDATE_TIME : 0)
                            .ease('back-out')
                            .attr('d',  d.lineSvg(d.points));
                    }
                }
            });
        },

        //初始化
        _createSeries:function(scatterSeriesS, supportAnimation) {
            var newSeriesG = scatterSeriesS.enter().append('g').attr('class', SCATTER_SERIES_GROUP);

            var self = this;
            newSeriesG
                .each(function (d) {
                    self._createSeriesLine(d3.select(this), d, supportAnimation ? SCATTER_SHOW_TIME : 0);
                });

            var markerS = newSeriesG.selectAll('g.' + SCATTER_SERIES_GROUP)
                .data(function(d){ return d.points; });

            this._createMarkers(markerS, supportAnimation)
        },

        _createMarkers:function(markerS, supportAnimation){

            markerS
                .call(this._createSvgMarker.bind(this))
                .filter(function(d){return d.visible})
                .attr('transform', function(d){
                    return 'translate('+ d.posX +','+ d.posY +') scale(0.01)';
                })
                .transition()
                .delay(function(d){return supportAnimation ? d.delayTime : 0})
                .duration(supportAnimation ? SCATTER_INIT_TIME : 0)
                .ease('back-out')
                .attr('transform', function(d){
                    return 'translate('+ d.posX +','+ d.posY +') scale(1)';
                });

        },

        _createSeriesLine: function (parentG, d, delayTime) {
            parentG
                .append('path')
                .attr('class', SCATTER_SERIES_LINE_CLASS)
                .attr('d',  d.lineSvg(d.points))
                .style('fill', 'none')
                .style('stroke', ColorUtils.colorToHex(d.color))
                .style('stroke-width', 0);

            parentG
                .select('path.' + SCATTER_SERIES_LINE_CLASS)
                .transition()
                .delay(delayTime)
                .style('stroke-width', d.lineWidth);
        },

        makeChosenState:function(d){
            if(this._bodyG) {
                this._makeMarkerChosenState(this._bodyG, d, 3, 200);
            }
        },

        cancelChosenState:function(d){
            if(this._bodyG) {
                this._cancelMarkerChosenState(this._bodyG, d);
            }
        },

        makeClickedState:function(d){
            if(this._bodyG) {
                this._makeMarkerClickedState(this._bodyG, d);
            }
        },

        cancelClickedState:function(d){
            if(this._bodyG) {
                this._cancelMarkerClickedState(this._bodyG, d);
            }
        }
        
    };

    BaseUtils.inherit(ScatterSvgRender, BaseRender);

    require('./RenderLibrary').register(Constants.SCATTER_SVG, ScatterSvgRender);

    return ScatterSvgRender;
});

/**
 * Created by eason on 15/8/14.
 */

define('render/TitleSvgRender',['require','./BaseRender','../utils/BaseUtils','../Constants','../utils/BezierEasing','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var BezierEasing = require('../utils/BezierEasing');

    var TITLE_GRADUAL = 'title-gradual-background';

    function TitleSvgRender(title){
        BaseRender.call(this, title);
        this.title = title;

        //文本实际结束的位置
        this.textEndX = 0;
    }

    TitleSvgRender.prototype = {

        constructor:TitleSvgRender,

        render:function(){

            if(this._titleG){
                return;
            }

            var cfg = this.title.componentOption;
            var bounds = this.title.bounds;
            var svgRoot = this.title.getVanchartRender().getRenderRoot();

            var toolbarWidth = this.title.vanchart.getToolbarWidth();
            toolbarWidth = this.title.isFloat ? 0 : toolbarWidth;

            var IDPrefix = this.title.vanchart.getIDPrefix();
            var gradualID = TITLE_GRADUAL + IDPrefix;

            if(!this._titleG){
                this._backgroundG = svgRoot.append('g')
                    .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ')');

                this._titleG = svgRoot.append('g')
                    .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ')');
            }

            //背景
            if(cfg.backgroundColor){

                this._createGradualDefs(this._titleG, cfg.backgroundColor, gradualID);

                this._backgroundG
                    .append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', bounds.width)
                    .attr('height', bounds.height)
                    .attr('rx', cfg.borderRadius)
                    .attr('ry', cfg.borderRadius)
                    .style('fill', function(){
                        return typeof cfg.backgroundColor == 'string' ?
                                                    cfg.backgroundColor : "url(#" + gradualID + ")";
                    });
            }

            if(cfg.useHtml){
                this._drawTitleWithHtml(cfg, bounds, toolbarWidth);
            }else{
                var textDim = BaseUtils.getTextDimension(cfg.text, cfg.style, cfg.useHtml);

                var lineHeight = textDim.height;
                var lineGap = textDim.height * this.title.getLineGapPercent();
                var padding = this.title.getPadding();

                var usedWidth = bounds.width - (this.title.isFloat ? 0 : toolbarWidth);

                var result = BaseUtils.splitText(cfg.text, cfg.style, usedWidth, padding);
                var firstLineWidth = BaseUtils.getTextDimension(result[0], cfg.style, cfg.useHtml).width;

                var x, textAnchor;
                var align = cfg.align || 'left';
                switch(align){
                    case 'left':
                        x = padding;
                        textAnchor = 'start';
                        this.textEndX = firstLineWidth;
                        break;
                    case 'center':
                        x = bounds.width/2 - toolbarWidth/2;
                        this.textEndX = x + firstLineWidth/2;
                        textAnchor = 'middle';
                        break;
                    case 'right':
                        x = bounds.width - padding - toolbarWidth;
                        this.textEndX = x;
                        textAnchor = 'end';
                        break;
                }

                for(var index = 0, len = result.length; index < len; index++){
                    this._titleG
                        .append('text')
                        .attr('x', x)
                        .attr('y', padding + (lineHeight + lineGap) * index + lineHeight/2)
                        .attr("dy", ".32em")
                        .style("text-anchor", textAnchor)
                        .text(result[index])
                        .call(BaseUtils.setTextStyle, cfg.style);
                }
            }
        },

        translateX:function(width){

            this.labelDivManager.translateLabelsHorizontal(width);

            var gap = this.title.bounds.width - this.textEndX;

            if(gap > Math.abs(width)){
                return;
            }

            var sign = width < 0 ? -1 : 1;

            var detX = Math.min(gap, Math.abs(width)) * sign;

            var translate = d3.transform(this._titleG.attr('transform')).translate;

            var translateX = translate[0] + detX;

            this._titleG.transition().ease(BezierEasing.css.swing).duration(300)
                .attr('transform', 'translate(' + translateX + ',' + translate[1] + ')');

        }

    };


    BaseUtils.inherit(TitleSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.TITLE_SVG, TitleSvgRender);

    return TitleSvgRender;
});
/**
 * Created by eason on 15/9/25.
 */

define('render/BaseAxisSvgRender',['require','./BaseRender','../utils/BaseUtils','../utils/BezierEasing','../Constants'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var BezierEasing = require('../utils/BezierEasing');
    var Constants = require('../Constants');


    var TIME = 400;
    var EASE = BezierEasing.css.swing;

    var MONITOR_EASE = 'linear';
    var MONITOR_TIME = 500;

    var TICK_TEXT = 'axis-tick-text';
    var TICK_LINE = 'axis-tick-line';
    var MINOR_TICK_LINE = 'axis-minor-tick-line';
    var GRID_LINE = 'axis-grid-line';
    var PLOT_BANDS = 'plot-bands';
    var PLOT_LINES = 'plot-lines';
    var AXIS_LINE = 'axis-line';

    function BaseAxisSvgRender(axis){
        BaseRender.call(this, axis);
        this.axis = axis;
    }

    BaseAxisSvgRender.prototype = {
        constructor:BaseAxisSvgRender,

        render:function(){

            var svgRoot = this.axis.getVanchartRender().getRenderRoot();

            if(this._axisG){
                if(this.axis.option.plotOptions.large){
                    this._axisG.call(this._drawAxis.bind(this));
                }else{
                    this._axisG.transition().ease(EASE).duration(TIME).call(this._drawAxis.bind(this));
                }

                clearTimeout(this._animation_);
                var self = this;
                this._animation_ = setTimeout(function(){
                    self._axisG.call(self._drawAxis.bind(self));
                }, TIME + 100)

            }else{
                this._axisG =  svgRoot.append('g');
                this._axisG.call(this._drawAxis.bind(this));
            }

            this._axisTitleG = this._axisTitleG || svgRoot.append('g');

            var titleBounds = this.axis.getAxisTitleBounds();

            this._axisTitleG.attr('transform', 'translate(' + titleBounds.x + ',' + titleBounds.y + ')');

            this._drawAxisTitle(titleBounds);
        },


        _drawPlotBands:function(g){

            var plotBands = this.axis._preCalculatePlotBands();
            var plotBounds = this.axis.getPlotBounds();

            g.each(function(){

                var bands = d3.select(this)
                    .selectAll('.' + PLOT_BANDS).data(plotBands);

                bands.exit().remove();

                bands.enter().append('rect').attr('class', PLOT_BANDS);

                bands
                    .attr('transform', BaseUtils.makeTranslate(plotBounds))
                    .style('fill', function(d){return d.color});

                d3.transition(bands)
                    .attr('x', function(d){return d.x})
                    .attr('y', function(d){return d.y})
                    .attr('width', function(d){return d.width})
                    .attr('height', function(d){return d.height});
            });
        },

        _drawPlotLines:function(g){

            var plotLines = this.axis._preCalculatePlotLines();
            var plotBounds = this.axis.getPlotBounds();

            g.each(function(){

                var lines = d3.select(this)
                    .selectAll('.' + PLOT_LINES).data(plotLines);

                lines.exit().remove();

                var lineEnter = lines.enter().append('g').attr('class', PLOT_LINES);
                lineEnter.append('line');
                lineEnter.append('text');

                d3.transition(lines).attr('transform', BaseUtils.makeTranslate(plotBounds));

                d3.transition(lines.select('line'))
                    .attr('x1', function(d){return d.startPos.x})
                    .attr('y1', function(d){return d.startPos.y})
                    .attr('x2', function(d){return d.endPos.x})
                    .attr('y2', function(d){return d.endPos.y})
                    .style('stroke', function(d){
                        return d.color;
                    })
                    .style('stroke-width', function(d){
                        return d.width;
                    })
                    .style('stroke-dasharray', function(d){
                        return d.dataArray;
                    });

                d3.transition(lines.select('text'))
                    .text(function(d){
                        return d.text;
                    })
                    .attr('x', function(d){
                        return d.textX;
                    })
                    .attr('y', function(d){
                        return d.textY;
                    })
                    .attr('dy', '0.85em')
                    .each(function(d){
                        d3.select(this)
                            .call(BaseUtils.setTextStyle, d.style);
                    });
            });
        },

        _drawGridLine:function(g){
            var cfg = this.axis.componentOption;
            var plotBounds = this.axis.getPlotBounds();
            var gridLineWidth = cfg.gridLineWidth;
            var ticks = this.axis.getTickData();
            var scale = this.axis.scale;
            var lastScale = this.axis.lastScale || scale;

            var x1 = 'x1', y1 = 'y1', x2 = 'x2', y2 = 'y2';
            var lineSize = plotBounds.height;
            var endPos = plotBounds.width;

            if(!this.axis.isHorizontal()){
                x1 = 'y1'; y1 = 'x1'; x2 = 'y2'; y2 = 'x2';
                lineSize = plotBounds.width;
                endPos = 0;
            }

            var gridLineColor = cfg.gridLineColor;
            var det = BaseUtils.lineSubPixelOpt(0, gridLineWidth);

            g.each(function(){

                var gridLines = d3.select(this).selectAll('.' + GRID_LINE).data(ticks, function(d){return d.tickValue});

                if(gridLineWidth){

                    d3.transition(gridLines.exit())
                        .style("opacity", 0)
                        .attr(x1, function(d){
                            return scale(d.tickValue);
                        })
                        .attr(y1, 0)
                        .attr(x2, function(d){
                            return scale(d.tickValue);
                        })
                        .attr(y2, lineSize)
                        .remove();

                    var enter = gridLines.enter();

                    enter.append('line')
                        .attr('class', GRID_LINE)
                        .attr('transform', BaseUtils.makeTranslate(plotBounds))
                        .attr(x1, function(d){return lastScale(d.tickValue) + det})
                        .attr(y1, 0)
                        .attr(x2, function(d){return lastScale(d.tickValue) + det})
                        .attr(y2, lineSize)
                        .style({
                            'stroke':gridLineColor,
                            'stroke-width':gridLineWidth,
                            'opacity':0
                        });

                    d3.transition(gridLines)
                        .attr('transform', BaseUtils.makeTranslate(plotBounds))
                        .attr(x1, function(d){return d.tickPos + det})
                        .attr(y1, 0)
                        .attr(x2, function(d){return d.tickPos + det})
                        .attr(y2, lineSize)
                        .style('opacity', 1);
                }else{
                    gridLines.remove();
                }

            });
        },

        _drawTickLine:function(g){

            var cfg = this.axis.componentOption;

            var ticks = this.axis.getMainTickData();
            var tickLength = cfg.enableTick ? cfg.tickLength : 0;
            var tickWidth = cfg.tickWidth;
            var tickColor = cfg.tickColor;
            var axisOrigin = this.axis._getAxisOriginPoint();
            var orient = this.axis.getPosition();

            var x1 = 'x1', y1 = 'y1', x2 = 'x2', y2 = 'y2';
            if(!this.axis.isHorizontal()){
                x1 = 'y1'; y1 = 'x1'; x2 = 'y2'; y2 = 'x2';
            }

            var sign = (orient == Constants.TOP || orient == Constants.LEFT) ? -1 : 1;
            var det = BaseUtils.lineSubPixelOpt(0, tickWidth);

            g.each(function(){

                var tickLines = d3.select(this).selectAll('.' + TICK_LINE).data(ticks);

                if(tickLength && tickWidth){

                    tickLines.enter()
                        .append('line').attr('class', TICK_LINE)
                        .attr('transform', BaseUtils.makeTranslate(axisOrigin))
                        .style({
                            'stroke':tickColor,
                            'stroke-width':tickWidth
                        });

                    tickLines.exit().remove();

                    d3.transition(tickLines)
                        .attr('transform', BaseUtils.makeTranslate(axisOrigin))
                        .attr(x1, function(d){
                            return d.tickPos + det;
                        })
                        .attr(y1, 0)
                        .attr(x2, function(d){
                            return d.tickPos + det;
                        })
                        .attr(y2, sign * tickLength);
                }else{
                    tickLines.remove();
                }
            });

        },

        _drawTickLabel:function(g){

            var cfg = this.axis.componentOption;
            var plotBounds = this.axis.getPlotBounds();

            var scale = this.axis.scale;
            var lastScale = this.axis.lastScale || scale;

            var ticks = this.axis.getTickData();
            var tickLength = cfg.enableTick ? cfg.tickLength : 0;
            var labelRotation = cfg.labelRotation || 0;
            var axisOrigin = this.axis._getAxisOriginPoint();
            var useHtml = cfg.useHtml && !cfg.labelRotation;
            var labelStyle = cfg.labelStyle;
            var labelHeight = BaseUtils.getTextHeight(labelStyle);
            var tickPadding = cfg.tickPadding + tickLength;

            var orient = this.axis.getPosition();
            var sign = (orient == Constants.TOP || orient == Constants.LEFT) ? -1 : 1;

            var isHorizontal = this.axis.isHorizontal();

            var x = 'x', y = 'y';
            if(!isHorizontal){
                x = 'y'; y = 'x';
            }

            var self = this;

            g.each(function(){

                var tickLabels = d3.select(this)
                    .selectAll('.' + TICK_TEXT)
                    .data(ticks, function(d){return d.tickValue});

                if(cfg.showLabel && !useHtml){

                    tickLabels.enter()
                        .append('text')
                        .attr('class', TICK_TEXT)
                        .attr('transform', function(d){
                            return self._getLabelTransform(lastScale, d, sign, tickPadding, axisOrigin, labelRotation);
                        })
                        .attr(x, function(d){return lastScale(d.tickValue);})
                        .style('text-anchor', 'middle')
                        .style('opacity', 0)
                        .call(BaseUtils.setTextStyle, labelStyle);

                    d3.transition(tickLabels.exit())
                        .attr(x, function(d){
                            return scale(d.tickValue);
                        })
                        .style('opacity', 0)
                        .remove();


                    d3.transition(tickLabels)
                        .attr('transform', function(d){
                            return self._getLabelTransform(scale, d, sign, tickPadding, axisOrigin, labelRotation);
                        })
                        .text(function(d){return d.tickContent;})
                        .attr(x, function(d){return d.tickLabelPos;})
                        .attr(y, function(d){
                            if(isHorizontal){
                                var tmp = orient == Constants.TOP ? (tickPadding + d.tickDim.height/2 - labelHeight/2) : (tickPadding + d.tickDim.height/2 + labelHeight/2);
                                return sign * tmp;
                            }else{
                                return sign * (tickPadding + d.tickDim.width/2)
                            }
                        })
                        .attr('dy', isHorizontal ? 0 : '.32em')
                        .style('opacity', 1);

                }else{
                    tickLabels.remove();
                }
            });
        },

        _getLabelTransform:function(scale, d, sign, tickPadding, axisOrigin, labelRotation){

            var det = scale.rangeBand ? -scale.rangeBand()/2 : 0;
            var tickLabelPos = Math.round(scale(d.tickValue)) - det;

            var rx, ry;
            if(this.axis.isHorizontal()){
                rx = tickLabelPos;
                ry = sign * (tickPadding + d.tickDim.height/2);
            }else{
                rx = sign * (tickPadding + d.tickDim.width/2);
                ry = tickLabelPos;
            }
            return BaseUtils.makeTranslate(axisOrigin) + 'rotate(' + labelRotation + ' ' + rx + ',' + ry + ')';
        },

        _drawAxisLine:function(g){
            var cfg = this.axis.componentOption;
            var plotBounds = this.axis.getPlotBounds();
            var axisOrigin = this.axis._getAxisOriginPoint();
            var lineWidth = cfg.lineWidth;
            var lineColor = cfg.lineColor;

            var x1 = 'x1', y1 = 'y1', x2 = 'x2', y2 = 'y2';
            var size = plotBounds.width;

            if(!this.axis.isHorizontal()){
                x1 = 'y1'; y1 = 'x1'; x2 = 'y2'; y2 = 'x2';
                size = plotBounds.height;
            }

            var det = BaseUtils.lineSubPixelOpt(0, lineWidth);

            g.each(function(){

                var path = d3.select(this).selectAll("line." + AXIS_LINE).data([ 0 ]);

                if(lineWidth){

                    path.exit().remove();

                    path.enter().append('line').attr('class', AXIS_LINE);

                    d3.transition(path)
                        .attr('transform', BaseUtils.makeTranslate(axisOrigin))
                        .attr(x1, 0)
                        .attr(y1, det)
                        .attr(x2, size)
                        .attr(y2, det)
                        .style({
                            'stroke':lineColor,
                            'stroke-width':lineWidth
                        });
                }else{
                    path.remove();
                }

            });

        },

        _drawMinorTickLine:function(g){

            var cfg = this.axis.componentOption;
            var minorTickLength = cfg.enableMinorTick ? cfg.minorTickLength : 0;
            var minorTickWidth = cfg.minorTickWidth;
            var minorTickColor = cfg.minorTickColor;
            var minorTickData = this.axis.getMinorTickData();

            var axisOrigin = this.axis._getAxisOriginPoint();
            var orient = this.axis.getPosition();

            var x1 = 'x1', y1 = 'y1', x2 = 'x2', y2 = 'y2';
            if(!this.axis.isHorizontal()){
                x1 = 'y1'; y1 = 'x1'; x2 = 'y2'; y2 = 'x2';
            }

            var sign = (orient == Constants.TOP || orient == Constants.LEFT) ? -1 : 1;
            var det = BaseUtils.lineSubPixelOpt(0, minorTickWidth);

            var isCategory = this.axis.type == Constants.CATEGORY_AXIS_COMPONENT;
            var scale = this.axis.scale;

            g.each(function(){

                var minorTicks = d3.select(this)
                    .selectAll('.' + MINOR_TICK_LINE)
                    .data(minorTickData);

                if(minorTickLength && minorTickWidth){

                    minorTicks.enter()
                        .append('line').attr('class', MINOR_TICK_LINE)
                        .attr('transform', BaseUtils.makeTranslate(axisOrigin))
                        .style({
                            'stroke':minorTickColor,
                            'stroke-width':minorTickWidth
                        });

                    minorTicks.exit().remove();

                    d3.transition(minorTicks)
                        .attr('transform', BaseUtils.makeTranslate(axisOrigin))
                        .attr(x1, function(d){
                            return (isCategory ? d : scale(d)) + det;
                        })
                        .attr(y1, 0)
                        .attr(x2, function(d){
                            return (isCategory ? d : scale(d)) + det;
                        })
                        .attr(y2, sign * minorTickLength);
                }else{
                    minorTicks.remove();
                }
            });
        },

        _drawDivLabels:function(){

            this.labelDivManager.clearAllLabels();

            var labelDivManager = this.labelDivManager;
            var cfg = this.axis.componentOption;

            if(!cfg.useHtml || cfg.labelRotation){
                return;
            }

            var origin = this.axis._getAxisOriginPoint();

            var transX = origin.x;
            var transY = origin.y;

            var orient = this.axis.getPosition();
            var isHorizontal = this.axis.isHorizontal();
            var scale = this.axis.getTickScale();
            var ticks = this.axis.getTickData();

            var tickLength = cfg.enableTick ? cfg.tickLength : 0;
            var tickSpacing = (scale.rangeBand ? 0 : tickLength) + cfg.tickPadding;

            var labelStyle = cfg.labelStyle;
            var labelHeight = BaseUtils.getTextHeight(labelStyle);

            var x,y;
            if(cfg.useHtml && !cfg.labelRotation){

                if(isHorizontal){

                    y = orient == Constants.TOP ? -(tickSpacing + labelHeight) : tickSpacing;

                    ticks.forEach(function(tick){

                        x = tick.tickLabelPos - tick.tickDim.width/2;

                        labelDivManager.addLabel(tick.tickContent, {x:x + transX, y:y + transY}, labelStyle);

                    });

                }else{

                    ticks.forEach(function(tick){

                        x = orient == Constants.LEFT ? -(tickSpacing + tick.tickDim.width) : tickSpacing;
                        y = tick.tickLabelPos - labelHeight/2;

                        labelDivManager.addLabel(tick.tickContent, {x:x + transX, y:y + transY}, labelStyle);
                    });
                }
            }

        },

        /**
         * 坐标轴的刻度线，同区域背景什么的要分开画
         * @param selection
         * @private
         */
        _drawAxis:function(g) {

            this._drawPlotBands(g);

            this._drawGridLine(g);

            this._drawAxisLine(g);

            this._drawArrow(g);

            this._drawTickLine(g);

            this._drawTickLabel(g);

            this._drawDivLabels();

            this._drawMinorTickLine(g);

            this._drawPlotLines(g);
        },

        _drawArrow:function(g){

            if(!this.axis.showArrow()){
                return;
            }

            var plotBounds = this.axis.getPlotBounds();
            var cfg = this.axis.componentOption;
            var lineWidth = cfg.lineWidth;
            var lineColor = cfg.lineColor;
            var pathDet = BaseUtils.lineSubPixelOpt(0, lineWidth);
            var axisOrigin = this.axis._getAxisOriginPoint();

            this._axisG.select('g.arrow').remove();

            var arrowG = this._axisG.append('g')
                .attr('class', 'arrow')
                .attr('transform', BaseUtils.makeTranslate(axisOrigin));
            arrowG.append('line');
            arrowG.append('path');

            if(this.axis.isHorizontal()){

                arrowG
                    .select('line')
                    .attr('x1', plotBounds.width)
                    .attr('y1', pathDet)
                    .attr('x2', plotBounds.width + 6)
                    .attr('y2', pathDet)
                    .style({
                        'stroke':lineColor,
                        'stroke-width':lineWidth
                    });

                arrowG
                    .select('path')
                    .attr("d", "M2,2 L10,6 L2,10 L6,6 L2,2")
                    .attr('transform', 'translate(' + plotBounds.width + ',' + '-6' + ')')
                    .style('fill', lineColor);

            }else{

                arrowG
                    .select('line')
                    .attr('x1', pathDet)
                    .attr('y1', -6)
                    .attr('x2', pathDet)
                    .attr('y2', 0)
                    .style({
                        'stroke':lineColor,
                        'stroke-width':lineWidth
                    });

                arrowG
                    .select('path')
                    .attr("d", "M2,-2 L6,-10 L10,-2 L6,-6 L2,-2")
                    .attr('transform', 'translate(-6,0)')
                    .style('fill', lineColor);

            }
        },

        _drawAxisTitle:function(titleBounds){
            this.axis.isHorizontal() ? this._drawHorizontalTitle(titleBounds)
                : this._drawVerticalTitle(titleBounds);
        },

        _drawHorizontalTitle:function(titleBounds){
            var cfg = this.axis.componentOption;

            if(cfg.title){

                var title = cfg.title;
                var rotation = title.rotation || 0;

                var textDim = BaseUtils.getTextDimension(title.text, title.style, title.useHtml);

                var x, textAnchor, rx;
                var align = title.align || 'left';
                switch(align){
                    case 'left':
                        x = 0;
                        rx = x + textDim.width/2;
                        textAnchor = 'start';
                        break;
                    case 'center':
                        x = titleBounds.width/2;
                        rx = x;
                        textAnchor = 'middle';
                        break;
                    case 'right':
                        x = titleBounds.width;
                        rx = x - textDim.width/2;
                        textAnchor = 'end';
                        break;
                }

                var gap = this.axis.getTitleLabelGap();
                var ry = titleBounds.height/2;
                var y = textDim.height * 0.85 + (this.axis.getPosition() == Constants.BOTTOM ? gap : -gap);

                this._axisTitleG.select('text').remove();

                this._axisTitleG
                    .append('text')
                    .attr('x', x)
                    .attr('y', y)
                    .text(title.text)
                    .style('text-anchor', textAnchor)
                    .attr('transform', 'rotate(' + rotation + ' ' + rx + ',' + ry + ')')
                    .call(BaseUtils.setTextStyle, title.style);
            }
        },

        _drawVerticalTitle:function(titleBounds){

            var cfg = this.axis.componentOption;

            if(cfg.title){

                var title = cfg.title;
                var rotation = title.rotation || 0;

                var textDim = BaseUtils.getTextDimension(title.text, title.style, title.useHtml);
                var rotatedDim = BaseUtils.getTextDimensionWithRotation(title.text, title.style, title.useHtml, rotation);

                var x = titleBounds.width / 2;
                var rx = x;

                var align = title.align || 'top';
                var y, ry;
                switch(align){
                    case 'top':
                        y = textDim.height + rotatedDim.height/2;
                        break;
                    case 'center':
                        y = textDim.height + (titleBounds.height - textDim.height)/2;
                        break;
                    case 'bottom':
                        y = titleBounds.height - rotatedDim.height/2;
                        break;
                }

                ry = y;

                this._axisTitleG
                    .append('text')
                    .attr('x', x)
                    .attr('y', y)
                    .text(title.text)
                    .style('text-anchor', 'middle')
                    .attr('transform', 'rotate(' + rotation + ' ' + rx + ',' + ry + ')')
                    .call(BaseUtils.setTextStyle, title.style);
            }
        },

        remove:function(){
            this._axisG.remove();
            this._axisTitleG.remove();
        }

    };


    BaseUtils.inherit(BaseAxisSvgRender, BaseRender);
    return BaseAxisSvgRender;
});
/**
 * Created by eason on 15/9/25.
 */

define('render/CategoryAxisSvgRender',['require','./BaseAxisSvgRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseAxisRender = require('./BaseAxisSvgRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function CategoryAxisSvgRender(categoryAxis){
        BaseAxisRender.call(this, categoryAxis);
        this.categoryAxis = categoryAxis;
    }


    BaseUtils.inherit(CategoryAxisSvgRender, BaseAxisRender);
    require('./RenderLibrary').register(Constants.CATEGORY_AXIS_SVG, CategoryAxisSvgRender);

});
/**
 * Created by eason on 15/9/25.
 */

define('render/ValueAxisSvgRender',['require','./BaseAxisSvgRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseAxisRender = require('./BaseAxisSvgRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function ValueAxisSvgRender(valueAxis){
        BaseAxisRender.call(this, valueAxis);
        this.valueAxis = valueAxis;
    }

    BaseUtils.inherit(ValueAxisSvgRender, BaseAxisRender);
    require('./RenderLibrary').register(Constants.VALUE_AXIS_SVG, ValueAxisSvgRender);

});
/**
 * Created by eason on 15/11/2.
 */
define('render/DateAxisSvgRender',['require','./BaseAxisSvgRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseAxisRender = require('./BaseAxisSvgRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function DateAxisSvgRender(dateAxis){
        BaseAxisRender.call(this, dateAxis);
        this.dateAxis = dateAxis;
    }

    BaseUtils.inherit(DateAxisSvgRender, BaseAxisRender);
    require('./RenderLibrary').register(Constants.DATE_AXIS_SVG, DateAxisSvgRender);

});
/**
 * Created by eason on 15/8/14.
 */
define('render/LegendSvgRender',['require','./BaseRender','../utils/BaseUtils','../utils/BezierEasing','../Constants','./LegendIconFactory','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var BezierEasing = require('../utils/BezierEasing');
    var Constants = require('../Constants');
    var LegendIconFactory = require('./LegendIconFactory');

    var LEGEND_ITEM = 'legend-item';
    var LEGEND_MARKER = 'legend-marker';
    var LEGEND_LABEL = 'legend-label';

    var LEGEND_GRADUAL = 'legend-gradual-background';
    var LEGEND_PAGES = 'legend-pages';

    var ENABLED_COLOR = 'rgb(67,67,72)';
    var DISABLED_COLOR = 'rgb(204,204,204)';

    function LegendSvgRender(legend){
        this.legend = legend;
    }

    LegendSvgRender.prototype = {

        constructor:LegendSvgRender,

        render:function(){
            
            var svgRoot = this.legend.getVanchartRender().getRenderRoot();
            var bounds = this.legend.bounds;

            this._legendG = this._legendG ||  svgRoot.append('g');

            this._legendG.attr('transform', 'translate('+ bounds.x +','+ bounds.y +')');

            this._updateBackground();

            this.legend.isHorizontal() ? this._updateHorizontal() : this._updateVertical();
        },

        _updateBackground:function(){

            var option = this.legend.componentOption;
            var bounds = this.legend.bounds;
            var IDPrefix = this.legend.vanchart.getIDPrefix();
            var gradualID = LEGEND_GRADUAL + IDPrefix;

            this._renderSvgBackground(this._legendG, option, bounds, gradualID);
        },

        _renderVerticalWithPages:function(verticalG){

            var width = this.legend.bounds.width;
            var height = this.legend.bounds.height;

            height -= this.legend.getButtonHeight();

            var clipID = this.legend.vanchart.getIDPrefix() + LEGEND_PAGES;

            var defs = verticalG.selectAll('defs').data([0]);
            defs.enter().append('defs');
            var clip = defs.selectAll('#' + clipID).data([0]);
            clip.enter().append('clipPath').attr('id', clipID).append('rect');
            clip.select('rect').attr('width', width).attr('height', height);

            var clippedG = verticalG.selectAll('g.clip').data([0]);
            clippedG.enter().append('g').attr('class', 'clip');
            clippedG = verticalG.select('g.clip').attr('clip-path', "url(#" + clipID +")");

            var pageG = clippedG.selectAll('g.pageG').data([0]);
            pageG.enter().append('g').attr('class', 'pageG');
            pageG = clippedG.select('g.pageG');

            this._renderVerticalWithoutPages(pageG);

            var buttonWidth = 40;

            var buttonG = verticalG.selectAll('g.button').data([0]);
            buttonG.enter().append('g').attr('class', 'button');
            buttonG = verticalG.select('g.button').attr('transform', 'translate(' + 0 + ',' + height + ')');

            var leftButtonTopX = (width - buttonWidth) / 2;
            var rightButtonTopX = (width + buttonWidth) / 2;

            var translateDet = height - this.legend.getPadding();

            var totalHeight = this.legend.getPreHeight();

            this.pageIndex = BaseUtils.pick(this.pageIndex, 0);
            var pageCount = Math.ceil((totalHeight - height) / translateDet) + 1;

            var labelX = width/2;

            var text = buttonG.selectAll('text').data([0]);
            text.enter().append('text');

            text
                .attr('x', labelX)
                .attr('y', 0)
                .attr('dy', '.71em')
                .attr("text-anchor", "middle")
                .text((this.pageIndex + 1) + '/' + pageCount)
                .style('font-Family', 'Verdana')
                .style('font-Size', '14px');

            var self = this;
            var leftButton = buttonG.selectAll('path.left').data([0]);

            leftButton.enter()
                .append('path').attr('class', 'left')
                .attr('d', this._prePageButtonPath(leftButtonTopX))
                .style('cursor', 'pointer')
                .style('fill', DISABLED_COLOR)
                .on('click', function(){

                    if(self.pageIndex <= 0){
                        return;
                    }

                    var translate = d3.transform(pageG.attr('transform')).translate;

                    var translateX = translate[0];
                    var translateY = self.pageIndex == 1 ? 0 : (translate[1] + translateDet);

                    pageG
                        .transition()
                        .duration(500)
                        .ease(BezierEasing.css.swing)
                        .attr('transform', 'translate(' + translateX + ',' + translateY + ')');

                    self.pageIndex--;
                    var showIndex = self.pageIndex + 1;
                    text.text(showIndex + "/" + pageCount);

                    rightButton.style('fill', self.pageIndex == pageCount - 1 ? DISABLED_COLOR : ENABLED_COLOR);
                    d3.select(this).style('fill', self.pageIndex <= 0 ? DISABLED_COLOR : ENABLED_COLOR);
                });


            var rightButton = buttonG.selectAll('path.right').data([0]);
            rightButton.enter()
                .append('path')
                .attr('class', 'right')
                .attr('d', this._nextPageButtonPath(rightButtonTopX))
                .style('cursor', 'pointer')
                .style('fill', ENABLED_COLOR)
                .on('click', function(){

                    if(self.pageIndex == pageCount - 1){
                        return;
                    }

                    var translate = d3.transform(pageG.attr('transform')).translate;

                    var translateX = translate[0];
                    var translateY = translate[1] - translateDet;

                    pageG
                        .transition()
                        .duration(800)
                        .ease(BezierEasing.css.swing)
                        .attr('transform', 'translate(' + translateX + ',' + translateY + ')');

                    self.pageIndex++;
                    var showIndex = self.pageIndex + 1;
                    text.text(showIndex + "/" + pageCount);

                    d3.select(this).style('fill', self.pageIndex == pageCount - 1 ? DISABLED_COLOR : ENABLED_COLOR);
                    leftButton.style('fill', self.pageIndex <= 0 ? DISABLED_COLOR : ENABLED_COLOR)
                });
        },

        _prePageButtonPath:function(topX){
            var edge = 12;
            var topY = 0;

            var leftBottomX = topX - edge / 2;
            var leftBottomY = (edge / 2) * Math.sqrt(3);

            var rightBottomX = topX + edge / 2;
            var rightBottomY = leftBottomY;

            return 'M' + topX + ',' + topY + 'L' + leftBottomX + ',' + leftBottomY + 'L' + rightBottomX + ',' + rightBottomY + 'Z';
        },

        _nextPageButtonPath:function(topX){
            var edge = 12;
            var topY = 0;

            var topLeftX = topX - edge/2;
            var topLeftY = topY;

            var topRightX = topX + edge/2;
            var topRightY = topY;

            var bottomX = topX;
            var bottomY = (edge / 2) * Math.sqrt(3);

            return 'M' + topLeftX + ',' + topLeftY + 'L' + topRightX + ',' + topRightY + 'L' + bottomX + ',' + bottomY + 'Z';
        },

        _renderVerticalWithoutPages:function(gElement){
            var items = this.legend.getLegendItems();
            var self = this;
            var legend = this.legend;
            var cfg = this.legend.componentOption;

            var PADDING = this.legend.getPadding() + this.legend.verticalAlign;
            var GAP = this.legend.getGap();

            var updateS = gElement.selectAll('g.' + LEGEND_ITEM).data(items);

            updateS.exit().remove();

            updateS
                .enter()
                .append('g')
                .attr('class', LEGEND_ITEM)
                .each(function(){

                    var rowSelection = d3.select(this);

                    rowSelection.append('path').attr('class', LEGEND_MARKER);

                    rowSelection.append('text').attr('class', LEGEND_LABEL);

                    rowSelection.call(self._bindMouseEvent.bind(self));
                });

            gElement
                .selectAll('g.' + LEGEND_ITEM)
                .each(function(d, i){

                    var rowSelection = d3.select(this);

                    var iconSize = LegendIconFactory.getLegendIconSize(d.legendIconType);
                    var labelDim = BaseUtils.getTextDimension(d.itemName, cfg.style, true);
                    var detY = Math.max(iconSize.height, labelDim.height)/2;

                    var preHeight = legend.getPreHeight(i);

                    var markerG = rowSelection
                        .select('path.' + LEGEND_MARKER);

                    markerG
                        .attr('transform', 'translate(' + PADDING + ',' + (preHeight + detY - iconSize.height/2) + ')')
                        .attr('d', function(){
                            return LegendIconFactory.getLegendIconPath(d.legendIconType);
                        })
                        .style('fill', function(d){
                            return d.visible ? d.color : d.hiddenColor
                        });

                    if(d.series.type == Constants.BUBBLE_CHART){
                        markerG
                            .style('fill-opacity', 0.7)
                            .style('stroke', function(d){
                                return d.visible ? d.color : d.hiddenColor
                            })
                            .style('stroke-width',1);
                    }

                    rowSelection
                        .select('text.' + LEGEND_LABEL)
                        .text(function(d){return d.itemName})
                        .attr('x', PADDING + iconSize.width + GAP)
                        .attr('y', preHeight + detY)
                        .attr("dy", ".35em")
                        .call(BaseUtils.setTextStyle, cfg.style)
                        .style('fill', function(d){
                            return d.visible ? cfg.style.color : d.hiddenColor;
                        });

                })
        },

        _updateVertical:function(){

            var verticalG = this._legendG.selectAll('g.vertical').data([0]);
            verticalG.enter().append('g').attr('class', 'vertical');
            verticalG = this._legendG.select('g.vertical');

            var lastState = BaseUtils.pick(this.hasEnoughSpace, this.legend.hasEnoughVerticalSpace());

            var currentState = this.legend.hasEnoughVerticalSpace();

            if(currentState != lastState){
                verticalG.remove();
                verticalG = this._legendG.append('g').attr('class', 'vertical');
                this.hasEnoughSpace = currentState;
            }

            this.legend.hasEnoughVerticalSpace() ? this._renderVerticalWithoutPages(verticalG) : this._renderVerticalWithPages(verticalG);
        },

        _updateHorizontal:function(){

            var PADDING = this.legend.getPadding();
            var HORIZONTAL_GAP = this.legend.getHorizontalGap();
            var GAP = this.legend.getGap();

            var lineItems = this.legend.getHorizontalLineItems();
            var lineHeight = this.legend.getLineHeight();
            var lineStartX = [];
            var lineStartY = [];

            var cfg = this.legend.componentOption;
            var boundsWidth = this.legend.bounds.width;
            var y = PADDING;
            for(var lineIndex = 0, len = lineItems.length; lineIndex < len; lineIndex++){

                var items = lineItems[lineIndex];

                var itemsWidth = this.legend.getHorizontalItemsWidth(items);

                var x = Math.round((boundsWidth - itemsWidth) / 2);
                var startX = [x];

                for(var i = 1; i < items.length; i++){
                    var preItem = items[i - 1];
                    var iconSize = LegendIconFactory.getLegendIconSize(preItem.legendIconType);
                    var labelDim = BaseUtils.getTextDimension(preItem.itemName, cfg.style, true);
                    x += iconSize.width + GAP + labelDim.width + HORIZONTAL_GAP;
                    startX.push(x);
                }

                lineStartX.push(startX);
                lineStartY.push(y);

                y += lineHeight[lineIndex] + PADDING
            }

            function indexInLine(d, j){
                var preCount = 0;
                for(var i = 0; i < d.lineIndex; i++){
                    preCount += lineItems[i].length;
                }
                return j - preCount;
            }

            var self = this;
            var items = this.legend.getLegendItems();

            var itemS = this._legendG.selectAll('g.' + LEGEND_ITEM).data(items);
            itemS.exit().remove();

            var newItems = itemS.enter();
            newItems
                .append('g')
                .attr('class', LEGEND_ITEM)
                .each(function(){
                    var newItem = d3.select(this);
                    newItem.append('path').attr('class', LEGEND_MARKER);
                    newItem.append('text').attr('class', LEGEND_LABEL);
                    newItem.call(self._bindMouseEvent.bind(self));
                });

            itemS.each(function(d, i){

                var rowSelection = d3.select(this);

                var iconSize = LegendIconFactory.getLegendIconSize(d.legendIconType);
                var labelDim = BaseUtils.getTextDimension(d.itemName, cfg.style, true);

                var detY = Math.max(iconSize.height, labelDim.height)/2;

                i = indexInLine(d, i);
                var x = lineStartX[d.lineIndex][i];
                var y = lineStartY[d.lineIndex];

                var textColor = d.visible ? cfg.style.color : d.hiddenColor;
                var markerColor = d.visible ? d.color : d.hiddenColor;

                var markerG = rowSelection.select('path');

                markerG
                    .attr('transform', 'translate(' + x + ',' + (y + detY - iconSize.height/2) + ')')
                    .attr('d', function(){
                        return LegendIconFactory.getLegendIconPath(d.legendIconType);
                    })
                    .style('fill', markerColor);

                if(d.series.type == Constants.BUBBLE_CHART){
                    markerG
                        .style('fill-opacity', 0.3)
                        .style('stroke', markerColor)
                        .style('stroke-width',1);
                }

                rowSelection.select('text')
                    .text(function(d){return d.itemName})
                    .attr('x', x + iconSize.width + GAP)
                    .attr('y', y + detY)
                    .attr("dy", ".35em")
                    .call(BaseUtils.setTextStyle, cfg.style)
                    .style('fill', textColor);


            });
        },

        _bindMouseEvent:function(rowSelection){

            var vanchart = this.legend.vanchart;
            var cfg = this.legend.componentOption;

            rowSelection
                .style('cursor', 'pointer')
                .on('mouseenter', function(d){
                    d3.select(this).select('.' + LEGEND_LABEL).style('fill', d.hoverColor);
                })
                .on('mouseleave', function(d){
                    var textColor = d.visible ? cfg.style.color : d.hiddenColor;
                    d3.select(this).select('.' + LEGEND_LABEL).style('fill', textColor);
                })
                .on('click', function(d){
                    var series = d.series;
                    var name = d.itemName;

                    if(series.type == Constants.PIE_CHART){
                        vanchart.series.forEach(function(sery){

                            if(sery.type == Constants.PIE_CHART){

                                sery.points.forEach(function(point){
                                    if(point.seriesName == name){
                                        point.visible = !point.visible;
                                    }
                                });

                                sery.updateVisiblePoints();
                            }
                        });
                    }else{
                        series.visible = !series.visible;
                    }

                    vanchart.currentOption.byClassName = true;
                    vanchart.refreshComponentsAndSeries();
                });
        }
    };

    BaseUtils.inherit(LegendSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.LEGEND_SVG, LegendSvgRender);

    return LegendSvgRender;
});
/**
 * Created by eason on 15/8/24.
 */


define('render/ToolbarSvgRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function ToolbarSvgRender(toolbar){
        this.toolbar = toolbar;
    }

    ToolbarSvgRender.prototype = {

        constructor:ToolbarSvgRender,

        render:function(){
            var cfg = this.toolbar.componentOption;

            if(!cfg.enabled || this._bodyG){
                return;
            }

            var svgRoot = this.toolbar.getVanchartRender().getRenderRoot();

            var pos = this.toolbar.getToolbarPos();

            if(!this._bodyG){
                this._bodyG = svgRoot.append('g')
                    .attr('transform', 'translate('+ pos.x +','+ pos.y +')');
            }

            if(this.toolbar.menuIcon){
                this.toolbar.menuIcon.render(this._bodyG);
            }

            this.toolbar.refreshIcon.render(this._bodyG);

            var toolbarIcons = this.toolbar.getToolbarIcons();

            for(var i = 0, len = toolbarIcons.length; i < len; i++){
                toolbarIcons[i].render(this._bodyG);
            }
        },

        hide:function(){

            var toolbarIcons = this.toolbar.getToolbarIcons();

            var iconSize = toolbarIcons.length;

            var delay = [];

            for(var i = 0; i < iconSize; i++){
                delay.push(100 + 80 * i);
            }

            for(var i = 0; i < iconSize; i++){
                var moveIndex = iconSize - i;
                toolbarIcons[i].hideIcon(moveIndex, delay[i]);
            }

            var refreshIcon = this.toolbar.getRefreshIcon();

            var left = 4 * (iconSize + 1) ;
            var right = 4 * (iconSize + 1) + 33 * iconSize;

            if(refreshIcon.visible){
                refreshIcon.refreshMove(left, right);
            }

        },

        show:function(){
            var delay = [0];

            var toolbarIcons = this.toolbar.getToolbarIcons();

            var iconSize = toolbarIcons.length;

            for(var i = 0; i < iconSize - 1; i++){
                delay.push(100 + 80 * i);
            }

            for(var i = 0; i < iconSize; i++){
                var moveIndex = iconSize - i;
                toolbarIcons[i].showIcon(moveIndex, delay[i]);
            }

            var refreshIcon = this.toolbar.getRefreshIcon();

            var left = 4 * (iconSize + 1) + 33 * iconSize;
            var right = 4 * (iconSize + 1);

            if(refreshIcon.visible){
                refreshIcon.refreshMove(left, right);
            }

        }
    };


    BaseUtils.inherit(ToolbarSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.TOOLBAR_SVG, ToolbarSvgRender);

    return ToolbarSvgRender;
});
/**
 * Created by eason on 15/10/12.
 */

define('render/DataSheetSvgRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./LegendIconFactory','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var LegendIconFactory = require('./LegendIconFactory');

    function DataSheetSvgRender(dataSheet){
        BaseRender.call(this, dataSheet);
        this.dataSheet = dataSheet;
    }

    DataSheetSvgRender.prototype = {
        constructor:DataSheetSvgRender,

        render:function(){

            var svgRoot = this.dataSheet.getVanchartRender().getRenderRoot();

            if(this._tableG){
                this._tableG.remove();
            }

            var axis = this.dataSheet.vanchart.xAxis();
            var categories = axis.getCategories();
            var unitLength = this.dataSheet.getPlotBounds().width / categories.length;

            var seriesWidth = this.dataSheet.getMaxSeriesWidth();
            var categoryHeight = this.dataSheet.getCategoryHeight();

            var transX = this.dataSheet.bounds.x;
            var transY = this.dataSheet.bounds.y;

            this._tableG = svgRoot
                .append('g')
                .attr('transform', 'translate(' + transX + ',' + transY + ')');

            this._drawLines(seriesWidth, categoryHeight, unitLength);

            this._drawCategory(seriesWidth, categoryHeight, unitLength);

            this._drawSeries(seriesWidth, categoryHeight);

            this._drawValues(seriesWidth, categoryHeight, unitLength);
        },

        _drawLines:function(seriesWidth, categoryHeight, unitLength){

            var lineG = this._tableG.append('g');
            var cfg = this.dataSheet.componentOption;

            var endX = this.dataSheet.bounds.width;
            var endY = this.dataSheet.bounds.height;

            lineG.append('path')
                .attr('d', 'M' + seriesWidth + ',0' + 'L' + endX + ',0' + 'L' + endX + ' ' + endY + 'L0' + ',' + endY + 'L0' + ',' + categoryHeight)
                .style({
                    fill:'none',
                    stroke:cfg.borderColor,
                    'stroke-width':cfg.borderWidth
                });

            var cateCount = this.dataSheet.categoryNames.length;

            var startX = seriesWidth;

            for(var i = 0; i < cateCount; i++){
                lineG.append('line')
                    .attr('x1', startX)
                    .attr('y1', 0)
                    .attr('x2', startX)
                    .attr('y2', endY);

                startX += unitLength;
            }

            var seriesCount = this.dataSheet.seriesNames.length;
            var height = categoryHeight;

            for(var i = 0; i < seriesCount; i++){

                lineG.append('line')
                    .attr('x1', 0)
                    .attr('y1', height)
                    .attr('x2', endX)
                    .attr('y2', height);

                height += this.dataSheet.getSeriesHeight(i);
            }

            lineG.selectAll('line')
                .style({
                    fill:'none',
                    stroke:cfg.borderColor,
                    'stroke-width':cfg.borderWidth
                });

        },

        _drawValues:function(seriesWidth, categoryHeight, unitLength){

            var valueG = this._tableG.append('g');

            var values = this.dataSheet.values;

            var valueStyle = this.dataSheet._valueStyle();
            var valueLineHeight = BaseUtils.getTextHeight(valueStyle);
            var textPadding = this.dataSheet.getTextPadding();
            var startX = seriesWidth;
            var startY = categoryHeight;

            for(var lineIndex = 0; lineIndex < values.length; lineIndex++){
                var singleLine = values[lineIndex];

                var valueHeight = this.dataSheet.getSeriesHeight(lineIndex);

                for(var valueIndex = 0; valueIndex < singleLine.length; valueIndex++){

                    var singleName = singleLine[valueIndex];

                    var firstY = startY + this._getStartY(singleName, valueStyle, valueHeight) + valueLineHeight * 0.85;

                    for(var i = 0; i < singleName.length; i++){

                        valueG
                            .append('text')
                            .text(singleName[i])
                            .attr('x', startX + unitLength/2 + unitLength * valueIndex)
                            .attr('y', firstY + (valueLineHeight + textPadding) * i)

                    }
                }

                startY += valueHeight;
            }

            valueG.selectAll('text')
                .style({
                    'text-anchor':'middle'
                })
                .call(BaseUtils.setTextStyle, valueStyle);

        },

        _drawCategory:function(seriesWidth, categoryHeight, unitLength){

            var categoryG = this._tableG.append('g');

            var categoryNames = this.dataSheet.categoryNames;

            var startX = seriesWidth;

            var categoryStyle = this.dataSheet._categoryStyle();

            var categoryLineHeight = BaseUtils.getTextHeight(categoryStyle);
            var textPadding = this.dataSheet.getTextPadding();

            for(var index = 0, cCount = categoryNames.length; index < cCount; index++){

                var singleName = categoryNames[index];

                var startY = this._getStartY(singleName, categoryStyle, categoryHeight) + categoryLineHeight * 0.85;

                for(var i = 0; i < singleName.length; i++){

                    categoryG
                        .append('text')
                        .text(singleName[i])
                        .attr('x', startX + unitLength/2 + unitLength * index)
                        .attr('y', startY + (categoryLineHeight + textPadding) * i)

                }

            }

            categoryG.selectAll('text')
                .style({
                    'text-anchor':'middle'
                })
                .call(BaseUtils.setTextStyle, categoryStyle);

        },

        _drawSeries:function(seriesWidth, categoryHeight){

            var seriesG = this._tableG.append('g');

            var seriesNames = this.dataSheet.seriesNames;

            var startX = 16 + (seriesWidth - 16) / 2;
            var startY = categoryHeight;

            var seriesStyle = this.dataSheet._seriesStyle();
            var seriesLineHeight = BaseUtils.getTextHeight(seriesStyle);
            var textPadding = this.dataSheet.getTextPadding();

            for(var index = 0, sCount = seriesNames.length; index < sCount; index++){

                var singleName = seriesNames[index];
                var seriesHeight = this.dataSheet.getSeriesHeight(index);

                var firstY = startY + this._getStartY(singleName, seriesStyle, seriesHeight) + seriesLineHeight * 0.85;

                for(var i = 0; i < singleName.length; i++){

                    seriesG
                        .append('text')
                        .text(singleName[i])
                        .attr('x', startX)
                        .attr('y', firstY + (seriesLineHeight + textPadding) * i)

                }

                //画前面的色块
                var iconType = this.dataSheet._getLegendType(index);
                var iconHeight = LegendIconFactory.getLegendIconSize(iconType).height;
                seriesG
                    .append('path')
                    .attr('d', LegendIconFactory.getLegendIconPath(iconType))
                    .attr('transform', 'translate(2,' + ((seriesHeight - iconHeight)/2 + startY) + ')')
                    .style('fill', this.dataSheet._getDefaultSeriesColor(index));

                startY += seriesHeight;
            }

            seriesG.selectAll('text')
                .style({
                    'text-anchor':'middle'
                })
                .call(BaseUtils.setTextStyle, seriesStyle);

        },

        _getStartY:function(textArray, style, boxHeight){

            var textPadding = this.dataSheet.getTextPadding();

            var textCount = textArray.length;

            var textHeight = BaseUtils.getTextHeight(style) * textCount + (textCount - 1) * textPadding;

            return (boxHeight - textHeight) / 2;
        }
    };



    BaseUtils.inherit(DataSheetSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.DATA_SHEET_SVG, DataSheetSvgRender);

});
/**
 * Created by Mitisky on 16/3/21.
 */
define('render/RangeLegendSvgRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){
    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    var PADDING = 10;

    var WIDTH = 15;
    var HEIGHT = 100;
    var BAR_WIDTH = 15;
    var BAR_HEIGHT = 10;
    var BAR_TEXT_GAP = 5;
    var ITEM_WIDTH = 25;
    var ITEM_GAP = 2;

    var CLIP_ID = 'linear-color-clip-path-id';
    var MIN_BAR_CLASS_NAME = 'min-bar-class-name';
    var MAX_BAR_CLASS_NAME = 'max-bar-class-name';

    var RANGE_ITEM = 'range-item';

    function RangeLegendSvgRender(rangeLegend){
        BaseRender.call(this, rangeLegend);
        this.rangeLegend = rangeLegend;
    }

    RangeLegendSvgRender.prototype = {
        constructor:RangeLegendSvgRender,

        render:function() {

            var svgRoot = this.rangeLegend.getVanchartRender().getRenderRoot();
            var bounds = this.rangeLegend.bounds;

            this.isHorizontal = this.rangeLegend.isHorizontal();

            if(!this._legendG){
                this._legendG = svgRoot.append('g');
                this.minPos = 0;
                this.maxPos = HEIGHT;
            }

            if(!this.rangeLegend.vanchart.isZoomRefreshState()){
                this.minPos = 0;
                this.maxPos = HEIGHT;
            }

            this._legendG.attr('transform', 'translate('+ this._getIntPos(bounds.x) +','+ this._getIntPos(bounds.y) +')');

            this._updateBackground();

            this.rangeLegend.isIntervalLegend ? this._renderInterval() : this._renderGradient();
        },

        _updateBackground: function () {
            var option = this.rangeLegend.componentOption;
            var bounds = this.rangeLegend.bounds;
            var IDPrefix = this.rangeLegend.vanchart.getIDPrefix();
            var gradualID = 'range-legend-background' + IDPrefix;

            this._renderSvgBackground(this._legendG, option, bounds, gradualID);
        },

        _renderGradient:function() {
            var linearGradient = this._createDefs();
            var startPos = ((this.isHorizontal ? this.rangeLegend.bounds.width : this.rangeLegend.bounds.height)- HEIGHT)/2;

           var barBackgroundG = this._legendG.selectAll('rect.' + 'gradient-bar-background').data([0]);
            barBackgroundG.enter().append('rect').attr('class', 'gradient-bar-background');
            barBackgroundG
                .attr('rx', 2)
                .attr('ry', 2)
                .attr('x', this.isHorizontal ? startPos : PADDING)
                .attr('y', this.isHorizontal ? PADDING : startPos)
                .attr('width',this.isHorizontal ? HEIGHT : WIDTH)
                .attr('height',this.isHorizontal ? WIDTH : HEIGHT)
                .style('fill', '#eaeaea');

            var IDPrefix = this.rangeLegend.vanchart.getIDPrefix();
            var barGradientG = this._legendG.selectAll('rect.' + 'gradient-bar').data([0]);
            barGradientG.enter().append('rect').attr('class', 'gradient-bar');
            barGradientG
                .attr('clip-path', "url(#" + CLIP_ID + IDPrefix +")")
                .attr('rx', 2)
                .attr('ry', 2)
                .attr('x', this.isHorizontal ? startPos : PADDING)
                .attr('y', this.isHorizontal ? PADDING : startPos)
                .attr('width',this.isHorizontal ? HEIGHT : WIDTH)
                .attr('height',this.isHorizontal ? WIDTH : HEIGHT)
                .style('fill','url(#' + linearGradient.attr('id') + ')');

            var self = this;
            var minDrag = d3.behavior.drag()
                .on("dragstart", function() {
                    // silence other listeners
                    d3.event.sourceEvent.stopPropagation();
                })
                .on('drag', function () {
                    var change = 0;
                    if(self.isHorizontal){
                        var temp = self.minPos;
                        self.minPos += Math.round(d3.event.dx);
                        self.minPos = Math.max(self.minPos, 0);
                        self.minPos = Math.min(self.minPos, self.maxPos);
                        change = self.minPos - temp;
                    } else {
                        var temp = self.maxPos;
                        self.maxPos += Math.round(d3.event.dy);
                        self.maxPos = Math.min(self.maxPos, HEIGHT);
                        self.maxPos = Math.max(self.maxPos, self.minPos);
                        change = self.maxPos - temp;
                    }
                    if(Math.abs(change) >= 1) {
                        self._updateMinBar(startPos);
                        self.rangeLegend.refreshPoints(self.minPos, self.maxPos);
                    }
                });

            var maxDrag = d3.behavior.drag()
                .on("dragstart", function() {
                    // silence other listeners
                    d3.event.sourceEvent.stopPropagation();
                })
                .on('drag', function () {
                    var change = 0;
                    if(self.isHorizontal){
                        var temp = self.maxPos;
                        self.maxPos += Math.round(d3.event.dx);
                        self.maxPos = Math.min(self.maxPos, HEIGHT);
                        self.maxPos = Math.max(self.maxPos, self.minPos);
                        change = self.maxPos - temp;
                    } else {
                        var temp = self.minPos;
                        self.minPos += Math.round(d3.event.dy);
                        self.minPos = Math.max(self.minPos, 0);
                        self.minPos = Math.min(self.minPos, self.maxPos);
                        change = self.minPos - temp;
                    }
                    if(Math.abs(change) >= 1) {
                        self._updateMaxBar(startPos);
                        self.rangeLegend.refreshPoints(self.minPos, self.maxPos);
                    }
                });

            var minBarG = this._legendG.selectAll('path.' + MIN_BAR_CLASS_NAME).data([0]);
            minBarG.enter().append('path').attr('class', MIN_BAR_CLASS_NAME);
            minBarG
                .attr('d', this.isHorizontal ? this.rangeLegend.getLeftBarPath() : this.rangeLegend.getTopBarPath())
                .call(minDrag);

            var maxBarG = this._legendG.selectAll('path.' + MAX_BAR_CLASS_NAME).data([0]);
            maxBarG.enter().append('path').attr('class', MAX_BAR_CLASS_NAME);
            maxBarG
                .attr('d', this.isHorizontal ? this.rangeLegend.getRightBarPath() : this.rangeLegend.getBottomBarPath())
                .call(maxDrag);

            var labelStyle = this.rangeLegend.componentOption.style;
            if(!this._labelUseHtml()){
                var minLabelG = this._legendG.selectAll('text.' +  MIN_BAR_CLASS_NAME).data([0]);
                minLabelG.enter().append('text').attr('class', MIN_BAR_CLASS_NAME);
                minLabelG
                    .attr('dy', '.32em')
                    .call(BaseUtils.setTextStyle, labelStyle);

                var maxLabelG = this._legendG.selectAll('text.' + MAX_BAR_CLASS_NAME).data([0]);
                maxLabelG.enter().append('text').attr('class', MAX_BAR_CLASS_NAME);
                maxLabelG
                    .attr('dy', '.32em')
                    .call(BaseUtils.setTextStyle, labelStyle);
            }

            this._updateMinBar(startPos);
            this._updateMaxBar(startPos);
        },

        _createDefs:function() {
            if(!this._legendG.selectAll('defs').empty()){
                return this._legendG.selectAll('defs').select('linearGradient');
            }
            var defs = this._legendG.append('defs');

            var IDPrefix = this.rangeLegend.vanchart.getIDPrefix();

            defs.append('clipPath').attr('id', CLIP_ID + IDPrefix).append('rect');

            var linearGradient = defs.append('linearGradient')
                .attr('id','gradient-range-legend' + IDPrefix)
                .attr('x1','0%')
                .attr('y1',this.isHorizontal ? '0%' : '100%')
                .attr('x2',this.isHorizontal ? '100%' : '0%')
                .attr('y2','0%');

            var valueAndColorArray = this.rangeLegend.getValueAndColors();

            valueAndColorArray.forEach(function(valueAndColor){
                var value = valueAndColor[0];
                var color = valueAndColor[1];
                linearGradient.append('stop')
                    .attr('offset', value)
                    .style('stop-color', color);
            });

            return linearGradient;
        },

        _updateMinBar:function(startPos) {
            this.isHorizontal ? this._updateHorizontalMinBar(startPos)
                : this._updateVerticalMinBar(startPos);
        },

        _updateVerticalMinBar: function(startPos) {
            var x = PADDING + WIDTH;
            var y = startPos + this.maxPos;

            this._legendG.select('path.' + MIN_BAR_CLASS_NAME)
                .attr('transform', 'translate('+ x  +','+ y +')')
                .style('fill', this.rangeLegend.colorScale((HEIGHT - this.maxPos)/HEIGHT));

            var label = this.rangeLegend.getGradientLabelContent(this.maxPos);
            var labelStyle = this.rangeLegend.componentOption.style;
            var labelDim = BaseUtils.getTextDimension(label, labelStyle, true);

            if(this._labelUseHtml()){
                var labelY = this._getIntPos(startPos + this.maxPos + BAR_HEIGHT / 2 - labelDim.height/2);
                var labelBounds = this._getAbsoluteBounds(labelDim, PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP, labelY);
                this.labelDivManager.clearLabels(MIN_BAR_CLASS_NAME);
                this.labelDivManager.addLabelWidthBounds(label, labelBounds, labelStyle, MIN_BAR_CLASS_NAME);
            } else {
                this._legendG.select('text.' + MIN_BAR_CLASS_NAME)
                    .attr('text-anchor', 'middle')
                    .attr('x', this._getIntPos(PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP + labelDim.width / 2))
                    .attr('y', this._getIntPos(startPos + this.maxPos + BAR_HEIGHT / 2))
                    .text(label);
            }

            this._updateVerticalLinearColorClipPath(startPos);
        },

        _getAbsoluteBounds: function (labelDim, relativeX, relativeY) {
            return {
                x:this.rangeLegend.bounds.x + relativeX,
                y:this.rangeLegend.bounds.y + relativeY,
                width:labelDim.width,
                height:labelDim.height
            };
        },

        _getIntPos: function (pos) {
            return Math.round(pos);
        },

        _labelUseHtml: function () {
            return this.rangeLegend.componentOption.useHtml;
        },

        _updateHorizontalMinBar: function(startPos) {
            var x = startPos - BAR_HEIGHT + this.minPos;
            var y = PADDING + WIDTH;

            this._legendG.select('path.' + MIN_BAR_CLASS_NAME)
                .attr('transform', 'translate('+ x  +','+ y +')')
                .style('fill', this.rangeLegend.colorScale(this.minPos/HEIGHT));

            var label = this.rangeLegend.getGradientLabelContent(this.minPos);
            var labelStyle = this.rangeLegend.componentOption.style;
            var labelDim = BaseUtils.getTextDimension(label, labelStyle, true);

            if(this._labelUseHtml()){
                var labelBounds = this._getAbsoluteBounds(labelDim, this._getIntPos(startPos + this.minPos - labelDim.width), PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP);
                this.labelDivManager.clearLabels(MIN_BAR_CLASS_NAME);
                this.labelDivManager.addLabelWidthBounds(label, labelBounds, labelStyle, MIN_BAR_CLASS_NAME);
            } else {
                this._legendG.select('text.' + MIN_BAR_CLASS_NAME)
                    .attr('text-anchor', 'left')
                    .attr('y', this._getIntPos(PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP + labelDim.height/2))
                    .attr('x', this._getIntPos(startPos + this.minPos - labelDim.width))
                    .text(label);
            }

            this._updateHorizontalLinearColorClipPath(startPos);
        },

        _updateMaxBar: function (startPos) {
            this.isHorizontal ? this._updateHorizontalMaxBar(startPos)
                : this._updateVerticalMaxBar(startPos);
        },

        _updateVerticalMaxBar: function(startPos) {
            var x = PADDING + WIDTH;
            var y = startPos - BAR_HEIGHT + this.minPos;

            this._legendG.select('path.' + MAX_BAR_CLASS_NAME)
                .attr('transform', 'translate('+ x  +','+ y +')')
                .style('fill', this.rangeLegend.colorScale((HEIGHT - this.minPos)/HEIGHT));

            var label = this.rangeLegend.getGradientLabelContent(this.minPos);
            var labelStyle = this.rangeLegend.componentOption.style;
            var labelDim = BaseUtils.getTextDimension(label, labelStyle, true);

            if(this._labelUseHtml()){
                var labelY = this._getIntPos(startPos + this.minPos - BAR_HEIGHT/2 - labelDim.height/2);
                var labelBounds = this._getAbsoluteBounds(labelDim, PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP, labelY);
                this.labelDivManager.clearLabels(MAX_BAR_CLASS_NAME);
                this.labelDivManager.addLabelWidthBounds(label, labelBounds, labelStyle, MAX_BAR_CLASS_NAME);
            } else {
                this._legendG.select('text.' + MAX_BAR_CLASS_NAME)
                    .attr('text-anchor', 'middle')
                    .attr('x', this._getIntPos(PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP + labelDim.width/2))
                    .attr('y', this._getIntPos(startPos + this.minPos - BAR_HEIGHT/2))
                    .text(label);
            }

            this._updateVerticalLinearColorClipPath(startPos);
        },

        _updateHorizontalMaxBar: function(startPos) {
            var x = startPos + this.maxPos;
            var y = PADDING + WIDTH;

            this._legendG.select('path.' + MAX_BAR_CLASS_NAME)
                .attr('transform', 'translate('+ x  +','+ y +')')
                .style('fill', this.rangeLegend.colorScale(this.maxPos/HEIGHT));

            var label = this.rangeLegend.getGradientLabelContent(this.maxPos);
            var labelStyle = this.rangeLegend.componentOption.style;
            var labelDim = BaseUtils.getTextDimension(label, labelStyle, true);

            if(this._labelUseHtml()){
                var labelBounds = this._getAbsoluteBounds(labelDim, this._getIntPos(startPos + this.maxPos), PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP);
                this.labelDivManager.clearLabels(MAX_BAR_CLASS_NAME);
                this.labelDivManager.addLabelWidthBounds(label, labelBounds, labelStyle, MAX_BAR_CLASS_NAME);
            } else {
                this._legendG.select('text.' + MAX_BAR_CLASS_NAME)
                    .attr('text-anchor', 'left')
                    .attr('y', this._getIntPos(PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP + labelDim.height/2))
                    .attr('x', this._getIntPos(startPos + this.maxPos))
                    .text(label);
            }

            this._updateHorizontalLinearColorClipPath(startPos);
        },

        _updateVerticalLinearColorClipPath: function (startPos) {
            var IDPrefix = this.rangeLegend.vanchart.getIDPrefix();

            this._legendG.select('defs')
                .select('clipPath#' + CLIP_ID + IDPrefix)
                .select('rect')
                .attr('x', PADDING)
                .attr('y', startPos + this.minPos)
                .attr('width', WIDTH)
                .attr('height', this.maxPos - this.minPos);
        },

        _updateHorizontalLinearColorClipPath: function (startPos) {
            var IDPrefix = this.rangeLegend.vanchart.getIDPrefix();

            this._legendG.select('defs')
                .select('clipPath#' + CLIP_ID + IDPrefix)
                .select('rect')
                .attr('x', startPos + this.minPos)
                .attr('y', PADDING)
                .attr('width', this.maxPos - this.minPos)
                .attr('height', WIDTH);
        },

        _renderInterval:function() {
            if(this.rangeLegend.items.length <= 0){
                return;
            }

            var itemS = this._legendG.selectAll('g.' + RANGE_ITEM)
                .data(this.rangeLegend.items);

            var self = this;

            itemS.enter().append('g').attr('class', RANGE_ITEM)
                . each(function () {
                    var newItem = d3.select(this);
                    newItem.append('rect').attr('class', RANGE_ITEM);
                    if(!self._labelUseHtml()){
                        newItem.append('text').attr('class', RANGE_ITEM);
                    }
                    newItem.call(self._bindMouseEvent.bind(self));
                });

            this.isHorizontal ? this._updateHorizontalIntervalItems(itemS)
                : this._updateVerticalIntervalItems(itemS);
        },

        _updateVerticalIntervalItems: function (itemS) {
            var cfg = this.rangeLegend.componentOption;
            var labelStyle = cfg.style;

            var x = PADDING;
            var labelX = PADDING + WIDTH + BAR_TEXT_GAP;
            var startY = (this.rangeLegend.bounds.height - this.rangeLegend.items.length * ITEM_WIDTH - (this.rangeLegend.items.length - 1) * ITEM_GAP)/2;
            startY = this._getIntPos(startY);

            var self = this;
            itemS.each(function(d){
                var item = d3.select(this);

                var labelDim = BaseUtils.getTextDimension(d.label, labelStyle);

                item.select('rect')
                    .attr('rx', 2)
                    .attr('ry', 2)
                    .attr('x', x)
                    .attr('y', startY)
                    .attr('width', WIDTH)
                    .attr('height', ITEM_WIDTH)
                    .style('fill', d.visible ? d.color : d.hiddenColor);

                if(self._labelUseHtml()) {
                    var labelBounds = self._getAbsoluteBounds(labelDim, self._getIntPos(labelX),  self._getIntPos(startY + ITEM_WIDTH / 2 - labelDim.height/2));
                    self.labelDivManager.addLabelWidthBounds(d.label, labelBounds, labelStyle);
                } else {
                    item.select('text')
                        .text(function (d) {
                            return d.label
                        })
                        .attr('x', self._getIntPos(labelX + labelDim.width / 2))
                        .attr('y', self._getIntPos(startY + ITEM_WIDTH / 2))
                        .attr('dy', '.32em')
                        .attr('text-anchor', 'middle')
                        .call(BaseUtils.setTextStyle, labelStyle)
                        .style('fill', d.visible ? labelStyle.color : d.hiddenColor);
                }

                startY += (ITEM_WIDTH + ITEM_GAP);
            });
        },

        _updateHorizontalIntervalItems: function (itemS) {
            var cfg = this.rangeLegend.componentOption;
            var labelStyle = cfg.style;
            var startX = (this.rangeLegend.bounds.width - this.rangeLegend.items.length * ITEM_WIDTH - (this.rangeLegend.items.length - 1) * ITEM_GAP)/2;
            startX = this._getIntPos(startX);

            var self = this;
            itemS.each(function(d, i){
                var item = d3.select(this);

                var labelDim = BaseUtils.getTextDimension(d.label, labelStyle);
                var topLabelY = PADDING;
                var iconY = topLabelY + labelDim.height + BAR_TEXT_GAP;
                var bottomY = iconY + WIDTH + BAR_TEXT_GAP;

                item.select('rect')
                    .attr('rx', 2)
                    .attr('ry', 2)
                    .attr('x', startX)
                    .attr('y', iconY)
                    .attr('width', ITEM_WIDTH)
                    .attr('height', WIDTH)
                    .style('fill', d.visible ? d.color : d.hiddenColor);

                    if(self._labelUseHtml()) {
                        var labelY = self._getIntPos(i % 2 == 0 ? topLabelY : bottomY);
                        var labelBounds = self._getAbsoluteBounds(labelDim, self._getIntPos(startX), labelY);
                        self.labelDivManager.addLabelWidthBounds(d.label, labelBounds, labelStyle);
                    } else {
                        item.select('text')
                            .text(function (d) {
                                return d.label
                            })
                            .attr('x', self._getIntPos(startX + ITEM_WIDTH / 2))
                            .attr('y', self._getIntPos(i % 2 == 0 ? topLabelY + labelDim.height / 2 : bottomY + labelDim.height / 2))
                            .attr('dy', '.32em')
                            .attr('text-anchor', 'middle')
                            .call(BaseUtils.setTextStyle, labelStyle)
                            .style('fill', d.visible ? labelStyle.color : d.hiddenColor);
                    }

                startX += (ITEM_WIDTH + ITEM_GAP);
            });
        },

        _bindMouseEvent:function(rowSelection){
            var vanChart = this.rangeLegend.vanchart;
            var cfg = this.rangeLegend.componentOption;
            var labelColor = cfg.style.color;

            rowSelection
                .style('cursor', 'pointer')
                .on('mouseenter', function(d){
                    d3.select(this).select('text.' + RANGE_ITEM).style('fill', d.hoverColor);
                })
                .on('mouseleave', function(d){
                    var textColor = d.visible ? labelColor : d.hiddenColor;
                    d3.select(this).select('text.' + RANGE_ITEM).style('fill', textColor);
                })
                .on('click', function(d){
                    d.visible = !d.visible;
                    var iconColor = d.visible ? d.color : d.hiddenColor;
                    var textColor = d.visible ? labelColor : d.hiddenColor;
                    d3.select(this).select('rect.' + RANGE_ITEM).style('fill', iconColor);
                    d3.select(this).select('text.' + RANGE_ITEM).style('fill', textColor);

                    d.points.forEach(function (point) {
                        point.visible = d.visible;
                    });

                    vanChart.renderOnlyCharts();
                });
        }

    };

    BaseUtils.inherit(RangeLegendSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.RANGE_LEGEND_SVG, RangeLegendSvgRender);

    return RangeLegendSvgRender;
});

/**
 * Created by eason on 15/8/12.
 */
define('render/VanChartSvgRender',['require','../Constants','./BaseRender','../utils/BaseUtils','./RenderLibrary'],function(require){

    var Constants = require('../Constants');

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');

    var CHART_GRADUAL = 'chart-gradual-background';
    var PLOT_GRADUAL = 'plot-gradual-background';
    var TREND_LINE = 'trend-line';

    function VanChartSvgRender(vanchart){
        this.vanchart = vanchart;
    };

    VanChartSvgRender.prototype = {

        constructor:VanChartSvgRender,

        render:function(){
            var dom = this.vanchart.getParentDom();

            var width = this.vanchart.chartWidth();
            var height = this.vanchart.chartHeight();

            if(!this.svgRoot){
                this.svgRoot = d3.select(dom)
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height);

                var clipID = this.vanchart.getBodyClipID();

                this.svgRoot.append('defs').append('clipPath').attr('id', clipID);
            }

            this._updateBodyClip();

            var charts = this.vanchart.getChartRenders();

            var fixed = this.vanchart.getFixedComponentRenders();
            var float = this.vanchart.getFloatComponentRenders();

            this._renderBackground();

            fixed.forEach(function(render){
                render.render();
            });

            charts.forEach(function(render){
                render.render();
            });

            float.forEach(function(render){
                render.render();
            });

            this._renderTrendLine();
        },

        _updateBodyClip:function(){

            var clipBounds = this.vanchart.getPlotClipBounds();

            var clipPath = this.svgRoot.select('#' + this.vanchart.getBodyClipID());

            clipPath.select('rect').remove();

            clipPath
                .append('rect')
                .attr('x', clipBounds.x)
                .attr('y', clipBounds.y)
                .attr('width', clipBounds.width)
                .attr('height', clipBounds.height);
        },

        //图表区和绘图区的背景
        _renderBackground:function(){

            var IDPrefix = this.vanchart.getIDPrefix();

            var chartBounds = BaseUtils.makeBounds(0,0,this.vanchart.chartWidth() - 5, this.vanchart.chartHeight() - 5);
            var chartBackground = this.vanchart.getChartBackgroundOption();

            var plotBounds = this.vanchart.getPlotBounds();
            var plotBackground = this.vanchart.getPlotBackgroundOption();

            if(!this._backgroundG){
                this._backgroundG = this.svgRoot.append('g');
            }

            this._backgroundG.selectAll('.background').remove();
            this._backgroundG.selectAll('defs').remove();

            this._createGradualDefs(this._backgroundG, chartBackground.color, CHART_GRADUAL + IDPrefix);
            this._createGradualDefs(this._backgroundG, plotBackground.color, PLOT_GRADUAL + IDPrefix);

            this._renderBackgroundWithBounds(chartBackground, chartBounds, CHART_GRADUAL + IDPrefix);
            this._renderBackgroundWithBounds(plotBackground, plotBounds, PLOT_GRADUAL + IDPrefix);
        },

        _renderBackgroundWithBounds:function(option, bounds, ID){

            if(ID.indexOf(CHART_GRADUAL) != -1) {
                var bw = option.borderWidth;
                bounds = BaseUtils.rectSubPixelOpt(bounds.x + bw/2, bounds.y + bw/2, bounds.width - bw, bounds.height - bw, option.borderWidth);
            } else {
                bounds = BaseUtils.rectSubPixelOpt(bounds.x, bounds.y, bounds.width, bounds.height, option.borderWidth);
            }
            var dom = this.vanchart.getParentDom();
            //阴影
            if(option.chartShadow){
                d3.select(dom).style('box-shadow', '1px 1px 2px rgba(0,0,0,0.1)')
            }else if(option.plotShadow){
                var width = [5, 3, 1];
                var opacity = [0.05, 0.1, 0.15];

                var shadowBounds = BaseUtils.rectSubPixelOpt(bounds.x, bounds.y, bounds.width, bounds.height, 1);

                for(var i = 0; i < 3; i++){
                    this._backgroundG
                        .append('rect')
                        .attr('class', 'background')
                        .attr('x', shadowBounds.x)
                        .attr('y', shadowBounds.y)
                        .attr('width', shadowBounds.width)
                        .attr('height', shadowBounds.height)
                        .attr('transform', 'translate(1, 1)')
                        .attr('rx', option.borderRadius)
                        .attr('ry', option.borderRadius)
                        .style('fill', 'none')
                        .style('stroke', 'black')
                        .style('stroke-width', width[i])
                        .style('stroke-opacity', opacity[i]);
                }

                this._backgroundG
                    .append('rect')
                    .attr('class', 'background')
                    .attr('x', shadowBounds.x)
                    .attr('y', shadowBounds.y)
                    .attr('width', shadowBounds.width)
                    .attr('height', shadowBounds.height)
                    .attr('rx', option.borderRadius)
                    .attr('ry', option.borderRadius)
                    .style('fill', 'white');
            }

            this._backgroundG
                .append('rect')
                .attr('class', 'background')
                .attr('x', bounds.x)
                .attr('y', bounds.y)
                .attr('width', bounds.width)
                .attr('height', bounds.height)
                .attr('rx', option.borderRadius)
                .attr('ry', option.borderRadius)
                .style('fill', function(){
                    if(option.color){
                        return typeof option.color == 'string' ? option.color : "url(#" + ID + ")";
                    }
                    return 'none';
                })
                .style('stroke', option.borderColor)
                .style('stroke-width', option.borderWidth);

            if(option.image){
                this._backgroundG
                    .append('image')
                    .attr('class', 'background')
                    .attr('preserveAspectRatio', 'none')
                    .attr('x', bounds.x)
                    .attr('y', bounds.y)
                    .attr('width', bounds.width)
                    .attr('height', bounds.height)
                    .attr('xlink:href', option.image);
            }

        },

        _renderTrendLine:function(){

            var trendLines = this.vanchart.getTrendLineOption();
            var plotBounds = this.vanchart.getPlotBounds();
            var clipID = this.vanchart.getBodyClipID();

            if(!this._trendG){
                this._trendG = this.svgRoot
                    .append('g')
                    .attr('clip-path', "url(#" + clipID +")");
            }

            this._trendG
                .attr('transform', 'translate('+ plotBounds.x + ','+ plotBounds.y+')');

            var selection = this._trendG.selectAll('line').data(trendLines);

            selection.enter().append('line');
            selection.exit().remove();

            selection
                .attr('x1', function(d){return d.x1})
                .attr('y1', function(d){return d.y1})
                .attr('x2', function(d){return d.x2})
                .attr('y2', function(d){return d.y2})
                .style('stroke', function(d){
                    return d.trendLine.color;
                })
                .style('stroke-width', function(d){
                    return d.trendLine.width;
                })
                .style('stroke-dasharray', function(d){
                    return Constants.DASH_TYPE[d.trendLine.dashStyle];
                });
        },

        getRenderRoot:function(){
            return this.svgRoot;
        },

        remove:function(){
            this.svgRoot.remove();
            var charts = this.vanchart.getChartRenders();
            var components = this.vanchart.getComponentRenders();

            charts.forEach(function(render){
                render.removeDivLabels();
            });

            components.forEach(function(render){
                render.removeDivLabels();
            });
        }
    };

    BaseUtils.inherit(VanChartSvgRender, BaseRender);
    require('./RenderLibrary').register(Constants.VANCHART_SVG, VanChartSvgRender);

    return VanChartSvgRender;
});
/**
 * Created by eason on 16/2/5.
 */

define('ModernBrowserRequire',['require','./chart/Pie','./chart/Bar','./chart/Line','./chart/Area','./chart/Gauge','./chart/Radar','./chart/Bubble','./chart/Scatter','./render/PieSvgRender','./render/BarSvgRender','./render/LineSvgRender','./render/AreaSvgRender','./render/GaugeSvgRender','./render/RadarSvgRender','./render/BubbleSvgRender','./render/ScatterSvgRender','./render/TitleSvgRender','./render/CategoryAxisSvgRender','./render/ValueAxisSvgRender','./render/DateAxisSvgRender','./render/LegendSvgRender','./render/ToolbarSvgRender','./render/DataSheetSvgRender','./render/RangeLegendSvgRender','./VanCharts','./render/VanChartSvgRender'],function(require){

    require('./chart/Pie');
    require('./chart/Bar');
    require('./chart/Line');
    require('./chart/Area');
    require('./chart/Gauge');
    require('./chart/Radar');
    require('./chart/Bubble');
    require('./chart/Scatter');

    require('./render/PieSvgRender');
    require('./render/BarSvgRender');
    require('./render/LineSvgRender');
    require('./render/AreaSvgRender');
    require('./render/GaugeSvgRender');
    require('./render/RadarSvgRender');
    require('./render/BubbleSvgRender');
    require('./render/ScatterSvgRender');

    require('./render/TitleSvgRender');
    require('./render/CategoryAxisSvgRender');
    require('./render/ValueAxisSvgRender');
    require('./render/DateAxisSvgRender');
    require('./render/LegendSvgRender');
    require('./render/ToolbarSvgRender');
    require('./render/DataSheetSvgRender');
    require('./render/RangeLegendSvgRender');

    require('./VanCharts');
    require('./render/VanChartSvgRender');

});
/**
 * Created by eason on 15/12/31.
 */
define('render/RadarVmlRender',['require','./BaseRender','../utils/BaseUtils','../utils/ColorUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');

    var VALUE_TICK_GAP = 2;

    function RadarVmlRender(radar){
        BaseRender.call(this, radar);
        this.radar = radar;
    }

    RadarVmlRender.prototype = {

        constructor:RadarVmlRender,

        render:function(){

            this._removeAll();

            var paper = this.radar.getVanchartRender().getRenderRoot();

            var radarCenter = this.radar.getRadarCenter();

            this._bodySet = paper.set();

            this._axisSet = paper.set();

            this._lineSet = {};

            this.markerMap = {};

            this._drawRadarAxis(paper, radarCenter);

            this._drawRadarSeries(paper, radarCenter);

            this._drawDataLabels(paper, radarCenter);
        },

        _drawDataLabels:function(paper, radarCenter){
            var radarData = this.radar.getVisibleChartData();

            var labelSet = paper.set();

            this._axisSet.push(labelSet);

            for(var i = 0, count = radarData.length; i < count; i++){

                var points = radarData[i].points;

                this._drawVmlDataLabels(paper, labelSet, points, radarCenter[0], radarCenter[1]);
            }
        },

        _drawRadarSeries:function(paper, radarCenter){
            var radarData = this.radar.getVisibleChartData();

            for(var i = 0, count = radarData.length; i < count; i++){
                var seryData = radarData[i];
                var points = seryData.points;

                var seriesSet = paper.set();
                this._lineSet[seryData.seriesName] = seriesSet;
                this._bodySet.push(seriesSet);

                if(this.radar.isColumnType()){
                    for(var pIndex = 0, pCount = points.length; pIndex < pCount; pIndex++){
                        var d = points[pIndex];

                        var rect = paper.path(this.radar._getRadarColumnPath(d.y0, d.y, d.radian))
                            .attr({
                                fill: d.color,
                                'fill-opacity': d.fillColorOpacity,
                                stroke: d.borderColor,
                                'stroke-width': d.borderWidth
                            })
                            .transform(BaseUtils.makeTranslate(radarCenter));

                        rect.node._data_ = d;

                        this.markerMap[d.className] = rect;

                        this.addShapeEventHandler(rect);

                        seriesSet.push(rect);
                    }

                }else{

                    var line = paper.path(this.radar._getRadarSeriesStrokePath(seryData.pathSegment, seryData.connectNulls))
                        .attr({
                            fill: 'none',
                            stroke:seryData.lineColor,
                            'stroke-width':seryData.lineWidth
                        })
                        .transform(BaseUtils.makeTranslate(radarCenter));

                    line.node._data_ = seryData;
                    this.addSeriesEventHandler(line);

                    seriesSet.push(line);

                    var fill = paper.path(this.radar._getRadarSeriesFillPath(seryData.pathSegment, seryData.connectNulls))
                        .attr({
                            fill: seryData.fillColor,
                            'fill-opacity': seryData.fillColor ? seryData.fillColorOpacity : 0,
                            stroke:'none'
                        })
                        .transform(BaseUtils.makeTranslate(radarCenter));

                    fill.node._data_ = seryData;
                    this.addSeriesEventHandler(fill);

                    seriesSet.push(fill);

                    for(var pIndex = 0, pCount = points.length; pIndex < pCount; pIndex++){
                        var point = points[pIndex];
                        var pos = point.pos;

                        var marker = this._createVmlMarker(paper, point, [radarCenter[0] + pos[0], radarCenter[1] + pos[1]])

                        this.markerMap[point.className] = marker;

                        seriesSet.push( marker.marker );
                    }
                }
            }
        },

        _drawRadarAxis:function(paper, radarCenter){

            this._drawPlotBands(paper, radarCenter);

            this._drawPlotLines(paper, radarCenter);

            this._drawGridLine(paper, radarCenter);

            this._drawAxisLine(paper, radarCenter);

            this._drawTickLabel(paper, radarCenter);
        },

        _drawPlotBands:function(paper, radarCenter){
            var plotBands = this.radar.getRadarPlotBands();
            var axisSet = this._axisSet;
            plotBands.forEach(function(band){
                axisSet.push(
                    paper.path(band.path)
                        .attr({
                            'fill': band.color,
                            'stroke': 'none'
                        })
                        .transform(BaseUtils.makeTranslate(radarCenter))
                )
            });
        },

        _drawPlotLines:function(paper, radarCenter){
            var plotLines = this.radar.getRadarPlotLines();
            var self = this;

            plotLines.forEach(function(d){

                self._axisSet.push(

                    paper.path(self.radar._getGridPath(d.value))
                        .attr({
                            fill:'none',
                            stroke: d.color,
                            'stroke-width': d.width,
                            'stroke-dasharray': d.dataArray
                        })
                        .transform(BaseUtils.makeTranslate(radarCenter))

                );

                if(d.text){
                    var textStyle = BaseUtils.cssNormalization(d.style);
                    paper.text(0, d.baseY, d.text)
                        .attr(textStyle)
                        .attr('text-anchor', d.textAnchor)
                        .transform(BaseUtils.makeTranslate(radarCenter));
                }

            });
        },

        _drawGridLine:function(paper, radarCenter){
            var valueAxis = this.radar.getValueAxis();
            var cfg = valueAxis.componentOption;
            var ticks = valueAxis.getTickData();
            var gridLineColor = cfg.gridLineColor;
            var gridLineWidth = cfg.gridLineWidth;

            var self = this;

            ticks.forEach(function(d){

                self._axisSet.push(

                    paper.path(self.radar._getGridPath(d.tickValue))
                        .attr({
                            'fill':'none',
                            'stroke':gridLineColor,
                            'stroke-width':gridLineWidth
                        })
                        .transform(BaseUtils.makeTranslate(radarCenter))
                );

            });
        },

        _drawAxisLine:function(paper, radarCenter) {

            var valueAxis = this.radar.getValueAxis();
            var cfg = valueAxis.componentOption;
            var lineWidth = cfg.lineWidth;
            var lineColor = cfg.lineColor;
            var self = this;

            var axisLineData = this.radar.getAxisLineData();

            axisLineData.forEach(function (d) {

                self._axisSet.push(
                    paper.path(self._getLinePath([0, 0], d))
                        .attr({
                            'fill': 'none',
                            'stroke': lineColor,
                            'stroke-width': lineWidth
                        })
                        .transform(BaseUtils.makeTranslate(radarCenter))
                );

            });

            var baseAxis = this.radar.getBaseAxis();
            var categoryLineWidth = baseAxis.componentOption.lineWidth;
            var categoryLineColor = baseAxis.componentOption.lineColor;
            var maxValue = valueAxis.scale.domain()[1];

            this._axisSet.push(

                paper.path(this.radar._getGridPath(maxValue))
                    .attr({
                        'fill':'none',
                        'stroke':categoryLineColor,
                        'stroke-width':categoryLineWidth
                    })
                    .transform(BaseUtils.makeTranslate(radarCenter))

            );
        },

        _drawTickLabel:function(paper, radarCenter){

            this._drawValueTickLabel(paper, radarCenter);

            this._drawCategoryTickLabel(paper, radarCenter);
        },

        _drawValueTickLabel:function(paper, radarCenter){

            var valueAxis = this.radar.getValueAxis();
            var cfg = valueAxis.componentOption;
            var ticks = BaseUtils.clone(valueAxis.getTickData());

            //最大值标签不显示
            ticks.length = Math.max(ticks.length - 1, 0);

            var labelStyle = cfg.labelStyle;
            var labelRotation = cfg.labelRotation || 0;
            var useHtml = cfg.useHtml;
            var valueScale = this.radar.valueScale;

            if(useHtml && !labelRotation){

                for(var i = 0, len = ticks.length; i < len; i++){

                    var tick = ticks[i];

                    var x = -tick.tickDim.width - VALUE_TICK_GAP + radarCenter[0];
                    var y = -valueScale(tick.tickValue)-tick.tickDim.height + radarCenter[1];

                    this.labelDivManager.addLabel(tick.tickContent, {x:x, y:y}, labelStyle);
                }

            }else{

                for(var i = 0, count = ticks.length; i < count; i++){

                    var tick = ticks[i];

                    var normalDim = BaseUtils.getTextDimension(tick.tickContent, labelStyle, useHtml);

                    var x = radarCenter[0] - VALUE_TICK_GAP - normalDim.width/2;
                    var y = radarCenter[1] - valueScale(tick.tickValue) - normalDim.height/2;

                    this._axisSet.push(
                        paper.text(x, y, tick.tickContent)
                            .attr(BaseUtils.cssNormalization(labelStyle))
                            .transform('r' + labelRotation)
                    )
                }
            }

        },

        _drawCategoryTickLabel:function(paper, radarCenter){

            var baseAxis = this.radar.getBaseAxis();
            var cfg = baseAxis.componentOption;

            var labelStyle = cfg.labelStyle;
            var labelRotation = cfg.labelRotation || 0;
            var useHtml = cfg.useHtml;

            var ticks = this.radar.categoryLabel;
            var lineHeight = BaseUtils.getTextHeight(labelStyle);

            if(useHtml && !labelRotation){

                for(var i = 0, len = ticks.length; i < len; i++){

                    var tick = ticks[i];

                    var x = tick.tickPos.x + radarCenter[0];
                    var y = tick.tickPos.y + radarCenter[1];

                    this.labelDivManager.addLabel(tick.tickContent, {x:x, y:y}, labelStyle);
                }

            }else{

                for(var i = 0, count = ticks.length; i < count; i++){

                    var tick = ticks[i];
                    var tickContent = tick.tickContent;

                    if(BaseUtils.isArray(tickContent)){

                        var startX = radarCenter[0] + tick.tickPos.x;
                        var startY = radarCenter[1] + tick.tickPos.y + lineHeight/2;

                        var dx = tick.tickPos.x < 0 ? tick.tickDim.width : 0;
                        var textAnchor = tick.tickPos.x < 0 ? 'end' : 'start';
                        var x = dx + startX;

                        for(var j = 0, len = tickContent.length; j < len; j++){

                            var y = startY + j * (1.3 * lineHeight);
                            var t_content = tickContent[j];

                            this._axisSet.push(
                                paper.text(x, y, t_content)
                                    .attr(BaseUtils.cssNormalization(labelStyle))
                                    .attr('text-anchor', textAnchor)
                                    .transform('t' + labelRotation)
                            );
                        }

                    }else{

                        var rx = radarCenter[0] + tick.tickPos.x + tick.tickDim.width/2;

                        var ry = radarCenter[1] + tick.tickPos.y + tick.tickDim.height/2;

                        this._axisSet.push(
                            paper.text(rx, ry, tickContent)
                                .attr(BaseUtils.cssNormalization(labelStyle))
                                .transform('r' + labelRotation)
                        );

                    }

                }



            }

        },

        getElementByData:function(d){
            return this.markerMap[d.className];
        },

        cancelChosenState:function(d){

            if(d.columnType){

                var element = this.getElementByData(d);

                element.attr({

                    'stroke':d.borderColor,

                    'fill':  d.color,

                    'stroke-width': d.borderWidth
                });
            }else{
                this._cancelVmlMarkerChosenState(d);
            }

        },

        makeChosenState:function(d){

            if(d.columnType){

                var element = this.getElementByData(d);

                element.attr({
                    'stroke':ColorUtils.mixColorWithAlpha(d.mouseOverColor, 0.35),
                    'fill':  d.mouseOverColor ? d.mouseOverColor : d.color,
                    'stroke-width':6
                });

            }else{
                this._makeVmlMarkerChosenState(d);
            }

        },

        _removeAll:function(){

            if(this._bodySet){

                if(this.radar.getVisibleChartData().length){
                    this._bodySet.remove();
                    this._axisSet.remove();
                }else{
                    this._bodySet.remove();
                }

                this.labelDivManager.clearAllLabels();
            }
        }
    }

    BaseUtils.inherit(RadarVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.RADAR_VML, RadarVmlRender);

});
/**
 * Created by eason on 15/12/2.
 */
define('render/GaugeVmlRender',['require','../utils/BaseUtils','../Constants','./BaseRender','../utils/ColorUtils','./RenderLibrary'],function(require){

    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var BaseRender = require('./BaseRender');
    var ColorUtils = require('../utils/ColorUtils');

    var THERMOMETER_R = 5;

    function GaugeVmlRender(gauge){
        BaseRender.call(this, gauge);
        this.gauge = gauge;
    }


    GaugeVmlRender.prototype = {
        constructor:GaugeVmlRender,

        render:function(){

            this._removeAll();

            var paper = this.gauge.getVanchartRender().getRenderRoot();
            var plotBounds = this.gauge.getPlotBounds();
            var plotX = plotBounds.x;
            var plotY = plotBounds.y;

            this._bodySet = paper.set();

            var gaugeData = this.gauge.getVisibleChartData();

            for(var i = 0, len = gaugeData.length; i < len; i++){
                var gaugeSet = paper.set();
                var d = gaugeData[i];
                var style = d.style;

                switch (style){
                    case Constants.GAUGE_POINTER:
                        this._createPointer(paper, gaugeSet, d);
                        break;

                    case Constants.GAUGE_POINTER_SEMI:
                        this._createPointerSemi(paper, gaugeSet, d);
                        break;

                    case Constants.GAUGE_SLOT:
                        this._createSlot(paper, gaugeSet, d);
                        break;

                    case Constants.GAUGE_THERMOMETER:
                        this._createThermometer(paper, gaugeSet, d);
                        break;

                    case Constants.GAUGE_RING:
                        this._createRing(paper, gaugeSet, d);
                        break;
                }

                gaugeSet.transform('t' + (d.centerX + plotX) + ',' + (d.centerY + plotY));

                this._bodySet.push(gaugeSet);
            }

            this.gauge.vanchart.hoverSeries = gaugeData[0];
        },

        _createPointer:function(paper, gaugeSet, d){
            var arc = d3.svg.arc().startAngle(0).endAngle(2 * Math.PI)
                .innerRadius(0).outerRadius(d.radius);

            var domain = d.yAxis.scale.domain();
            var scale = d3.scale.linear().domain(domain)
                .range([BaseUtils.toRadian(-150), BaseUtils.toRadian(150)]);

            //底盘
            gaugeSet.push(
                paper.path(arc()).attr({
                    fill:d.paneBackgroundColor,
                    'fill-opacity':ColorUtils.getColorOpacity(d.paneBackgroundColor),
                    stroke:'none'
                })
            );

            //枢纽背景
            arc.outerRadius(0.16 * d.radius);
            gaugeSet.push(
                paper.path(arc()).attr({
                    fill:d.hingeBackgroundColor,
                    'fill-opacity':ColorUtils.getColorOpacity(d.hingeBackgroundColor),
                    stroke:'none'
                })
            );

            this._drawGaugeLabels(paper, gaugeSet, d);

            this._drawPointerTicks(paper, gaugeSet, d, scale);
            //
            this._drawPointerArrow(paper, gaugeSet, d, scale);

            //枢纽
            arc.outerRadius(0.07 * d.radius);
            gaugeSet.push(
                paper.path(arc()).attr({
                    fill: d.hinge,
                    'fill-opacity':ColorUtils.getColorOpacity(d.hinge),
                    stroke:'none'
                })
            );
        },

        _createPointerSemi:function(paper, gaugeSet, d){

            var circle = d3.svg.arc().startAngle(0).endAngle(2 * Math.PI).innerRadius(0);

            var arc = d3.svg.arc().startAngle(BaseUtils.toRadian(-98))
                .endAngle(BaseUtils.toRadian(98))
                .innerRadius(0).outerRadius(d.radius).toCenter(false);

            var domain = d.yAxis.scale.domain();
            var scale = d3.scale.linear().domain(domain)
                .range([BaseUtils.toRadian(-90), BaseUtils.toRadian(90)]);

            //底盘
            gaugeSet.push(
                paper.path(arc()).attr({
                    fill:d.paneBackgroundColor,
                    'fill-opacity':ColorUtils.getColorOpacity(d.paneBackgroundColor),
                    stroke:'none'
                })
            );

            //枢纽背景
            circle.outerRadius(0.11 * d.radius);
            gaugeSet.push(
                paper.path(circle()).attr({
                    fill:d.hingeBackgroundColor,
                    'fill-opacity':ColorUtils.getColorOpacity(d.hingeBackgroundColor),
                    stroke:'none'
                })
            );

            this._drawGaugeLabels(paper, gaugeSet, d);

            this._drawPointerTicks(paper, gaugeSet, d, scale);
            //
            this._drawPointerArrow(paper, gaugeSet, d, scale);

            //枢纽
            circle.outerRadius(0.055 * d.radius);
            gaugeSet.push(
                paper.path(circle()).attr({
                    fill: d.hinge,
                    'fill-opacity':ColorUtils.getColorOpacity(d.hinge),
                    stroke:'none'
                })
            );
        },

        _drawGaugeLabels:function(paper, gaugeSet, d){

            if(d.seriesLabelContent){
                this._drawLabel(paper, gaugeSet, d.seriesLabelContent, d.seriesLabelPos, d.seriesLabelStyle,
                                                                        d.seriesLabelDim, d, d.seriesLabel.useHtml);
            }

            if(d.percentageLabelContent){
                this._drawLabel(paper, gaugeSet, d.percentageLabelContent, d.percentageLabelPos, d.percentageLabelStyle,
                                                                d.percentageLabelDim, d, d.percentageLabel.useHtml);
            }

            if(d.valueLabelContent){

                //指针类型的仪表盘值标签后面有背景
                if(d.valueLabelBackground){

                    var opt = d.valueLabelBackground;

                    gaugeSet.push(
                        paper.rect(opt.x, opt.y, opt.width, opt.height)
                            .attr({
                                fill:d.valueLabel.backgroundColor,
                                'fill-opacity':ColorUtils.getColorOpacity(d.valueLabel.backgroundColor),
                                stroke:'none'
                            })
                    );

                }

                for(var i = 0, len = d.valueLabelContent.length; i < len; i++){
                    var valueLabel = d.valueLabelContent[i];
                    this._drawLabel(paper, gaugeSet, valueLabel.labelContent, valueLabel.labelPos, valueLabel.labelStyle,
                                                                            valueLabel.labelDim, d, d.valueLabel.useHtml);
                }

            }
        },

        _drawLabel:function(paper, gaugeSet, labelContent, labelPos, labelStyle, labelDim, gauge, useHtml){

            //ie678有自体大小不一致的问题,暂时统一用div
            var plotBounds = this.gauge.getPlotBounds();
            var centerX = gauge.centerX;
            var centerY = gauge.centerY;

            labelPos = {
                x:labelPos.x + centerX + plotBounds.x,
                y:labelPos.y + centerY + plotBounds.y
            };

            this.labelDivManager.addLabel(labelContent, labelPos, labelStyle);
        },

        _drawPointerArrow:function(paper, gaugeSet, d, scale){
            var self = this;

            d.points.forEach(function(point) {

                var endRadian = scale(point.valueInDomain);

                var p0 = self._getArcPoint(0.9 * d.radius, endRadian);

                var p1 = self._getArcPoint(0.02 * d.radius, endRadian + Math.PI / 2);

                var p2 = self._getArcPoint(0.02 * d.radius, endRadian - Math.PI / 2);

                var pointer = paper.path('M' + self._dealWithFloat(p0[0]) + ',' + self._dealWithFloat(p0[1])
                                        + 'L' + self._dealWithFloat(p1[0]) + ',' + self._dealWithFloat(p1[1])
                                        + 'L' + self._dealWithFloat(p2[0]) + ',' + self._dealWithFloat(p2[1]) + 'Z');

                pointer.attr({
                    fill: d.needle,
                    'fill-opacity':ColorUtils.getColorOpacity(d.needle),
                    stroke:'none'
                });

                pointer.node._data_ = point;
                self.addShapeEventHandler(pointer);

                gaugeSet.push(pointer);
            });

        },

        _drawPointerTicks:function(paper, gaugeSet, d, scale){

            var tickData = d.yAxis.getTickData();

            var axisOption = d.yAxis.componentOption;
            var labelStyle = axisOption.labelStyle;
            var useHtml = axisOption.useHtml;

            var minorTickData = d.yAxis.getMinorTickData();

            var self = this;

            var tickR = (1 - 0.05) * d.radius;

            var bands = d.bands;
            var plotBounds = this.gauge.getPlotBounds();
            var transX = plotBounds.x + d.centerX;
            var transY = plotBounds.y + d.centerY;
            tickData.forEach(function(tick){

                var radian = scale(tick.tickValue);
                var start = self._getArcPoint(tickR, radian);
                var end = self._getArcPoint(tickR - 0.1 * d.radius, radian);

                var color = self.gauge._getColorFromBands(tick.tickValue, bands);

                gaugeSet.push(
                    paper.path(self._getLinePath(start, end)).attr({
                        stroke:color
                    })
                );

                var labelR = (1 - 0.05 - 0.1 - 0.01) * d.radius;
                var tickDim = tick.tickDim;

                var angle = Math.atan(tickDim.width / tickDim.height);
                var joinPoint = self._getArcPoint(labelR, radian);
                var x = joinPoint[0];
                var y = joinPoint[1];

                var labelCenterX, labelCenterY;
                if(Math.abs(radian) < angle){

                    var gap = tickDim.height/2;
                    labelCenterX = x + gap * x / y;
                    labelCenterY = y + gap;

                }else if(radian >= angle && radian <= (Math.PI - angle)){//右

                    var gap = tickDim.width/2;
                    labelCenterX = x - gap;
                    labelCenterY = y - gap * y / x;

                }else if(radian >= angle - Math.PI && radian <= -angle){//左

                    var gap = tickDim.width/2;
                    labelCenterX = x + gap;
                    labelCenterY = y + gap * y / x;

                }else{
                    //下
                    var gap = tickDim.height/2;
                    labelCenterX = x - gap * x / y;
                    labelCenterY = y - gap;
                }

                if(useHtml){
                    var labelPos = {
                        x:transX + labelCenterX - tick.tickDim.width/2,
                        y:transY + labelCenterY - tick.tickDim.height/2
                    };
                    self.labelDivManager.addLabel(tick.tickContent, labelPos, labelStyle);
                }else{
                    gaugeSet.push(
                        paper.text(labelCenterX, labelCenterY, tick.tickContent)
                            .attr(BaseUtils.cssNormalization(labelStyle))
                    );
                }

            });

            minorTickData.forEach(function(value){

                var radian = scale(value);
                var start = self._getArcPoint(tickR, radian);
                var end = self._getArcPoint(tickR - 0.05 * d.radius, radian);

                var color = self.gauge._getColorFromBands(value, bands);

                gaugeSet.push(
                    paper.path(self._getLinePath(start, end)).attr({
                        stroke:color
                    })
                );

            });
        },

        _getArcPoint:function(r, radian){
            return [r * Math.sin(radian), -r * Math.cos(radian)]
        },

        _createSlot:function(paper, gaugeSet, d){

            var arc = d3.svg.arc().startAngle(BaseUtils.toRadian(-135))
                .endAngle(BaseUtils.toRadian(135))
                .innerRadius(0).outerRadius(d.radius)
                .toCenter(false).closePath(false);

            var circle = d3.svg.arc().startAngle(BaseUtils.toRadian(-135))
                .endAngle(BaseUtils.toRadian(135))
                .innerRadius(0).outerRadius(d.radius)
                .toCenter(false).closePath(false);

            gaugeSet.push(
                paper.path(circle()).attr({
                    'fill':'none',
                    'stroke': d.slotBackgroundColor,
                    'stroke-linecap':'round',
                    'stroke-width': d.radius * 0.16
                })
            );

            var domain = d.yAxis.scale.domain();
            var startRadian = BaseUtils.toRadian(-135);
            var scale = d3.scale.linear().domain(domain).range([startRadian, BaseUtils.toRadian(135)]);
            var point = d.points[0];
            if(!point){
                return;
            }

            var valueInDomain = point.valueInDomain;
            var endRadian = scale(valueInDomain);
            var endStroke = point.color;
            var cP = this._getArcPoint(d.radius, endRadian);

            if(Math.abs(endRadian - startRadian) < 1e-6){
                gaugeSet.push(
                    paper.circle(cP[0], cP[1], 0.08 * d.radius)
                        .attr({
                            fill: endStroke,
                            stroke: 'none'
                        })
                );
            }else{
                gaugeSet.push(

                    paper.path(arc.endAngle(endRadian)())
                        .attr({
                            'fill':'none',
                            'stroke': endStroke,
                            'stroke-linecap':'round',
                            'stroke-width': d.radius * 0.16
                        })

                )
            }

            gaugeSet.push(
                paper.circle(cP[0], cP[1], 0.048 * d.radius)
                    .attr({
                        fill: d.needle,
                        'fill-opacity':ColorUtils.getColorOpacity(d.needle),
                        stroke: 'none'
                    })
            );

            this._drawGaugeLabels(paper, gaugeSet, d);
        },

        _createThermometer:function(paper, gaugeSet, d){
            d.thermometerLayout == Constants.HORIZONTAL_LAYOUT
                ? this._createHorizontalThermometer(paper, gaugeSet, d) : this._createVerticalThermometer(paper, gaugeSet, d);

        },

        _createHorizontalThermometer:function(paper, gaugeSet, d){

            var domain = d.yAxis.scale.domain();
            var point = d.points[0];
            if(!point){
                return;
            }

            var valueInDomain = point.valueInDomain;
            var color = point.color;

            var radius = d.radius;
            var scale = d3.scale.linear()
                .domain(domain).range([-radius, radius]);

            gaugeSet.push(
                paper.path(this._getLinePath([-radius,0], [radius,0]))
                    .attr({
                        'fill':'none',
                        'stroke': d.slotBackgroundColor,
                        'stroke-width':THERMOMETER_R * 2,
                        'stroke-linecap':'round'
                    })
            );

            gaugeSet.push(
                paper.path(this._getLinePath([-radius,0], [scale(valueInDomain),0]))
                    .attr({
                        'fill':'none',
                        'stroke': color,
                        'stroke-width':THERMOMETER_R * 2,
                        'stroke-linecap':'round'
                    })
            );

            gaugeSet.push(
                paper.circle(scale(valueInDomain), 0, THERMOMETER_R * 0.9)
                    .attr({
                        'fill': d.needle,
                        'fill-opacity':ColorUtils.getColorOpacity(d.needle),
                        'stroke-width': THERMOMETER_R * 0.6,
                        'stroke':ColorUtils.mixColorWithHSB(color, 0, 0.1, -0.1)
                    })

            );

            this._drawGaugeLabels(paper, gaugeSet, d);

            this._drawHorizontalThermometerTicks(paper, gaugeSet, d, scale);
        },

        _drawHorizontalThermometerTicks:function(paper, gaugeSet, d, scale){
            var tickData = d.yAxis.getTickData();

            var axisOption = d.yAxis.componentOption;
            var labelStyle = axisOption.labelStyle;
            var useHtml = axisOption.useHtml;

            var minorTickData = d.yAxis.getMinorTickData();

            var plotBounds = this.gauge.getPlotBounds();
            var transX = plotBounds.x + d.centerX;
            var transY = plotBounds.y + d.centerY;
            var self = this;

            tickData.forEach(function(tick){

                var x = scale(tick.tickValue);

                gaugeSet.push(
                    paper.path(self._getLinePath([x,-9],[x,-15]))
                        .attr({
                            stroke:axisOption.tickColor,
                            'stroke-width':1
                        })
                );

                if(useHtml){

                    var labelPos = {
                        x:transX + x - tick.tickDim.width/2,
                        y:transY -19 - tick.tickDim.height
                    };

                    self.labelDivManager.addLabel(tick.tickContent, labelPos, labelStyle);

                }else{
                    gaugeSet.push(
                        paper.text(x, -19 - tick.tickDim.height/2, tick.tickContent)
                            .attr(BaseUtils.cssNormalization(labelStyle))

                    );
                }



            });

            minorTickData.forEach(function(value){

                var x = scale(value);

                gaugeSet.push(
                    paper.path(self._getLinePath([x,-9],[x,-13]))
                        .attr({
                            stroke:axisOption.minorTickColor,
                            'stroke-width':1
                        })
                );

            });

        },

        _createVerticalThermometer:function(paper, gaugeSet, d){

            var domain = d.yAxis.scale.domain();
            var point = d.points[0];
            if(!point){
                return;
            }

            var color = point.color;
            var valueInDomain = point.valueInDomain;
            var radius = d.radius;
            var scale = d3.scale.linear()
                .domain(domain).range([radius, -radius]);

            gaugeSet.push(
                paper.path(this._getLinePath([0,radius], [0,-radius]))
                    .attr({
                        'fill':'none',
                        'stroke': d.slotBackgroundColor,
                        'stroke-width':THERMOMETER_R * 2,
                        'stroke-linecap':'round'
                    })
            );


            gaugeSet.push(
                paper.path(this._getLinePath([0,radius], [0, scale(valueInDomain)]))
                    .attr({
                        'fill':'none',
                        'stroke': color,
                        'stroke-width':THERMOMETER_R * 2,
                        'stroke-linecap':'round'
                    })
            );

            gaugeSet.push(
                paper.circle(0, scale(valueInDomain), THERMOMETER_R * 0.9)
                    .attr({
                        'fill': d.needle,
                        'fill-opacity':ColorUtils.getColorOpacity(d.needle),
                        'stroke-width': THERMOMETER_R * 0.6,
                        'stroke':ColorUtils.mixColorWithHSB(color, 0, 0.1, -0.1)
                    })

            );

            this._drawGaugeLabels(paper, gaugeSet, d);

            this._drawVerticalThermometerTicks(paper, gaugeSet, d, scale);
        },

        _drawVerticalThermometerTicks:function(paper, gaugeSet, d, scale){

            var tickData = d.yAxis.getTickData();

            var axisOption = d.yAxis.componentOption;
            var labelStyle = axisOption.labelStyle;
            var useHtml = axisOption.useHtml;

            var minorTickData = d.yAxis.getMinorTickData();

            var plotBounds = this.gauge.getPlotBounds();
            var transX = plotBounds.x + d.centerX;
            var transY = plotBounds.y + d.centerY;
            var self = this;

            tickData.forEach(function(tick){

                var y = scale(tick.tickValue);

                gaugeSet.push(
                    paper.path(self._getLinePath([9,y],[15,y]))
                        .attr({
                            stroke:axisOption.tickColor,
                            'stroke-width':1
                        })
                );

                if(useHtml){

                    var labelPos = {
                        x:transX + 19,
                        y:transY + y - tick.tickDim.height/2
                    };

                    self.labelDivManager.addLabel(tick.tickContent, labelPos, labelStyle);

                }else{
                    gaugeSet.push(
                        paper.text(19, y, tick.tickContent)
                            .attr(BaseUtils.cssNormalization(labelStyle))
                            .attr('text-anchor', 'start')

                    );
                }

            });

            minorTickData.forEach(function(value){

                var y = scale(value);

                gaugeSet.push(
                    paper.path(self._getLinePath([9,y],[13,y]))
                        .attr({
                            stroke:axisOption.minorTickColor,
                            'stroke-width':1
                        })
                );

            });
        },

        _createRing:function(paper, gaugeSet, d){
            var circle = d3.svg.arc()
                .startAngle(0).endAngle(2 * Math.PI)
                .innerRadius(0).outerRadius(d.radius);

            var arc = d3.svg.arc().startAngle(0)
                .innerRadius(0).outerRadius(d.radius);

            var point = d.points[0];
            if(!point){
                return;
            }

            var arcPercentage = Math.max(point.percentage, 0);
            var endRadian = 2 * Math.PI * arcPercentage * (d.clockwise ? 1 : -1);
            var endFill = point.color;
            var innerR = d.radius * 0.8;
            var outerStrokeR = innerR + 2;

            gaugeSet.push(
                paper.path(circle())
                    .attr({
                        fill:d.paneBackgroundColor,
                        'fill-opacity':ColorUtils.getColorOpacity(d.paneBackgroundColor),
                        stroke:'none'
                    })
            );


            gaugeSet.push(
                paper.path(arc.endAngle(endRadian)())
                    .attr({
                        fill:endFill,
                        'fill-opacity':ColorUtils.getColorOpacity(endFill),
                        stroke:'none'
                    })
            );

            gaugeSet.push(
                paper.path(circle.outerRadius(innerR)())
                    .attr({
                        fill:d.innerPaneBackgroundColor,
                        'fill-opacity':ColorUtils.getColorOpacity(d.innerPaneBackgroundColor),
                        stroke:'none'
                    })
            );

            gaugeSet.push(
                paper.path(circle.outerRadius(outerStrokeR))
                    .attr({
                        'fill': 'none',
                        'stroke':'#000000',
                        'stroke-opacity':0.05,
                        'stroke-width':4
                    })
            );

            this._drawGaugeLabels(paper, gaugeSet, d);
        },

        _removeAll:function(){
            if(this._bodySet){
                this._bodySet.remove();
            }
            this.labelDivManager.clearAllLabels();
        }
    };

    BaseUtils.inherit(GaugeVmlRender, BaseRender);

    require('./RenderLibrary').register(Constants.GAUGE_VML, GaugeVmlRender);
});
/**
 * Created by eason on 15/11/6.
 */
define('render/LineVmlRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function LineVmlRender(line){
        BaseRender.call(this, line);
        this.line = line;
    }

    LineVmlRender.prototype = {
        constructor:LineVmlRender,

        render:function(){

            this._removeAll();

            var paper = this.line.getVanchartRender().getRenderRoot();
            var plotBounds = this.line.getPlotBounds();
            var transX = plotBounds.x;
            var transY = plotBounds.y;

            this._bodySet = paper.set();

            this._lineSet = paper.set();
            this._markerSet = paper.set();
            this._labelSet = paper.set();

            this._bodySet.push(this._lineSet);
            this._bodySet.push(this._markerSet);
            this._bodySet.push(this._labelSet);

            this.markerMap = {};

            var lines = this.line.getVisibleChartData();
            var self = this;
            lines.forEach(function(line){

                var dataBands = line.dataBands;

                var needsClipRect = dataBands.length > 1;

                //先画堆积的面积图,不用移动到最上层
                dataBands.forEach(function(band){
                    var lineData = band.lineData;

                    if(self.line.type == Constants.AREA_CHART && lineData.isStack){
                        var area = paper.path(lineData.areaSvg(lineData.points))
                            .attr({
                                'fill':band.fillColor,
                                'fill-opacity':band.fillColorOpacity,
                                'stroke':'none'
                            });

                        area.node._data_ = lineData;
                        self.addSeriesEventHandler(area);

                        if(needsClipRect){
                            area.attr('clip-rect', self._getClipRect(band));
                        }

                        self._lineSet.push(area);
                    }
                });
            });

            lines.forEach(function(line){

                var dataBands = line.dataBands;

                var needsClipRect = dataBands.length > 1;

                dataBands.forEach(function(band){

                    var lineData = band.lineData;

                    if(self.line.type == Constants.AREA_CHART && !lineData.isStack){

                        var area = paper.path(lineData.areaSvg(lineData.points))
                            .attr({
                                'fill':band.fillColor,
                                'fill-opacity':band.fillColorOpacity,
                                'stroke':'none'
                            });

                        area.node._data_ = lineData;
                        self.addSeriesEventHandler(area);

                        if(needsClipRect){
                            area.attr('clip-rect', self._getClipRect(band));
                        }

                        self._lineSet.push(area);

                    }

                    var singleLine = paper
                        .path(lineData.lineSvg(lineData.points))
                        .attr({
                            'fill':'none',
                            'stroke':band.color,
                            'stroke-width':lineData.lineWidth,
                            'clip-rect':self._getClipRect(band)
                        });

                    singleLine.node._data_ = lineData;
                    self.addSeriesEventHandler(singleLine);

                    if(needsClipRect){
                        singleLine.attr('clip-rect', self._getClipRect(band));
                    }

                    self._lineSet.push(singleLine);
                });

            });

            lines.forEach(function(line){
                line.points.forEach(function(point){

                    var x = point.x + transX;
                    var y = point.y + transY;

                    var marker = self._createVmlMarker(paper, point, [x,y]);

                    self.markerMap[point.className] = marker;

                    if(marker.marker){
                        self._markerSet.push(marker.marker);
                    }

                    if(marker.strokeMarker){
                        self._markerSet.push(marker.strokeMarker);
                    }
                });
            });

            this._drawDataLabels(paper);

            this._lineSet.transform('t' + plotBounds.x + ',' + plotBounds.y);
        },

        _getClipRect:function(band){

            var plotBounds = this.line.getPlotBounds();

            return (band.x + plotBounds.x) + ',' + (band.y + plotBounds.y) + ',' + band.width + ',' + band.height;
        },

        getElementByData:function(d){

            if(this.markerMap && this.markerMap[d.className]){
                return this.markerMap[d.className];
            }

        },

        makeChosenState:function(d){
            if(d){
                this._makeVmlMarkerChosenState(d);
            }
        },

        cancelChosenState:function(d){

            if(d){
                this._cancelVmlMarkerChosenState(d);
            }

        },

        _drawDataLabels:function(paper){

            var lines = this.line.getVisibleChartData();
            var plotBounds = this.line.getPlotBounds();
            var labelSet = this._labelSet;
            var self = this;

            lines.forEach(function(line){

                var points = line.points;

                self._drawVmlDataLabels(paper, labelSet, points, plotBounds.x, plotBounds.y);
            });
        },

        _removeAll:function(){
            if(this._bodySet){
                this._bodySet.remove();
            }
            this.labelDivManager.clearAllLabels();
        }

    };


    BaseUtils.inherit(LineVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.LINE_VML, LineVmlRender);

    return LineVmlRender;

});
/**
 * Created by eason on 15/11/6.
 */

define('render/AreaVmlRender',['require','../utils/BaseUtils','../Constants','./LineVmlRender','./RenderLibrary'],function(require){

    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var LineVmlRender = require('./LineVmlRender');

    function AreaVmlRender(area){
        LineVmlRender.call(this, area);
        this.area = area;
    }


    AreaVmlRender.prototype = {
        constructor:AreaVmlRender
    };

    BaseUtils.inherit(AreaVmlRender, LineVmlRender);

    require('./RenderLibrary').register(Constants.AREA_VML, AreaVmlRender);
});
/**
 * Created by eason on 15/9/24.
 */
define('render/BarVmlRender',['require','./BaseRender','../utils/BaseUtils','../utils/ColorUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');

    function BarVmlRender(bar){
        BaseRender.call(this, bar);
        this.bar = bar;
    }

    BarVmlRender.prototype = {
        constructor:BarVmlRender,

        render:function(){

            this._removeAll();

            var paper = this.bar.getVanchartRender().getRenderRoot();
            var plotBounds = this.bar.getPlotBounds();

            this._bodySet = paper.set();
            var barSet = paper.set();
            this._bodySet.push(barSet);

            this.shapeMap = {};

            var clipRect = this._getPlotClipRect();

            var series = this.bar.getVisibleChartData();

            for(var i = 0, count = series.length; i < count; i++){
                var points = series[i].points;

                for(var j = 0, len = points.length; j < len; j++){
                    barSet.push(
                        this._createBar(points[j], paper, clipRect)
                    )
                }
            }

            barSet.transform('t' + plotBounds.x + ',' + plotBounds.y);

            this._drawDataLabels(paper);
        },

        _createBar:function(d, paper, clipRect){

            var rect = paper.rect(d.x, d.y, d.width, d.height)
                .attr({
                    rx: d.borderRadius,
                    ry: d.borderRadius,
                    fill:d.color,
                    'fill-opacity':ColorUtils.getColorOpacity(d.color),
                    stroke:d.borderColor,
                    'stroke-width':d.borderWidth
                });

            rect.node._data_ = d;

            this.addShapeEventHandler(rect);

            this.shapeMap[d.className] = rect;

            return rect;
        },

        _getPlotClipRect:function(){

            var clipBounds = this.bar.vanchart.getPlotClipBounds();
            var plotBounds = this.bar.getPlotBounds();

            var x = plotBounds.x + clipBounds.x;
            var y = plotBounds.y + clipBounds.y;
            var width = clipBounds.width;
            var height = clipBounds.height;

            return x + ',' + y + ',' + width + ',' + height;
        },

        _drawDataLabels:function(paper){

            var series = this.bar.getVisibleChartData();
            var plotBounds = this.bar.getPlotBounds();


            for(var i = 0, len = series.length; i < len; i++){
                var labelSet = paper.set();
                this._bodySet.push(labelSet);

                var points = series[i].points;

                this._drawVmlDataLabels(paper, labelSet, points, plotBounds.x, plotBounds.y);
            }
        },

        _removeAll:function(){
            if(this._bodySet){
                this._bodySet.remove();
            }
            this.labelDivManager.clearAllLabels();
        },

        getElementByData:function(d){
            return this.shapeMap[d.className];
        },

        //数据点形状的数据，移动到标签上的时候触发选中
        makeChosenState:function(d){

            var element = this.getElementByData(d);

            if(element){
                element.attr({
                    'stroke': d.mouseOverColor,
                    'stroke-opacity':0.35,
                    'fill':d.mouseOverColor ? d.mouseOverColor : d.color,
                    'stroke-width':6
                });
            }

        },

        //数据点形状的数据，移动出到标签上的时候取消选中
        cancelChosenState:function(d){

            var element = this.getElementByData(d);

            element.attr({
                'fill':d.color,
                'fill-opacity':ColorUtils.getColorOpacity(d.color),
                'stroke':d.borderColor,
                'stroke-opacity':1,
                'stroke-width':d.borderWidth
            });
        },

        makeClickedState:function(d){

            var element = this.getElementByData(d);

            if(element){
                element.attr('fill', d.clickColor);
            }

        },

        cancelClickedState:function(d){

            var element = this.getElementByData(d);

            if(element){
                element.attr('fill', d.mouseOverColor);
            }

        }
    };

    BaseUtils.inherit(BarVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.BAR_VML, BarVmlRender);

});
/**
 * Created by eason on 15/8/13.
 */
define('render/PieVmlRender',['require','./BaseRender','../utils/BaseUtils','../utils/ColorUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var ColorUtils = require('../utils/ColorUtils');
    var Constants = require('../Constants');

    var HOVER_PERCENT = 1.1;

    function PieVmlRender(pie){
        BaseRender.call(this, pie);
        this.pie = pie;
    }

    PieVmlRender.prototype = {

        constructor:PieVmlRender,

        render:function(){

            this._removeAll();

            var paper = this.pie.getVanchartRender().getRenderRoot();
            var plotBounds = this.pie.getPlotBounds();

            this._bodySet = paper.set();
            this.dataMap = {};

            paper.customAttributes.segment = function(innerRadius, outerRadius, startAngle, endAngle, color){
                var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius);
                var attrs = {
                    path: arc({startAngle:startAngle, endAngle:endAngle})
                };

                if(color){
                    attrs.fill = color;
                    attrs['fill-opacity'] = ColorUtils.getColorOpacity(color);
                }

                return attrs;
            };

            var arcMap = this.pie.getVisibleChartData();

            for(var i = 0, len = arcMap.length; i < len; i++){
                var config = arcMap[i];

                var pathSet = paper.set();
                this._bodySet.push(pathSet);

                var translateX = plotBounds.x + config.centerX;
                var translateY = plotBounds.y + config.centerY;

                var innerRadius = config.innerRadius;
                var points = config.visiblePoints;

                for(var j = 0, count = points.length; j < count; j++){
                    var point = points[j];
                    var slice = paper.path()
                        .attr({
                            segment:[innerRadius, point.radius, point.startAngle, point.endAngle],
                            fill:point.color,
                            'fill-opacity':ColorUtils.getColorOpacity(point.color),
                            stroke:point.borderColor,
                            'stroke-width':point.borderWidth
                        });

                    slice.node._data_ = point;

                    this.dataMap[point.className] = slice;

                    this.addShapeEventHandler(slice);

                    pathSet.push(slice);
                }

                pathSet.transform('t' + translateX + ',' + translateY);
            }
            //标签
            this._renderDataLabels(paper);
        },

        _renderDataLabels:function(paper){
            var arcMap = this.pie.getVisibleChartData();

            for(var i = 0, len = arcMap.length; i < len; i++){

                var config = arcMap[i];

                var labelSet = paper.set();
                this._bodySet.push(labelSet);

                var plotBounds = this.pie.getPlotBounds();
                var transX = plotBounds.x + config.centerX;
                var transY = plotBounds.y + config.centerY;

                var points = config.visiblePoints;

                this._drawVmlDataLabels(paper, labelSet, points, transX, transY);
            }
        },

        _removeAll:function(){
            if(this._bodySet){
                this._bodySet.remove();
            }
            this.labelDivManager.clearAllLabels();
        },

        //数据点形状的数据，移动到标签上的时候触发选中
        makeChosenState:function(d){

            var elWrapper = this.dataMap[d.className];

            if(elWrapper){
                var startAngle = d.startAngle;
                var endAngle = d.endAngle;
                var innerRadius = d.innerRadius;
                var radius = d.radius;

                var color = d.mouseOverColor ? d.mouseOverColor : d.color;

                if(elWrapper.attr("segment")){
                    elWrapper.attr({segment: [innerRadius, radius * HOVER_PERCENT, startAngle, endAngle, color]});
                }
            }
        },

        //数据点形状的数据，移动出到标签上的时候取消选中
        cancelChosenState:function(d){

            var elWrapper = this.dataMap[d.className];

            if(elWrapper){
                var startAngle = d.startAngle;
                var endAngle = d.endAngle;
                var innerRadius = d.innerRadius;
                var radius = d.radius;

                if(elWrapper.attr("segment")){
                    elWrapper.attr({segment: [innerRadius, radius, startAngle, endAngle, d.color]});
                }

            }
        }
    };

    BaseUtils.inherit(PieVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.PIE_VML, PieVmlRender);

    return PieVmlRender;

});
/**
 * Created by Mitisky on 16/3/14.
 */
define('render/BubbleVmlRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){
    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function BubbleVmlRender(bubble){
        BaseRender.call(this, bubble);
        this.bubble = bubble;
    }

    BubbleVmlRender.prototype = {

        constructor:BubbleVmlRender,

        render:function(){
            this._removeAll();

            var paper = this.bubble.getVanchartRender().getRenderRoot();

            this._bodySet = paper.set();

            this.shapeMap = {};
            this._createBubbles(paper);
        },

        filterRender: function () {
            this.render();
        },

        _createBubbles:function(paper){
            var plotBounds = this.bubble.getPlotBounds();
            var seriesS = this.bubble.getVisibleChartData();

            var bubbleSet = paper.set();

            var transX = plotBounds.x;
            var transY = plotBounds.y;

            for(var i = 0, count = seriesS.length; i < count; i++){
                var sery = seriesS[i];

                this._createSeriesLine(paper, sery, transX, transY);

                var points = sery.points;
                for(var j = 0, len = points.length; j < len; j++){
                    var point = points[j];
                    if(point.visible) {
                        bubbleSet.push(
                            this._createPoint(point, paper, transX, transY)
                        );
                    }
                }

                var labelSet = paper.set();
                this._bodySet.push(labelSet);
                this._drawVmlDataLabels(paper, labelSet, points, transX, transY);
            }

            this._bodySet.push(bubbleSet);
        },

        _createSeriesLine: function (paper, sery, transX, transY) {
        },

        _createPoint:function(point, paper, transX, transY){
            var plotBounds = this.bubble.getPlotBounds();

            var clipY = plotBounds.y + 5;

            var bubble = paper.path(d3.svg.arc().outerRadius(point.radius)({startAngle:0, endAngle:2 * Math.PI}))
                .attr({
                    'clip-rect':plotBounds.x + ',' + clipY + ',' + plotBounds.width + ',' + plotBounds.height,
                    'fill':point.color,
                    'fill-opacity':point.fillColorOpacity,
                    'stroke-width':0
                })
                .transform('t' + (point.posX + transX) + ',' + (point.posY + transY));

            bubble.node._data_ = point;

            this.addShapeEventHandler(bubble);

            this.shapeMap[point.className] = bubble;

            return bubble;
        },

        _removeAll:function(){
            if(this._bodySet){
                this._bodySet.remove();
            }
            this.labelDivManager.clearAllLabels();
        },

        getElementByData:function(d){
            return this.shapeMap[d.className];
        },

        makeChosenState:function(d){
            var element = this.getElementByData(d);

            if(element){
                element.attr({
                    'stroke': d.mouseOverColor,
                    'stroke-opacity':0.35,
                    'stroke-width':6,
                    'fill':d.mouseOverColor,
                    'fill-opacity': 0.65
                });
            }

        },

        cancelChosenState:function(d){

            var element = this.getElementByData(d);

            element.attr({
                'fill':d.color,
                'fill-opacity':d.fillColorOpacity,
                'stroke-width':0
            });
        },

        makeClickedState:function(d){

            var element = this.getElementByData(d);

            if(element){
                element.attr('fill', d.clickColor);
            }

        },

        cancelClickedState:function(d){

            var element = this.getElementByData(d);

            if(element){
                element.attr('fill', d.mouseOverColor);
            }

        }
    };

    BaseUtils.inherit(BubbleVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.BUBBLE_VML, BubbleVmlRender);

    return BubbleVmlRender;

});

/**
 * Created by Mitisky on 16/3/24.
 */
define('render/ScatterVmlRender',['require','./BubbleVmlRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){
    var BubbleVmlRender = require('./BubbleVmlRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function ScatterVmlRender(scatter){
        BubbleVmlRender.call(this, scatter);
        this.scatter = scatter;
    }

    ScatterVmlRender.prototype = {
        constructor: ScatterVmlRender,

        _createSeriesLine: function (paper, sery, transX, transY) {
            var plotBounds = this.scatter.getPlotBounds();

            var singleLine = paper
                .path(sery.lineSvg(sery.points))
                .transform('t' + transX + ',' + transY)
                .attr({
                    'clip-rect':plotBounds.x + ',' + plotBounds.y + ',' + plotBounds.width + ',' + plotBounds.height,
                    'fill':'none',
                    'stroke':sery.color,
                    'stroke-width':sery.lineWidth
                });

            singleLine.node._data_ = sery;
            this._bodySet.push(singleLine);
        },

        _createPoint:function(point, paper, transX, transY){

            var x = point.posX + transX;
            var y = point.posY + transY;

            var marker = this._createVmlMarker(paper, point, [x,y]);

            this.shapeMap[point.className] = marker;

            return marker.marker;
        },

        getElementByData:function(d){

            if(this.shapeMap && this.shapeMap[d.className]){
                return this.shapeMap[d.className];
            }

        },

        makeChosenState:function(d){
            if(d){
                this._makeVmlMarkerChosenState(d);
            }
        },

        cancelChosenState:function(d){

            if(d){
                this._cancelVmlMarkerChosenState(d);
            }

        },

        makeClickedState:function(d){

        },

        cancelClickedState:function(d){

        }
    };


    BaseUtils.inherit(ScatterVmlRender, BubbleVmlRender);
    require('./RenderLibrary').register(Constants.SCATTER_VML, ScatterVmlRender);

    return ScatterVmlRender;
});

/**
 * Created by eason on 15/10/12.
 */

define('render/DataSheetVmlRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./LegendIconFactory','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var LegendIconFactory = require('./LegendIconFactory');

    function DataSheetVmlRender(dataSheet){
        BaseRender.call(this, dataSheet);
        this.dataSheet = dataSheet;
    }

    DataSheetVmlRender.prototype = {
        constructor:DataSheetVmlRender,

        render:function(){

            if(this.dataSheetSet){
                return;
            }

            var paper = this.dataSheet.getVanchartRender().getRenderRoot();

            var axis = this.dataSheet.vanchart.xAxis();
            var categories = axis.getCategories();
            var unitLength = this.dataSheet.getPlotBounds().width / categories.length;

            var seriesWidth = this.dataSheet.getMaxSeriesWidth();
            var categoryHeight = this.dataSheet.getCategoryHeight();

            var transX = this.dataSheet.bounds.x;
            var transY = this.dataSheet.bounds.y;


            this.dataSheetSet = paper.set();
            this.iconSet = paper.set();

            this._drawLines(paper, seriesWidth, categoryHeight, unitLength);

            this._drawCategory(paper, seriesWidth, categoryHeight, unitLength);

            this._drawSeries(paper, seriesWidth, categoryHeight, transX, transY);

            this._drawValues(paper, seriesWidth, categoryHeight, unitLength);

            this.dataSheetSet.transform('t' + transX + ',' + transY);
        },

        _drawLines:function(paper, seriesWidth, categoryHeight, unitLength){

            var lineG = paper.set();
            this.dataSheetSet.push(lineG);

            var cfg = this.dataSheet.componentOption;

            var endX = this.dataSheet.bounds.width;
            var endY = this.dataSheet.bounds.height;
            var style = {
                fill:'none',
                stroke:cfg.borderColor,
                'stroke-width':cfg.borderWidth
            };

            lineG.push(paper.path('M' + seriesWidth + ',0' + 'L' + endX + ',0' + 'L' + endX + ' ' + endY + 'L0' + ',' + endY + 'L0' + ',' + categoryHeight));

            var cateCount = this.dataSheet.categoryNames.length;

            var startX = seriesWidth;

            for(var i = 0; i < cateCount; i++){
                lineG.push(paper.path(this._getLinePath([startX,0], [startX, endY])));
                startX += unitLength;
            }

            var seriesCount = this.dataSheet.seriesNames.length;
            var height = categoryHeight;

            for(var i = 0; i < seriesCount; i++){
                lineG.push(paper.path(this._getLinePath([0,height], [endX, height])));

                height += this.dataSheet.getSeriesHeight(i);
            }

            lineG.attr(style);
        },

        _drawValues:function(paper, seriesWidth, categoryHeight, unitLength){

            var valueG = paper.set();
            this.dataSheetSet.push(valueG);

            var values = this.dataSheet.values;

            var valueStyle = this.dataSheet._valueStyle();
            var valueLineHeight = BaseUtils.getTextHeight(valueStyle);
            var textPadding = this.dataSheet.getTextPadding();
            var startX = seriesWidth;
            var startY = categoryHeight;

            for(var lineIndex = 0; lineIndex < values.length; lineIndex++){
                var singleLine = values[lineIndex];

                var valueHeight = this.dataSheet.getSeriesHeight(lineIndex);

                for(var valueIndex = 0; valueIndex < singleLine.length; valueIndex++){

                    var singleName = singleLine[valueIndex];

                    var firstY = startY + this._getStartY(singleName, valueStyle, valueHeight) + valueLineHeight * 0.5;

                    for(var i = 0; i < singleName.length; i++){


                        valueG.push(

                            paper.text(startX + unitLength/2 + unitLength * valueIndex,
                                                firstY + (valueLineHeight + textPadding) * i,
                                                        singleName[i])

                        );
                    }
                }

                startY += valueHeight;
            }

            valueStyle = BaseUtils.cssNormalization(valueStyle);
            valueStyle['text-anchor'] = 'middle';

            valueG.attr(valueStyle);
        },

        _drawCategory:function(paper, seriesWidth, categoryHeight, unitLength){

            var categoryG = paper.set();
            this.dataSheetSet.push(categoryG);

            var categoryNames = this.dataSheet.categoryNames;

            var startX = seriesWidth;

            var categoryStyle = this.dataSheet._categoryStyle();

            var categoryLineHeight = BaseUtils.getTextHeight(categoryStyle);
            var textPadding = this.dataSheet.getTextPadding();

            for(var index = 0, cCount = categoryNames.length; index < cCount; index++){

                var singleName = categoryNames[index];

                var startY = this._getStartY(singleName, categoryStyle, categoryHeight) + categoryLineHeight * 0.5;

                for(var i = 0; i < singleName.length; i++){

                    categoryG.push(
                        paper.text(startX + unitLength/2 + unitLength * index, startY + (categoryLineHeight + textPadding) * i, singleName[i])
                    );

                }

            }

            categoryStyle = BaseUtils.cssNormalization(categoryStyle);
            categoryStyle['text-anchor'] = 'middle';

            categoryG.attr(categoryStyle);
        },

        _drawSeries:function(paper, seriesWidth, categoryHeight, transX, transY){

            var seriesG = paper.set();
            var itemG = paper.set();
            this.dataSheetSet.push(seriesG);
            this.dataSheetSet.push(itemG);

            var seriesNames = this.dataSheet.seriesNames;

            var startX = 16 + (seriesWidth - 16) / 2;
            var startY = categoryHeight;

            var seriesStyle = this.dataSheet._seriesStyle();
            var seriesLineHeight = BaseUtils.getTextHeight(seriesStyle);
            var textPadding = this.dataSheet.getTextPadding();

            for(var index = 0, sCount = seriesNames.length; index < sCount; index++){

                var singleName = seriesNames[index];
                var seriesHeight = this.dataSheet.getSeriesHeight(index);

                var firstY = startY + this._getStartY(singleName, seriesStyle, seriesHeight) + seriesLineHeight * 0.5;

                for(var i = 0; i < singleName.length; i++){

                    seriesG.push(
                        paper.text(startX, firstY + (seriesLineHeight + textPadding) * i, singleName[i])
                    );

                }

                var iconType = this.dataSheet._getLegendType(index);
                var iconHeight = LegendIconFactory.getLegendIconSize(iconType).height;

                var tmpX = 2 + transX;
                var tmpY = (seriesHeight - iconHeight)/2 + startY + transY;

                this.iconSet.push(
                    paper.path(LegendIconFactory.getLegendIconPath(iconType))
                        .attr({
                            'fill' : this.dataSheet._getDefaultSeriesColor(index),
                            'stroke' : 'none'
                        })
                        .transform('t' + tmpX +',' + tmpY )

                );

                startY += seriesHeight;
            }


            seriesStyle = BaseUtils.cssNormalization(seriesStyle);
            seriesStyle['text-anchor'] = 'middle';
            seriesG.attr(seriesStyle);
        },

        _getStartY:function(textArray, style, boxHeight){

            var textPadding = this.dataSheet.getTextPadding();

            var textCount = textArray.length;

            var textHeight = BaseUtils.getTextHeight(style) * textCount + (textCount - 1) * textPadding;

            return (boxHeight - textHeight) / 2;
        }
    }

    BaseUtils.inherit(DataSheetVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.DATA_SHEET_VML, DataSheetVmlRender);

});
/**
 * Created by eason on 15/8/24.
 */

define('render/ToolbarVmlRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function ToolbarVmlRender(toolbar){
        this.toolbar = toolbar;
    }

    ToolbarVmlRender.prototype = {

        constructor:ToolbarVmlRender,

        render:function(){
            var cfg = this.toolbar.componentOption;

            if(!cfg.enabled){
                return;
            }

            //todo 下次再改吧
            if(this.toolbar.refreshIcon.iconRender.itemSet){
                if(this.toolbar.menuIcon){
                    this.toFront(this.toolbar.menuIcon.iconRender)
                }

                this.toFront(this.toolbar.refreshIcon.iconRender);

                var toolbarIcons = this.toolbar.getToolbarIcons();

                for(var i = 0, len = toolbarIcons.length; i < len; i++){
                    this.toFront(toolbarIcons[i].iconRender);
                }
            }else{

                var paper = this.toolbar.getVanchartRender().getRenderRoot();

                if(this.toolbar.menuIcon){
                    this.toolbar.menuIcon.render(paper);
                }

                this.toolbar.refreshIcon.render(paper);

                var toolbarIcons = this.toolbar.getToolbarIcons();

                for(var i = 0, len = toolbarIcons.length; i < len; i++){
                    toolbarIcons[i].render(paper);
                }
            }
        },

        hide:function(){
            var toolbarIcons = this.toolbar.getToolbarIcons();
            var iconSize = toolbarIcons.length;

            for(var i = 0; i < iconSize; i++){
                toolbarIcons[i].hideIcon();
            }

            var refreshIcon = this.toolbar.getRefreshIcon();

            var left = 4 * (iconSize + 1) ;
            var right = 4 * (iconSize + 1) + 33 * iconSize;

            if(refreshIcon.visible){
                refreshIcon.refreshMove(left, right);
            }
        },

        show:function(){
            var toolbarIcons = this.toolbar.getToolbarIcons();
            var iconSize = toolbarIcons.length;

            for(var i = 0; i < iconSize; i++){
                toolbarIcons[i].showIcon();
            }

            var refreshIcon = this.toolbar.getRefreshIcon();

            var left = 4 * (iconSize + 1) + 33 * iconSize;
            var right = 4 * (iconSize + 1);

            if(refreshIcon.visible){
                refreshIcon.refreshMove(left, right);
            }
        },

        toFront:function(iconRender){
            if(iconRender){
                iconRender.itemSet.toFront();
            }
        }
    };


    BaseUtils.inherit(ToolbarVmlRender, BaseRender);

    require('./RenderLibrary').register(Constants.TOOLBAR_VML, ToolbarVmlRender);

    return ToolbarVmlRender;

});
/**
 * Created by eason on 15/8/14.
 */

define('render/LegendVmlRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./LegendIconFactory','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');
    var LegendIconFactory = require('./LegendIconFactory');

    var ENABLED_COLOR = 'rgb(67,67,72)';
    var DISABLED_COLOR = 'rgb(204,204,204)';

    function LegendVmlRender(legend){
        this.legend = legend;

        this.markerSet = [];
        this.labelSet = [];
        this.rectSet = [];
        this.pageButton = [];
        this.background = [];
    }

    LegendVmlRender.prototype = {

        constructor:LegendVmlRender,

        render:function(){

            if(!this.legend.componentOption.initState){
                this.refreshRestore();
                this.legend.componentOption.initState = true;
            }else{
                this.background.forEach(function(element){
                    BaseUtils.toFront(element.node);
                });

                this.pageButton.forEach(function(element){
                    BaseUtils.toFront(element.node);
                });

                this.rectSet.forEach(function(element){
                    BaseUtils.toFront(element.node);
                });

                this.markerSet.forEach(function(element){
                    BaseUtils.toFront(element.node);
                });

                this.labelSet.forEach(function(element){
                    BaseUtils.toFront(element.node);
                });
            }

        },

        _render:function(){

            var option = this.legend.componentOption;
            var bounds = this.legend.bounds;
            var paper = this.legend.getVanchartRender().getRenderRoot();

            this._renderVmlBackground(this.background, paper, option, bounds);

            this.legend.isHorizontal() ? this._renderHorizontal(paper) : this._renderVertical(paper);
        },

        _renderWithPages:function(paper){

            var pages = this.legend.getVerticalPages();

            this._renderWithoutPages(paper, pages[0], 0);

            var x = this.legend.bounds.x;
            var y = this.legend.bounds.y;

            var width = this.legend.bounds.width;
            var height = this.legend.bounds.height;
            height -= this.legend.getButtonHeight();

            var buttonWidth = 40;
            var leftButtonTopX = x + (width - buttonWidth) / 2;
            var rightButtonTopX = x + (width + buttonWidth) / 2;
            var topY = y + height + this.legend.getPadding();
            var labelX = x + width/2;

            var pageCount = pages.length;


            var label = paper.text(labelX, topY, '1/' + pageCount)
                .attr({
                    "textAnchor":"middle",
                    'font-family': 'Verdana',
                    'font-size': '14'
                });

            var pageIndex = 0;

            var self = this;

            var leftButton = paper.path(this._prePageButtonPath(leftButtonTopX, topY))
                .attr({
                    cursor:'pointer',
                    fill:DISABLED_COLOR,
                    stroke:'none'
                })
                .click(function(){
                    if(pageIndex <= 0){
                        return;
                    }

                    pageIndex--;
                    var showIndex = pageIndex + 1;
                    label.attr('text', showIndex + "/" + pageCount);

                    self._clearAllLegendItems();
                    self._renderWithoutPages(paper, pages[pageIndex], self._preItemCount(pageIndex));

                    rightButton.attr('fill', pageIndex == pageCount - 1 ? DISABLED_COLOR : ENABLED_COLOR)
                    leftButton.attr('fill', pageIndex <= 0 ? DISABLED_COLOR : ENABLED_COLOR);

                });

            var rightButton = paper.path(this._nextPageButtonPath(rightButtonTopX, topY))
                .attr({
                    cursor:'pointer',
                    fill:ENABLED_COLOR,
                    stroke:'none'
                })
                .click(function(){
                    if(pageIndex == pageCount - 1){
                        return;
                    }

                    pageIndex++;
                    var showIndex = pageIndex + 1;
                    label.attr('text', showIndex + "/" + pageCount);

                    self._clearAllLegendItems();
                    self._renderWithoutPages(paper, pages[pageIndex], self._preItemCount(pageIndex));

                    rightButton.attr('fill', pageIndex == pageCount - 1 ? DISABLED_COLOR : ENABLED_COLOR);
                    leftButton.attr('fill', pageIndex <= 0 ? DISABLED_COLOR : ENABLED_COLOR)
                })

            this.pageButton.push(label);
            this.pageButton.push(leftButton);
            this.pageButton.push(rightButton);
        },

        _preItemCount:function(pageIndex){

            var pages = this.legend.getVerticalPages();

            var count = 0;
            for(var i = 0; i < pageIndex; i++){
                count += pages[i].length;
            }

            return count;
        },

        _prePageButtonPath:function(topX, topY){
            var edge = 12;

            var leftBottomX = topX - edge / 2;
            var leftBottomY = (edge / 2) * Math.sqrt(3) + topY;

            var rightBottomX = topX + edge / 2;
            var rightBottomY = leftBottomY;

            return 'M' + topX + ',' + topY + 'L' + leftBottomX + ',' + leftBottomY + 'L' + rightBottomX + ',' + rightBottomY + 'Z';
        },

        _nextPageButtonPath:function(topX, topY){
            var edge = 12;

            var topLeftX = topX - edge/2;
            var topLeftY = topY;

            var topRightX = topX + edge/2;
            var topRightY = topY;

            var bottomX = topX;
            var bottomY = (edge / 2) * Math.sqrt(3) + topY;

            return 'M' + topLeftX + ',' + topLeftY + 'L' + topRightX + ',' + topRightY + 'L' + bottomX + ',' + bottomY + 'Z';
        },

        _renderWithoutPages:function(paper, items, startIndex){

            items = items || this.legend.getLegendItems();
            startIndex = startIndex || 0;

            var cfg = this.legend.componentOption;

            var PADDING = this.legend.getPadding() + this.legend.verticalAlign;
            var GAP = this.legend.getGap();

            var x = this.legend.bounds.x;
            var y = this.legend.bounds.y;
            var boundsWidth = this.legend.bounds.width;

            var textStyle = BaseUtils.cssNormalization(cfg.style);

            for(var i = 0, len = items.length; i < len; i++){
                var d = items[i];

                var iconSize = LegendIconFactory.getLegendIconSize(d.legendIconType);
                var labelDim = BaseUtils.getTextDimension(d.itemName, cfg.style, true);
                var detY = Math.max(iconSize.height, labelDim.height)/2;

                var dataIndex = startIndex + i;
                var preHeight = this.legend.getPreHeight(startIndex, dataIndex);
                var itemHeight = this.legend.getVerticalItemHeight(dataIndex);

                var iconX = x + PADDING;
                var iconY = y + preHeight;

                var rect = paper.rect(x, iconY + detY - iconSize.height/2, boundsWidth, itemHeight)
                    .attr({
                        fill:'white',
                        'fill-opacity':0,
                        stroke:'none'
                    });

                var markerColor = d.visible ? d.color : d.hiddenColor;

                var textColor = d.visible ? cfg.style.color : d.hiddenColor;

                var marker = paper.path(LegendIconFactory.getLegendIconPath(d.legendIconType))
                    .attr('fill', markerColor)
                    .attr('stroke-width', 0)
                    .transform('t' + iconX + ',' + (iconY + detY - iconSize.height/2));

                var label = paper.text(iconX + iconSize.width + GAP, iconY + detY, d.itemName)
                    .attr('text-anchor', 'start')
                    .attr(textStyle)
                    .attr('fill', textColor);


                this._bindDataAndMarkerEvent(rect, d, i);
                this._bindDataAndMarkerEvent(marker, d, i);
                this._bindDataAndLabelEvent(label, d, i);

                this.rectSet.push(rect);
                this.markerSet.push(marker);
                this.labelSet.push(label);
            }
        },

        _clearAllLegendItems:function(){

            this.markerSet.forEach(function(element){
                element.remove();
            });

            this.labelSet.forEach(function(element){
                element.remove();
            });

            this.rectSet.forEach(function(element){
                element.remove();
            });

            this.markerSet = [];
            this.labelSet = [];
            this.rectSet = [];
        },

        _renderVertical:function(paper){
            this.legend.hasEnoughVerticalSpace() ? this._renderWithoutPages(paper) : this._renderWithPages(paper);
        },

        _renderHorizontal:function(paper){

            var PADDING = this.legend.getPadding();
            var HORIZONTAL_GAP = this.legend.getHorizontalGap();
            var GAP = this.legend.getGap();

            var lineItems = this.legend.getHorizontalLineItems();

            var cfg = this.legend.componentOption;
            var textStyle = BaseUtils.cssNormalization(cfg.style);

            var lineHeight = this.legend.getLineHeight();

            var boundsWidth = this.legend.bounds.width;

            var boundsX = this.legend.bounds.x;
            var boundsY = this.legend.bounds.y;

            var y = boundsY + PADDING;

            var itemIndex = 0;

            for(var lineIndex = 0, len = lineItems.length; lineIndex < len; lineIndex++){

                var items = lineItems[lineIndex];

                var itemsWidth = this.legend.getHorizontalItemsWidth(items);

                var x = boundsX + (boundsWidth - itemsWidth) / 2;

                var startX = [x];

                for(var i = 1, count = items.length; i < count; i++){
                    var preItem = items[i - 1];
                    var iconSize = LegendIconFactory.getLegendIconSize(preItem.legendIconType);
                    var labelDim = BaseUtils.getTextDimension(preItem.itemName, cfg.style, true);
                    x += iconSize.width + GAP + labelDim.width + HORIZONTAL_GAP;
                    startX.push(x);
                }

                for(var i = 0, count = items.length; i < count; i++){

                    var d = items[i];
                    var iconSize = LegendIconFactory.getLegendIconSize(d.legendIconType);
                    var labelDim = BaseUtils.getTextDimension(d.itemName, cfg.style, true);
                    var detY = Math.max(iconSize.height, labelDim.height)/2;

                    var itemWidth = this.legend.getHorizontalItemWidth(i);
                    var itemHeight = lineHeight[lineIndex] + PADDING;

                    var rect = paper.rect(startX[i], (y + detY - iconSize.height/2), itemWidth, itemHeight)
                        .attr({
                            fill:'white',
                            'fill-opacity':0,
                            stroke:'none'
                        });

                    var markerColor = d.visible ? d.color : d.hiddenColor;

                    var textColor = d.visible ? cfg.style.color : d.hiddenColor;

                    var marker = paper.path(LegendIconFactory.getLegendIconPath(d.legendIconType))
                        .attr('fill', markerColor)
                        .attr('stroke-width', 0)
                        .transform('t' + startX[i] + ',' + (y + detY - iconSize.height/2));

                    var label = paper.text(startX[i] + iconSize.width + GAP, (y + detY), d.itemName)
                        .attr('text-anchor', 'start')
                        .attr(textStyle)
                        .attr('fill', textColor);;

                    this._bindDataAndMarkerEvent(rect, d, itemIndex);
                    this._bindDataAndMarkerEvent(marker, d, itemIndex);
                    this._bindDataAndLabelEvent(label, d, itemIndex);

                    itemIndex++;

                    this.rectSet.push(rect);
                    this.markerSet.push(marker);
                    this.labelSet.push(label);

                }

                y += lineHeight[lineIndex] + PADDING;
            }
        },

        _clickHandler:function(d, index){

            var vanchart = this.legend.vanchart;
            var cfg = this.legend.componentOption;

            var series = d.series;
            var name = d.itemName;

            if(series.type == Constants.PIE_CHART){
                vanchart.series.forEach(function(sery){

                    if(sery.type == Constants.PIE_CHART){

                        sery.points.forEach(function(point){
                            if(point.seriesName == name){
                                point.visible = !point.visible;
                            }
                        });

                        sery.updateVisiblePoints();
                    }
                });
            }else{
                series.visible = !series.visible;
            }

            vanchart.currentOption.byClassName = true;
            vanchart.refreshComponentsAndSeries();

            d.visible = !d.visible;

            var markerColor = d.visible ? d.color : d.hiddenColor;
            this.markerSet[index].attr('fill', markerColor);

            var textColor = d.visible ? cfg.style.color : d.hiddenColor;
            this.labelSet[index].attr('fill', textColor);
        },

        _bindDataAndMarkerEvent:function(element, data, index){

            element.data('data', data);
            element.attr('cursor', 'pointer');

            var self = this;
            element.click(function(){
                self._clickHandler(data, index);
            });

        },

        _bindDataAndLabelEvent:function(element, data, index){
            var cfg = this.legend.componentOption;

            element.data('data', data);
            element.attr('cursor', 'pointer');

            element.mousemove(function(){
                this.attr('fill', data.hoverColor);
            });

            element.mouseout(function(){
                var textColor = data.visible ? cfg.style.color : data.hiddenColor;
                this.attr('fill', textColor);
            });

            var self = this;
            element.click(function(){
                self._clickHandler(data, index);
            });

        },

        refreshRestore:function(){

            this._clearAllLegendItems();

            this.background.forEach(function(element){
                element.remove();
            });

            this.pageButton.forEach(function(element){
                element.remove();
            });

            this.background = [];
            this.pageButton = [];

            this._render();
        }
    };

    BaseUtils.inherit(LegendVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.LEGEND_VML, LegendVmlRender);

    return LegendVmlRender;
});
/**
 * Created by eason on 15/9/25.
 */

define('render/BaseAxisVmlRender',['require','./BaseRender','../utils/BaseUtils','../utils/BezierEasing','../Constants','../utils/ColorUtils'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var BezierEasing = require('../utils/BezierEasing');
    var Constants = require('../Constants');
    var ColorUtils = require('../utils/ColorUtils');

    function BaseAxisVmlRender(axis){
        BaseRender.call(this, axis);
        this.axis = axis;
    }

    BaseAxisVmlRender.prototype = {

        constructor:BaseAxisVmlRender,

        render:function(){

            this._removeAll();

            var paper = this.axis.getVanchartRender().getRenderRoot();

            this._bodySet = paper.set();

            var cfg = this.axis.componentOption;

            this._drawAxisLine(paper, cfg);

            this._drawArrow(paper, cfg);

            this._drawAxisTicks(paper, cfg);

            this._drawMinorTickLine(paper, cfg);

            this._drawGridLines(paper, cfg);

            this._drawAxisLabels(paper, cfg);

            this._drawPlotBands(paper);
            
            this._drawAxisTitle(paper);

            this._drawPlotLines(paper, cfg);
        },

        _removeAll:function(){

            if(this._bodySet){
                this._bodySet.remove();
            }

            this.labelDivManager.clearAllLabels();
        },

        _drawAxisLine:function(paper, cfg){

            var axisOrigon = this.axis._getAxisOriginPoint();

            var lineWidth = cfg.lineWidth;
            var lineColor = cfg.lineColor;

            var width = this.axis.bounds.width;
            var height = this.axis.bounds.height;

            var line;
            if(this.axis.isHorizontal()){
                line = paper.path(this._getLinePath([0,0], [width, 0]));
            }else{
                line = paper.path('M0,0' + 'L'+'0,' + height);
            }

            line.attr({
                'stroke':lineColor,
                'stroke-width':lineWidth
            })
                .transform(BaseUtils.makeTranslate(axisOrigon));

            this._bodySet.push(line);
        },

        _drawArrow:function(paper, cfg){

            if(!this.axis.showArrow()){
                return;
            }

            var plotBounds = this.axis.getPlotBounds();
            var cfg = this.axis.componentOption;
            var lineWidth = cfg.lineWidth;
            var lineColor = cfg.lineColor;
            var pathDet = BaseUtils.lineSubPixelOpt(0, lineWidth);
            var axisOrigin = this.axis._getAxisOriginPoint();

            var line, arrow;
            var dx, dy;

            if(this.axis.isHorizontal()){

                line = paper.path(this._getLinePath([plotBounds.width, 0],[plotBounds.width + 6, 0]));
                arrow = paper.path("M2,2 L10,6 L2,10 L6,6 L2,2");
                dx = plotBounds.width;
                dy = -6;

            }else{

                line = paper.path(this._getLinePath([0, -6],[0, 0]));
                arrow = paper.path("M2,-2 L6,-10 L10,-2 L6,-6 L2,-2");
                dx = -6;
                dy = 0;
            }

            line
                .attr({
                    'fill':'none',
                    'stroke':lineColor,
                    'stroke-width':lineWidth
                })
                .transform(BaseUtils.makeTranslate(axisOrigin));

            arrow
                .attr({
                    'fill':lineColor,
                    'stroke':'none'
                })
                .transform(BaseUtils.makeTranslate([axisOrigin.x + dx, axisOrigin.y + dy]));

            this._bodySet.push(line);
            this._bodySet.push(arrow);

        },

        _drawMinorTickLine:function(paper, cfg){

            var minorTickLength = cfg.enableMinorTick ? cfg.minorTickLength : 0;
            var minorTickWidth = cfg.minorTickWidth;
            var minorTickColor = cfg.minorTickColor;
            var minorTickData = this.axis.getMinorTickData();

            var axisOrigin = this.axis._getAxisOriginPoint();

            var isCategory = this.axis.type == Constants.CATEGORY_AXIS_COMPONENT;
            var scale = this.axis.scale;

            var self = this;

            if(minorTickLength){

                minorTickData.forEach(function(d){

                    self._bodySet.push(
                        paper.path(self._getTickPath(isCategory ? d : scale(d), minorTickLength))
                            .attr({
                                'stroke':minorTickColor,
                                'stroke-width':minorTickWidth
                            })
                            .transform(BaseUtils.makeTranslate(axisOrigin))
                    );

                });
            }

        },

        _drawAxisTicks:function(paper, cfg){
            var ticks = this.axis.getMainTickData();
            var self = this;
            var axisOrigin = this.axis._getAxisOriginPoint();

            //主要刻度线
            if(cfg.enableTick){
                var tickColor = cfg.tickColor;
                var tickWidth = cfg.tickWidth;
                var tickLength = cfg.tickLength;

                ticks.forEach(function(tick){

                    self._bodySet.push(
                        paper.path(self._getTickPath(tick.tickPos, tickLength))
                            .attr({
                                'stroke':tickColor,
                                'stroke-width':tickWidth
                            })
                            .transform(BaseUtils.makeTranslate(axisOrigin))
                    );

                });
            }

        },

        _getTickPath:function(tickPos, tickLength){

            var position = this.axis.getPosition();

            switch (position){
                case Constants.TOP:
                    return this._getLinePath([tickPos, 0], [tickPos, -tickLength ]);

                case Constants.BOTTOM:
                    return this._getLinePath([tickPos, 0], [tickPos, tickLength ]);

                case Constants.LEFT:
                    return this._getLinePath([0, tickPos], [-tickLength, tickPos]);

                case Constants.RIGHT:
                    return this._getLinePath([0, tickPos], [tickLength, tickPos]);

            };
        },

        _getGridLinePath:function(tickPos, useLength){

            if(this.axis.isHorizontal()){

                return this._getLinePath([tickPos, 0], [tickPos, useLength]);

            }else{

                return this._getLinePath([0, tickPos], [useLength, tickPos]);

            }

        },

        _drawGridLines:function(paper, cfg){

            var gridLineColor = cfg.gridLineColor;
            var gridLineWidth = cfg.gridLineWidth;

            var plotBounds = this.axis.getPlotBounds();

            var useLength = this.axis.isHorizontal() ? plotBounds.height : plotBounds.width;

            var ticks = this.axis.getTickData();

            var self = this;

            ticks.forEach(function(tick){

                self._bodySet.push(
                    paper.path(self._getGridLinePath(tick.tickPos, useLength))
                        .attr({
                            'stroke':gridLineColor,
                            'stroke-width':gridLineWidth
                        })
                        .transform(BaseUtils.makeTranslate(plotBounds))
                );

            });

        },

        _drawAxisLabels:function(paper){

            this.labelDivManager.clearAllLabels();

            var labelDivManager = this.labelDivManager;
            var cfg = this.axis.componentOption;

            var origin = this.axis._getAxisOriginPoint();

            var transX = origin.x;
            var transY = origin.y;

            var orient = this.axis.getPosition();
            var isHorizontal = this.axis.isHorizontal();
            var scale = this.axis.getTickScale();
            var ticks = this.axis.getTickData();

            var tickSpacing = (scale.rangeBand ? 0 : cfg.tickLength) + cfg.tickPadding;

            var labelStyle = cfg.labelStyle;
            var labelHeight = BaseUtils.getTextHeight(labelStyle);

            if (scale.rangeBand) {
                var scale0 = scale.copy();
                var dx = scale0.rangeBand();

                scale = function(d) {
                    return scale0(d) + dx/2;
                };
            }


            var self = this;
            var sign = orient === "top" || orient === "right" ? -1 : 1;

            ticks.forEach(function(tick){

                var x,y;

                var labelDim = BaseUtils.getTextDimension(tick.tickContent, labelStyle, false);
                if(isHorizontal){
                    y = orient == Constants.TOP ? -(tickSpacing + labelHeight) : tickSpacing;
                    x = scale(tick.tickValue) - labelDim.width/2;
                }else{
                    x = orient == Constants.LEFT ? -(tickSpacing + labelDim.width) : tickSpacing;
                    y = scale(tick.tickValue) - labelHeight/2;
                }

                if(cfg.useHtml){
                    labelDivManager.addLabel(tick.tickContent, {x:x + transX, y:y + transY}, labelStyle);
                }else{

                    var labelRotation = cfg.labelRotation || 0;
                    var rx = transX + x + labelDim.width/2;
                    var ry = transY + y + labelHeight/2;

                    if(Math.abs(labelRotation)){

                        var detY = Math.abs(labelDim.height - tick.tickDim.height);

                        var detX = Math.abs(labelDim.width - tick.tickDim.width);

                        if(orient === Constants.TOP || orient === Constants.BOTTOM){
                            ry += sign * detY/2;
                        }else{
                            rx += sign * detX/2;
                        }

                    }

                    var tickLabel = paper
                        .text(rx, ry, tick.tickContent)
                        .attr(BaseUtils.cssNormalization(labelStyle))
                        .transform('r' + labelRotation);

                    self._bodySet.push(tickLabel);


                }

            });

        },

        _drawAxisTitle:function(paper){
            this.axis.isHorizontal() ? this._drawHorizontalTitle(paper)
                                                : this._drawVerticalTitle(paper);
        },

        _drawHorizontalTitle:function(paper){

            var position = this.axis.getPosition();

            var titleBounds = this.axis.getAxisTitleBounds();
            var transX = titleBounds.x;
            var transY = titleBounds.y + (position == Constants.TOP ? titleBounds.height : 0);

            var cfg = this.axis.componentOption;

            if(cfg.title){

                var title = cfg.title;
                var textStyle = BaseUtils.cssNormalization(title.style);
                var rotation = title.rotation || 0;

                var textDim = BaseUtils.getTextDimension(title.text, title.style, title.useHtml);
                var textBounds = BaseUtils.getTextDimensionWithRotation(title.text, title.style, title.useHtml, rotation);

                var sign = position == Constants.BOTTOM ? 1 : -1;

                var rx = transX;
                var ry = transY + sign * textDim.height / 2;

                var align = title.align || 'left';
                switch(align){
                    case 'left':
                        rx += textDim.width/2;
                        break;
                    case 'center':
                        rx += titleBounds.width/2;
                        break;
                    case 'right':
                        rx += (titleBounds.width - textDim.width/2);
                        break;
                }

                var detY = Math.abs(textBounds.height - textDim.height)/2;

                this._bodySet.push(
                    paper
                        .text(rx, ry + sign * detY, title.text)
                        .attr(textStyle)
                        .transform('r' + rotation)
                );

            }

        },

        _drawVerticalTitle:function(paper){

            var position = this.axis.getPosition();

            var titleBounds = this.axis.getAxisTitleBounds();
            var transX = titleBounds.x + (position == Constants.LEFT ? titleBounds.width : 0);
            var transY = titleBounds.y;
            var cfg = this.axis.componentOption;

            var sign = position == Constants.LEFT ? 1 : -1;

            if(cfg.title){

                var title = cfg.title;
                var textStyle = BaseUtils.cssNormalization(title.style);
                var rotation = title.rotation || 0;

                var textDim = BaseUtils.getTextDimension(title.text, title.style, title.useHtml);
                var textBounds = BaseUtils.getTextDimensionWithRotation(title.text, title.style, title.useHtml, rotation);

                var rx = transX - textDim.width/2 * sign;
                var ry = transY;

                var align = title.align || 'top';
                switch(align){
                    case 'top':
                        ry += textDim.width/2;
                        break;
                    case 'center':
                        ry += titleBounds.height/2;
                        break;
                    case 'bottom':
                        ry += (titleBounds.height - textDim.width/2);
                        break;
                }

                var detX = Math.abs(textBounds.width - textDim.width)/2;

                this._bodySet.push(
                    paper
                        .text(rx + detX * sign, ry, title.text)
                        .attr(textStyle)
                        .transform('r' + rotation)
                );

            }
        },

        _drawPlotLines:function(paper){
            var plotLines = this.axis._preCalculatePlotLines();

            var plotBounds = this.axis.getPlotBounds();

            var self = this;

            plotLines.forEach(function(line){
                self._bodySet.push(
                    paper.path(self._getLinePath([line.startPos.x, line.startPos.y], [line.endPos.x, line.endPos.y]))
                        .attr({
                            'stroke': line.color,
                            'stroke-width': line.width,
                            'stroke-dasharray': line.dataArray
                        })
                        .transform(BaseUtils.makeTranslate(plotBounds))
                );

                var text = line.text;
                var style = BaseUtils.cssNormalization(line.style);

                if(text){
                    self._bodySet.push(
                        paper.text(line.textX + line.textDim.width/2, line.textY + line.textDim.height/2, text)
                            .attr(style)
                            .transform(BaseUtils.makeTranslate(plotBounds))
                    );

                }

            })
        },

        _drawPlotBands:function(paper){

            var plotBands = this.axis._preCalculatePlotBands();
            var plotBounds = this.axis.getPlotBounds();

            var self = this;
            plotBands.forEach(function(bands){
                self._bodySet.push(
                    paper.rect(bands.x, bands.y, bands.width, bands.height)
                        .attr({
                            'stroke':'none',
                            fill:bands.color,
                            'fill-opacity':ColorUtils.getColorOpacity(bands.color)
                        })
                        .transform(BaseUtils.makeTranslate(plotBounds))
                );
            })
        }
    };

    BaseUtils.inherit(BaseAxisVmlRender, BaseRender);
    return BaseAxisVmlRender;

});
/**
 * Created by eason on 15/11/2.
 */

define('render/DateAxisVmlRender',['require','./BaseAxisVmlRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseAxisRender = require('./BaseAxisVmlRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function DateAxisVmlRender(dateAxis){
        BaseAxisRender.call(this, dateAxis);
        this.dateAxis = dateAxis;
    }

    BaseUtils.inherit(DateAxisVmlRender, BaseAxisRender);
    require('./RenderLibrary').register(Constants.DATE_AXIS_VML, DateAxisVmlRender);
});
/**
 * Created by eason on 15/9/25.
 */
define('render/ValueAxisVmlRender',['require','./BaseAxisVmlRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseAxisRender = require('./BaseAxisVmlRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function ValueAxisVmlRender(valueAxis){
        BaseAxisRender.call(this, valueAxis);
        this.valueAxis = valueAxis;
    }

    BaseUtils.inherit(ValueAxisVmlRender, BaseAxisRender);
    require('./RenderLibrary').register(Constants.VALUE_AXIS_VML, ValueAxisVmlRender);

});
/**
 * Created by eason on 15/9/25.
 */

define('render/CategoryAxisVmlRender',['require','./BaseAxisVmlRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseAxisRender = require('./BaseAxisVmlRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function CategoryAxisVmlRender(categoryAxis){
        BaseAxisRender.call(this, categoryAxis);
        this.categoryAxis = categoryAxis;
    }


    BaseUtils.inherit(CategoryAxisVmlRender, BaseAxisRender);
    require('./RenderLibrary').register(Constants.CATEGORY_AXIS_VML, CategoryAxisVmlRender);

});
/**
 * Created by eason on 15/8/14.
 */
define('render/TitleVmlRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function TitleVmlRender(title){
        BaseRender.call(this, title);
        this.title = title;

        //文本实际结束的位置
        this.textEndX = 0;
    }

    TitleVmlRender.prototype = {

        constructor:TitleVmlRender,

        render:function(){

            this._removeAll();

            var cfg = this.title.componentOption;
            var bounds = this.title.bounds;

            var toolbarWidth = this.title.vanchart.getToolbarWidth();
            toolbarWidth = this.title.isFloat ? 0 : toolbarWidth;

            var paper = this.title.getVanchartRender().getRenderRoot();

            this.titleSet = paper.set();

            //背景
            if(cfg.backgroundColor){
                this.titleSet.push(
                    paper.rect(bounds.x, bounds.y, bounds.width, bounds.height)
                        .attr({
                            rx:cfg.borderRadius,
                            ry:cfg.borderRadius,
                            fill:this._getRaphaelFill(cfg.backgroundColor),
                            'stroke-width':0
                        })
                        .attr('fill-opacity', this._getFillOpacity(cfg.backgroundColor))
                )
            }

            if(cfg.useHtml){
                this._drawTitleWithHtml(cfg, bounds, toolbarWidth);
            }else{
                var textDim = BaseUtils.getTextDimension(cfg.text, cfg.style, cfg.useHtml);

                var lineHeight = textDim.height;

                var lineGap = textDim.height * this.title.getLineGapPercent();

                var padding = this.title.getPadding();

                var usedWidth = bounds.width - toolbarWidth;
                var result = BaseUtils.splitText(cfg.text, cfg.style, usedWidth, padding);
                var firstLineWidth = BaseUtils.getTextDimension(result[0], cfg.style, cfg.useHtml).width;

                for(var index = 0, len = result.length; index < len; index++){

                    //ie和chrom的行为不一样
                    var y = bounds.y + padding + (lineHeight + lineGap) * index + lineHeight/2;
                    var singleLine = result[index];

                    var x = bounds.x;
                    var textAnchor;

                    var align = cfg.align || 'left';

                    switch(align){
                        case 'left':
                            x += padding;
                            textAnchor = 'start';
                            this.textEndX = firstLineWidth + x;
                            break;
                        case 'center':
                            x += (bounds.width/2 - toolbarWidth/2);
                            this.textEndX = x + firstLineWidth/2;
                            textAnchor = 'middle';
                            break;
                        case 'right':
                            x += (bounds.width - padding - toolbarWidth);
                            this.textEndX = x;
                            textAnchor = 'end';
                            break;
                    }

                    var textStyle = BaseUtils.cssNormalization(cfg.style);

                    this.titleSet.push(
                        paper.text(x,y,singleLine)
                            .attr(textStyle)
                            .attr('text-anchor', textAnchor)
                    );
                }

            }
        },

        translateX:function(width){

            this.labelDivManager.translateLabelsHorizontal(width);

            var titleBounds = this.title.bounds;
            var gap = titleBounds.x + titleBounds.width - this.textEndX;

            if(gap > Math.abs(width)){
                return;
            }

            var sign = width < 0 ? -1 : 1;

            var detX = Math.min(gap, Math.abs(width)) * sign;

            this.titleSet.forEach(function(component){
                var matrix = component.matrix;

                matrix.translate(detX, 0);
                component.transform(matrix.toTransformString());
            });
        },

        _removeAll:function(){

            if(this.titleSet){
                this.titleSet.remove();
            }

            this.labelDivManager.clearAllLabels();
        }

    };


    BaseUtils.inherit(TitleVmlRender, BaseRender);

    require('./RenderLibrary').register(Constants.TITLE_VML, TitleVmlRender);

    return TitleVmlRender;

});
/**
 * Created by Mitisky on 16/3/24.
 */
define('render/RangeLegendVmlRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function (require) {
    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    var PADDING = 10;

    var WIDTH = 15;
    var HEIGHT = 100;
    var BAR_WIDTH = 15;
    var BAR_HEIGHT = 10;
    var BAR_TEXT_GAP = 5;
    var ITEM_WIDTH = 25;
    var ITEM_GAP = 2;

    var MIN_BAR_CLASS_NAME = 'min-bar-class-name';
    var MAX_BAR_CLASS_NAME = 'max-bar-class-name';

    function RangeLegendVmlRender(rangeLegend){
        BaseRender.call(this, rangeLegend);
        this.rangeLegend = rangeLegend;
    }

    RangeLegendVmlRender.prototype = {
        constructor: RangeLegendVmlRender,

        render: function () {
            this._removeAll();

            var option = this.rangeLegend.componentOption;
            var bounds = this.rangeLegend.bounds;
            this.isHorizontal = this.rangeLegend.isHorizontal();
            var paper = this.rangeLegend.getVanchartRender().getRenderRoot();

            this.background = [];
            this._bodySet = paper.set();

            this._renderVmlBackground(this.background, paper, option, bounds);

            this.rangeLegend.isIntervalLegend ? this._renderInterval(paper, bounds)
                : this._renderGradient(paper, bounds);
        },

        _removeAll:function(){
            if(this.background) {
                this.background.forEach(function (element) {
                    element.remove();
                });
            }

            if(this._bodySet){
                this._bodySet.remove();
            }
        },

        _renderGradient: function (paper, bounds) {
            this.minPos = 0;
            this.maxPos = HEIGHT;
            var labelStyle = this.rangeLegend.componentOption.style;
            var startPos = this.isHorizontal ? bounds.x : bounds.y;
            startPos += ((this.isHorizontal ? bounds.width : bounds.height)- HEIGHT)/2;

            this._bodySet.push(
                paper.rect(this.isHorizontal ? startPos : bounds.x + PADDING,
                    this.isHorizontal ? bounds.y + PADDING : startPos,
                    this.isHorizontal ? HEIGHT : WIDTH,
                    this.isHorizontal ? WIDTH : HEIGHT)
                    .attr('class', 'legend-gradient-background')
                    .attr('rx', 2)
                    .attr('ry', 2)
                    .attr('fill', '#eaeaea')
                    .attr('stroke-width', 0)
            );

            var gradientBar = paper.rect(this.isHorizontal ? startPos : bounds.x + PADDING,
                this.isHorizontal ? bounds.y + PADDING : startPos,
                this.isHorizontal ? HEIGHT : WIDTH,
                this.isHorizontal ? WIDTH : HEIGHT)
                .attr('class', 'legend-gradient-bar')
                .attr('rx', 2)
                .attr('ry', 2)
                .attr('fill', this._getGradientFillColor())
                .attr('stroke-width', 0)
                .attr('clip-rect', this._getGradientClipRect(startPos));

            var minBar = paper.path(this.isHorizontal ? this.rangeLegend.getLeftBarPath() : this.rangeLegend.getTopBarPath())
                .attr('class', MIN_BAR_CLASS_NAME)
                .attr('fill', this.rangeLegend.colorScale(this.minPos/HEIGHT))
                .transform('t' + this._getMinBarPosX(this.isHorizontal, bounds, this.minPos, this.maxPos, startPos) +
                ',' + this._getMinBarPosY(this.isHorizontal, bounds, this.minPos, this.maxPos, startPos))
                .attr('cursor', 'pointer')
                .attr('stroke-width', 0);

            var label = this.rangeLegend.getGradientLabelContent(this.isHorizontal ? this.minPos : this.maxPos);
            var labelDim = BaseUtils.getTextDimension(label, labelStyle, true);
            var minBarLabel = paper.text(this._getMinLabelCenterX(this.isHorizontal, labelDim, bounds, startPos),
                this._getMinLabelCenterY(this.isHorizontal, labelDim, bounds, startPos)
                , label)
                .attr(BaseUtils.cssNormalization(labelStyle));

            var self = this;
            minBar.mousedown(function (event) {
                self._mindraging = true;
                self._mosX = event.screenX;
                self._mosY = event.screenY;
            });
            minBar.mouseup(function (event) {
                self._mindraging = false;
            });
            minBar.mouseout(function(event) {
                self._mindraging = false;
            });
            minBar.mousemove(function (event) {
                if(self._mindraging){
                    var change = 0;
                    if(self.isHorizontal){
                        var temp = self.minPos;
                        self.minPos += Math.round(event.screenX - self._mosX);
                        self.minPos = Math.max(0, self.minPos);
                        self.minPos = Math.min(self.minPos, self.maxPos);
                        change = self.minPos - temp;
                    } else {
                        var temp = self.maxPos;
                        self.maxPos += Math.round(event.screenY - self._mosY);
                        self.maxPos = Math.min(HEIGHT, self.maxPos);
                        self.maxPos = Math.max(self.maxPos, self.minPos);
                        change = self.maxPos - temp;
                    }

                    self._mosX = event.screenX;
                    self._mosY = event.screenY;

                    if(Math.abs(change) >= 1) {
                        minBar
                            .attr('fill', self.rangeLegend.colorScale((self.isHorizontal ? self.minPos : HEIGHT - self.maxPos) / HEIGHT))
                            .transform('t' + self._getMinBarPosX(self.isHorizontal, bounds, self.minPos, self.maxPos, startPos) +
                            ',' + self._getMinBarPosY(self.isHorizontal, bounds, self.minPos, self.maxPos, startPos));
                        var label = self.rangeLegend.getGradientLabelContent(self.isHorizontal ? self.minPos : self.maxPos);
                        var labelDim = BaseUtils.getTextDimension(label, labelStyle, true);
                        minBarLabel
                            .attr('text', label)
                            .attr('x', self._getMinLabelCenterX(self.isHorizontal, labelDim, bounds, startPos))
                            .attr('y', self._getMinLabelCenterY(self.isHorizontal, labelDim, bounds, startPos));
                        gradientBar
                            .attr('clip-rect', self._getGradientClipRect(startPos));
                        self.rangeLegend.refreshPoints(self.minPos, self.maxPos);
                    }
                }
            });

            var maxBar = paper.path(this.isHorizontal ? this.rangeLegend.getRightBarPath() : this.rangeLegend.getBottomBarPath())
                .attr('class', MAX_BAR_CLASS_NAME)
                .attr('fill', this.rangeLegend.colorScale(this.maxPos/HEIGHT))
                .transform('t' + this._getMaxBarPosX(this.isHorizontal, bounds, this.minPos, this.maxPos, startPos) +
                ',' + this._getMaxBarPosY(this.isHorizontal, bounds, this.minPos, this.maxPos, startPos))
                .attr('cursor', 'pointer')
                .attr('stroke-width', 0);

            var maxLabel = this.rangeLegend.getGradientLabelContent(this.isHorizontal ? this.maxPos : this.minPos);
            var maxLabelDim = BaseUtils.getTextDimension(maxLabel, labelStyle, true);
            var maxBarLabel = paper.text(this._getMaxLabelCenterX(this.isHorizontal, maxLabelDim, bounds, startPos),
                this._getMaxLabelCenterY(this.isHorizontal, maxLabelDim, bounds, startPos)
                , maxLabel)
                .attr(BaseUtils.cssNormalization(labelStyle));

            maxBar.mousedown(function () {
                self._maxdraging = true;
                self._mosX = event.screenX;
                self._mosY = event.screenY;
            });
            maxBar.mouseup(function () {
                self._maxdraging = false;
            });
            maxBar.mouseout(function() {
                self._maxdraging = false;
            });

            maxBar.mousemove(function (event) {
                if(self._maxdraging){
                    var change = 0;
                    if(self.isHorizontal){
                        var temp = self.maxPos;
                        self.maxPos += Math.round(event.screenX - self._mosX);
                        self.maxPos = Math.min(HEIGHT, self.maxPos);
                        self.maxPos = Math.max(self.maxPos, self.minPos);
                        change = self.maxPos - temp;
                    } else {
                        var temp = self.minPos;
                        self.minPos += Math.round(event.screenY - self._mosY);
                        self.minPos = Math.max(0, self.minPos);
                        self.minPos = Math.min(self.minPos, self.maxPos);
                        change = self.minPos - temp;
                    }
                    self._mosX = event.screenX;
                    self._mosY = event.screenY;
                    if(Math.abs(change) >= 1) {
                        maxBar
                            .attr('fill', self.rangeLegend.colorScale((self.isHorizontal ? self.maxPos : HEIGHT - self.minPos) / HEIGHT))
                            .transform('t' + self._getMaxBarPosX(self.isHorizontal, bounds, self.minPos, self.maxPos, startPos) +
                            ',' + self._getMaxBarPosY(self.isHorizontal, bounds, self.minPos, self.maxPos, startPos));
                        var maxLabel = self.rangeLegend.getGradientLabelContent(self.isHorizontal ? self.maxPos : self.minPos);
                        var maxLabelDim = BaseUtils.getTextDimension(maxLabel, labelStyle, true);
                        maxBarLabel
                            .attr('text', maxLabel)
                            .attr('x', self._getMaxLabelCenterX(self.isHorizontal, maxLabelDim, bounds, startPos))
                            .attr('y', self._getMaxLabelCenterY(self.isHorizontal, maxLabelDim, bounds, startPos));
                        gradientBar
                            .attr('clip-rect', self._getGradientClipRect(startPos));
                        self.rangeLegend.refreshPoints(self.minPos, self.maxPos);
                    }
                }
            });

            this._bodySet.push([gradientBar, minBar, minBarLabel, maxBar, maxBarLabel]);
        },

        _getMinBarPosX: function (isHorizontal, bounds, minPos, maxPos, startPos) {
            return isHorizontal ? startPos - BAR_HEIGHT + minPos : bounds.x + PADDING + WIDTH;
        },

        _getMinBarPosY: function (isHorizontal, bounds, minPos, maxPos, startPos) {
            return isHorizontal ? bounds.y + PADDING + WIDTH : startPos + maxPos;
        },

        _getMaxBarPosX: function (isHorizontal, bounds, minPos, maxPos, startPos) {
            return isHorizontal ? startPos + maxPos : bounds.x + PADDING + WIDTH;
        },

        _getMaxBarPosY: function (isHorizontal, bounds, minPos, maxPos, startPos) {
            return isHorizontal ? bounds.y + PADDING + WIDTH : startPos - BAR_HEIGHT + minPos;
        },

        _getMinLabelCenterX: function (isHorizontal, labelDim, bounds, startPos) {
            return isHorizontal ? startPos + this.minPos - BAR_HEIGHT/2 - labelDim.width/2
                : bounds.x + PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP + labelDim.width/2;
        },

        _getMinLabelCenterY: function (isHorizontal, labelDim, bounds, startPos) {
            return isHorizontal ? bounds.y + PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP + labelDim.height/2
                : startPos + this.maxPos + BAR_HEIGHT/2;
        },

        _getMaxLabelCenterX: function (isHorizontal, labelDim, bounds, startPos) {
            return isHorizontal ? startPos + this.maxPos + BAR_HEIGHT/2 + labelDim.width/2
                : bounds.x + PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP + labelDim.width/2;
        },

        _getMaxLabelCenterY: function (isHorizontal, labelDim, bounds, startPos) {
            return isHorizontal ? bounds.y + PADDING + WIDTH + BAR_WIDTH + BAR_TEXT_GAP + labelDim.height/2
                : startPos + this.minPos - BAR_HEIGHT/2;
        },

        _getGradientClipRect: function(startPos) {
            var bounds = this.rangeLegend.bounds;
            var x = bounds.x + PADDING;
            var y = startPos + this.minPos;
            var width = WIDTH;
            var height = this.maxPos - this.minPos;
            if(this.isHorizontal){
                x = startPos + this.minPos;
                y = bounds.y + PADDING;
                width = this.maxPos - this.minPos;
                height = WIDTH;
            }
            return x + ',' + y + ',' + width + ',' + height;
        },

        _getGradientFillColor: function() {
            var fillColor = this.isHorizontal ? 0 : 90;

            var valueAndColorArray = this.rangeLegend.getValueAndColors();

            valueAndColorArray.forEach(function(valueAndColor){
                var value = valueAndColor[0];
                var color = valueAndColor[1];
                fillColor += ('-' + color + ':' + value * 100);
            });

            return fillColor;
        },

        _renderInterval: function (paper, bounds) {
            var items =  this.rangeLegend.items;
            var labelStyle = this.rangeLegend.componentOption.style;

            this.isHorizontal ? this._renderHorizontalInterval(paper, bounds, items, labelStyle)
                : this._renderVerticalInterval(paper, bounds, items, labelStyle);
        },

        _renderHorizontalInterval: function (paper, bounds, itemS, labelStyle) {
            var len = this.rangeLegend.items.length;
            var startX = bounds.x + (bounds.width - len * ITEM_WIDTH - (len - 1) * ITEM_GAP)/2;

            for(var i = 0; i < len; i++){
                var item = itemS[i];
                var labelContent = item.label;
                var labelDim = BaseUtils.getTextDimension(labelContent, labelStyle);
                var topLabelY = bounds.y + PADDING;
                var iconY = topLabelY + labelDim.height + BAR_TEXT_GAP;
                var bottomY = iconY + WIDTH + BAR_TEXT_GAP;

                var icon = paper.rect(startX, iconY, ITEM_WIDTH, WIDTH)
                    .attr({
                        fill:item.visible ? item.color : item.hiddenColor,
                        'fill-opacity':1,
                        stroke:'none'
                    });

                var label = paper.text(startX + ITEM_WIDTH/2, i%2 == 0 ? topLabelY + labelDim.height/2 : bottomY + labelDim.height/2, labelContent)
                    .attr('text-anchor', 'middle')
                    .attr(BaseUtils.cssNormalization(labelStyle));

                this._bindMouseEvent(item, icon, label, labelStyle);

                this._bodySet.push([icon, label]);

                startX += (ITEM_WIDTH + ITEM_GAP);
            }
        },

        _renderVerticalInterval: function (paper, bounds, itemS, labelStyle) {
            var iconX = bounds.x + PADDING;
            var labelX = bounds.x + PADDING + WIDTH + BAR_TEXT_GAP;
            var startY = bounds.y + (this.rangeLegend.bounds.height - this.rangeLegend.items.length * ITEM_WIDTH - (this.rangeLegend.items.length - 1) * ITEM_GAP)/2;

            for(var i = 0, len = itemS.length; i < len; i++){
                var item = itemS[i];
                var labelContent = item.label;
                var labelDim = BaseUtils.getTextDimension(labelContent, labelStyle);

                var icon = paper.rect(iconX, startY, WIDTH, ITEM_WIDTH)
                    .attr({
                        fill:item.visible ? item.color : item.hiddenColor,
                        'fill-opacity':1,
                        stroke:'none'
                    });

                var label = paper.text(labelX + labelDim.width/2, startY +  ITEM_WIDTH/ 2, labelContent)
                    .attr('text-anchor', 'middle')
                    .attr(BaseUtils.cssNormalization(labelStyle));

                this._bindMouseEvent(item, icon, label, labelStyle);

                this._bodySet.push([icon, label]);

                startY += (ITEM_WIDTH + ITEM_GAP);
            }

        },

        _bindMouseEvent:function(item, icon, label, labelStyle) {
            icon.attr('cursor', 'pointer');
            label.attr('cursor', 'pointer');

            label.mousemove(function(){
                label.attr('fill', item.hoverColor);
            });

            label.mouseout(function(){
                var textColor = item.visible ? labelStyle.color : item.hiddenColor;
                label.attr('fill', textColor);
            });

            var self = this;
            icon.click(function(){
                self._clickHandler(item, icon, label, labelStyle.color);
            });

            label.click(function () {
                self._clickHandler(item, icon, label, labelStyle.color);
            })
        },

        _clickHandler: function (item, icon, label, labelColor) {
            item.visible = !item.visible;
            var iconColor = item.visible ? item.color : item.hiddenColor;
            var textColor = item.visible ? labelColor : item.hiddenColor;

            label.attr('fill', textColor);
            icon.attr('fill', iconColor);

            item.points.forEach(function (point) {
                point.visible = item.visible;
            });

            this.rangeLegend.vanchart.renderOnlyCharts();
        }

    };

    BaseUtils.inherit(RangeLegendVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.RANGE_LEGEND_VML, RangeLegendVmlRender);

    return RangeLegendVmlRender;
});
/**
 * Created by eason on 15/8/12.
 */
define('render/VanChartVmlRender',['require','./BaseRender','../utils/BaseUtils','../Constants','./RenderLibrary'],function(require){

    var BaseRender = require('./BaseRender');
    var BaseUtils = require('../utils/BaseUtils');
    var Constants = require('../Constants');

    function VanChartVmlRender(vanchart){
        this.vanchart = vanchart;
    }


    VanChartVmlRender.prototype = {

        constructor:VanChartVmlRender,

        render:function(){

            var dom = this.vanchart.getParentDom();

            var width = this.vanchart.chartWidth();
            var height = this.vanchart.chartHeight();

            if(!this.paper){
                this.paper = Raphael(dom, width, height);
            }

            var charts = this.vanchart.getChartRenders();

            var fixed = this.vanchart.getFixedComponentRenders();
            var float = this.vanchart.getFloatComponentRenders();

            this._renderBackground();

            fixed.forEach(function(render){
                render.render();
            });

            charts.forEach(function(render){
                render.render();
            });

            float.forEach(function(render){
                render.render();
            });

            this._renderTrendLine();
        },

        _renderBackground:function(){

            if(this.backgroundSet){
                this.backgroundSet.remove();
            }

            this.backgroundSet = this.paper.set();

            var chartBounds = BaseUtils.makeBounds(0,0,this.vanchart.chartWidth() - 5, this.vanchart.chartHeight() - 5);
            var chartBackground = this.vanchart.getChartBackgroundOption();
            chartBounds = BaseUtils.rectSubPixelOpt(chartBounds.x, chartBounds.y, chartBounds.width - chartBackground.borderWidth, chartBounds.height - chartBackground.borderWidth, chartBackground.borderWidth);

            var plotBounds = this.vanchart.getPlotBounds();
            var plotBackground = this.vanchart.getPlotBackgroundOption();

            this._renderBackgroundWithBounds(chartBackground, chartBounds);
            this._renderBackgroundWithBounds(plotBackground, plotBounds);
        },

        _renderTrendLine:function(){

            if(this.trendLineSet){
                this.trendLineSet.remove();
            }

            this.trendLineSet = this.paper.set();

            var trendLines = this.vanchart.getTrendLineOption();
            var plotBounds = this.vanchart.getPlotBounds();

            var self = this;

            trendLines.forEach(function(d){

                self.trendLineSet.push(
                    self.paper
                        .path(self._getLinePath([d.x1, d.y1], [d.x2, d.y2]))
                        .attr({
                            'stroke':d.trendLine.color,
                            'stroke-width':d.trendLine.width,
                            'stroke-dasharray': d.trendLine.dashStyle == Constants.DASH_TYPE ? '-' : ''
                        })
                );

            });

            this.trendLineSet.transform('t' + plotBounds.x + ',' + plotBounds.y);
        },

        _renderBackgroundWithBounds:function(option, bounds){

            var dom = this.vanchart.getParentDom();
            if(option.chartShadow){
                dom.style.boxShadow = '1px 1px 2px rgba(0,0,0,0.1)';
            }else if(option.plotShadow){
                var width = [5, 3, 1];
                var opacity = [0.05, 0.1, 0.15];
                var shadowBounds = BaseUtils.rectSubPixelOpt(bounds.x, bounds.y, bounds.width, bounds.height, 1);
                for(var i = 0; i < 3; i++){
                    var rect = this.paper.rect(shadowBounds.x, shadowBounds.y, shadowBounds.width, shadowBounds.height)
                                .attr({
                                    fill: 'none',
                                    stroke: 'rgb(0,0,0)',
                                    'stroke-opacity':opacity[i],
                                    'stroke-width': width[i],
                                    'rx': option.borderRadius,
                                    'ry': option.borderRadius
                                })
                                .transform('t1,1');

                    this.backgroundSet.push(rect);
                }

                var rect = this.paper.rect(shadowBounds.x, shadowBounds.y, shadowBounds.width, shadowBounds.height)
                            .attr({
                                fill: 'white',
                                stroke: 'none',
                                'rx': option.borderRadius,
                                'ry': option.borderRadius
                            });

                this.backgroundSet.push(rect);
            }

            var bw = option.borderWidth;
            bounds = BaseUtils.rectSubPixelOpt(bounds.x + bw/2, bounds.y + bw/2, bounds.width - bw, bounds.height - bw, option.borderWidth);

            var rect = this.paper.rect(bounds.x, bounds.y, bounds.width, bounds.height)
                            .attr({
                                fill: this._getRaphaelFill(option.color),
                                stroke: option.borderColor,
                                'stroke-width': option.borderWidth,
                                'rx': option.borderRadius,
                                'ry': option.borderRadius
                            })
                            .attr('fill-opacity', this._getFillOpacity(option.color));

            this.backgroundSet.push(rect);

            if(option.image){
                var image = this.paper.image(option.image, bounds.x, bounds.y, bounds.width, bounds.height);
                this.backgroundSet.push(image);
            }
        },

        getRenderRoot:function(){
            return this.paper;
        },

        remove:function(){
            this.paper.remove();

            var charts = this.vanchart.getChartRenders();
            var components = this.vanchart.getComponentRenders();

            charts.forEach(function(render){
                render.removeDivLabels();
            });

            components.forEach(function(render){
                render.removeDivLabels();
            });
        }
    };

    BaseUtils.inherit(VanChartVmlRender, BaseRender);
    require('./RenderLibrary').register(Constants.VANCHART_VML, VanChartVmlRender);

    return VanChartVmlRender;
});

/**
 * Created by eason on 16/2/5.
 */

define('IERequire',['require','./chart/Pie','./chart/Bar','./chart/Line','./chart/Area','./chart/Gauge','./chart/Radar','./chart/Bubble','./chart/Scatter','./render/RadarVmlRender','./render/GaugeVmlRender','./render/AreaVmlRender','./render/LineVmlRender','./render/BarVmlRender','./render/PieVmlRender','./render/BubbleVmlRender','./render/ScatterVmlRender','./render/DataSheetVmlRender','./render/ToolbarVmlRender','./render/LegendVmlRender','./render/DateAxisVmlRender','./render/ValueAxisVmlRender','./render/CategoryAxisVmlRender','./render/TitleVmlRender','./render/RangeLegendVmlRender','./VanCharts','./render/VanChartVmlRender'],function(require){

    require('./chart/Pie');
    require('./chart/Bar');
    require('./chart/Line');
    require('./chart/Area');
    require('./chart/Gauge');
    require('./chart/Radar');
    require('./chart/Bubble');
    require('./chart/Scatter');

    require('./render/RadarVmlRender');
    require('./render/GaugeVmlRender');
    require('./render/AreaVmlRender');
    require('./render/LineVmlRender');
    require('./render/BarVmlRender');
    require('./render/PieVmlRender');
    require('./render/BubbleVmlRender');
    require('./render/ScatterVmlRender');

    require('./render/DataSheetVmlRender');
    require('./render/ToolbarVmlRender');
    require('./render/LegendVmlRender');
    require('./render/DateAxisVmlRender');
    require('./render/ValueAxisVmlRender');
    require('./render/CategoryAxisVmlRender');
    require('./render/TitleVmlRender');
    require('./render/RangeLegendVmlRender');

    require('./VanCharts');
    require('./render/VanChartVmlRender');
});
/**
 * Created by eason on 15/12/25.
 */

//The modules for your project will be inlined above
//this snippet. Ask almond to synchronously require the
//module value for 'main' here and return it as the
//value to use for the public API for the built file.
var VanCharts = require('VanCharts');

require('chart/Pie');
require('chart/Bar');
require('chart/Line');
require('chart/Area');
require('chart/Gauge');
require('chart/Radar');
require('chart/Scatter');
require('chart/Bubble');

require('render/VanChartSvgRender');
require('render/VanChartVmlRender');

require('render/TitleSvgRender');
require('render/CategoryAxisSvgRender');
require('render/ValueAxisSvgRender');
require('render/DateAxisSvgRender');
require('render/LegendSvgRender');
require('render/ToolbarSvgRender');
require('render/DataSheetSvgRender');
require('render/RangeLegendSvgRender');

require('render/PieSvgRender');
require('render/BarSvgRender');
require('render/LineSvgRender');
require('render/AreaSvgRender');
require('render/GaugeSvgRender');
require('render/RadarSvgRender');
require('render/ScatterSvgRender');
require('render/BubbleSvgRender');

require('render/RadarVmlRender');
require('render/GaugeVmlRender');
require('render/AreaVmlRender');
require('render/LineVmlRender');
require('render/BarVmlRender');
require('render/PieVmlRender');
require('render/ScatterVmlRender');
require('render/BubbleVmlRender');

require('render/DataSheetVmlRender');
require('render/ToolbarVmlRender');
require('render/LegendVmlRender');
require('render/DateAxisVmlRender');
require('render/ValueAxisVmlRender');
require('render/CategoryAxisVmlRender');
require('render/TitleVmlRender');
require('render/RangeLegendVmlRender');


return VanCharts;
}));
