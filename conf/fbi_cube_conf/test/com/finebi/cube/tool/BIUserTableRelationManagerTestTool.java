package com.finebi.cube.tool;


import com.finebi.cube.conf.relation.BIUserTableRelationManager;

/**
 * Created by Connery on 2016/1/14.
 */
public class BIUserTableRelationManagerTestTool {

    public static BIUserTableRelationManager generateUserTableRelationManager() {
        return new BIUserTableRelationManager(999);
    }
}