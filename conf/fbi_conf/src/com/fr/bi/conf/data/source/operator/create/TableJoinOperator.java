package com.fr.bi.conf.data.source.operator.create;

import com.finebi.cube.api.ICubeDataLoader;
import com.finebi.cube.api.ICubeTableService;
import com.fr.bi.base.annotation.BICoreField;
import com.fr.bi.common.inter.Traversal;
import com.fr.bi.stable.constant.BIBaseConstant;
import com.fr.bi.stable.constant.DBConstant;
import com.fr.bi.stable.data.db.BIDataValue;
import com.fr.bi.stable.data.db.IPersistentTable;
import com.fr.bi.stable.data.db.PersistentField;
import com.fr.bi.stable.data.source.CubeTableSource;
import com.fr.bi.stable.engine.index.key.IndexKey;
import com.fr.bi.stable.gvi.GroupValueIndex;
import com.fr.bi.stable.gvi.RoaringGroupValueIndex;
import com.fr.bi.stable.gvi.traversal.SingleRowTraversalAction;
import com.fr.bi.stable.operation.sort.comp.ASCComparator;
import com.fr.bi.stable.operation.sort.comp.CastDoubleASCComparator;
import com.fr.bi.stable.operation.sort.comp.CastFloatASCComparator;
import com.fr.bi.stable.operation.sort.comp.CastLongASCComparator;
import com.fr.cache.list.IntList;
import com.fr.json.JSONArray;
import com.fr.json.JSONObject;
import com.fr.stable.StringUtils;
import com.fr.stable.xml.XMLPrintWriter;
import com.fr.stable.xml.XMLableReader;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Created by GUY on 2015/3/5.
 */
public class TableJoinOperator extends AbstractCreateTableETLOperator {

    public static final String XML_TAG = "TableJoinOperator";

    private static final long serialVersionUID = -5395803667343259448L;

    @BICoreField
    private int type;

    @BICoreField
    private List<JoinColumn> columns = new ArrayList<JoinColumn>();
    @BICoreField
    private List<String> left = new ArrayList<String>();
    @BICoreField
    private List<String> right = new ArrayList<String>();

    public TableJoinOperator(long userId) {
        super(userId);
    }

    public TableJoinOperator() {
    }

    public TableJoinOperator(int type, List<JoinColumn> columns, List<String> left, List<String> right) {
        this.type = type;
        this.columns = columns;
        this.left = left;
        this.right = right;
    }

    @Override
    public String xmlTag() {
        return XML_TAG;
    }

    /**
     * 将Java对象转换成JSON对象
     *
     * @return JSON对象
     * @throws Exception
     */
    @Override
    public JSONObject createJSON() throws Exception {
        JSONObject jo = new JSONObject();
        jo.put("join_style", type);
        JSONArray lr = new JSONArray();
        for (int i = 0; i < left.size(); i++) {
            JSONArray value = new JSONArray();
            value.put(left.get(i));
            value.put(right.get(i));
            lr.put(value);
        }
        jo.put("join_fields", lr);
        JSONArray fields = new JSONArray();
        for (int i = 0; i < columns.size(); i++) {
            fields.put(columns.get(i).createJSON());
        }
        jo.put("join_names", fields);
        return jo;
    }


    @Override
    public IPersistentTable getBITable(IPersistentTable[] tables) {
        IPersistentTable persistentTable = getBITable();
        IPersistentTable leftT = tables[0];
        IPersistentTable rightT = tables[1];
        for (int i = 0; i < columns.size(); i++) {
            PersistentField column = columns.get(i).isLeft() ? leftT.getField(columns.get(i).getColumnName()) : rightT.getField(columns.get(i).getColumnName());
            if (column != null) {
                persistentTable.addColumn(new PersistentField(columns.get(i).getName(), columns.get(i).getName(), column.getSqlType(), column.isPrimaryKey(), column.getColumnSize(), column.getScale()));
            }
        }
        return persistentTable;
    }

    @Override
    public int writeSimpleIndex(Traversal<BIDataValue> travel, List<? extends CubeTableSource> parents, ICubeDataLoader loader) {
        if (parents == null || parents.size() != 2) {
            throw new RuntimeException("invalid join parents");
        }
        ICubeTableService lti = loader.getTableIndex(parents.get(0));
        ICubeTableService rti = loader.getTableIndex(parents.get(1));
        return write(travel, lti, rti, parents);
    }

    private int write(Traversal<BIDataValue> travel, ICubeTableService lti, ICubeTableService rti, List<? extends CubeTableSource> parents) {
        if (type == BIBaseConstant.JOINTYPE.OUTER) {
            return writeIndex(travel, lti, rti, false, true, parents);
        } else if (type == BIBaseConstant.JOINTYPE.INNER) {
            return writeIndex(travel, lti, rti, true, false, parents);
        } else if (type == BIBaseConstant.JOINTYPE.LEFT) {
            return writeIndex(travel, lti, rti, false, false, parents);
        } else {
            return writeRIndex(travel, lti, rti, parents);
        }
    }

    @Override
    public int writePartIndex(Traversal<BIDataValue> travel, List<? extends CubeTableSource> parents, ICubeDataLoader loader, int startCol, int start, int end) {
        if (parents == null || parents.size() != 2) {
            throw new RuntimeException("invalid join parents");
        }
        ICubeTableService lti = loader.getTableIndex(parents.get(0), start, end);
        ICubeTableService rti = loader.getTableIndex(parents.get(1), start, end);
        return write(travel, lti, rti, parents);
    }


    private int writeRIndex(Traversal<BIDataValue> travel, ICubeTableService lti, ICubeTableService rti, List<? extends CubeTableSource> parents) {
        int rLen = getColumnSize(false);
        int lLeftCount = getColumnSize(true);
        int index = 0;
        ValueIterator lValueIterator = new ValueIterator(lti, toIndexKeyArray(left));
        ValueIterator rValueIterator = new ValueIterator(rti, toIndexKeyArray(right));
        ValuesAndGVI lValuesAndGVI = lValueIterator.next();
        Comparator[] comparators = new Comparator[left.size()];
        for (int i = 0; i < comparators.length; i++) {
            if (lti.getColumns().get(new IndexKey(left.get(i))).getFieldType() == DBConstant.COLUMN.STRING) {
                comparators[i] = BIBaseConstant.COMPARATOR.STRING.ASC_STRING_CC;
            } else {
                comparators[i] = generateComparatorByType(lti.getColumns().get(new IndexKey(left.get(i))).getClassType(), rti.getColumns().get(new IndexKey(right.get(i))).getClassType());
            }
        }
        while (rValueIterator.hasNext()) {
            ValuesAndGVI rValuesAndGVI = rValueIterator.next();
            int result = rValuesAndGVI.compareTo(lValuesAndGVI, comparators);
            if (result < 0) {
                index = writeROneGroup(travel, lti, rti, rLen, lLeftCount, index, null, rValuesAndGVI.gvi, parents);
            } else if (result == 0) {
                index = writeROneGroup(travel, lti, rti, rLen, lLeftCount, index, lValuesAndGVI.gvi, rValuesAndGVI.gvi, parents);
            } else {
                while (rValuesAndGVI.compareTo(lValuesAndGVI, comparators) > 0) {
                    lValuesAndGVI = lValueIterator.next();
                }
                if (rValuesAndGVI.compareTo(lValuesAndGVI, comparators) == 0) {
                    index = writeROneGroup(travel, lti, rti, rLen, lLeftCount, index, lValuesAndGVI.gvi, rValuesAndGVI.gvi, parents);
                } else {
                    index = writeROneGroup(travel, lti, rti, rLen, lLeftCount, index, null, rValuesAndGVI.gvi, parents);
                }
            }
        }
        return index;
    }

    private Comparator generateComparatorByType(int type1, int type2) {
        if (type1 == DBConstant.CLASS.DOUBLE || type2 == DBConstant.CLASS.DOUBLE) {
            return new CastDoubleASCComparator();
        }
        if (type1 == DBConstant.CLASS.FLOAT || type2 == DBConstant.CLASS.FLOAT) {
            return new CastFloatASCComparator();
        }
        if (type1 == DBConstant.CLASS.LONG || type2 == DBConstant.CLASS.LONG) {
            return new CastLongASCComparator();
        }
        return new ASCComparator();
    }

    private int writeROneGroup(Traversal<BIDataValue> travel, ICubeTableService lti, ICubeTableService rti, int rLen, int lLeftCount, int index, GroupValueIndex lGvi, GroupValueIndex rGvi, List<? extends CubeTableSource> parents) {
        final IntList list = new IntList();
        rGvi.Traversal(new SingleRowTraversalAction() {
            @Override
            public void actionPerformed(int row) {
                list.add(row);
            }
        });

        for (int i = 0; i < list.size(); i++) {
            Object[] rvalues = new Object[rLen];
            for (int j = 0; j < rLen; j++) {
                rvalues[j] = rti.getColumnDetailReader(new IndexKey(columns.get(j < right.size() ? j : lLeftCount + j).getColumnName())).getValue(list.get(i));
            }
            index = rtravel(travel, lti, rLen, index, lGvi, rvalues, lLeftCount, parents);
        }
        return index;
    }

    private int rtravel(Traversal<BIDataValue> travel, ICubeTableService lti, int rlen, int index, GroupValueIndex lGvi, Object[] rvalues, int lleftCount, List<? extends CubeTableSource> parents) {
        if (lGvi == null || lGvi.getRowsCountWithData() == 0) {
            for (int j = 0; j < rlen; j++) {
                travel.actionPerformed(new BIDataValue(index, j < right.size() ? j : lleftCount + j, rvalues[j]));
            }
            IPersistentTable table = getBITable(getPersisTables(parents));
            for (int j = 0; j < lleftCount; j++) {
                travel.actionPerformed(new BIDataValue(index, right.size() + j, (table.getField(right.size() + j).getBIType() == DBConstant.COLUMN.STRING) ? "" : null));
            }
            index++;
        } else {
            final IntList lRows = new IntList();
            lGvi.Traversal(new SingleRowTraversalAction() {
                @Override
                public void actionPerformed(int rowIndices) {
                    lRows.add(rowIndices);
                }
            });
            for (int k = 0; k < lRows.size(); k++) {
                for (int j = 0; j < rlen; j++) {
                    travel.actionPerformed(new BIDataValue(index, j < right.size() ? j : lleftCount + j, rvalues[j]));
                }
                for (int j = right.size(); j < lti.getColumns().size(); j++) {
                    travel.actionPerformed(new BIDataValue(index, j, lti.getColumnDetailReader(new IndexKey(columns.get(j).getColumnName())).getValue(lRows.get(k))));
                }
                index++;
            }
        }
        return index;
    }


    private int writeIndex(Traversal<BIDataValue> travel, ICubeTableService lti, ICubeTableService rti, boolean nullContinue, boolean writeLeft, List<? extends CubeTableSource> parents) {
        int lLen = getColumnSize(true);
        int index = 0;
        ValueIterator lValueIterator = new ValueIterator(lti, toIndexKeyArray(left));
        ValueIterator rValueIterator = new ValueIterator(rti, toIndexKeyArray(right));
        GroupValueIndex rTotalGvi = new RoaringGroupValueIndex();
        ValuesAndGVI rValuesAndGVI = rValueIterator.next();
        Comparator[] comparators = new Comparator[left.size()];
        for (int i = 0; i < comparators.length; i++) {
            if (lti.getColumns().get(new IndexKey(left.get(i))).getFieldType() == DBConstant.COLUMN.STRING) {
                comparators[i] = BIBaseConstant.COMPARATOR.STRING.ASC_STRING_CC;
            } else {
                comparators[i] = generateComparatorByType(lti.getColumns().get(new IndexKey(left.get(i))).getClassType(), rti.getColumns().get(new IndexKey(right.get(i))).getClassType());
            }
        }
        while (lValueIterator.hasNext()) {
            ValuesAndGVI lValuesAndGVI = lValueIterator.next();
            int result = lValuesAndGVI.compareTo(rValuesAndGVI, comparators);
            if (result < 0) {
                if (!nullContinue) {
                    index = writeOneGroup(travel, lti, rti, lLen, index, lValuesAndGVI.gvi, null, parents);
                }
            } else if (result == 0) {
                index = writeOneGroup(travel, lti, rti, lLen, index, lValuesAndGVI.gvi, rValuesAndGVI.gvi, parents);
                rValuesAndGVI = rValueIterator.next();
            } else {
                if (writeLeft) {
                    rTotalGvi.or(rValuesAndGVI.gvi);
                }
                while (lValuesAndGVI.compareTo(rValuesAndGVI, comparators) > 0) {
                    rValuesAndGVI = rValueIterator.next();
                    if (writeLeft && lValuesAndGVI.compareTo(rValuesAndGVI, comparators) > 0) {
                        rTotalGvi.or(rValuesAndGVI.gvi);
                    }
                }
                result = lValuesAndGVI.compareTo(rValuesAndGVI, comparators);
                if (result == 0) {
                    index = writeOneGroup(travel, lti, rti, lLen, index, lValuesAndGVI.gvi, rValuesAndGVI.gvi, parents);
                    rValuesAndGVI = rValueIterator.next();
                } else if (result < 0) {
                    if (!nullContinue) {
                        index = writeOneGroup(travel, lti, rti, lLen, index, lValuesAndGVI.gvi, null, parents);
                    }
                }
            }
        }
        if (writeLeft) {
                if (rValuesAndGVI != null && !rValuesAndGVI.gvi.isAllEmpty()) {
                    rTotalGvi.or(rValuesAndGVI.gvi);
                }
                while (rValueIterator.hasNext()) {
                    rTotalGvi.or(rValueIterator.next().gvi);
                }
        }
        return writeLeft ? writeLeftIndex(rTotalGvi, rti, lLen, index, travel, parents) : index;
    }

    private IndexKey[] toIndexKeyArray(List<String> fields) {
        IndexKey[] indexKeys = new IndexKey[fields.size()];
        for (int i = 0; i < indexKeys.length; i++) {
            indexKeys[i] = new IndexKey(fields.get(i));
        }
        return indexKeys;
    }

    private int writeOneGroup(Traversal<BIDataValue> travel, ICubeTableService lti, ICubeTableService rti, int lLen, int index, GroupValueIndex lGvi, GroupValueIndex rGvi, List<? extends CubeTableSource> parents) {
        final IntList list = new IntList();
        lGvi.Traversal(new SingleRowTraversalAction() {
            @Override
            public void actionPerformed(int row) {
                list.add(row);
            }
        });
        for (int i = 0; i < list.size(); i++) {
            Object[] lvalues = new Object[lLen];
            for (int j = 0; j < lLen; j++) {
                lvalues[j] = lti.getColumnDetailReader(new IndexKey(columns.get(j).getColumnName())).getValue(list.get(i));
            }
            index = travel(travel, rti, lLen, index, rGvi, lvalues, parents);
        }
        return index;
    }

    private IPersistentTable[] getPersisTables(List<? extends CubeTableSource> parents) {
        List<IPersistentTable> tables = new ArrayList<IPersistentTable>();
        for (CubeTableSource table : parents) {
            tables.add(table.getPersistentTable());
        }
        return tables.toArray(new IPersistentTable[tables.size()]);
    }

    private int travel(Traversal<BIDataValue> travel, ICubeTableService rti, int llen, int index, GroupValueIndex gvi, Object[] lvalues, List<? extends CubeTableSource> parents) {
        if (gvi == null || gvi.getRowsCountWithData() == 0) {
            for (int j = 0; j < llen; j++) {
                travel.actionPerformed(new BIDataValue(index, j, lvalues[j]));
            }
            IPersistentTable table = getBITable(getPersisTables(parents));
            for (int j = llen; j < columns.size(); j++) {
                travel.actionPerformed(new BIDataValue(index, j, (table.getField(j).getBIType() == DBConstant.COLUMN.STRING) ? "" : null));
            }
            index++;
        } else {
            final IntList rRows = new IntList();
            gvi.Traversal(new SingleRowTraversalAction() {
                @Override
                public void actionPerformed(int rowIndices) {
                    rRows.add(rowIndices);
                }
            });
            for (int k = 0; k < rRows.size(); k++) {
                for (int j = 0; j < llen; j++) {
                    travel.actionPerformed(new BIDataValue(index, j, lvalues[j]));
                }
                for (int j = llen; j < columns.size(); j++) {
                    travel.actionPerformed(new BIDataValue(index, j, rti.getColumnDetailReader(new IndexKey(columns.get(j).getColumnName())).getValue(rRows.get(k))));
                }
                index++;
            }
        }
        return index;
    }

    private int writeLeftIndex(GroupValueIndex rTotalGvi, ICubeTableService rti, int llen, int index, Traversal<BIDataValue> travel, List<? extends CubeTableSource> parents) {
        final IntList rLeftRows = new IntList();
        rTotalGvi.Traversal(new SingleRowTraversalAction() {
            @Override
            public void actionPerformed(int rowIndices) {
                rLeftRows.add(rowIndices);
            }
        });
        IPersistentTable table = getBITable(getPersisTables(parents));
        for (int k = 0; k < rLeftRows.size(); k++) {
            for (int j = 0; j < llen; j++) {
                travel.actionPerformed(new BIDataValue(index, j, (table.getField(j).getBIType() == DBConstant.COLUMN.STRING) ? "" : null));
            }
            for (int j = llen; j < columns.size(); j++) {
                travel.actionPerformed(new BIDataValue(index, j, rti.getColumnDetailReader(new IndexKey(columns.get(j).getColumnName())).getValue(rLeftRows.get(k))));
            }
            index++;
        }
        return index;
    }


    /**
     * join_style: [], join类型
     * join_fields: [[ firstFieldName, secondFieldName]],
     * join_names: [  ],
     * table_name: 表名
     * 将JSON对象转换成java对象
     *
     * @param jo json对象
     * @throws Exception
     */
    @Override
    public void parseJSON(JSONObject jo) throws Exception {
        type = jo.getInt("join_style");
        JSONArray lr = jo.getJSONArray("join_fields");
        for (int i = 0; i < lr.length(); i++) {
            JSONArray value = lr.getJSONArray(i);
            left.add(value.getString(0));
            right.add(value.getString(1));
        }
        JSONArray fields = jo.getJSONArray("join_names");
        for (int i = 0; i < fields.length(); i++) {
            JoinColumn column = new JoinColumn();
            column.parseJSON(fields.getJSONObject(i));
            columns.add(column);
        }
    }

    /**
     * 读取子节点，应该会被XMLableReader.readXMLObject()调用多次
     *
     * @param reader XML读取对象
     * @see com.fr.stable.xml.XMLableReader
     */
    @Override
    public void readXML(XMLableReader reader) {
        super.readXML(reader);
        if (reader.isChildNode()) {
            String tag = reader.getTagName();
            if ("left".equals(tag)) {
                left.add(reader.getAttrAsString("value", StringUtils.EMPTY));
            } else if ("right".equals(tag)) {
                right.add(reader.getAttrAsString("value", StringUtils.EMPTY));
            } else if (JoinColumn.XML_TAG.equals(tag)) {
                JoinColumn column = new JoinColumn();
                column.readXML(reader);
                columns.add(column);
            }
        }
        if (reader.isAttr()) {
            type = reader.getAttrAsInt("type", 1);
        }
    }

    /**
     * Write XML.<br>
     * The method will be invoked when save data to XML file.<br>
     * May override the method to save your own data.
     * 从性能上面考虑，大家用writer.print(), 而不是writer.println()
     *
     * @param writer XML写入对象
     */
    @Override
    public void writeXML(XMLPrintWriter writer) {
        writer.startTAG(XML_TAG);
        super.writeXML(writer);
        writer.attr("type", type);
        for (int i = 0; i < left.size(); i++) {
            writer.startTAG("left");
            writer.attr("value", left.get(i));
            writer.end();
        }
        for (int i = 0; i < right.size(); i++) {
            writer.startTAG("right");
            writer.attr("value", right.get(i));
            writer.end();
        }
        for (int i = 0; i < columns.size(); i++) {
            columns.get(i).writeXML(writer);
        }
        writer.end();

    }

    public int getColumnSize(boolean isLeft) {
        int i = 0;
        for (JoinColumn c : columns) {
            if (c.isLeft() == isLeft) {
                i++;
            }
        }
        return i;
    }
}