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



from __future__ import division
import numpy as np
import os.path
import os
import sys
import time
import loompy
import tempfile
import re
import pymysql
import pymysql.cursors
import csv
import logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')



class PipelineError(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class LoomPipeline(object):
	"""
	Pipeline to collect datasets from MySQL, create .loom files and perform standard analyses.
	"""
	def __init__(self, host = '104.197.219.40',	port = 3306, username = 'cloud_user', password = 'cloud_user'):
		self.mysql_connection = pymysql.connect(host=host, port=port, user=username, password=password, db='joomla', charset='utf8mb4')

	def _make_std_numpy_type(self, array, sql_type):
		field_type = {
			  0: "float",
			  1: "int",
			  2: "int",
			  3: "int",
			  4: "float",
			  5: "float",
			  6: "string",
			  7: "string",
			  8: "string",
			  9: "int",
			 10: "string",
			 11: "string",
			 12: "string",
			 13: "int32",
			 14: "string",
			 15: "string",
			 16: "int",
			246: "int",
			247: "string",
			248: "string",
			249: "string",
			250: "string",
			251: "string",
			252: "string",
			253: "string",
			254: "string",
			255: "string"
		}
		try:
			return np.array(array).astype(field_type[sql_type])
		except:
			# So there might be some Nones, we need to fix that
			temp = np.array(array)
			temp[temp == np.array(None)] = 0
			return temp.astype(field_type[sql_type])

	def create_loom(self, dataset_path, project, filename, transcriptome):
		"""
		Create a loom file by collecting cells from MySQL

		Args:
			dataset_path (string):	Path to datasets folder
			project (string):		Project name
			filename (string):		Filename
			transcriptome (string):	Transcriptome

		Returns:
			Nothing, but creates a .loom file
		"""
		connection = self.mysql_connection
		logging.info("Processing: " + project + "/" + filename + "(" + transcriptome + ")")

		# Get the transcriptome ID
		try:
			cursor = connection.cursor()
			cursor.execute('SELECT ID from jos_aaatranscriptome WHERE name = %s', transcriptome)
			transcriptome_id = cursor.fetchone()[0]
		except:
			raise PipelineError("Could not find transcriptome ID for '%s'" % transcriptome)
		cursor.close()
		# Download gene annotations
		cursor = connection.cursor()
		query = """
			SELECT
				jos_aaatranscriptomeid TranscriptID,
				Name,
				Type,
				GeneName,
				EntrezID,
				Description,
				Chromosome,
				Start,
				End,
				Length,
				Strand,
				ds.*
			FROM joomla.jos_aaatranscript tr
			LEFT JOIN datasets__%s.Genes__%s__%s ds
			ON tr.jos_aaatranscriptomeid = ds.TranscriptID
			WHERE tr.jos_aaatranscriptomeid = %d
			AND tr.Type <> "repeat"
			ORDER BY tr.ExprBlobIdx
		"""
		try:
			cursor.execute(query % (transcriptome, project, filename, transcriptome_id))
		except pymysql.err.ProgrammingError as e:
			logging.warn("Dataset definition not found in database")
			raise PipelineError(e)

		N_STD_FIELDS = 11 # UPDATE THIS IF YOU CHANGE THE SQL ABOVE!!

		transcriptome_headers = list(map(lambda x: x[0],cursor.description))
		rows = cursor.fetchall()
		row_attrs = {}
		for i in range(len(transcriptome_headers)):
			hdr = transcriptome_headers[i]
			if i >= N_STD_FIELDS:
				hdr = "(" + dataset + ")_" + hdr
			row_attrs[hdr] = []
			for j in range(len(rows)):
				row_attrs[hdr].append(rows[j][i])
			row_attrs[hdr] = self._make_std_numpy_type(row_attrs[hdr], cursor.description[i][1])
		cursor.close()

		gene_ids = row_attrs["TranscriptID"]
		matrix = []
		col_attrs = {}

		# Fetch counts
		nrows = 0

		# Fetch 1000 rows at a time
		while True:
			cursor = connection.cursor()
			N_STD_FIELDS = 40	# UPDATE THIS IF YOU CHANGE THE SQL ABOVE!!
								# Count all standard fields but not including "Data"
								# NOTE: Data field should always be last!
			query = """
				SELECT
					e.CellID,
					e.TranscriptomeID,
					ChipWell,
					PlateWell,
					Diameter,
					Area,
					Red,
					Green,
					Blue,
					c.Valid,
					ChipID,
					StrtProtocol,
					DateDissected,
					DateCollected,
					h.Species,
					Strain,
					DonorID,
					h.Age,
					h.Sex,
					h.Weight,
					h.Tissue,
					h.Treatment,
					h.SpikeMolecules,
					h.Comments,
					h.User,
					p.Time,
					Title,
					ProductionDate,
					PlateID,
					PlateReference,
					SampleType,
					CollectionMethod,
					FragmentLength,
					MolarConcentration,
					WeightConcentration,
					Protocol,
					BarcodeSet,
					Status,
					Comment,
					Aligner,
					ds.*,
					Data
				FROM joomla.jos_aaacell c
				LEFT JOIN joomla.jos_aaachip h
					ON c.jos_aaachipid=h.id
				LEFT JOIN joomla.jos_aaaproject p
					ON h.jos_aaaprojectid=p.id
				JOIN cells10k.ExprBlob e
					ON e.CellID=c.id
				JOIN datasets__%s.Cells__%s__%s ds
					ON ds.CellID = c.id
				WHERE c.valid=1 AND e.TranscriptomeID = %s
				LIMIT 1000 OFFSET %s
			""" % (transcriptome, project, filename, transcriptome_id, nrows)
			cursor.execute(query)
			if cursor.rowcount == 0:
				break

			# List the headers
			headers = list(map(lambda x: x[0], cursor.description)[:-2]) # -2 because we don't want to include "Data"
			# Rename custom fields to avoid collisions
			for ix in range(len(headers)):
				if ix >= N_STD_FIELDS:
					headers[ix] = "(" + dataset + ")_" + headers[ix]

			# Set up empty lists for the column attributes
			if nrows == 0:
				for i in range(len(headers)):
					col_attrs[headers[i]] = []
			dt = np.dtype('int32')  # datatype for unpacking the Data blob
			dt = dt.newbyteorder('>')
			for row in cursor:
				data = np.frombuffer(row[-1], dt)
				matrix.append(data)
				for i in range(len(headers)):
					col_attrs[headers[i]].append(row[i])
			nrows += cursor.rowcount
			cursor.close()

		# End of while-loop

		# Convert to the appropriate numpy datatype
		for ix in range(len(headers)):
			col_attrs[headers[ix]] = self._make_std_numpy_type(col_attrs[headers[ix]], cursor.description[ix][1])
		cell_ids = col_attrs["CellID"]

		# Create the loom file
		counts = np.array(matrix).transpose()
		if counts.shape == (0,):
			raise PipelineError("Dataset is empty")
		absolute_path = os.path.join(self.dataset_path, project, filename)
		loom.create(absolute_path, counts, row_attrs, col_attrs)

	def upload(self, project, filename, transcriptome, cell_attrs, gene_attrs = None):
		"""
		Upload a custom dataset annotation to MySQL.

		Args:
			project (string):		Project name
			filename (string):		Filename
			transcriptome (string):	Transcriptome
			cell_attrs (dict):		Dictionary of cell annotations (numpy arrays)
			gene_attrs (dict): 		Optional dictionary of gene annotations (numpy arrays)

		Returns:
			Nothing.

		At least cell_attrs must be given. Both are dictionaries where the keys are attribute
		names and the values are numpy arrays (of the same length). The 'CellID' (integer) field is required for
		cell_attrs, and the 'TranscriptID' (integer) is required for gene_attrs. However, if TranscriptID is a string
		array, integer TranscriptIDs will be created for you using the given transcriptome. Similarly, if CellID
		is not an integer array but a string array, it will be interpreted as a cell identifier based on the ChipID and
		PlateWell fields in the database (separated by an underscore). For example if CellID contains strings like
		"1772067-089_A01", these will be converted to integer CellIDs for you.
		"""

		# Check the ID attributes, and convert as needed from string identifiers
		if not cell_attrs.__contains__("CellID"):
			raise ValueError("'CellID' attribute is missing from cell_attrs.")
		if cell_attrs["CellID"].dtype.kind != 'i' and cell_attrs["CellID"].dtype.kind != 'S':
			raise ValueError("'CellID' attribute is not of type INTEGER or STRING.")
		if cell_attrs["CellID"].dtype.kind == 'S':
			cell_id_mapping = self.get_cell_id_mapping(transcriptome)
			cell_attrs["CellID"] = np.array([cell_id_mapping[cell] for cell in cell_attrs["CellID"]])

		if gene_attrs == None:
			gene_attrs = {"TranscriptID":np.zeros((0,))}
		else:
			if not gene_attrs.__contains__("TranscriptID"):
				raise ValueError("'TranscriptID' attribute is missing from gene_attrs.")
			if gene_attrs["TranscriptID"].dtype.kind != 'i' and gene_attrs["TranscriptID"].dtype.kind != 'S':
				raise ValueError("'TranscriptID' attribute is not of type INTEGER or STRING.")
			if gene_attrs["TranscriptID"].dtype.kind == 'S':
				gene_id_mapping = self.get_transcript_id_mapping(transcriptome)
				try:
					gene_attrs["TranscriptID"] = np.array([gene_id_mapping[gene] for gene in gene_attrs["TranscriptID"]])
				except KeyError:
					pass
		# Send the dataset to MySQL
		if cell_attrs != None:
			logging.info("Uploading cell annotations")
			self._export_attrs_to_mysql(cell_attrs, transcriptome, "Cells__" + project + "__" + filename, "CellID")
		if gene_attrs != None:
			logging.info("Uploading gene annotations")
			self._export_attrs_to_mysql(gene_attrs, transcriptome, "Genes__" + project + "__" + filename, "TranscriptID")

	def _export_attrs_to_mysql(self, attrs, transcriptome, tablename, pk):
		"""
		Export a set of attributes to a table in MySQL

		Args:

			attrs (dict): 			A dictionary of attributes. Keys are attribute names. Values are numpy arrays, all the same length.
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')
			tablename (str): 		Name of the MySQL table (e.g. 'Cells__project__dataset')
			pk (str):				Primary key, e.g. "CellID" or "TranscriptID"

		Returns:
			Nothing

		Tables for custom annotations are stored in table "dataset__<transcriptome>" (e.g. "dataset__hg19_sUCSC"), and are named
		like so: {Cells|Genes}__<project>__<datatset>. For example, dataset "midbrain_embryo" in
		project "Midbrain" has annotations in Cells__Midbrain__midbrain_embryo and Genes__Midbrain__midbrain_embryo. Since project
		names can be used across transcriptome builds, projects can group together multi-species datasets.
		"""

		fields = attrs.keys()
		formats = []
		schema = []
		for ix in range(len(fields)):
			kind = attrs[fields[ix]].dtype.kind
			if kind == "S" or kind == "U":
				formats.append("%s")
				schema.append("`" + fields[ix] + "` text")
			elif kind == "b":
				formats.append("%s")
				schema.append("`" + fields[ix] + "` bool")
			elif kind == "f":
				formats.append("%f")
				schema.append("`" + fields[ix] + "` float")
			elif kind == "i" or kind == "u":
				formats.append("%d")
				schema.append("`" + fields[ix] + "` int")
			else:
				raise TypeError("Unsupported numpy datatype of kind '%s'" % kind)


		# Create the table in MySQL
		connection = self.mysql_connection
		cursor = connection.cursor()
		full_tablename = "datasets__" + transcriptome + "." + tablename
		query = """
			CREATE DATABASE IF NOT EXISTS %s;
			DROP TABLE IF EXISTS %s;
			CREATE TABLE %s (
			%s,
			PRIMARY KEY (`%s`)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8;
		""" % ("datasets__" + transcriptome, full_tablename,full_tablename,",".join(schema), pk)
		cursor.execute(query)
		cursor.close()

		# Upload the data
		rows = []
		for ix in range(attrs[attrs.keys()[0]].shape[0]):
			row = []
			for a in range(len(fields)):
				row.append(formats[a] % (attrs[fields[a]][ix]))
			rows.append(row)

		if len(rows) > 0:
			insert = """
				INSERT INTO %s VALUES %s;
			""" % (full_tablename, ",".join([connection.escape(row) for row in rows]))
			cursor = connection.cursor()
			cursor.execute(insert)
			cursor.close()

	def get_transcript_id_mapping(self, transcriptome):
		"""
		Get a dictionary that maps gene names to TranscriptID for the given transcriptome

		Args:
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')

		Returns:
			mapping (dict):		Mapping of gene names ("GeneName" column in "Transcript" table) to TranscriptID

		Performs a SQL query for each call. Best practice is to call it once, then use the resulting mapping for many conversions.
		"""
		connection = self.mysql_connection

		cursor = connection.cursor()
		cursor.execute("""
			SELECT GeneName, jos_aaatranscriptomeid TranscriptID FROM jos_aaatranscript t1
			JOIN jos_aaatranscriptome t2 ON t1.jos_aaatranscriptomeid = t2.id
			WHERE t2.name = %s
		""", transcriptome)
		rows = cursor.fetchall()
		cursor.close()

		mapping = {}
		for j in range(len(rows)):
			mapping[rows[j][0]] = rows[j][1]
		cursor.close()
		return mapping

	def get_cell_id_mapping(self, transcriptome):
		"""
		Get a dictionary that maps cell string identifiers to CellID for the given transcriptome

		Args:
			transcriptome (str):	Name of the genome build (e.g. 'mm10a_aUCSC')

		Returns:
			mapping (dict):		Mapping of gene names ("GeneName" column in "Transcript" table) to TranscriptID

		Performs a SQL query for each call. Best practice is to call it once, then use the resulting mapping for many conversions.
		The resulting dictionary can be used to map identifiers in the style "1772067-089_A01" to integer CellIDs
		"""
		connection = self.mysql_connection

		# Get the transcriptome ID
		try:
			cursor = connection.cursor()
			cursor.execute('SELECT ID from jos_aaatranscriptome WHERE name = %s', transcriptome)
			transcriptome_id = cursor.fetchone()[0]
		except:
			raise PipelineError("Could not find transcriptome ID for '%s'" % transcriptome)
		cursor.close()

		cursor = connection.cursor()
		cursor.execute("""
			SELECT jos_aaacell.id as CellID, ChipID, ChipWell
			FROM joomla.jos_aaacell
			JOIN joomla.jos_aaachip ON jos_aaachip.id = jos_aaacell.jos_aaachipid
			JOIN cells10k.ExprBlob ON jos_aaacell.id = cells10k.ExprBlob.CellID
			WHERE cells10k.ExprBlob.TranscriptomeID = %s
		""", transcriptome_id)
		rows = cursor.fetchall()
		cursor.close()

		mapping = {}
		for j in range(len(rows)):
			mapping[rows[j][1] + "_" + rows[j][2]] = rows[j][0]
		cursor.close()
		return mapping

	def list_transcriptomes(self):
		"""
		Get a list of valid transcriptomes

		Args:

		Returns:
			list of strings, valid transcriptomes
		"""
		cursor = self.mysql_connection.cursor()
		cursor.execute("""
			SELECT Name FROM jos_aaatranscriptome;
		""")
		rows = cursor.fetchall()
		return [r[0] for r in rows]

