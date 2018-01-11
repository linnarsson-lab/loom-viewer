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

import sys
import os

import argparse
import logging
import warnings

import loompy
from .loom_expand import LoomExpand
from .loom_tiles import LoomTiles
from .loom_datasets import LoomDatasets
from .loom_server import start_server


class VerboseArgParser(argparse.ArgumentParser):

	def error(self, message):
		self.print_help()
		sys.stderr.write("\nerror: %s\n" % message)
		sys.exit(2)


def connect_loom(file_path):
	if os.path.exists(file_path):
		logging.info("  Connecting to %s" % file_path)
		return loompy.connect(file_path)
	logging.warn("  Could not find %s" % file_path)
	return None


def list_filename_matches(dataset_path, filename):
	logging.info("Looking for Loom files matching %s", filename)
	projects = [x for x in os.listdir(dataset_path) if os.path.isdir(os.path.join(dataset_path, x)) and not x.startswith(".")]
	logging.info("Found %i projects", len(projects))
	matching_files = []
	for project in projects:
		project_path = os.path.join(dataset_path, project)
		logging.info("Entering project %s", project_path)
		if os.path.exists(project_path):
			project_files = os.listdir(project_path)
			file_path = os.path.join(project_path, filename)
			if os.path.isfile(file_path):
				logging.info("  Found a matching Loom file")
				matching_files.append((project, filename, file_path))
	return matching_files


def list_project_files(dataset_path, project):
	logging.info("Listing all Loom files in %s", project)
	project_path = os.path.join(dataset_path, project)
	if os.path.exists(project_path):
		project_files = os.listdir(project_path)
		loom_files = [(project, filename, os.path.join(project_path, filename)) for filename in project_files if filename.endswith(".loom")]
		total_loom_files = len(loom_files)
		if total_loom_files is 0:
			logging.info("No loom files found in %s folder", project)
		elif total_loom_files is 1:
			logging.info("Found 1 loom file")
		else:
			logging.info("Found %i loom files", total_loom_files)
		return loom_files
	else:
		raise warnings.warn("%s is not a path to a Project folder!" % project_path)


def tile(loom_files, truncate):
	for _, _, file_path in loom_files:
		ds = None
		try:
			ds = connect_loom(file_path)
			if ds is None:
				raise warnings.warn("Could not connect to %s" % file_path)
		except Exception as e:
			logging.error(e)
			return
		try:
			logging.info("    Precomputing heatmap tiles, stored in subfolder:\n    %s.tiles" % file_path)
			tiles = LoomTiles(ds)
			tiles.prepare_heatmap(truncate)
		except Exception as e:
			logging.error(e)


def loom_files_from_abspath(filename):
	""" filename is actually an absolute filepath - extract into "/..../project/filename"  """
	project = os.path.basename(os.path.dirname(filename))
	real_filename = os.path.basename(filename)
	return [(project, real_filename, filename)]


def tile_command(dataset_path, filename, truncate):
	if filename == os.path.abspath(filename):
		loom_files = loom_files_from_abspath(filename)
	else:
		loom_files = list_filename_matches(dataset_path, filename)
	tile(loom_files, truncate)


def tile_project_command(dataset_path, project, truncate):
	loom_files = list_project_files(dataset_path, project)
	tile(loom_files, truncate)


def expand(loom_files, dataset_path, truncate, metadata, attributes, rows, cols):
	if not (metadata or attributes or rows or cols):
		logging.info("Must explicitly state what to expand!")
		return
	for project, filename, file_path in loom_files:
		try:
			expand = LoomExpand(project, filename, file_path)
			if metadata:
				expand.metadata(truncate)
			if attributes:
				expand.attributes(truncate)
			if rows:
				expand.rows(truncate)
			if cols:
				expand.columns(truncate)
		except Exception as e:
			logging.error(e)


def expand_command(dataset_path, filename, truncate, metadata, attributes, rows, cols):
	if filename == os.path.abspath(filename):
		loom_files = loom_files_from_abspath(filename)
	else:
		loom_files = list_filename_matches(dataset_path, filename)
	expand(loom_files, dataset_path, truncate, metadata, attributes, rows, cols)


def expand_project_command(dataset_path, project, truncate, metadata, attributes, rows, cols):
	loom_files = list_project_files(dataset_path, project)
	expand(loom_files, dataset_path, truncate, metadata, attributes, rows, cols)


def expand_all_command(dataset_path, truncate, metadata, attributes, rows, cols):
	if not (metadata or attributes or rows or cols):
		logging.info("Must explicitly state what to expand!")
		return
	logging.info("Searching for projects in %s" % dataset_path)
	projects = [x for x in os.listdir(dataset_path) if os.path.isdir(os.path.join(dataset_path, x)) and not x.startswith(".")]
	logging.info("  Found %i projects" % len(projects))
	for project in projects:
		logging.info("Entering project %s" % project)
		loom_files = list_project_files(dataset_path, project)
		expand(loom_files, dataset_path, truncate, metadata, attributes, rows, cols)


class Empty(object):
	pass


def main():

	def_dir = os.environ.get("LOOM_PATH")
	if def_dir is None:
		def_dir = os.path.join(os.path.expanduser("~"), "loom-datasets")

	# Handle the special case of no arguments, and create a fake args object with default settings
	if len(sys.argv) == 1:
		args = Empty()
		setattr(args, "debug", False)
		setattr(args, "dataset_path", def_dir)
		setattr(args, "port", 8003)
		setattr(args, "command", "server")
		setattr(args, "show_browser", True)
	else:
		parser = VerboseArgParser(description="Loom command-line tool.")
		parser.add_argument("--debug", action="store_true")
		parser.add_argument("--dataset-path", help="Path to datasets directory (default: %s)" % def_dir, default=def_dir)

		subparsers = parser.add_subparsers(title="subcommands", dest="command")

		# loom version
		version_parser = subparsers.add_parser("version", help="Print version")

		# loom server
		server_parser = subparsers.add_parser("server", help="Launch loom server (default command)")
		server_parser.add_argument("--show-browser", help="Automatically launch browser (True by default)", action="store_false")
		server_parser.add_argument("-p", "--port", help="Port", type=int, default=8003)

		# loom tile
		tile_parser = subparsers.add_parser("tile", help="Precompute heatmap tiles")
		tile_parser.add_argument("file", help="Loom file absolute path, or filename to search for in any project under dataset-path")
		tile_parser.add_argument("-t", "--truncate", help="Remove previously expanded tiles if present (False by default)", action="store_true")

		# loom tile all within project
		tile_parser = subparsers.add_parser("tile-project", help="Precompute heatmap tiles for all loom files in a project")
		tile_parser.add_argument("project", help="Project directory name")
		tile_parser.add_argument("-t", "--truncate", help="Remove previously expanded tiles if present (False by default)", action="store_true")

		# loom expand
		expand_help = "Expands data to compressed json files. Processes all matching loom filenames in dataset_path, unless absolute path is passed"
		expand_parser = subparsers.add_parser("expand", help=expand_help)
		expand_parser.add_argument("file", help="Loom file absolute path, or filename to search for in any project under dataset-path")
		expand_parser.add_argument("-t", "--truncate", help="Remove previously expanded files if present (False by default)", action="store_true")
		expand_parser.add_argument("-m", "--metadata", help="Expand metadata (False by default)", action="store_true")
		expand_parser.add_argument("-a", "--attributes", help="Expand attributes (False by default)", action="store_true")
		expand_parser.add_argument("-r", "--rows", help="Expand rows (False by default)", action="store_true")
		expand_parser.add_argument("-c", "--cols", help="Expand columns (False by default)", action="store_true")

		# loom expand all loom files in a project
		expand_project_help = "Expand all loom files in given project of the datasets folder to compressed pickle/json files for better server performance."
		expand_parser = subparsers.add_parser("expand-project", help=expand_project_help)
		expand_parser.add_argument("project", help="Project directory name")
		expand_parser.add_argument("-t", "--truncate", help="Remove previously expanded files if present (False by default)", action="store_true")
		expand_parser.add_argument("-m", "--metadata", help="Expand metadata (False by default)", action="store_true")
		expand_parser.add_argument("-a", "--attributes", help="Expand attributes (False by default)", action="store_true")
		expand_parser.add_argument("-r", "--rows", help="Expand rows (False by default)", action="store_true")
		expand_parser.add_argument("-c", "--cols", help="Expand columns (False by default)", action="store_true")

		# loom expand all datasets
		expand_all_parser = subparsers.add_parser("expand-all", help="Expand all loom files in the data folder for better server performance")
		expand_all_parser.add_argument("-t", "--truncate", help="Remove previously expanded files if present (False by default)", action="store_true")
		expand_all_parser.add_argument("-m", "--metadata", help="Expand metadata (False by default)", action="store_true")
		expand_all_parser.add_argument("-a", "--attributes", help="Expand attributes (False by default)", action="store_true")
		expand_all_parser.add_argument("-r", "--rows", help="Expand rows (False by default)", action="store_true")
		expand_all_parser.add_argument("-c", "--cols", help="Expand columns (False by default)", action="store_true")

		args = parser.parse_args()

	if args.debug:
		logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(module)s, %(lineno)d - %(message)s")
	else:
		logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")

	if not os.path.exists(args.dataset_path):
		logging.info("Creating dataset directory: " + args.dataset_path)
		os.mkdir(args.dataset_path)
	else:
		logging.info("Using dataset directory at:")
		logging.info("    " + args.dataset_path)

	if args.command == "version":
		print("loom v" + str(loompy.__version__))
		sys.exit(0)
	elif args.command == "tile":
		tile_command(args.dataset_path, args.file, args.truncate)
	elif args.command == "tile-project":
		tile_project_command(args.dataset_path, args.project, args.truncate)
	elif args.command == "expand":
		expand_command(args.dataset_path, args.file, args.truncate, args.metadata, args.attributes, args.rows, args.cols)
	elif args.command == "expand-project":
		expand_project_command(args.dataset_path, args.project, args.truncate, args.metadata, args.attributes, args.rows, args.cols)
	elif args.command == "expand-all":
		expand_all_command(args.dataset_path, args.truncate, args.metadata, args.attributes, args.rows, args.cols)
	else:  # args.command == "server":
		start_server(args.dataset_path, args.show_browser, args.port, args.debug)


if __name__ == "__main__":
	main()
