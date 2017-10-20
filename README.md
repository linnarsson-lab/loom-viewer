# Warning: heavily outdated documentation

We recently split `loompy` into [a pure python package](https://github.com/linnarsson-lab/loompy) and a viewer.

This repository is the viewer part, but the documentation still mentions `loompy`.

Furthermore, the documentation has not really changed since the beginning, and a lot has changed. Now that the code is public we'll try to update the docs soon

# Loom

Loom is

* `.loom`, an efficient file format for large omics datasets
* `loompy`, a Python library for creating and working with data in `.loom` format.
* [deprecated] `loom`, a command-line tool for manipulating `.loom` files.
* `loom-viewer`, a web app for browsing large single-cell RNA-seq datasets


## Installation

This describes two ways to install loom - from source or through pip.

### Installing through pip

1. Install [Anaconda](https://www.continuum.io/downloads). **Note: Loom only works with Python version 3.x.**

2. Install Loom:

```bash
pip install loom-viewer
```

Tip: Loom is updated often. To ensure you have the latest version, do this:

```bash
pip install -U loom-viewer
```

### Installing from source

1. Install [Anaconda](https://www.continuum.io/downloads). **Note: Loom only works with Python version 3.x.**

2. Install [node.js](https://nodejs.org/en/)

3. Clone this repository

4. Open a terminal in the newly created `loom-viewer` folder, and run:

```bash
npm install
./build
```

## Getting started

### The Loom viewer

Open your terminal, and type

```bash
loom
```

It will automatically open your default browser, and likely show a message that our usage of `fetch` is (somehow) broken on Safari (bug #121). The real reason is that the local server looks for loom files in `loom-datasets` and did not find any.

### Where the viewer looks for Loom files

The first time you run `loom`, a `loom-datasets` folder will be created in your home folder. This is where the Loom viewer looks for Loom files by default. The root of `loom-datasets` is reserved for folders (everything else will be ignored), which represent individual projects. The project folders then store the loom files:

```bash
loom-datasets/
├── #Project 1 (folder)
│   ├── # dataset1.loom (loom file)
│   └── # dataset2.loom (loom file)
└── #Project 2 (folder)
    ├── # dataset1.loom (loom file)
    └── # dataset2.loom (loom file)
```

Either create a Loom file with [`loompy`](https://github.com/linnarsson-lab/loompy), or download it from [somewhere](https://loom.linnarssonlab.org/), then place it in the appropriate project folder

To learn more about the Loom browser, ~~read the [Loom Guide](docs/loom_browser.md)~~ ask Job, until he takes the time to write out that guide.

### The `loom` command-line tool

Open your terminal, and type:

```bash
loom --help
```

To learn more about the `loom` command-line tool, read the [loom command-line documentation](docs/loom.md).

### The `loompy` Python package

Start a [Jupyter Notebook](http://jupyter.readthedocs.io/en/latest/index.html), in your terminal:

```python
jupyter notebook
```

Import `loompy` and connect to a dataset:

```python
import loompy
ds = loompy.connect("filename.loom")
```

To learn more about the `loompy` package, read the [loompy package documentation](docs/loompy.md).


### The `.loom` file format

For a detailed information, read the [`.loom` format specification](docs/loom_spec.md)
