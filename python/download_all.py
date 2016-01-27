import numpy as np
import pymysql
import pymysql.cursors
import sys
import os
# Change this to wherever you have loom.py (or add it to your PATH)
sys.path.append(os.path.abspath("/Users/Sten/Dropbox/Code/Loom/python/"))
import loom


connection = pymysql.connect(
  host='localhost',   # Change to the server IP
  port=9000,          # Change to the server port
  user='',            # Change to the correct username
  password='',        # Change to the correct password
  db='joomla',
  charset='utf8mb4'
)

# Download the gene annotations and make row_attrs
cursor = connection.cursor()
cursor.execute("""
  SELECT * FROM cells10k.Transcript
  WHERE TranscriptomeID = 1
  ORDER BY ExprBlobIdx
""")
transcriptome_headers = map(lambda x: x[0],cursor.description)
transcriptome = cursor.fetchall()
row_attrs = {}
for i in xrange(len(transcriptome_headers)):
    row_attrs[transcriptome_headers[i]] = []
    for j in xrange(len(transcriptome)):
        row_attrs[transcriptome_headers[i]].append(transcriptome[j][i])
cursor.close()

# Download the complete matrix (for mouse only; change to Hs to get human)
# Also creates the col_attrs
cursor = connection.cursor()
cursor.execute("""
SELECT  h.chipid,
        c.chipwell,
        p.plateid,
        c.platewell,
        h.species, 
        h.datedissected,
        h.datecollected,
        h.donorid,
        h.strain,
        h.age,
        h.sex,
        h.tissue,
        h.treatment,
        h.weight,
        c.diameter,
        c.area,
        c.red,
        c.blue,
        c.green,
        h.comments,
        h.spikemolecules,
        Data 
FROM jos_aaacell c 
LEFT JOIN jos_aaachip h 
    ON c.jos_aaachipid=h.id 
LEFT JOIN jos_aaaproject p 
    ON h.jos_aaaprojectid=p.id
RIGHT JOIN cells10k.ExprBlob e
    ON e.CellID=c.id 
WHERE c.valid=1 AND h.species = "Mm"
""")
matrix = []
headers = map(lambda x: x[0],cursor.description)
col_attrs = {}
for i in xrange(len(headers)-1):
    col_attrs[headers[i]] = []
dt = np.dtype('int32')
dt = dt.newbyteorder('>')
for row in cursor:
    data = np.frombuffer(row[-1], dt)
    matrix.append(data)
    for i in xrange(len(headers)-1):
        col_attrs[headers[i]].append(row[i])
cursor.close()
matrix = np.array(matrix).transpose()
col_attrs["CellID"] = map(lambda x: x[0]+'-'+x[1],zip(col_attrs["chipid"],col_attrs["chipwell"]))

# Save all in a .loom file
loom.create("allcells.loom", matrix, row_attrs, col_attrs)


