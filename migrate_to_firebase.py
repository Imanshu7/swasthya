import sqlite3
import firebase_admin
from firebase_admin import credentials, firestore

# 1. Firebase initialize karo
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# 2. SQLite database connect karo
conn = sqlite3.connect("swasthya.db")
conn.row_factory = sqlite3.Row  # Dict format mapping
cursor = conn.cursor()

def upload_table(table_name, doc_id_column=None):
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    print(f"Uploading {len(rows)} records for table: {table_name}...")

    # Batch write (faster and safer)
    batch = db.batch()
    collection_ref = db.collection(table_name)

    count = 0
    for row in rows:
        data = dict(row)
        
        # Agar specific ID column document ID banana hai to:
        if doc_id_column and doc_id_column in data and data[doc_id_column]:
            doc_ref = collection_ref.document(str(data[doc_id_column]))
        else:
            doc_ref = collection_ref.document()

        batch.set(doc_ref, data)
        count += 1

        # Firestore batch limit 500 documents per commit hoti hai
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()

    batch.commit()
    print(f"Successfully uploaded {table_name}!")

# Dono tables ko upload karo
try:
    upload_table("phcs", doc_id_column="id")
    upload_table("meds", doc_id_column="id")
    print("\nAll data migrated to Firebase Firestore successfully!")
finally:
    conn.close()