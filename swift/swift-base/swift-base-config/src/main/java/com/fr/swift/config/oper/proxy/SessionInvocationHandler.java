package com.fr.swift.config.oper.proxy;

import com.fr.swift.config.oper.ConfigCriteria;
import com.fr.swift.config.oper.ConfigQuery;
import com.fr.swift.config.oper.ConfigTransaction;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

/**
 * @author yee
 * @date 2018-11-28
 */
public class SessionInvocationHandler implements InvocationHandler {

    private Object object;

    public SessionInvocationHandler(Object object) {
        this.object = object;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        Object obj = method.invoke(object, args);
        if (method.getName().equals("createCriteria")) {
            return Proxy.newProxyInstance(object.getClass().getClassLoader(), new Class[]{ConfigCriteria.class}, new DirectInvocationHandler(obj));
        }
        if (method.getName().equals("createQuery")) {
            return Proxy.newProxyInstance(object.getClass().getClassLoader(), new Class[]{ConfigQuery.class}, new DirectInvocationHandler(obj));
        }

        if (method.getName().equals("beginTransaction")) {
            return Proxy.newProxyInstance(object.getClass().getClassLoader(), new Class[]{ConfigTransaction.class}, new DirectInvocationHandler(obj));
        }
        return obj;
    }
}
