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

	handleChange(event) {
		if (event !== undefined && event !== null) {
			const {
				dispatch, actionType, actionName,
			} = this.props;

			if (this.props.multi) {
				let values = [];
				for (let i = 0; i < event.length; i++) {
					values.push(event[i].value);
				}
				dispatch({
					type: actionType,
					[actionName]: values,
				});
			} else {
				dispatch({
					type: actionType,
					[actionName]: event.value,
				});
			}
		}
		this.setState({value: event.value});
	}

	render() {
		const { attributes, buttonLabel } = this.props;

		const sorted = attributes.slice(0).sort();
		let options = new Array(sorted.length);
		for (let i = 0; i <= sorted.length; i++) {
			options[i] = {
				value: sorted[i],
				label: sorted[i],
			};
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