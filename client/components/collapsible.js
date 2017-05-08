import React, { Component, PropTypes } from 'react';

import { Button, Glyphicon, Collapse, OverlayTrigger, Tooltip } from 'react-bootstrap';

export class CollapsibleSettings extends Component {
	constructor(...args) {
		super(...args);
		this.toggle = this.toggle.bind(this);
		this.state = { open: !this.props.mountClosed };
	}

	toggle() {
		this.setState({ open: !this.state.open });
	}

	render() {
		const { placement, tooltip, label, unmountOnExit, children } = this.props;

		let chevron = this.state.open ? 'chevron-down' : 'chevron-right';
		let _label = (
			<Button onClick={this.toggle} bsStyle='link'>
				<Glyphicon glyph={chevron} /> {label}
			</Button>
			); // using Button so it can be triggered by keyboard
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
	mountClosed: PropTypes.boolean,
};