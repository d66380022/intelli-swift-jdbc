package com.fr.swift.config.entity;

import com.fr.swift.config.SwiftConfigConstants;
import com.fr.swift.config.bean.Convert;
import com.fr.swift.config.bean.SegmentKeyBean;
import com.fr.swift.config.convert.hibernate.URIConverter;
import com.fr.swift.cube.io.Types;
import com.fr.swift.db.SwiftDatabase;
import com.fr.third.javax.persistence.Column;
import com.fr.third.javax.persistence.Entity;
import com.fr.third.javax.persistence.EnumType;
import com.fr.third.javax.persistence.Enumerated;
import com.fr.third.javax.persistence.Id;
import com.fr.third.javax.persistence.Table;

import java.net.URI;

/**
 * @author yee
 * @date 2018/5/24
 */
@Entity
@Table(name = "fine_swift_segments")
public class SwiftSegmentEntity implements Convert<SegmentKeyBean> {
    @Id
    private String id;

    @Column(name = SwiftConfigConstants.SegmentConfig.COLUMN_SEGMENT_OWNER)
    private String segmentOwner;

    @Column(name = SwiftConfigConstants.SegmentConfig.COLUMN_SEGMENT_URI, length = SwiftConfigConstants.LONG_TEXT_LENGTH)
    @com.fr.third.javax.persistence.Convert(
            converter = URIConverter.class
    )
    private URI segmentUri;

    @Column(name = SwiftConfigConstants.SegmentConfig.COLUMN_SEGMENT_ORDER)
    private int segmentOrder;

    @Column(name = SwiftConfigConstants.SegmentConfig.COLUMN_STORE_TYPE)
    @Enumerated(EnumType.STRING)
    private Types.StoreType storeType;
    @Column(name = "swiftSchema")
    @Enumerated(EnumType.STRING)
    private SwiftDatabase swiftSchema;

    public String getSegmentOwner() {
        return segmentOwner;
    }

    public void setSegmentOwner(String segmentOwner) {
        this.segmentOwner = segmentOwner;
    }

    public URI getSegmentUri() {
        return segmentUri;
    }

    public void setSegmentUri(URI segmentUri) {
        this.segmentUri = segmentUri;
    }

    public int getSegmentOrder() {
        return segmentOrder;
    }

    public void setSegmentOrder(int segmentOrder) {
        this.segmentOrder = segmentOrder;
    }

    public Types.StoreType getStoreType() {
        return storeType;
    }

    public void setStoreType(Types.StoreType storeType) {
        this.storeType = storeType;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public SwiftDatabase getSwiftSchema() {
        return swiftSchema;
    }

    public void setSwiftSchema(SwiftDatabase swiftSchema) {
        this.swiftSchema = swiftSchema;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }

        SwiftSegmentEntity entity = (SwiftSegmentEntity) o;

        if (segmentOrder != entity.segmentOrder) {
            return false;
        }
        if (id != null ? !id.equals(entity.id) : entity.id != null) {
            return false;
        }
        if (segmentOwner != null ? !segmentOwner.equals(entity.segmentOwner) : entity.segmentOwner != null) {
            return false;
        }
        if (segmentUri != null ? !segmentUri.equals(entity.segmentUri) : entity.segmentUri != null) {
            return false;
        }
        if (storeType != entity.storeType) {
            return false;
        }
        return swiftSchema == entity.swiftSchema;
    }

    @Override
    public int hashCode() {
        int result = id != null ? id.hashCode() : 0;
        result = 31 * result + (segmentOwner != null ? segmentOwner.hashCode() : 0);
        result = 31 * result + (segmentUri != null ? segmentUri.hashCode() : 0);
        result = 31 * result + segmentOrder;
        result = 31 * result + (storeType != null ? storeType.hashCode() : 0);
        result = 31 * result + (swiftSchema != null ? swiftSchema.hashCode() : 0);
        return result;
    }

    @Override
    public SegmentKeyBean convert() {
        return new SegmentKeyBean(segmentOwner, segmentUri, segmentOrder, storeType, swiftSchema);
    }
}
