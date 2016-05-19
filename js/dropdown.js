import React, { Component, PropTypes } from 'react';

export class DropdownMenu extends Component {

	render() {

		const {
			buttonLabel, buttonName,
			attributes, attrType, attrName,
			dispatch,
		} = this.props;

		const options = attributes.map((name) => {
			let dispatchParam = { type: attrType };
			dispatchParam[attrName] = name;
			return (
				<ul className='dropdown-menu btn-block scrollable-menu'>
					<li key={name}>
						<a onClick={
							() => { dispatch(dispatchParam); }
						}>
							{name}
						</a>
					</li>
				</ul>
			);
		});

		return (
			<div className='form-group'>
				{ buttonLabel ? <label>{buttonLabel}</label> : null }
				<div className='btn-group btn-block'>
					<button
						type='button'
						className='btn btn-block btn-default dropdown-toggle'
						data-toggle='dropdown'
						aria-haspopup='true'
						aria-expanded='false' >
						{ buttonName + '  '}
						<span className='caret' />
					</button>
					{ options }
				</div>
			</div>
		);
	}
}

DropdownMenu.propTypes = {
	buttonLabel: PropTypes.string,
	buttonName: PropTypes.string.isRequired,
	attributes: PropTypes.object.isRequired,
	attrType: PropTypes.string.isRequired,
	attrName: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
};