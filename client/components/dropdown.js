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
		let { buttonName, multi } = this.props;
		this.setButtonName(buttonName, multi);
	}

	componentWillReceiveProps(nextProps) {
		let { buttonName, multi } = nextProps;
		this.setButtonName(buttonName, multi);
	}

	setButtonName(buttonName, multi) {
		const val = { value: buttonName, label: buttonName };
		if (multi) {
			this.setState({ value: [val] });
		} else {
			this.setState(val);
		}
	}

	handleChange(event) {
		if (event !== undefined && event !== null) {
			const { onChange } = this.props;

			if (this.props.multi) {
				let values = [];
				for (let i = 0; i < event.length; i++) {
					values.push(event[i].value);
				}
				onChange(values);
			} else {
				onChange(event.value);
			}
		}
		this.setState({value: event.value});
	}

	render() {
		const { options, buttonLabel } = this.props;

		const sorted = options.slice(0).sort();
		let sortedOptions = new Array(sorted.length);
		for (let i = 0; i <= sorted.length; i++) {
			sortedOptions[i] = {
				value: sorted[i],
				label: sorted[i],
			};
		}

		return (
			<FormGroup>
				{ buttonLabel ? <ControlLabel>{buttonLabel}</ControlLabel> : null }
				<Select
					value={this.state}
					options={sortedOptions}
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
	options: PropTypes.array.isRequired,
	onChange: PropTypes.func.isRequired,
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
};