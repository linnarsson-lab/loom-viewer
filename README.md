# Warning: partially outdated documentation

# Loom

Loom is

* `.loom`, an efficient file format for large omics datasets
* `loompy`, a Python library for creating and working with data in `.loom` format.
* `loom-viewer`, a web app for browsing large single-cell RNA-seq datasets

We recently split `loompy` into [a pure python package](https://github.com/linnarsson-lab/loompy) and a viewer. This repository is the viewer part.

## Installation

**Mac and Linux**: you can choose to install through PyPi, or build `loom-viewer` from source. 

**Windows users:** for now, the only option is to build from source. To ease this process we suggest using [cmder](http://cmder.net/) for a nicer terminal experience. You may want also to add the Anaconda installation directory to your system PATH variable, so that you can run any Python scripts by simply typing `python`. If you only installed Anaconda for this purpose and do not have any other Python installation you should be fine.

### Installing through pip

1. Install [Anaconda](https://www.continuum.io/downloads). **Note: Loom only works with Python version 3.x.**

2. Install Loom:

```bash
pip install loompy loom-viewer
```

Tip: Loom is updated often. To ensure you have the latest version, do this:

```bash
pip install -U loom-viewer
```

### Installing from source

1. Install [Anaconda](https://www.continuum.io/downloads). **Note: Loom only works with Python version 3.x.**

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

## Getting started

### The Loom viewer

**Mac and Linux:**

To start the server you open a terminal and type:

```bash
loom
```

This will automatically open `localhost:8003` in your default browser, and likely show a message that our usage of `fetch` is (somehow) broken if you are on Safari (bug #121). The real reason is that the local server looks for loom files in `loom-datasets` and did not find any.

**Windows:** 

To start the server, and provided you added Anaconda to your path, you can double-click `loom.bat` in the `loom-viewer` directory. This is just a micro-script that reads `python.exe .\python\loom_viewer\loom`

We use that `loom.bat` file to "fake" the `loom` CLI tool, so you have to be in the root folder of the `loom-viewer` repo to use it. Maybe some day we'll figure out how to properly package this as a CLI app in Windows (any suggestions are welcome!).

### Where the server looks for Loom files

The first time you run `loom`, a `loom-datasets` folder will be created in your home folder. You can also explicitly point the `loom` tool to a different path with the following flag: `--dataset-path <your path here>`

By default, the `loom-datasets` folder is where the `loom-viewer` server looks for Loom files. The root of `loom-datasets` is reserved for folders (everything else will be ignored), which represent individual projects. The Loom files are then stored in the project folders:

```bash
loom-datasets/
├── #Project 1 (folder)
│   ├── # dataset1.loom (loom file)
│   └── # dataset2.loom (loom file)
└── #Project 2 (folder)
    ├── # dataset1.loom (loom file)
    └── # dataset2.loom (loom file)
```

So to get started, either create a Loom file with [`loompy`](https://github.com/linnarsson-lab/loompy), or download it from [somewhere](http://loom.linnarssonlab.org/) (this is our public dataset loom server), then place it in the appropriate project folder. For example, say that we have downloaded a `cortex.loom` file containing data about [some paper](http://science.sciencemag.org/content/347/6226/1138), and store it in a `Published` project folder like so:

```bash
loom-datasets/
└── Published
    └── cortex.loom
```

When we start the loom server and open `localhost:8003`, the resulting view should be something like:

![image](https://user-images.githubusercontent.com/259840/31838214-075f1cde-b5dc-11e7-898e-6c7fca4ba8ea.png)

### Viewing the heatmap and genes
Once the Loom file is in place in a project folder, heat map tiles and gene expression value views need to be pre-generated from the Loom file for quick static serving. This is also required since h5py can not safely cope with multiple people accessing the same Loom file simultanously. The pre-generation steps are performed from the command line (we're planning to add this expansion to the web-interface, to be more accessible to people less familiar with the command line - see issue #114):

```bash
loom tile cortex.loom
loom expand -r cortex.loom
```

The output should look similar to this:

```bash
> loom tile cortex.loom

2017-10-20 21:39:31,680 - INFO - Found 1 projects
2017-10-20 21:39:31,680 - INFO - Entering project /home/job/loom-datasets/Published
2017-10-20 21:39:31,680 - INFO -   Connecting to cortex.loom at full path
2017-10-20 21:39:31,714 - INFO -     Precomputing heatmap tiles (stored in cortex.loom.tiles subfolder)

> loom expand -r cortex.loom

2017-10-20 21:15:02,688 - INFO - Found 1 projects
2017-10-20 21:15:02,688 - INFO - Entering project /home/job/loom-datasets/Published
2017-10-20 21:15:02,688 - INFO -   Connecting to cortex.loom at full path
2017-10-20 21:15:03,335 - INFO -     Expanding rows (stored in /home/job/loom-datasets/Published/cortex.loom.rows subfolder)
```

Note: the `loom tile` and `loom expand` commands will automatically search _all_ projects for _all_ matching file names, and expand each. Unique file names are therefore encouraged! To make sure only one single Loom file is processed, specify the absolute path instead, e.g.:

```
loom tile /home/me/loom-datasets/PublishedOldVersion/cortex.loom
```

Because expansion can be slow for larger Loom files, the command checks if the relevant subfolder already exists and skips expansion if it does. Meaning that if you abort gene expansion halfway, the unexpanded genes will not be added if you try again. To force that, run: `loom expand -rt cortex.loom` (`t` for "truncate"), which generates newly expanded files for _all_ genes, even the previously expanded ones. Alternatively, delete the subfolder in question.

### Other uses of the `loom` command-line tool

To learn more about the `loom` tool, open your terminal, and type:

```bash
loom --help
```

**NOTE:** For the purpose of the loom viewer, only `expand`, `expand-project`, `expand-all` and `tile` are supported. Consider all other commands deprecated (some are actually broken at the moment). They originated from before the `loompy`/`loom-viewer` split and will be removed soon. 

For help with individual commands, just type:

```bash
loom [command] --help

