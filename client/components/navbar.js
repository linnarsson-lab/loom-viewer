import React, { Component, PropTypes } from 'react';
import { setViewState } from '../actions/actions';

export class Navbar extends Component {
	render() {
		const {viewState, dataState, onSetViewState } = this.props;
		const view = viewState.view;

		return (
			<nav className='navbar navbar-default navbar-fixed-top'>
				<div className='container'>
					<div className='navbar-header'>
						<button
							type='button'
							className='navbar-toggle collapsed'
							data-toggle='collapse'
							data-target='#navbar'
							aria-expanded='false'
							aria-controls='navbar' >
							<span className='sr-only'>Toggle navigation</span>
							<span className='icon-bar'></span>
							<span className='icon-bar'></span>
							<span className='icon-bar'></span>
						</button>
						<span className='navbar-brand'>{dataState.currentDataset.name}</span>
					</div>
					<div id='navbar' className='collapse navbar-collapse'>
						<ul className='nav navbar-nav'>
							<li className={ view === 'Dataset' ? 'active' : ''}><a href='#' onClick={ () => { onSetViewState('Dataset'); } }>Dataset</a></li>
							<li className={ view === 'Heatmap' ? 'active' : ''}><a href='#' onClick={ () => { onSetViewState('Heatmap'); } }>Heatmap</a></li>
							<li className={ view === 'Landscape' ? 'active' : ''}><a href='#' onClick={ () => { onSetViewState('Landscape'); } }>Landscape</a></li>
							<li className={ view === 'Sparkline' ? 'active' : ''}><a href='#' onClick={ () => { onSetViewState('Sparkline'); } }>Sparkline</a></li>
							<li className={ view === 'Genescape' ? 'active' : ''}><a href='#' onClick={ () => { onSetViewState('Genescape'); } }>Genescape</a></li>
						</ul>
					</div>
				</div>
			</nav>
		);
	}
}

Navbar.propTypes = {
	viewState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	onSetViewState: PropTypes.func.isRequired,
}