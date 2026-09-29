import requests

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MmNiOTc3MC0yOTE1LTRjYzAtODU2MS02ZTAxOTZjZTc3YjIiLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJjb21wYW55X2lkIjoiMjcxNWFjMGMtMzMyOC00MGFmLWIyMDgtNmRhOWU2NmNmM2RmIiwianRpIjoiZmNjNGZmMTMtN2I1NS00YTQ1LTlmYzItNWMwYjY5NWY1Y2YzIiwiaWF0IjoxNzkwMTcyNzY5LCJleHAiOjE3OTAxNzQ1Njl9.MkWvCqYSmkTPw2K6i6_-0t-E6br8gwB4PVaxb1E9XNs"

headers = {"Authorization": f"Bearer {TOKEN}"}

# 1. Create org
r1 = requests.post("http://localhost:8000/api/v1/organizations/", json={"name": "suhaney test", "city": "hisar"}, headers=headers)
print("Org Response:", r1.status_code, r1.text)

if r1.status_code == 201:
    org_id = r1.json()["id"]
    # 2. Create user
    r2 = requests.post(f"http://localhost:8000/api/v1/auth/users?org_id={org_id}", json={
        "mobile_number": "9956665233",
        "email": "11admin@renttrack.com",
        "password": "password123",
        "first_name": "Amrit",
        "last_name": "Sharma",
        "role": "admin"
    }, headers=headers)
    print("User Response:", r2.status_code, r2.text)
