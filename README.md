# Loom

Loom is a browser for working with large-scale single-cell RNA-seq datasets stored in `.loom` format. You can visualize the data using heatmaps, tSNE plots, PCA and sparklines. In the future, you may be able to run clustering and similar tools from inside Loom.

### Using Loom

1. Install [Anaconda](https://www.continuum.io/downloads) for **Python 2.7** (not 3.xx).
2. Install dependencies

```
conda install click
```

2. Download the latest Loom release and unzip it to a folder.
3. Get a dataset in .loom format (e.g. "cortex.loom").
4. Run `loom cortex.loom` in your Terminal.
5. Go to `localhost:5000` in your browser.
 
### Building Loom

1. Install `node` ([Node.js](https://nodejs.org/en/))
2. Use Terminal and go to the main Loom folder(`cd Loom`)
3. Install required node modules using `npm`

```
sudo npm install -g browserify
sudo npm install -g uglify-js
sudo npm install -g uglifycss
npm install babelify
npm install babel-preset-es2015 babel-preset-react
npm install whatwg-fetch
npm install lodash
npm install react
npm install redux
npm install react-redux
npm install redux-thunk
npm install bootstrap
npm install leaflet
npm install autoscale-canvas
```

4.  Run `build` 

This will create a new folder `release`. Run `release/loom filename.loom` to start the loom server.

