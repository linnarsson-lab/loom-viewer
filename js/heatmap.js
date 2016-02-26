import L from "leaflet";
import React, {PropTypes} from 'react';
import { render } from 'react-dom';

export class Heatmap extends React.Component {
	constructor(props) {
    	super(props);
	}

	handleViewChanged(map) {
		var bounds = map.getBounds();
		var sb = map.getPixelBounds();
		var dse = map.project(bounds.getSouthEast(), this.props.zoomRange[1]);
		var dnw = map.project(bounds.getNorthWest(), this.props.zoomRange[1]);

		var screenOrigin = {x: Math.max(0, -sb.min.x), y: Math.max(0, -sb.min.y)}
		var dataBounds = [Math.max(0,dnw.x), Math.max(0,dnw.y), Math.min(dse.x, this.props.shape[1]), Math.min(dse.y, this.props.shape[0])]
		var units = dnw.x/sb.min.x
		var screenBounds = [screenOrigin.x, screenOrigin.y, Math.round((dataBounds[2]-dataBounds[0])/units) + screenOrigin.x, Math.round((dataBounds[3]-dataBounds[1])/units) + screenOrigin.y]
		var bounds = {
			screenBounds: screenBounds,
			dataBounds: dataBounds,
			zoom: map.getZoom(),
			center: map.getCenter()
		};
		this.props.onViewChanged(bounds);
	}
	componentDidMount() {
		L.Icon.Default.imagePath = '/static/img';
		var map = L.map(this.refs.map, {
			maxZoom: this.props.zoomRange[2],
			minZoom: this.props.zoomRange[0] + 1,
			crs: L.CRS.Simple,
			attributionControl: false
		});

		L.tileLayer('/tiles/{z}/{x}_{y}.png', {
			maxZoom: this.props.zoomRange[2],
			minZoom: this.props.zoomRange[0] + 1,
			continuousWorld: false,
			noWrap: true,
			attribution: ''
		}).addTo(map);

		this.setState({"map": map});
		var southWest = map.unproject([0, this.props.fullZoomHeight], map.getMaxZoom());
		var northEast = map.unproject([this.props.fullZoomWidth, 0], map.getMaxZoom());
		map.on('move', (e) => { this.handleViewChanged(map) } );
		if(this.props.center.lat == 0 && this.props.center.lng == 0) {
			map.fitBounds(new L.LatLngBounds(southWest, northEast));
		} else {
			map.setView(this.props.center, this.props.zoom);
		}
		this.handleViewChanged(map);
	}

	componentDidUpdate() {
	}

	componentWillUnmount() {
		var map = this.state["map"];
		map.off('move', this.handleViewChanged);
	}

	render() {
		var heatmapStyle = {
			width: this.props.width + "px",
			height: this.props.height + "px"
		};
		return (
		  <div ref="map" style={heatmapStyle} className="stack-left-to-right"></div>
		);
	}
}

Heatmap.propTypes = {
	width: 			PropTypes.number.isRequired,
	height: 			PropTypes.number.isRequired,
	zoom: 			PropTypes.number.isRequired,
	center: 		PropTypes.object.isRequired,
	shape: 			PropTypes.arrayOf(PropTypes.number).isRequired,
	zoomRange: 		PropTypes.arrayOf(PropTypes.number).isRequired,
    fullZoomWidth: 	PropTypes.number.isRequired,
    fullZoomHeight: PropTypes.number.isRequired,
    onViewChanged: 	PropTypes.func.isRequired
  };
