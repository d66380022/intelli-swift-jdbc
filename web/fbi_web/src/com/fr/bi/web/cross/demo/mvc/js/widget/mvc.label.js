LabelView = BI.inherit(BI.View, {
    _defaultConfig: function () {
        return BI.extend(LabelView.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-mvc-label bi-mvc-layout"
        })
    },

    _init: function () {
        LabelView.superclass._init.apply(this, arguments);
    },

    _render: function (vessel) {

        BI.createWidget({
            element: vessel,
            type: "bi.vertical",
            items: [{
                type: "bi.label",
                cls: "layout-bg6",
                text: "这是一个label控件，默认居中",
                textAlign: "center"
            }, {
                type: "bi.label",
                cls: "layout-bg1",
                text: "这是一个label控件, 高度为30，默认居中",
                textAlign: "center",
                height: 30
            }, {
                type: "bi.label",
                cls: "layout-bg3",
                text: "这是一个label控件，使用水平居左",
                textAlign: "left",
                height: 30
            }, {
                type: "bi.label",
                cls: "layout-bg2",
                text: "这是一个label控件，whiteSpace是normal，不设置高度，为了演示这个是真的是normal的，我凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数",
                whiteSpace: "normal"
            }, {
                type: "bi.label",
                cls: "layout-bg5",
                text: "这是一个label控件，whiteSpace是默认的nowrap，不设置高度，为了演示这个是真的是nowrap的，我凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数"
            }, {
                type: "bi.label",
                cls: "layout-bg7",
                text: "这是一个label控件，whiteSpace是默认的nowrap，高度为30，为了演示这个是真的是nowrap的，我凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数",
                height: 30
            }, {
                type: "bi.label",
                cls: "layout-bg3",
                text: "这是一个label控件，whiteSpace设置为normal，高度为60，为了演示这个是真的是normal的，我凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数",
                whiteSpace: "normal",
                height: 60
            }, {
                type: "bi.label",
                cls: "layout-bg5",
                text: "这是一个label控件，whiteSpace设置为normal，textHeight控制text的lineHeight，这样可以实现换行效果，我凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数",
                whiteSpace: "normal",
                textHeight: 30,
                height: 60
            }, {
                type: "bi.label",
                cls: "layout-bg1",
                text: "这是一个label控件，whiteSpace设置为nowrap，textWidth控制text的width",
                textWidth: 200,
                height: 60
            }, {
                type: "bi.label",
                cls: "layout-bg8",
                text: "这是一个label控件，whiteSpace设置为normal，textWidth控制text的width，这样可以实现换行效果，我凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数，凑点字数",
                whiteSpace: "normal",
                textWidth: 200,
                height: 60
            }, {
                type: "bi.label",
                cls: "layout-bg7",
                text: "whiteSpace为默认的nowrap，高度设置为60，宽度设置为300",
                height: 60,
                width: 300
            }, {
                type: "bi.label",
                cls: "layout-bg6",
                text: "设置了宽度300，高度60，whiteSpace设置为normal",
                whiteSpace: "normal",
                width: 300,
                height: 60
            }, {
                type: "bi.label",
                cls: "layout-bg8",
                text: "textWidth设置为200，textHeight设置为30，width设置300，凑点字数看效果",
                width: 300,
                textWidth: 200,
                textHeight: 30,
                height: 60,
                whiteSpace: "normal"
            }, {
                type: "bi.label",
                cls: "layout-bg1",
                text: "textWidth设置为200，width设置300，看下水平居左的换行效果",
                textAlign: "left",
                width: 300,
                textWidth: 200,
                textHeight: 30,
                height: 60,
                whiteSpace: "normal"
            }, {
                type: "bi.label",
                cls: "layout-bg2",
                text: "使用默认的nowrap，再去设置textHeight，只会有一行的效果",
                textAlign: "left",
                width: 300,
                textWidth: 200,
                textHeight: 30,
                height: 60
            }, {
                type: "bi.left",
                items: [{
                    type: "bi.label",
                    cls: "layout-bg3",
                    text: "在float布局中自适应的,不设高度和宽度，文字多长这个就有多长"
                }],
                height: 30
            }, {
                type: "bi.left",
                items: [{
                    type: "bi.label",
                    cls: "layout-bg4",
                    text: "在float布局中自适应的，设置了宽度200，后面还有",
                    width: 200
                }],
                height: 30
            }, {
                type: "bi.left",
                items: [{
                    type: "bi.label",
                    text: "在float布局中自适应的，设置了高度，文字多长这个就有多长",
                    cls: "layout-bg5",
                    height: 30
                }],
                height: 30
            }],
            hgap: 300,
            vgap: 20
        });
    }
});

LabelModel = BI.inherit(BI.Model, {
    _defaultConfig: function () {
        return BI.extend(LabelModel.superclass._defaultConfig.apply(this, arguments), {})
    },

    _init: function () {
        LabelModel.superclass._init.apply(this, arguments);
    }
});