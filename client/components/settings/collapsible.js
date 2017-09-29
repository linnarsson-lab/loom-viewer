import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	Button,
	Glyphicon,
	Collapse,
	OverlayTrigger,
	Tooltip,
	Popover,
} from 'react-bootstrap';

export class OverlayPopover extends Component {
	render() {
		const { props } = this;
		const _popover = (
			<Popover
				id={props.popoverId}
				title={props.popoverTitle}
				style={{ maxWidth: '600px' }}>
				{props.popover}
			</Popover>
		);
		return (
			<OverlayTrigger
				trigger='click'
				rootClose
				placement={props.placement || 'right'}
				overlay={_popover}>
				<Button
					bsStyle='link'
					bsSize={props.size || 'small'}>
					<Glyphicon glyph='info-sign' />
				</Button>
			</OverlayTrigger>);
	}
}

OverlayPopover.propTypes = {
	popover: PropTypes.node.isRequired,
	popoverTitle: PropTypes.string,
	popoverId: PropTypes.string.isRequired,
	placement: PropTypes.string,
};

export class OverlayTooltip extends Component {
	render() {
		const { props } = this;
		return (
			<OverlayTrigger
				placement={props.placement || 'top'}
				overlay={(
					<Tooltip id={props.tooltipId}>{props.tooltip}</Tooltip>)
				}>
				{props.children}
			</OverlayTrigger>
		);
	}
}

OverlayTooltip.propTypes = {
	tooltip: PropTypes.string.isRequired,
	tooltipId: PropTypes.string.isRequired,
	placement: PropTypes.string,
	children: PropTypes.node.isRequired,
};

export class CollapsibleSettings extends Component {
	constructor(...args) {
		super(...args);
		this.toggle = this.toggle.bind(this);
		this.state = {
			open: !this.props.mountClosed,
		};
	}

	toggle() {
		this.setState(() => {
			return {
				open: !this.state.open,
			};
		});
	}

	render() {
		const {
			label,
			tooltip,
			tooltipId,
			tooltipPlacement,
			popover,
			popoverTitle,
			popoverId,
			popoverPlacement,
			size,
			unmountOnExit,
			children,
		} = this.props;

		let _popover = popover ? (
			<OverlayPopover
				popover={popover}
				popoverTitle={popoverTitle}
				popoverId={popoverId}
				popoverPlacement={popoverPlacement}
				size={size} />
		) : null;

		// using Button so it can be triggered by keyboard
		let chevron = this.state.open ? 'chevron-down' : 'chevron-right';
		let _button = (
			<Button
				onClick={this.toggle}
				bsStyle='link'
				bsSize={size}>
				<Glyphicon glyph={chevron} /> {label}
			</Button>
		);


		let _label = tooltip ? (
			<div>
				<OverlayTooltip
					placement={tooltipPlacement || 'top'}
					tooltip={tooltip}
					tooltipId={tooltipId}
				>
					{_button}
				</OverlayTooltip> {_popover}
			</div>
		) : (<div>{_button} {_popover}</div>);


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
	tooltip: PropTypes.string,
	tooltipId: PropTypes.string,
	tooltipPlacement: PropTypes.string,
	popover: PropTypes.node,
	popoverTitle: PropTypes.string,
	popoverId: PropTypes.string,
	popoverPlacement: PropTypes.string,
	label: PropTypes.string.isRequired,
	size: PropTypes.string,
	unmountOnExit: PropTypes.bool,
	children: PropTypes.node.isRequired,
	mountClosed: PropTypes.bool,
};