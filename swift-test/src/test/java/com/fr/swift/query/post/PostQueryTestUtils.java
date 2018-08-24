package com.fr.swift.query.post;

import com.fr.swift.db.impl.SwiftDatabase;
import com.fr.swift.query.aggregator.AggregatorValue;
import com.fr.swift.query.aggregator.DoubleAmountAggregatorValue;
import com.fr.swift.query.post.utils.ResultJoinUtils;
import com.fr.swift.result.GroupNode;
import com.fr.swift.source.SwiftMetaData;
import com.fr.swift.source.SwiftMetaDataColumn;
import com.fr.swift.structure.Pair;
import com.fr.swift.structure.iterator.MapperIterator;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * Created by Lyon on 2018/6/4.
 */
public class PostQueryTestUtils {

    public static GroupNode createNode(int dimensionSize, Pair<Object[], int[]>[] rows) {
        List<Pair<Object[], int[]>> list = new ArrayList<>(Arrays.asList(rows));
        Iterator<Pair<List<Object>, AggregatorValue[]>> rowIt = new MapperIterator<>(list.iterator(), p -> {
            AggregatorValue[] values = new AggregatorValue[p.getValue().length];
            for (int i = 0; i < values.length; i++) {
                values[i] = new DoubleAmountAggregatorValue(p.getValue()[i]);
            }
            return Pair.of(Arrays.asList(p.getKey()), values);
        });
        return ResultJoinUtils.createNode(dimensionSize, rowIt);
    }

    public static SwiftMetaData createMetaData(String tableName, String[] columnNames) {
        return new SwiftMetaData() {
            @Override
            public SwiftDatabase.Schema getSwiftSchema() {
                return null;
            }

            @Override
            public String getSchemaName() {
                return null;
            }

            @Override
            public String getTableName() {
                return tableName;
            }

            @Override
            public int getColumnCount() {
                return columnNames.length;
            }

            @Override
            public String getColumnName(int i) {
                return columnNames[i];
            }

            @Override
            public String getColumnRemark(int index) {
                return null;
            }

            @Override
            public int getColumnType(int index) {
                return 0;
            }

            @Override
            public int getPrecision(int index) {
                return 0;
            }

            @Override
            public int getScale(int index) {
                return 0;
            }

            @Override
            public SwiftMetaDataColumn getColumn(int index) {
                return null;
            }

            @Override
            public SwiftMetaDataColumn getColumn(String columnName) {
                return null;
            }

            @Override
            public int getColumnIndex(String columnName) {
                return 0;
            }

            @Override
            public String getColumnId(int index) {
                return null;
            }

            @Override
            public String getColumnId(String columnName) {
                return null;
            }

            @Override
            public String getRemark() {
                return null;
            }

            @Override
            public List<String> getFieldNames() {
                return new ArrayList<>(Arrays.asList(columnNames));
            }
        };
    }

    public static List<SwiftMetaData> createMetaData(String[] tableNames, String[][] columnNames) {
        List<SwiftMetaData> metaData = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            final int index = i;
            metaData.add(createMetaData(tableNames[index], columnNames[index]));
        }
        return metaData;
    }
}
