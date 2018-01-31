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
	if all_files:
		matches = datasets.list.all_files()
	else:
		for filename in filenames:
			matches |= datasets.list.matching_filenames(filename)

		for project in projects:
			matches |= datasets.list.files_in_project(project)

	for project, filename, file_path in matches:
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
		logging.info("Must explicitly state what to expand!")
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


def main() -> None:

	def_dir = def_dataset_dir()

	# Handle the special case of no arguments, and create a fake args object with default settings
	if len(sys.argv) == 1:
		args = argparse.Namespace()
		setattr(args, "debug", False)
		setattr(args, "dataset_path", def_dir)
		setattr(args, "port", 8003)
		setattr(args, "command", "server")
		setattr(args, "show_browser", True)
	else:
		parser = VerboseArgParser(description="Loom command-line tool.")
		parser.add_argument("--debug", action="store_true", help="Show verbose debug output (False by default)")
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
			help="Automatically launch browser (false by default)",
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

		args = parser.parse_args()

	if args.debug:
		logging.basicConfig(
			level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(module)s, %(lineno)d - %(message)s")
	else:
		logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

	if args.command == "version":
		print("loom v%s" % __version__)
		sys.exit(0)
	else:
		if args.command == "tile":
			datasets = LoomDatasets(args.dataset_path)
			tile_command(datasets, args.file, args.project, args.all, args.truncate)
		elif args.command == "expand":
			datasets = LoomDatasets(args.dataset_path)
			expand_command(datasets, args.file, args.project, args.all, args.clear, args.metadata, args.attributes, args.rows, args.cols, args.truncate)
		else:  # args.command == "server":
			start_server(args.dataset_path, args.show_browser, args.port, args.debug)


if __name__ == "__main__":
	main()
