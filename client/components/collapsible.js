import React, { Component, PropTypes } from 'react';

import { Glyphicon, Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';

export class CollapsibleSettings extends Component {
	constructor(...args) {
		super(...args);
		this.toggle = this.toggle.bind(this);
		this.state = { open: true };
	}

	toggle() {
		this.setState({ open: !this.state.open });
	}

	render() {
		const { placement, tooltip, label, unmountOnExit, children } = this.props;
		console.log({ children });

		let chevron = this.state.open ? 'chevron-down' : 'chevron-right';
		let _label = (
			<label
				onClick={this.toggle}
				style={{ cursor: 'pointer' }}>
				<Glyphicon glyph={chevron} />
				{label}
			</label>);
		if (tooltip) {
			let __label = _label;
			_label = (<OverlayTrigger
				placement={placement || 'top'}
				overlay={(
					<Tooltip>{tooltip}</Tooltip>)
				}>
				{__label}
			</OverlayTrigger>
			);
		}

		return (
			<div>
				{_label}
				<Collapse
					in={this.state.open}
					unmountOnExit={unmountOnExit} >
					{children}
				</Collapse>
			</div >
		);
	}
}

CollapsibleSettings.propTypes = {
	placement: PropTypes.string,
	tooltip: PropTypes.string,
	label: PropTypes.string.isRequired,
	unmountOnExit: PropTypes.bool,
	children: PropTypes.node.isRequired,
};