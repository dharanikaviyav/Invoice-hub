# db.py
import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    "host": "localhost",      # update if needed
    "user": "root",           # update if needed
    "password": "root",       # update if needed
    "database": "invoice_hub"
}

def get_connection():
    """
    Open a new MySQL connection using DB_CONFIG.
    Raises Error if connection fails.
    """
    conn = mysql.connector.connect(**DB_CONFIG)
    if not conn.is_connected():
        raise Error("Unable to connect to MySQL")
    return conn
