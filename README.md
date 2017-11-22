# Loom-viewer

Loom is

* `.loom`, an efficient file format for large omics datasets
* `loompy`, a Python library for creating and working with data in `.loom` format.
* `loom-viewer`, a web app for browsing large single-cell RNA-seq datasets

This repository is the loom-viewer part. Read more about .loom and loompy [here](https://github.com/linnarsson-lab/loompy).

## Installation

**Mac and Linux**: you can choose to install through PyPi, or build `loom-viewer` from source. 

**Windows users:** for now, the only option is to build from source. To ease this process we suggest using [cmder](http://cmder.net/) for a nicer terminal experience. You may want also to add the Anaconda installation directory to your system PATH variable, so that you can run any Python scripts by simply typing `python`. If you only installed Anaconda for this purpose and do not have any other Python installation you should be fine.

### Installing through pip

1. Install [Anaconda](https://www.continuum.io/downloads). **Note: loompy and loom-server only works with Python version 3.x.**

2. Install Loom:

```bash
pip install loompy loom-viewer
```

Tip: Loom is updated often. To ensure you have the latest version, do this:

```bash
pip install -U loom-viewer
```

### Installing from source

1. Install [Anaconda](https://www.continuum.io/downloads). **Note: loompy and loom-server only works with Python version 3.x.**

2. If you haven't already, install [`loompy`](https://github.com/linnarsson-lab/loompy), either from source or through PyPI:

```bash
pip install loompy
```
3. Install [node.js](https://nodejs.org/en/)

4. Clone this repository with git

5. Open a terminal in the newly created `loom-viewer` folder, and install all required node packages:

```bash
npm install
```

6. Run the build script. On Mac/Linux:

```bash
./build
```
On Windows, double-click (or type) `build.bat`.

## The Loom CLI tool

**Mac and Linux:**

After installation, you should have access to the `loom` CLI. 

**Windows:**

Installing a CLI program on Windows requires modifying path variables. So instead we have provided a `loom.bat` file in the `loom-viewer` directory. This mimicks the same functionality as the loom CLI on Mac and Linux environments, provided that you added Anaconda to your path, and that you are in the root directory of your `loom-viewer` installation. 

(Under the hood, this is just a micro-script that runs `python.exe .\python\loom_viewer\loom`. Maybe some day we will figure out how to properly package this as a CLI app in Windows; any suggestions are welcome!)

#### Using the CLI tool

Test if everything works correctly by typing:

```bash
loom
```

(Windows users can also double-click `loom.bat` in the `loom-viewer` directory)

This will start a local server, and automatically open `localhost:8003` in your default browser. Since this is the first time running the tool, it will fail to find any datasets, showing an empty list and an error message about fetch being broken on Safari.

Close the server for now (CTRL+C on Linux/Windows, CMD+C on Mac).

To learn more about the loom tool, type:

```bash
loom --help
```

For help with individual commands, just type:

```bash
loom [command] --help
```

**NOTE:** For the purpose of the loom viewer, only `expand`, `expand-project`, `expand-all`,`tile`, and `tile-project` are supported. Consider all other commands deprecated. They originated from before the `loompy`/`loom-viewer` split and may be removed soon.

## Getting started

To view our loom files, we have to go through the following steps:

1. Store the loom files in a project directory where the viewer can find it
2. To access gene expression data, expand the gene rows (optional)
3. To see heatmap tiles, generate them for the loom file (optional)
4. Start the loom server, or if it is already running, refresh the dataset lists page

### Where the server looks for Loom files

The first time you run `loom`, a `loom-datasets` folder will be created in your home folder. By default, the `loom-datasets` folder is where the `loom-viewer` server looks for Loom files. 

You can explicitly point the `loom` tool to a different path with the following flag: `--dataset-path <your path here>`

The root of the datasets folder is reserved for folders (everything else will be ignored). Folders represent individual projects. The Loom files are stored in these project folders:

```bash
loom-datasets/
├── # Project 1 (folder)
│   ├── # dataset1.loom (loom file)
│   └── # dataset2.loom (loom file)
└── # Project 2 (folder)
    ├── # dataset1.loom (loom file)
    └── # dataset2.loom (loom file)
```

Either create a Loom file with [`loompy`](https://github.com/linnarsson-lab/loompy), or download it from somewhere (like [our own loom-viewer website with published datasets](http://loom.linnarssonlab.org/)). Place it in the appropriate project folder. For example, say that we have downloaded a `cortex.loom` file containing data about [some paper](http://science.sciencemag.org/content/347/6226/1138), and store it in a `Published` project folder like so:

```bash
loom-datasets/
└── Published
    └── cortex.loom
```

Once we start the loom server (see below) and open `localhost:8003`, the resulting view should be something like:

![image](https://user-images.githubusercontent.com/259840/31838214-075f1cde-b5dc-11e7-898e-6c7fca4ba8ea.png)

### Genes and Heatmap Tiles

Once the Loom file is in place in a project folder, we only have access to the standard metadata attributes.

To view gene expression values and heat map tiles, they must be expanded from the Loom file. **Note: the expanded files are _not_ automatically updated when changing data in a loom file, meaning the viewer may show the old data! To fix this, re-do this step with the added -t flag (for "truncate", telling loom to overwrite the old files)**

This expansion currently done through the command line (we are working on a web-interface for this, to be more accessible to people less familiar with the command line - see issue #114):

```bash
loom tile cortex.loom        # generates PNG tiles from data matrix for heatmap view
loom expand -r cortex.loom   # expands gene epression data into zipped JSON files
```

The output should look similar to this:

```bash
> loom tile cortex.loom

2017-10-20 21:39:31,680 - INFO - Found 1 projects
2017-10-20 21:39:31,680 - INFO - Entering project /home/job/loom-datasets/Published
2017-10-20 21:39:31,680 - INFO -   Connecting to cortex.loom at full path
2017-10-20 21:39:31,714 - INFO -     Precomputing heatmap tiles (stored in cortex.loom.tiles subfolder)

> loom expand -mar cortex.loom

2017-10-20 21:15:02,688 - INFO - Found 1 projects
2017-10-20 21:15:02,688 - INFO - Entering project /home/job/loom-datasets/Published
2017-10-20 21:15:02,688 - INFO -   Connecting to cortex.loom at full path
2017-10-20 21:15:03,335 - INFO -     Expanding rows (stored in /home/job/loom-datasets/Published/cortex.loom.rows subfolder)
```

Note: the `loom tile` and `loom expand` commands will automatically search _all_ projects for _all_ matching file names, and expand each. Unique file names are therefore encouraged! To make sure only one single Loom file is processed, specify the absolute path instead, e.g.:

```
loom tile /home/me/loom-datasets/PublishedOldVersion/cortex.loom
```

Because expansion can be slow for larger Loom files, the command checks if the relevant subfolder already exists and skips expansion if it does. So if gene expansion is aborted without finishing, the unexpanded genes will not be added when `loom expand` again. To override this, run: `loom expand -rt cortex.loom` (`t` for "truncate"), which generates newly expanded files for _all_ genes, even the previously expanded ones. Alternatively, delete the subfolder in question.

### Starting the server

To start the server, open a terminal and type:

```bash
loom
```

(Windows users can also double-click `loom.bat` in the `loom-viewer` directory)

This will start a local server, and automatically open `localhost:8003` in your default browser.

If you see the message that `fetch` is broken if you are on Safari (bug #121), and you are not using Safari, this means that the server failed to find any loom files. See above for instructions how to set up the datasets directory

If you see no heatmap tiles or get no gene expression, you may have forgotten to expand the loom file. See above for instructions.

### FAQ

#### I'm getting the message that fetch is broken on Safari, but I'm using [some other browser than Safari]

The loom server cannot find any loom files, but the website mistakenly thinks it failed to fetch the list of loom files (which is guaranteed to happen on Safari anyway, hence the warning message).

See above for where and how to store your loom files so that the server can find them.

If this did not solve your problem, open an issue.

#### Help, there are no heatmap tiles!

If you have not done so yet, generate the tiles for the heatmap first with `loom tile [loom file]`. See above for more details.

If you _have_ done so but something went wrong, you can try again with `loom tile -t [loom file]`.

#### Help, generating tiles fails with `ERROR - module 'scipy.misc' has no attribute 'toimage'`!

It looks like you're missing the required image library. This can happen if you use MiniConda, which has fewer default packages. Try installing it with `conda install pillow`.

#### Help, Gene expression data is displayed as zero for all genes!

If you have not done so yet, generate the tiles for the heatmap first with `loom expand [loom file]`. See above for more details.

If you _have_ done so but something went wrong, you can try again with `loom expand -t [loom file]`.

#### Why is pre-generation required for viewing heatmap tiles or gene expression data anyway?

There are two reasons for this:

First, h5py can not safely cope with multiple people accessing the same Loom file simultanously. This is not a problem when exploring loom files locally (unless you open the same loom file in multiple tabs), but when using the `loom-viewer` as a server to set up a website for sharing loom-files, two or more people opening the same loom files will cause the server to crash.

Second, loading the genes from the loom file and converting it to either JSON or a PNG is a fairly slow process. As the loom file does not change, it is also wasteful to do it multiple times, since the results will always be the same. As a result, serving pre-generated static files is thousands of times faster.
