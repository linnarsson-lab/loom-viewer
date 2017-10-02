import React, { Component } from 'react';
import PropTypes from 'prop-types';

export class FlexboxContainer extends Component {
	constructor(...args) {
		super(...args);
		this.flexboxContainer = this.flexboxContainer.bind(this);
		this.state = {};
	}

	flexboxContainer(div) {
		if (div) {
			const w = `${div.clientWidth - 20}px`;
			const h = `${div.clientHeight - 20}px`;
			const boxStyle = {
				display: 'flex',
				flex: '0 0 auto',
				minWidth: w,
				maxWidth: h,
				minHeight: w,
				maxHeight: h,
				overflowX: this.props.overflowX || 'hidden',
				overflowY: this.props.overflowY || 'scroll',
				margin: 0,
				padding: 0,
			};
			this.setState(() => {
				return {
					mountedContainer: div,
					boxStyle,
				};
			});
		}
	}

	render() {
		const {
			mountedContainer,
			boxStyle,
		} = this.state;
		const { props } = this;

		return (
			mountedContainer ?
				(
					<div
						className={props.className}
						style={props.style}
						ref={this.flexboxContainer}>
						<div
							style={boxStyle}>
							{props.children}
						</div>
					</div>
				) :
				(
					<div
						className={props.className}
						style={props.style}
						ref={this.flexboxContainer} />
				)
		);
	}
}

FlexboxContainer.propTypes = {
	className: PropTypes.string,
	style: PropTypes.object,
	children: PropTypes.node.isRequired,
	overflowX: PropTypes.string,
	overflowY: PropTypes.string,
};