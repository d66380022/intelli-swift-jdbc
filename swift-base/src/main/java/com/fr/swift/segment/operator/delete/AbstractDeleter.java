package com.fr.swift.segment.operator.delete;

import com.fr.swift.bitmap.ImmutableBitMap;
import com.fr.swift.exception.meta.SwiftMetaDataException;
import com.fr.swift.segment.Segment;
import com.fr.swift.segment.column.BitmapIndexedColumn;
import com.fr.swift.segment.column.ColumnKey;
import com.fr.swift.segment.column.DictionaryEncodedColumn;
import com.fr.swift.segment.operator.Deleter;
import com.fr.swift.source.Row;
import com.fr.swift.source.SwiftResultSet;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * This class created on 2018/3/26
 *
 * @author Lucifer
 * @description
 * @since Advanced FineBI Analysis 1.0
 */
public abstract class AbstractDeleter implements Deleter {

    protected Segment segment;

    private Map<String, DictionaryEncodedColumn> dictionaryEncodedColumnMap;
    private Map<String, BitmapIndexedColumn> bitmapIndexedColumnMap;
    private ImmutableBitMap allShowIndex;

    public AbstractDeleter(Segment segment) throws SwiftMetaDataException {
        this.segment = segment;

        dictionaryEncodedColumnMap = new HashMap<String, DictionaryEncodedColumn>();
        bitmapIndexedColumnMap = new HashMap<String, BitmapIndexedColumn>();
        for (String columnName : segment.getMetaData().getFieldNames()) {
            DictionaryEncodedColumn dictionaryEncodedColumn = segment.getColumn(new ColumnKey(columnName)).getDictionaryEncodedColumn();
            BitmapIndexedColumn bitmapIndexedColumn = segment.getColumn(new ColumnKey(columnName)).getBitmapIndex();
            dictionaryEncodedColumnMap.put(columnName, dictionaryEncodedColumn);
            bitmapIndexedColumnMap.put(columnName, bitmapIndexedColumn);
        }
        this.allShowIndex = segment.getAllShowIndex();
    }

    @Override
    public boolean deleteData(List<Row> rowList) throws Exception {
        for (Row row : rowList) {
            String field = segment.getMetaData().getColumnName(1);
            int decreaseIndex = dictionaryEncodedColumnMap.get(field).getIndex(row.getValue(0));
            if (decreaseIndex != -1) {
                ImmutableBitMap bitMap = bitmapIndexedColumnMap.get(field).getBitMapIndex(decreaseIndex);
                allShowIndex = allShowIndex.getAndNot(bitMap);
                segment.putAllShowIndex(allShowIndex);
            }
        }
        release();
        return true;
    }

    @Override
    public boolean deleteData(SwiftResultSet swiftResultSet) throws Exception {
        while (swiftResultSet.next()) {
            List<String> fields = swiftResultSet.getMetaData().getFieldNames();
            Row row = swiftResultSet.getRowData();

            List<ImmutableBitMap> bitMaps = new ArrayList<ImmutableBitMap>();

            for (int i = 0; i < fields.size(); i++) {
                String field = fields.get(i);
                int decreaseIndex = dictionaryEncodedColumnMap.get(field).getIndex(row.getValue(i));
                if (decreaseIndex != -1) {
                    ImmutableBitMap bitMap = bitmapIndexedColumnMap.get(field).getBitMapIndex(decreaseIndex);
                    bitMaps.add(bitMap);
                }
            }
            if (bitMaps.size() > 0) {
                ImmutableBitMap bitMap1 = bitMaps.get(0);
                for (ImmutableBitMap bitMap : bitMaps) {
                    bitMap1 = bitMap1.getAnd(bitMap);
                }
                allShowIndex = allShowIndex.getAndNot(bitMap1);
                segment.putAllShowIndex(allShowIndex);
            }
        }
        release();
        return true;
    }

    public abstract void release();
}
