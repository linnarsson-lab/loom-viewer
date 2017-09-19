import { render } from 'react-dom';

// Import all CSS once, at the top level

import 'react-select/dist/react-select.css';
import 'react-virtualized/styles.css';
import 'react-virtualized-select/styles.css';
import 'rc-slider/assets/index.css';

// Modified for crisp zoom
import './css/leaflet_crisp.css';
import './css/bootstrap.css';
import './css/loom.css';

import Routes from './components/routes';
render(Routes, document.getElementById('react-root'));