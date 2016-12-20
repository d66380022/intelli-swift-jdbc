/**
 * 水平方向居中容器
 * @class BI.HorizontalAdaptLayout
 * @extends BI.Layout
 */
BI.HorizontalAdaptLayout = BI.inherit(BI.Layout, {
    _defaultConfig: function () {
        return BI.extend(BI.HorizontalAdaptLayout.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-horizontal-adapt-layout",
            verticalAlign: BI.VerticalAlign.Middle,
            columnSize: [],
            hgap: 0,
            vgap: 0,
            lgap: 0,
            rgap: 0,
            tgap: 0,
            bgap: 0
        });
    },
    _init: function () {
        BI.HorizontalAdaptLayout.superclass._init.apply(this, arguments);
        var table = BI.createWidget({
            type: "bi.layout",
            tagName: "table",
            attribute: {"cellspacing": 0, "cellpadding": 0}
        });
        table.element.css({
            "position": "relative",
            "width": "100%",
            "white-space": "nowrap",
            "border-spacing": "0px",
            "border": "none",
            "border-collapse": "separate"
        }).appendTo(this.element);
        this.tr = BI.createWidget({
            type: "bi.layout",
            tagName: "tr"
        });
        this.tr.element.appendTo(table.element);
        this.populate(this.options.items);
    },

    _addElement: function (i, item) {
        var o = this.options;
        var td;
        var width = o.columnSize[i] <= 1 ? (o.columnSize[i] * 100 + "%") : o.columnSize[i];
        if (!this.hasWidget(this.getName() + i)) {
            var w = BI.createWidget(item);
            w.element.css({"position": "relative", "top": "0", "left": "0", "margin": "0px auto"});
            td = BI.createWidget({
                type: "bi.default",
                tagName: "td",
                attributes: {
                    width: width
                },
                items: [w]
            });
            this.addWidget(this.getName() + i, td);
        } else {
            td = this.getWidgetByName(this.getName() + i);
            td.element.attr("width", width);
        }
        td.element.css({"max-width": o.columnSize[i] + "px"});
        if (i === 0) {
            td.element.addClass("first-element");
        }
        td.element.css({
            "position": "relative",
            "vertical-align": o.verticalAlign,
            "margin": "0",
            "padding": "0",
            "border": "none"
        });
        if (o.hgap + o.lgap + (item.lgap || 0) !== 0) {
            w.element.css({
                "margin-left": o.hgap + o.lgap + (item.lgap || 0) + "px"
            })
        }
        if (o.hgap + o.rgap + (item.rgap || 0) !== 0) {
            w.element.css({
                "margin-right": o.hgap + o.rgap + (item.rgap || 0) + "px"
            })
        }
        if (o.vgap + o.tgap + (item.tgap || 0) !== 0) {
            w.element.css({
                "margin-top": o.vgap + o.tgap + (item.tgap || 0) + "px"
            })
        }
        if (o.vgap + o.bgap + (item.bgap || 0) !== 0) {
            w.element.css({
                "margin-bottom": o.vgap + o.bgap + (item.bgap || 0) + "px"
            })
        }
        return td;
    },

    render: function () {
        if (!BI.isEmpty(this.widgets)) {
            this.tr.element.append(this.hang());
        }
    },

    clear: function () {
        this.hang();
        this.widgets = {};
        this.tr.empty();
    },

    empty: function () {
        BI.each(this.widgets, function (i, wi) {
            wi.destroy();
        });
        this.widgets = {};
        this.tr.empty();
    },

    resize: function () {
        // console.log("horizontal_adapt布局不需要resize");
    },

    addItem: function (item) {
        var w = this._addElement(this.options.items.length, item);
        this.options.items.push(item);
        w.element.appendTo(this.tr.element);
        return w;
    },

    populate: function (items) {
        BI.HorizontalAdaptLayout.superclass.populate.apply(this, arguments);
        this.render();
    }
});
$.shortcut('bi.horizontal_adapt', BI.HorizontalAdaptLayout);