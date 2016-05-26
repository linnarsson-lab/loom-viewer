import React, { Component, PropTypes } from 'react';
import { fetchDataset } from './actions.js';
import Dropzone from 'react-dropzone';
import * as _ from 'lodash';

export class DatasetView extends Component {

	render() {
		// unused at the moment: this.props.viewState
		const { dispatch, dataState } = this.props;

		const panels = Object.keys(dataState.projects).map((proj) => {
			const datasets = dataState.projects[proj].map((d) => {
				const isCurrent = d.dataset === dataState.currentDataset.dataset;
				return (
					<div key={d.dataset} className={"list-group-item" + (isCurrent ? " list-group-item-info" : "") }>
						<a onClick={() => { dispatch(fetchDataset(d.transcriptome + "__" + proj + "__" + d.dataset)); } }>{d.dataset}</a>
						<span>{" " + d.message}</span>
						<div className='pull-right'>
							<a>Delete</a> / <a>Duplicate</a> / <a>Edit</a>
						</div>
					</div>
				);
			});
			return (
				<div key={proj} className='panel panel-primary'>
					<div className='panel-heading'>
						{proj}
						<div className='pull-right'>
							<span>{dataState.projects[proj].length.toString() + " dataset" + (dataState.projects[proj].length > 1 ? "s" : "") }</span>
						</div>
					</div>
					<div className='list-group'>
						{datasets}
					</div>
				</div>
			);
		});

		return (
			<div className='container'>
				<div className='row'>
					<div className='view col-md-8'>
						<h3>&nbsp; </h3>
						<h3>Linnarsson lab single-cell data repository</h3>
						<h3>&nbsp; </h3>
						<h4>Available datasets</h4>
						<div>
							{ panels.length === 0 ?
								<div className='panel panel-primary'>
									<div className='panel-heading'>
										Downloading list of available datasets...
									</div>
								</div>
								:
								panels
							}
						</div>
						<hr />
						<h4>Create a new dataset</h4>
						<h5>Instructions</h5>
						<p>To generate a dataset, the user must supply the names of: </p>
						<ul>
							<li>the dataset to be created</li>
							<li>the user the dataset belongs to</li>
							<li>the project the dataset belongs to</li>
						</ul>
						<p>Furthermore, the pipeline also needs: </p>
						<ul>
							<li>a CSV file of cell attributes from which the dataset is generated</li>
							<li><i>(optionally) </i> a CSV file of gene attributes</li>
						</ul>
						<p>Before uploading these CSV files a minimal check will be applied, hopefully catching the most likely
							scenarios.If the CSV file contains semi-colons instead of commas (most likely the result of regional
							settings in whatever tool was used to generate the file), they will automatically be replace
							before submitting.Please double-check if the result is correct in that case.</p>
						<p><i>Note: </i> you can still submit a file with a wrong file extension or (what appears to be)
							malformed content, as validation might turn up false positives.We assume you know what you are doing,
							just be careful!</p>
						<p>Finally, the pipeline requires the following parameters: </p>
						<ul>
							<li>The number of features - at least 100 and not more than the total number of genes in the transcriptome</li>
							<li>The clustring method to apply - Affinity Propagation or BackSPIN</li>
							<li>Regression label - must be one of the column attributes
							(either from the file supplied by the user or from the standard cell attributes) </li>
						</ul>
						<br />
						<CreateDataset />
					</div>
				</div>
			</div>
		);
	}
}

DatasetView.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};


export class CreateDataset extends Component {

	constructor(props, context) {
		super(props, context);
		this.state = {
			n_features: 100,
			cluster_method: 'BackSPIN',
		};

		this.sendDate = this.sendData.bind(this);
	}

	// See ../docs/loom_server_API.md
	sendData() {
		let FD = new FormData();

		let filledForm = true;
		const formData = [
			'col_attrs',
			'n_features',
			'cluster_method',
			'regression_label',
		];
		formData.forEach((element) => {
			// if an element is missing, we cannot submit
			// TODO: instead of this approach,
			// deactivate submit button until all relevant fields are defined
			if (!this.state[element]) {
				//row_attrs is optional, the rest is not
				filledForm = false;
			}
		});

		if (filledForm) {
			if (this.state.col_attrs) {
				FD.append('col_attrs', this.state.col_attrs);
			}

			if (this.state.row_attrs) {
				FD.append('row_attrs', this.state.row_attrs);
			} else {
			}

			let config = JSON.stringify({
				"transcriptome": this.state.transcriptome,
				"project": this.state.project,
				"dataset": this.state.dataset,
				"n_features": this.state.n_features,
				"cluster_method": this.state.cluster_method,
				"regression_label": this.state.regression_label,
			});

			FD.append('config', config);

			let XHR = new XMLHttpRequest();
			//TODO: display server response in the UI
			XHR.addEventListener('load', (event) => { console.log(event); });
			XHR.addEventListener('error', (event) => { console.log(event); });

			let urlString = '/loom/' + this.state.transcriptome +
				'__' + this.state.project +
				'__' + this.state.dataset;
			XHR.open('PUT', urlString);
			XHR.send(FD);

		}
	}

	render() {
		return (
			<div className='panel panel-primary'>
				<div className='panel-heading'>
					<h3 className='panel-title'>Required information</h3>
				</div>
				<div className='panel-body'>
					<form className='form-horizontal' role='form'>
						<div className='form-group'>
							<label for='input_transcriptome' className='col-sm-2 control-label'>Transcriptome: </label>
							<LoomTextEntry
								trimUnderscores={true}
								className='col-sm-10'
								defaultValue=''
								onChange={ (val) => { this.setState({ transcriptome: val }); } }
								id='input_transcriptome' />
						</div>
						<div className='form-group'>
							<label for='input_project' className='col-sm-2 control-label'>Project: </label>
							<LoomTextEntry
								trimUnderscores={true}
								className='col-sm-10'
								defaultValue=''
								onChange={ (val) => { this.setState({ project: val }); } }
								id='input_project' />
						</div>
						<div className='form-group'>
							<label for='input_dataset' className='col-sm-2 control-label'>Dataset: </label>
							<LoomTextEntry
								trimTrailingUnderscores={true}
								className='col-sm-10'
								defaultValue=''
								onChange={ (val) => { this.setState({ dataset: val }); } }
								id='input_dataset' />
						</div>
					</form>
				</div>
				<div className='panel-heading'>
					<h3 className='panel-title'>CSV files</h3>
				</div>
				<div className='list-group'>
					<CSVFileChooser
						className='list-group-item'
						label='Cell attributes:'
						onChange={ (val) => { this.setState({ col_attrs: val }); } }
						/>
					<CSVFileChooser
						className='list-group-item'
						label='[OPTIONAL] Gene attributes:'
						onChange={ (val) => { this.setState({ row_attrs: val }); } }
						/>
				</div>
				<div className='panel-heading'>
					<h3 className='panel-title'>Additional parameters</h3>
				</div>
				<div className='panel-body'>
					<form className='form-horizontal' role='form'>
						<div className='form-group'>
							<label for='input_n_features' className='col-sm-2 control-label'>Number of features: </label>
							<div className='col-sm-10'>
								<input type='number'
									className='form-control'
									defaultValue='100'
									value={this.state.n_features}
									onChange={ (e) => { this.setState({ n_features: e.value }); } }
									id='input_n_features' />
							</div>
						</div>
						<div className='form-group'>
							<label for='input_cluster_method' className='col-sm-2 control-label'>Clustering Method: </label>
							<div className='col-sm-10'>
								<select
									className='form-control'
									onChange={ (val) => { this.setState({ cluster_method: val }); } }
									id='input_cluster_method'>
									<option value='BackSPIN' selected>BackSPIN</option>
									<option value='AP'>Affinity Propagation</option>
								</select>
							</div>
						</div>
						<div className='form-group'>
							<label for='input_regression_label' className='col-sm-2 control-label'>Regression Label: </label>
							<LoomTextEntry
								trimTrailingUnderscores={false}
								className='col-sm-10'
								defaultValue=''
								onChange={ (val) => { this.setState({ regression_label: val }); } }
								id='input_regression_label' />
						</div>
						<div className='form-group pull-right'>
							<button type='button' className='btn btn-default' onClick={ () => { this.sendData(); } } >Submit request for new dataset</button>
						</div>
					</form>
				</div >
			</div >
		);
	}
}

// Valid entries:
// - may contain letters, numbers and underscores
// - may NOT contain double (or more) underscores
// - may NOT have leading or trailing underscores
// This function attempts to autofix names by replacing all sequences of
// invalid characters (including whitespace) with single underscores.
// Note that this is purely for user feedback!
// Input should be validated and fixed on the server side too!
export class LoomTextEntry extends Component {

	constructor(props, context) {
		super(props, context);
		this.state = {
			value: this.props.defaultValue,
			fixedVal: '',
		};
		// fix errors with a small delay after user stops typing
		const delayMillis = 1000;
		this.delayedFixTextInput = _.debounce(this.fixTextInput, delayMillis);
		this.handleChange = this.handleChange.bind(this);
		this.fixTextInput = this.fixTextInput.bind(this);
	}

	handleChange(event) {
		// immediately show newly typed characters
		this.setState({ value: event.target.value });
		// then make a (debounced) call to fixTextInput
		this.delayedFixTextInput(event.target.value);
	}

	fixTextInput(txt) {
		// replace all non-valid characters with underscores, followed by
		// replacing each sequence of underscores with a single underscore.
		txt = txt.replace(/([^A-Za-z0-9_])+/g, '_')
			.replace(/_+/g, '_');

		if (this.props.trimTrailingUnderscores || this.props.trimUnderscores) {
			// strip leading/trailing underscore, if present. Note that the
			// above procedure has already reduced any leading underscores
			// to a single character.
			txt = txt.endsWith('_') ? txt.substr(0, txt.length - 1) : txt;
		}
		if (this.props.trimLeadingUnderscores || this.props.trimUnderscores){
			txt = txt.startsWith('_') ? txt.substr(1) : txt;
		}
		this.setState({
			value: txt,
			fixedVal: txt,
		});
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (this.state.value !== nextState.value) || (this.state.fixedVal !== nextState.fixedVal);
	}

	componentDidUpdate() {
		this.props.onChange(this.state.fixedVal);
	}

	render() {
		return (
			<div className={this.props.className} >
				<input
					type='text'
					className='form-control'
					defaultValue={this.props.defaultValue}
					name={this.props.name}
					id={this.props.id}
					value={this.state.value}
					onChange={ (event) => { this.handleChange(event); } }
					onBlur={ () => { this.fixTextInput(this.state.value); } }
					/>
			</div>
		);
	}
}

LoomTextEntry.propTypes = {
	trimUnderscores: PropTypes.bool,
	trimLeadingUnderscores: PropTypes.bool,
	trimTrailingUnderscores: PropTypes.bool,
	defaultValue: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
};


// A file chooser for CSV files
// - rudimentary validation (extension name, commas or semicolons, size)
// - accepts files via drag & drop, for ease of used
export class CSVFileChooser extends Component {
	constructor(props, context) {
		super(props, context);

		this.onDrop = this.onDrop.bind(this);
		this.CSVFileReader = this.CSVFileReader.bind(this);
		this.semicolonsToCommas = this.semicolonsToCommas.bind(this);

		this.state = {
			// NOTE: we distinguish between false and undefined for validation!
			droppedFile: undefined,
			fileName: ' -',
			fileIsCSV: undefined,
			fileSize: undefined,
			fileSizeString: ' -',
			filePreview: null,
			validContent: undefined,
			fileContentString: undefined,
			backgroundColor: '#fff',
			fontColor: '#111',
			contentInfo: [],
			fileReader: this.CSVFileReader(),
		};
	}

	onDrop(files) {
		let file = files[0];
		let newState = {
			droppedFile: file,
			fileName: file.name,
			fileIsCSV: file.type === "text/csv",
			fileSize: file.size,
			fileSizeString: this.bytesToString(file.size),
			filePreview: null,
			validContent: file.size > 0 ? undefined : null,
			fileContentString: undefined,
			contentInfo: [],
		};
		this.setState(newState);

		if (file.size > 0) {
			this.state.fileReader.readAsText(file);
		}
	}

	// Create a FileReader to re-use, which performs a rudimentary
	// check if the provided CSV file is a proper CSV file.
	CSVFileReader() {
		let reader = new FileReader();

		// Handle abort and error cases
		reader.onabort = (event) => {
			let newState = {
				contentInfo: this.state.contentInfo,
				validContent: false,
			};
			newState.contentInfo.push('File reading aborted before validation\n', event);
			this.setState(newState);
		};
		reader.onerror = (event) => {
			let newState = {
				contentInfo: this.state.contentInfo,
				validContent: false,
			};
			newState.contentInfo.push('Error while reading file\n', event);
			this.setState(newState);
		};

		// Rudimentary check if file was successfully loaded. Checks for:
		// - file size (greater than zero?)
		// - extension name (ends with .csv?)
		// - commas and semicolons (presence and absence, respectively)
		// This catches the (hopefully) most common mistakes of selecting
		// the wrong file, or bad formatting due to regional settings.
		reader.onload = () => {
			let subStrIdx = -1;
			// Display up to the first eight lines to the user
			for (let i = 0; i < 8; i++) {
				let nextIdx = reader.result.indexOf('\n', subStrIdx + 1);
				if (nextIdx === -1) {
					break;
				} else {
					subStrIdx = nextIdx;
				}
			}
			let subString = (subStrIdx !== -1) ? (reader.result.substr(0, subStrIdx)) : reader.result;

			let newState = {
				filePreview: subString,
				contentInfo: this.state.contentInfo,
			};

			let noCommasFound = reader.result.indexOf(',') === -1;
			let semiColonsFound = reader.result.indexOf(';') !== -1;
			if (noCommasFound) {
				if (semiColonsFound) {
					newState.contentInfo.push('Only semicolons found, replacing with commas. Please double-check results above');
				} else {
					newState.contentInfo.push('No commas found, check if this is a properly formatted CSV');
				}
				newState.validContent = false;
			} else if (semiColonsFound) {
				newState.contentInfo.push('Mix of commas and semicolons found, check if this is a properly formatted CSV');
				newState.validContent = false;
			} else {
				// The check found no errors, use file content string as is
				newState.fileContentString = reader.result;
				// However, if extension is wrong we warn the user!
				newState.validContent = this.state.fileIsCSV;
			}

			this.setState(newState);

			if (semiColonsFound && noCommasFound) {
				// Try replacing semicolons with commas if and only if no other
				// commas are present, something will certainly break if they are.
				this.semicolonsToCommas(reader.result);
			}
		};

		return reader;
	}

	// Takes a string (consisting of the content of a file),
	// replaces all of its semicolons with commas.
	// Updates filePreview to show (part of) the result,
	// so the user can verify the result.
	semicolonsToCommas(filePreviewString) {
		const fileContentString = filePreviewString.replace(/\;/gi, ',');

		const commaBlob = new Blob([fileContentString], { type: 'text/csv' });
		let subStrIdx = -1;
		// Display up to the first eight lines to the user
		for (let i = 0; i < 8; i++) {
			let nextIdx = fileContentString.indexOf('\n', subStrIdx + 1);
			if (nextIdx === -1) {
				break;
			} else {
				// if the file contains less than 8 newlines,
				// we'll just show the whole string.
				subStrIdx = -1;
			}
		}
		let filePreview = (subStrIdx !== -1) ? (fileContentString.substr(0, subStrIdx)) : fileContentString;
		this.setState({ droppedFile: commaBlob, fileContentString, filePreview });
	}

	bytesToString(bytes) {
		let displaybytes = bytes;
		let magnitude = 0;
		const scale = ["bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
		while (displaybytes > 512 && magnitude < scale.length) {
			magnitude++;
			displaybytes /= 1024;
		}
		return displaybytes.toFixed(magnitude > 0 ? 2 : 0) + ' ' + scale[magnitude];
	}

	shouldComponentUpdate(nextProps, nextState) {
		// risky: we assume that props never change here
		return !(_.isEqual(this.state, nextState));
	}

	componentDidUpdate() {
		this.props.onChange(this.state.fileContentString);
	}

	render() {
		let state = this.state;
		let DZstyle = {
			width: 'auto', height: 'auto',
			padding: 30, textAlign: 'center',
			borderWidth: 2, borderColor: '#aaa',
			borderStyle: 'solid', borderRadius: 5,
			backgroundColor: '#eee', color: '#333',
		};
		let DZactiveStyle = { borderStyle: 'solid', borderColor: '#000', backgroundColor: '#fff' };
		let DZrejectStyle = { borderStyle: 'solid', borderColor: '#f00', backgroundColor: '#fcc' };
		let warnIf = (state) => {
			let style = { margin: 5, padding: 5, textAlign: 'left' };
			if (state === true) {
				style.backgroundColor = '#f66';
				style.color = '#fff';
			}
			return style;
		};
		return (
			<div className={this.props.className} style={{ backgroundColor: state.backgroundColor, color: state.fontColor }}>
				<label>{this.props.label}</label>
				<Dropzone onDrop={(files) => { this.onDrop(files); } } multiple={false}
					style={DZstyle} activeStyle={DZactiveStyle} rejectStyle={DZrejectStyle}>
					<b>Drag and drop a CSV file here, or click to browse</b>
				</Dropzone>
				<div>
					<div style={ warnIf(state.fileIsCSV === false) } >
						{ state.fileIsCSV ? '☑ ' : '☐ '}
						file: <i>{state.fileName}</i>&nbsp;
						{ state.fileIsCSV === false ? <b>does not have a CSV file extension!</b> : null }
					</div>
					<div style={ warnIf(state.fileSize === 0) } >
						{ state.fileSize > 0 ? '☑ ' : '☐ '}
						size: <i>{state.fileSizeString}</i>&nbsp;
						{ state.fileSize === 0 ? <b>Empty file!Did you drop a folder?</b> : null }
					</div>
					<div style={ warnIf(state.validContent === false) } >
						{ state.validContent ? '☑ ' : '☐ ' }
						content: (first eight lines)
						{ state.filePreview ? <pre>{state.filePreview}</pre> : null }
						{ state.contentInfo.length ? state.contentInfo.map((info, i) => { return (<p key={i}><b>{info}</b></p>); }) : null }
					</div>
				</div>
			</div >
		);
	}
}