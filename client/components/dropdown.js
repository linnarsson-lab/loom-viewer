import React, { Component, PropTypes } from 'react';
import { FormGroup, ControlLabel } from 'react-bootstrap';
import Select from 'react-select';


//TODO: document what DropdownMenu expects
export class DropdownMenu extends Component {

	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
		this.setButtonName = this.setButtonName.bind(this);
	}

	componentWillMount() {
		let { attributes, buttonName, multi } = this.props;
		this.setButtonName(attributes, buttonName, multi);
	}

	componentWillReceiveProps(nextProps) {
		let { attributes, buttonName, multi } = nextProps;
		this.setButtonName(attributes, buttonName, multi);
	}

	setButtonName(attributes, buttonName, multi) {
		let i = 0;
		while (i < attributes.length) {
			if (attributes[i++] === buttonName) { break; }
		}
		const val = { value: buttonName, label: buttonName };
		if (multi) {
			this.setState({ value: [val] });
		} else {
			this.setState(val);
		}
	}

	handleChange(value) {
		if (value !== undefined && value !== null) {
			const {
				dispatch, attributes,
				actionType, actionName,
			} = this.props;

			if (this.props.multi) {
				let values = [];
				for (let i = 0; i < value.length; i++) {
					values.push(value[i].value);
				}
				dispatch({
					type: actionType,
					[actionName]: values,
				});
			} else {
				dispatch({
					type: actionType,
					[actionName]: attributes[value.value],
				});
			}
		}
		this.setState(value);
	}

	render() {
		const { attributes, buttonLabel } = this.props;

		let options = new Array(attributes.length);
		for (let i = 0; i <= attributes.length; i++) {
			options[i] = { value: i, label: attributes[i] };
		}

		return (
			<FormGroup>
				{ buttonLabel ? <ControlLabel>{buttonLabel}</ControlLabel> : null }
				<Select
					value={this.state}
					options={options}
					onChange={this.handleChange}
					multi={this.props.multi}
					clearable={this.props.clearable === true}
					/>
			</FormGroup>
		);
	}
}

DropdownMenu.propTypes = {
	buttonName: PropTypes.string,
	buttonLabel: PropTypes.string,
	attributes: PropTypes.array.isRequired,
	actionType: PropTypes.string.isRequired,
	actionName: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
};