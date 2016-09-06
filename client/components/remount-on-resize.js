import React, {PropTypes} from 'react';
import { debounce } from 'lodash';

export class RemountOnResize extends React.Component {
	constructor(props) {
		super(props);
		this.state = { resizing: true };

		const resize = () => { this.setState({ resizing: true }); };
		// Because the resize event can fire very often, we
		// add a debouncer to minimise pointless
		// (unmount, resize, remount)-ing of the child nodes.
		this.setResize = debounce(resize, 200);
	}

	componentDidMount() {
		window.addEventListener('resize', this.setResize);
		this.setState({ resizing: false });
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.setResize);
	}

	componentDidUpdate(prevProps, prevState) {
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
	children: PropTypes.node,
};