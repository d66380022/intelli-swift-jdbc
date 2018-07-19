package com.fr.swift.service;

import com.fr.swift.db.Where;
import com.fr.swift.source.SourceKey;
import com.fr.swift.source.SwiftResultSet;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;

/**
 * @author yee
 * @date 2018/6/5
 */
public interface HistoryService extends SwiftService {
    /**
     * 查询
     *
     * @param queryInfo 查询描述
     * @return 数据
     */
    SwiftResultSet query(String queryInfo) throws Exception;

    /**
     * 从共享存储加载
     *
     * @param remoteUris
     * @throws IOException
     */
    void load(Map<String, Set<URI>> remoteUris, boolean replace) throws IOException;

    boolean delete(SourceKey sourceKey, Where where) throws Exception;
}
