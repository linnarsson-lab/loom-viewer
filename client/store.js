import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';
import thunk from 'redux-thunk';

// import the root reducer
import loomAppReducer from './reducers/reducers';

export const store = createStore(
	loomAppReducer,
	composeWithDevTools(applyMiddleware(thunk))
);

// Uncomment when access from the console is required
// window.store = store;