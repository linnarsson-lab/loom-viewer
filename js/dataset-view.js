import React, { Component, PropTypes } from 'react';
import { fetchDataset } from './actions.js';
import Dropzone from 'react-dropzone';

export class DatasetView extends Component {

	render() {
		const dispatch = this.props.dispatch;
		const ds = this.props.dataState;
		//var vs = this.props.viewState;

		const panels = Object.keys(ds.projects).map((proj) => {
			const datasets = ds.projects[proj].map((d) => {
				const isCurrent = d.dataset === ds.currentDataset.dataset;
				console.log(d);
				console.log(ds.currentDataset);
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
							<span>{ds.projects[proj].length.toString() + " dataset" + (ds.projects[proj].length > 1 ? "s" : "") }</span>
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

	sendData(data) {
		let XHR = new XMLHttpRequest();
		let FD = new FormData();

		// See ../docs/loom_server_API.md
		FD.append('col_attrs', data.cell_attributes);
		FD.append('row_attrs', data.gene_attributes);
		FD.append('cluster_method', data.cluster_method);
		FD.append('regression_label', data.regression_label);

		XHR.addEventListener('load', (event) => { console.log(event); });
		XHR.addEventListener('error', (event) => { console.log(event); });

		let urlString = '/' + data.transcriptome + '__' + data.project + '__' + data.dataset;
		XHR.open('PUT', urlString);
		XHR.send(FD);
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
							<label for='input_transcripome' className='col-sm-2 control-label'>Transcriptome: </label>
							<div className='col-sm-10'>
								<input type='text' className='form-control' defaultValue='' name='transcriptome' id='input_transcriptome' />
							</div>
						</div>
						<div className='form-group'>
							<label for='input_project' className='col-sm-2 control-label'>Project: </label>
							<div className='col-sm-10'>
								<input type='text' className='form-control' defaultValue='' name='project' id='input_project' />
							</div>
						</div>
						<div className='form-group'>
							<label for='input_dataset' className='col-sm-2 control-label'>Dataset: </label>
							<div className='col-sm-10'>
								<input type='text' className='form-control' defaultValue='' name='dataset' id='input_dataset' />
							</div>
						</div>
					</form>
				</div>
				<div className='panel-heading'>
					<h3 className='panel-title'>CSV files</h3>
				</div>
				<div className='list-group'>
					<CSVFileChooser className='list-group-item' label='Cell attributes:'/>
					<CSVFileChooser className='list-group-item' label='[OPTIONAL] Gene attributes:' />
				</div>
				<div className='panel-heading'>
					<h3 className='panel-title'>Additional parameters</h3>
				</div>
				<div className='panel-body'>
					<form className='form-horizontal' role='form'>
						<div className='form-group'>
							<label for='input_n_features' className='col-sm-2 control-label'>Number of features: </label>
							<div className='col-sm-10'>
								<input type='number' className='form-control' defaultValue='100' name='n_features' id='input_n_features' />
							</div>
						</div>
						<div className='form-group'>
							<label for='clustering_method' className='col-sm-2 control-label'>Clustering Method: </label>
							<div className='col-sm-10'>
								<select className='form-control' name='clustering_method' id='input_clustering_method'>
									<option value='value1' selected>BackSPIN</option>
									<option value='value1'>Affinity Propagation</option>
								</select>
							</div>
						</div>
						<div className='form-group'>
							<label for='input_regression_label' className='col-sm-2 control-label'>Regression Label: </label>
							<div className='col-sm-10'>
								<input type='text' className='form-control' defaultValue='' name='regression_label' id='input_regression_label' />
							</div>
						</div>
						<div className='form-group pull-right'>
							<button type='submit' className='btn btn-default'>Submit request for new dataset</button>
						</div>
					</form>
				</div>
			</div >
		);
	}
}

export class CSVFileChooser extends Component {

	constructor(props, context) {
		super(props, context);
		this.state = {
			// NOTE: we distinguish between false and undefined for validation!
			droppedFile: undefined,
			fileName: ' -',
			fileIsCSV: undefined,
			fileSize: undefined,
			fileSizeString: ' -',
			fileContent: null,
			validContent: undefined,
			commaFix: undefined,
			backgroundColor: '#fff',
			fontColor: '#111',
			contentInfo: [],
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
			fileContent: null,
			validContent: file.size > 0 ? undefined : null,
			commaFix: undefined,
			contentInfo: [],
		};
		this.setState(newState);

		if (file.size > 0) {
			this.validate(file);
		}
	}

	// Rudimentary check if the provided CSV file is a proper
	// CSV file. Checks for:
	// - file size (greater than zero?)
	// - extension name (ends with .csv?)
	// - commas and semicolons (presence and absence, respectively)
	// This catches the (hopefully) most common mistakes of selecting
	// the wrong file, or bad formatting due to regional settings.
	validate(file) {
		// Since file IO is asynchronous, validation needs
		// to be done as a callback, calling setState when done
		let reader = new FileReader();
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
				fileContent: subString,
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
			} else if (this.state.fileIsCSV) {
				newState.validContent = true;
			}
			this.setState(newState);

			// Try replacing semicolons with commas if and only if there are no other commas present,
			// since something will almost certainly break otherwise.
			if (semiColonsFound && noCommasFound) {
				this.semicolonsToCommas(reader.result);
			}
		};

		// Handle abort and error cases
		reader.onabort = () => {
			let newState = {
				contentInfo: this.state.contentInfo,
				validContend: false,
			};
			newState.contentInfo.push('File reading aborted before validation');
			this.setState(newState);
		};
		reader.onerror = (event) => {
			console.log(event.error);
			let newState = {
				contentInfo: this.state.contentInfo,
				validContend: false,
			};
			newState.contentInfo.push('Error while reading' + file.name);
			this.setState(newState);
		};

		reader.readAsText(file);
	}

	// Takes a string (consisting of the content of a file), replaces all of its
	// semicolons with commas, turns this into a Blob with MIME-type 'text/csv',
	// then replaces the dropped file with this Blob. Then updates fileContent
	// to show a preview of the result, so the user can verify the result.
	semicolonsToCommas(fileContentString) {
		const commaFix = fileContentString.replace(/\;/gi, ',');

		const commaBlob = new Blob([commaFix], { type: 'text/csv' });
		let subStrIdx = -1;
		// Display up to the first eight lines to the user
		for (let i = 0; i < 8; i++) {
			let nextIdx = commaFix.indexOf('\n', subStrIdx + 1);
			if (nextIdx === -1) {
				break;
			} else {
				subStrIdx = nextIdx;
			}
		}
		let fileContent = (subStrIdx !== -1) ? (commaFix.substr(0, subStrIdx)) : reader.result;
		this.setState({ droppedFile: commaBlob, commaFix, fileContent });
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
						{ state.fileContent ? <pre>{state.fileContent}</pre> : null }
						{ state.contentInfo.length ? state.contentInfo.map((info, i) => { return (<p key={i}><b>{info}</b></p>); }) : null }
					</div>
				</div>
			</div >
		);
	}
}