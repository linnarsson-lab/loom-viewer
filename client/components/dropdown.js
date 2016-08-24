import React, { PropTypes } from 'react';
import { FormGroup, ControlLabel } from 'react-bootstrap';
import Select from 'react-select';

export const DropdownMenu = function (props) {

	const {
		buttonLabel, buttonName,
		attributes, attrType, attrName,
		dispatch, clearable,
	} = props;

	let options = new Array(attributes.length);
	for (let i = 0; i < attributes.length; i++) {
		options[i] = { value: i, label: attributes[i] };
	}
	const dispatchOnChange = (val) => {
		let dispatchParam = { type: attrType };
		dispatchParam[attrName] = attributes[val];
		dispatch(dispatchParam);
	};

	return (
		<FormGroup>
			{ buttonLabel ? <ControlLabel>{buttonLabel}</ControlLabel> : null }
			<Select
				name={buttonName}
				value={buttonName}
				options={options}
				onChange={dispatchOnChange}
				clearable={
					/* required because 'undefined'
						isn't "falsey" enough */
					clearable === true
				}
				/>
		</FormGroup>
	);
};

DropdownMenu.propTypes = {
	buttonLabel: PropTypes.string,
	buttonName: PropTypes.string,
	attributes: PropTypes.array.isRequired,
	attrType: PropTypes.string.isRequired,
	attrName: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
	clearable: PropTypes.bool,
};