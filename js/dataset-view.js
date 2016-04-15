import React, { Component, PropTypes } from 'react';
import { fetchDataset } from './actions.js';
import Dropzone from 'react-dropzone';

export class DatasetView extends Component {

	render () {
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
							{panels.length === 0 ? "(loading...)" : panels}
						</div>
						<h4>Create a new dataset</h4>
						<div>
							<CreateDataset />
						</div>
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
	render (){
		return (
			<div class="panel panel-primary">
				<div className="panel panel-heading">
					<FileUpload instructions="Click to select a CSV file with cell attributs (drag and drop also works)" class="panel-body" />
					<FileUpload instructions="(optional) Click to select a CSV file with cell attributs (drag and drop also works)" class="panel-body" />
					<p>n_features: <input type="number" defaultValue="100" /></p>
				</div>
			</div>
		);
	}
}

export class FileUpload extends Component {
	onDrop(file) {
		console.log('Received file: ', file);
    }

	render() {
		return (
			<Dropzone onDrop={this.onDrop} multiple={false}>
				<div>{this.props.instructions}</div>
			</Dropzone>
		);
	}
}
