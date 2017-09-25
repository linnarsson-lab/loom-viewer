import { render } from 'react-dom';

// initiate any custom polyfills that we might have
import 'js/polyfills';

// Import all CSS once, at the top level

// react-virtualized-select
import 'react-select/dist/react-select.css';
import 'react-virtualized/styles.css';
import 'react-virtualized-select/styles.css';

// rc-slider
import 'rc-slider/assets/index.css';

// Modified for crisp zoom
import './css/leaflet_crisp.css';
// Required for react-bootstrap
import './css/bootstrap.css';
import './css/bootstrap-theme.css';
// Custom loom CSS
import './css/loom.css';

import Routes from './components/routes';
render(Routes, document.getElementById('react-root'));