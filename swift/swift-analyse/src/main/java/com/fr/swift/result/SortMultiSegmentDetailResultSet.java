package com.fr.swift.result;

import com.fr.swift.query.query.Query;
import com.fr.swift.query.sort.Sort;
import com.fr.swift.result.qrs.QueryResultSet;
import com.fr.swift.source.Row;
import com.fr.swift.source.SwiftMetaData;
import com.fr.swift.structure.Pair;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;

/**
 * Created by Xiaolei.Liu on 2018/1/24
 * @author yee
 */
public class SortMultiSegmentDetailResultSet extends BaseDetailQueryResultSet implements DetailResultSet {

    private List<Query<QueryResultSet>> queries;
    private List<Pair<Sort, Comparator>> comparators;
    private int rowCount;
    private Iterator<List<Row>> mergerIterator;
    private Iterator<Row> rowIterator;

    public SortMultiSegmentDetailResultSet(int fetchSize, int rowCount, SortedQueryResultSetMerger.SortedRowIterator mergerIterator) throws SQLException {
        super(fetchSize);
        this.rowCount = rowCount;
        this.mergerIterator = mergerIterator;
    }

    @Override
    public List<Row> getPage() {
        if (mergerIterator.hasNext()) {
            return mergerIterator.next();
        }
        return new ArrayList<Row>(0);
    }

    @Override
    public boolean hasNextPage() {
        return mergerIterator.hasNext();
    }

    @Override
    public int getRowCount() {
        return rowCount;
    }

    @Override
    public SwiftMetaData getMetaData() {
        return metaData;
    }

    @Override
    public boolean hasNext() {
        if (rowIterator == null) {
            rowIterator = new SwiftRowIteratorImpl(this);
        }
        return rowIterator.hasNext();
    }

    @Override
    public Row getNextRow() {
        return rowIterator.next();
    }

    @Override
    public void close() {

    }


}
