#!/usr/bin/env python3
"""
Add status/placed_in/placed_date/target columns to the image staging sheet.
Run from any terminal with network access:
  /home/owen/.venv/songster/bin/python3 scripts/init-sheet-columns.py
"""
import json, urllib.request, urllib.parse
from google.oauth2 import service_account
import google.auth.transport.requests

SHEET_ID = '15Fl84stiKIyv9jGOxE5kMC5pJOXDDtyrm8TJoIlD6yc'
SA_FILE  = '/home/owen/dev/oat-tools-vscode/credentials/service-account.json'
BASE     = f'https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values'

creds = service_account.Credentials.from_service_account_file(
    SA_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets'])
creds.refresh(google.auth.transport.requests.Request())
token = creds.token

def put(range_a1, values):
    url = f'{BASE}/{urllib.parse.quote(range_a1, safe="")}?valueInputOption=RAW'
    body = json.dumps({'range': range_a1, 'majorDimension': 'ROWS', 'values': values}).encode()
    req = urllib.request.Request(url, data=body, method='PUT',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

def get(range_a1):
    url = f'{BASE}/{urllib.parse.quote(range_a1, safe="")}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

# Task 1 — headers
res = put('Sheet1!H1:K1', [['status', 'placed_in', 'placed_date', 'target']])
print(f'Task 1 — headers written: {res["updatedCells"]} cells')

# Task 2 — find last row and set all data rows to staged
col_a = get('Sheet1!A:A')
last_row = len(col_a.get('values', []))
print(f'Task 2 — last data row: {last_row}')
data_rows = last_row - 1
if data_rows > 0:
    res2 = put(f'Sheet1!H2:H{last_row}', [['staged']] * data_rows)
    print(f'         staged written: {res2["updatedCells"]} cells (rows 2-{last_row})')
else:
    print('         no data rows found')

# Task 3 — confirm
check = get('Sheet1!H1:K5')
rows = check.get('values', [])
print('\nTask 3 — H1:K5 readback:')
for i, row in enumerate(rows):
    label = 'header' if i == 0 else f'row {i+1}'
    print(f'  {label}: {row}')
