import React, { Component, PropTypes } from 'react';
import { setViewState } from './actions';

export class Navbar extends Component {
  render() {
  	var vs = this.props.viewState;
  	var ds = this.props.dataState;

	return(
		<nav className="navbar navbar-default navbar-fixed-top">
		  <div className="container">
			<div className="navbar-header">
			  <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
				<span className="sr-only">Toggle navigation</span>
				<span className="icon-bar"></span>
				<span className="icon-bar"></span>
				<span className="icon-bar"></span>
			  </button>
			  <span className="navbar-brand">{ds.currentDataset.name}</span>
			</div>
			<div id="navbar" className="collapse navbar-collapse">
			  <ul className="nav navbar-nav">
				<li className={vs.view == "Dataset" ? "active" : ""}><a href="#" onClick={(event)=>this.props.onSetViewState('Dataset')}>Dataset</a></li>
				<li className={vs.view == "Heatmap" ? "active" : ""}><a href="#" onClick={(event)=>this.props.onSetViewState('Heatmap')}>Heatmap</a></li>
				<li className={vs.view == "Landscape" ? "active" : ""}><a href="#" onClick={(event)=>this.props.onSetViewState('Landscape')}>Landscape</a></li>
				<li className={vs.view == "Sparkline" ? "active" : ""}><a href="#" onClick={(event)=>this.props.onSetViewState('Sparkline')}>Sparkline</a></li>
				<li className={vs.view == "Genescape" ? "active" : ""}><a href="#" onClick={(event)=>this.props.onSetViewState('Genescape')}>Genescape</a></li>
			  </ul>
			</div>
		  </div>
		</nav>      
  )}
}

Navbar.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	onSetViewState: PropTypes.func.isRequired
}