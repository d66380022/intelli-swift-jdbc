package com.finebi.cube.api;

import com.fr.bi.base.BIUser;
import com.fr.bi.common.factory.BIFactoryHelper;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * This class created on 2016/4/21.
 *
 * @author Connery
 * @since 4.0
 */
public class UserAnalysisCubeDataLoaderCreator implements ICubeDataLoaderCreator {
    public static String XML_TAG = "UserAnalysisCubeDataLoaderCreator";
    private Map<BIUser, ICubeDataLoader> container = new ConcurrentHashMap<BIUser, ICubeDataLoader>();
    private static UserAnalysisCubeDataLoaderCreator instance;

    public static UserAnalysisCubeDataLoaderCreator getInstance() {
        if (instance != null) {
            return instance;
        } else {
            synchronized (UserAnalysisCubeDataLoaderCreator.class) {
                if (instance == null) {
                    instance = new UserAnalysisCubeDataLoaderCreator();
                }
                return instance;
            }
        }
    }

    public ICubeDataLoader fetchCubeLoader(BIUser user) {
        if (container.containsKey(user)) {
            return container.get(user);
        } else {
            synchronized (container) {
                if (!container.containsKey(user)) {
                    ICubeDataLoader loader = BIFactoryHelper.getObject(ICubeDataLoader.class, user);
                    container.put(user, loader);
                    return loader;
                } else {
                    return container.get(user);
                }
            }
        }

    }

    @Override
    public void clear(long userId) {
        if (container.containsKey(new BIUser(userId))) {
            synchronized (container) {
                if (container.containsKey(new BIUser(userId))) {
                    container.remove(new BIUser(userId));
                }
            }
        }
    }

    public ICubeDataLoader fetchCubeLoader(long user) {
        return fetchCubeLoader(new BIUser(user));
    }

    private UserAnalysisCubeDataLoaderCreator() {

    }
}
