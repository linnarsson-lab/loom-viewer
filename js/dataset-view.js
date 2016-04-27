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
	render() {
		return (
			<div>
				<div className='panel panel-primary'>
					<div className='panel-heading'>Attach CSV files below</div>
					<div className='list-group'>
						<CSVFileChooser className='list-group-item' label='Cell attributes:'/>
						<CSVFileChooser className='list-group-item' label='[OPTIONAL] Gene attributes:' />
					</div>
					<div className='panel-heading'>Set parameters</div>
					<div className='list-group'>
						<div className='list-group-item'>
							<div className='form-group'>
								<label for='input_n_features'>Number of features: </label>
								<div>
									<input type='number' className='form-control' defaultValue='100' id='input_n_features' />
								</div>
							</div>
							<div className='form-group'>
								<label  for='clustering_method'>Clustering Method: </label>
								<div>
									<select id='clustering_method'>
										<option>BackSPIN</option>
										<option>Affinity Propagation</option>
									</select>
								</div>
							</div>
							<div className='form-group'>
								<label for='input_regression_label'>Regression Label: </label>
								<div>
									<input type='text' className='form_control' defaultValue='' id='input_regression_label' />
								</div>
							</div>
						</div>
					</div>
				</div >
				<br />
				<div className='pull-right'>
					<button type='submit' className='btn btn-default'>Submit request for new dataset</button>
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
			contentInfo: [],
		};
		this.setState(newState);

		if (file.size > 0) {
			// take the first 10kb, or less if the file is smaller
			// and validate it asynchronously
			let first10KB = file.slice(0, Math.min(10240, file.size));
			this.validate(first10KB);

		}
	}

	validate(file) {
		// Since file IO is asynchronous, validation needs
		// to be done as a callback, calling setState when done
		let reader = new FileReader();
		reader.onload = () => {
			let subStrIdx = -1;
			// grab up to the first eight lines
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

			if (reader.result.indexOf(';') !== -1) {
				newState.contentInfo.push('Semicolons found, check if this is a properly formatted CSV');
				newState.validContent = false;
			} else if (reader.result.indexOf(',') === -1) {
				newState.contentInfo.push('No commas found, check if this is a properly formatted CSV');
				newState.validContent = false;
			} else if (this.state.fileIsCSV) {
				newState.validContent = true;
			}
			this.setState(newState);
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