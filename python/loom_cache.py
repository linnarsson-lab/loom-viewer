
#
# This class represents a local cache of .loom files stored in Google Cloud Storage
#
# The class takes care of downloading the .looms file locally as needed, opening a loom connection
# and serving the loom data.
#

import os.path
from gcloud import storage
import loom
import re

_valid_pattern = "^[A-Za-z0-9_-]+@[A-Za-z0-9_-]+.loom$"

class LoomCache(object):
	def __init__(self, local_root):
		self.local_root = local_root
		self.remote_root = "linnarsson-lab-loom"
		self.client = storage.Client(project="linnarsson-lab")
		self.looms = {}

	def list_datasets(self):
		bucket = self.client.get_bucket(self.remote_root)
		result = []
		for blob in bucket.list_blobs():
			result.append({
				"project": blob.name.split("@")[0],
				"dataset": blob.name.split("@")[1],
				"is_cached": self.is_cached(blob.name)
			})
		return result

	def get_dataset(self, name):
		if not re.match(_valid_pattern, name):
			raise ValueError, ("Invalid dataset name '%s' (should match '%s')." % (name, _valid_pattern))

		if self.looms.__contains__(name):
			return self.looms[name]

		absolute_path = os.path.join(self.local_root, name)
		if not os.path.isfile(absolute_path):
			print "Fetching %s for cache." % absolute_path
			bucket = self.client.get_bucket(self.remote_root)
			blob = bucket.blob(name)
			with open(absolute_path, 'wb') as outfile:
				blob.download_to_file(outfile)
		dataset = loom.connect(absolute_path)
		self.looms[name] = dataset
		return dataset

	def is_cached(self, name):
		if not re.match(_valid_pattern, name):
			raise ValueError, ("Invalid dataset name '%s' (should match '%s')." % (name, _valid_pattern))
		if self.looms.__contains__(name):
			return True
		absolute_path = os.path.join(self.local_root, name)
		if os.path.isfile(absolute_path):
			return True
		return False

