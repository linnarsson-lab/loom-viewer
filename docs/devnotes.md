
Next steps
==========
```
Show popups overlaid on top of the heatmap (for Find genes)

Sparkline view
	Sort by col attr
	Color by col attr
	Show col attribute on top
	Enter list of genes to show
Landscape view
	Automatically scale marker diameters based on total number of markers
	x Select X and Y coordinates
	x Buttons to quickly select tSNE or PCA
	x Select cell annotation or (gene)
	x Input gene to show as color

Work with gene sets
	Select gene sets from Panther (incl GO)
	Upload gene sets
	Named gene sets get added to Sparkline view

Summary view
Tool runner
Back-end based on files instead of .h5 (for concurrent read-only access)
Make URL namespace include hash of matrix, to allow concurrent access to multiple files
Tool (page) to download the backing data (for data portal)
Maybe use Celery to run tools in background
```


Development stack
=================

```
As of Dec 2015, this is the technology stack used for developing Loom


Editor
------

Sublime Text 3
Babel package for JS and JSX files


Server (Python)
---------------

Anaconda Python distribution, using at least the following packages
	Scipy
	Numpy
	Flask web server
	h5py, HDF5 file I/O
	click					conda install click


Client (JavaScript)
-------------------

The client is built as a single-page app with React (UI) and Redux (state manegement). 
We use a build system to automatically compile JSX (and ES2015 syntax) to standard javascript, as well as
to resolve module dependencies, and package and minify everything.

The UI is built as a collection of React components, written as ES6 classes, one per file.

The UI uses Bootstrap for basic layout, Leaflet for the heatmap, and D3 for other visualizations.
Since D3 and React both take control of the DOM, we use approach #2 from here: http://ahmadchatha.com/writings/article1.html
Leaflet has the same issue, and is solved in the same way (see heatmap.js)


	Build system
	------------
	Node package manager (npm)						
	Browserify 										sudo npm install -g browserify
	Uglify JS 2 									sudo npm install -g uglify-js		[NOT the same as uglifyjs, note the hyphen!]
	Uglify CSS										sudo npm install -g uglifycss
	Babelify (https://github.com/babel/babelify)	npm install babelify
	Babel presets, es2015 and react 				npm install babel-preset-es2015 babel-preset-react


	Helper libraries
	----------------
	whatwg-fetch									npm install whatwg-fetch
	lodash											npm install lodash


	User interface
	--------------
	React 											npm install react
	Redux 											npm install redux
													npm install react-redux
													npm install redux-thunk
	Bootstrap										npm install bootstrap 				[Also get the CSS separately]
	Leaflet											npm install leaflet 				[Also get the CSS separately]
	Autoscale-canvas (for high-DPI screens)			npm install autoscale-canvas

```
