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
			fileName: '-',
			fileSize: '-',
			extraInfo: null,
			backgroundColor: '#ffffff',
		};
	}

	onDrop(files) {
		let file = files[0];
		let fileIsCSV = file.type === "text/csv";
		let newState = {
			droppedFile: file,
			fileName: file.name,
			fileSize: this.bytesToString(file.size),
		};

		if (fileIsCSV) {
			newState.backgroundColor = '#dddddd';
			newState.extraInfo = 'Please wait, checking for semicolons';
		} else {
			newState.backgroundColor = '#ffcccc';
			newState.extraInfo = 'WARNING: "' + file.name + '" does not have a CSV file extension!';
		}

		this.setState(newState);

		if (fileIsCSV) {
			// Since file IO is asynchronous, validation needs
			// to be done as a callback, calling setState when done
			let reader = new FileReader();
			reader.onload = (event) => {
				let splitColons = reader.result.split(';');
				var validatedState = {}
				if (splitColons.length > 1) {
					validatedState.extraInfo = 'WARNING: semicolons found, is this a properly formatted CSV?';
					validatedState.backgroundColor = '#ffcccc';
				} else {
					validatedState.extraInfo = null;
					validatedState.backgroundColor = '#ccffcc';
				}
				this.setState(validatedState);
			};
			// take the first 10kb, or less if the file is smaller
			let first10KB = file.slice(0, Math.min(10240, file.size));
			reader.readAsText(first10KB);
		}
	}

	validate(file) {

	}

	bytesToString(bytes) {
		var displaybytes = bytes;
		var magnitude = 0;
		const scale = ["bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
		while (displaybytes > 512) {
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
		let activeStyle = { borderStyle: 'solid', backgroundColor: '#eee' };
		let rejectStyle = { borderStyle: 'solid', backgroundColor: '#ffcccc' };

		return (
			<div className={this.props.className}>
				<label>{this.props.label}</label>
				<Dropzone onDrop={(files) => this.onDrop(files) } multiple={false} style={style} activeStyle={activeStyle} rejectStyle={rejectStyle}>
					<b>Drag and drop a CSV file, or click to browse</b>
					<div style={{ padding: 15, textAlign: 'left' }}>
						<div>name: <i>{this.state.fileName}</i></div>
						<div>size: <i>{this.state.fileSize}</i></div>
						<div><b>{this.state.extraInfo}</b></div>
					</div>
				</Dropzone>
			</div >
		);
	}
}