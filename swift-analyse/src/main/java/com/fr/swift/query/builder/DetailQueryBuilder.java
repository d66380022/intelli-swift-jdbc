package com.fr.swift.query.builder;

import com.fr.stable.StringUtils;
import com.fr.swift.exception.SwiftSegmentAbsentException;
import com.fr.swift.log.SwiftLoggers;
import com.fr.swift.query.info.bean.parser.QueryInfoParser;
import com.fr.swift.query.info.bean.query.DetailQueryInfoBean;
import com.fr.swift.query.info.bean.query.QueryInfoBeanFactory;
import com.fr.swift.query.info.detail.DetailQueryInfo;
import com.fr.swift.query.post.PrepareMetaDataQuery;
import com.fr.swift.query.query.Query;
import com.fr.swift.query.query.QueryType;
import com.fr.swift.query.remote.RemoteQueryImpl;
import com.fr.swift.result.DetailResultSet;
import com.fr.swift.segment.SegmentDestination;
import com.fr.swift.segment.SegmentLocationProvider;
import com.fr.swift.source.SourceKey;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Created by pony on 2017/12/13.
 */
class DetailQueryBuilder {

    /**
     * 给最外层查询节点（查询服务节点）条用并构建query，根据segment分布信息区分本地query和远程query
     *
     * @param bean
     * @return
     */
    static Query<DetailResultSet> buildQuery(DetailQueryInfoBean bean) throws Exception {
        DetailQueryInfo info = (DetailQueryInfo) QueryInfoParser.parse(bean);
        Query<DetailResultSet> query;
        if (info.hasSort()){
            query = buildQuery(info, bean, LocalDetailQueryBuilder.GROUP);
        } else {
            query = buildQuery(info, bean, LocalDetailQueryBuilder.NORMAL);
        }
        return new PrepareMetaDataQuery<DetailResultSet>(query, bean);
    }

    /**
     * 处理另一个节点转发过来的查询，并且当前节点上包含查询的部分分块数据
     *
     * @param info 查询信息
     * @return
     */
    static Query<DetailResultSet> buildLocalPartQuery(DetailQueryInfo info) {
        if (info.hasSort()) {
            return LocalDetailQueryBuilder.GROUP.buildLocalQuery(info);
        } else {
            return LocalDetailQueryBuilder.NORMAL.buildLocalQuery(info);
        }
    }

    /**
     * 处理另一个节点转发过来的查询，并且当前节点上包含查询的全部分块数据
     *
     * @param info 查询信息
     * @return
     */
    static Query<DetailResultSet> buildLocalAllQuery(DetailQueryInfo info) {
        if (info.hasSort()) {
            return LocalDetailQueryBuilder.GROUP.buildLocalQuery(info);
        } else {
            return LocalDetailQueryBuilder.NORMAL.buildLocalQuery(info);
        }
    }

    private static Query<DetailResultSet> buildQuery(DetailQueryInfo info,
                                                     DetailQueryInfoBean queryBean, LocalDetailQueryBuilder builder) throws Exception {
        SourceKey table = info.getTable();
        List<SegmentDestination> uris = SegmentLocationProvider.getInstance().getSegmentLocationURI(table);
        if (uris == null || uris.isEmpty()){
            throw new SwiftSegmentAbsentException("no such table");
        }
        if (isAllLocal(uris)) {
            SwiftLoggers.getLogger().debug("All query destinations are local. Destination size {}. First segment is {}", uris.size(), uris.get(0).getSegmentId());
            return builder.buildLocalQuery(info);
        }
        List<Query<DetailResultSet>> queries = new ArrayList<Query<DetailResultSet>>();
        Set<String> localURIs = getLocalSegments(uris);
        if (!localURIs.isEmpty()) {
            info.setQuerySegment(localURIs);
            queries.add(builder.buildLocalQuery(info));
        }
        Map<String, List<SegmentDestination>> map = groupSegmentInfoByClusterId(uris);
        for (Map.Entry<String, List<SegmentDestination>> entry : map.entrySet()) {
            queryBean.setQueryType(QueryType.LOCAL_DETAIL);
            SegmentDestination destination = entry.getValue().get(0);
            queryBean.setQueryDestination(destination);
            SwiftLoggers.getLogger().debug("Build Remote Query. Destination from {} - > {} segment is {}",
                    destination.getCurrentNode(), destination.getClusterId(), destination.getSegmentId());
            queryBean.setQuerySegments(getQuerySegments(entry.getValue()));
            String jsonString = QueryInfoBeanFactory.queryBean2String(queryBean);
            queries.add(new RemoteQueryImpl<DetailResultSet>(jsonString, destination));
        }
        // TODO: 2018/9/17 这边要把queryType设置回去。。先改个阻塞bug，暂时这么处理
        queryBean.setQueryType(QueryType.DETAIL);
        return builder.buildResultQuery(queries, info);
    }

    static Set<String> getQuerySegments(List<SegmentDestination> uris) {
        Set<String> set = new HashSet<String>();
        for (SegmentDestination destination : uris) {
            String uri = destination.getSegmentId();
            if (uri != null) {
                set.add(uri);
            }
        }
        return set;
    }

    static Set<String> getLocalSegments(List<SegmentDestination> uris) {
        Set<String> set = new HashSet<String>();
        for (SegmentDestination destination : uris) {
            if (!destination.isRemote() && !StringUtils.isEmpty(destination.getSegmentId())) {
                set.add(destination.getSegmentId());
            }
        }
        return set;
    }

    static Map<String, List<SegmentDestination>> groupSegmentInfoByClusterId(List<SegmentDestination> uris) {
        Map<String, List<SegmentDestination>> map = new HashMap<String, List<SegmentDestination>>();
        for (SegmentDestination destination : uris) {
            if (destination.isRemote()) {
                String clusterId = destination.getClusterId();
                if (!map.containsKey(clusterId)) {
                    map.put(clusterId, new ArrayList<SegmentDestination>());
                }
                map.get(clusterId).add(destination);
            }
        }
        return map;
    }

    static boolean isAllLocal(List<SegmentDestination> uris) {
        for (SegmentDestination uri : uris) {
            if (uri.isRemote()) {
                return false;
            }
        }
        return true;
    }
}
