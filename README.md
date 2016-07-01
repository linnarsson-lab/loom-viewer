# Loom

Loom is a browser for working with large-scale single-cell RNA-seq datasets stored in `.loom` format. You can visualize the data using heatmaps, tSNE plots, PCA and sparklines. In the future, you may be able to run clustering and similar tools from inside Loom.

### The `.loom` file format

Loom works with files in `.loom` format, a fast, scaleable format for omics data. To learn more, read the [`.loom` User Guide](/docs/loom_format.md).

### Using Loom

1. Install [Anaconda](https://www.continuum.io/downloads) for **Python 2.7** (not 3.xx).
2. Download the [latest release](https://github.com/linnarsson-lab/Loom/releases).
3. Get a dataset in .loom format (e.g. `data/cortex_5000.loom` in this Git repo).
4. Run `loom` in your Terminal (from the `release` directory).
5. Go to `localhost:5000` in your browser.
6. Enjoy.

##### Troubleshooting

The Loom server starts and says something like:
```
Serving from: /Users/gioele/Loom
 * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
127.0.0.1 - - [16/Jan/2016 17:52:11] "GET / HTTP/1.1" 404 -
```
...but you get "404 Not Found" in the browser. Make sure you are running "loom" from the release folder, and not from the root of the repository.


### Building Loom

If you want to contribute to Loom, you need to set up your development environment:

1. Install `node` ([Node.js](https://nodejs.org/en/) - Debian and Ubuntu users are advised not to install the default package but [follow these instructions](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions))
2. Start Terminal and `cd` to where you want to work: `cd my-dev-dir`
3. Clone this repository: `git clone https://github.com/linnarsson-lab/Loom.git`
4. Go to the main Loom folder (`cd Loom`)
5. Install required node modules using `npm`

```
sudo npm install -g uglify-js
sudo npm install -g uglifycss
sudo npm install -g webpack
npm install
```

Run `./build`

This will bundle the app in the `python/static` folder. Run `python ./python/loom_server.py` to start the loom server (or `python ./python/loom_server.py debug` to run the server in debug mode).