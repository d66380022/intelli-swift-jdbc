package com.fr.swift.jdbc.stream;

import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.io.ObjectStreamClass;
import java.io.StreamCorruptedException;

/**
 * @author yee
 * @date 2018/8/26
 */
public class CompactObjectInputStream extends ObjectInputStream {
    private final ClassLoader classResolver;

    public CompactObjectInputStream(InputStream in, ClassLoader classResolver) throws IOException {
        super(in);
        this.classResolver = classResolver;
    }

    @Override
    protected void readStreamHeader() throws IOException {
        int version = this.readByte() & 255;
        if (version != 5) {
            throw new StreamCorruptedException("Unsupported version: " + version);
        }
    }

    @Override
    protected ObjectStreamClass readClassDescriptor() throws IOException, ClassNotFoundException {
        int type = this.read();
        if (type < 0) {
            throw new EOFException();
        } else {
            switch (type) {
                case 0:
                    return super.readClassDescriptor();
                case 1:
                    String className = this.readUTF();
                    Class<?> clazz = this.classResolver.loadClass(className);
                    return ObjectStreamClass.lookupAny(clazz);
                default:
                    throw new StreamCorruptedException("Unexpected class descriptor type: " + type);
            }
        }
    }

    @Override
    protected Class<?> resolveClass(ObjectStreamClass desc) throws IOException, ClassNotFoundException {
        Class clazz;
        try {
            clazz = this.classResolver.loadClass(desc.getName());
        } catch (ClassNotFoundException var4) {
            clazz = super.resolveClass(desc);
        }

        return clazz;
    }
}