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
			<MenuItem
				key={name}
				onClick={ () => { dispatch(dispatchParam); } }>
				{name}
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