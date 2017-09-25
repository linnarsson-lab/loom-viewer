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

export class Remount extends PureComponent {
	constructor(props) {
		super(props);

		// On certain mobile devices, the software keyboard
		// triggers a resize event. In that case, we do not
		// want to trigger the remount. Instead, we want
		// to trigger a resize only when switching between
		// portrait and landscape modes
		const resize = isMobile ? (
			() => {
				const { state } = this;
				const isPortrait = window.innerHeight > window.innerWidth;
				const portraitChanged = isPortrait !== state.isPortrait;
				if (!state.resizing && (portraitChanged || shouldResize(state))) {
					this.setState({
						resizing: true,
						isPortrait,
						windowWidth: window.innerWidth,
						windowHeight: window.innerHeight,
						pixelRatio: window.devicePixelRatio,
					});
				}
			}
		) :
			(
				() => {
					if (!this.state.resizing && shouldResize(this.state)) {
						this.setState({
							resizing: true,
							windowWidth: window.innerWidth,
							windowHeight: window.innerHeight,
							pixelRatio: window.devicePixelRatio,
						});
					}
				}
			);

		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// (unmount, resize, remount)-ing of the child nodes.
		// We default to 200 ms
		const delay = props.delay !== undefined ? props.delay : 200,
			delayedResize = debounce(resize, delay);

		this.triggerResize = () => {
			if (!this.props.noResize) {
				delayedResize();
			}
		};

		this.state = {
			resizing: true,
			isPortrait: window.innerHeight > window.innerWidth,
			delayedResize,
			ignoreWidth: props.ignoreWidth,
			ignoreHeight: props.ignoreHeight,
			windowWidth: window.innerWidth,
			windowHeight: window.innerHeight,
			pixelRatio: window.devicePixelRatio,
		};

	}

	componentDidMount() {
		window.addEventListener('resize', this.triggerResize);
		this.setState({ resizing: false });
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.triggerResize);
		this.state.delayedResize.cancel();
	}

	componentWillReceiveProps(nProps) {
		let newState = {}, changedState = false;

		// Two possible reasons to force a remount:
		// - if our watchedVal changed, trigger a resize
		// - when we turn resize triggering on if it was
		//   previously off. In this case we probably
		//   to make sure props.children still follow the
		//   CSS layout properly, so we force a remount.
		if (this.props.watchedVal !== nProps.watchedVal ||
			(this.props.noResize && !nProps.noResize)) {
			newState.resizing = true;
			changedState = true;
		}

		if (this.props.ignoreWidth !== nProps.ignoreWidth) {
			// default to false
			newState.ignoreWidth = nProps.ignoreWidth;
			changedState = true;
		}

		if (this.props.ignoreHeight !== nProps.ignoreHeight) {
			// default to false
			newState.ignoreHeight = nProps.ignoreHeight;
			changedState = true;
		}

		if (changedState) {
			this.setState(newState);
		}
	}

	componentDidUpdate(prevProps, prevState) {
		// Yes, this triggers another update.
		// That is the whole point.
		if (!prevState.resizing && this.state.resizing) {
			this.setState({ resizing: false });
		}
	}

	render() {
		return this.state.resizing ? null : this.props.children;
	}
}


Remount.propTypes = {
	children: PropTypes.node.isRequired,
	noResize: PropTypes.bool,
	ignoreWidth: PropTypes.bool,
	ignoreHeight: PropTypes.bool,
	watchedVal: PropTypes.any,
	delay: PropTypes.number,
};