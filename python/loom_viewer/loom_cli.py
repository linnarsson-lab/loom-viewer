#!/usr/bin/env python

# Copyright (c) 2016 Sten Linnarsson
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# * Redistributions of source code must retain the above copyright notice, this
#   list of conditions and the following disclaimer.
#
# * Redistributions in binary form must reproduce the above copyright notice,
#   this list of conditions and the following disclaimer in the documentation
#   and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

from typing import *
from mypy_extensions import NoReturn

import sys
import os

import argparse
import logging
import warnings

import loompy
from ._version import __version__
from .loom_expand import LoomExpand
from .loom_datasets import def_dataset_dir, LoomDatasets
from .loom_server import start_server


class VerboseArgParser(argparse.ArgumentParser):

	def error(self, message: str) -> NoReturn:
		self.print_help()
		sys.stderr.write("\nerror: %s\n" % message)
		sys.exit(2)


def tile_command(
	datasets: LoomDatasets,
	filenames: List[str],
	projects: List[str],
	all_files: bool,
	truncate: bool) -> None:
	# do not expand tiles more than once for any given filename
	matches = set()  # type: Set[Tuple[str, str, str]]
	filenamesNone = filenames is None
	projectsNone = projects is None
	logging.warn("""
	%s
	%s
""" % (filenamesNone, projectsNone))

	if all_files:
		matches = datasets.list.all_files()
	else:
		if filenames is not None:
			for filename in filenames:
				matches |= datasets.list.matching_filenames(filename)

		if projects is not None:
			for project in projects:
				matches |= datasets.list.files_in_project(project)

	if not matches:
		logging.warn("""

Must explicitly state what to tile! See also:

    loom tile --help


To generate tiles for every loom file in the default dataset folder, type:

    loom tile --all

To use a different dataset path, use `--dataset-path DATASET_PATH`. Note that
this must be put before the tile command:

    loom --dataset-path DATASET_PATH tile [input for tile command]


To generate tiles for any loom file in the default dataset folder that matches
the names of FILE1, FILE2, etc, type:

    loom tile FILE1 FILE2


To replace old tiles with new ones, add the -t or --truncate flag

   loom tile FILE -t


To generate tiles only for one specific file, even if there are multiple files
with the same name, use the absolute path:

    loom tile /path/to/FILE1 FILE2


To tile all files in one or more project folders, type:

    loom tile --project PROJECT1 PROJECT2

Combining file and project paths is possible:

    loom /path/to/FILE1 FILE2 --project PROJECT


Putting it all together: the following points to a non-default dataset path,
and generates tiles for one specific FILE, as well as all files in PROJECT,
while discarding any previously generated tiles:

    loom --dataset-path DATASET_PATH tile /path/to/FILE --project PROJECT -t

""")
	else:
		for project, filename, file_path in matches:
			logging.info("Tiling {file_path}")
			datasets.tile(project, file_path, truncate)


def expand_command(
	datasets: LoomDatasets,
	filenames: List[str],
	projects: List[str],
	all_files: bool,
	clear: bool,
	metadata: bool,
	attributes: bool,
	rows: bool,
	cols: bool,
	truncate: bool) -> None:
	if not (clear or metadata or attributes or rows or cols):
		logging.warn("""

`loom expand` pre-generates cache for the loom-viewer, for faster serving.
This is a slow process, so that the command requires that you explicitly state
which cache to generate ("expand"), and for which loom file(s).

See also:

    loom expand --help

Currently, the following separate types of cache can be expanded with these flags:

    -m, --metadata     general metadata
    -a, --attributes   row and column attributes
    -r, --rows         rows (genes)
    -c, --cols         columns (cells, currently not used)

In the following examples, we will expand metadata, attributes and all rows
all at once via -mar.


To expand all loom files matching the name FILE1, FILE2, etc in the default
loom datasets folder, type:

    loom expand FILE1 FILE2 -mar


To expand a specific file, even if there are multiple files
with the same name, use the absolute path:

    loom tile /path/to/FILE1 FILE2


To use a different dataset path, use `--dataset-path DATASET_PATH`. Note that
this must be put before the tile command:

    loom --dataset-path DATASET_PATH expand FILE -mar


To apply expansion to all loom files, use --all or -A:

    loom expand -marA


To apply expansion to all loom files in one or more project folders, type:

    loom expand --project PROJECT1 PROJECT2 -mar


By default, previously expanded metadata is left alone. To force replacing this
expanded data, use --truncate or -t:

    loom expand FILE -marT


To remove ALL previously generated cache (except tiles), use --clear or -C

    loom expand FILE -C


Putting it all together: the following points to a non-default dataset path,
finds one specific FILE, as well as all files in PROJECT. For these files,
any existing expanded metadata is first deleted, then new general metadata and
attributes are expanded (but not rows)
while discarding any previously generated tiles:

    loom --dataset-path DATASET_PATH expand /path/to/FILE --project PROJECT -maC
""")
		return

	matches = set()  # type: Set[Tuple[str, str, str]]

	if all_files:
		matches = datasets.list.all_files()
	else:
		for filename in filenames:
			matches |= datasets.list.matching_filenames(filename)

		for project in projects:
			matches |= datasets.list.files_in_project(project)

	for project, filename, file_path in matches:
		try:
			expand = LoomExpand(project, filename, file_path)
			if not expand.closed:
				if clear:
					expand.clear_metadata()
					expand.clear_attributes()
					expand.clear_rows()
					expand.clear_columns()
				if metadata:
					expand.metadata(truncate)
				if attributes:
					expand.attributes(truncate)
				if rows:
					expand.rows(truncate)
				if cols:
					expand.columns(truncate)
				expand.close()
		except Exception as e:
			expand.close()
			raise e


def parse_args(def_dir: str) -> Any:
	parser = VerboseArgParser(description="Loom command-line tool.")
	parser.add_argument(
		"--debug",
		action="store_true",
		help="Show verbose debug output (False by default)"
	)
	parser.add_argument(
		"--dataset-path",
		help="Path to datasets directory (default: %s)" % def_dir,
		nargs='?',
		const=def_dir,
		default=def_dir
	)

	subparsers = parser.add_subparsers(title="subcommands", dest="command")

	# loom version
	version_parser = subparsers.add_parser("version", help="Print version")

	# loom server
	server_parser = subparsers.add_parser(
		"server",
		help="Launch loom server (default command)"
	)

	server_parser.add_argument(
		"--show-browser",
		help="Automatically launch browser (False by default)",
		action="store_true"
	)

	server_parser.add_argument(
		"-p",
		"--port",
		help="Port",
		type=int,
		nargs='?',
		const=8003,
		default=8003
	)

	# loom tile
	tile_parser = subparsers.add_parser("tile", help="Precompute heatmap tiles")

	tile_parser.add_argument(
		"file",
		help="""Loom file(s) to expand.
		Expands all files matching the provided file names.
		To avoid this, use an absolute path to specify a single file.
		""",
		nargs='*',
	)

	tile_parser.add_argument(
		"--project",
		help="Project(s) for which to expand all files.",
		nargs='*',
	)

	tile_parser.add_argument(
		"-A",
		"--all",
		help="Expand all loom files.",
		action="store_true"
	)

	tile_parser.add_argument(
		"-t",
		"--truncate",
		help="Remove previously expanded tiles if present (false by default)",
		action="store_true"
	)

	# loom expand
	expand_help = "Expands data to compressed json files. Processes all matching loom filenames in dataset_path, unless absolute path is passed"

	expand_parser = subparsers.add_parser(
		"expand",
		help=expand_help
	)

	expand_parser.add_argument(
		"file",
		help="""Loom file(s) to expand.
		Expands all files matching the provided file names.
		To avoid this, use an absolute path to specify a single file.
		When combined with --clear it clears all expanded files instead.
		""",
		nargs='*',
	)

	expand_parser.add_argument(
		"--project",
		help="Project(s) for which to expand all files (or clear expansion with --clear).",
		nargs='*',
	)

	expand_parser.add_argument(
		"-A",
		"--all",
		help="Expand all loom files (or clear expansion with --clear).",
		action="store_true"
	)

	expand_parser.add_argument(
		"-C",
		"--clear",
		help="Remove previously expanded files.",
		action="store_true"
	)

	expand_parser.add_argument(
		"-t",
		"--truncate",
		help="Replace previously expanded files if present (false by default). Only does something in combination with expansion (-m, -a, -r or -c).",
		action="store_true"
	)

	expand_parser.add_argument(
		"-m",
		"--metadata",
		help="Expand metadata (false by default)",
		action="store_true"
	)

	expand_parser.add_argument(
		"-a",
		"--attributes",
		help="Expand attributes (false by default)",
		action="store_true"
	)

	expand_parser.add_argument(
		"-r",
		"--rows",
		help="Expand rows (false by default)",
		action="store_true"
	)

	expand_parser.add_argument(
		"-c",
		"--cols",
		help="Expand columns (false by default)",
		action="store_true"
	)

	return parser.parse_args()


def main() -> None:

	def_dir = def_dataset_dir()
	# Create a fake args object with default settings
	# to handle the special case of no arguments.
	if len(sys.argv) == 1:
		args = argparse.Namespace()
		setattr(args, "debug", False)
		setattr(args, "dataset_path", def_dir)
		# handled below
		# setattr(args, "port", 8003)
		# setattr(args, "command", "server")
		# setattr(args, "show_browser", True)
	else:
		args = parse_args(def_dir)

	if args.debug:
		logging.basicConfig(
			level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(module)s, %(lineno)d - %(message)s")
	else:
		logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

	# If only --debug or --dataset-path is passed,
	# we still want to default to the server command
	if 'command' not in args:
		setattr(args, "command", "server")
	if 'port' not in args:
		setattr(args, "port", 8003)
	if 'show_browser' not in args:
		setattr(args, "show_browser", True)

	if args.debug:
		logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s - %(module)s, %(lineno)d: %(message)s')
	else:
		logging.basicConfig(level=logging.INFO, format='%(asctime)s: %(message)s')

	if args.command == "version":
		print("loom v%s" % __version__)
		sys.exit(0)
	else:
		if args.command == "tile":
			logging.warn("test")
			datasets = LoomDatasets(args.dataset_path)
			tile_command(datasets, args.file, args.project, args.all, args.truncate)
		elif args.command == "expand":
			datasets = LoomDatasets(args.dataset_path)
			expand_command(datasets, args.file, args.project, args.all, args.clear, args.metadata, args.attributes, args.rows, args.cols, args.truncate)
		else:  # args.command == "server":
			start_server(args.dataset_path, args.show_browser, args.port, args.debug)


if __name__ == "__main__":
	main()
