import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { debounce } from 'lodash';

import MobileDetect from 'mobile-detect';
const isMobile = new MobileDetect(window.navigator.userAgent).mobile();

export class RemountOnResize extends PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			resizing: true,
			isPortrait: window.innerHeight > window.innerWidth,
		};

		// On certain mobile devices, the software keyboard
		// triggers a resize event. In that case, we do not
		// want to trigger the remount. Instead, we want
		// to trigger a resize only when switching between
		// portrait and landscape modes
		const resize = isMobile ? (
			() => {
				let isPortrait = window.innerHeight > window.innerWidth;
				if (isPortrait !== this.state.isPortrait || !this.state.resizing) {
					this.setState({
						resizing: true,
						isPortrait,
					});
				}
			}
		) : (
			() => {
				if (!this.state.resizing) {
					this.setState({
						resizing: true,
					});
				}
			}
		);

		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// (unmount, resize, remount)-ing of the child nodes.
		// We default to 200 ms
		let delay = props.delay !== undefined ? props.delay : 200;
		this.setResize = debounce(resize, delay);
	}

	componentDidMount() {
		window.addEventListener('resize', this.setResize);
		this.setState({ resizing: false });
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.setResize);
		this.setResize.cancel();
	}

	componentWillReceiveProps(nextProps) {
		if (this.props.watchedVal !== nextProps.watchedVal) {
			this.setState({ resizing: true });
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


RemountOnResize.propTypes = {
	className: PropTypes.string,
	style: PropTypes.object,
	children: PropTypes.node.isRequired,
	watchedVal: PropTypes.any,
	delay: PropTypes.number,
};