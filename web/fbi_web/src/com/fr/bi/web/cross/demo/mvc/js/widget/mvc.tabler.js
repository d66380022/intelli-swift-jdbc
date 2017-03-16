TablerView = BI.inherit(BI.View, {
    _defaultConfig: function () {
        return BI.extend(TablerView.superclass._defaultConfig.apply(this, arguments), {
            baseCls: "bi-mvc-tabler bi-mvc-layout"
        })
    },

    _init: function () {
        TablerView.superclass._init.apply(this, arguments);
    },

    _itemsCreator: function (curr) {
        return [{
            children: [{
                text: "节点1" + "   第" + curr + "页的数据",
                children: [{
                    text: "子节点1",
                    children: [{
                        text: "叶节点1",
                        values: [{text: 11}, {text: 12}, {text: 11}, {text: 12}, {text: 11}, {text: 12}, {text: 112}]
                    }, {
                        text: "叶节点2",
                        values: [{text: 21}, {text: 22}, {text: 21}, {text: 22}, {text: 21}, {text: 22}, {text: 122}]
                    }],
                    values: [{text: 101}, {text: 102}, {text: 101}, {text: 102}, {text: 101}, {text: 102}, {text: 1102}]
                }, {
                    text: "子节点2",
                    children: [{
                        text: "叶节点3",
                        values: [{text: 31}, {text: 32}, {text: 31}, {text: 32}, {text: 31}, {text: 32}, {text: 132}]
                    }, {
                        text: "叶节点4",
                        values: [{text: 41}, {text: 42}, {text: 41}, {text: 42}, {text: 41}, {text: 42}, {text: 142}]
                    }],
                    values: [{text: 201}, {text: 202}, {text: 201}, {text: 202}, {text: 201}, {text: 202}, {text: 1202}]
                }, {
                    text: "子节点3",
                    children: [{
                        text: "叶节点5",
                        values: [{text: 51}, {text: 52}, {text: 51}, {text: 52}, {text: 51}, {text: 52}, {text: 152}]
                    }],
                    values: [{text: 301}, {text: 302}, {text: 301}, {text: 302}, {text: 301}, {text: 302}, {text: 1302}]
                }],
                values: [{text: 1001}, {text: 1002}, {text: 1001}, {text: 1002}, {text: 1001}, {text: 1002}, {text: 11002}]
            }, {
                text: "节点2" + "   第" + curr + "页的数据",
                values: [{text: 2001}, {text: 2002}, {text: 2001}, {text: 2002}, {text: 2001}, {text: 2002}, {text: 12002}]
            }],
            values: [{text: 12001}, {text: 12002}, {text: 12001}, {text: 12002}, {text: 12001}, {text: 12002}, {text: 112002}]
        }];
    },

    _crossItemsCreator: function (curr) {
        return [{
            children: [{
                text: "节点1" + "   第" + curr + "页的数据",
                children: [{
                    text: "子节点1"
                }, {
                    text: "子节点2"
                }],
                values: [0]
            }, {
                text: "节点2" + "   第" + curr + "页的数据",
                children: [{
                    text: "子节点3"
                }, {
                    text: "子节点4"
                }],
                values: [0]
            }],
            values: [0]
        }];
    },

    _render: function (vessel) {
        var self = this;
        var items = this._itemsCreator(1);

        var header = [{
            text: "header1"
        }, {
            text: "header2"
        }, {
            text: "header3"
        }, {
            text: "金额",
            tag: 1
        }, {
            text: "金额",
            tag: 2
        }, {
            text: "金额",
            tag: 3
        }, {
            text: "金额",
            tag: 4
        }, {
            text: "金额",
            tag: 5
        }, {
            text: "金额",
            tag: 6
        }, {
            text: "金额",
            tag: 7
        }];

        var crossHeader = [{
            text: "cross1"
        }, {
            text: "cross2"
        }];

        var crossItems = this._crossItemsCreator(1);

        this.tabler = BI.createWidget({
            type: "bi.tabler",
            pager: {
                pages: 18,
                groups: 5,
                curr: 1,
                first: "首页",
                last: "尾页"
            },
            tabler: {
                columnSize: ["", "", "", "", "", "", "", "", "", ""],
                header: header,
                items: items,
                crossHeader: crossHeader,
                crossItems: crossItems
            }
        });

        this.tabler.on(BI.Tabler.EVENT_CHANGE, function () {
            var curr = this.getCurrentPage();
            this.populate({
                items: self._itemsCreator(curr),
                crossItems: self._crossItemsCreator(curr)
            })
        });

        BI.createWidget({
            type: "bi.grid",
            element: vessel,
            columns: 1,
            rows: 1,
            items: [{
                column: 0,
                row: 0,
                el: this.tabler
            }]
        })
    }
});

TablerModel = BI.inherit(BI.Model, {});