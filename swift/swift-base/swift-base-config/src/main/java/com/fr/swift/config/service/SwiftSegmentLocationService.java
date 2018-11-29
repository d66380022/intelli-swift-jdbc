package com.fr.swift.config.service;

import com.fr.swift.config.bean.SegLocationBean;

import java.util.List;
import java.util.Map;

/**
 * @author yee
 * @date 2018/7/24
 */
public interface SwiftSegmentLocationService extends ConfigService<SegLocationBean> {
    boolean delete(String table, String clusterId);

    boolean delete(String table, String clusterId, String segKey);

    Map<String, List<SegLocationBean>> findAll();
}
