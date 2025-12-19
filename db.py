# db.py
import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    "host": "localhost",
    "user": "root",          # change if needed
    "password": "root",      # change if needed
    "database": "invoice_hub"
}

def get_connection():
    """
    Create and return a MySQL connection using DB_CONFIG.
    Raises Error if connection fails.
    """
    conn = mysql.connector.connect(**DB_CONFIG)
    if not conn.is_connected():
        raise Error("Unable to connect to MySQL")
    return conn
