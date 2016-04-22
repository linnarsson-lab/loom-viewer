import React, { Component, PropTypes } from 'react';
import { fetchDataset } from './actions.js';
import Dropzone from 'react-dropzone';

export class DatasetView extends Component {

	render() {
		var dispatch = this.props.dispatch;
		var ds = this.props.dataState;
		var vs = this.props.viewState;

		var panels = Object.keys(ds.projects).map((proj) => {
			var datasets = ds.projects[proj].map((d) => {
				var isCurrent = d.dataset == ds.currentDataset.dataset;
				console.log(d);
				console.log(ds.currentDataset);
				return (
					<div key={d.dataset} className={"list-group-item" + (isCurrent ? " list-group-item-info" : "") }>
						<a onClick={(event) => dispatch(fetchDataset(d.transcriptome + "__" + proj + "__" + d.dataset)) }>{d.dataset}</a>
						<span>{" " + d.message}</span>
						<div className="pull-right">
							<a>Delete</a> / <a>Duplicate</a> / <a>Edit</a>
						</div>
					</div>
				);
			});
			return (
				<div key={proj} className="panel panel-primary">
					<div className="panel-heading">
						{proj}
						<div className="pull-right">
							<span>{ds.projects[proj].length.toString() + " dataset" + (ds.projects[proj].length > 1 ? "s" : "") }</span>
						</div>
					</div>
					<div className="list-group">
						{datasets}
					</div>
				</div>
			);
		});

		return (
			<div className="container">
				<div className="row">
					<div className="view col-md-8">
						<h3>&nbsp; </h3>
						<h3>Linnarsson lab single-cell data repository</h3>
						<h3>&nbsp; </h3>
						<h4>Available datasets</h4>
						<div>
							{ panels.length === 0 ?
								<div className="panel panel-primary">
									<div className="panel-heading">
										Downloading list of available datasets...
									</div>
								</div>
								:
								panels
							}
						</div>
						<hr />
						<h4>Create a new dataset</h4>
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
	dispatch: PropTypes.func.isRequired
}

export class CreateDataset extends Component {
	render() {
		return (
			<div>
				<div className="panel panel-primary">
					<div className="panel-heading">Attach CSV files below</div>
					<div className="list-group">
						<CSVFileChooser className="list-group-item" label='Cell attributes:'/>
						<CSVFileChooser className="list-group-item" label='Gene attributes: (optional)' />
					</div>
					<div className="panel-heading">Set parameters</div>
					<div className="list-group">
						<div className="list-group-item">
							<label for="input_n_features" >Number of features: </label>
							<input type="number" className="form-control" defaultValue="100" id="input_n_features" />
							<p>TODO: AP/Backspin dropdown</p>
							<label for="input_n_features" >Regression Label: </label>
							<input type="text"  className="form_control" defaultValue="" id="input_regression_label" />
						</div>
					</div>
					<div className="panel-heading">Other settings</div>
					<div className="list-group">
						<div className="list-group-item">
							<div class="checkbox">
								<input type="checkbox" /> Zip files before uploading (may not work in older browsers)
							</div>
						</div>
					</div>
				</div>
				<br />
				<div className="pull-right">
					<button type="submit" className="btn btn-default">Submit request for new dataset</button>
				</div>
			</div>
		);
	}
}

export class CSVFileChooser extends Component {

	constructor(props, context) {
		super(props, context);
		this.state = {
			droppedFile: null,
			validFileName: false,
			fileName: '-',
			fileIsCSV: false,
			fileSize: 0,
			fileSizeString: '-',
			fileContent: null,
			validContent: false,
			backgroundColor: '#ffffff',
			extraInfo: [],
		};
	}

	onDrop(files) {
		let file = files[0];
		let newState = {
			droppedFile: file,
			validFileName: false,
			fileName: file.name,
			fileIsCSV: file.type === "text/csv",
			fileSize: file.size,
			fileSizeString: this.bytesToString(file.size),
			fileContent: 'Please wait, performing basic validation',
			extraInfo: []
		};

		if (file.size > 0) {
			if (newState.fileIsCSV) {
				newState.validFileName = true;
				newState.backgroundColor = '#ccffcc';
				newState.validContent = false;
			} else {
				newState.validFileName = false;
				newState.backgroundColor = '#ffcccc';
				newState.extraInfo.push('WARNING: "' + file.name + '" does not have a CSV file extension!');
				newState.validContent = false;
			}
			this.setState(newState);

			// take the first 10kb, or less if the file is smaller
			// and validate it asynchronously
			let first10KB = file.slice(0, Math.min(10240, file.size));
			this.validate(first10KB);

		} else {
			newState.backgroundColor = '#ffcccc';
			newState.extraInfo.push('WARNING: "' + file.name + '" is an empty file! Did you drop a folder?');
			newState.validContent = false;
			this.setState(newState);
		}

	}

	validate(file) {
		// Since file IO is asynchronous, validation needs
		// to be done as a callback, calling setState when done
		let reader = new FileReader();
		reader.onload = (event) => {
			var validatedState = {
				fileContent: reader.result.substr(0, 80) + '...',
				extraInfo: this.state.extraInfo
			};
			if (reader.result.indexOf(';') !== -1) {
				validatedState.extraInfo.push('WARNING: semicolons found, check if this is a properly formatted CSV');
				validatedState.backgroundColor = '#ffcccc';
				validatedState.validContent = false;
			} else if (reader.result.indexOf(',') === -1) {
				validatedState.extraInfo.push('ERROR: no commas found, check if this is a properly formatted CSV' + reader.result.substr(0, 50));
				validatedState.backgroundColor = '#ffcccc';
				validatedState.validContent = false;
			} else if (this.state.fileIsCSV){
				validatedState.extraInfo.push('File extension is recognised CSV, and basic formatting appears to be in order');
				validatedState.validContent = true;
			}
			this.setState(validatedState);
		};
		// Handle abort and error cases
		reader.onabort = (event) => {
			validatedState.extraInfo.push('File reading aborted before validation');
			validatedState.backgroundColor = '#ffcccc';
			validatedState.validContent = false;
		}
		reader.onerror = (event) => {
			console.log(event.error);
			validatedState.extraInfo.push('Error while reading' + file.name + ': ' + reader.error.name);
			validatedState.backgroundColor = '#ffcccc';
			validatedState.validContent = false;
		}
		reader.readAsText(file);
	}

	bytesToString(bytes) {
		var displaybytes = bytes;
		var magnitude = 0;
		const scale = ["bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
		while (displaybytes > 512 && magnitude < scale.length) {
			magnitude++
			displaybytes /= 1024;
		}
		return displaybytes.toFixed(magnitude > 0 ? 2 : 0) + ' ' + scale[magnitude]
	}

	render() {
		let style = {
			width: '100%', height: '100%',
			padding: 15, textAlign: 'center',
			borderWidth: 2, borderColor: '#666',
			borderStyle: 'dashed', borderRadius: 5,
			backgroundColor: this.state.backgroundColor
		};
		let activeStyle = { borderStyle: 'solid', backgroundColor: '#ffffff' };
		let rejectStyle = { borderStyle: 'solid', backgroundColor: '#ffcccc' };
		return (
			<div className={this.props.className}>
				<label>{this.props.label}</label>
				<Dropzone onDrop={(files) => this.onDrop(files) } multiple={false} style={style} activeStyle={activeStyle} rejectStyle={rejectStyle}>
					<b>Drag and drop a CSV file, or click to browse</b>
					<div style={{ padding: 15, textAlign: 'left' }}>
						<div>{this.state.validFileName && this.state.validContent ? '☑' : '☐'} file:  <i>{this.state.fileName}</i></div>
						<div>{this.state.fileSize > 0 ? '☑' : '☐'} size:  <i>{this.state.fileSizeString}</i></div>
						<div>{this.state.validContent > 0 ? '☑' : '☐'} content:
							<pre>{this.state.fileContent}</pre>
							{this.state.extraInfo.length ? this.state.extraInfo.map((info, i) => { return(<div key={i}><b>{info}</b></div>) }) : null}
						</div>
					</div>
				</Dropzone>
			</div >
		);
	}
}