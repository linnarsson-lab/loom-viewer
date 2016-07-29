import React, { PropTypes } from 'react';
import {
	FormGroup, ControlLabel,
	ButtonGroup, DropdownButton, MenuItem,
} from 'react-bootstrap';

export const DropdownMenu = function (props) {

	const {
		buttonLabel, buttonName,
		attributes, attrType, attrName,
		dispatch,
	} = props;

	const options = attributes.map((name) => {
		let dispatchParam = { type: attrType };
		dispatchParam[attrName] = name;
		return (
			<MenuItem key={name}>
				<a onClick={ () => { dispatch(dispatchParam); } }>
					{name}
				</a>
			</MenuItem>
		);
	});

	return (
		<FormGroup>
			{ buttonLabel ? <ControlLabel>{buttonLabel}</ControlLabel> : null }
			<ButtonGroup>
				<DropdownButton title={ buttonName + '  '} >
					{ options }
				</DropdownButton>
			</ButtonGroup>
		</FormGroup>
		// <div className='form-group'>
		// 	{ buttonLabel ? <label>{buttonLabel}</label> : null }
		// 	<div className='btn-group btn-block'>
		// 		<button
		// 			type='button'
		// 			className='btn btn-block btn-default dropdown-toggle'
		// 			data-toggle='dropdown'
		// 			aria-haspopup='true'
		// 			aria-expanded='false' >
		// 			{ buttonName + '  '}
		// 			<span className='caret' />
		// 		</button>
		// 		{ options }
		// 	</div>
		// </div>
	);
};

DropdownMenu.propTypes = {
	buttonLabel: PropTypes.string,
	buttonName: PropTypes.string.isRequired,
	attributes: PropTypes.array.isRequired,
	attrType: PropTypes.string.isRequired,
	attrName: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
};