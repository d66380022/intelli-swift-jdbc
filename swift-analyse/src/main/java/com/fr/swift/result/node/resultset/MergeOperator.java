package com.fr.swift.result.node.resultset;

import com.fr.swift.query.aggregator.Aggregator;
import com.fr.swift.query.result.group.GroupNodeMergeUtils;
import com.fr.swift.result.GroupNode;
import com.fr.swift.result.NodeMergeResultSet;
import com.fr.swift.result.NodeMergeResultSetImpl;
import com.fr.swift.result.NodeResultSet;
import com.fr.swift.structure.Pair;
import com.fr.swift.util.function.Function;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Created by Lyon on 2018/7/27.
 */
class MergeOperator implements Function<List<NodeMergeResultSet<GroupNode>>, NodeMergeResultSet<GroupNode>> {

    private int fetchSize;
    private List<Aggregator> aggregators;
    private List<Comparator<GroupNode>> comparators;

    MergeOperator(int fetchSize, List<Aggregator> aggregators, List<Comparator<GroupNode>> comparators) {
        this.fetchSize = fetchSize;
        this.aggregators = aggregators;
        this.comparators = comparators;
    }

    @Override
    public NodeMergeResultSet<GroupNode> apply(List<NodeMergeResultSet<GroupNode>> groupByResultSets) {
        List<GroupNode> roots = new ArrayList<GroupNode>();
        List<Map<Integer, Object>> totalDictionaries = new ArrayList<Map<Integer, Object>>();
        for (NodeResultSet resultSet : groupByResultSets) {
            Pair<GroupNode, List<Map<Integer, Object>>> pair = resultSet.getPage();
            roots.add(pair.getKey());
            addDictionaries(pair.getValue(), totalDictionaries);
        }
        GroupNode mergeNode = GroupNodeMergeUtils.merge(roots, comparators, aggregators);
        return new NodeMergeResultSetImpl<GroupNode>(fetchSize, mergeNode, totalDictionaries);
    }

    private void addDictionaries(List<Map<Integer, Object>> dictionaries,
                                 List<Map<Integer, Object>> totalDictionaries) {
        if (totalDictionaries.size() == 0) {
            for (int i = 0; i < dictionaries.size(); i++) {
                totalDictionaries.add(new HashMap<Integer, Object>());
            }
        }
        for (int i = 0; i < dictionaries.size(); i++) {
            totalDictionaries.get(i).putAll(dictionaries.get(i));
        }
    }
}
