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
						<div className="list-group-item col-md-6">
							<FileUpload label="Cell attributes:" id="CSV_cell" />
						</div>
						<div className="list-group-item col-md-6">
							<FileUpload label="Gene attributes: (optional)" id="CSV_gene_attributes" />
						</div>
					</div>
					<div className="panel-heading">Set parameters</div>
					<div className="list-group">
						<div className="list-group-item">
							<label for="input_n_features" >Number of features:</label>
							<input type="number" className="form-control" defaultValue="100" id="input_n_features" />
							<p>TODO: AP/Backspin dropdown</p>
							<label for="input_n_features" >Regression Label:</label>
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

export class FileUpload extends Component {
	onDrop (files) {
		console.log('Received files: ', files);
	}

	render () {
		let style = { width: '100%', height: '3em',
				padding: '2em', textAlign: 'center',
				borderWidth: 2, borderColor: '#666',
				borderStyle: 'dashed',borderRadius: 5
			};
		let activeStyle = { borderStyle: 'solid', backgroundColor: '#dfd' };
		let rejectStyle = { borderStyle: 'solid', backgroundColor: '#ffcccc' };
		return (
			<div>
				<label for={this.props.id}>{this.props.label}</label>
				<Dropzone onDrop={this.onDrop} multiple={false} id={this.props.id} style={style} activeStyle={activeStyle} rejectStyle={rejectStyle}>
					Click to select,&nbsp;or drag and drop a file
				</Dropzone>
			</div>

		);
	}
}