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

import os.path
import csv
import loompy
import re
import json
import time

class LoomCache(object):
	"""
	Represents loom files in the local dataset directory
	"""

	def __init__(self, dataset_path):
		"""
		Create a LoomCache object that will cache loom files (on demand)

		Returns:
			The LoomCache object.
		"""
		if not os.path.exists(dataset_path):
			os.makedirs(dataset_path)
		self.dataset_path = dataset_path
		self.looms = {}

	def authorize(self, proj, username, password, mode="read"):
		"""
		Check authorization for the specific project and credentials

		Args:
			proj (str):			Project name
			username (str): 	Username
			password (str):		Password
			mode (str):			"read" or "write"

		Read access will be allowed if the credentials are valid, or if there is no auth.txt file
		in the project directory. Write access will only be allowed if the credentials match
		an existing auth.txt file (with 'w' flag for the user).
		"""
		users = {}
		authfile = os.path.join(self.dataset_path, proj, "auth.txt")
		if not os.path.exists(authfile):
			return True if mode == "read" else False
		else:
			try:
				with open(authfile) as f:
					lines = [x.split(",") for x in f.read().splitlines()]
					users = {x[0]: (x[1],x[2]) for x in lines }
			except IndexError:
				return False
		if mode == "read":
			if users.has_key("*"):
				return True
			if users.has_key(username) and users[username][0] == password:
				return True
		else:
			if users.has_key(username) and users[username][0] == password and users[username][1] == "w":
				return True
		return False

	def list_datasets(self, username=None, password=None):
		"""
		Return a list of (project, filename) tuples for loom files cached locally.
		"""
		projects = [x for x in os.listdir(self.dataset_path) if not x.startswith(".")]
		result = []
		for proj in projects:
			if self.authorize(proj, username, password):
				for f in os.listdir(os.path.join(self.dataset_path, proj)):
					if f.endswith(".loom"):
						ds = self.connect_dataset_locally(proj, f, username, password)
						title = ds.attrs.get("title", f)
						descr = ds.attrs.get("description", "")
						url = ds.attrs.get("url", "")
						doi = ds.attrs.get("doi", "")
						#last time the file was modified, formatted year/month/day hour:minute:second
						lastMod = time.strftime('%Y/%m/%d %H:%M:%S', time.gmtime(os.path.getmtime(os.path.join(self.dataset_path, proj, f))))
						result.append({"project": proj, "filename": f, "dataset": f, "title": title, "description": descr, "url":url, "doi": doi, "lastModified": lastMod})
		return result

	def connect_dataset_locally(self, project, filename, username=None, password=None):
		"""
		Download the dataset (if needed) and connect it as a local loom file.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			username (string):		Username or None
			password (string):		Password or None

		Returns:
			A loom file connection, or None if not authorized or file does not exist.
		"""

		# Authorize and get path
		absolute_path = self.get_absolute_path(project, filename, username, password)
		if absolute_path == None:
			return None

		key = project + "/" + filename
		if self.looms.has_key(key):
			return self.looms[key]

		result = loompy.connect(absolute_path)
		self.looms[key] = result
		return result

	def close(self):
		for ds in self.looms.itervalues():
			ds.close()

	def get_absolute_path(self, project, filename, username=None, password=None, check_exists=True):
		"""
		Return the absolute path to the dataset, if authorized.

		Args:
			project (string): 		Name of the project (e.g. "Midbrain")
			filename (string): 		Filename of the loom file (e.g. "Midbrain_20160701.loom")
			username (string):		Username or None
			password (string):		Password or None
			check_exists (bool):	If true, return None if the file does not exist

		Returns:
			An absolute path string, or None if not authorized or file does not exist.
		"""

		if not self.authorize(project, username, password):
			return None

		absolute_path = os.path.join(self.dataset_path, project, filename)
		if os.path.exists(absolute_path) or not check_exists:
			return absolute_path
		else:
			return None