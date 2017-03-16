package com.finebi.cube.impl.message;

import com.finebi.cube.impl.router.status.BIStatusID;
import com.finebi.cube.message.*;
import com.finebi.cube.router.status.IWaitingStatusTag;
import com.fr.general.ComparatorUtils;

/**
 * This class created on 2016/3/22.
 *
 * @author Connery
 * @since 4.0
 */
public class BIMessage implements IMessage {
    final private IMessageTopic topicTag;
    final private IMessageFragment fragmentTag;
    final private IMessageStatus statusTag;
    final private IMessageBody body;

    public BIMessage(IMessageTopic topicTag, IMessageFragment fragmentTag, IMessageStatus statusTag, IMessageBody body) {
        this.topicTag = topicTag;
        this.fragmentTag = fragmentTag;
        this.statusTag = statusTag;
        this.body = body;
    }

    @Override
    public IMessageTopic getTopic() {
        return topicTag;
    }

    @Override
    public IMessageFragment getFragment() {
        return fragmentTag;
    }

    @Override
    public IMessageStatus getStatus() {
        return statusTag;
    }

    @Override
    public IMessageBody getBody() {
        return body;
    }

    @Override
    public boolean isTopicMessage() {
        return topicTag != null && fragmentTag == null && statusTag == null;
    }

    @Override
    public boolean isFragmentMessage() {
        return fragmentTag != null && statusTag == null;
    }

    @Override
    public boolean isStatusMessage() {
        return statusTag != null;
    }

    public boolean isStopStatus() {
        if (isStatusMessage()) {
            return ComparatorUtils.equals(getStatus().getStatusTag().getStatusID(), new BIStatusID(IWaitingStatusTag.STATUS_STOP_TAG));
        }
        return false;
    }

    @Override
    public String toString() {
        final StringBuffer sb = new StringBuffer("BIMessage{");
        sb.append("T:").append(topicTag);
        sb.append(", F:").append(fragmentTag);
        sb.append(", S:").append(statusTag);
        sb.append(", B:").append(body);
        sb.append('}');
        return sb.toString();
    }
}
