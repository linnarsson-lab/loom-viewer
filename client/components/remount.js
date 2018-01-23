import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { debounce } from 'lodash';

import MobileDetect from 'mobile-detect';
const isMobile = new MobileDetect(window.navigator.userAgent).mobile();

function shouldResize(state) {
	return (
		!state.ignoreWidth && window.innerWidth !== state.windowWidth ||
		!state.ignoreHeight && window.innerHeight !== state.windowHeight ||
		state.pixelRatio !== window.devicePixelRatio
	);
}

function resizeDesktop() {
	if (!this.state.resizing && shouldResize(this.state)) {
		this.setState(() => {
			return {
				resizing: true,
				windowWidth: window.innerWidth,
				windowHeight: window.innerHeight,
				pixelRatio: window.devicePixelRatio,
			};
		});
	}
}

function resizeMobile() {
	const { state } = this;
	const isPortrait = window.innerHeight > window.innerWidth;
	const portraitChanged = isPortrait !== state.isPortrait;
	if (!state.resizing && portraitChanged && shouldResize(state)) {
		this.setState(() => {
			return {
				resizing: true,
				isPortrait,
				windowWidth: window.innerWidth,
				windowHeight: window.innerHeight,
				pixelRatio: window.devicePixelRatio,
			};
		});
	}
}

// Props to remove from Remount's props before passing them to the children
const purgeTree = {
	children: 0,
	ignoreResize: 0,
	ignoreWidth: 0,
	ignoreHeight: 0,
	watchedVal: 0,
	delay: 0,
	onUnmount: 0,
	onRemount: 0,
};

export class Remount extends PureComponent {
	constructor(...args) {
		super(...args);

		// On certain mobile devices, the software keyboard
		// triggers a resize event. In that case, we do not
		// want to trigger the remount. Instead, we want
		// to trigger a resize only when switching between
		// portrait and landscape modes
		const resizeFunc = isMobile ?
			resizeMobile.bind(this) :
			resizeDesktop.bind(this);

		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// (unmount, resize, remount)-ing of the child nodes.
		// We default to 200 ms
		const delay = this.props.delay !== undefined ?
			this.props.delay :
			200;
		this.triggerResize = debounce(resizeFunc, delay);

		this.state = {
			resizing: true,
			isPortrait: window.innerHeight > window.innerWidth,
			ignoreResize: this.props.ignoreResize,
			ignoreWidth: this.props.ignoreWidth,
			ignoreHeight: this.props.ignoreHeight,
			windowWidth: window.innerWidth,
			windowHeight: window.innerHeight,
			pixelRatio: window.devicePixelRatio,
		};

	}

	componentDidMount() {
		if (!this.state.ignoreResize) {
			window.addEventListener('resize', this.triggerResize);
		}
		this.setState(() => {
			return {
				resizing: false,
			};
		});
	}

	componentWillUnmount() {
		if (!this.state.ignoreResize) {
			window.removeEventListener('resize', this.triggerResize);
		}
		this.triggerResize.cancel();

		if (this.props.onUnmount) {
			this.props.onUnmount();
		}
	}

	componentWillReceiveProps(nProps) {
		const { props } = this;
		let newState = {},
			changedState = false;

		if (props.ignoreResize !== nProps.ignoreResize) {
			newState.ignoreResize = nProps.ignoreResize;
			changedState = true;
			if (nProps.ignoreResize) {
				// If we ignore resizing altogether, remove triggers
				window.removeEventListener('resize', this.triggerResize);
				this.triggerResize.cancel();
			} else {
				// We remount to make sure `props.children` still
				// follows the CSS layout rules properly.
				window.addEventListener('resize', this.triggerResize);
				newState.resizing = true;
			}
		}

		if (props.watchedVal !== nProps.watchedVal && !this.state.resizing) {
			newState.resizing = true;
			changedState = true;
		}

		if (props.ignoreWidth !== nProps.ignoreWidth) {
			// default to false
			newState.ignoreWidth = nProps.ignoreWidth;
			changedState = true;
		}

		if (props.ignoreHeight !== nProps.ignoreHeight) {
			// default to false
			newState.ignoreHeight = nProps.ignoreHeight;
			changedState = true;
		}

		if (changedState) {
			this.setState(() => {
				return newState;
			});
		}
	}

	componentDidUpdate(prevProps, prevState) {
		// Yes, this triggers another update.
		// That is the whole point.
		if (!prevState.resizing &&
			this.state.resizing) {
			this.setState(() => {
				return { resizing: false };
			});
			// a callback that should trigger on unmounting
			if (this.props.onUnmount) {
				this.props.onUnmount();
			}
		} else if (prevState.resizing &&
			!this.state.resizing &&
			this.props.onRemount) {
			// a callback that should trigger on remounting
			this.props.onRemount();
		}
	}

	render() {
		if (this.state.resizing) {
			return null;
		}
		const { children } = this.props;

		const childProps = purge(this.props, purgeTree);

		const childrenWithProps = React.Children.map(children, (child) => {
			return React.cloneElement(child, childProps);
		});
		return childrenWithProps;
	}
}

Remount.propTypes = {
	children: PropTypes.node.isRequired,
	ignoreResize: PropTypes.bool,
	ignoreWidth: PropTypes.bool,
	ignoreHeight: PropTypes.bool,
	watchedVal: PropTypes.any,
	delay: PropTypes.number,
	onUnmount: PropTypes.func,
	onRemount: PropTypes.func,
};