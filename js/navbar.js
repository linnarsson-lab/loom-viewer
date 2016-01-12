import React, { Component, PropTypes } from 'react';
import { setViewState } from './actions';

export class Navbar extends Component {
  render() {
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
			  <span className="navbar-brand">{this.props.fileName}</span>
			</div>
			<div id="navbar" className="collapse navbar-collapse">
			  <ul className="nav navbar-nav">
				<li className={this.props.viewState == "Heatmap" ? "active" : ""}><a href="#" onClick={(event)=>this.props.onSetViewState('Heatmap')}>Heatmap</a></li>
				<li className={this.props.viewState == "Landscape" ? "active" : ""}><a href="#" onClick={(event)=>this.props.onSetViewState('Landscape')}>Landscape</a></li>
				<li className={this.props.viewState == "Sparkline" ? "active" : ""}><a href="#" onClick={(event)=>this.props.onSetViewState('Sparkline')}>Sparkline</a></li>
				<li><a href="#contact">Noise</a></li>
				<li className="dropdown">
				  <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Tools <span className="caret"></span></a>
				  <ul className="dropdown-menu">
					<li className="dropdown-header">Compute</li>
					<li><a href="#">New attribute</a></li>
					<li><a href="#">tSNE and PCA</a></li>
					<li><a href="#">QC Metrics</a></li>
					<li role="separator" className="divider"></li>
					<li className="dropdown-header">Cluster</li>
					<li><a href="#">BackSPIN</a></li>
					<li><a href="#">Affinity Propagation</a></li>
				  </ul>
				</li>
			  </ul>
			</div>
		  </div>
		</nav>      
  )}
}

Navbar.propTypes = {
	fileName: PropTypes.string.isRequired,
	viewState: PropTypes.string.isRequired,
	onSetViewState: PropTypes.func.isRequired
}