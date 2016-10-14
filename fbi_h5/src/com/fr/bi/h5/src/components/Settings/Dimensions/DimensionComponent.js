import mixin from 'react-mixin'
import {findDOMNode} from 'react-dom'
import Immutable from 'immutable'

import {
    ReactComponentWithPureRenderMixin, ReactComponentWithImmutableRenderMixin,
    cn, sc, math, isNil, emptyFunction, shallowEqual, immutableShallowEqual, isEqual, isEmpty, each,
    translateDOMPositionXY, requestAnimationFrame
} from 'core'
import React, {
    Component,
    StyleSheet,
    Text,
    PixelRatio,
    ListView,
    View,
    Fetch,
    Promise,
    TouchableHighlight
} from 'lib'

import {Colors, Size, Template, Widget, Dimension, Target} from 'data'

import {Layout, CenterLayout, HorizontalCenterLayout, VerticalCenterLayout} from 'layout';

import {Button, IconButton, TextButton, Table} from 'base'

import {MultiSelectorWidget} from 'widgets'

import DimensionComponentHelper from './DimensionComponentHelper'


class DimensionComponent extends Component {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {};

    static defaultProps = {
        wId: '',
        $widget: null,
        dId: '',
        value: {}
    };

    state = {};

    _getNextState(props, state = {}) {

    }

    componentWillMount() {

    }

    componentDidMount() {

    }

    render() {
        const {...props} = this.props, {...state} = this.state;
        this._helper = new DimensionComponentHelper(props, this.context);
        return <Button onPress={()=> {
            this.props.onSelected(this._helper.switchSelect());
        }}>
            <Layout cross='center' style={styles.wrapper}>
                <IconButton style={styles.icon} invalid={true} selected={this._helper.isUsed()}
                            className={'single-select-font'}/>
                <Text style={sc([[styles.disabledText, !this._helper.isUsed()]])} textAlign={'left'}
                      effect={false}>{props.value.text}</Text>
            </Layout>
        </Button>
    }

    componentWillReceiveProps(nextProps) {

    }

    componentWillUpdate(nextProps, nextState) {

    }

    componentDidUpdate(prevProps, prevState) {

    }

    componentWillUnmount() {

    }

}
mixin.onClass(DimensionComponent, ReactComponentWithImmutableRenderMixin);
const styles = StyleSheet.create({
    wrapper: {
        paddingLeft: 20,
        paddingRight: 20,
        height: Size.ITEM_HEIGHT,
        borderBottomWidth: 1 / PixelRatio.get(),
        borderBottomColor: Colors.BORDER
    },
    icon: {
        width: 40,
    },

    disabledText: {
        color: Colors.DISABLED
    }
});
export default DimensionComponent
