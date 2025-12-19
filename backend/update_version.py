import sqlite3

conn = sqlite3.connect('test.db')
cursor = conn.cursor()
cursor.execute('DROP TABLE IF EXISTS api_logs')
conn.commit()
print('Dropped api_logs')
conn.close()