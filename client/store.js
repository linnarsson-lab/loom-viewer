import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { syncHistoryWithStore } from 'react-router-redux';
import { browserHistory } from 'react-router';

// import the root reducer
import loomAppReducer from './reducers/reducers';

export const store = createStore(
	loomAppReducer,
	compose(
		applyMiddleware(thunk),
		window.devToolsExtension ? window.devToolsExtension() : (f) => { return f; }
	)
);

export const history = syncHistoryWithStore(browserHistory, store);