import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import DocumentTitle from 'react-document-title';

// Since this is constant, we hoist it
const navDataset = (
	<LinkContainer key='datasets' to='/'>
		<NavItem eventKey={'datasets'}>
			Loom
		</NavItem>
	</LinkContainer>
);

// the dummy header is needed to ensure
// the collapse menu behaves properly
const dummyHeader = (
	<Navbar.Header>
		<Navbar.Toggle />
	</Navbar.Header>
);

// the dummy Navbar is to ensure the views
// are displayed below the real Navbar.
const dummyNavBar = (
	<Navbar staticTop>
		<Navbar.Header>
			<Navbar.Brand>
				dummy
			</Navbar.Brand>
		</Navbar.Header>
	</Navbar>
);

const views = [
	{
		link: 'heatmap',
		label: 'Heatmap',
	},
	{
		link: 'sparklines',
		label: 'Sparklines',
	},
	{
		link: 'cells',
		label: 'Cell Scatterplot',
	},
	{
		link: 'cellmetadata',
		label: 'Cell Metadata',
	},
	{
		link: 'genes',
		label: 'Gene Scatterplot',
	},
	{
		link: 'genemetadata',
		label: 'Gene Metadata',
	},
];

export class NavbarView extends Component {
	render() {

		const {
			project,
			filename,
			viewStateURI,
		} = this.props.params;

		const isViewingDataset = project && filename;

		const datasetTitle = `${project}/${filename}`;

		const navTitle = (
			<NavItem
				key='title'
				eventKey={'title'}
				disabled>
				{isViewingDataset ?
					datasetTitle :
					'Data Sets'
				}
			</NavItem>
		);

		const viewLinks = isViewingDataset ?
			views.map(
				(view) => {
					const link = `/dataset/${view.link}/${datasetTitle}/${viewStateURI}`;
					return (
						<LinkContainer to={link} key={view.link}>
							<NavItem eventKey={view.link}>
								{view.label}
							</NavItem>
						</LinkContainer>
					);
				}
			) :
			null;


		const realNavBar = (
			<Navbar
				collapseOnSelect
				fixedTop
				fluid >
				{dummyHeader}
				<Navbar.Collapse>
					<Nav>
						{navDataset}
						{navTitle}
						{viewLinks}
					</Nav>
				</Navbar.Collapse>
			</Navbar>
		);

		return (
			<DocumentTitle
				key='document-title'
				title={isViewingDataset ?
					datasetTitle :
					'Loom'}>
				<div key='main-view' className='view-vertical'>
					<div key='NavBarContainer'>
						{realNavBar}
						{dummyNavBar}
					</div>
					{this.props.children}
				</div>
			</DocumentTitle>
		);
	}
}

NavbarView.propTypes = {
	// Passed down by react-router
	params: PropTypes.object.isRequired,
	children: PropTypes.node,
};